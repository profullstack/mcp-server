/**
 * Datamart module: public discovery for government services, libraries and
 * education, over HTTP and MCP (docs/datamart/prd.md, Phase A).
 *
 * HTTP (namespace roots answer with metadata, or run a search when given query
 * parameters — they are shareable deep links):
 *   GET /search?zip=95032&radius_miles=20[&namespace=lib|edu|gov]
 *   GET /gov  /gov/us/irs  /gov/us/data?q=…  /gov/us/ca/{bizfile,ftb,dmv,edd}
 *   GET /lib?zip=…  /lib/us/loc?q=…  /lib/us/ca/:resourceId
 *   GET /edu?zip=…&type=high  /edu/us/ca/:resourceId
 *   GET /contracts            official sources only (opportunity search is Phase B)
 *   GET /finance              status only; private finance is not available yet
 *   GET|POST /api/v1/tools/:name, GET /api/v1/tools, /api/v1/providers[/:id],
 *   GET /api/v1/resources/:id, /api/v1/health
 *
 * MCP (official SDK, Streamable HTTP, stateless JSON):
 *   /search/mcp /gov/mcp /lib/mcp /edu/mcp /contracts/mcp
 *   /gov/us/data/mcp /lib/us/loc/mcp      (one provider each)
 * The root /mcp also lists and runs every tool here (all are public reads).
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { TOOLS, runTool, toolsFor, getTool, jsonSchemaFor, healthSnapshot } from '../../src/datamart/tools.js';
import { MANIFESTS, NAMESPACES, listProviders, summarize } from '../../src/datamart/registry.js';
import { DatamartError, toErrorResponse } from '../../src/datamart/errors.js';
import { GEOCODER } from '../../src/datamart/geo.js';
import { logger } from '../../src/utils/logger.js';

const VERSION = '0.1.0';
const DISCLOSURE =
  'Datamart is operated by Profullstack, Inc. It is not a government service and is not affiliated with, ' +
  'endorsed by, or acting for any agency or library listed. Always confirm with the official source.';

export const tools = TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: jsonSchemaFor(t) }));

export const metadata = {
  name: 'Datamart',
  description:
    'Datamart (datamart.help): public discovery of U.S. government services, Data.gov, Library of Congress, and public libraries and schools near a place.',
  author: 'Profullstack, Inc.',
  tools,
  endpoints: [
    { method: 'GET', path: '/search', description: 'Location-aware search across namespaces' },
    { method: 'GET', path: '/gov', description: 'Government services' },
    { method: 'GET', path: '/lib', description: 'Libraries' },
    { method: 'GET', path: '/edu', description: 'Education' },
    { method: 'GET', path: '/contracts', description: 'Contract opportunity sources' },
    { method: 'POST', path: '/api/v1/tools/:name', description: 'Run a Datamart tool' },
  ],
};

/** Root /mcp tools/call. Errors carry the typed Datamart code as JSON text. */
export async function callTool(name, args) {
  try {
    return await runTool(name, args);
  } catch (err) {
    throw new Error(JSON.stringify(toErrorResponse(err).body));
  }
}

/* ---------- HTTP helpers ---------- */

const PRIVATE_FIELDS = new Set(['address']);

function redactFilters(args) {
  return Object.fromEntries(Object.entries(args).map(([k, v]) => [k, PRIVATE_FIELDS.has(k) ? '[redacted]' : v]));
}

/**
 * Turn a query string into tool arguments. `filters` may hold percent-encoded
 * JSON; ordinary parameters override the same keys in it (PRD §5.3).
 */
export function argsFromQuery(c, tool) {
  const all = c.req.queries();
  let args = {};
  if (all.filters) {
    try {
      const parsed = JSON.parse(all.filters.at(-1));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      args = parsed;
    } catch {
      throw new DatamartError('invalid_filters', 'filters must be a JSON object', { field: 'filters' });
    }
  }
  for (const [key, values] of Object.entries(all)) {
    if (key === 'filters') continue;
    const def = tool.shape[key];
    const inner = def?.unwrap ? def.unwrap() : def;
    const wantsArray = inner instanceof z.ZodArray;
    args[key] = wantsArray ? values : values.at(-1);
  }
  return args;
}

async function respond(c, name, args) {
  try {
    const out = await runTool(name, args);
    out.meta = { ...out.meta, tool: name, effective_filters: redactFilters(args) };
    c.header('Cache-Control', 'public, max-age=300');
    return c.json({ ...out, disclosure: DISCLOSURE });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    if (status >= 500 && !(err instanceof DatamartError)) logger.error(`datamart ${name}: ${err?.stack || err}`);
    c.header('Cache-Control', 'no-store');
    return c.json(body, status);
  }
}

function runFromQuery(c, name) {
  const tool = getTool(name);
  try {
    return respond(c, name, argsFromQuery(c, tool));
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return c.json(body, status);
  }
}

const hasQuery = c => new URL(c.req.url).search.length > 1;

function namespacePage(ns) {
  const base = NAMESPACES[ns];
  return {
    namespace: ns,
    ...base,
    providers: listProviders({ namespace: ns }),
    mcp_endpoint: `/${ns}/mcp`,
    tools: toolsFor({ namespace: ns }).map(t => t.name),
    disclosure: DISCLOSURE,
  };
}

function providerPage(id) {
  const m = MANIFESTS.find(x => x.id === id);
  const providerTools = toolsFor({ provider: id }).map(t => t.name);
  return {
    ...summarize(m),
    info_url: m.infoUrl || null,
    facts: m.facts || [],
    sources: m.sources,
    capabilities: m.capabilities,
    tools: providerTools,
    mcp_endpoint: providerTools.length ? `${m.path}/mcp` : null,
    handoff: { label: 'Continue on the official site', url: m.officialUrl },
    disclosure: DISCLOSURE,
  };
}

/* ---------- MCP over the official SDK ---------- */

function buildMcpServer(label, toolDefs) {
  const server = new McpServer(
    { name: `datamart-${label}`, version: VERSION },
    { instructions: `${DISCLOSURE} Every tool here is a read-only public lookup.` }
  );
  for (const t of toolDefs) {
    server.registerTool(
      t.name,
      {
        description: t.description,
        inputSchema: z.object(t.shape).strict(),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      },
      async args => {
        try {
          const out = await runTool(t.name, args);
          return { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out };
        } catch (err) {
          return { isError: true, content: [{ type: 'text', text: JSON.stringify(toErrorResponse(err).body) }] };
        }
      }
    );
  }
  return server;
}

function mountMcp(app, path, label, toolDefs) {
  app.all(path, async c => {
    const server = buildMcpServer(label, toolDefs);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(c.req.raw);
    } finally {
      // Stateless: one server per request. close() after the JSON response is built.
      queueMicrotask(() => server.close().catch(() => {}));
    }
  });
}

/* ---------- registration ---------- */

export async function register(app) {
  // MCP endpoints first so /…/mcp never falls into a :resourceId route.
  for (const ns of ['search', 'gov', 'lib', 'edu', 'contracts']) {
    mountMcp(app, `/${ns}/mcp`, ns, toolsFor({ namespace: ns }));
  }
  for (const m of MANIFESTS) {
    const defs = toolsFor({ provider: m.id });
    if (defs.length && m.path !== `/${m.namespace}`) mountMcp(app, `${m.path}/mcp`, m.id, defs);
  }
  app.all('/finance/mcp', c =>
    c.json(
      new DatamartError('unsupported_operation', 'Private finance tools are not available yet (Phase C). No finance data is reachable here.').toJSON(),
      501
    )
  );

  // Namespace roots: metadata, or a search when the URL carries query parameters.
  app.get('/search', c => runFromQuery(c, 'datamart_search'));
  app.get('/gov', c => (hasQuery(c) ? runFromQuery(c, 'gov_services_search') : c.json(namespacePage('gov'))));
  app.get('/lib', c => (hasQuery(c) ? runFromQuery(c, 'libraries_search') : c.json(namespacePage('lib'))));
  app.get('/edu', c => (hasQuery(c) ? runFromQuery(c, 'education_search') : c.json(namespacePage('edu'))));
  app.get('/contracts', c => {
    if (hasQuery(c)) {
      const err = new DatamartError(
        'unsupported_operation',
        'Contract opportunity search is not available yet (Phase B). See the official sources listed here.',
        { sources: listProviders({ namespace: 'contracts' }) }
      );
      return c.json(err.toJSON(), err.status);
    }
    return c.json(namespacePage('contracts'));
  });
  app.get('/finance', c =>
    c.json({
      namespace: 'finance',
      ...NAMESPACES.finance,
      status: 'not_available',
      authentication_required: true,
      providers: listProviders({ namespace: 'finance' }),
      note: 'Finance access will require your own authorized CoinPay connection. Nothing is exposed publicly.',
    })
  );

  // Provider pages; Data.gov and LoC run their search when given a query.
  for (const m of MANIFESTS) {
    if (m.path === `/${m.namespace}`) continue;
    app.get(m.path, c => {
      if (hasQuery(c) && m.id === 'us.gsa.datagov') return runFromQuery(c, 'datagov_search');
      if (hasQuery(c) && m.id === 'us.loc') return runFromQuery(c, 'loc_search');
      return c.json(providerPage(m.id));
    });
  }
  // Short aliases redirect to country-qualified canonical URLs.
  for (const [alias, target] of [
    ['/gov/irs', '/gov/us/irs'],
    ['/gov/data', '/gov/us/data'],
    ['/gov/bizfile', '/gov/us/ca/bizfile'],
    ['/gov/ftb', '/gov/us/ca/ftb'],
    ['/gov/dmv', '/gov/us/ca/dmv'],
    ['/gov/edd', '/gov/us/ca/edd'],
    ['/lib/loc', '/lib/us/loc'],
  ]) {
    app.get(alias, c => c.redirect(target + new URL(c.req.url).search, 301));
  }
  app.get('/lib/us/loc/items/:id', c => respond(c, 'loc_get_item', { id: c.req.param('id') }));
  app.get('/lib/us/ca/:resourceId', c => respond(c, 'library_get', { id: c.req.param('resourceId') }));
  app.get('/edu/us/ca/:resourceId', c => respond(c, 'education_get', { id: c.req.param('resourceId') }));

  // Versioned API.
  app.get('/api/v1/tools', c =>
    c.json({ tools: TOOLS.map(t => ({ name: t.name, description: t.description, namespaces: t.namespaces, input_schema: jsonSchemaFor(t) })) })
  );
  app.get('/api/v1/tools/:name', c => {
    const name = c.req.param('name');
    if (!getTool(name)) return c.json(new DatamartError('not_found', `Unknown tool ${name}`).toJSON(), 404);
    return runFromQuery(c, name);
  });
  app.post('/api/v1/tools/:name', async c => {
    const name = c.req.param('name');
    if (!getTool(name)) return c.json(new DatamartError('not_found', `Unknown tool ${name}`).toJSON(), 404);
    let args;
    try {
      args = await c.req.json();
    } catch {
      return c.json(new DatamartError('invalid_filters', 'Body must be a JSON object').toJSON(), 400);
    }
    return respond(c, name, args ?? {});
  });
  app.get('/api/v1/providers', c => c.json({ providers: listProviders({ namespace: c.req.query('namespace') }) }));
  app.get('/api/v1/providers/:id', c => respond(c, 'resource_capabilities', { id: c.req.param('id') }));
  app.get('/api/v1/resources/:id', c => respond(c, 'resource_get', { id: c.req.param('id') }));
  app.get('/api/v1/health', async c => {
    const out = await runTool('provider_status', {});
    return c.json({ ...out, live: healthSnapshot(), geocoder: GEOCODER });
  });

  logger.info(`Datamart module registered: ${TOOLS.length} public tools, ${MANIFESTS.length} providers`);
}
