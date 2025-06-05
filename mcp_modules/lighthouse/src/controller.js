/**
 * Lighthouse Module Controller
 *
 * This file contains the HTTP route handlers for the Lighthouse module.
 */

import { lighthouseService } from './service.js';
import { validateUrl, validateAuditOptions, formatResponse, generateTextSummary } from './utils.js';

/**
 * Get all Lighthouse reports
 * @param {Object} c - Hono context
 * @returns {Response} JSON response with all reports
 */
export async function getAllReports(c) {
  try {
    const reports = lighthouseService.getAllReports();
    return c.json(formatResponse(reports));
  } catch (error) {
    return c.json(formatResponse(error.message, 'error'), 500);
  }
}

/**
 * Get a specific Lighthouse report by ID
 * @param {Object} c - Hono context
 * @returns {Response} JSON response with the report
 */
export async function getReportById(c) {
  try {
    const id = c.req.param('id');
    const report = lighthouseService.getReport(id);

    if (!report) {
      return c.json(formatResponse('Report not found', 'error'), 404);
    }

    return c.json(formatResponse(report));
  } catch (error) {
    return c.json(formatResponse(error.message, 'error'), 500);
  }
}

/**
 * Run a new Lighthouse audit
 * @param {Object} c - Hono context
 * @returns {Response} JSON response with the audit result
 */
export async function runAudit(c) {
  try {
    const body = await c.req.json();
    const { url, options = {} } = body;

    if (!url) {
      return c.json(formatResponse('URL is required', 'error'), 400);
    }

    if (!validateUrl(url)) {
      return c.json(formatResponse('Invalid URL provided', 'error'), 400);
    }

    if (!validateAuditOptions(options)) {
      return c.json(formatResponse('Invalid audit options', 'error'), 400);
    }

    const report = await lighthouseService.runAudit(url, options);
    return c.json(formatResponse(report));
  } catch (error) {
    return c.json(formatResponse(error.message, 'error'), 500);
  }
}

/**
 * Run a batch audit on multiple URLs
 * @param {Object} c - Hono context
 * @returns {Response} JSON response with batch audit results
 */
export async function runBatchAudit(c) {
  try {
    const body = await c.req.json();
    const { urls, options = {} } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return c.json(formatResponse('URLs array is required and must not be empty', 'error'), 400);
    }

    // Validate all URLs
    for (const url of urls) {
      if (!validateUrl(url)) {
        return c.json(formatResponse(`Invalid URL: ${url}`, 'error'), 400);
      }
    }

    if (!validateAuditOptions(options)) {
      return c.json(formatResponse('Invalid audit options', 'error'), 400);
    }

    const results = await lighthouseService.runBatchAudit(urls, options);
    return c.json(formatResponse(results));
  } catch (error) {
    return c.json(formatResponse(error.message, 'error'), 500);
  }
}

/**
 * Delete a Lighthouse report
 * @param {Object} c - Hono context
 * @returns {Response} JSON response confirming deletion
 */
export async function deleteReport(c) {
  try {
    const id = c.req.param('id');
    const deleted = lighthouseService.deleteReport(id);

    if (!deleted) {
      return c.json(formatResponse('Report not found', 'error'), 404);
    }

    return c.json(formatResponse({ deleted: true, id }));
  } catch (error) {
    return c.json(formatResponse(error.message, 'error'), 500);
  }
}

/**
 * Get a summary of a Lighthouse report
 * @param {Object} c - Hono context
 * @returns {Response} JSON response with report summary
 */
export async function getReportSummary(c) {
  try {
    const id = c.req.param('id');
    const summary = lighthouseService.generateSummary(id);
    return c.json(formatResponse(summary));
  } catch (error) {
    return c.json(formatResponse(error.message, 'error'), 500);
  }
}

/**
 * Get a text summary of a Lighthouse report
 * @param {Object} c - Hono context
 * @returns {Response} Text response with report summary
 */
export async function getReportTextSummary(c) {
  try {
    const id = c.req.param('id');
    const report = lighthouseService.getReport(id);

    if (!report) {
      return c.json(formatResponse('Report not found', 'error'), 404);
    }

    const textSummary = generateTextSummary(report);
    return c.text(textSummary);
  } catch (error) {
    return c.json(formatResponse(error.message, 'error'), 500);
  }
}

/**
 * Clear all Lighthouse reports
 * @param {Object} c - Hono context
 * @returns {Response} JSON response confirming clearing
 */
export async function clearAllReports(c) {
  try {
    lighthouseService.clearReports();
    return c.json(formatResponse({ cleared: true }));
  } catch (error) {
    return c.json(formatResponse(error.message, 'error'), 500);
  }
}

/**
 * Get Lighthouse module health status
 * @param {Object} c - Hono context
 * @returns {Response} JSON response with health status
 */
export async function getHealthStatus(c) {
  try {
    const reportCount = lighthouseService.getAllReports().length;
    const status = {
      module: 'lighthouse',
      status: 'healthy',
      reportsStored: reportCount,
      timestamp: new Date().toISOString(),
    };
    return c.json(formatResponse(status));
  } catch (error) {
    return c.json(formatResponse(error.message, 'error'), 500);
  }
}
