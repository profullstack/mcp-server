/**
 * Outbound HTTP for provider adapters (PRD §9.1, §17, §19).
 *
 * - Bounded timeout per call.
 * - Rate limits and browser challenges become typed errors, never empty results.
 * - A small TTL cache, a per-provider per-minute budget, and a pause after the
 *   provider says "slow down", so Datamart stays inside published usage limits.
 * - Only allowlisted provider hosts; no redirects to other hosts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatamartError } from './errors.js';

export const USER_AGENT = 'datamart.help/0.1 (+https://datamart.help)';

/** Hosts adapters may call. Anything else is refused before a socket opens. */
export const ALLOWED_HOSTS = new Set(['api.gsa.gov', 'www.loc.gov', 'geocoding.geo.census.gov']);

const cache = new Map(); // key -> { expires, value }
const MAX_CACHE_ENTRIES = 500;
const windows = new Map(); // provider -> timestamps of recent requests
const cooldowns = new Map(); // provider -> epoch ms until which we do not call it

/**
 * Per-provider limits. loc.gov publishes 20 requests/minute for its JSON API and
 * blocks offenders for an hour, restarting the hour on every request made while
 * blocked — so after a 429/503 we stop calling it for the whole block period.
 * Override the per-minute figure with DATAMART_RPM_<PROVIDER>.
 */
export const PROVIDER_LIMITS = {
  datagov: { perMinute: 15, cooldownMs: 60 * 60_000 }, // personal key: 1,000/hour
  loc: { perMinute: 15, cooldownMs: 60 * 60_000 },
  'census-geocoder': { perMinute: 60, cooldownMs: 5 * 60_000 },
};
const COOLDOWN_STATUSES = { loc: [429, 503], datagov: [429] };

function limitsFor(provider) {
  const base = PROVIDER_LIMITS[provider] || { perMinute: 10, cooldownMs: 15 * 60_000 };
  const env = Number(process.env[`DATAMART_RPM_${provider.toUpperCase().replace(/-/g, '_')}`]);
  return Number.isFinite(env) && env > 0 ? { ...base, perMinute: env } : base;
}

function spend(provider) {
  const now = Date.now();
  const until = cooldowns.get(provider) || 0;
  if (until > now) {
    throw new DatamartError(
      'source_rate_limited',
      `${provider} asked Datamart to slow down; requests are paused to respect its limits`,
      { provider, retry_after_seconds: Math.ceil((until - now) / 1000) }
    );
  }
  const recent = (windows.get(provider) || []).filter(t => now - t < 60_000);
  if (recent.length >= limitsFor(provider).perMinute) {
    throw new DatamartError(
      'source_rate_limited',
      `Datamart's per-minute request budget for ${provider} is spent; try again shortly`,
      { provider, retry_after_seconds: Math.ceil((recent[0] + 60_000 - now) / 1000) }
    );
  }
  recent.push(now);
  windows.set(provider, recent);
}

/**
 * Pause a provider. A Retry-After can lengthen the pause but never shorten it
 * below the provider's block period: loc.gov restarts its hour on any request.
 */
function coolDown(provider, retryAfterSeconds) {
  const floor = limitsFor(provider).cooldownMs;
  const asked =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 0;
  const ms = Math.max(floor, asked);
  cooldowns.set(provider, Date.now() + ms);
  persistCooldowns();
  return Math.ceil(ms / 1000);
}

let cooldownFile = null;

/**
 * Keep pauses across short-lived processes (each CLI run is a new process and
 * would otherwise call a provider that is still blocking us).
 * @param {string} file
 */
export function usePersistentCooldowns(file) {
  cooldownFile = file;
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [p, until] of Object.entries(saved)) {
      if (Number.isFinite(until) && until > Date.now()) cooldowns.set(p, until);
    }
  } catch {
    // no saved state yet
  }
}

function persistCooldowns() {
  if (!cooldownFile) return;
  try {
    fs.mkdirSync(path.dirname(cooldownFile), { recursive: true });
    fs.writeFileSync(cooldownFile, JSON.stringify(Object.fromEntries(cooldowns)));
  } catch {
    // best effort; the in-memory pause still applies
  }
}

/** Test hook: forget cache and budgets. */
export function resetHttpState() {
  cache.clear();
  windows.clear();
  cooldowns.clear();
}

function looksLikeChallenge(contentType, text) {
  if (/json/i.test(contentType)) return false;
  return /captcha|cf-chl|challenge-platform|perfdrive|Just a moment|Access denied/i.test(
    text.slice(0, 4000)
  );
}

/**
 * GET a JSON document from an allowlisted provider host.
 *
 * @param {string} url
 * @param {Object} opts
 * @param {string} opts.provider - budget/cache bucket and error label
 * @param {Record<string,string>} [opts.headers]
 * @param {number} [opts.timeoutMs=20000]
 * @param {number} [opts.cacheTtlMs=0] - 0 disables caching
 * @param {string} [opts.cacheKey] - defaults to the URL; set it when the URL carries a secret
 * @param {typeof fetch} [opts.fetch]
 */
export async function fetchJson(url, opts) {
  const {
    provider,
    headers = {},
    timeoutMs = 20000,
    cacheTtlMs = 0,
    fetch: f = globalThis.fetch,
  } = opts;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new DatamartError(
      'source_unavailable',
      `Refusing to fetch non-allowlisted host ${parsed.hostname}`
    );
  }
  const key = opts.cacheKey || url;
  if (cacheTtlMs > 0) {
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;
  }

  spend(provider);
  let res;
  try {
    res = await f(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw new DatamartError(
      'source_unavailable',
      timedOut
        ? `${provider} did not answer within ${timeoutMs / 1000}s`
        : `${provider} request failed`,
      { provider }
    );
  }

  if (res.status >= 300 && res.status < 400) {
    throw new DatamartError(
      'source_unavailable',
      `${provider} redirected (${res.status}); not followed`,
      {
        provider,
      }
    );
  }
  if ((COOLDOWN_STATUSES[provider] || [429]).includes(res.status)) {
    const wait = coolDown(provider, Number(res.headers.get('retry-after')));
    throw new DatamartError(
      'source_rate_limited',
      `${provider} is limiting requests (HTTP ${res.status}); Datamart paused calls to it`,
      { provider, retry_after_seconds: wait }
    );
  }
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (looksLikeChallenge(contentType, text)) {
    // A challenge means the provider is blocking us; keep calling and we prolong it.
    const wait = coolDown(provider);
    throw new DatamartError(
      'source_unavailable',
      `${provider} answered with a browser challenge instead of data; Datamart does not bypass these and paused calls to it`,
      { provider, retry_after_seconds: wait }
    );
  }
  if (res.status === 404) {
    throw new DatamartError('not_found', `${provider} has no such record`, { provider });
  }
  if (res.status === 401 || res.status === 403) {
    throw new DatamartError(
      'configuration_required',
      `${provider} rejected Datamart's credentials`,
      {
        provider,
      }
    );
  }
  if (!res.ok) {
    throw new DatamartError('source_unavailable', `${provider} returned HTTP ${res.status}`, {
      provider,
    });
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new DatamartError('source_unavailable', `${provider} returned non-JSON content`, {
      provider,
    });
  }

  if (cacheTtlMs > 0) {
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(key, { expires: Date.now() + cacheTtlMs, value });
  }
  return value;
}
