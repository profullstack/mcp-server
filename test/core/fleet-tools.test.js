import { Hono } from 'hono';
import { setupCoreRoutes } from '../../src/core/routes.js';
import { callTool, tools } from '../../mcp_modules/fleet/index.js';

// Modules that export callTool(name, args) answer MCP tools/call in-process;
// the fleet module is the first. The real module directory is loaded here.
const rpc = async (app, method, params) => {
  const res = await app.request('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return res.json();
};

describe('fleet module', () => {
  it('declares four tools with schemas', () => {
    expect(tools.map((t) => t.name)).to.deep.equal([
      'fleet_list_services',
      'fleet_get_service',
      'fleet_search_services',
      'fleet_get_auth',
    ]);
    for (const t of tools) expect(t.inputSchema.type).to.equal('object');
  });

  it('answers each tool from the stack catalog', async () => {
    const all = await callTool('fleet_list_services', {});
    expect(all.total).to.equal(62);
    expect((await callTool('fleet_get_service', { service: 'https://www.hqtui.com/' })).name).to.equal('HQTUI');
    expect((await callTool('fleet_search_services', { query: 'app store' })).some((s) => s.domain === 'pwamart.com')).to.equal(true);
    expect((await callTool('fleet_get_auth')).issuer).to.equal('https://coinpayportal.com');
    let threw = false;
    try {
      await callTool('fleet_get_service', { service: 'nope.example' });
    } catch {
      threw = true;
    }
    expect(threw).to.equal(true);
  });

  it('runs through MCP tools/list and tools/call on the real server routes', async () => {
    const app = new Hono();
    setupCoreRoutes(app);
    const list = await rpc(app, 'tools/list', {});
    const fleet = list.result.tools.find((t) => t.name === 'fleet_get_service');
    expect(fleet.inputSchema.required).to.deep.equal(['service']);
    const call = await rpc(app, 'tools/call', { name: 'fleet_get_service', arguments: { service: 'pwamart.com' } });
    expect(call.result.isError).to.equal(false);
    expect(JSON.parse(call.result.content[0].text).auth.provider).to.equal('coinpay');
  });
});
