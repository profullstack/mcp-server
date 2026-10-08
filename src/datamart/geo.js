/**
 * Location search (PRD §6, GEO-01..GEO-04).
 *
 * One origin form per request: coordinates, a street address with locality, a
 * ZIP plus country, or city/state/country. Conflicting forms are an error, not
 * a silent pick. Distance is straight-line (haversine), labelled as such; it is
 * not drive time.
 */
import { DatamartError } from './errors.js';
import { loadSnapshot } from './snapshots.js';
import { fetchJson } from './http.js';

export const DISTANCE_METHOD = 'haversine-v1';
export const EARTH_RADIUS_MILES = 3958.7613;
export const DEFAULT_ORIGIN = Object.freeze({ zip: '95032', country: 'US' });
export const DEFAULT_RADIUS_MILES = 20;
export const MAX_RADIUS_MILES = 250;
export const SUPPORTED_COUNTRIES = ['US'];

export const GEOCODER = Object.freeze({
  name: 'U.S. Census Bureau Geocoder',
  url: 'https://geocoding.geo.census.gov/geocoder/',
  disclosure:
    'Street addresses are sent to the U.S. Census Bureau Geocoder to obtain coordinates. ' +
    'Datamart does not store or log them. Search by ZIP code instead to avoid sending an address.',
});

const toRad = d => (d * Math.PI) / 180;

/**
 * Great-circle distance in miles.
 * @param {number} lat1 @param {number} lng1 @param {number} lat2 @param {number} lng2
 */
export function haversineMiles(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * A lat/lng box that contains every point within `miles` of the origin. Used
 * only as a cheap prefilter; the haversine check decides membership.
 */
export function boundingBox(lat, lng, miles) {
  const dLat = (miles / EARTH_RADIUS_MILES) * (180 / Math.PI);
  const cos = Math.max(Math.cos(toRad(lat)), 1e-6);
  const dLng = dLat / cos;
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

export function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

const blank = v => v === undefined || v === null || String(v).trim() === '';

function parseRadius(value) {
  if (blank(value)) return DEFAULT_RADIUS_MILES;
  const r = Number(value);
  if (!Number.isFinite(r) || r <= 0 || r > MAX_RADIUS_MILES) {
    throw new DatamartError(
      'invalid_filters',
      `radius_miles must be a number greater than 0 and at most ${MAX_RADIUS_MILES}`,
      { field: 'radius_miles' }
    );
  }
  return r;
}

/** Strip the Census LSAD suffix ("Los Gatos town" -> "los gatos"). */
export function normalizePlaceName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\s+(city and borough|city|town|village|borough|cdp|municipality)$/, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Which origin forms did the caller supply? Address components (city, state,
 * zip) belong to the address when an address is present.
 */
export function originForms(input) {
  const forms = [];
  if (!blank(input.lat) || !blank(input.lng)) forms.push('coordinates');
  if (!blank(input.address)) {
    forms.push('address');
    return forms;
  }
  if (!blank(input.zip)) forms.push('zip');
  if (!blank(input.city)) forms.push('city');
  return forms;
}

function resolveZip(zip, snapshots) {
  const z = String(zip).trim();
  if (!/^\d{5}(-\d{4})?$/.test(z)) {
    throw new DatamartError('invalid_filters', 'zip must be a 5-digit U.S. ZIP code', { field: 'zip' });
  }
  const five = z.slice(0, 5);
  const zcta = snapshots.zcta;
  const point = zcta.data[five];
  if (!point) {
    throw new DatamartError(
      'location_unresolved',
      `ZIP ${five} has no Census ZCTA point (PO-box-only and new ZIPs have none). Try coordinates or a city.`,
      { input: { zip: five } }
    );
  }
  return {
    lat: point[0],
    lng: point[1],
    label: `ZIP ${five}`,
    precision: 'zcta_internal_point',
    source: { name: zcta.meta.source, url: zcta.meta.url, version: zcta.meta.version },
    note: 'A ZCTA internal point approximates the ZIP area; it is not a street address.',
  };
}

function resolveCity(city, state, snapshots) {
  if (blank(state)) {
    throw new DatamartError('invalid_filters', 'city search needs a state (e.g. state=CA)', {
      field: 'state',
    });
  }
  const st = String(state).trim().toUpperCase();
  const places = snapshots.places;
  const key = `${st}|${normalizePlaceName(city)}`;
  const hit = places.data[key];
  if (!hit) {
    throw new DatamartError('location_unresolved', `No Census place named "${city}" in ${st}`, {
      input: { city, state: st },
    });
  }
  return {
    lat: hit[0],
    lng: hit[1],
    label: `${hit[2]}, ${st}`,
    precision: 'place_internal_point',
    source: { name: places.meta.source, url: places.meta.url, version: places.meta.version },
    note: 'A city internal point is not a street address; results near the city edge may differ.',
  };
}

async function resolveAddress(input, deps) {
  const parts = [input.address, input.city, input.state, input.zip].filter(v => !blank(v));
  if (blank(input.zip) && (blank(input.city) || blank(input.state))) {
    throw new DatamartError(
      'invalid_filters',
      'address search needs a locality: add zip, or city and state',
      { field: 'address' }
    );
  }
  const url =
    `${GEOCODER.url}locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=` +
    encodeURIComponent(parts.join(', '));
  const body = await fetchJson(url, { provider: 'census-geocoder', timeoutMs: 15000, fetch: deps.fetch });
  const matches = body?.result?.addressMatches || [];
  if (matches.length === 0) {
    throw new DatamartError('location_unresolved', 'The Census Geocoder found no match for that address');
  }
  if (matches.length > 1) {
    throw new DatamartError('ambiguous_location', 'That address matched more than one location', {
      candidates: matches.slice(0, 5).map(m => ({
        label: m.matchedAddress,
        lat: m.coordinates?.y,
        lng: m.coordinates?.x,
      })),
    });
  }
  const m = matches[0];
  return {
    lat: m.coordinates.y,
    lng: m.coordinates.x,
    label: 'street address (redacted)',
    precision: 'address_range_interpolated',
    source: { name: GEOCODER.name, url: GEOCODER.url, version: 'Public_AR_Current' },
    note: GEOCODER.disclosure,
  };
}

/**
 * Resolve the search origin and radius.
 *
 * @param {Record<string, any>} input - lat, lng, address, city, state, zip, country, radius_miles
 * @param {{ fetch?: typeof fetch, snapshots?: Record<string, any> }} [deps]
 * @returns {Promise<{ lat: number, lng: number, radius_miles: number, defaulted: boolean,
 *   form: string, label: string, precision: string, source: object, note?: string,
 *   distance_method: string, unit: 'miles' }>}
 */
export async function resolveOrigin(input = {}, deps = {}) {
  const country = blank(input.country) ? 'US' : String(input.country).trim().toUpperCase();
  if (!SUPPORTED_COUNTRIES.includes(country)) {
    throw new DatamartError('country_not_supported', `Country ${country} is not supported yet; only US is`, {
      supported: SUPPORTED_COUNTRIES,
    });
  }
  const radius = parseRadius(input.radius_miles);
  const snapshots = deps.snapshots || {
    zcta: loadSnapshot('zcta-us'),
    places: loadSnapshot('places-us'),
  };
  const forms = originForms(input);

  if (forms.length > 1) {
    const candidates = [];
    for (const form of forms) {
      try {
        if (form === 'zip') candidates.push({ form, ...resolveZip(input.zip, snapshots) });
        if (form === 'city') candidates.push({ form, ...resolveCity(input.city, input.state, snapshots) });
        if (form === 'coordinates') candidates.push({ form, lat: Number(input.lat), lng: Number(input.lng) });
        if (form === 'address') candidates.push({ form, label: 'street address' });
      } catch {
        candidates.push({ form, unresolved: true });
      }
    }
    throw new DatamartError(
      'ambiguous_location',
      `Give one origin, not several (got ${forms.join(' + ')}). Choose one of the candidates.`,
      { candidates }
    );
  }

  let resolved;
  let form = forms[0];
  let defaulted = false;
  if (!form) {
    form = 'zip';
    defaulted = true;
    resolved = resolveZip(DEFAULT_ORIGIN.zip, snapshots);
  } else if (form === 'coordinates') {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (blank(input.lat) || blank(input.lng) || !isValidCoordinate(lat, lng)) {
      throw new DatamartError('invalid_filters', 'lat and lng must both be valid decimal degrees', {
        field: 'lat,lng',
      });
    }
    resolved = {
      lat,
      lng,
      label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      precision: 'caller_supplied',
      source: { name: 'caller' },
    };
  } else if (form === 'zip') {
    resolved = resolveZip(input.zip, snapshots);
  } else if (form === 'city') {
    resolved = resolveCity(input.city, input.state, snapshots);
  } else {
    resolved = await resolveAddress(input, deps);
  }

  return {
    ...resolved,
    form,
    country,
    defaulted,
    radius_miles: radius,
    unit: 'miles',
    distance_method: DISTANCE_METHOD,
  };
}

/**
 * Filter located records to those within the radius, nearest first.
 * Records without trustworthy coordinates are never matches; they are returned
 * separately so callers can show them only when asked.
 *
 * @template {{ lat?: number|null, lng?: number|null }} T
 * @param {T[]} records
 * @param {{ lat: number, lng: number, radius_miles: number }} origin
 * @returns {{ matches: Array<T & { distance_miles: number }>, unresolved: T[] }}
 */
export function withinRadius(records, origin) {
  const box = boundingBox(origin.lat, origin.lng, origin.radius_miles);
  const matches = [];
  const unresolved = [];
  for (const r of records) {
    if (!isValidCoordinate(r.lat, r.lng)) {
      unresolved.push(r);
      continue;
    }
    if (r.lat < box.minLat || r.lat > box.maxLat || r.lng < box.minLng || r.lng > box.maxLng) continue;
    const d = haversineMiles(origin.lat, origin.lng, r.lat, r.lng);
    if (d <= origin.radius_miles) matches.push({ ...r, distance_miles: Math.round(d * 100) / 100 });
  }
  matches.sort((a, b) => a.distance_miles - b.distance_miles);
  return { matches, unresolved };
}

/** The public, shareable description of an origin — never contains a street address. */
export function publicOrigin(origin) {
  return {
    form: origin.form,
    label: origin.label,
    lat: Math.round(origin.lat * 1e5) / 1e5,
    lng: Math.round(origin.lng * 1e5) / 1e5,
    precision: origin.precision,
    country: origin.country,
    defaulted: origin.defaulted,
    source: origin.source,
    ...(origin.note ? { note: origin.note } : {}),
  };
}
