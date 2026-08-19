/**
 * Webhook signature verification service.
 *
 * Design rules, each covered by a test:
 *  1. Every digest comparison goes through `timingSafeEqual`, with an explicit length check
 *     first (timingSafeEqual throws on length mismatch and length itself is still a leak).
 *  2. Providers that sign a timestamp get replay protection, symmetric in both directions so a
 *     future-dated timestamp is rejected too.
 *  3. Failures return a specific `reason` rather than a bare false, so a caller cannot mistake a
 *     falsy value for a handled failure.
 *  4. Nothing is parsed before the signature is verified. Decoding attacker-controlled JSON first
 *     is how a verification layer becomes an attack surface.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const DEFAULT_TOLERANCE_SECONDS = 300;

export const REASONS = {
  OK: 'ok',
  MISMATCH: 'signature_mismatch',
  STALE: 'timestamp_out_of_range',
  MALFORMED: 'malformed_signature',
  UNSUPPORTED: 'unsupported_provider',
};

const ok = () => ({ valid: true, reason: REASONS.OK });
const fail = (reason, detail) => ({
  valid: false,
  reason,
  detail,
  advice: 'Do not parse or act on this payload.',
});

function safeEqual(expected, actual) {
  const a = Buffer.isBuffer(expected) ? expected : Buffer.from(expected);
  const b = Buffer.isBuffer(actual) ? actual : Buffer.from(actual);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function checkTimestamp(timestamp, toleranceSeconds, nowSeconds) {
  if (typeof timestamp !== 'string' || !/^\d+$/.test(timestamp.trim())) {
    return fail(REASONS.MALFORMED, `timestamp is not an integer: ${JSON.stringify(timestamp)}`);
  }
  const parsed = Number(timestamp.trim());
  if (!Number.isSafeInteger(parsed)) {
    return fail(REASONS.MALFORMED, 'timestamp is not a safe integer');
  }
  const now = typeof nowSeconds === 'number' ? nowSeconds : Date.now() / 1000;
  if (Math.abs(now - parsed) > toleranceSeconds) {
    return fail(REASONS.STALE, `timestamp ${parsed} is outside the +/-${toleranceSeconds}s window`);
  }
  return null;
}

function decodeBase64(value) {
  const trimmed = String(value).trim();
  const buf = Buffer.from(trimmed, 'base64');
  // Buffer.from is lenient; round-tripping catches non-base64 input.
  if (buf.toString('base64').replace(/=+$/, '') !== trimmed.replace(/=+$/, '')) return null;
  return buf;
}

export function verifyStripe(secret, body, header, options = {}) {
  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (typeof header !== 'string' || !header) return fail(REASONS.MALFORMED, 'missing Stripe-Signature');

  let timestamp = null;
  const presented = [];
  for (const chunk of header.split(',')) {
    const idx = chunk.indexOf('=');
    if (idx === -1) continue;
    const key = chunk.slice(0, idx).trim();
    const value = chunk.slice(idx + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1') presented.push(value);
  }
  if (!timestamp || presented.length === 0) {
    return fail(REASONS.MALFORMED, 'Stripe-Signature must contain t= and at least one v1=');
  }
  const stale = checkTimestamp(timestamp, tolerance, options.nowSeconds);
  if (stale) return stale;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  // Stripe may send several v1 signatures while a secret is rotating; any match is valid.
  for (const candidate of presented) {
    if (safeEqual(expected, candidate)) return ok();
  }
  return fail(REASONS.MISMATCH, 'no v1 signature matched');
}

export function verifyGithub(secret, body, header) {
  const prefix = 'sha256=';
  if (typeof header !== 'string' || !header.startsWith(prefix)) {
    return fail(REASONS.MALFORMED, "X-Hub-Signature-256 must start with 'sha256='");
  }
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return safeEqual(expected, header.slice(prefix.length).trim())
    ? ok()
    : fail(REASONS.MISMATCH, 'signature does not match');
}

export function verifySlack(signingSecret, body, timestamp, signature, options = {}) {
  const prefix = 'v0=';
  if (typeof signature !== 'string' || !signature.startsWith(prefix)) {
    return fail(REASONS.MALFORMED, "X-Slack-Signature must start with 'v0='");
  }
  const stale = checkTimestamp(timestamp, options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS, options.nowSeconds);
  if (stale) return stale;

  const expected = createHmac('sha256', signingSecret).update(`v0:${timestamp}:${body}`).digest('hex');
  return safeEqual(expected, signature.slice(prefix.length).trim())
    ? ok()
    : fail(REASONS.MISMATCH, 'signature does not match');
}

export function verifyShopify(secret, body, header) {
  if (typeof header !== 'string' || !header) {
    return fail(REASONS.MALFORMED, 'missing X-Shopify-Hmac-Sha256');
  }
  const presented = decodeBase64(header);
  if (!presented) return fail(REASONS.MALFORMED, 'signature is not valid base64');
  const expected = createHmac('sha256', secret).update(body).digest();
  return safeEqual(expected, presented) ? ok() : fail(REASONS.MISMATCH, 'signature does not match');
}

export function verifyTwilio(authToken, url, params, signature) {
  if (typeof signature !== 'string' || !signature) {
    return fail(REASONS.MALFORMED, 'missing X-Twilio-Signature');
  }
  const presented = decodeBase64(signature);
  if (!presented) return fail(REASONS.MALFORMED, 'signature is not valid base64');
  let payload = String(url ?? '');
  for (const key of Object.keys(params ?? {}).sort()) payload += `${key}${params[key]}`;
  const expected = createHmac('sha1', authToken).update(payload).digest();
  return safeEqual(expected, presented) ? ok() : fail(REASONS.MISMATCH, 'signature does not match');
}

export function verifyHmac(secret, body, signatureHex, algorithm = 'sha256') {
  if (typeof signatureHex !== 'string' || !signatureHex.trim()) {
    return fail(REASONS.MALFORMED, 'empty signature');
  }
  if (!/^[0-9a-fA-F]+$/.test(signatureHex.trim())) {
    return fail(REASONS.MALFORMED, 'signature is not valid hex');
  }
  const expected = createHmac(algorithm, secret).update(body).digest('hex');
  return safeEqual(expected, signatureHex.trim().toLowerCase())
    ? ok()
    : fail(REASONS.MISMATCH, 'signature does not match');
}

export const SUPPORTED_PROVIDERS = ['stripe', 'github', 'slack', 'shopify', 'twilio', 'hmac'];

/**
 * Provider-agnostic entry point.
 * @param {object} input
 * @returns {{valid: boolean, reason: string, detail?: string, advice?: string}}
 */
export function verify(input = {}) {
  const { provider, secret, body = '', signature, timestamp, url, params, toleranceSeconds, nowSeconds } = input;
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return fail(REASONS.UNSUPPORTED, `unsupported provider: ${provider}`);
  }
  if (typeof secret !== 'string' || !secret) return fail(REASONS.MALFORMED, 'missing secret');
  const opts = { toleranceSeconds, nowSeconds };
  switch (provider) {
    case 'stripe': return verifyStripe(secret, body, signature, opts);
    case 'github': return verifyGithub(secret, body, signature);
    case 'slack': return verifySlack(secret, body, timestamp, signature, opts);
    case 'shopify': return verifyShopify(secret, body, signature);
    case 'twilio': return verifyTwilio(secret, url, params, signature);
    case 'hmac': return verifyHmac(secret, body, signature);
    default: return fail(REASONS.UNSUPPORTED, `unsupported provider: ${provider}`);
  }
}

export const webhookVerifyService = {
  verify, verifyStripe, verifyGithub, verifySlack, verifyShopify, verifyTwilio, verifyHmac,
  SUPPORTED_PROVIDERS, REASONS, DEFAULT_TOLERANCE_SECONDS,
};
