/**
 * Local directory search: library outlets, public schools, public colleges
 * (PRD §9.2, §10, GEO-02..GEO-04, AT06, AT07, AT09, AT10).
 *
 * Distance decides only proximity. Eligibility (library cards, school
 * attendance boundaries, admissions) is reported separately and never implied
 * by a radius match.
 */
import { DatamartError } from './errors.js';
import { loadSnapshot } from './snapshots.js';
import { resolveOrigin, withinRadius, publicOrigin } from './geo.js';
import { coverageFor, LAUNCH_COVERAGE } from './coverage.js';

/**
 * Official websites per library system (IMLS FSCSKEY), included only after the
 * URL answered 200 to a check on 2026-10-07. Systems missing here get a
 * search handoff instead of a guessed link.
 */
export const LIBRARY_SYSTEM_URLS = {
  CA0115: 'https://www.sjpl.org/',
  CA0126: 'https://sccld.org/',
  CA0254: 'https://www.sccll.org/',
  CA0127: 'https://www.santacruzpl.org/',
  CA0091: 'https://library.cityofpaloalto.org/',
  CA0120: 'https://smcl.org/',
  CA0001: 'https://aclibrary.org/',
};

const LIBRARY_ELIGIBILITY = {
  status: 'not_determined',
  note:
    'Library card eligibility, reciprocal borrowing and fees are set by each library system. ' +
    'Being nearby does not establish eligibility; check with the system.',
};
const SCHOOL_ELIGIBILITY = {
  status: 'not_determined',
  note:
    'Enrollment at a public school depends on attendance boundaries, district policy and program rules. ' +
    'Distance alone does not make a school your assigned school; confirm with the district.',
};
const COLLEGE_ELIGIBILITY = {
  status: 'not_determined',
  note: 'Admission and residency requirements are set by the institution.',
};

export const LIBRARY_TYPES = ['central', 'branch', 'bookmobile', 'books_by_mail', 'other'];
export const EDU_TYPES = ['preschool', 'elementary', 'middle', 'high', 'adult', 'college', 'university', 'vocational'];
const MAX_LIMIT = 100;

function decorateLibrary(r) {
  const site = LIBRARY_SYSTEM_URLS[r.system.fscskey] || null;
  return {
    ...r,
    namespace: 'lib',
    official_url: site,
    handoff: site
      ? { label: 'Continue on the library system website', url: site }
      : {
        label: 'Contact the library directly',
        url: null,
        phone: r.phone,
        note: 'No verified official website is on file for this library system yet.',
      },
    eligibility: LIBRARY_ELIGIBILITY,
    capability: 'directory_only',
  };
}

function decorateSchool(r) {
  const nces = `https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=${r.ids.nces}`;
  return {
    ...r,
    namespace: 'edu',
    official_url: r.website,
    handoff: { label: 'Contact the school or district to enroll', url: r.website || nces },
    source_record_url: nces,
    eligibility: SCHOOL_ELIGIBILITY,
    capability: 'directory_only',
  };
}

function decorateCollege(r) {
  const navigator = `https://nces.ed.gov/collegenavigator/?id=${r.ids.ipeds_unitid}`;
  return {
    ...r,
    namespace: 'edu',
    official_url: r.website,
    handoff: r.application_url
      ? { label: 'Apply on the institution’s site', url: r.application_url }
      : { label: 'Continue on the institution’s site', url: r.website || navigator },
    source_record_url: navigator,
    eligibility: COLLEGE_ELIGIBILITY,
    capability: 'directory_only',
  };
}

function sourceOf(snapshot) {
  const m = snapshot.meta;
  return { name: m.source, url: m.url, version: m.version, retrieved_at: m.retrieved_at, license: m.license };
}

/** Cursor = offset bound to the snapshot versions it was issued for. */
function encodeCursor(offset, version) {
  return Buffer.from(JSON.stringify({ o: offset, v: version })).toString('base64url');
}
function decodeCursor(cursor, version) {
  if (!cursor) return 0;
  try {
    const c = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if (c.v !== version || !Number.isInteger(c.o) || c.o < 0) throw new Error('mismatch');
    return c.o;
  } catch {
    throw new DatamartError('invalid_filters', 'cursor is invalid or belongs to an older snapshot');
  }
}

function parseList(value, allowed, field) {
  if (value === undefined || value === null || value === '') return null;
  const items = (Array.isArray(value) ? value : String(value).split(','))
    .map(s => String(s).trim().toLowerCase())
    .filter(Boolean);
  const bad = items.filter(i => !allowed.includes(i));
  if (bad.length) {
    throw new DatamartError('invalid_filters', `Unknown ${field}: ${bad.join(', ')}. Allowed: ${allowed.join(', ')}`, {
      field,
    });
  }
  return new Set(items);
}

function parseBool(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw new DatamartError('invalid_filters', `${field} must be true or false`, { field });
}

function parseLimit(value) {
  if (value === undefined || value === null || value === '') return 25;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
    throw new DatamartError('invalid_filters', `limit must be an integer from 1 to ${MAX_LIMIT}`, { field: 'limit' });
  }
  return n;
}

const textMatch = (q, ...fields) => {
  if (!q) return true;
  const needle = String(q).toLowerCase();
  return fields.some(f => f && String(f).toLowerCase().includes(needle));
};

/**
 * Shared radius search over one or more snapshot record sets.
 * @returns {Promise<{ data: object[], meta: object, sources: object[], warnings: string[], unresolved?: object[] }>}
 */
async function radiusSearch(params, deps, { records, sources, version, warnings: baseWarnings = [] }) {
  const origin = await resolveOrigin(params, deps);
  const strict = parseBool(params.strict, 'strict') === true;
  const includeUnresolved = parseBool(params.include_unresolved, 'include_unresolved') === true;
  const limit = parseLimit(params.limit);
  const offset = decodeCursor(params.cursor, version);

  const coverage = coverageFor(origin);
  const warnings = [...baseWarnings];
  if (coverage === 'none' || (coverage === 'partial' && strict)) {
    throw new DatamartError(
      'insufficient_geospatial_coverage',
      coverage === 'none'
        ? `Datamart's local directory does not cover this area yet (${LAUNCH_COVERAGE.label}).`
        : `The ${origin.radius_miles}-mile circle extends past Datamart's directory coverage (${LAUNCH_COVERAGE.label}).`,
      { coverage_area: LAUNCH_COVERAGE, origin: publicOrigin(origin) }
    );
  }
  if (coverage === 'partial') {
    warnings.push(
      `Partial coverage: part of the ${origin.radius_miles}-mile circle lies outside ${LAUNCH_COVERAGE.label}; results there are missing.`
    );
  }
  if (origin.defaulted) {
    warnings.push('No location given; using the launch default ZIP 95032 and a 20-mile radius.');
  }

  const { matches, unresolved } = withinRadius(records, origin);
  const page = matches.slice(offset, offset + limit);
  const next = offset + limit < matches.length ? encodeCursor(offset + limit, version) : null;
  return {
    data: page,
    meta: {
      origin: publicOrigin(origin),
      radius_miles: origin.radius_miles,
      unit: 'miles',
      distance_method: origin.distance_method,
      distance_note: 'Straight-line distance, not travel distance or time.',
      location_applied: true,
      coverage: coverage === 'full' ? 'complete_for_snapshot' : 'partial',
      coverage_area: LAUNCH_COVERAGE,
      total_matches: matches.length,
      sort: 'distance',
      sort_scope: 'indexed_snapshot',
      source_snapshot_id: version,
      freshness: 'as_of_source_snapshot',
      next_cursor: next,
    },
    sources,
    warnings,
    ...(includeUnresolved ? { unresolved } : {}),
  };
}

export const LIBRARY_PARAMS = [
  'lat', 'lng', 'address', 'city', 'state', 'zip', 'country', 'radius_miles',
  'q', 'type', 'system', 'strict', 'include_unresolved', 'limit', 'cursor',
];

/** Search library outlets. Bookmobiles are excluded unless type asks for them. */
export async function searchLibraries(params = {}, deps = {}) {
  const snap = loadSnapshot('libraries-launch');
  const types = parseList(params.type, LIBRARY_TYPES, 'type') || new Set(['central', 'branch']);
  const records = snap.data
    .filter(r => types.has(r.outlet_type))
    .filter(r => !params.system || r.system.id === params.system || r.system.fscskey === params.system)
    .filter(r => textMatch(params.q, r.name, r.system.name, r.address.city))
    .map(decorateLibrary);
  return radiusSearch(params, deps, {
    records,
    sources: [sourceOf(snap)],
    version: snap.meta.version,
    warnings: snap.meta.caveats || [],
  });
}

export const EDU_PARAMS = [
  'lat', 'lng', 'address', 'city', 'state', 'zip', 'country', 'radius_miles',
  'q', 'type', 'sector', 'charter', 'district', 'strict', 'include_unresolved', 'limit', 'cursor',
];

/** Search public schools and public colleges. */
export async function searchEducation(params = {}, deps = {}) {
  const sector = params.sector ? String(params.sector).toLowerCase() : 'public';
  if (sector === 'private') {
    throw new DatamartError(
      'insufficient_geospatial_coverage',
      'Private schools and colleges are not in Datamart’s directory yet; only public institutions are.',
      { field: 'sector', supported: ['public'] }
    );
  }
  if (sector !== 'public') {
    throw new DatamartError('invalid_filters', 'sector must be public (private is not yet available)', { field: 'sector' });
  }
  const types = parseList(params.type, EDU_TYPES, 'type');
  const charter = parseBool(params.charter, 'charter');
  const schools = loadSnapshot('schools-launch');
  const colleges = loadSnapshot('colleges-launch');

  const schoolRecords = schools.data
    .filter(r => !types || r.types.some(t => types.has(t)))
    .filter(r => charter === null || r.charter === charter)
    .filter(r => !params.district || textMatch(params.district, r.district.name) || r.district.nces_leaid === params.district)
    .filter(r => textMatch(params.q, r.name, r.district.name, r.address.city))
    .map(decorateSchool);
  const collegeRecords =
    charter === true || params.district
      ? []
      : colleges.data
        .filter(r => !types || r.types.some(t => types.has(t)))
        .filter(r => textMatch(params.q, r.name, r.system, r.address.city))
        .map(decorateCollege);

  const gaps = [];
  if (types?.has('preschool')) {
    gaps.push(
      'Coverage gap: California reports no pre-kindergarten programs to the NCES school directory, so preschools ' +
        'and nurseries are not listed yet. An empty preschool result does not mean there are none nearby.'
    );
  }
  const result = await radiusSearch(params, deps, {
    records: [...schoolRecords, ...collegeRecords],
    sources: [sourceOf(schools), sourceOf(colleges)],
    version: `${schools.meta.version}+${colleges.meta.version}`,
    warnings: [...gaps, ...(schools.meta.caveats || []), ...(colleges.meta.caveats || [])],
  });
  if (gaps.length) result.meta.coverage_gaps = ['preschool'];
  return result;
}

/** Look up one directory record by its Datamart id. */
export function getDirectoryRecord(id) {
  const s = String(id || '');
  if (s.startsWith('us.ca.lib.')) {
    const r = loadSnapshot('libraries-launch').data.find(x => x.id === s);
    if (r) return { record: decorateLibrary(r), source: sourceOf(loadSnapshot('libraries-launch')) };
  } else if (s.startsWith('us.ca.edu.nces-')) {
    const r = loadSnapshot('schools-launch').data.find(x => x.id === s);
    if (r) return { record: decorateSchool(r), source: sourceOf(loadSnapshot('schools-launch')) };
  } else if (s.startsWith('us.ca.edu.ipeds-')) {
    const r = loadSnapshot('colleges-launch').data.find(x => x.id === s);
    if (r) return { record: decorateCollege(r), source: sourceOf(loadSnapshot('colleges-launch')) };
  }
  throw new DatamartError('not_found', `No directory record with id ${s}`);
}

/** Counts for the source-health / coverage report. */
export function directoryCoverage() {
  const out = {};
  for (const name of ['libraries-launch', 'schools-launch', 'colleges-launch']) {
    const s = loadSnapshot(name);
    const unresolved = s.data.filter(r => !Number.isFinite(r.lat) || !Number.isFinite(r.lng)).length;
    out[name] = {
      records: s.data.length,
      unresolved_coordinates: unresolved,
      version: s.meta.version,
      retrieved_at: s.meta.retrieved_at,
      source: s.meta.source,
      caveats: s.meta.caveats || [],
    };
  }
  out.coverage_area = LAUNCH_COVERAGE;
  return out;
}
