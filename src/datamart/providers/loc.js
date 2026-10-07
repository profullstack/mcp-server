/**
 * Library of Congress loc.gov JSON API adapter (PRD §9.1, AT05).
 *
 * https://www.loc.gov/apis/json-and-yaml/ — public, no key. Covers loc.gov
 * digital collections, not the whole LoC catalog and no patron services.
 * Published limit: 20 requests/minute with a 1-hour block; http.js enforces a
 * lower per-minute budget and pauses after 429/503.
 */
import { DatamartError } from '../errors.js';
import { fetchJson } from '../http.js';

export const ORIGIN = 'https://www.loc.gov';
export const FORMATS = [
  'audio',
  'books',
  'film-and-videos',
  'legislation',
  'manuscripts',
  'maps',
  'newspapers',
  'notated-music',
  'photos',
  'web-archives',
];
const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;
const ITEM_ID = /^(?!\.+$)[A-Za-z0-9._-]{1,80}$/; // no '.' or '..' path segments

const list = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const first = v => list(v)[0] ?? null;

/** loc.gov ids are URLs like http://www.loc.gov/item/2021668470/ — keep the short id too. */
export function shortId(idOrUrl) {
  const m = String(idOrUrl || '').match(/\/(item|resource|collections)\/([^/?#]+)\/?/);
  return m ? m[2] : null;
}

function https(u) {
  return typeof u === 'string' ? u.replace(/^http:\/\/www\.loc\.gov/, ORIGIN) : null;
}

export function normalizeResult(r) {
  return {
    id: shortId(r.id) || r.id,
    loc_id: r.id,
    title: r.title || null,
    date: r.date || null,
    description: first(r.description),
    original_format: list(r.original_format),
    online_format: list(r.online_format),
    subjects: list(r.subject).slice(0, 12),
    part_of: list(r.partof).slice(0, 6),
    access_restricted: r.access_restricted === true,
    digitized: r.digitized ?? null,
    image_url: https(first(r.image_url)),
    url: https(r.url || r.id),
  };
}

function pagination(p, page) {
  const hasNext = Boolean(p?.next);
  return {
    page,
    total: Number.isFinite(p?.of) ? p.of : null,
    next_cursor: hasNext ? String(page + 1) : null,
  };
}

function pageFrom(cursor) {
  if (cursor == null || cursor === '') return 1;
  const n = Number(cursor);
  if (!Number.isInteger(n) || n < 1 || n > 2000) {
    throw new DatamartError(
      'invalid_filters',
      'cursor must be a page number from a previous response'
    );
  }
  return n;
}

/**
 * @param {{ q?: string, format?: string, collection?: string, per_page?: number, cursor?: string }} params
 */
export async function search(params = {}, deps = {}) {
  if (params.format && params.collection) {
    throw new DatamartError('invalid_filters', 'Use either format or collection, not both');
  }
  let path = '/search/';
  if (params.format) {
    if (!FORMATS.includes(params.format)) {
      throw new DatamartError('invalid_filters', `format must be one of: ${FORMATS.join(', ')}`);
    }
    path = `/${params.format}/`;
  } else if (params.collection) {
    if (!SLUG.test(params.collection)) {
      throw new DatamartError('invalid_filters', 'collection must be a loc.gov collection slug');
    }
    path = `/collections/${params.collection}/`;
  }
  const page = pageFrom(params.cursor);
  const perPage = Math.min(Math.max(Number(params.per_page) || 20, 1), 100);
  const qs = new URLSearchParams({
    fo: 'json',
    at: 'results,pagination',
    c: String(perPage),
    sp: String(page),
  });
  if (params.q) qs.set('q', String(params.q).slice(0, 300));

  const url = `${ORIGIN}${path}?${qs}`;
  const body = await fetchJson(url, {
    provider: 'loc',
    timeoutMs: 45000,
    cacheTtlMs: 30 * 60_000,
    fetch: deps.fetch,
  });
  if (!Array.isArray(body?.results)) {
    throw new DatamartError('source_unavailable', 'loc.gov returned an unexpected search response');
  }
  return {
    results: body.results.map(normalizeResult),
    ...pagination(body.pagination, page),
    source_url: url.replace('fo=json', 'fo=html'),
  };
}

export async function listCollections(params = {}, deps = {}) {
  const page = pageFrom(params.cursor);
  const perPage = Math.min(Math.max(Number(params.per_page) || 25, 1), 100);
  const qs = new URLSearchParams({
    fo: 'json',
    at: 'results,pagination',
    c: String(perPage),
    sp: String(page),
  });
  if (params.q) qs.set('q', String(params.q).slice(0, 300));
  const url = `${ORIGIN}/collections/?${qs}`;
  const body = await fetchJson(url, {
    provider: 'loc',
    timeoutMs: 30000,
    cacheTtlMs: 6 * 60 * 60_000,
    fetch: deps.fetch,
  });
  if (!Array.isArray(body?.results)) {
    throw new DatamartError(
      'source_unavailable',
      'loc.gov returned an unexpected collections response'
    );
  }
  return {
    results: body.results.map(r => ({
      slug: shortId(r.id) || shortId(r.url),
      title: r.title || null,
      description: first(r.description),
      item_count: r.count ?? null,
      subjects: list(r.subject_topic || r.subject).slice(0, 10),
      access_restricted: r.access_restricted === true,
      url: https(r.url || r.id),
    })),
    ...pagination(body.pagination, page),
  };
}

/** loc.gov rights notes arrive as HTML; return plain text so clients never render upstream markup. */
export function plainText(html) {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function rightsOf(item) {
  const advisory = list(item.rights_advisory)
    .concat(list(item.rights))
    .map(plainText)
    .filter(Boolean);
  return {
    advisory: advisory.length ? advisory : null,
    access_restricted: item.access_restricted === true,
    note: 'Rights are as stated by the Library of Congress. Check the item page before reuse.',
  };
}

async function fetchItem(id, deps) {
  if (!ITEM_ID.test(String(id || ''))) {
    throw new DatamartError('invalid_filters', 'id must be a loc.gov item id such as 2021668470');
  }
  const url = `${ORIGIN}/item/${encodeURIComponent(id)}/?fo=json`;
  const body = await fetchJson(url, {
    provider: 'loc',
    timeoutMs: 30000,
    cacheTtlMs: 6 * 60 * 60_000,
    fetch: deps.fetch,
  });
  if (!body?.item)
    throw new DatamartError('source_unavailable', 'loc.gov returned an unexpected item response');
  return body;
}

export async function getItem(id, deps = {}) {
  const body = await fetchItem(id, deps);
  const item = body.item;
  return {
    id,
    title: item.title || null,
    date: item.date || null,
    created_published: list(item.created_published),
    contributors: list(item.contributor_names || item.contributors).slice(0, 20),
    summary: list(item.summary || item.description),
    subjects: list(item.subjects || item.subject_headings).slice(0, 30),
    formats: list(item.format || item.original_format),
    language: list(item.language),
    notes: list(item.notes).slice(0, 10),
    call_number: list(item.call_number),
    lccn: item.library_of_congress_control_number || null,
    repository: list(item.repository),
    rights: rightsOf(item),
    url: `${ORIGIN}/item/${id}/`,
    resource_count: list(body.resources).length,
  };
}

export async function getResourceLinks(id, deps = {}) {
  const body = await fetchItem(id, deps);
  const resources = list(body.resources).map((r, i) => {
    const files = list(r.files)
      .flat()
      .filter(f => f && typeof f === 'object' && f.url)
      .map(f => ({ url: f.url, mimetype: f.mimetype || null, size: f.size ?? null }));
    return {
      index: i,
      url: https(r.url),
      image: r.image || null,
      pdf: r.pdf || null,
      fulltext_file: r.fulltext_file || null,
      files: files.slice(0, 50),
    };
  });
  return { id, url: `${ORIGIN}/item/${id}/`, rights: rightsOf(body.item), resources };
}
