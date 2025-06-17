/**
 * Email Checker Module
 *
 * An MCP server module for checking email validity using the un.limited.mx API.
 * This module provides comprehensive email validation services with history tracking.
 */

import { logger } from '../../src/utils/logger.js';
import {
  checkSingleEmail,
  checkMultipleEmails,
  getCheckHistory,
  getCheckById,
  clearHistory,
  getStats,
  getChecksByEmail,
  getRecentChecks,
  deleteCheck,
  updateApiKey,
  getServiceStatus,
} from './src/controller.js';
import { emailCheckerService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering email_checker module');

  // Basic module info endpoint
  app.get('/email_checker', c => {
    return c.json({
      module: 'email_checker',
      status: 'active',
      message: 'Email validation service using un.limited.mx API',
      version: metadata.version,
      configured: !!emailCheckerService.apiKey,
    });
  });

  // Email checking endpoints
  app.post('/email_checker/check', checkSingleEmail);
  app.post('/email_checker/check/batch', checkMultipleEmails);

  // History and data management endpoints
  app.get('/email_checker/history', getCheckHistory);
  app.get('/email_checker/history/:id', getCheckById);
  app.delete('/email_checker/history/:id', deleteCheck);
  app.delete('/email_checker/history', clearHistory);

  // Query endpoints
  app.get('/email_checker/email/:email', getChecksByEmail);
  app.get('/email_checker/recent', getRecentChecks);
  app.get('/email_checker/stats', getStats);

  // Configuration endpoints
  app.post('/email_checker/config/api-key', updateApiKey);
  app.get('/email_checker/status', getServiceStatus);

  // Register MCP tool info
  app.get('/tools/email_checker/info', c => {
    return c.json({
      name: 'email_checker',
      description: 'Check email validity using external API service',
      parameters: {
        action: {
          type: 'string',
          description: 'The action to perform (check, batch_check, history, stats, clear)',
          required: true,
          enum: ['check', 'batch_check', 'history', 'stats', 'clear', 'get_by_id'],
        },
        email: {
          type: 'string',
          description: 'Email address to check (required for check action)',
          required: false,
        },
        emails: {
          type: 'array',
          description: 'Array of email addresses to check (required for batch_check action)',
          required: false,
          items: {
            type: 'string',
          },
        },
        id: {
          type: 'string',
          description: 'Check ID for get_by_id action',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/email_checker', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      let result;

      switch (params.action) {
        case 'check':
          if (!params.email) {
            return c.json({ error: 'Missing required parameter: email' }, 400);
          }
          result = await emailCheckerService.checkEmail(params.email);
          break;

        case 'batch_check':
          if (!params.emails || !Array.isArray(params.emails)) {
            return c.json({ error: 'Missing required parameter: emails (array)' }, 400);
          }
          result = await emailCheckerService.checkMultipleEmails(params.emails);
          break;

        case 'history':
          result = emailCheckerService.getCheckHistory();
          break;

        case 'stats':
          result = emailCheckerService.getStats();
          break;

        case 'clear':
          result = { cleared: emailCheckerService.clearHistory() };
          break;

        case 'get_by_id':
          if (!params.id) {
            return c.json({ error: 'Missing required parameter: id' }, 400);
          }
          result = emailCheckerService.getCheckById(params.id);
          if (!result) {
            return c.json({ error: `Check with ID ${params.id} not found` }, 404);
          }
          break;

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'email_checker',
        action: params.action,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Email checker tool error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/email_checker', c => {
    return c.json(metadata);
  });

  logger.info('Email checker module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering email_checker module');
  // Perform any cleanup here
  emailCheckerService.clearHistory();
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Email Checker Module',
  version: '1.0.0',
  description:
    'Email validation service using un.limited.mx API with comprehensive history tracking',
  author: 'RooCode',
  tools: ['email_checker'],
  endpoints: [
    { path: '/email_checker', method: 'GET', description: 'Get module information' },
    { path: '/email_checker/check', method: 'POST', description: 'Check single email' },
    { path: '/email_checker/check/batch', method: 'POST', description: 'Check multiple emails' },
    { path: '/email_checker/history', method: 'GET', description: 'Get check history' },
    { path: '/email_checker/history/:id', method: 'GET', description: 'Get check by ID' },
    { path: '/email_checker/history/:id', method: 'DELETE', description: 'Delete check by ID' },
    { path: '/email_checker/history', method: 'DELETE', description: 'Clear all history' },
    {
      path: '/email_checker/email/:email',
      method: 'GET',
      description: 'Get checks for specific email',
    },
    { path: '/email_checker/recent', method: 'GET', description: 'Get recent checks' },
    { path: '/email_checker/stats', method: 'GET', description: 'Get statistics' },
    { path: '/email_checker/config/api-key', method: 'POST', description: 'Update API key' },
    { path: '/email_checker/status', method: 'GET', description: 'Get service status' },
    { path: '/tools/email_checker', method: 'POST', description: 'Email checker tool endpoint' },
  ],
  configuration: {
    apiKey: {
      required: true,
      description: 'API key for un.limited.mx email validation service',
      envVar: 'EMAIL_CHECKER_API_KEY',
    },
  },
  apiIntegration: {
    provider: 'un.limited.mx',
    endpoint: 'https://www.un.limited.mx/api/emails/urls',
    method: 'POST',
    authentication: 'X-API-Key header',
  },
};
