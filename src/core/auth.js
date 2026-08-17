/**
 * Shared bearer-token auth for side-effecting module routes.
 *
 * The server has no global authentication layer, so any module that writes to
 * the filesystem or drives an external tool is reachable anonymously by anyone
 * who can reach the port. This factory produces per-module Hono middleware
 * following the pattern introduced for the scanner module in GHSA-ppp9-2hc2-hfg5.
 *
 * Behaviour (deliberately opt-in so existing deployments keep working):
 *   - token env var set   → `Authorization: Bearer <token>` or `X-API-Key: <token>`
 *                           must match, else 401.
 *   - token env var unset → requests pass, with a one-time warning logged so
 *                           operators know the route is open.
 */

import { timingSafeEqual } from 'node:crypto';
import { logger } from '../utils/logger.js';

/**
 * Extract a presented credential from the request.
 * Supports `Authorization: Bearer <token>` and `X-API-Key: <token>`.
 * @param {import('hono').Context} c
 * @returns {string}
 */
export function extractToken(c) {
  const authz = c.req.header('authorization') || c.req.header('Authorization');
  if (authz && authz.toLowerCase().startsWith('bearer ')) {
    return authz.slice(7).trim();
  }
  return c.req.header('x-api-key') || c.req.header('X-API-Key') || '';
}

/**
 * Constant-time comparison of two opaque tokens. The length check short-circuits
 * mismatched lengths so `timingSafeEqual` never throws; the byte comparison then
 * does not leak where the values diverge.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Build Hono middleware requiring a valid module API token.
 *
 * @param {Object} params
 * @param {string} params.envVar - environment variable holding the expected token
 * @param {string} params.label - human-readable module name used in the warning
 * @param {string} [params.routesDescription='side-effecting routes'] - what the warning names
 * @returns {(c: import('hono').Context, next: () => Promise<void>) => Promise<unknown>}
 */
export function createTokenAuth({ envVar, label, routesDescription = 'side-effecting routes' }) {
  let missingTokenWarned = false;

  return async function requireToken(c, next) {
    const expected = process.env[envVar] || '';

    if (!expected) {
      if (!missingTokenWarned) {
        logger.warn(
          `${envVar} is not set — ${label} ${routesDescription} are UNAUTHENTICATED. ` +
            `Set ${envVar} to require a bearer token / X-API-Key.`
        );
        missingTokenWarned = true;
      }
      return next();
    }

    const provided = extractToken(c);
    if (!provided || !safeEqual(provided, expected)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return next();
  };
}
