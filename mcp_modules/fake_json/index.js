/**
 * Fake JSON Module
 *
 * This module generates fake JSON responses for any endpoint using AI inference.
 * It's inspired by the "Anything API" concept.
 */

import { logger } from '../../src/utils/logger.js';
import { generateJsonResponse } from './src/controller.js';
import { fakeJsonService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering fake_json module');

  // Basic module info endpoint
  app.get('/fake_json', c => {
    return c.json({
      module: 'fake_json',
      status: 'active',
      message: 'This module generates fake JSON responses for any endpoint',
      version: metadata.version,
    });
  });

  // Catch-all route to handle any path
  app.get('/fake_json/*', generateJsonResponse);

  // Register MCP tool
  app.get('/tools/fake_json/info', c => {
    return c.json({
      name: 'fake_json',
      description: 'Generate fake JSON responses for any endpoint',
      parameters: {
        endpoint: {
          type: 'string',
          description: 'The endpoint path to generate JSON for (e.g., /users, /products/123)',
          required: true,
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of fields to include in the response',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/fake_json', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.endpoint) {
        return c.json({ error: 'Missing required parameter: endpoint' }, 400);
      }

      const result = await fakeJsonService.generateJson(params.endpoint, params.fields);

      return c.json({
        tool: 'fake_json',
        endpoint: params.endpoint,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/fake_json', c => {
    return c.json(metadata);
  });

  logger.info('fake_json module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering fake_json module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Fake JSON Module',
  version: '1.0.0',
  description: 'Generates fake JSON responses for any endpoint using AI inference',
  author: 'MCP Team',
  tools: ['fake_json'],
  endpoints: [
    { path: '/fake_json', method: 'GET', description: 'Get module information' },
    { path: '/fake_json/*', method: 'GET', description: 'Generate fake JSON for any endpoint' },
    { path: '/tools/fake_json', method: 'POST', description: 'Fake JSON tool endpoint' },
  ],
};
