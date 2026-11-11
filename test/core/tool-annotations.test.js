import { Hono } from 'hono';
import { setupCoreRoutes } from '../../src/core/routes.js';
import { TOOL_META } from '../../src/core/toolAnnotations.js';

// Every tool in tools/list must carry a human title and explicit
// readOnly / destructive / openWorld hints (Claude + ChatGPT directory rules).
// The real module directory is loaded here, as in production.
describe('tools/list annotations', () => {
  it('gives every tool a title and all three hint booleans', async function () {
    this.timeout(120000); // imports every module in mcp_modules
    const app = new Hono();
    setupCoreRoutes(app);
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    const { result } = await res.json();
    expect(result.tools.length).to.be.greaterThan(40);
    for (const t of result.tools) {
      expect(TOOL_META, `${t.name} is not classified in toolAnnotations.js`).to.have.property(t.name);
      expect(t.title, `${t.name} title`).to.be.a('string').and.not.equal('');
      for (const hint of ['readOnlyHint', 'destructiveHint', 'openWorldHint']) {
        expect(t.annotations[hint], `${t.name} ${hint}`).to.be.a('boolean');
      }
      if (t.annotations.readOnlyHint) expect(t.annotations.destructiveHint, t.name).to.equal(false);
    }
  });
});
