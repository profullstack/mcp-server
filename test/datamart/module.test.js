import { Hono } from 'hono';
import { setupCoreRoutes } from '../../src/core/routes.js';
import { register, tools, callTool } from '../../mcp_modules/datamart/index.js';

const MCP_HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
  'mcp-protocol-version': '2025-11-25',
};

async function makeApp() {
  const app = new Hono();
  setupCoreRoutes(app);
  await register(app);
  return app;
}

const rpc = async (app, path, method, params) => {
  const res = await app.request(path, {
    method: 'POST',
    headers: MCP_HEADERS,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }),
  });
  return { status: res.status, body: res.status === 200 ? await res.json() : await res.text() };
};

describe('datamart module', () => {
  let app;
  before(async () => {
    app = await makeApp();
  });

  it('exports public tools with JSON Schemas for the root dispatcher', () => {
    expect(tools.length).to.be.greaterThan(10);
    for (const t of tools) {
      expect(t.inputSchema.type).to.equal('object');
      expect(t.inputSchema.additionalProperties).to.equal(false);
    }
  });

  it('namespace roots return metadata, and run a search when given a deep link', async () => {
    const meta = await (await app.request('/lib')).json();
    expect(meta.namespace).to.equal('lib');
    expect(meta.mcp_endpoint).to.equal('/lib/mcp');
    const res = await app.request('/lib?zip=95030&radius_miles=3');
    const body = await res.json();
    expect(res.status).to.equal(200);
    expect(body.data[0].name).to.equal('Los Gatos Public Library');
    expect(body.meta.effective_filters).to.deep.equal({ zip: '95030', radius_miles: '3' });
    expect(body.disclosure).to.match(/not affiliated/);
  });

  it('merges ?filters= JSON with scalar overrides and rejects unknown filters', async () => {
    const f = encodeURIComponent(JSON.stringify({ zip: '95032', type: 'university', radius_miles: 5 }));
    const body = await (await app.request(`/edu?filters=${f}&radius_miles=30`)).json();
    expect(body.meta.effective_filters.radius_miles).to.equal('30');
    expect(body.data.map(x => x.name)).to.include('San Jose State University');
    const bad = await app.request('/lib?zip=95032&colour=red');
    expect(bad.status).to.equal(400);
    expect((await bad.json()).error.code).to.equal('invalid_filters');
  });

  it('redacts street addresses from echoed filters', async () => {
    const res = await app.request('/api/v1/tools/libraries_search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: '1 Secret Way', zip: '95032', country: 'FR' }),
    });
    const body = await res.json();
    expect(res.status).to.equal(422);
    expect(body.error.code).to.equal('country_not_supported');
    expect(JSON.stringify(body)).to.not.include('Secret');
  });

  it('provider pages show capabilities and short aliases redirect', async () => {
    const irs = await (await app.request('/gov/us/irs')).json();
    expect(irs.headline_state).to.equal('directory_only');
    expect(irs.official_affiliation).to.equal(false);
    expect(irs.mcp_endpoint).to.equal(null);
    const r = await app.request('/gov/irs');
    expect(r.status).to.equal(301);
    expect(r.headers.get('location')).to.equal('/gov/us/irs');
  });

  it('contracts and finance are explicit about what is not available', async () => {
    const c = await app.request('/contracts?category=programming&status=open');
    expect(c.status).to.equal(501);
    expect((await c.json()).error.code).to.equal('unsupported_operation');
    const f = await (await app.request('/finance')).json();
    expect(f.status).to.equal('not_available');
    const fm = await app.request('/finance/mcp', { method: 'POST', headers: MCP_HEADERS, body: '{}' });
    expect(fm.status).to.equal(501);
  });

  it('serves MCP over the official SDK per namespace and per provider (AT02)', async () => {
    const init = await rpc(app, '/lib/mcp', 'initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'test', version: '0' },
    });
    expect(init.body.result.serverInfo.name).to.equal('datamart-lib');
    const list = await rpc(app, '/lib/mcp', 'tools/list');
    const names = list.body.result.tools.map(t => t.name);
    expect(names).to.include.members(['libraries_search', 'loc_search']);
    expect(names).to.not.include('education_search');
    const loc = await rpc(app, '/lib/us/loc/mcp', 'tools/list');
    expect(loc.body.result.tools.map(t => t.name)).to.deep.equal([
      'loc_search',
      'loc_list_collections',
      'loc_get_item',
      'loc_get_resource_links',
    ]);
    const call = await rpc(app, '/lib/mcp', 'tools/call', { name: 'libraries_search', arguments: { zip: '95030', radius_miles: 3 } });
    expect(call.body.result.isError).to.not.equal(true);
    expect(call.body.result.structuredContent.data[0].name).to.equal('Los Gatos Public Library');
    const bad = await rpc(app, '/lib/mcp', 'tools/call', { name: 'libraries_search', arguments: { zip: '95030', bogus: 1 } });
    expect(bad.body.result.isError).to.equal(true);
  });

  it('root /mcp lists and executes the same tools in-process, never a finance tool (AT19)', async () => {
    const list = await rpc(app, '/mcp', 'tools/list');
    // Core routes read the real module directory; Datamart is one of the modules there.
    const names = list.body.result.tools.map(t => t.name);
    expect(names).to.include('datamart_search');
    expect(names.some(n => /^finance/.test(n))).to.equal(false);
    const call = await rpc(app, '/mcp', 'tools/call', { name: 'education_search', arguments: { zip: '95032', type: 'university', radius_miles: 15 } });
    const out = JSON.parse(call.body.result.content[0].text);
    expect(out.data.map(x => x.name)).to.deep.equal(['San Jose State University']);
  });

  it('callTool reports typed errors as JSON', async () => {
    try {
      await callTool('libraries_search', { zip: '10001' });
      throw new Error('should fail');
    } catch (err) {
      expect(JSON.parse(err.message).error.code).to.equal('insufficient_geospatial_coverage');
    }
  });

  it('existing root routes still answer (AT01)', async () => {
    expect((await app.request('/health')).status).to.equal(200);
    const root = await (await app.request('/')).json();
    expect(root.name).to.equal('MCP Server');
  });
});
