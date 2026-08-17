/**
 * MCP Server Middleware
 *
 * This file contains middleware functions for the Hono app.
 */

import { logger } from '../utils/logger.js';
import { config } from './config.js';

/**
 * Does an `Origin` header denote the same host the request was addressed to?
 * A same-origin request is by definition not cross-site, so it is never CSRF.
 * @param {string} origin - the request's Origin header
 * @param {string} [host] - the request's Host header
 * @returns {boolean}
 */
export function originMatchesHost(origin, host) {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === String(host).trim().toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Sets up middleware for the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export function setupMiddleware(app) {
  // Request logging middleware
  app.use('*', async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    logger.info(`Request: ${method} ${path}`);

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    logger.info(`Response: ${method} ${path} ${status} ${duration}ms`);
  });

  // Cross-origin CSRF guard for state-changing requests.
  //
  // CORS defaults to `*` and no module requires authentication out of the box,
  // so a malicious web page could drive the victim's own browser at a
  // localhost-bound server and trigger side effects (the CSRF half of
  // GHSA-5x56-587v-mv4r and GHSA-ppp9-2hc2-hfg5). The response body is
  // unreadable cross-origin, but the side effect — a file write — already
  // happened.
  //
  // Browsers always send `Origin` on cross-origin requests; API clients, MCP
  // clients and curl do not send it at all. Rejecting a *present* and
  // non-allowlisted Origin on unsafe methods therefore blocks browser-driven
  // CSRF without breaking non-browser callers. Set CSRF_PROTECTION_ENABLED=false
  // to opt out, or list trusted origins in CORS_ORIGINS.
  if (config.security.csrf.enabled) {
    const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

    app.use('*', async (c, next) => {
      if (!unsafeMethods.has(c.req.method)) {
        return next();
      }

      const origin = c.req.header('origin');
      if (!origin) {
        return next(); // non-browser client
      }

      const allowed = config.security.cors.origins;
      // `*` only waives the check when an operator set it deliberately — the
      // built-in default must not disable its own protection.
      const wildcardOptIn = Boolean(process.env.CORS_ORIGINS) && allowed.includes('*');
      const sameOrigin = originMatchesHost(origin, c.req.header('host'));
      if (sameOrigin || wildcardOptIn || allowed.includes(origin)) {
        return next();
      }

      logger.warn(`Blocked cross-origin ${c.req.method} ${c.req.path} from origin ${origin}`);
      return c.json(
        {
          error:
            'Cross-origin state-changing requests are not allowed. ' +
            'Add this origin to CORS_ORIGINS to permit it.',
        },
        403
      );
    });
  }

  // CORS middleware
  if (config.security.cors.enabled) {
    app.use('*', async (c, next) => {
      // Handle preflight requests
      if (c.req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': config.security.cors.origins.join(', '),
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400', // 24 hours
          },
        });
      }

      // Add CORS headers to all responses
      c.header('Access-Control-Allow-Origin', config.security.cors.origins.join(', '));

      await next();
    });
  }

  // Error handling middleware
  app.onError((err, c) => {
    logger.error(`Error: ${err.message}`);
    logger.error(err.stack);

    return c.json(
      {
        error: {
          code: 'internal_server_error',
          message: config.server.env === 'development' ? err.message : 'Internal Server Error',
        },
      },
      500
    );
  });

  // Rate limiting middleware (simple in-memory implementation)
  if (config.security.rateLimit.enabled) {
    const ipRequests = new Map();

    app.use('*', async (c, next) => {
      const ip = c.req.header('x-forwarded-for') || 'unknown';
      const now = Date.now();

      // Initialize or clean up old requests
      if (!ipRequests.has(ip)) {
        ipRequests.set(ip, []);
      }

      const requests = ipRequests.get(ip);

      // Remove requests outside the window
      const windowStart = now - config.security.rateLimit.windowMs;
      const recentRequests = requests.filter(time => time > windowStart);

      // Check if rate limit is exceeded
      if (recentRequests.length >= config.security.rateLimit.max) {
        return c.json(
          {
            error: {
              code: 'rate_limit_exceeded',
              message: 'Too many requests, please try again later',
            },
          },
          429
        );
      }

      // Add current request
      recentRequests.push(now);
      ipRequests.set(ip, recentRequests);

      await next();
    });
  }
}
