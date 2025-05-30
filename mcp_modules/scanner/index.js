/**
 * Scanner Module
 *
 * This module integrates with the @profullstack/scanner package to provide
 * web application security scanning capabilities through the MCP server.
 */

import { logger } from '../../src/utils/logger.js';
import {
  scanTarget,
  getScanHistory,
  getScanById,
  getScanStats,
  generateReport,
  exportReport,
} from './src/controller.js';
import { scannerService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering scanner module');

  // Basic module info endpoint
  app.get('/scanner', c => {
    return c.json({
      module: 'scanner',
      status: 'active',
      message: 'Web application security scanner module',
      version: metadata.version,
    });
  });

  // Register scan routes
  app.get('/scanner/scans', getScanHistory);
  app.get('/scanner/scans/:id', getScanById);
  app.get('/scanner/stats', getScanStats);
  app.post('/scanner/scan', scanTarget);
  app.get('/scanner/reports/:id', generateReport);
  app.get('/scanner/reports/:id/export', exportReport);

  // Register MCP tool
  app.get('/tools/scanner/info', c => {
    return c.json({
      name: 'scanner',
      description: 'Perform security scans on web applications',
      parameters: {
        action: {
          type: 'string',
          description: 'The action to perform (scan, history, stats, report)',
          required: true,
        },
        target: {
          type: 'string',
          description: 'The target URL or IP address to scan',
          required: false,
        },
        tools: {
          type: 'array',
          description: 'Array of tools to use (nikto, zap, wapiti, nuclei, sqlmap)',
          required: false,
        },
        scanId: {
          type: 'string',
          description: 'The ID of the scan for report generation',
          required: false,
        },
        format: {
          type: 'string',
          description: 'Report format (json, html, pdf, csv)',
          required: false,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of scans to return in history',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/scanner', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      let result;

      switch (params.action) {
        case 'scan':
          if (!params.target) {
            return c.json({ error: 'Missing required parameter: target' }, 400);
          }
          result = await scannerService.scanTarget(params.target, {
            tools: params.tools || ['nikto', 'wapiti', 'nuclei'],
            verbose: params.verbose || false,
            timeout: params.timeout || 300,
            toolOptions: params.toolOptions || {},
            auth: params.auth || null,
            headers: params.headers || {},
            projectId: params.projectId || null,
            scanProfile: params.scanProfile || null,
          });
          break;

        case 'history':
          result = scannerService.getScanHistory(params.limit || 10);
          break;

        case 'stats':
          result = scannerService.getScanStats();
          break;

        case 'report':
          if (!params.scanId) {
            return c.json({ error: 'Missing required parameter: scanId' }, 400);
          }
          result = await scannerService.generateReport(params.scanId, {
            format: params.format || 'json',
          });
          break;

        case 'export':
          if (!params.scanId) {
            return c.json({ error: 'Missing required parameter: scanId' }, 400);
          }
          result = await scannerService.exportReport(params.scanId, {
            format: params.format || 'json',
            destination: params.destination || null,
          });
          break;

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'scanner',
        action: params.action,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/scanner', c => {
    return c.json(metadata);
  });

  logger.info('Scanner module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering scanner module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Scanner Module',
  version: '1.0.0',
  description: 'Web application security scanning module for MCP server',
  author: 'Profullstack, Inc.',
  tools: ['scanner'],
  endpoints: [
    { path: '/scanner', method: 'GET', description: 'Get module information' },
    { path: '/scanner/scans', method: 'GET', description: 'Get scan history' },
    { path: '/scanner/scans/:id', method: 'GET', description: 'Get scan by ID' },
    { path: '/scanner/stats', method: 'GET', description: 'Get scan statistics' },
    { path: '/scanner/scan', method: 'POST', description: 'Perform a security scan' },
    { path: '/scanner/reports/:id', method: 'GET', description: 'Generate a report for a scan' },
    {
      path: '/scanner/reports/:id/export',
      method: 'GET',
      description: 'Export a report for a scan',
    },
    { path: '/tools/scanner', method: 'POST', description: 'Scanner tool endpoint' },
  ],
};
