import * as datagov from '../../src/datamart/providers/datagov.js';
import * as loc from '../../src/datamart/providers/loc.js';
import { fetchJson, resetHttpState } from '../../src/datamart/http.js';
import { DatamartError } from '../../src/datamart/errors.js';

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
const html = (text, status = 200) =>
  new Response(text, { status, headers: { 'content-type': 'text/html' } });

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

describe('datamart http', () => {
  beforeEach(resetHttpState);

  it('refuses hosts outside the allowlist before any request', async () => {
    let called = false;
    const fetch = async () => {
      called = true;
    };
    await rejects(
      fetchJson('https://169.254.169.254/latest', { provider: 'loc', fetch }),
      'source_unavailable'
    );
    await rejects(
      fetchJson('http://www.loc.gov/', { provider: 'loc', fetch }),
      'source_unavailable'
    );
    expect(called).to.equal(false);
  });

  it('treats a challenge page as an error, not data', async () => {
    const fetch = async () => html('<title>Radware Captcha Page</title>');
    await rejects(
      fetchJson('https://www.loc.gov/search/?fo=json', { provider: 'loc', fetch }),
      'source_unavailable'
    );
  });

  it('does not follow redirects', async () => {
    const fetch = async () =>
      new Response('', { status: 302, headers: { location: 'https://evil.example/' } });
    await rejects(
      fetchJson('https://www.loc.gov/x/?fo=json', { provider: 'loc', fetch }),
      'source_unavailable'
    );
  });

  it('pauses a provider after it rate-limits, without calling it again (AT25)', async () => {
    let calls = 0;
    const fetch = async () => {
      calls++;
      return html('slow down', 429);
    };
    const err = await rejects(
      fetchJson('https://www.loc.gov/a/?fo=json', { provider: 'loc', fetch }),
      'source_rate_limited'
    );
    expect(err.details.retry_after_seconds).to.equal(3600);
    await rejects(
      fetchJson('https://www.loc.gov/b/?fo=json', { provider: 'loc', fetch }),
      'source_rate_limited'
    );
    expect(calls).to.equal(1);
  });

  it('never lets Retry-After shorten the pause below the block period', async () => {
    const fetch = async () => new Response('x', { status: 429, headers: { 'retry-after': '1' } });
    const err = await rejects(
      fetchJson('https://www.loc.gov/r/?fo=json', { provider: 'loc', fetch }),
      'source_rate_limited'
    );
    expect(err.details.retry_after_seconds).to.equal(3600);
  });

  it('enforces the per-minute budget below the published limit', async () => {
    const fetch = async () => json({ ok: true });
    for (let i = 0; i < 15; i++)
      await fetchJson(`https://www.loc.gov/${i}/?fo=json`, { provider: 'loc', fetch });
    await rejects(
      fetchJson('https://www.loc.gov/16/?fo=json', { provider: 'loc', fetch }),
      'source_rate_limited'
    );
  });

  it('caches by key when asked', async () => {
    let calls = 0;
    const fetch = async () => json({ n: ++calls });
    const a = await fetchJson('https://www.loc.gov/c/?fo=json', {
      provider: 'loc',
      fetch,
      cacheTtlMs: 1000,
    });
    const b = await fetchJson('https://www.loc.gov/c/?fo=json', {
      provider: 'loc',
      fetch,
      cacheTtlMs: 1000,
    });
    expect(a).to.deep.equal(b);
    expect(calls).to.equal(1);
  });
});

describe('datamart Data.gov adapter', () => {
  let saved;
  beforeEach(() => {
    resetHttpState();
    saved = process.env.DATAGOV_API_KEY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.DATAGOV_API_KEY;
    else process.env.DATAGOV_API_KEY = saved;
  });

  it('fails with configuration_required, not an empty success, when unkeyed (AT04)', async () => {
    delete process.env.DATAGOV_API_KEY;
    let called = false;
    const err = await rejects(
      datagov.search({ q: 'x' }, { fetch: async () => (called = true) }),
      'configuration_required'
    );
    expect(err.details.handoff_url).to.equal('https://catalog.data.gov/');
    expect(called).to.equal(false);
  });

  it('sends the key as a header, normalizes records and passes the cursor through (AT03)', async () => {
    process.env.DATAGOV_API_KEY = 'test-key';
    const seen = [];
    const pages = {
      '': {
        after: 'CUR1',
        results: [
          {
            identifier: 'a',
            slug: 'a',
            title: 'A',
            harvest_record: 'https://api.gsa.gov/technology/datagov/v4/harvest_record/h-a',
            dcat: {
              accessLevel: 'public',
              distribution: [{ downloadURL: 'https://x/a.csv', format: 'CSV' }],
            },
          },
        ],
      },
      CUR1: { results: [{ identifier: 'b', slug: 'b', title: 'B' }] },
    };
    const fetch = async (url, init) => {
      seen.push({ url, key: init.headers['X-Api-Key'] });
      const after = new URL(url).searchParams.get('after') || '';
      return json(pages[after]);
    };
    const p1 = await datagov.search({ q: 'libraries' }, { fetch });
    expect(seen[0].key).to.equal('test-key');
    expect(seen[0].url).to.not.include('test-key');
    expect(p1.results[0]).to.include({
      id: 'a',
      title: 'A',
      harvest_record_id: 'h-a',
      catalog_url: 'https://catalog.data.gov/dataset/a',
    });
    expect(p1.results[0].distributions[0]).to.include({
      download_url: 'https://x/a.csv',
      format: 'CSV',
    });
    expect(p1.next_cursor).to.equal('CUR1');
    const p2 = await datagov.search({ q: 'libraries', after: 'CUR1' }, { fetch });
    expect(p2.results.map(r => r.id)).to.deep.equal(['b']);
    expect(p2.next_cursor).to.equal(null);
  });

  it('validates enumerated filters', async () => {
    process.env.DATAGOV_API_KEY = 'k';
    await rejects(datagov.search({ org_type: 'Galactic Government' }), 'invalid_filters');
    await rejects(datagov.search({ sort: 'distance' }), 'invalid_filters');
    await rejects(datagov.getRecord('../../etc'), 'invalid_filters');
  });

  it('maps a rejected key to configuration_required', async () => {
    process.env.DATAGOV_API_KEY = 'bad';
    await rejects(
      datagov.search({ q: 'x' }, { fetch: async () => json({ error: 'API_KEY_INVALID' }, 403) }),
      'configuration_required'
    );
  });
});

describe('datamart Library of Congress adapter', () => {
  beforeEach(resetHttpState);

  it('searches, preserves ids and links, and pages by number (AT05)', async () => {
    let url;
    const fetch = async u => {
      url = new URL(u);
      return json({
        results: [
          {
            id: 'http://www.loc.gov/item/2021668470/',
            title: 'Los Gatos, Cal.',
            url: 'https://www.loc.gov/item/2021668470/',
            image_url: ['https://tile.loc.gov/x.jpg'],
            original_format: ['map'],
            access_restricted: false,
          },
        ],
        pagination: { of: 42, next: 'https://www.loc.gov/maps/?sp=2' },
      });
    };
    const r = await loc.search({ q: 'los gatos', format: 'maps' }, { fetch });
    expect(url.pathname).to.equal('/maps/');
    expect(url.searchParams.get('fo')).to.equal('json');
    expect(r.results[0]).to.include({ id: '2021668470', title: 'Los Gatos, Cal.' });
    expect(r.results[0].loc_id).to.equal('http://www.loc.gov/item/2021668470/');
    expect(r.total).to.equal(42);
    expect(r.next_cursor).to.equal('2');
    await loc.search({ q: 'los gatos', format: 'maps', cursor: '2' }, { fetch });
    expect(url.searchParams.get('sp')).to.equal('2');
  });

  it('returns item rights and resource files', async () => {
    const fetch = async () =>
      json({
        item: {
          title: 'T',
          rights_advisory: ['No known restrictions on publication.'],
          access_restricted: false,
        },
        resources: [
          {
            url: 'http://www.loc.gov/resource/x/',
            files: [[{ url: 'https://tile.loc.gov/x.tif', mimetype: 'image/tiff' }]],
          },
        ],
      });
    expect(
      loc.plainText(
        '<p>Public domain.</p>\n<p>More about&nbsp;<a href="/legal/">Copyright</a>.</p>'
      )
    ).to.equal('Public domain. More about Copyright .');
    const item = await loc.getItem('2021668470', { fetch });
    expect(item.rights.advisory).to.deep.equal(['No known restrictions on publication.']);
    expect(item.url).to.equal('https://www.loc.gov/item/2021668470/');
    resetHttpState();
    const links = await loc.getResourceLinks('2021668470', { fetch });
    expect(links.resources[0].url).to.equal('https://www.loc.gov/resource/x/');
    expect(links.resources[0].files[0]).to.include({ mimetype: 'image/tiff' });
  });

  it('surfaces upstream errors instead of empty results', async () => {
    await rejects(loc.getItem('x', { fetch: async () => html('nope', 404) }), 'not_found');
    resetHttpState();
    await rejects(
      loc.search(
        { q: 'x' },
        { fetch: async () => html('<title>Service-Unavailable -- 503</title>', 503) }
      ),
      'source_rate_limited'
    );
    resetHttpState();
    await rejects(
      loc.search({ q: 'x' }, { fetch: async () => json({ unexpected: true }) }),
      'source_unavailable'
    );
    await rejects(loc.search({ format: 'photos', collection: 'x' }), 'invalid_filters');
    await rejects(loc.getItem('../etc/passwd'), 'invalid_filters');
    await rejects(loc.getItem('..'), 'invalid_filters');
    await rejects(loc.getItem('.'), 'invalid_filters');
  });
});
