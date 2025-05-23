/**
 * Module Template
 *
 * This is a template for creating new MCP server modules.
 * Copy this directory to create a new module and modify as needed.
 */

import { logger } from '../../src/utils/logger.js';
import {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  processItem,
} from './src/controller.js';
import { templateService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering template module');

  // Basic module info endpoint
  app.get('/template', c => {
    return c.json({
      module: 'template',
      status: 'active',
      message: 'This is a template module',
      version: metadata.version,
    });
  });

  // Register item routes
  app.get('/template/items', getAllItems);
  app.get('/template/items/:id', getItemById);
  app.post('/template/items', createItem);
  app.put('/template/items/:id', updateItem);
  app.delete('/template/items/:id', deleteItem);
  app.post('/template/items/:id/process', processItem);

  // Register MCP tool
  app.get('/tools/template/info', c => {
    return c.json({
      name: 'template',
      description: 'Perform operations on template items',
      parameters: {
        action: {
          type: 'string',
          description: 'The action to perform (create, get, update, delete, process)',
          required: true,
        },
        id: {
          type: 'string',
          description: 'The ID of the item for get, update, delete, and process actions',
          required: false,
        },
        item: {
          type: 'object',
          description: 'The item data for create and update actions',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/template', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      let result;

      switch (params.action) {
        case 'create':
          if (!params.item) {
            return c.json({ error: 'Missing required parameter: item' }, 400);
          }
          result = templateService.createItem(params.item);
          break;

        case 'get':
          if (params.id) {
            result = templateService.getItemById(params.id);
          } else {
            result = templateService.getAllItems();
          }
          break;

        case 'update':
          if (!params.id) {
            return c.json({ error: 'Missing required parameter: id' }, 400);
          }
          if (!params.item) {
            return c.json({ error: 'Missing required parameter: item' }, 400);
          }
          result = templateService.updateItem(params.id, params.item);
          break;

        case 'delete':
          if (!params.id) {
            return c.json({ error: 'Missing required parameter: id' }, 400);
          }
          result = templateService.deleteItem(params.id);
          break;

        case 'process':
          if (!params.id) {
            return c.json({ error: 'Missing required parameter: id' }, 400);
          }
          result = await templateService.processItem(params.id);
          break;

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'template',
        action: params.action,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/template', c => {
    return c.json(metadata);
  });

  logger.info('Template module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering template module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Template Module',
  version: '1.0.0',
  description: 'A template for creating new MCP server modules',
  author: 'Your Name',
  tools: ['template'],
  endpoints: [
    { path: '/template', method: 'GET', description: 'Get module information' },
    { path: '/template/items', method: 'GET', description: 'Get all items' },
    { path: '/template/items/:id', method: 'GET', description: 'Get item by ID' },
    { path: '/template/items', method: 'POST', description: 'Create a new item' },
    { path: '/template/items/:id', method: 'PUT', description: 'Update an item' },
    { path: '/template/items/:id', method: 'DELETE', description: 'Delete an item' },
    { path: '/template/items/:id/process', method: 'POST', description: 'Process an item' },
    { path: '/tools/template', method: 'POST', description: 'Template tool endpoint' },
  ],
};
