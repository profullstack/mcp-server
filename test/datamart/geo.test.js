import {
  haversineMiles,
  boundingBox,
  resolveOrigin,
  withinRadius,
  publicOrigin,
  normalizePlaceName,
  DEFAULT_RADIUS_MILES,
} from '../../src/datamart/geo.js';
import { coverageFor, LAUNCH_COVERAGE } from '../../src/datamart/coverage.js';
import { DatamartError } from '../../src/datamart/errors.js';

const rejects = async (p, code) => {
  try {
    await p;
  } catch (err) {
    expect(err).to.be.instanceOf(DatamartError);
    expect(err.code).to.equal(code);
    return err;
  }
  throw new Error(`expected ${code}`);
};

/** Move `miles` due north of a point (exact for a sphere). */
const north = (lat, miles) => lat + (miles / 3958.7613) * (180 / Math.PI);

describe('datamart geo', () => {
  it('computes great-circle miles', () => {
    // Los Gatos Library -> Dr. MLK Jr. Library (San Jose), about 9 miles apart
    const d = haversineMiles(37.22024527, -121.9785766, 37.33715438, -121.8831558);
    expect(d).to.be.within(9, 10);
    expect(haversineMiles(37, -122, 37, -122)).to.equal(0);
  });

  it('bounding box contains every point on the radius', () => {
    const box = boundingBox(37.18, -121.9, 20);
    expect(north(37.18, 20)).to.be.at.most(box.maxLat + 1e-9);
    expect(box.minLng).to.be.below(-121.9);
  });

  it('includes points just inside and exactly on the radius, excludes just outside (AT07)', () => {
    const origin = { lat: 37.18014, lng: -121.901553, radius_miles: 20 };
    const recs = [
      { id: 'inside', lat: north(origin.lat, 19.99), lng: origin.lng },
      { id: 'on', lat: north(origin.lat, 20) - 1e-12, lng: origin.lng },
      { id: 'outside', lat: north(origin.lat, 20.01), lng: origin.lng },
      { id: 'nocoords', lat: null, lng: null },
      { id: 'bad', lat: 999, lng: -121.9 },
    ];
    const { matches, unresolved } = withinRadius(recs, origin);
    expect(matches.map(m => m.id)).to.deep.equal(['inside', 'on']);
    expect(unresolved.map(m => m.id)).to.deep.equal(['nocoords', 'bad']);
    // Deterministic across runs
    expect(withinRadius(recs, origin).matches.map(m => m.id)).to.deep.equal(['inside', 'on']);
  });

  it('defaults to ZIP 95032 / 20 miles and says so', async () => {
    const o = await resolveOrigin({});
    expect(o.defaulted).to.equal(true);
    expect(o.radius_miles).to.equal(DEFAULT_RADIUS_MILES);
    expect(o.precision).to.equal('zcta_internal_point');
    expect(o.lat).to.be.closeTo(37.18014, 1e-6);
  });

  it('resolves ZIP, coordinates and city consistently (AT08)', async () => {
    const zip = await resolveOrigin({ zip: '95030' });
    const city = await resolveOrigin({ city: 'Los Gatos', state: 'ca' });
    const coords = await resolveOrigin({ lat: '37.2299', lng: '-121.9569' });
    expect(zip.form).to.equal('zip');
    expect(city.form).to.equal('city');
    expect(city.label).to.equal('Los Gatos, CA');
    expect(coords.form).to.equal('coordinates');
    expect(haversineMiles(zip.lat, zip.lng, city.lat, city.lng)).to.be.below(5);
    expect(haversineMiles(city.lat, city.lng, coords.lat, coords.lng)).to.be.below(0.1);
  });

  it('rejects conflicting origins with candidates instead of picking one', async () => {
    const err = await rejects(resolveOrigin({ zip: '95032', city: 'Los Gatos', state: 'CA' }), 'ambiguous_location');
    expect(err.details.candidates.map(c => c.form)).to.deep.equal(['zip', 'city']);
    await rejects(resolveOrigin({ zip: '95032', lat: 1, lng: 2 }), 'ambiguous_location');
  });

  it('treats city/state/zip as parts of an address, not competing origins', async () => {
    const fetch = async () =>
      new Response(
        JSON.stringify({ result: { addressMatches: [{ matchedAddress: 'X', coordinates: { x: -121.97, y: 37.22 } }] } }),
        { headers: { 'content-type': 'application/json' } }
      );
    const o = await resolveOrigin({ address: '100 Villa Avenue', city: 'Los Gatos', state: 'CA', zip: '95030' }, { fetch });
    expect(o.form).to.equal('address');
    expect(o.precision).to.equal('address_range_interpolated');
    expect(publicOrigin(o).label).to.equal('street address (redacted)');
    expect(JSON.stringify(publicOrigin(o))).to.not.include('Villa');
  });

  it('reports unsupported countries and unknown places explicitly', async () => {
    await rejects(resolveOrigin({ zip: '95032', country: 'CA' }), 'country_not_supported');
    await rejects(resolveOrigin({ zip: '00000' }), 'location_unresolved');
    await rejects(resolveOrigin({ zip: 'abc' }), 'invalid_filters');
    await rejects(resolveOrigin({ city: 'Los Gatos' }), 'invalid_filters');
    await rejects(resolveOrigin({ city: 'Nowhereville', state: 'CA' }), 'location_unresolved');
    await rejects(resolveOrigin({ lat: 37 }), 'invalid_filters');
    await rejects(resolveOrigin({ radius_miles: 0 }), 'invalid_filters');
    await rejects(resolveOrigin({ radius_miles: 'far' }), 'invalid_filters');
  });

  it('normalizes Census place names', () => {
    expect(normalizePlaceName('Los Gatos town')).to.equal('los gatos');
    expect(normalizePlaceName('San José city')).to.equal('san jos');
  });

  it('classifies coverage of a search circle', () => {
    const c = LAUNCH_COVERAGE;
    expect(coverageFor({ lat: c.lat, lng: c.lng, radius_miles: 20 })).to.equal('full');
    expect(coverageFor({ lat: c.lat, lng: c.lng, radius_miles: 80 })).to.equal('partial');
    expect(coverageFor({ lat: 40.75, lng: -73.99, radius_miles: 20 })).to.equal('none');
  });
});
