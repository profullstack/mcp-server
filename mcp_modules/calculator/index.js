/**
 * Calculator Module
 *
 * A simple calculator module that performs basic mathematical calculations
 * using Node.js eval() function with proper input validation.
 */

import { logger } from '../../src/utils/logger.js';

/**
 * Safely evaluate a mathematical expression
 * @param {string} expression - The mathematical expression to evaluate
 * @returns {number} The result of the calculation
 */
function safeEval(expression) {
  // Remove any whitespace
  const cleanExpression = expression.replace(/\s+/g, '');

  // Validate that the expression only contains allowed characters
  const allowedPattern = /^[0-9+\-*/.()%\s]+$/;
  if (!allowedPattern.test(cleanExpression)) {
    throw new Error(
      'Invalid characters in expression. Only numbers, +, -, *, /, %, ., (, ) are allowed.'
    );
  }

  // Check for potential security issues
  if (
    cleanExpression.includes('__') ||
    cleanExpression.includes('constructor') ||
    cleanExpression.includes('prototype')
  ) {
    throw new Error('Invalid expression detected.');
  }

  try {
    // Use Function constructor for safer evaluation than eval()
    const result = new Function('return ' + cleanExpression)();

    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Expression did not evaluate to a valid number.');
    }

    return result;
  } catch (error) {
    throw new Error(`Calculation error: ${error.message}`);
  }
}

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering calculator module');

  // Basic module info endpoint
  app.get('/calculator', c => {
    return c.json({
      module: 'calculator',
      status: 'active',
      message: 'Calculator module for basic mathematical operations',
      version: metadata.version,
    });
  });

  // Calculator endpoint
  app.post('/calculator/calculate', async c => {
    try {
      const body = await c.req.json();
      const { expression } = body;

      if (!expression) {
        return c.json({ error: 'Missing required parameter: expression' }, 400);
      }

      const result = safeEval(expression);

      return c.json({
        expression,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });

  // Register MCP tool info
  app.get('/tools/calculator/info', c => {
    return c.json({
      name: 'calculator',
      description: 'Perform basic mathematical calculations',
      parameters: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4", "(10 - 5) / 2")',
          required: true,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/calculator', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.expression) {
        return c.json({ error: 'Missing required parameter: expression' }, 400);
      }

      const result = safeEval(params.expression);

      return c.json({
        tool: 'calculator',
        expression: params.expression,
        result,
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
  description: 'A calculator module for basic mathematical operations',
  author: 'Profullstack, Inc.',
  tools: ['calculator'],
  endpoints: [
    { path: '/calculator', method: 'GET', description: 'Get module information' },
    { path: '/calculator/calculate', method: 'POST', description: 'Perform a calculation' },
    { path: '/tools/calculator', method: 'POST', description: 'Calculator tool endpoint' },
  ],
};
