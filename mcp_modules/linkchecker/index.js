/**
 * Linkchecker Module
 *
 * This module provides link checking functionality using linkinator.
 * It can check links on web pages and return detailed results in JSON format.
 */

import { logger } from '../../src/utils/logger.js';
import {
  checkLinks,
  getAllResults,
  getResultById,
  deleteResult,
  clearAllResults,
  quickCheck,
} from './src/controller.js';
import { linkCheckerService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering linkchecker module');

  // Basic module info endpoint
  app.get('/linkchecker', c => {
    return c.json({
      module: 'linkchecker',
      status: 'active',
      message: 'Link checking module using linkinator',
      version: metadata.version,
    });
  });

  // Register link checking routes
  app.post('/linkchecker/check', checkLinks);
  app.get('/linkchecker/check', quickCheck);
  app.get('/linkchecker/results', getAllResults);
  app.get('/linkchecker/results/:id', getResultById);
  app.delete('/linkchecker/results/:id', deleteResult);
  app.delete('/linkchecker/results', clearAllResults);

  // Register MCP tool info
  app.get('/tools/linkchecker/info', c => {
    return c.json({
      name: 'linkchecker',
      description: 'Check links on web pages using linkinator and return detailed results',
      parameters: {
        url: {
          type: 'string',
          description: 'The URL to check for broken links',
          required: true,
        },
        recurse: {
          type: 'boolean',
          description: 'Whether to recursively check links on the page',
          required: false,
          default: false,
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds for each link check',
          required: false,
          default: 5000,
        },
        concurrency: {
          type: 'number',
          description: 'Number of concurrent link checks',
          required: false,
          default: 100,
        },
        markdown: {
          type: 'boolean',
          description: 'Whether to check markdown files',
          required: false,
          default: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/linkchecker', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.url) {
        return c.json({ error: 'Missing required parameter: url' }, 400);
      }

      // Extract options
      const options = {};
      if (params.recurse !== undefined) options.recurse = params.recurse;
      if (params.timeout !== undefined) options.timeout = params.timeout;
      if (params.concurrency !== undefined) options.concurrency = params.concurrency;
      if (params.markdown !== undefined) options.markdown = params.markdown;

      // Perform link check
      const result = await linkCheckerService.checkLinks(params.url, options);

      return c.json({
        tool: 'linkchecker',
        url: params.url,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/linkchecker', c => {
    return c.json(metadata);
  });

  logger.info('Linkchecker module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering linkchecker module');
  // Clear any stored results
  linkCheckerService.clearAllResults();
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Linkchecker Module',
  version: '1.0.0',
  description: 'A module for checking links on web pages using linkinator',
  author: 'MCP Server',
  tools: ['linkchecker'],
  endpoints: [
    { path: '/linkchecker', method: 'GET', description: 'Get module information' },
    { path: '/linkchecker/check', method: 'POST', description: 'Check links for a URL' },
    {
      path: '/linkchecker/check',
      method: 'GET',
      description: 'Quick link check via query parameter',
    },
    { path: '/linkchecker/results', method: 'GET', description: 'Get all link check results' },
    { path: '/linkchecker/results/:id', method: 'GET', description: 'Get link check result by ID' },
    {
      path: '/linkchecker/results/:id',
      method: 'DELETE',
      description: 'Delete a link check result',
    },
    { path: '/linkchecker/results', method: 'DELETE', description: 'Clear all link check results' },
    { path: '/tools/linkchecker', method: 'POST', description: 'Linkchecker tool endpoint' },
  ],
};
