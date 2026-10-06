/**
 * Fleet module: the catalog of every Profullstack service, over MCP and HTTP.
 *
 * The data is @profullstack/stack/fleet (one source of truth for MCP servers,
 * webhooks, CLIs and sites). Every service signs in with CoinPay OAuth, so
 * `get_auth` is the one thing a client needs to talk to any of them.
 *
 * MCP: tools/call runs callTool() below in-process.
 * HTTP: GET /fleet, GET /fleet/services, GET /fleet/services/:domain,
 *       POST /tools/fleet/<tool> with the tool's arguments as JSON.
 */
import {
  FLEET,
  FLEET_AUTH,
  categories,
  getService,
  listServices,
  searchServices,
} from '@profullstack/stack/fleet';
import { logger } from '../../src/utils/logger.js';

const SURFACES = ['api', 'openapi', 'mcp', 'openmcp', 'llms', 'install', 'pwa', 'openaccess'];

export const tools = [
  {
    name: 'fleet_list_services',
    description:
      'List the Profullstack fleet: every product with its URL, category, and which surfaces it has (API, MCP, llms.txt, installer, PWA). Filter by category or by a surface.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'e.g. developer-tools, ai, finance, media, security' },
        has: { type: 'string', enum: SURFACES, description: 'only services with this surface' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'fleet_get_service',
    description: 'Everything about one Profullstack service by domain, URL or name: surfaces, MCP endpoint, npm packages, pwamart install page, auth.',
    inputSchema: {
      type: 'object',
      properties: { service: { type: 'string', description: 'domain, URL or name, e.g. "hqtui.com"' } },
      required: ['service'],
      additionalProperties: false,
    },
  },
  {
    name: 'fleet_search_services',
    description: 'Search the Profullstack fleet by what you need, e.g. "podcast directory" or "webhooks".',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 62 } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'fleet_get_auth',
    description: 'How to sign in to any Profullstack service: CoinPay OAuth (OIDC) issuer, discovery URL, scopes, PKCE and callback path.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

const brief = (s) => ({
  domain: s.domain,
  name: s.name,
  category: s.category,
  url: s.url,
  description: s.description,
  surfaces: Object.fromEntries(Object.entries(s.surfaces).filter(([, v]) => v)),
  pwamart: s.pwamart,
});

/** MCP tools/call entry point (see src/core/routes.js). */
export async function callTool(name, args = {}) {
  switch (name) {
    case 'fleet_list_services':
      return { total: FLEET.services.length, categories: categories(), services: listServices(args).map(brief) };
    case 'fleet_get_service': {
      const s = getService(args.service);
      if (!s) throw new Error(`no Profullstack service matches "${args.service}"`);
      return s;
    }
    case 'fleet_search_services':
      return searchServices(args.query, args.limit ?? 10).map(brief);
    case 'fleet_get_auth':
      return FLEET_AUTH;
    default:
      throw new Error(`unknown fleet tool ${name}`);
  }
}

export async function register(app) {
  logger.info('Registering fleet module');
  app.get('/fleet', (c) => c.json({ module: 'fleet', services: FLEET.services.length, updated: FLEET.updated, auth: FLEET_AUTH }));
  app.get('/fleet/services', async (c) => c.json(await callTool('fleet_list_services', c.req.query())));
  app.get('/fleet/services/:domain', (c) => {
    const s = getService(c.req.param('domain'));
    return s ? c.json(s) : c.json({ error: 'no such service' }, 404);
  });
  app.get('/tools/fleet/info', (c) => c.json({ name: 'fleet', tools }));
  for (const t of tools) {
    app.post(`/tools/fleet/${t.name}`, async (c) => {
      try {
        const args = await c.req.json().catch(() => ({}));
        return c.json(await callTool(t.name, args));
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    });
  }
}

export async function unregister() {
  logger.info('Unregistering fleet module');
}

export const metadata = {
  name: 'fleet',
  version: '1.0.0',
  description: 'The Profullstack fleet catalog: 62 services, their APIs, MCP servers and installers, all on CoinPay OAuth',
  author: 'Profullstack, Inc.',
  tools,
  endpoints: [
    { path: '/fleet', method: 'GET', description: 'Catalog summary and auth' },
    { path: '/fleet/services', method: 'GET', description: 'List services (?category=&has=)' },
    { path: '/fleet/services/:domain', method: 'GET', description: 'One service' },
    ...tools.map((t) => ({ path: `/tools/fleet/${t.name}`, method: 'POST', description: t.description })),
  ],
};
