/**
 * Linkchecker Module Service
 *
 * This file contains the main business logic for the linkchecker module using linkinator.
 */

import { LinkChecker } from 'linkinator';
import { validateUrl, formatResponse } from './utils.js';

/**
 * Service class for the linkchecker module
 */
export class LinkCheckerService {
  constructor() {
    this.results = new Map();
  }

  /**
   * Check links for a given URL
   * @param {string} url - URL to check
   * @param {Object} options - Optional configuration
   * @returns {Promise<Object>} Link check results
   */
  async checkLinks(url, options = {}) {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    const checkId = this.generateCheckId(url);

    try {
      const checker = new LinkChecker();

      // Configure options
      const config = {
        path: url,
        recurse: options.recurse || false,
        timeout: options.timeout || 5000,
        concurrency: options.concurrency || 100,
        markdown: options.markdown || false,
        ...options,
      };

      // Run the link check
      const result = await checker.check(config);

      // Format the result
      const formattedResult = {
        id: checkId,
        url: url,
        timestamp: new Date().toISOString(),
        passed: result.passed,
        links: result.links.map(link => ({
          url: link.url,
          status: link.status,
          statusText: link.statusText,
          state: link.state,
          parent: link.parent,
        })),
        summary: {
          total: result.links.length,
          passed: result.links.filter(link => link.state === 'OK').length,
          failed: result.links.filter(link => link.state === 'BROKEN').length,
          skipped: result.links.filter(link => link.state === 'SKIPPED').length,
        },
      };

      // Store the result
      this.results.set(checkId, formattedResult);

      return formattedResult;
    } catch (error) {
      const errorResult = {
        id: checkId,
        url: url,
        timestamp: new Date().toISOString(),
        error: error.message,
        passed: false,
      };

      this.results.set(checkId, errorResult);
      throw new Error(`Link check failed: ${error.message}`);
    }
  }

  /**
   * Get all link check results
   * @returns {Array} Array of results
   */
  getAllResults() {
    return Array.from(this.results.values());
  }

  /**
   * Get result by ID
   * @param {string} id - Result ID
   * @returns {Object|null} Result or null if not found
   */
  getResultById(id) {
    return this.results.has(id) ? this.results.get(id) : null;
  }

  /**
   * Delete a result
   * @param {string} id - Result ID
   * @returns {boolean} Whether the result was deleted
   */
  deleteResult(id) {
    if (!this.results.has(id)) {
      return false;
    }
    return this.results.delete(id);
  }

  /**
   * Clear all results
   * @returns {boolean} Always true
   */
  clearAllResults() {
    this.results.clear();
    return true;
  }

  /**
   * Generate a unique check ID
   * @param {string} url - URL being checked
   * @returns {string} Unique ID
   */
  generateCheckId(url) {
    const timestamp = Date.now();
    const urlHash = Buffer.from(url).toString('base64').slice(0, 8);
    return `check_${urlHash}_${timestamp}`;
  }

  /**
   * Format the response for a result
   * @param {Object} result - Result to format
   * @returns {Object} Formatted response
   */
  formatResultResponse(result) {
    return formatResponse(result);
  }
}

// Export a singleton instance
export const linkCheckerService = new LinkCheckerService();
