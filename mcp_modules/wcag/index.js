/**
 * WCAG Module
 *
 * Web Content Accessibility Guidelines (WCAG) compliance testing module using Pa11y.
 * Provides automated accessibility testing for web pages and applications.
 */

import { logger } from '../../src/utils/logger.js';
import {
  getAllTests,
  getTestById,
  runWcagCheck,
  getWcagSummary,
  updateTest,
  deleteTest,
  processCustomTest,
  getHealthStatus,
} from './src/controller.js';
import { wcagService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering WCAG module');

  // Basic module info endpoint
  app.get('/wcag', c => {
    return c.json({
      module: 'wcag',
      status: 'active',
      message: 'WCAG compliance testing module using Pa11y',
      version: metadata.version,
      description: 'Automated Web Content Accessibility Guidelines testing',
    });
  });

  // Health check endpoint
  app.get('/wcag/health', getHealthStatus);

  // WCAG testing routes
  app.get('/wcag/tests', getAllTests);
  app.get('/wcag/tests/:id', getTestById);
  app.post('/wcag/check', runWcagCheck);
  app.post('/wcag/summary', getWcagSummary);
  app.put('/wcag/tests/:id', updateTest);
  app.delete('/wcag/tests/:id', deleteTest);
  app.post('/wcag/tests/:id/process', processCustomTest);

  // Register MCP tool info endpoint
  app.get('/tools/wcag/info', c => {
    return c.json({
      name: 'wcag',
      description: 'Perform WCAG compliance testing on web pages using Pa11y',
      parameters: {
        action: {
          type: 'string',
          description: 'The action to perform (check, summary, health)',
          required: true,
          enum: ['check', 'summary', 'health'],
        },
        url: {
          type: 'string',
          description: 'Single URL to test (for check action)',
          required: false,
        },
        urls: {
          type: 'array',
          description: 'Array of URLs to test (for check and summary actions)',
          items: { type: 'string' },
          required: false,
        },
        level: {
          type: 'string',
          description: 'WCAG compliance level',
          enum: ['WCAG2A', 'WCAG2AA', 'WCAG2AAA'],
          default: 'WCAG2AA',
          required: false,
        },
        reporter: {
          type: 'string',
          description: 'Output format',
          enum: ['json', 'csv', 'html', 'cli'],
          default: 'json',
          required: false,
        },
        timeout: {
          type: 'number',
          description: 'Test timeout in milliseconds',
          default: 30000,
          required: false,
        },
        ignore: {
          type: 'array',
          description: 'Array of WCAG rules to ignore',
          items: { type: 'string' },
          required: false,
        },
        includeNotices: {
          type: 'boolean',
          description: 'Include notice-level issues',
          default: false,
          required: false,
        },
        includeWarnings: {
          type: 'boolean',
          description: 'Include warning-level issues',
          default: true,
          required: false,
        },
        viewport: {
          type: 'string',
          description: 'Viewport size (e.g., "1280x1024")',
          default: '1280x1024',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/wcag', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      let result;

      switch (params.action) {
        case 'check': {
          if (!params.url && !params.urls) {
            return c.json(
              {
                error: 'Missing required parameter: either "url" or "urls" must be provided',
              },
              400
            );
          }

          const checkOptions = {
            standard: params.level || 'WCAG2AA',
            reporter: params.reporter || 'json',
            timeout: params.timeout || 30000,
            ignore: params.ignore || [],
            includeNotices: params.includeNotices || false,
            includeWarnings: params.includeWarnings !== false,
            viewport: params.viewport
              ? params.viewport.split('x').reduce((acc, val, i) => {
                  acc[i === 0 ? 'width' : 'height'] = parseInt(val, 10);
                  return acc;
                }, {})
              : { width: 1280, height: 1024 },
          };

          if (params.url) {
            result = await wcagService.checkUrl(params.url, checkOptions);
          } else {
            result = await wcagService.checkUrls(params.urls, checkOptions);
          }
          break;
        }

        case 'summary': {
          if (!params.urls || !Array.isArray(params.urls)) {
            return c.json(
              {
                error: 'Missing required parameter: "urls" must be an array',
              },
              400
            );
          }

          const summaryOptions = {
            standard: params.level || 'WCAG2AA',
            reporter: 'json',
            timeout: params.timeout || 30000,
            ignore: params.ignore || [],
            includeNotices: params.includeNotices || false,
            includeWarnings: params.includeWarnings !== false,
            viewport: params.viewport
              ? params.viewport.split('x').reduce((acc, val, i) => {
                  acc[i === 0 ? 'width' : 'height'] = parseInt(val, 10);
                  return acc;
                }, {})
              : { width: 1280, height: 1024 },
          };

          result = await wcagService.getSummary(params.urls, summaryOptions);
          break;
        }

        case 'health': {
          // Check Pa11y availability
          const { spawn } = await import('child_process');

          result = await new Promise(resolve => {
            const pa11y = spawn('pa11y', ['--version']);
            let version = '';

            pa11y.stdout.on('data', data => {
              version += data.toString();
            });

            pa11y.on('close', code => {
              if (code === 0) {
                resolve({
                  status: 'healthy',
                  pa11yVersion: version.trim(),
                  message: 'Pa11y is available and ready',
                });
              } else {
                resolve({
                  status: 'unhealthy',
                  error: 'Pa11y not available',
                  suggestion: 'Run ./bin/install.sh to install Pa11y',
                });
              }
            });

            pa11y.on('error', () => {
              resolve({
                status: 'unhealthy',
                error: 'Pa11y not found',
                suggestion: 'Run ./bin/install.sh to install Pa11y',
              });
            });
          });
          break;
        }

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'wcag',
        action: params.action,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json(
        {
          error: error.message,
          tool: 'wcag',
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Register the module info endpoint
  app.get('/modules/wcag', c => {
    return c.json(metadata);
  });

  logger.info('WCAG module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering WCAG module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'WCAG Compliance Module',
  version: '1.0.0',
  description: 'Web Content Accessibility Guidelines (WCAG) compliance testing using Pa11y CLI',
  author: 'MCP Server',
  tools: ['wcag'],
  dependencies: ['pa11y'],
  endpoints: [
    { path: '/wcag', method: 'GET', description: 'Get module information' },
    { path: '/wcag/health', method: 'GET', description: 'Check module health status' },
    { path: '/wcag/tests', method: 'GET', description: 'Get all test results' },
    { path: '/wcag/tests/:id', method: 'GET', description: 'Get test result by ID' },
    { path: '/wcag/check', method: 'POST', description: 'Run WCAG compliance check' },
    { path: '/wcag/summary', method: 'POST', description: 'Get accessibility summary' },
    { path: '/wcag/tests/:id', method: 'PUT', description: 'Update a test configuration' },
    { path: '/wcag/tests/:id', method: 'DELETE', description: 'Delete a test result' },
    {
      path: '/wcag/tests/:id/process',
      method: 'POST',
      description: 'Process test with custom rules',
    },
    { path: '/tools/wcag', method: 'POST', description: 'WCAG tool endpoint' },
  ],
  examples: [
    {
      title: 'Single URL Test',
      description: 'Test a single URL for WCAG 2.1 Level AA compliance',
      request: {
        method: 'POST',
        path: '/wcag/check',
        body: {
          url: 'https://example.com',
          level: 'WCAG2AA',
        },
      },
    },
    {
      title: 'Multiple URLs Test',
      description: 'Test multiple URLs and get aggregated results',
      request: {
        method: 'POST',
        path: '/wcag/check',
        body: {
          urls: ['https://example.com', 'https://example.com/about'],
          level: 'WCAG2AA',
          includeWarnings: true,
        },
      },
    },
    {
      title: 'Accessibility Summary',
      description: 'Get accessibility summary with statistics',
      request: {
        method: 'POST',
        path: '/wcag/summary',
        body: {
          urls: ['https://example.com', 'https://example.com/contact'],
          level: 'WCAG2AA',
        },
      },
    },
  ],
};
