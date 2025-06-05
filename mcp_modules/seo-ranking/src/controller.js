/**
 * SEO Ranking Module Controller
 *
 * This file contains the HTTP route handlers for the SEO ranking module.
 */

import { seoRankingService } from './service.js';
import { logger } from '../../../src/utils/logger.js';

/**
 * Check ranking for a single keyword
 * @param {import('hono').Context} c - Hono context
 */
export async function checkKeywordRanking(c) {
  try {
    const body = await c.req.json();
    const { api_key, keyword, domain, ...options } = body;

    const validation = seoRankingService.validateSearchParams({
      api_key,
      keyword,
      domain,
    });

    if (!validation.valid) {
      return c.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        400
      );
    }

    const result = await seoRankingService.checkKeywordRanking(api_key, keyword, domain, options);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in checkKeywordRanking:', error);
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Check rankings for multiple keywords
 * @param {import('hono').Context} c - Hono context
 */
export async function checkMultipleKeywords(c) {
  try {
    const body = await c.req.json();
    const { api_key, keywords, domain, ...options } = body;

    const validation = seoRankingService.validateSearchParams({
      api_key,
      keywords,
      domain,
    });

    if (!validation.valid) {
      return c.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        400
      );
    }

    const result = await seoRankingService.checkMultipleKeywords(
      api_key,
      keywords,
      domain,
      options
    );

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in checkMultipleKeywords:', error);
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get ranking history (placeholder for future implementation)
 * @param {import('hono').Context} c - Hono context
 */
export async function getRankingHistory(c) {
  try {
    const domain = c.req.param('domain');

    if (!domain) {
      return c.json(
        {
          error: 'Domain parameter is required',
        },
        400
      );
    }

    // Placeholder - in a real implementation, this would fetch from a database
    return c.json({
      success: true,
      data: {
        domain,
        message: 'Ranking history feature not yet implemented',
        suggestion: 'Use checkKeywordRanking or checkMultipleKeywords endpoints',
      },
    });
  } catch (error) {
    logger.error('Error in getRankingHistory:', error);
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get module status and configuration
 * @param {import('hono').Context} c - Hono context
 */
export async function getModuleStatus(c) {
  try {
    return c.json({
      success: true,
      data: {
        module: 'seo-ranking',
        status: 'active',
        api_provider: 'ValueSERP',
        features: [
          'Single keyword ranking check',
          'Multiple keywords ranking check (up to 50)',
          'Organic results ranking',
          'Local results ranking',
          'Batch processing with rate limiting',
        ],
        endpoints: [
          'POST /seo-ranking/check - Check single keyword',
          'POST /seo-ranking/check-multiple - Check multiple keywords',
          'GET /seo-ranking/history/:domain - Get ranking history (placeholder)',
        ],
      },
    });
  } catch (error) {
    logger.error('Error in getModuleStatus:', error);
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Validate API key (test endpoint)
 * @param {import('hono').Context} c - Hono context
 */
export async function validateApiKey(c) {
  try {
    const body = await c.req.json();
    const { api_key } = body;

    if (!api_key) {
      return c.json(
        {
          error: 'API key is required',
        },
        400
      );
    }

    // Test the API key with a simple search
    await seoRankingService.checkKeywordRanking(
      api_key,
      'test',
      'example.com',
      { num: '10' } // Limit to 10 results for testing
    );

    return c.json({
      success: true,
      data: {
        api_key_valid: true,
        test_search_completed: true,
        message: 'API key is valid and working',
      },
    });
  } catch (error) {
    logger.error('Error in validateApiKey:', error);

    // Check if it's an API key related error
    if (error.message.includes('401') || error.message.includes('403')) {
      return c.json(
        {
          success: false,
          data: {
            api_key_valid: false,
            message: 'Invalid API key',
          },
        },
        401
      );
    }

    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}
