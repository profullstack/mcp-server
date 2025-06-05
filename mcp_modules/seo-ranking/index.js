/**
 * SEO Ranking Module
 *
 * This module provides SEO ranking checking functionality using the ValueSERP API.
 * It can check rankings for single or multiple keywords and find matches in both
 * organic and local search results.
 */

import { logger } from '../../src/utils/logger.js';
import {
  checkKeywordRanking,
  checkMultipleKeywords,
  searchPlaces,
  getRankingHistory,
  getModuleStatus,
  validateApiKey,
} from './src/controller.js';
import { seoRankingService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering seo-ranking module');

  // Basic module info endpoint
  app.get('/seo-ranking', getModuleStatus);

  // Register ranking check routes
  app.post('/seo-ranking/check', checkKeywordRanking);
  app.post('/seo-ranking/check-multiple', checkMultipleKeywords);
  app.post('/seo-ranking/places', searchPlaces);
  app.get('/seo-ranking/history/:domain', getRankingHistory);
  app.post('/seo-ranking/validate-key', validateApiKey);

  // Register MCP tool info
  app.get('/tools/seo-ranking/info', c => {
    return c.json({
      name: 'seo-ranking',
      description: 'Check SEO rankings for keywords using ValueSERP API',
      parameters: {
        action: {
          type: 'string',
          description: 'The action to perform (check, check-multiple, places, validate-key)',
          required: true,
          enum: ['check', 'check-multiple', 'places', 'validate-key'],
        },
        api_key: {
          type: 'string',
          description: 'ValueSERP API key',
          required: true,
        },
        keyword: {
          type: 'string',
          description: 'Single keyword to check (for check action)',
          required: false,
        },
        keywords: {
          type: 'array',
          description: 'Array of keywords to check (for check-multiple action, max 50)',
          required: false,
          items: {
            type: 'string',
          },
          maxItems: 50,
        },
        query: {
          type: 'string',
          description: 'Search query for places search',
          required: false,
        },
        domain: {
          type: 'string',
          description: 'Domain to find in search results',
          required: true,
        },
        location: {
          type: 'string',
          description: 'Search location (default: 98146,Washington,United States)',
          required: false,
        },
        gl: {
          type: 'string',
          description: 'Google country code (default: us)',
          required: false,
        },
        hl: {
          type: 'string',
          description: 'Google language code (default: en)',
          required: false,
        },
        google_domain: {
          type: 'string',
          description: 'Google domain to use (default: google.com)',
          required: false,
        },
        num: {
          type: 'string',
          description: 'Number of results to return (default: 100)',
          required: false,
        },
        batchSize: {
          type: 'number',
          description: 'Batch size for multiple keywords (default: 5)',
          required: false,
        },
        delay: {
          type: 'number',
          description: 'Delay between batches in ms (default: 1000)',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/seo-ranking', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      // Check for API key in header or body
      const apiKey = c.req.header('x-api-key') || params.api_key;

      if (!apiKey) {
        return c.json(
          {
            error:
              'Missing required parameter: api_key (provide via x-api-key header or api_key in body)',
          },
          400
        );
      }

      let result;

      switch (params.action) {
        case 'check':
          if (!params.keyword) {
            return c.json({ error: 'Missing required parameter: keyword' }, 400);
          }
          if (!params.domain) {
            return c.json({ error: 'Missing required parameter: domain' }, 400);
          }

          result = await seoRankingService.checkKeywordRanking(
            apiKey,
            params.keyword,
            params.domain,
            {
              location: params.location,
              gl: params.gl,
              hl: params.hl,
              google_domain: params.google_domain,
              num: params.num,
              include_ai_overview: params.include_ai_overview,
            }
          );
          break;

        case 'check-multiple':
          if (!params.keywords || !Array.isArray(params.keywords)) {
            return c.json({ error: 'Missing required parameter: keywords (array)' }, 400);
          }
          if (!params.domain) {
            return c.json({ error: 'Missing required parameter: domain' }, 400);
          }

          result = await seoRankingService.checkMultipleKeywords(
            apiKey,
            params.keywords,
            params.domain,
            {
              location: params.location,
              gl: params.gl,
              hl: params.hl,
              google_domain: params.google_domain,
              num: params.num,
              include_ai_overview: params.include_ai_overview,
              batchSize: params.batchSize,
              delay: params.delay,
            }
          );
          break;

        case 'places':
          if (!params.query) {
            return c.json({ error: 'Missing required parameter: query' }, 400);
          }
          if (!params.domain) {
            return c.json({ error: 'Missing required parameter: domain' }, 400);
          }

          result = await seoRankingService.searchPlaces(apiKey, params.query, params.domain, {
            location: params.location,
            gl: params.gl,
            hl: params.hl,
            google_domain: params.google_domain,
            num: params.num,
          });
          break;

        case 'validate-key':
          // Test the API key with a simple search
          result = await seoRankingService.checkKeywordRanking(apiKey, 'test', 'example.com', {
            num: '10',
          });
          result = {
            api_key_valid: true,
            test_completed: true,
            message: 'API key is valid and working',
          };
          break;

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'seo-ranking',
        action: params.action,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error in seo-ranking tool:', error);

      // Handle API key errors specifically
      if (error.message.includes('401') || error.message.includes('403')) {
        return c.json(
          {
            error: 'Invalid API key',
            details: error.message,
          },
          401
        );
      }

      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/seo-ranking', c => {
    return c.json(metadata);
  });

  logger.info('SEO Ranking module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering seo-ranking module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'SEO Ranking Module',
  version: '1.0.0',
  description:
    'Check SEO rankings for keywords using ValueSERP API. Supports single and multiple keyword checks with organic and local results.',
  author: 'Your Name',
  tools: ['seo-ranking'],
  endpoints: [
    { path: '/seo-ranking', method: 'GET', description: 'Get module status and information' },
    {
      path: '/seo-ranking/check',
      method: 'POST',
      description: 'Check ranking for a single keyword',
    },
    {
      path: '/seo-ranking/check-multiple',
      method: 'POST',
      description: 'Check rankings for multiple keywords',
    },
    {
      path: '/seo-ranking/places',
      method: 'POST',
      description: 'Search Google Places for businesses',
    },
    {
      path: '/seo-ranking/history/:domain',
      method: 'GET',
      description: 'Get ranking history for a domain',
    },
    {
      path: '/seo-ranking/validate-key',
      method: 'POST',
      description: 'Validate ValueSERP API key',
    },
    { path: '/tools/seo-ranking', method: 'POST', description: 'SEO ranking tool endpoint' },
  ],
  features: [
    'Single keyword ranking check',
    'Multiple keywords ranking check (up to 50)',
    'Google Places search',
    'Organic search results ranking',
    'Local search results ranking',
    'Batch processing with rate limiting',
    'Comprehensive ranking statistics',
    'API key validation',
  ],
  requirements: {
    api_key: 'ValueSERP API key required',
    rate_limits: 'Respects API rate limits with batch processing',
    max_keywords: 50,
  },
};
