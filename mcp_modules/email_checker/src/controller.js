/**
 * Email Checker Module Controller
 *
 * This file contains the route handlers for the email checker module.
 */

import { emailCheckerService, EmailCheckerService } from './service.js';

/**
 * Check a single email address
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function checkSingleEmail(c) {
  try {
    const data = await c.req.json();
    const apiKey = c.req.header('X-API-Key');
    const provider = data.provider || 'unlimited'; // Default to un.limited.mx

    if (!data.email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    if (!apiKey) {
      return c.json({ error: 'X-API-Key header is required' }, 401);
    }

    // Validate provider
    if (provider !== 'unlimited') {
      return c.json(
        { error: 'Unsupported provider. Currently supported: unlimited (un.limited.mx)' },
        400
      );
    }

    // Create a temporary service instance with the provided API key
    const tempService = new EmailCheckerService(apiKey, provider);
    const result = await tempService.checkEmail(data.email);

    return c.json({
      success: true,
      message: 'Email checked successfully',
      provider: 'unlimited',
      result,
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      400
    );
  }
}

/**
 * Check multiple email addresses
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function checkMultipleEmails(c) {
  try {
    const data = await c.req.json();
    const apiKey = c.req.header('X-API-Key');
    const provider = data.provider || 'unlimited'; // Default to un.limited.mx

    if (!data.emails) {
      return c.json({ error: 'Emails array is required' }, 400);
    }

    if (!Array.isArray(data.emails) || data.emails.length === 0) {
      return c.json({ error: 'At least one email is required' }, 400);
    }

    if (!apiKey) {
      return c.json({ error: 'X-API-Key header is required' }, 401);
    }

    // Validate provider
    if (provider !== 'unlimited') {
      return c.json(
        { error: 'Unsupported provider. Currently supported: unlimited (un.limited.mx)' },
        400
      );
    }

    // Create a temporary service instance with the provided API key
    const tempService = new EmailCheckerService(apiKey, provider);
    const results = await tempService.checkMultipleEmails(data.emails);

    // Calculate summary statistics
    const summary = {
      total: results.length,
      valid: results.filter(r => r.isValid === true).length,
      invalid: results.filter(r => r.isValid === false).length,
    };

    return c.json({
      success: true,
      message: 'Emails checked successfully',
      provider: 'unlimited',
      results,
      summary,
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get check history
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getCheckHistory(c) {
  try {
    const apiKey = c.req.header('X-API-Key');
    const provider = c.req.query('provider') || 'unlimited'; // Default to un.limited.mx

    if (!apiKey) {
      return c.json({ error: 'X-API-Key header is required' }, 401);
    }

    // Validate provider
    if (provider !== 'unlimited') {
      return c.json(
        { error: 'Unsupported provider. Currently supported: unlimited (un.limited.mx)' },
        400
      );
    }

    // Create a temporary service instance with the provided API key
    const tempService = new EmailCheckerService(apiKey, provider);
    const history = tempService.getCheckHistory();

    return c.json({
      success: true,
      provider: 'unlimited',
      count: history.length,
      history,
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get check result by ID
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getCheckById(c) {
  try {
    const { id } = c.req.param();
    const apiKey = c.req.header('X-API-Key');
    const provider = c.req.query('provider') || 'unlimited'; // Default to un.limited.mx

    if (!apiKey) {
      return c.json({ error: 'X-API-Key header is required' }, 401);
    }

    // Validate provider
    if (provider !== 'unlimited') {
      return c.json(
        { error: 'Unsupported provider. Currently supported: unlimited (un.limited.mx)' },
        400
      );
    }

    // Create a temporary service instance with the provided API key
    const tempService = new EmailCheckerService(apiKey, provider);
    const check = tempService.getCheckById(id);

    if (!check) {
      return c.json(
        {
          error: `Check with ID ${id} not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      provider: 'unlimited',
      check,
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Clear check history
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function clearHistory(c) {
  try {
    emailCheckerService.clearHistory();

    return c.json({
      success: true,
      message: 'Check history cleared successfully',
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get statistics
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getStats(c) {
  try {
    const stats = emailCheckerService.getStats();

    return c.json({
      success: true,
      stats,
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get checks by email address
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getChecksByEmail(c) {
  try {
    const { email } = c.req.param();
    const checks = emailCheckerService.getChecksByEmail(email);

    return c.json({
      success: true,
      email,
      count: checks.length,
      checks,
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get recent checks
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getRecentChecks(c) {
  try {
    const hours = parseInt(c.req.query('hours'), 10) || 24;
    const checks = emailCheckerService.getRecentChecks(hours);

    return c.json({
      success: true,
      hours,
      count: checks.length,
      checks,
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Delete a specific check
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function deleteCheck(c) {
  try {
    const { id } = c.req.param();
    const deleted = emailCheckerService.deleteCheck(id);

    if (!deleted) {
      return c.json(
        {
          error: `Check with ID ${id} not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      message: 'Check deleted successfully',
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Update API key
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function updateApiKey(c) {
  try {
    const data = await c.req.json();

    if (!data.apiKey) {
      return c.json({ error: 'API key is required' }, 400);
    }

    const updated = emailCheckerService.updateApiKey(data.apiKey);

    if (!updated) {
      return c.json({ error: 'Invalid API key format' }, 400);
    }

    return c.json({
      success: true,
      message: 'API key updated successfully',
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get service status
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getServiceStatus(c) {
  try {
    const status = emailCheckerService.getServiceStatus();

    return c.json({
      success: true,
      status,
    });
  } catch (error) {
    return c.json(
      {
        error: error.message,
      },
      500
    );
  }
}
