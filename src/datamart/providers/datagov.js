/**
 * Data.gov Catalog API v4 adapter (PRD §8.2, AT03, AT04).
 *
 * https://resources.data.gov/catalog-api/ — base https://api.gsa.gov/technology/datagov/v4/,
 * key in the X-Api-Key header, cursor pagination via `after`.
 *
 * DATAGOV_API_KEY must be set. Without it every call fails with
 * configuration_required: DEMO_KEY is limited to 30 requests per IP per hour
 * and the API documentation says it is not for automated use, so Datamart does
 * not silently fall back to it.
 */
import { DatamartError } from '../errors.js';
import { fetchJson } from '../http.js';

export const BASE = 'https://api.gsa.gov/technology/datagov/v4/';
const ORG_TYPES = [
  'Federal Government',
  'City Government',
  'State Government',
  'County Government',
  'University',
  'Tribal',
  'Non-Profit',
];
const SORTS = ['relevance', 'popularity', 'last_harvested_date'];

function apiKey() {
  const key = process.env.DATAGOV_API_KEY || '';
  if (!key) {
    throw new DatamartError(
      'configuration_required',
      'Data.gov search is not configured on this server (DATAGOV_API_KEY is unset). Search directly at https://catalog.data.gov/.',
      { provider: 'us.gsa.datagov', handoff_url: 'https://catalog.data.gov/' }
    );
  }
  return key;
}

function call(pathAndQuery, deps, cacheTtlMs) {
  const key = apiKey();
  return fetchJson(BASE + pathAndQuery, {
    provider: 'datagov',
    headers: { 'X-Api-Key': key },
    cacheTtlMs,
    fetch: deps.fetch,
  });
}

/** Keep the fields people and agents need; drop the full DCAT blob except provenance. */
export function normalizeDataset(r) {
  const dcat = r.dcat || {};
  const distributions = Array.isArray(dcat.distribution) ? dcat.distribution : [];
  return {
    id: r.identifier || dcat.identifier,
    slug: r.slug || null,
    title: r.title || dcat.title,
    description: r.description || dcat.description || null,
    publisher: r.publisher || dcat.publisher?.name || null,
    organization: r.organization
      ? { slug: r.organization.slug, name: r.organization.name, type: r.organization.organization_type }
      : null,
    keywords: r.keyword || dcat.keyword || [],
    access_level: dcat.accessLevel || r.accessLevel || null,
    license: dcat.license || null,
    rights: dcat.rights || null,
    modified: dcat.modified || null,
    last_harvested_date: r.last_harvested_date || null,
    landing_page: dcat.landingPage || r.landingPage || null,
    catalog_url: r.slug ? `https://catalog.data.gov/dataset/${r.slug}` : null,
    distributions: distributions
      .filter(d => d && typeof d === 'object')
      .map(d => ({
        title: d.title || null,
        format: d.format || d.mediaType || null,
        download_url: d.downloadURL || null,
        access_url: d.accessURL || null,
      })),
    harvest_record_id: typeof r.harvest_record === 'string' ? r.harvest_record.split('/').pop() : null,
    source_note: 'Metadata from the Data.gov catalog. The data itself is served by its publisher.',
  };
}

/**
 * @param {{ q?: string, org_slug?: string, org_type?: string, sort?: string, per_page?: number,
 *   after?: string, keyword?: string[] }} params
 * @param {{ fetch?: typeof fetch }} [deps]
 */
export async function search(params = {}, deps = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', String(params.q).slice(0, 500));
  if (params.org_slug) qs.set('org_slug', String(params.org_slug));
  if (params.org_type) {
    if (!ORG_TYPES.includes(params.org_type)) {
      throw new DatamartError('invalid_filters', `org_type must be one of: ${ORG_TYPES.join(', ')}`);
    }
    qs.set('org_type', params.org_type);
  }
  if (params.sort) {
    if (!SORTS.includes(params.sort)) {
      throw new DatamartError('invalid_filters', `sort must be one of: ${SORTS.join(', ')}`);
    }
    qs.set('sort', params.sort);
  }
  const perPage = Math.min(Math.max(Number(params.per_page) || 10, 1), 50);
  qs.set('per_page', String(perPage));
  for (const k of [].concat(params.keyword || [])) qs.append('keyword', String(k));
  if (params.after) qs.set('after', String(params.after));

  const body = await call(`search?${qs}`, deps, 10 * 60_000);
  if (!body || !Array.isArray(body.results)) {
    throw new DatamartError('source_unavailable', 'Data.gov returned an unexpected search response');
  }
  return {
    results: body.results.map(normalizeDataset),
    next_cursor: body.after || null,
    sort: body.sort || params.sort || 'relevance',
  };
}

/**
 * A dataset's catalog record. The v4 API has no get-by-id endpoint; the
 * harvest record is the per-dataset document it exposes.
 * @param {string} id - harvest record id (from a search result's harvest_record_id)
 */
export async function getRecord(id, deps = {}) {
  if (!/^[A-Za-z0-9-]{8,80}$/.test(String(id || ''))) {
    throw new DatamartError('invalid_filters', 'id must be a Data.gov harvest record id');
  }
  const body = await call(`harvest_record/${encodeURIComponent(id)}`, deps, 60 * 60_000);
  return { id, record: body, source_url: `${BASE}harvest_record/${id}` };
}

export async function listOrganizations(deps = {}) {
  const body = await call('organizations', deps, 6 * 60 * 60_000);
  const orgs = Array.isArray(body?.organizations) ? body.organizations : [];
  return orgs.map(o => ({
    slug: o.slug,
    name: o.name,
    type: o.organization_type || null,
    dataset_count: o.dataset_count ?? null,
  }));
}
