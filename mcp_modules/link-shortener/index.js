/**
 * Link Shortener Module
 *
 * A module for creating short URLs using the hynt.us API service.
 * Converts long URLs into short hynt.us links that redirect to the original URL.
 */

import { logger } from '../../src/utils/logger.js';
import { createShortLink, getLinkInfo, validateUrl } from './src/controller.js';
import { linkService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering link shortener module');

  // Basic module info endpoint
  app.get('/link-shortener', c => {
    return c.json({
      module: 'link-shortener',
      status: 'active',
      message: 'Link Shortener - Create short URLs using hynt.us',
      version: metadata.version,
    });
  });

  // Register link shortener routes
  app.post('/link-shortener/create', createShortLink);
  app.get('/link-shortener/info/:alias', getLinkInfo);
  app.post('/link-shortener/validate', validateUrl);

  // Register MCP tool info
  app.get('/tools/link-shortener/info', c => {
    return c.json({
      name: 'link-shortener',
      description: 'Create short URLs using hynt.us API service',
      parameters: {
        url: {
          type: 'string',
          description: 'The long URL to shorten (must be a valid HTTP/HTTPS URL)',
          required: true,
        },
        alias: {
          type: 'string',
          description: 'Custom alias for the short link (optional, auto-generated if not provided)',
          required: false,
        },
        apiKey: {
          type: 'string',
          description:
            'hynt.us API key for authentication (optional, uses default if not provided)',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/link-shortener', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.url || typeof params.url !== 'string') {
        return c.json({ error: 'Missing or invalid required parameter: url' }, 400);
      }

      // Use provided API key or default
      const apiKey = params.apiKey || 'apikeys:1t7nfaw9ra0nmznsbdni';

      if (typeof apiKey !== 'string') {
        return c.json({ error: 'Invalid API key format' }, 400);
      }

      // Validate URL format
      try {
        new URL(params.url);
      } catch (error) {
        return c.json({ error: 'Invalid URL format. Must be a valid HTTP/HTTPS URL.' }, 400);
      }

      // Validate URL protocol
      const urlObj = new URL(params.url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return c.json({ error: 'URL must use HTTP or HTTPS protocol' }, 400);
      }

      // Create short link
      const options = {
        alias: params.alias || null,
        apiKey: apiKey,
      };

      const result = await linkService.createShortLink(params.url, options);

      return c.json({
        tool: 'link-shortener',
        input: {
          url: params.url,
          alias: params.alias,
          customAlias: !!params.alias,
          customApiKey: !!params.apiKey,
        },
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/link-shortener', c => {
    return c.json(metadata);
  });

  logger.info('Link shortener module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering link shortener module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Link Shortener Module',
  version: '1.0.0',
  description: 'Create short URLs using hynt.us API service for easy sharing and tracking',
  author: 'Profullstack, Inc.',
  tools: ['link-shortener'],
  endpoints: [
    { path: '/link-shortener', method: 'GET', description: 'Get module information' },
    { path: '/link-shortener/create', method: 'POST', description: 'Create a short link' },
    {
      path: '/link-shortener/info/:alias',
      method: 'GET',
      description: 'Get link information by alias',
    },
    { path: '/link-shortener/validate', method: 'POST', description: 'Validate URL format' },
    { path: '/tools/link-shortener', method: 'POST', description: 'Link shortener tool endpoint' },
  ],
};
