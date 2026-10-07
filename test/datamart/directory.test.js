import { searchLibraries, searchEducation, getDirectoryRecord, directoryCoverage } from '../../src/datamart/directory.js';
import { loadSnapshot } from '../../src/datamart/snapshots.js';
import { haversineMiles } from '../../src/datamart/geo.js';
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

describe('datamart directory', () => {
  it('95032 / 20 miles returns only validated in-radius libraries, nearest first (AT06)', async () => {
    const r = await searchLibraries({ zip: '95032', radius_miles: 20, limit: 100 });
    expect(r.meta.origin.form).to.equal('zip');
    expect(r.meta.location_applied).to.equal(true);
    expect(r.meta.distance_method).to.equal('haversine-v1');
    expect(r.data.length).to.equal(r.meta.total_matches);
    expect(r.data.length).to.be.greaterThan(20);
    for (const lib of r.data) {
      const d = haversineMiles(r.meta.origin.lat, r.meta.origin.lng, lib.lat, lib.lng);
      expect(d).to.be.at.most(20.001);
      expect(['central', 'branch']).to.include(lib.outlet_type);
    }
    const ds = r.data.map(x => x.distance_miles);
    expect(ds).to.deep.equal([...ds].sort((a, b) => a - b));
    const names = r.data.map(x => x.name);
    expect(names).to.include('Los Gatos Public Library');
    // Every listed system around 95032 the PRD names for audit is present
    const systems = new Set(r.data.map(x => x.system.fscskey));
    for (const s of ['CA0164', 'CA0126', 'CA0115', 'CA0125']) expect(systems.has(s), s).to.equal(true);
  });

  it('keeps branches distinct from systems and never implies eligibility (AT10)', async () => {
    const r = await searchLibraries({ zip: '95030', radius_miles: 3 });
    const lg = r.data.find(x => x.name === 'Los Gatos Public Library');
    expect(lg.id).to.equal('us.ca.lib.ca0164-002');
    expect(lg.system.id).to.equal('us.ca.lib.ca0164');
    expect(lg.eligibility.status).to.equal('not_determined');
    expect(lg.capability).to.equal('directory_only');
  });

  it('paginates with a snapshot-bound cursor without repeats or gaps', async () => {
    const all = await searchLibraries({ zip: '95032', limit: 100 });
    const p1 = await searchLibraries({ zip: '95032', limit: 10 });
    const p2 = await searchLibraries({ zip: '95032', limit: 10, cursor: p1.meta.next_cursor });
    expect([...p1.data, ...p2.data].map(x => x.id)).to.deep.equal(all.data.slice(0, 20).map(x => x.id));
    await rejects(searchLibraries({ zip: '95032', cursor: 'garbage' }), 'invalid_filters');
  });

  it('refuses areas outside coverage instead of returning an empty or substituted list', async () => {
    await rejects(searchLibraries({ zip: '10001' }), 'insufficient_geospatial_coverage');
    const partial = await searchLibraries({ zip: '95032', radius_miles: 90 });
    expect(partial.meta.coverage).to.equal('partial');
    await rejects(searchLibraries({ zip: '95032', radius_miles: 90, strict: 'true' }), 'insufficient_geospatial_coverage');
  });

  it('public schools exclude private, separate sites from districts, and label eligibility (AT09)', async () => {
    const r = await searchEducation({ zip: '95032', type: 'high', limit: 100 });
    expect(r.data.length).to.be.greaterThan(5);
    for (const s of r.data) {
      expect(s.sector).to.equal('public');
      expect(['school_site', 'campus']).to.include(s.kind);
      expect(s.eligibility.status).to.equal('not_determined');
    }
    await rejects(searchEducation({ zip: '95032', sector: 'private' }), 'insufficient_geospatial_coverage');
    await rejects(searchEducation({ zip: '95032', type: 'nursery' }), 'invalid_filters');
  });

  it('labels community colleges and universities from Carnegie class, not IPEDS sector alone', async () => {
    const uni = await searchEducation({ zip: '95032', radius_miles: 30, type: 'university' });
    const names = uni.data.map(x => x.name);
    expect(names).to.include('San Jose State University');
    expect(names).to.not.include('Foothill College');
    const cc = await searchEducation({ zip: '95032', radius_miles: 30, type: 'college' });
    expect(cc.data.map(x => x.name)).to.include('Foothill College');
    expect(names.some(n => /District|System/.test(n))).to.equal(false);
  });

  it('says preschool is a coverage gap instead of implying there are none', async () => {
    const r = await searchEducation({ zip: '95032', type: 'preschool' });
    expect(r.meta.coverage_gaps).to.deep.equal(['preschool']);
    expect(r.warnings[0]).to.match(/does not mean there are none/);
  });

  it('gets records by id and reports coverage counts', () => {
    expect(getDirectoryRecord('us.ca.lib.ca0164-002').record.name).to.equal('Los Gatos Public Library');
    expect(() => getDirectoryRecord('us.ca.lib.nope')).to.throw(DatamartError);
    const cov = directoryCoverage();
    expect(cov['schools-launch'].unresolved_coordinates).to.equal(0);
    expect(cov['libraries-launch'].version).to.equal('imls-pls-fy2024');
  });

  it('snapshots carry source provenance', () => {
    for (const n of ['zcta-us', 'places-us', 'libraries-launch', 'schools-launch', 'colleges-launch']) {
      const m = loadSnapshot(n).meta;
      expect(m.source, n).to.be.a('string');
      expect(m.url, n).to.match(/^https:\/\//);
      expect(m.version, n).to.be.a('string');
      expect(m.retrieved_at, n).to.match(/^\d{4}-\d{2}-\d{2}/);
    }
  });
});
