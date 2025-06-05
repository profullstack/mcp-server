/**
 * Lighthouse Module
 *
 * This module provides Lighthouse performance audit capabilities for websites.
 * It can generate JSON reports for website speed assessments and performance analysis.
 */

import { logger } from '../../src/utils/logger.js';
import {
  getAllReports,
  getReportById,
  runAudit,
  runBatchAudit,
  deleteReport,
  getReportSummary,
  getReportTextSummary,
  clearAllReports,
  getHealthStatus,
} from './src/controller.js';
import { lighthouseService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering Lighthouse module');

  // Basic module info endpoint
  app.get('/lighthouse', c => {
    return c.json({
      module: 'lighthouse',
      status: 'active',
      message: 'Lighthouse performance audit module',
      version: metadata.version,
      description:
        'Run Lighthouse audits to analyze website performance and generate detailed reports',
    });
  });

  // Health check endpoint
  app.get('/lighthouse/health', getHealthStatus);

  // Report management routes
  app.get('/lighthouse/reports', getAllReports);
  app.get('/lighthouse/reports/:id', getReportById);
  app.get('/lighthouse/reports/:id/summary', getReportSummary);
  app.get('/lighthouse/reports/:id/text', getReportTextSummary);
  app.delete('/lighthouse/reports/:id', deleteReport);
  app.delete('/lighthouse/reports', clearAllReports);

  // Audit routes
  app.post('/lighthouse/audit', runAudit);
  app.post('/lighthouse/batch-audit', runBatchAudit);

  // Register MCP tool info
  app.get('/tools/lighthouse/info', c => {
    return c.json({
      name: 'lighthouse',
      description: 'Run Lighthouse performance audits on websites and manage audit reports',
      parameters: {
        action: {
          type: 'string',
          description:
            'The action to perform (audit, batch-audit, get-report, get-summary, delete-report, clear-reports, list-reports)',
          required: true,
          enum: [
            'audit',
            'batch-audit',
            'get-report',
            'get-summary',
            'delete-report',
            'clear-reports',
            'list-reports',
          ],
        },
        url: {
          type: 'string',
          description: 'The URL to audit (required for audit action)',
          required: false,
        },
        urls: {
          type: 'array',
          description: 'Array of URLs to audit (required for batch-audit action)',
          required: false,
          items: {
            type: 'string',
          },
        },
        id: {
          type: 'string',
          description:
            'The report ID (required for get-report, get-summary, delete-report actions)',
          required: false,
        },
        options: {
          type: 'object',
          description: 'Audit options (categories, headless mode, etc.)',
          required: false,
          properties: {
            categories: {
              type: 'array',
              description:
                'Categories to audit (performance, accessibility, best-practices, seo, pwa)',
              items: {
                type: 'string',
                enum: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
              },
            },
            headless: {
              type: 'boolean',
              description: 'Run Chrome in headless mode (default: true)',
            },
          },
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/lighthouse', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      let result;

      switch (params.action) {
        case 'audit':
          if (!params.url) {
            return c.json({ error: 'Missing required parameter: url' }, 400);
          }
          result = await lighthouseService.runAudit(params.url, params.options || {});
          break;

        case 'batch-audit':
          if (!params.urls || !Array.isArray(params.urls)) {
            return c.json({ error: 'Missing required parameter: urls (must be an array)' }, 400);
          }
          result = await lighthouseService.runBatchAudit(params.urls, params.options || {});
          break;

        case 'get-report':
          if (!params.id) {
            return c.json({ error: 'Missing required parameter: id' }, 400);
          }
          result = lighthouseService.getReport(params.id);
          if (!result) {
            return c.json({ error: `Report with ID ${params.id} not found` }, 404);
          }
          break;

        case 'get-summary':
          if (!params.id) {
            return c.json({ error: 'Missing required parameter: id' }, 400);
          }
          result = lighthouseService.generateSummary(params.id);
          break;

        case 'delete-report': {
          if (!params.id) {
            return c.json({ error: 'Missing required parameter: id' }, 400);
          }
          const deleted = lighthouseService.deleteReport(params.id);
          result = { deleted, id: params.id };
          break;
        }

        case 'clear-reports':
          lighthouseService.clearReports();
          result = { cleared: true };
          break;

        case 'list-reports':
          result = lighthouseService.getAllReports().map(report => ({
            id: report.id,
            url: report.url,
            timestamp: report.timestamp,
            performanceScore: report.scores.performance?.displayValue || 0,
          }));
          break;

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'lighthouse',
        action: params.action,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/lighthouse', c => {
    return c.json(metadata);
  });

  logger.info('Lighthouse module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering Lighthouse module');
  // Clear all stored reports on unregister
  lighthouseService.clearReports();
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Lighthouse Module',
  version: '1.0.0',
  description:
    'Lighthouse performance audit module for website speed assessments and performance analysis',
  author: 'MCP Server',
  tools: ['lighthouse'],
  endpoints: [
    { path: '/lighthouse', method: 'GET', description: 'Get module information' },
    { path: '/lighthouse/health', method: 'GET', description: 'Get module health status' },
    { path: '/lighthouse/reports', method: 'GET', description: 'Get all audit reports' },
    { path: '/lighthouse/reports/:id', method: 'GET', description: 'Get audit report by ID' },
    {
      path: '/lighthouse/reports/:id/summary',
      method: 'GET',
      description: 'Get audit report summary',
    },
    {
      path: '/lighthouse/reports/:id/text',
      method: 'GET',
      description: 'Get audit report as text',
    },
    { path: '/lighthouse/reports/:id', method: 'DELETE', description: 'Delete an audit report' },
    { path: '/lighthouse/reports', method: 'DELETE', description: 'Clear all audit reports' },
    { path: '/lighthouse/audit', method: 'POST', description: 'Run a Lighthouse audit on a URL' },
    {
      path: '/lighthouse/batch-audit',
      method: 'POST',
      description: 'Run Lighthouse audits on multiple URLs',
    },
    { path: '/tools/lighthouse', method: 'POST', description: 'Lighthouse tool endpoint' },
  ],
  dependencies: {
    lighthouse: '^11.4.0',
    'chrome-launcher': 'included with lighthouse',
  },
  features: [
    'Single URL performance audits',
    'Batch audits for multiple URLs',
    'Core Web Vitals measurement',
    'Performance opportunities identification',
    'Diagnostic information',
    'JSON and text report formats',
    'Report storage and management',
    'Headless Chrome support',
    'Configurable audit categories',
  ],
};
