/**
 * Example Custom Module for MCP Server
 *
 * This is an example of how to create a custom module for the MCP server.
 * This module adds a simple calculator tool that can perform basic arithmetic operations.
 */

import { logger } from '../../src/utils/logger.js';

/**
 * Calculator tool implementation
 * @param {Object} params - Calculator parameters
 * @returns {Object} Calculation result
 */
function calculator(params) {
  const { operation, a, b } = params;

  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Parameters a and b must be numbers');
  }

  let result;

  switch (operation) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero');
      }
      result = a / b;
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return { result };
}

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering calculator module');

  // Register the calculator tool
  app.get('/tools/calculator/info', c => {
    return c.json({
      name: 'calculator',
      description: 'Performs basic arithmetic operations',
      parameters: {
        operation: {
          type: 'string',
          description: 'The operation to perform (add, subtract, multiply, divide)',
          required: true,
        },
        a: {
          type: 'number',
          description: 'The first operand',
          required: true,
        },
        b: {
          type: 'number',
          description: 'The second operand',
          required: true,
        },
      },
    });
  });

  // Register the calculator endpoint
  app.post('/tools/calculator', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.operation) {
        return c.json({ error: 'Missing required parameter: operation' }, 400);
      }
      if (params.a === undefined) {
        return c.json({ error: 'Missing required parameter: a' }, 400);
      }
      if (params.b === undefined) {
        return c.json({ error: 'Missing required parameter: b' }, 400);
      }

      // Perform the calculation
      const result = calculator(params);

      return c.json({
        tool: 'calculator',
        operation: params.operation,
        a: params.a,
        b: params.b,
        result: result.result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });

  // Register the module info endpoint
  app.get('/modules/calculator', c => {
    return c.json(metadata);
  });

  logger.info('Calculator module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering calculator module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Calculator Module',
  version: '1.0.0',
  description: 'A simple calculator module that provides basic arithmetic operations',
  author: 'MCP Server Team',
  tools: ['calculator'],
};
