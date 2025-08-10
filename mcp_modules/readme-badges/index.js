/**
 * README Badges Module
 *
 * Generates shields.io badges and updates README.md with idempotent markers.
 */

import { logger } from '../../src/utils/logger.js';
import { generateBadgesHandler, updateReadmeHandler, detectTechHandler } from './src/controller.js';
import { readmeBadgesService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering readme-badges module');

  // Basic module info endpoint
  app.get('/readme-badges', c => {
    return c.json({
      module: 'readme-badges',
      status: 'active',
      message: 'Generate shields.io badges and update README.md',
      version: metadata.version,
    });
  });

  // HTTP routes
  app.post('/readme-badges/generate', generateBadgesHandler);
  app.post('/readme-badges/update', updateReadmeHandler);
  app.post('/readme-badges/detect', detectTechHandler);

  // MCP tool info
  app.get('/tools/readme-badges/info', c => {
    return c.json({
      name: 'readme-badges',
      description: 'Generate shields.io badges and update README.md using idempotent markers',
      parameters: {
        action: {
          type: 'string',
          description: 'Action to perform: generate, update, or detect',
          required: true,
        },
        badges: {
          type: 'array',
          description:
            'List of badge keys (e.g., "react", "node", "postgres") or badge descriptor objects',
          required: false,
        },
        githubUrl: {
          type: 'string',
          description: 'GitHub repository URL used as default link target for badges',
          required: false,
        },
        readmePath: {
          type: 'string',
          description: 'Path to README.md when action=update',
          required: false,
        },
        insertAt: {
          type: 'string',
          description:
            "Where to insert badges when action=update: 'top'|'bottom'|'auto' (default: auto)",
          required: false,
        },
        marker: {
          type: 'string',
          description: "Marker base id for idempotent updates (default: 'readme-badges')",
          required: false,
        },
        linkMap: {
          type: 'object',
          description: 'Optional map of badge keys to destination URLs',
          required: false,
        },
        rootDir: {
          type: 'string',
          description: 'Root directory for tech detection (default: process.cwd())',
          required: false,
        },
      },
    });
  });

  // MCP tool endpoint
  app.post('/tools/readme-badges', async c => {
    try {
      const params = await c.req.json();

      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      switch (params.action) {
        case 'generate': {
          if (!Array.isArray(params.badges)) {
            return c.json({ error: 'badges must be an array' }, 400);
          }
          const markdown = readmeBadgesService.generate({
            badges: params.badges,
            githubUrl: params.githubUrl,
            linkMap: params.linkMap,
          });
          return c.json({
            tool: 'readme-badges',
            action: 'generate',
            result: { markdown, count: params.badges.length, timestamp: new Date().toISOString() },
          });
        }

        case 'update': {
          if (!Array.isArray(params.badges)) {
            return c.json({ error: 'badges must be an array' }, 400);
          }
          if (!params.readmePath) {
            return c.json({ error: 'Missing required parameter: readmePath' }, 400);
          }
          const outcome = await readmeBadgesService.updateReadme({
            readmePath: params.readmePath,
            badges: params.badges,
            githubUrl: params.githubUrl,
            insertAt: params.insertAt ?? 'auto',
            marker: params.marker ?? 'readme-badges',
            linkMap: params.linkMap,
          });
          return c.json({
            tool: 'readme-badges',
            action: 'update',
            result: { ...outcome, timestamp: new Date().toISOString() },
          });
        }

        case 'detect': {
          const detected = await readmeBadgesService.detectTech({
            rootDir: params.rootDir,
          });
          return c.json({
            tool: 'readme-badges',
            action: 'detect',
            result: {
              badges: detected,
              count: detected.length,
              timestamp: new Date().toISOString(),
            },
          });
        }

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Module metadata endpoint
  app.get('/modules/readme-badges', c => {
    return c.json(metadata);
  });

  logger.info('readme-badges module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering readme-badges module');
  // Perform any cleanup here if necessary
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'README Badges Module',
  version: '1.0.0',
  description: 'Generate shields.io badges and update README.md with idempotent markers',
  author: 'Profullstack, Inc.',
  tools: ['readme-badges'],
  endpoints: [
    { path: '/readme-badges', method: 'GET', description: 'Get module information' },
    { path: '/readme-badges/generate', method: 'POST', description: 'Generate markdown badges' },
    { path: '/readme-badges/update', method: 'POST', description: 'Update README.md with badges' },
    {
      path: '/readme-badges/detect',
      method: 'POST',
      description: 'Detect tech stack to suggest badges',
    },
    {
      path: '/tools/readme-badges',
      method: 'POST',
      description: 'Readme badges MCP tool endpoint',
    },
  ],
};
