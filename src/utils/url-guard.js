/**
 * URL guard — shared SSRF defence for modules that issue server-side requests.
 *
 * Several modules take a URL (or a URL fragment such as an API base) from an
 * unauthenticated request body and hand it to `fetch()` / a headless browser.
 * Without validation that is a Server-Side Request Forgery primitive: the
 * caller steers the server at loopback, link-local (cloud metadata), or RFC1918
 * hosts it could not otherwise reach.
 *
 * Advisories addressed by this helper:
 *   - GHSA-qgcm-wf9m-hqwc (convert2doc `baseUrl`)
 *   - GHSA-7h99-c5qj-vhxp (craigslist `/details` url)
 *   - GHSA-6cj5-68cm-v828 (link-shortener non-enforcing private-IP check)
 *
 * The guard rejects on three independent layers:
 *   1. scheme / credential / shape checks on the URL itself,
 *   2. an optional host allowlist (exact host or `.suffix` match),
 *   3. address checks — literal IPs are checked directly, hostnames are
 *      resolved and *every* returned address must be publicly routable.
 *
 * Redirects are the other half of the problem: an allowlisted public host can
 * 302 to `http://169.254.169.254/`. `safeFetch` therefore follows redirects
 * manually and re-runs the guard on each hop.
 */

import { promises as dnsPromises } from 'node:dns';
import net from 'node:net';

/** Error type thrown for every rejection, so callers can map it to a 400. */
export class UnsafeUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafeUrlError';
    this.code = 'UNSAFE_URL';
  }
}

/**
 * Hostnames that never denote a public host, even when a resolver is willing to
 * answer for them. Checked before DNS so a poisoned/split-horizon resolver
 * cannot turn `localhost` into an allowed target.
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'broadcasthost',
  'metadata',
  'metadata.google.internal',
  'instance-data',
]);

/** Suffixes that denote non-public namespaces. */
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.home.arpa'];

/**
 * Parse a dotted-quad into four octets.
 * @param {string} ip
 * @returns {number[]|null} four octets, or null when not a valid IPv4 literal
 */
function ipv4ToBytes(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;

  const bytes = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    bytes.push(value);
  }
  return bytes;
}

/**
 * Expand an IPv6 literal (including `::` compression, a zone id, and a trailing
 * embedded IPv4 form such as `::ffff:127.0.0.1`) into 16 bytes.
 * @param {string} ip
 * @returns {number[]|null} sixteen bytes, or null when not a valid IPv6 literal
 */
function ipv6ToBytes(ip) {
  let text = String(ip);

  // Drop any zone/scope id (`fe80::1%eth0`).
  const zoneIndex = text.indexOf('%');
  if (zoneIndex !== -1) text = text.slice(0, zoneIndex);

  // Rewrite a trailing embedded IPv4 (`::ffff:192.168.0.1`) into two hex groups
  // so the rest of the parser only deals with colon-separated hextets.
  const lastColon = text.lastIndexOf(':');
  if (lastColon !== -1 && text.slice(lastColon + 1).includes('.')) {
    const embedded = ipv4ToBytes(text.slice(lastColon + 1));
    if (!embedded) return null;
    const high = ((embedded[0] << 8) | embedded[1]).toString(16);
    const low = ((embedded[2] << 8) | embedded[3]).toString(16);
    text = `${text.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const halves = text.split('::');
  if (halves.length > 2) return null;

  const split = part => (part === '' ? [] : part.split(':'));
  const head = split(halves[0]);
  const tail = halves.length === 2 ? split(halves[1]) : [];

  let groups;
  if (halves.length === 2) {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill('0'), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;

  const bytes = [];
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    const value = parseInt(group, 16);
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }
  return bytes;
}

/**
 * Is this IPv4 address outside the publicly routable unicast space?
 * Covers loopback, RFC1918, link-local (cloud metadata), CGNAT, the IETF
 * documentation/benchmark blocks, multicast, and the reserved top of the space.
 * @param {number[]} bytes
 * @returns {boolean}
 */
function isBlockedIPv4(bytes) {
  const [a, b, c] = bytes;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast (224/4) + reserved/broadcast (240/4)

  return false;
}

/**
 * Is this IPv6 address outside the publicly routable unicast space?
 * IPv4-mapped and NAT64-embedded addresses are unwrapped and re-checked as IPv4
 * so `::ffff:127.0.0.1` cannot slip past the IPv4 rules.
 * @param {number[]} bytes
 * @returns {boolean}
 */
function isBlockedIPv6(bytes) {
  const allZero = (from, to) => bytes.slice(from, to).every(byte => byte === 0);

  // ::ffff:0:0/96 — IPv4-mapped
  if (allZero(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isBlockedIPv4(bytes.slice(12));
  }
  // 64:ff9b::/96 — NAT64 well-known prefix
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    allZero(4, 12)
  ) {
    return isBlockedIPv4(bytes.slice(12));
  }

  if (allZero(0, 15) && (bytes[15] === 0 || bytes[15] === 1)) return true; // :: and ::1
  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (bytes[0] === 0xff) return true; // ff00::/8 multicast
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) {
    return true; // 2001:db8::/32 documentation
  }

  return false;
}

/**
 * Should a server-side request to this IP literal be refused?
 * Unparseable input is treated as blocked (fail closed).
 * @param {string} ip
 * @returns {boolean}
 */
export function isBlockedAddress(ip) {
  const family = net.isIP(String(ip).replace(/^\[|\]$/g, ''));
  const bare = String(ip).replace(/^\[|\]$/g, '');

  if (family === 4) {
    const bytes = ipv4ToBytes(bare);
    return bytes ? isBlockedIPv4(bytes) : true;
  }
  if (family === 6) {
    const bytes = ipv6ToBytes(bare);
    return bytes ? isBlockedIPv6(bytes) : true;
  }
  return true;
}

/**
 * Lowercase a hostname, strip IPv6 brackets and the FQDN trailing dot.
 * @param {string} hostname
 * @returns {string}
 */
function normalizeHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
}

/**
 * Match a hostname against an allowlist. Entries beginning with `.` match the
 * host itself and any subdomain (`.craigslist.org` matches `craigslist.org`
 * and `sfbay.craigslist.org`); other entries must match exactly.
 * @param {string} hostname - already normalized
 * @param {string[]} allowedHosts
 * @returns {boolean}
 */
export function hostIsAllowed(hostname, allowedHosts) {
  return allowedHosts.some(entry => {
    const allowed = normalizeHostname(entry);
    if (allowed.startsWith('.')) {
      return hostname === allowed.slice(1) || hostname.endsWith(allowed);
    }
    return hostname === allowed;
  });
}

/**
 * Validate that a URL is safe for the server to request.
 *
 * @param {string} rawUrl - caller-supplied URL
 * @param {Object} [options]
 * @param {string[]} [options.protocols=['http:','https:']] - permitted schemes
 * @param {string[]|null} [options.allowedHosts=null] - optional host allowlist
 * @param {string} [options.fieldName='url'] - name used in error messages
 * @param {boolean} [options.resolveDns=true] - resolve and check every address
 * @param {number} [options.maxLength=2048] - reject absurdly long inputs
 * @returns {Promise<{url: URL, hostname: string, addresses: string[]}>}
 * @throws {UnsafeUrlError}
 */
export async function assertSafeUrl(rawUrl, options = {}) {
  const {
    protocols = ['http:', 'https:'],
    allowedHosts = null,
    fieldName = 'url',
    resolveDns = true,
    maxLength = 2048,
  } = options;

  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    throw new UnsafeUrlError(`${fieldName} must be a non-empty string`);
  }
  const trimmed = rawUrl.trim();
  if (trimmed.length > maxLength) {
    throw new UnsafeUrlError(`${fieldName} is too long (maximum ${maxLength} characters)`);
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new UnsafeUrlError(`${fieldName} is not a valid absolute URL`);
  }

  if (!protocols.includes(url.protocol)) {
    throw new UnsafeUrlError(
      `${fieldName} must use one of these protocols: ${protocols.join(', ')}`
    );
  }
  // Embedded credentials are a classic parser-confusion trick (`http://allowed@evil/`).
  if (url.username || url.password) {
    throw new UnsafeUrlError(`${fieldName} must not contain embedded credentials`);
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname) {
    throw new UnsafeUrlError(`${fieldName} must include a host`);
  }

  if (Array.isArray(allowedHosts) && allowedHosts.length > 0) {
    if (!hostIsAllowed(hostname, allowedHosts)) {
      throw new UnsafeUrlError(`${fieldName} host is not allowed: ${hostname}`);
    }
  }

  // Literal IP: no DNS involved, decide from the address itself.
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new UnsafeUrlError(`${fieldName} resolves to a non-public address: ${hostname}`);
    }
    return { url, hostname, addresses: [hostname] };
  }

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix))
  ) {
    throw new UnsafeUrlError(`${fieldName} resolves to a non-public host: ${hostname}`);
  }

  if (!resolveDns) {
    return { url, hostname, addresses: [] };
  }

  let records;
  try {
    records = await dnsPromises.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError(`${fieldName} host could not be resolved: ${hostname}`);
  }
  if (!Array.isArray(records) || records.length === 0) {
    throw new UnsafeUrlError(`${fieldName} host could not be resolved: ${hostname}`);
  }

  // Every answer must be public — a single private answer is enough to abuse a
  // round-robin record, so this is deliberately an "all" check, not "any".
  for (const record of records) {
    if (isBlockedAddress(record.address)) {
      throw new UnsafeUrlError(
        `${fieldName} resolves to a non-public address: ${record.address} (${hostname})`
      );
    }
  }

  return { url, hostname, addresses: records.map(record => record.address) };
}

/**
 * `fetch` with the guard applied to the initial URL and to every redirect hop.
 *
 * Node follows redirects internally by default, which would let an allowlisted
 * host bounce the request to an internal address. Redirects are therefore
 * followed manually here so each `Location` is re-validated.
 *
 * @param {string} rawUrl
 * @param {RequestInit} [fetchOptions]
 * @param {Object} [guardOptions] - forwarded to {@link assertSafeUrl}
 * @param {number} [guardOptions.maxRedirects=5]
 * @returns {Promise<Response>}
 * @throws {UnsafeUrlError} when the initial URL or any hop is unsafe
 */
export async function safeFetch(rawUrl, fetchOptions = {}, guardOptions = {}) {
  const { maxRedirects = 5, ...assertOptions } = guardOptions;

  let currentUrl = rawUrl;
  let currentOptions = { ...fetchOptions };

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const { url } = await assertSafeUrl(currentUrl, assertOptions);

    const response = await fetch(url.toString(), { ...currentOptions, redirect: 'manual' });

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get('location');
    if (!isRedirect || !location) {
      return response;
    }

    if (hop === maxRedirects) {
      throw new UnsafeUrlError(`Too many redirects (maximum ${maxRedirects})`);
    }

    currentUrl = new URL(location, url).toString();
    // 303, and the customary browser behaviour for 301/302, downgrade to GET.
    if (
      response.status === 303 ||
      ((response.status === 301 || response.status === 302) &&
        String(currentOptions.method || 'GET').toUpperCase() === 'POST')
    ) {
      currentOptions = { ...currentOptions, method: 'GET', body: undefined };
    }
  }

  /* c8 ignore next */
  throw new UnsafeUrlError(`Too many redirects (maximum ${maxRedirects})`);
}

// Exposed for unit tests.
export const _internal = {
  ipv4ToBytes,
  ipv6ToBytes,
  isBlockedIPv4,
  isBlockedIPv6,
  normalizeHostname,
};
