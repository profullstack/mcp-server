/**
 * WCAG Module Controller
 *
 * This file contains the HTTP request handlers for the WCAG module.
 */

import { wcagService } from './service.js';
import { validateWcagData, formatErrorResponse, parseViewport } from './utils.js';

/**
 * Get all WCAG test results (placeholder for future implementation)
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function getAllTests(c) {
  try {
    // This could be extended to store and retrieve test history
    return c.json({
      message: 'WCAG test history not implemented yet',
      suggestion: 'Use POST /wcag/check to run new tests',
    });
  } catch (error) {
    return c.json(formatErrorResponse(error, 'Get All Tests'), 500);
  }
}

/**
 * Get WCAG test result by ID (placeholder for future implementation)
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function getTestById(c) {
  try {
    const id = c.req.param('id');
    return c.json({
      message: `WCAG test result retrieval not implemented yet for ID: ${id}`,
      suggestion: 'Use POST /wcag/check to run new tests',
    });
  } catch (error) {
    return c.json(formatErrorResponse(error, 'Get Test By ID'), 500);
  }
}

/**
 * Run WCAG compliance check
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function runWcagCheck(c) {
  try {
    const data = await c.req.json();

    if (!validateWcagData(data)) {
      return c.json(
        {
          error: 'Invalid request data',
          message: 'Request must include either "url" or "urls" field with valid URLs',
        },
        400
      );
    }

    const {
      url,
      urls,
      level = 'WCAG2AA',
      reporter = 'json',
      timeout = 30000,
      ignore = [],
      includeNotices = false,
      includeWarnings = true,
      viewport = '1280x1024',
    } = data;

    // Parse viewport
    const viewportObj = parseViewport(viewport);

    const options = {
      standard: level,
      reporter,
      timeout,
      ignore,
      includeNotices,
      includeWarnings,
      viewport: viewportObj,
    };

    let result;

    if (url) {
      // Single URL test
      result = await wcagService.checkUrl(url, options);
    } else if (urls) {
      // Multiple URLs test
      result = await wcagService.checkUrls(urls, options);
    }

    return c.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(formatErrorResponse(error, 'WCAG Check'), 500);
  }
}

/**
 * Get WCAG compliance summary for multiple URLs
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function getWcagSummary(c) {
  try {
    const data = await c.req.json();

    if (!data.urls || !Array.isArray(data.urls) || data.urls.length === 0) {
      return c.json(
        {
          error: 'Invalid request data',
          message: 'Request must include "urls" field with an array of valid URLs',
        },
        400
      );
    }

    const {
      urls,
      level = 'WCAG2AA',
      timeout = 30000,
      ignore = [],
      includeNotices = false,
      includeWarnings = true,
      viewport = '1280x1024',
    } = data;

    // Parse viewport
    const viewportObj = parseViewport(viewport);

    const options = {
      standard: level,
      reporter: 'json',
      timeout,
      ignore,
      includeNotices,
      includeWarnings,
      viewport: viewportObj,
    };

    const summary = await wcagService.getSummary(urls, options);

    return c.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(formatErrorResponse(error, 'WCAG Summary'), 500);
  }
}

/**
 * Update WCAG test configuration (placeholder for future implementation)
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function updateTest(c) {
  try {
    const id = c.req.param('id');
    return c.json({
      message: `WCAG test update not implemented yet for ID: ${id}`,
      suggestion: 'Use POST /wcag/check to run new tests with updated parameters',
    });
  } catch (error) {
    return c.json(formatErrorResponse(error, 'Update Test'), 500);
  }
}

/**
 * Delete WCAG test result (placeholder for future implementation)
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function deleteTest(c) {
  try {
    const id = c.req.param('id');
    return c.json({
      message: `WCAG test deletion not implemented yet for ID: ${id}`,
      suggestion: 'Test results are not persisted yet',
    });
  } catch (error) {
    return c.json(formatErrorResponse(error, 'Delete Test'), 500);
  }
}

/**
 * Process WCAG test with custom rules (advanced feature)
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function processCustomTest(c) {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();

    // This could be extended to support custom Pa11y configurations
    return c.json({
      message: `Custom WCAG test processing not implemented yet for ID: ${id}`,
      suggestion: 'Use POST /wcag/check with ignore rules for custom testing',
      receivedData: data,
    });
  } catch (error) {
    return c.json(formatErrorResponse(error, 'Process Custom Test'), 500);
  }
}

/**
 * Get WCAG module health status
 * @param {Object} c - Hono context
 * @returns {Response} JSON response
 */
export async function getHealthStatus(c) {
  try {
    // Check if Pa11y is available
    const { spawn } = await import('child_process');

    return new Promise(resolve => {
      const pa11y = spawn('pa11y', ['--version']);
      let version = '';

      pa11y.stdout.on('data', data => {
        version += data.toString();
      });

      pa11y.on('close', code => {
        if (code === 0) {
          resolve(
            c.json({
              status: 'healthy',
              pa11yVersion: version.trim(),
              timestamp: new Date().toISOString(),
            })
          );
        } else {
          resolve(
            c.json(
              {
                status: 'unhealthy',
                error: 'Pa11y not available',
                suggestion: 'Run ./bin/install.sh to install Pa11y',
                timestamp: new Date().toISOString(),
              },
              503
            )
          );
        }
      });

      pa11y.on('error', () => {
        resolve(
          c.json(
            {
              status: 'unhealthy',
              error: 'Pa11y not found',
              suggestion: 'Run ./bin/install.sh to install Pa11y',
              timestamp: new Date().toISOString(),
            },
            503
          )
        );
      });
    });
  } catch (error) {
    return c.json(formatErrorResponse(error, 'Health Check'), 500);
  }
}
