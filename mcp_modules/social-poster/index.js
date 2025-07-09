/**
 * Social Poster MCP Module
 *
 * This module provides social media posting capabilities via MCP tools.
 * It wraps the @profullstack/social-poster library to provide a clean MCP interface.
 */

import { logger } from '../../src/utils/logger.js';
import { SocialPostingService } from './src/service.js';
import { createControllers } from './src/controller.js';

// Initialize service instance
let socialService;
let controllers;

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering social-poster module');

  try {
    // Initialize the social posting service
    socialService = new SocialPostingService({
      headless: process.env.SOCIAL_POSTER_HEADLESS !== 'false',
      timeout: parseInt(process.env.SOCIAL_POSTER_TIMEOUT) || 30000,
      configPath: process.env.SOCIAL_POSTER_CONFIG_PATH,
      sessionsPath: process.env.SOCIAL_POSTER_SESSIONS_PATH,
    });

    // Create controller functions
    controllers = createControllers(socialService);

    // Basic module info endpoint
    app.get('/social-poster', c => {
      return c.json({
        module: 'social-poster',
        status: 'active',
        message: 'Social media posting MCP module',
        version: metadata.version,
        supportedPlatforms: socialService.getSupportedPlatforms().map(p => p.id),
      });
    });

    // Register MCP tool info endpoints
    registerToolInfoEndpoints(app);

    // Register MCP tool execution endpoints
    registerToolEndpoints(app);

    // Register module info endpoint
    app.get('/modules/social-poster', c => {
      return c.json(metadata);
    });

    logger.info('Social-poster module registered successfully');
  } catch (error) {
    logger.error('Failed to register social-poster module:', error);
    throw error;
  }
}

/**
 * Register MCP tool info endpoints
 * @param {import('hono').Hono} app - The Hono app instance
 */
function registerToolInfoEndpoints(app) {
  // Social post tool info
  app.get('/tools/social-post/info', c => {
    return c.json({
      name: 'social-post',
      description: 'Post content to social media platforms',
      parameters: {
        content: {
          type: 'object',
          description: 'Content to post (must have text and/or link)',
          required: true,
          properties: {
            text: {
              type: 'string',
              description: 'Text content to post',
            },
            link: {
              type: 'string',
              description: 'URL to share',
            },
            type: {
              type: 'string',
              description: 'Content type (text or link)',
            },
          },
        },
        platforms: {
          type: 'array',
          description: 'Target platforms (defaults to all available)',
          required: false,
          items: {
            type: 'string',
            enum: ['x', 'linkedin', 'reddit', 'facebook', 'hacker-news', 'stacker-news', 'primal'],
          },
        },
      },
    });
  });

  // Social login tool info
  app.get('/tools/social-login/info', c => {
    return c.json({
      name: 'social-login',
      description: 'Authenticate with a social media platform',
      parameters: {
        platform: {
          type: 'string',
          description: 'Platform to login to',
          required: true,
          enum: ['x', 'linkedin', 'reddit', 'facebook', 'hacker-news', 'stacker-news', 'primal'],
        },
        options: {
          type: 'object',
          description: 'Login options',
          required: false,
          properties: {
            headless: {
              type: 'boolean',
              description: 'Run browser in headless mode',
            },
            timeout: {
              type: 'number',
              description: 'Login timeout in milliseconds',
            },
          },
        },
      },
    });
  });

  // Social status tool info
  app.get('/tools/social-status/info', c => {
    return c.json({
      name: 'social-status',
      description: 'Get authentication status for all platforms',
      parameters: {},
    });
  });

  // Social platforms tool info
  app.get('/tools/social-platforms/info', c => {
    return c.json({
      name: 'social-platforms',
      description: 'Get available platforms for posting',
      parameters: {},
    });
  });

  // Social supported platforms tool info
  app.get('/tools/social-supported-platforms/info', c => {
    return c.json({
      name: 'social-supported-platforms',
      description: 'Get detailed information about supported platforms',
      parameters: {},
    });
  });

  // Social sample content tool info
  app.get('/tools/social-sample-content/info', c => {
    return c.json({
      name: 'social-sample-content',
      description: 'Generate sample content for testing',
      parameters: {
        type: {
          type: 'string',
          description: 'Type of sample content',
          required: false,
          enum: ['text', 'link'],
          default: 'text',
        },
      },
    });
  });

  // Social validate content tool info
  app.get('/tools/social-validate-content/info', c => {
    return c.json({
      name: 'social-validate-content',
      description: 'Validate content before posting',
      parameters: {
        content: {
          type: 'object',
          description: 'Content to validate',
          required: true,
        },
      },
    });
  });

  // Social posting stats tool info
  app.get('/tools/social-posting-stats/info', c => {
    return c.json({
      name: 'social-posting-stats',
      description: 'Get statistics from a posting result',
      parameters: {
        result: {
          type: 'object',
          description: 'Result object from a previous post operation',
          required: true,
        },
      },
    });
  });
}

/**
 * Register MCP tool execution endpoints
 * @param {import('hono').Hono} app - The Hono app instance
 */
function registerToolEndpoints(app) {
  // Social post tool
  app.post('/tools/social-post', controllers.postContent);

  // Social login tool
  app.post('/tools/social-login', controllers.loginToPlatform);

  // Social status tool
  app.post('/tools/social-status', controllers.getPlatformStatus);

  // Social platforms tool
  app.post('/tools/social-platforms', controllers.getAvailablePlatforms);

  // Social supported platforms tool
  app.post('/tools/social-supported-platforms', controllers.getSupportedPlatforms);

  // Social sample content tool
  app.post('/tools/social-sample-content', controllers.createSampleContent);

  // Social validate content tool
  app.post('/tools/social-validate-content', controllers.validateContent);

  // Social posting stats tool
  app.post('/tools/social-posting-stats', controllers.getPostingStats);

  // Module info tool
  app.post('/tools/social-module-info', controllers.getModuleInfo);
}

/**
 * Unregister this module (cleanup)
 * This is called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering social-poster module');

  try {
    if (socialService) {
      await socialService.close();
    }
    logger.info('Social-poster module unregistered successfully');
  } catch (error) {
    logger.error('Error during social-poster module unregistration:', error);
  }
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Social Poster MCP Module',
  version: '1.0.0',
  description: 'MCP module for social media posting using @profullstack/social-poster',
  author: 'Profullstack, Inc.',
  license: 'MIT',
  tools: [
    'social-post',
    'social-login',
    'social-status',
    'social-platforms',
    'social-supported-platforms',
    'social-sample-content',
    'social-validate-content',
    'social-posting-stats',
    'social-module-info',
  ],
  endpoints: [
    { path: '/social-poster', method: 'GET', description: 'Get module information' },
    { path: '/tools/social-post', method: 'POST', description: 'Post content to social platforms' },
    { path: '/tools/social-login', method: 'POST', description: 'Login to a platform' },
    {
      path: '/tools/social-status',
      method: 'POST',
      description: 'Get platform authentication status',
    },
    { path: '/tools/social-platforms', method: 'POST', description: 'Get available platforms' },
    {
      path: '/tools/social-supported-platforms',
      method: 'POST',
      description: 'Get supported platforms info',
    },
    {
      path: '/tools/social-sample-content',
      method: 'POST',
      description: 'Generate sample content',
    },
    { path: '/tools/social-validate-content', method: 'POST', description: 'Validate content' },
    { path: '/tools/social-posting-stats', method: 'POST', description: 'Get posting statistics' },
    { path: '/tools/social-module-info', method: 'POST', description: 'Get module information' },
  ],
  supportedPlatforms: [
    'x',
    'linkedin',
    'reddit',
    'facebook',
    'hacker-news',
    'stacker-news',
    'primal',
  ],
  dependencies: {
    '@profullstack/social-poster': '^1.1.0',
  },
  environment: {
    SOCIAL_POSTER_HEADLESS: 'Run browser in headless mode (default: true)',
    SOCIAL_POSTER_TIMEOUT: 'Login timeout in milliseconds (default: 30000)',
    SOCIAL_POSTER_CONFIG_PATH: 'Path to social poster config file',
    SOCIAL_POSTER_SESSIONS_PATH: 'Path to sessions storage directory',
  },
};
