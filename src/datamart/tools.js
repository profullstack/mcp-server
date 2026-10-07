/**
 * Datamart tools: one definition shared by MCP (root /mcp, namespace /…/mcp),
 * the HTTP API and the CLI, so every surface validates and behaves the same
 * (PRD §15, AT02, AT13).
 *
 * Every tool here is a public read. Private or consequential tools are not
 * defined until their authorization and approval enforcement exist.
 */
import { z } from 'zod';
import { DatamartError } from './errors.js';
import { envelope } from './envelope.js';
import * as datagov from './providers/datagov.js';
import * as loc from './providers/loc.js';
import {
  searchLibraries,
  searchEducation,
  getDirectoryRecord,
  directoryCoverage,
  LIBRARY_TYPES,
  EDU_TYPES,
} from './directory.js';
import { MANIFESTS, listProviders, getManifest, providerStatus, summarize } from './registry.js';
import { headlineState } from './capabilities.js';

/* ---------- provider health (PRD §17 source-health) ---------- */

const health = {};
async function track(providerId, fn) {
  const h = (health[providerId] ||= { status: 'unknown' });
  h.last_attempt_at = new Date().toISOString();
  try {
    const out = await fn();
    h.status = 'ok';
    h.last_success_at = h.last_attempt_at;
    return out;
  } catch (err) {
    if (err instanceof DatamartError && ['invalid_filters', 'not_found', 'ambiguous_location'].includes(err.code)) {
      throw err; // the caller's mistake, not the source's health
    }
    h.status = err instanceof DatamartError ? err.code : 'error';
    h.last_error_at = h.last_attempt_at;
    throw err;
  }
}
export function healthSnapshot() {
  return JSON.parse(JSON.stringify(health));
}

/* ---------- shared schemas ---------- */

const location = {
  zip: z.string().optional().describe('5-digit U.S. ZIP code, e.g. "95032"'),
  lat: z.union([z.number(), z.string()]).optional().describe('Latitude in decimal degrees (use with lng)'),
  lng: z.union([z.number(), z.string()]).optional().describe('Longitude in decimal degrees (use with lat)'),
  address: z.string().optional().describe('Street address; needs zip or city+state. Sent to the U.S. Census Geocoder.'),
  city: z.string().optional().describe('City name; needs state'),
  state: z.string().optional().describe('Two-letter state code, e.g. "CA"'),
  country: z.string().optional().describe('ISO country code; only "US" is supported'),
  radius_miles: z.union([z.number(), z.string()]).optional().describe('Search radius in miles (default 20, max 250)'),
};
const paging = {
  limit: z.union([z.number(), z.string()]).optional().describe('Results per page, 1-100 (default 25)'),
  cursor: z.string().optional().describe('next_cursor from a previous response'),
};
const flags = {
  strict: z.union([z.boolean(), z.string()]).optional().describe('Fail instead of returning partial coverage'),
  include_unresolved: z.union([z.boolean(), z.string()]).optional().describe('Also list records without coordinates (never counted as matches)'),
};
const idOnly = d => ({ id: z.string().describe(d) });

const sourceAttribution = m => ({ name: m.organization, url: m.officialUrl, operator: m.operator, official_affiliation: false });

/* ---------- tool definitions ---------- */

/**
 * @typedef {Object} ToolDef
 * @property {string} name
 * @property {string} description
 * @property {string[]} namespaces - which namespace MCP endpoints expose it
 * @property {string} [provider] - manifest id for per-provider endpoints
 * @property {Record<string, import('zod').ZodTypeAny>} shape
 * @property {(args: any, deps: any) => Promise<any>} handler
 */

/** @type {ToolDef[]} */
export const TOOLS = [
  {
    name: 'datamart_search',
    description:
      'Search Datamart near a place: public library branches, public schools and colleges within a radius, plus government services. ' +
      'Give one origin (zip, lat+lng, address, or city+state); default is ZIP 95032 within 20 miles.',
    namespaces: ['search'],
    shape: {
      ...location,
      q: z.string().optional().describe('Name or keyword filter'),
      namespace: z.enum(['all', 'lib', 'edu', 'gov']).optional().describe('Limit to one namespace (default all)'),
      limit: paging.limit,
      strict: flags.strict,
    },
    async handler(args, deps) {
      const ns = args.namespace || 'all';
      const rest = { ...args };
      delete rest.namespace;
      const limit = rest.limit ? Number(rest.limit) : 25;
      const parts = [];
      if (ns === 'all' || ns === 'lib') parts.push(await searchLibraries({ ...rest, limit: 100 }, deps));
      if (ns === 'all' || ns === 'edu') parts.push(await searchEducation({ ...rest, limit: 100 }, deps));
      const located = parts.flatMap(p => p.data).sort((a, b) => a.distance_miles - b.distance_miles).slice(0, limit);
      const services = ns === 'all' || ns === 'gov' ? govServices(args.q) : [];
      const meta = parts[0]?.meta || { location_applied: false };
      const out = envelope({
        data: located,
        meta: {
          ...meta,
          next_cursor: null,
          total_matches: parts.reduce((n, p) => n + p.meta.total_matches, 0),
          continuation: 'Use libraries_search or education_search to page through one namespace.',
        },
        sources: parts.flatMap(p => p.sources),
        warnings: [...new Set(parts.flatMap(p => p.warnings))],
      });
      return { ...out, services };
    },
  },
  {
    name: 'resource_get',
    description: 'Get one Datamart resource by id: a provider (e.g. "us.loc") or a directory record (library branch, school, college).',
    namespaces: ['search', 'gov', 'lib', 'edu', 'contracts'],
    shape: idOnly('Datamart id, e.g. "us.ca.sos.bizfile" or "us.ca.lib.ca0164-002"'),
    async handler({ id }) {
      if (MANIFESTS.some(m => m.id === id)) {
        const m = getManifest(id);
        return envelope({ data: [{ ...summarize(m), facts: m.facts || [], capabilities: m.capabilities, info_url: m.infoUrl || null }], sources: [sourceAttribution(m)] });
      }
      const { record, source } = getDirectoryRecord(id);
      return envelope({ data: [record], sources: [source] });
    },
  },
  {
    name: 'resource_capabilities',
    description: 'What Datamart can and cannot do for a provider, per operation: directory_only, public_read, … or unsupported with the reason.',
    namespaces: ['search', 'gov', 'lib', 'edu', 'contracts'],
    shape: idOnly('Provider id, e.g. "us.irs"'),
    async handler({ id }) {
      const m = getManifest(id);
      return envelope({
        data: [{ id: m.id, headline_state: headlineState(m), capabilities: m.capabilities, official_url: m.officialUrl }],
        sources: [sourceAttribution(m)],
      });
    },
  },
  {
    name: 'provider_status',
    description: 'Configuration and health of Datamart providers (configured or not, last success/error), separate from capability.',
    namespaces: ['search', 'gov', 'lib', 'edu', 'contracts'],
    shape: { id: z.string().optional().describe('Provider id; omit for all') },
    async handler({ id }) {
      const ids = id ? [id] : MANIFESTS.map(m => m.id);
      return envelope({ data: ids.map(i => providerStatus(i, health)), meta: { directory: directoryCoverage() } });
    },
  },
  {
    name: 'gov_services_search',
    description:
      'Find government services Datamart knows (IRS, Data.gov, California BizFile, FTB, DMV, EDD) with official links and what Datamart can do for each.',
    namespaces: ['gov'],
    shape: { q: z.string().optional().describe('Keyword, e.g. "business filing" or "tax"') },
    async handler({ q }) {
      return envelope({
        data: govServices(q),
        meta: { location_applied: false, note: 'Government services apply by jurisdiction, not by distance.' },
      });
    },
  },
  {
    name: 'datagov_search',
    description: 'Search the Data.gov catalog (dataset metadata from federal, state, local and tribal publishers). Cursor-paginated.',
    namespaces: ['gov'],
    provider: 'us.gsa.datagov',
    shape: {
      q: z.string().optional().describe('Full-text query'),
      org_slug: z.string().optional().describe('Publisher slug, e.g. "nasa" (see datagov_list_organizations)'),
      org_type: z.string().optional().describe('Federal Government, State Government, County Government, City Government, University, Tribal, Non-Profit'),
      sort: z.enum(['relevance', 'popularity', 'last_harvested_date']).optional(),
      keyword: z.array(z.string()).optional().describe('Exact keyword filters'),
      per_page: z.union([z.number(), z.string()]).optional().describe('1-50 (default 10)'),
      cursor: paging.cursor,
    },
    async handler(args, deps) {
      const r = await track('us.gsa.datagov', () => datagov.search({ ...args, after: args.cursor }, deps));
      return envelope({
        data: r.results,
        meta: { sort: r.sort, sort_scope: 'source', next_cursor: r.next_cursor, coverage: 'source_catalog' },
        sources: [{ name: 'Data.gov Catalog API v4', url: datagov.BASE }],
      });
    },
  },
  {
    name: 'datagov_get_record',
    description: 'Get the Data.gov catalog (harvest) record for one dataset, by the harvest_record_id from datagov_search.',
    namespaces: ['gov'],
    provider: 'us.gsa.datagov',
    shape: idOnly('harvest_record_id from a datagov_search result'),
    async handler({ id }, deps) {
      const r = await track('us.gsa.datagov', () => datagov.getRecord(id, deps));
      return envelope({ data: [r], sources: [{ name: 'Data.gov Catalog API v4', url: r.source_url }] });
    },
  },
  {
    name: 'datagov_list_organizations',
    description: 'List Data.gov publishing organizations with their slugs and dataset counts.',
    namespaces: ['gov'],
    provider: 'us.gsa.datagov',
    shape: { q: z.string().optional().describe('Filter by name') },
    async handler({ q }, deps) {
      const orgs = await track('us.gsa.datagov', () => datagov.listOrganizations(deps));
      const needle = q ? q.toLowerCase() : null;
      const data = needle ? orgs.filter(o => `${o.name} ${o.slug}`.toLowerCase().includes(needle)) : orgs;
      return envelope({ data, meta: { total: data.length }, sources: [{ name: 'Data.gov Catalog API v4', url: `${datagov.BASE}organizations` }] });
    },
  },
  {
    name: 'libraries_search',
    description:
      'Public library branches within a radius (IMLS FY2024 survey). Bookmobiles excluded unless type includes "bookmobile". Distance is straight-line; card eligibility is reported separately.',
    namespaces: ['lib'],
    provider: 'us.ca.libraries',
    shape: {
      ...location,
      q: z.string().optional().describe('Name, system or city filter'),
      type: z.string().optional().describe(`Comma list of: ${LIBRARY_TYPES.join(', ')}`),
      system: z.string().optional().describe('Library system id or IMLS FSCSKEY, e.g. CA0115'),
      ...flags,
      ...paging,
    },
    async handler(args, deps) {
      return envelope(await searchLibraries(args, deps));
    },
  },
  {
    name: 'library_get',
    description: 'One public library outlet by Datamart id (e.g. "us.ca.lib.ca0164-002").',
    namespaces: ['lib'],
    provider: 'us.ca.libraries',
    shape: idOnly('Library outlet id'),
    async handler({ id }) {
      if (!String(id).startsWith('us.ca.lib.')) throw new DatamartError('not_found', `${id} is not a library id`);
      const { record, source } = getDirectoryRecord(id);
      return envelope({ data: [record], sources: [source] });
    },
  },
  {
    name: 'loc_search',
    description: 'Search Library of Congress digital collections on loc.gov. Optionally limit to a format (photos, maps, books…) or a collection slug.',
    namespaces: ['lib'],
    provider: 'us.loc',
    shape: {
      q: z.string().optional().describe('Search terms'),
      format: z.enum(loc.FORMATS).optional(),
      collection: z.string().optional().describe('Collection slug from loc_list_collections'),
      per_page: z.union([z.number(), z.string()]).optional().describe('1-100 (default 20)'),
      cursor: paging.cursor,
    },
    async handler(args, deps) {
      const r = await track('us.loc', () => loc.search(args, deps));
      return envelope({
        data: r.results,
        meta: { page: r.page, total: r.total, next_cursor: r.next_cursor, sort_scope: 'source' },
        sources: [{ name: 'Library of Congress', url: r.source_url }],
      });
    },
  },
  {
    name: 'loc_list_collections',
    description: 'List or search Library of Congress digital collections.',
    namespaces: ['lib'],
    provider: 'us.loc',
    shape: { q: z.string().optional(), per_page: z.union([z.number(), z.string()]).optional(), cursor: paging.cursor },
    async handler(args, deps) {
      const r = await track('us.loc', () => loc.listCollections(args, deps));
      return envelope({
        data: r.results,
        meta: { page: r.page, total: r.total, next_cursor: r.next_cursor },
        sources: [{ name: 'Library of Congress', url: 'https://www.loc.gov/collections/' }],
      });
    },
  },
  {
    name: 'loc_get_item',
    description: 'Metadata for one Library of Congress item, including rights notes and a link to the original record.',
    namespaces: ['lib'],
    provider: 'us.loc',
    shape: idOnly('loc.gov item id, e.g. "2021668470"'),
    async handler({ id }, deps) {
      const r = await track('us.loc', () => loc.getItem(id, deps));
      return envelope({ data: [r], sources: [{ name: 'Library of Congress', url: r.url }] });
    },
  },
  {
    name: 'loc_get_resource_links',
    description: 'Files and resource links (images, PDFs, full text) for one Library of Congress item, with its rights notes.',
    namespaces: ['lib'],
    provider: 'us.loc',
    shape: idOnly('loc.gov item id'),
    async handler({ id }, deps) {
      const r = await track('us.loc', () => loc.getResourceLinks(id, deps));
      return envelope({ data: [r], sources: [{ name: 'Library of Congress', url: r.url }] });
    },
  },
  {
    name: 'education_search',
    description:
      'Public schools (pre-K-12 sites, from NCES) and public colleges/universities (IPEDS) within a radius. Proximity is not enrollment eligibility.',
    namespaces: ['edu'],
    provider: 'us.ca.education',
    shape: {
      ...location,
      q: z.string().optional().describe('Name, district or city filter'),
      type: z.string().optional().describe(`Comma list of: ${EDU_TYPES.join(', ')}`),
      sector: z.string().optional().describe('"public" (private is not yet available)'),
      charter: z.union([z.boolean(), z.string()]).optional().describe('Only charter (true) or non-charter (false) schools'),
      district: z.string().optional().describe('District name or NCES LEA id'),
      ...flags,
      ...paging,
    },
    async handler(args, deps) {
      return envelope(await searchEducation(args, deps));
    },
  },
  {
    name: 'education_get',
    description: 'One school site or college campus by Datamart id.',
    namespaces: ['edu'],
    provider: 'us.ca.education',
    shape: idOnly('School or college id, e.g. "us.ca.edu.nces-060720000674"'),
    async handler({ id }) {
      if (!String(id).startsWith('us.ca.edu.')) throw new DatamartError('not_found', `${id} is not an education id`);
      const { record, source } = getDirectoryRecord(id);
      return envelope({ data: [record], sources: [source] });
    },
  },
  {
    name: 'contracts_sources',
    description:
      'Official government contract-opportunity sources for federal, California, Santa Clara County and City of Santa Clara buyers. Datamart does not index opportunities yet (Phase B); this lists where to look and what is planned.',
    namespaces: ['contracts'],
    shape: { level: z.enum(['federal', 'state', 'county', 'city']).optional() },
    async handler({ level }) {
      const data = MANIFESTS.filter(m => m.namespace === 'contracts' && (!level || m.jurisdiction.level === level)).map(m => ({
        ...summarize(m),
        facts: m.facts || [],
        capabilities: m.capabilities,
      }));
      return envelope({
        data,
        meta: { coverage: 'handoff_only', note: 'No opportunities are indexed yet. Follow official_url to each buyer.' },
      });
    },
  },
];

function govServices(q) {
  const needle = q ? String(q).toLowerCase() : null;
  return MANIFESTS.filter(m => m.namespace === 'gov')
    .filter(m => !needle || `${m.name} ${m.organization} ${(m.facts || []).join(' ')} ${m.capabilities.map(c => c.operation).join(' ')}`.toLowerCase().includes(needle))
    .map(m => ({
      ...summarize(m),
      info_url: m.infoUrl || null,
      facts: m.facts || [],
      capabilities: m.capabilities.map(c => ({ operation: c.operation, state: c.state, ...(c.reason ? { reason: c.reason } : {}) })),
      handoff: { label: 'Continue on the official site', url: m.officialUrl },
    }));
}

/* ---------- execution ---------- */

const byName = new Map(TOOLS.map(t => [t.name, t]));

export function getTool(name) {
  return byName.get(name) || null;
}

/** Tools exposed at a namespace MCP endpoint, or at one provider's endpoint. */
export function toolsFor({ namespace, provider } = {}) {
  return TOOLS.filter(t => (provider ? t.provider === provider : !namespace || t.namespaces.includes(namespace)));
}

/**
 * Validate arguments strictly and run a tool.
 * @throws {DatamartError}
 */
export async function runTool(name, args = {}, deps = {}) {
  const tool = getTool(name);
  if (!tool) throw new DatamartError('not_found', `Unknown tool ${name}`);
  const parsed = z.object(tool.shape).strict().safeParse(args ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DatamartError('invalid_filters', `${issue.path.join('.') || 'arguments'}: ${issue.message}`, {
      field: issue.path.join('.') || null,
    });
  }
  return tool.handler(parsed.data, deps);
}

/** JSON Schema for the root /mcp tools/list (the legacy dispatcher wants plain JSON Schema). */
export function jsonSchemaFor(tool) {
  const schema = z.toJSONSchema(z.object(tool.shape).strict());
  delete schema.$schema;
  return schema;
}

export { listProviders };
