#!/usr/bin/env node
/**
 * Build src/datamart/datasets/*.json snapshots from official downloads.
 *
 * Downloads are not committed; fetch them first (see docs/datamart/sources.md)
 * and pass their paths:
 *
 *   node scripts/datamart/build-snapshots.js \
 *     --zcta   2024_Gaz_zcta_national.txt \
 *     --places 2024_Gaz_place_national.txt \
 *     --imls-outlets pls_fy24_outlet_pud24i.csv --imls-ae PLS_FY24_AE_pud24i.csv \
 *     --ccd ccd_sch_029_2324_w_1a_073124.csv \
 *     --edge EDGE_GEOCODE_PUBLICSCH_2324.TXT \
 *     --ipeds HD2023.csv \
 *     --retrieved 2026-10-07
 *
 * Output is deterministic for the same inputs (sorted keys and rows).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { haversineMiles, normalizePlaceName } from '../../src/datamart/geo.js';
import { LAUNCH_COVERAGE } from '../../src/datamart/coverage.js';

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'datamart',
  'datasets'
);

const { values: args } = parseArgs({
  options: {
    zcta: { type: 'string' },
    places: { type: 'string' },
    'imls-outlets': { type: 'string' },
    'imls-ae': { type: 'string' },
    ccd: { type: 'string' },
    edge: { type: 'string' },
    ipeds: { type: 'string' },
    retrieved: { type: 'string' },
  },
});
const RETRIEVED = args.retrieved || new Date().toISOString().slice(0, 10);

/** Minimal RFC 4180 parser for one line (no embedded newlines in these files). */
export function parseCsvLine(line, sep = ',') {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function readTable(file, { sep = ',', header = true, columns } = {}) {
  const text = fs.readFileSync(file, 'latin1').replace(/^(\uFEFF|\u00EF\u00BB\u00BF)/, '');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const cols = header ? parseCsvLine(lines.shift(), sep).map(s => s.trim()) : columns;
  return lines.map(l => {
    const cells = parseCsvLine(l, sep);
    return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? '').trim()]));
  });
}

const inLaunchArea = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  haversineMiles(LAUNCH_COVERAGE.lat, LAUNCH_COVERAGE.lng, lat, lng) <=
    LAUNCH_COVERAGE.radius_miles;

const titleCase = s => s.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase());

function write(name, meta, data) {
  const file = path.join(OUT, `${name}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ meta: { ...meta, retrieved_at: RETRIEVED }, data }) + '\n'
  );
  const n = Array.isArray(data) ? data.length : Object.keys(data).length;
  console.log(`${name}: ${n} records -> ${path.relative(process.cwd(), file)}`);
}

function buildZcta(file) {
  const rows = readTable(file, { sep: '\t' });
  const data = {};
  for (const r of rows.sort((a, b) => a.GEOID.localeCompare(b.GEOID))) {
    data[r.GEOID] = [Number(r.INTPTLAT), Number(r.INTPTLONG)];
  }
  write(
    'zcta-us',
    {
      source: 'U.S. Census Bureau, 2024 Gazetteer Files (ZIP Code Tabulation Areas)',
      url: 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip',
      version: 'census-gazetteer-2024-zcta',
      precision: 'ZCTA internal point; ZCTAs approximate USPS ZIP areas',
      license: 'U.S. Government work (public domain)',
    },
    data
  );
}

function buildPlaces(file) {
  const rows = readTable(file, { sep: '\t' });
  const data = {};
  // Incorporated places win over CDPs of the same name (LSAD 57 = CDP).
  rows.sort((a, b) => (a.LSAD === '57') - (b.LSAD === '57') || a.GEOID.localeCompare(b.GEOID));
  for (const r of rows) {
    const key = `${r.USPS}|${normalizePlaceName(r.NAME)}`;
    if (data[key]) continue;
    const display = r.NAME.replace(/\s+(city|town|village|borough|CDP|municipality)$/, '');
    data[key] = [Number(r.INTPTLAT), Number(r.INTPTLONG), display];
  }
  write(
    'places-us',
    {
      source: 'U.S. Census Bureau, 2024 Gazetteer Files (Places)',
      url: 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip',
      version: 'census-gazetteer-2024-place',
      precision: 'place internal point',
      license: 'U.S. Government work (public domain)',
    },
    Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)))
  );
}

const OUTLET_TYPES = { CE: 'central', BR: 'branch', BS: 'bookmobile', BM: 'books_by_mail' };

function buildLibraries(outletsFile, aeFile) {
  const systems = Object.fromEntries(readTable(aeFile).map(r => [r.FSCSKEY, r]));
  const rows = readTable(outletsFile).filter(r => r.STABR === 'CA');
  const data = [];
  for (const r of rows) {
    const lat = Number(r.LATITUDE);
    const lng = Number(r.LONGITUD);
    if (!inLaunchArea(lat, lng)) continue;
    const sys = systems[r.FSCSKEY];
    data.push({
      id: `us.ca.lib.${r.FSCSKEY.toLowerCase()}-${r.FSCS_SEQ}`,
      kind: 'library_outlet',
      name: titleCase(r.LIBNAME),
      outlet_type: OUTLET_TYPES[r.C_OUT_TY] || 'other',
      system: {
        id: `us.ca.lib.${r.FSCSKEY.toLowerCase()}`,
        fscskey: r.FSCSKEY,
        name: sys ? titleCase(sys.LIBNAME) : null,
      },
      address: { street: titleCase(r.ADDRESS), city: titleCase(r.CITY), state: 'CA', zip: r.ZIP },
      county: titleCase(r.CNTY),
      phone: /^\d{10}$/.test(r.PHONE)
        ? `(${r.PHONE.slice(0, 3)}) ${r.PHONE.slice(3, 6)}-${r.PHONE.slice(6)}`
        : null,
      lat,
      lng,
      geocode: { status: r.GEOSTATUS, score: Number(r.GEOSCORE), match: r.GEOMTYPE },
      reported_status: r.STATSTRU === '23' ? 'temporarily_closed_in_fy2024' : 'open_in_fy2024',
    });
  }
  data.sort((a, b) => a.id.localeCompare(b.id));
  write(
    'libraries-launch',
    {
      source:
        'Institute of Museum and Library Services, Public Libraries Survey FY2024 (outlet + administrative entity files)',
      url: 'https://www.imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip',
      retrieved_via:
        'https://web.archive.org/web/20260708045500id_/https://www.imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip (imls.gov refuses automated clients; archive SHA-1 matches the original capture)',
      version: 'imls-pls-fy2024',
      coverage: LAUNCH_COVERAGE,
      license: 'U.S. Government work (public domain)',
      caveats: [
        'Survey data describes fiscal year 2024; hours, closures and new branches may have changed since.',
        'Bookmobile coordinates are the base location, not service stops.',
      ],
    },
    data
  );
}

const EDGE_COLUMNS = [
  'NCESSCH',
  'LEAID',
  'NAME',
  'OPSTFIPS',
  'STREET',
  'CITY',
  'STATE',
  'ZIP',
  'STFIP',
  'CNTY',
  'NMCNTY',
  'LOCALE',
  'LAT',
  'LON',
  'CBSA',
  'NMCBSA',
  'CBSATYPE',
  'CSA',
  'NMCSA',
  'NECTA',
  'CD',
  'SLDL',
  'SLDU',
  'SCHOOLYEAR',
];
const OPEN_STATUSES = new Set(['1', '3', '8']); // Open, New, Reopened
const GRADE_ORDER = [
  'PK',
  'KG',
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
];

function gradeTypes(r) {
  const offered = g => r[`G_${g}_OFFERED`] === 'Yes';
  const types = [];
  if (offered('PK')) types.push('preschool');
  if (['KG', '1', '2', '3', '4', '5'].some(offered)) types.push('elementary');
  if (['6', '7', '8'].some(offered)) types.push('middle');
  if (['9', '10', '11', '12'].some(offered)) types.push('high');
  if (offered('AE')) types.push('adult');
  return types;
}

function buildSchools(ccdFile, edgeFile) {
  const geo = Object.fromEntries(
    readTable(edgeFile, { sep: '|', header: false, columns: EDGE_COLUMNS })
      .filter(r => r.STATE === 'CA')
      .map(r => [r.NCESSCH, r])
  );
  const rows = readTable(ccdFile).filter(r => r.ST === 'CA' && OPEN_STATUSES.has(r.SY_STATUS));
  const data = [];
  let unlocated = 0;
  for (const r of rows) {
    const g = geo[r.NCESSCH];
    const lat = g ? Number(g.LAT) : NaN;
    const lng = g ? Number(g.LON) : NaN;
    if (!g) {
      unlocated++;
      continue;
    }
    if (!inLaunchArea(lat, lng)) continue;
    const lo = r.GSLO;
    const hi = r.GSHI;
    data.push({
      id: `us.ca.edu.nces-${r.NCESSCH}`,
      kind: 'school_site',
      name: r.SCH_NAME,
      sector: 'public',
      institution_type: 'k12_school',
      school_type: r.SCH_TYPE_TEXT,
      charter: r.CHARTER_TEXT === 'Yes',
      types: gradeTypes(r),
      grades: GRADE_ORDER.includes(lo) && GRADE_ORDER.includes(hi) ? { low: lo, high: hi } : null,
      district: { nces_leaid: r.LEAID, name: r.LEA_NAME },
      address: { street: r.LSTREET1, city: r.LCITY, state: 'CA', zip: r.LZIP },
      county: g.NMCNTY,
      phone: r.PHONE || null,
      website: /^https?:\/\//i.test(r.WEBSITE) ? r.WEBSITE : null,
      lat,
      lng,
      ids: { nces: r.NCESSCH, state: r.ST_SCHID },
    });
  }
  data.sort((a, b) => a.id.localeCompare(b.id));
  write(
    'schools-launch',
    {
      source:
        'NCES Common Core of Data, 2023-24 school directory (ccd_sch_029) joined with NCES EDGE 2023-24 public school geocodes',
      url: 'https://nces.ed.gov/ccd/Data/zip/ccd_sch_029_2324_w_1a_073124.zip',
      geocode_url: 'https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PUBLICSCH_2324.zip',
      version: 'nces-ccd-2023-24+edge-2023-24',
      coverage: LAUNCH_COVERAGE,
      excluded_without_geocode_statewide: unlocated,
      license: 'U.S. Government work (public domain)',
      caveats: [
        'Public schools only. Private schools are not yet ingested.',
        'California reports no pre-kindergarten grades to CCD, so preschools are not covered; transitional kindergarten is reported within kindergarten.',
        'School assignment depends on attendance boundaries, which this directory does not model.',
        'The California School Directory (CDE) download is behind a CAPTCHA and is not used.',
      ],
    },
    data
  );
}

const COLLEGE_TYPE = { 1: 'community_college', 4: 'community_college', 7: 'vocational' };

function buildColleges(file) {
  // SECTOR 0 rows are administrative units (district and system offices), not campuses.
  const rows = readTable(file).filter(
    r => r.STABBR === 'CA' && r.CYACTIVE === '1' && r.CONTROL === '1' && r.SECTOR !== '0'
  );
  const data = [];
  for (const r of rows) {
    const lat = Number(r.LATITUDE);
    const lng = Number(r.LONGITUD);
    if (!inLaunchArea(lat, lng)) continue;
    const url = u => (u ? (/^https?:\/\//i.test(u) ? u : `https://${u}`) : null);
    // IPEDS files associate's-dominant colleges that grant a few bachelor's
    // degrees (e.g. Foothill College) as 4-year; Carnegie 2021 basic classes
    // 1-14 are associate's colleges, so they are community colleges here.
    const carnegie = Number(r.C21BASIC);
    const kind =
      r.SECTOR === '1' && !(carnegie >= 1 && carnegie <= 14)
        ? 'university'
        : COLLEGE_TYPE[r.SECTOR] || 'community_college';
    data.push({
      id: `us.ca.edu.ipeds-${r.UNITID}`,
      kind: 'campus',
      name: r.INSTNM,
      sector: 'public',
      institution_type: kind,
      types: [
        { university: 'university', community_college: 'college', vocational: 'vocational' }[kind],
      ],
      system: r.F1SYSNAM && r.F1SYSNAM !== '-2' ? r.F1SYSNAM : null,
      address: { street: r.ADDR, city: r.CITY, state: 'CA', zip: r.ZIP },
      county: r.COUNTYNM,
      phone: r.GENTELE || null,
      website: url(r.WEBADDR),
      application_url: url(r.APPLURL),
      lat,
      lng,
      ids: { ipeds_unitid: r.UNITID, opeid: r.OPEID },
    });
  }
  data.sort((a, b) => a.id.localeCompare(b.id));
  write(
    'colleges-launch',
    {
      source: 'NCES IPEDS 2023 Institutional Characteristics, Directory information (HD2023)',
      url: 'https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip',
      version: 'ipeds-hd2023',
      coverage: LAUNCH_COVERAGE,
      license: 'U.S. Government work (public domain)',
      caveats: [
        'Public institutions only (IPEDS CONTROL=1). Private colleges are not yet enabled.',
        'Coordinates are the main campus; satellite centers are not listed.',
        'District and system offices (IPEDS sector 0) are excluded; they are not campuses.',
      ],
    },
    data
  );
}

if (args.zcta) buildZcta(args.zcta);
if (args.places) buildPlaces(args.places);
if (args['imls-outlets'] && args['imls-ae']) buildLibraries(args['imls-outlets'], args['imls-ae']);
if (args.ccd && args.edge) buildSchools(args.ccd, args.edge);
if (args.ipeds) buildColleges(args.ipeds);
