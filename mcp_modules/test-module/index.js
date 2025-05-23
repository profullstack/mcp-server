/**
 * Test Module
 *
 * This is a test module created to demonstrate the new module structure.
 */

import { logger } from '../../src/utils/logger.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering test-module module');

  // Basic module info endpoint
  app.get('/test-module', c => {
    return c.json({
      module: 'test-module',
      status: 'active',
      message: 'This is a test module',
      version: metadata.version,
    });
  });

  logger.info('Test-module module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering test-module module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Test Module',
  version: '1.0.0',
  description: 'A test module created to demonstrate the new module structure',
  author: 'MCP Server Team',
  endpoints: [{ path: '/test-module', method: 'GET', description: 'Get module information' }],
};
