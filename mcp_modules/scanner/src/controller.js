/**
 * Scanner Module Controller
 *
 * This file contains the route handlers for the scanner module.
 */

import { scannerService } from './service.js';

/**
 * Get scan history
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getScanHistory(c) {
  try {
    const limit = parseInt(c.req.query('limit') || '10', 10);
    const scans = scannerService.getScanHistory(limit);

    return c.json({
      success: true,
      count: scans.length,
      scans,
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
 * Get scan by ID
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getScanById(c) {
  try {
    const { id } = c.req.param();
    const scan = scannerService.getScanById(id);

    if (!scan) {
      return c.json(
        {
          success: false,
          error: `Scan with ID ${id} not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      scan,
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
 * Get scan statistics
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getScanStats(c) {
  try {
    const stats = scannerService.getScanStats();

    return c.json({
      success: true,
      stats,
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
 * Perform a security scan
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function scanTarget(c) {
  try {
    const data = await c.req.json();

    if (!data.target) {
      return c.json(
        {
          success: false,
          error: 'Missing required parameter: target',
        },
        400
      );
    }

    const scanOptions = {
      tools: data.tools || ['nikto', 'wapiti', 'nuclei'],
      verbose: data.verbose || false,
      timeout: data.timeout || 300,
      toolOptions: data.toolOptions || {},
      auth: data.auth || null,
      headers: data.headers || {},
      projectId: data.projectId || null,
      scanProfile: data.scanProfile || null,
    };

    const scanResult = await scannerService.scanTarget(data.target, scanOptions);

    return c.json({
      success: true,
      message: 'Scan completed successfully',
      scanId: scanResult.id,
      summary: scanResult.summary,
      scan: scanResult,
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
 * Generate a report for a scan
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON or HTML response
 */
export async function generateReport(c) {
  try {
    const { id } = c.req.param();
    const format = c.req.query('format') || 'json';

    const report = await scannerService.generateReport(id, { format });

    if (format === 'html') {
      return c.html(report);
    }

    return c.json(report);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      error.message.includes('not found') ? 404 : 500
    );
  }
}

/**
 * Export a report for a scan
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response with download URL
 */
export async function exportReport(c) {
  try {
    const { id } = c.req.param();
    const format = c.req.query('format') || 'json';
    const destination = c.req.query('destination');

    const result = await scannerService.exportReport(id, { format, destination });

    return c.json({
      success: true,
      message: 'Report exported successfully',
      result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      error.message.includes('not found') ? 404 : 500
    );
  }
}
