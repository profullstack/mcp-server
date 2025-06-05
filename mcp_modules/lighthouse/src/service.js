/**
 * Lighthouse Module Service
 *
 * This file contains the main business logic for the Lighthouse module.
 */

import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { validateUrl, extractMetrics } from './utils.js';

/**
 * Lighthouse service class for performance audits
 */
export class LighthouseService {
  constructor() {
    this.reports = new Map();
    this.defaultConfig = {
      extends: 'lighthouse:default',
      settings: {
        onlyAudits: [
          'first-contentful-paint',
          'largest-contentful-paint',
          'first-meaningful-paint',
          'speed-index',
          'interactive',
          'cumulative-layout-shift',
          'total-blocking-time',
        ],
      },
    };
  }

  /**
   * Run a Lighthouse audit on a URL
   * @param {string} url - URL to audit
   * @param {Object} options - Audit options
   * @returns {Promise<Object>} Lighthouse report
   */
  async runAudit(url, options = {}) {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let chrome;
    try {
      // Launch Chrome
      chrome = await launch({
        chromeFlags: options.headless !== false ? ['--headless'] : [],
      });

      // Configure Lighthouse options
      const lighthouseOptions = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: options.categories || ['performance'],
        port: chrome.port,
        ...options.lighthouseOptions,
      };

      // Run Lighthouse audit
      const runnerResult = await lighthouse(url, lighthouseOptions, this.defaultConfig);

      if (!runnerResult || !runnerResult.lhr) {
        throw new Error('Failed to generate Lighthouse report');
      }

      const report = {
        id: auditId,
        url,
        timestamp: new Date().toISOString(),
        lhr: runnerResult.lhr,
        metrics: extractMetrics(runnerResult.lhr),
        scores: this.extractScores(runnerResult.lhr),
        opportunities: this.extractOpportunities(runnerResult.lhr),
        diagnostics: this.extractDiagnostics(runnerResult.lhr),
      };

      // Store the report
      this.reports.set(auditId, report);

      return report;
    } catch (error) {
      throw new Error(`Lighthouse audit failed: ${error.message}`);
    } finally {
      if (chrome) {
        await chrome.kill();
      }
    }
  }

  /**
   * Run a batch audit on multiple URLs
   * @param {Array<string>} urls - URLs to audit
   * @param {Object} options - Audit options
   * @returns {Promise<Array<Object>>} Array of Lighthouse reports
   */
  async runBatchAudit(urls, options = {}) {
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new Error('URLs must be a non-empty array');
    }

    const results = [];
    const errors = [];

    for (const url of urls) {
      try {
        const report = await this.runAudit(url, options);
        results.push(report);
      } catch (error) {
        errors.push({ url, error: error.message });
      }
    }

    return {
      results,
      errors,
      summary: {
        total: urls.length,
        successful: results.length,
        failed: errors.length,
      },
    };
  }

  /**
   * Get a stored report by ID
   * @param {string} id - Report ID
   * @returns {Object|null} Report or null if not found
   */
  getReport(id) {
    return this.reports.has(id) ? this.reports.get(id) : null;
  }

  /**
   * Get all stored reports
   * @returns {Array} Array of reports
   */
  getAllReports() {
    return Array.from(this.reports.values());
  }

  /**
   * Delete a report
   * @param {string} id - Report ID
   * @returns {boolean} Whether the report was deleted
   */
  deleteReport(id) {
    return this.reports.delete(id);
  }

  /**
   * Clear all reports
   */
  clearReports() {
    this.reports.clear();
  }

  /**
   * Extract scores from Lighthouse report
   * @param {Object} lhr - Lighthouse report
   * @returns {Object} Scores object
   */
  extractScores(lhr) {
    const scores = {};

    if (lhr.categories) {
      Object.keys(lhr.categories).forEach(category => {
        scores[category] = {
          score: lhr.categories[category].score,
          displayValue: Math.round(lhr.categories[category].score * 100),
        };
      });
    }

    return scores;
  }

  /**
   * Extract opportunities from Lighthouse report
   * @param {Object} lhr - Lighthouse report
   * @returns {Array} Array of opportunities
   */
  extractOpportunities(lhr) {
    const opportunities = [];

    if (lhr.audits) {
      Object.keys(lhr.audits).forEach(auditKey => {
        const audit = lhr.audits[auditKey];
        if (audit.details && audit.details.type === 'opportunity' && audit.numericValue > 0) {
          opportunities.push({
            id: auditKey,
            title: audit.title,
            description: audit.description,
            displayValue: audit.displayValue,
            numericValue: audit.numericValue,
            score: audit.score,
          });
        }
      });
    }

    return opportunities.sort((a, b) => b.numericValue - a.numericValue);
  }

  /**
   * Extract diagnostics from Lighthouse report
   * @param {Object} lhr - Lighthouse report
   * @returns {Array} Array of diagnostics
   */
  extractDiagnostics(lhr) {
    const diagnostics = [];

    if (lhr.audits) {
      Object.keys(lhr.audits).forEach(auditKey => {
        const audit = lhr.audits[auditKey];
        if (
          audit.details &&
          audit.details.type === 'diagnostic' &&
          audit.score !== null &&
          audit.score < 1
        ) {
          diagnostics.push({
            id: auditKey,
            title: audit.title,
            description: audit.description,
            displayValue: audit.displayValue,
            score: audit.score,
          });
        }
      });
    }

    return diagnostics;
  }

  /**
   * Generate a summary report
   * @param {string} id - Report ID
   * @returns {Object} Summary report
   */
  generateSummary(id) {
    const report = this.getReport(id);
    if (!report) {
      throw new Error(`Report with ID ${id} not found`);
    }

    return {
      id: report.id,
      url: report.url,
      timestamp: report.timestamp,
      scores: report.scores,
      metrics: report.metrics,
      opportunitiesCount: report.opportunities.length,
      diagnosticsCount: report.diagnostics.length,
      topOpportunities: report.opportunities.slice(0, 3),
    };
  }
}

// Export a singleton instance
export const lighthouseService = new LighthouseService();
