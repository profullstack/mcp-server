import { logger } from '../../src/utils/logger.js';

/**
 * Example module that demonstrates how to create a module for the MCP server
 */

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering example module');

  // Register routes
  app.get('/example', c => {
    return c.json({
      module: 'example',
      status: 'active',
      message: 'This is an example module',
    });
  });

  app.get('/example/info', c => {
    return c.json({
      name: 'Example Module',
      version: '1.0.0',
      description: 'A simple example module that demonstrates the module structure',
      endpoints: [
        { path: '/example', method: 'GET', description: 'Get module status' },
        { path: '/example/info', method: 'GET', description: 'Get module information' },
        { path: '/example/echo', method: 'POST', description: 'Echo back the request body' },
      ],
    });
  });

  app.post('/example/echo', async c => {
    try {
      const body = await c.req.json();
      return c.json({
        module: 'example',
        echo: body,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }
  });

  logger.info('Example module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering example module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Example Module',
  version: '1.0.0',
  description: 'A simple example module that demonstrates the module structure',
  author: 'MCP Server Team',
};
