/**
 * Link Shortener Controller
 *
 * HTTP route handlers for the link shortener module endpoints.
 */

import { linkService } from './service.js';
import {
  validateUrl as validateUrlUtil,
  validateAlias,
  sanitizeAlias,
  validateApiKey,
  checkUrlSafety,
} from './utils.js';

/**
 * Create a short link
 * @param {Object} c - Hono context
 * @returns {Response} Short link creation result
 */
export async function createShortLink(c) {
  try {
    const body = await c.req.json();
    const { url, alias, apiKey } = body;

    // Validate required parameters
    if (!url || typeof url !== 'string') {
      return c.json({ error: 'Missing or invalid required parameter: url' }, 400);
    }

    // Use provided API key or default
    const finalApiKey = apiKey || 'apikeys:1t7nfaw9ra0nmznsbdni';

    if (typeof finalApiKey !== 'string') {
      return c.json({ error: 'Invalid API key format' }, 400);
    }

    // Validate API key format
    if (!validateApiKey(finalApiKey)) {
      return c.json({ error: 'Invalid API key format' }, 400);
    }

    // Validate URL
    try {
      validateUrlUtil(url);
    } catch (error) {
      return c.json({ error: `Invalid URL: ${error.message}` }, 400);
    }

    // Check URL safety
    const safetyCheck = checkUrlSafety(url);
    if (!safetyCheck.safe) {
      return c.json(
        {
          error: 'URL failed safety check',
          details: safetyCheck.errors,
          warnings: safetyCheck.warnings,
        },
        400
      );
    }

    // Validate and sanitize alias if provided
    let finalAlias = null;
    if (alias) {
      if (!validateAlias(alias)) {
        finalAlias = sanitizeAlias(alias);
        if (finalAlias === alias) {
          return c.json(
            {
              error:
                'Invalid alias format. Use 3-20 alphanumeric characters, hyphens, or underscores.',
            },
            400
          );
        }
      } else {
        finalAlias = alias;
      }
    }

    // Create short link
    const options = {
      alias: finalAlias,
      apiKey: finalApiKey,
    };

    const result = await linkService.createShortLink(url, options);

    // Include safety warnings if any
    if (safetyCheck.warnings.length > 0) {
      result.warnings = safetyCheck.warnings;
    }

    return c.json({
      success: true,
      data: result,
      message: 'Short link created successfully',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get link information by alias
 * @param {Object} c - Hono context
 * @returns {Response} Link information
 */
export async function getLinkInfo(c) {
  try {
    const alias = c.req.param('alias');
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.query('apiKey');

    if (!alias) {
      return c.json({ error: 'Missing alias parameter' }, 400);
    }

    if (!apiKey) {
      return c.json(
        { error: 'Missing API key in Authorization header or apiKey query parameter' },
        400
      );
    }

    if (!validateApiKey(apiKey)) {
      return c.json({ error: 'Invalid API key format' }, 400);
    }

    const result = await linkService.getLinkInfo(alias, apiKey);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return c.json(
        {
          success: false,
          error: 'Short link not found',
        },
        404
      );
    }

    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Validate URL format and accessibility
 * @param {Object} c - Hono context
 * @returns {Response} URL validation result
 */
export async function validateUrl(c) {
  try {
    const body = await c.req.json();
    const { url, checkAccess = false } = body;

    if (!url || typeof url !== 'string') {
      return c.json({ error: 'Missing or invalid required parameter: url' }, 400);
    }

    // Basic URL validation
    let validationResult;
    try {
      validateUrlUtil(url);
      validationResult = { valid: true, url: url };
    } catch (error) {
      validationResult = { valid: false, url: url, error: error.message };
    }

    // Safety check
    const safetyCheck = checkUrlSafety(url);
    validationResult.safety = safetyCheck;

    // Optional accessibility check
    if (checkAccess && validationResult.valid) {
      try {
        const accessResult = await linkService.validateUrlAccess(url);
        validationResult.accessibility = accessResult;
      } catch (error) {
        validationResult.accessibility = {
          accessible: false,
          error: error.message,
        };
      }
    }

    return c.json({
      success: true,
      data: validationResult,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Generate preview for a potential short link
 * @param {Object} c - Hono context
 * @returns {Response} Link preview
 */
export async function generatePreview(c) {
  try {
    const body = await c.req.json();
    const { url, alias } = body;

    if (!url || typeof url !== 'string') {
      return c.json({ error: 'Missing or invalid required parameter: url' }, 400);
    }

    // Validate alias if provided
    if (alias && !validateAlias(alias)) {
      return c.json({ error: 'Invalid alias format' }, 400);
    }

    const preview = linkService.generatePreview(url, alias);

    return c.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Bulk create multiple short links
 * @param {Object} c - Hono context
 * @returns {Response} Bulk creation results
 */
export async function bulkCreateShortLinks(c) {
  try {
    const body = await c.req.json();
    const { urls, apiKey, prefix } = body;

    if (!urls || !Array.isArray(urls)) {
      return c.json({ error: 'Missing or invalid required parameter: urls (must be array)' }, 400);
    }

    // Use provided API key or default
    const finalApiKey = apiKey || 'apikeys:1t7nfaw9ra0nmznsbdni';

    if (typeof finalApiKey !== 'string') {
      return c.json({ error: 'Invalid API key format' }, 400);
    }

    if (!validateApiKey(finalApiKey)) {
      return c.json({ error: 'Invalid API key format' }, 400);
    }

    if (urls.length === 0) {
      return c.json({ error: 'URLs array cannot be empty' }, 400);
    }

    if (urls.length > 10) {
      return c.json({ error: 'Maximum 10 URLs allowed per bulk request' }, 400);
    }

    // Validate prefix if provided
    if (prefix && !validateAlias(prefix)) {
      return c.json({ error: 'Invalid prefix format' }, 400);
    }

    const options = { apiKey: finalApiKey, prefix };
    const result = await linkService.bulkCreateShortLinks(urls, options);

    return c.json({
      success: true,
      data: result,
      message: `Bulk operation completed: ${result.successful}/${result.total} successful`,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get analytics for a short link
 * @param {Object} c - Hono context
 * @returns {Response} Link analytics
 */
export async function getLinkAnalytics(c) {
  try {
    const alias = c.req.param('alias');
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.query('apiKey');

    if (!alias) {
      return c.json({ error: 'Missing alias parameter' }, 400);
    }

    if (!apiKey) {
      return c.json(
        { error: 'Missing API key in Authorization header or apiKey query parameter' },
        400
      );
    }

    if (!validateApiKey(apiKey)) {
      return c.json({ error: 'Invalid API key format' }, 400);
    }

    const result = await linkService.getLinkAnalytics(alias, apiKey);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return c.json(
        {
          success: false,
          error: 'Short link not found',
        },
        404
      );
    }

    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Test API connection
 * @param {Object} c - Hono context
 * @returns {Response} Connection test result
 */
export async function testConnection(c) {
  try {
    const body = await c.req.json();
    const { apiKey } = body;

    // Use provided API key or default
    const finalApiKey = apiKey || 'apikeys:1t7nfaw9ra0nmznsbdni';

    if (typeof finalApiKey !== 'string') {
      return c.json({ error: 'Invalid API key format' }, 400);
    }

    if (!validateApiKey(finalApiKey)) {
      return c.json({ error: 'Invalid API key format' }, 400);
    }

    const result = await linkService.testConnection(finalApiKey);

    return c.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get module statistics
 * @param {Object} c - Hono context
 * @returns {Response} Module statistics
 */
export async function getModuleStats(c) {
  try {
    const cacheStats = linkService.getCacheStats();

    const stats = {
      module: 'link-shortener',
      version: '1.0.0',
      uptime: process.uptime(),
      cache: cacheStats,
      endpoints: [
        'POST /link-shortener/create',
        'GET /link-shortener/info/:alias',
        'POST /link-shortener/validate',
        'POST /link-shortener/preview',
        'POST /link-shortener/bulk',
        'GET /link-shortener/analytics/:alias',
        'POST /link-shortener/test',
      ],
      features: [
        'URL shortening via hynt.us API',
        'Custom alias support',
        'URL validation and safety checks',
        'Bulk link creation',
        'Link analytics',
        'QR code generation',
        'Caching for performance',
      ],
    };

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Clear module cache
 * @param {Object} c - Hono context
 * @returns {Response} Cache clear result
 */
export async function clearCache(c) {
  try {
    const beforeSize = linkService.getCacheStats().size;
    linkService.clearCache();
    const afterSize = linkService.getCacheStats().size;

    return c.json({
      success: true,
      message: 'Cache cleared successfully',
      data: {
        entriesCleared: beforeSize,
        currentSize: afterSize,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}
