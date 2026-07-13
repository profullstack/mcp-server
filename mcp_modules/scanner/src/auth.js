/**
 * Scanner authentication middleware
 *
 * Guards the scanner's side-effecting routes (scan, export, the /tools/scanner
 * tool endpoint) that were previously reachable with no authentication at all
 * (see GHSA-ppp9-2hc2-hfg5). A bearer token / API key is required when
 * `SCANNER_API_TOKEN` is configured.
 *
 * Behaviour:
 *   - `SCANNER_API_TOKEN` set   → the token must be supplied as
 *       `Authorization: Bearer <token>` or `X-API-Key: <token>`, else 401.
 *   - `SCANNER_API_TOKEN` unset → requests are allowed (preserves out-of-box
 *       behaviour) but a one-time warning is logged so operators know the
 *       side-effecting routes are open.
 */

import { timingSafeEqual } from 'crypto';
import { logger } from '../../../src/utils/logger.js';

let missingTokenWarned = false;

/**
 * Extract a presented credential from the request.
 * Supports `Authorization: Bearer <token>` and `X-API-Key: <token>`.
 * @param {import('hono').Context} c
 * @returns {string}
 */
function extractToken(c) {
  const authz = c.req.header('authorization') || c.req.header('Authorization');
  if (authz && authz.toLowerCase().startsWith('bearer ')) {
    return authz.slice(7).trim();
  }
  return c.req.header('x-api-key') || c.req.header('X-API-Key') || '';
}

/**
 * Constant-time comparison of two opaque tokens.
 * A length check short-circuits mismatched lengths (so `timingSafeEqual` never
 * throws), then `timingSafeEqual` compares the bytes without leaking where they
 * differ. This is a bearer-token equality check, not password storage, so no
 * key-derivation/hashing is involved.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Hono middleware requiring a valid scanner API token on side-effecting routes.
 * @param {import('hono').Context} c
 * @param {() => Promise<void>} next
 */
export async function requireScannerAuth(c, next) {
  const token = process.env.SCANNER_API_TOKEN || '';

  if (!token) {
    if (!missingTokenWarned) {
      logger.warn(
        'SCANNER_API_TOKEN is not set — scanner side-effecting routes (scan/export) are UNAUTHENTICATED. ' +
          'Set SCANNER_API_TOKEN to require a bearer token / X-API-Key.'
      );
      missingTokenWarned = true;
    }
    return next();
  }

  const provided = extractToken(c);
  if (!provided || !safeEqual(provided, token)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return next();
}

// Exposed for tests.
export const _internal = { safeEqual, extractToken };
