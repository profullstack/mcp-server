/**
 * MCP Server Middleware
 * 
 * This file contains middleware functions for the Hono app.
 */

import { logger } from '../utils/logger.js';
import { config } from './config.js';

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
    
    return c.json({
      error: {
        code: 'internal_server_error',
        message: config.server.env === 'development' ? err.message : 'Internal Server Error',
      }
    }, 500);
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
        return c.json({
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many requests, please try again later',
          }
        }, 429);
      }
      
      // Add current request
      recentRequests.push(now);
      ipRequests.set(ip, recentRequests);
      
      await next();
    });
  }
}