/**
 * WCAG Module Service
 *
 * This file contains the main business logic for WCAG compliance testing using Pa11y.
 */

import { spawn } from 'child_process';
import { validateUrl, formatWcagResponse, sanitizeInput } from './utils.js';

/**
 * WCAG Service class for accessibility testing
 */
export class WcagService {
  constructor() {
    this.supportedStandards = ['WCAG2A', 'WCAG2AA', 'WCAG2AAA'];
    this.supportedReporters = ['json', 'csv', 'html', 'cli'];
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Check WCAG compliance for a single URL
   * @param {string} url - URL to test
   * @param {Object} options - Testing options
   * @returns {Promise<Object>} WCAG compliance report
   */
  async checkUrl(url, options = {}) {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    const {
      standard = 'WCAG2AA',
      reporter = 'json',
      timeout = this.defaultTimeout,
      ignore = [],
      includeNotices = false,
      includeWarnings = true,
      viewport = { width: 1280, height: 1024 },
    } = options;

    // Validate options
    if (!this.supportedStandards.includes(standard)) {
      throw new Error(
        `Unsupported standard: ${standard}. Supported: ${this.supportedStandards.join(', ')}`
      );
    }

    if (!this.supportedReporters.includes(reporter)) {
      throw new Error(
        `Unsupported reporter: ${reporter}. Supported: ${this.supportedReporters.join(', ')}`
      );
    }

    try {
      const result = await this._runPa11y(url, {
        standard,
        reporter,
        timeout,
        ignore,
        includeNotices,
        includeWarnings,
        viewport,
      });

      return formatWcagResponse({
        url,
        standard,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`WCAG check failed: ${error.message}`);
    }
  }

  /**
   * Check WCAG compliance for multiple URLs
   * @param {Array<string>} urls - URLs to test
   * @param {Object} options - Testing options
   * @returns {Promise<Object>} Aggregated WCAG compliance report
   */
  async checkUrls(urls, options = {}) {
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new Error('URLs must be a non-empty array');
    }

    // Validate all URLs first
    for (const url of urls) {
      if (!validateUrl(url)) {
        throw new Error(`Invalid URL: ${url}`);
      }
    }

    const results = [];
    const errors = [];

    // Process URLs sequentially to avoid overwhelming the system
    for (const url of urls) {
      try {
        const result = await this.checkUrl(url, options);
        results.push(result);
      } catch (error) {
        errors.push({
          url,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return this._aggregateResults(results, errors, options);
  }

  /**
   * Get accessibility summary for multiple URLs
   * @param {Array<string>} urls - URLs to analyze
   * @param {Object} options - Testing options
   * @returns {Promise<Object>} Accessibility summary report
   */
  async getSummary(urls, options = {}) {
    const report = await this.checkUrls(urls, options);

    return {
      summary: {
        totalUrls: urls.length,
        successfulTests: report.results.length,
        failedTests: report.errors.length,
        totalIssues: report.results.reduce((sum, result) => sum + result.issues.length, 0),
        averageIssuesPerUrl:
          report.results.length > 0
            ? Math.round(
                report.results.reduce((sum, result) => sum + result.issues.length, 0) /
                  report.results.length
              )
            : 0,
      },
      issueBreakdown: this._getIssueBreakdown(report.results),
      mostCommonIssues: this._getMostCommonIssues(report.results),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run Pa11y CLI command
   * @private
   * @param {string} url - URL to test
   * @param {Object} options - Pa11y options
   * @returns {Promise<Object>} Pa11y result
   */
  async _runPa11y(url, options) {
    return new Promise((resolve, reject) => {
      const args = [
        '--standard',
        options.standard,
        '--reporter',
        options.reporter,
        '--timeout',
        options.timeout.toString(),
      ];

      // Add viewport settings
      if (options.viewport) {
        args.push('--viewport', `${options.viewport.width}x${options.viewport.height}`);
      }

      // Add ignore rules
      if (options.ignore && options.ignore.length > 0) {
        options.ignore.forEach(rule => {
          args.push('--ignore', rule);
        });
      }

      // Add notice and warning flags
      if (options.includeNotices) {
        args.push('--include-notices');
      }
      if (options.includeWarnings) {
        args.push('--include-warnings');
      }

      // Add the URL (sanitized)
      args.push(sanitizeInput(url));

      const pa11y = spawn('pa11y', args);
      let stdout = '';
      let stderr = '';

      pa11y.stdout.on('data', data => {
        stdout += data.toString();
      });

      pa11y.stderr.on('data', data => {
        stderr += data.toString();
      });

      pa11y.on('close', code => {
        if (code === 0) {
          try {
            // Parse JSON output if reporter is json
            const result = options.reporter === 'json' ? JSON.parse(stdout) : stdout;
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse Pa11y output: ${error.message}`));
          }
        } else {
          reject(new Error(`Pa11y exited with code ${code}: ${stderr}`));
        }
      });

      pa11y.on('error', error => {
        reject(new Error(`Failed to start Pa11y: ${error.message}`));
      });
    });
  }

  /**
   * Aggregate results from multiple URL tests
   * @private
   * @param {Array} results - Individual test results
   * @param {Array} errors - Test errors
   * @param {Object} options - Original options
   * @returns {Object} Aggregated report
   */
  _aggregateResults(results, errors, options) {
    return {
      summary: {
        totalUrls: results.length + errors.length,
        successfulTests: results.length,
        failedTests: errors.length,
        standard: options.standard || 'WCAG2AA',
        timestamp: new Date().toISOString(),
      },
      results,
      errors,
      aggregatedIssues: this._getIssueBreakdown(results),
    };
  }

  /**
   * Get breakdown of issues by type and severity
   * @private
   * @param {Array} results - Test results
   * @returns {Object} Issue breakdown
   */
  _getIssueBreakdown(results) {
    const breakdown = {
      error: 0,
      warning: 0,
      notice: 0,
      byType: {},
    };

    results.forEach(result => {
      if (result.issues) {
        result.issues.forEach(issue => {
          breakdown[issue.type] = (breakdown[issue.type] || 0) + 1;

          const ruleId = issue.code || 'unknown';
          breakdown.byType[ruleId] = (breakdown.byType[ruleId] || 0) + 1;
        });
      }
    });

    return breakdown;
  }

  /**
   * Get most common accessibility issues
   * @private
   * @param {Array} results - Test results
   * @returns {Array} Most common issues
   */
  _getMostCommonIssues(results) {
    const issueCount = {};

    results.forEach(result => {
      if (result.issues) {
        result.issues.forEach(issue => {
          const key = `${issue.code}: ${issue.message}`;
          issueCount[key] = (issueCount[key] || 0) + 1;
        });
      }
    });

    return Object.entries(issueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }));
  }
}

// Export a singleton instance
export const wcagService = new WcagService();
