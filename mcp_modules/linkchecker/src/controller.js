/**
 * Linkchecker Module Controller
 *
 * This file contains HTTP route handlers for the linkchecker module.
 */

import { linkCheckerService } from './service.js';
import { validateUrl, validateOptions, formatResponse, formatErrorResponse } from './utils.js';

/**
 * Check links for a URL
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function checkLinks(c) {
  try {
    const body = await c.req.json();
    const { url, options = {} } = body;

    if (!url) {
      return c.json(formatErrorResponse('URL is required'), 400);
    }

    if (!validateUrl(url)) {
      return c.json(formatErrorResponse('Invalid URL provided'), 400);
    }

    if (!validateOptions(options)) {
      return c.json(formatErrorResponse('Invalid options provided'), 400);
    }

    const result = await linkCheckerService.checkLinks(url, options);
    return c.json(formatResponse(result));
  } catch (error) {
    return c.json(formatErrorResponse(error.message), 500);
  }
}

/**
 * Get all link check results
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function getAllResults(c) {
  try {
    const results = linkCheckerService.getAllResults();
    return c.json(formatResponse(results));
  } catch (error) {
    return c.json(formatErrorResponse(error.message), 500);
  }
}

/**
 * Get link check result by ID
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function getResultById(c) {
  try {
    const id = c.req.param('id');
    const result = linkCheckerService.getResultById(id);

    if (!result) {
      return c.json(formatErrorResponse('Result not found'), 404);
    }

    return c.json(formatResponse(result));
  } catch (error) {
    return c.json(formatErrorResponse(error.message), 500);
  }
}

/**
 * Delete a link check result
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function deleteResult(c) {
  try {
    const id = c.req.param('id');
    const deleted = linkCheckerService.deleteResult(id);

    if (!deleted) {
      return c.json(formatErrorResponse('Result not found'), 404);
    }

    return c.json(formatResponse({ deleted: true, id }));
  } catch (error) {
    return c.json(formatErrorResponse(error.message), 500);
  }
}

/**
 * Clear all link check results
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function clearAllResults(c) {
  try {
    linkCheckerService.clearAllResults();
    return c.json(formatResponse({ cleared: true }));
  } catch (error) {
    return c.json(formatErrorResponse(error.message), 500);
  }
}

/**
 * Quick link check endpoint (simplified)
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function quickCheck(c) {
  try {
    const url = c.req.query('url');

    if (!url) {
      return c.json(formatErrorResponse('URL query parameter is required'), 400);
    }

    if (!validateUrl(url)) {
      return c.json(formatErrorResponse('Invalid URL provided'), 400);
    }

    const result = await linkCheckerService.checkLinks(url, { recurse: false });
    return c.json(formatResponse(result));
  } catch (error) {
    return c.json(formatErrorResponse(error.message), 500);
  }
}
