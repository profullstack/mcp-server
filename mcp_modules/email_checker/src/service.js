/**
 * Email Checker Module Service
 *
 * This file contains the main business logic for the email checker module.
 */

import { validateEmail, makeApiRequest, generateCheckId, batchProcessEmails } from './utils.js';

/**
 * Email Checker Service class
 * Handles email validation using external API and maintains check history
 */
export class EmailCheckerService {
  constructor(apiKey = null, provider = 'unlimited') {
    this.checks = new Map();
    this.apiKey = apiKey || process.env.EMAIL_CHECKER_API_KEY || '';
    this.provider = provider;

    // Validate provider
    const supportedProviders = ['unlimited'];
    if (!supportedProviders.includes(provider)) {
      throw new Error(
        `Unsupported provider: ${provider}. Supported providers: ${supportedProviders.join(', ')}`
      );
    }
  }

  /**
   * Check a single email address
   * @param {string} email - Email address to check
   * @returns {Promise<Object>} Check result object
   * @throws {Error} If email is invalid or API request fails
   */
  async checkEmail(email) {
    // Validate email format first
    const validation = validateEmail(email);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }

    try {
      // Make API request to check email
      const apiResponse = await makeApiRequest(validation.email, this.apiKey);

      // Create check result object
      const checkResult = {
        id: generateCheckId(),
        email: validation.email,
        isValid: apiResponse.valid ?? true,
        apiResponse,
        checkedAt: new Date().toISOString(),
      };

      // Store in history
      this.checks.set(checkResult.id, checkResult);

      return checkResult;
    } catch (error) {
      // Create failed check result for history
      const failedResult = {
        id: generateCheckId(),
        email: validation.email,
        isValid: false,
        error: error.message,
        checkedAt: new Date().toISOString(),
      };

      this.checks.set(failedResult.id, failedResult);
      throw error;
    }
  }

  /**
   * Check multiple email addresses
   * @param {Array<string>} emails - Array of email addresses to check
   * @returns {Promise<Array<Object>>} Array of check results
   */
  async checkMultipleEmails(emails) {
    if (!Array.isArray(emails) || emails.length === 0) {
      return [];
    }

    const processor = async email => {
      try {
        return await this.checkEmail(email);
      } catch (error) {
        return {
          id: generateCheckId(),
          email,
          isValid: false,
          error: error.message,
          checkedAt: new Date().toISOString(),
        };
      }
    };

    // Use batch processing to respect rate limits
    const results = await batchProcessEmails(emails, processor, 3, 200);

    // Extract values from Promise.allSettled results
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: generateCheckId(),
          email: 'unknown',
          isValid: false,
          error: result.reason?.message || 'Unknown error',
          checkedAt: new Date().toISOString(),
        };
      }
    });
  }

  /**
   * Get all check history
   * @returns {Array<Object>} Array of all check results
   */
  getCheckHistory() {
    return Array.from(this.checks.values()).sort(
      (a, b) => new Date(b.checkedAt) - new Date(a.checkedAt)
    );
  }

  /**
   * Get check result by ID
   * @param {string} id - Check ID
   * @returns {Object|null} Check result or null if not found
   */
  getCheckById(id) {
    return this.checks.has(id) ? this.checks.get(id) : null;
  }

  /**
   * Clear all check history
   * @returns {boolean} Whether the operation was successful
   */
  clearHistory() {
    this.checks.clear();
    return true;
  }

  /**
   * Get statistics about email checks
   * @returns {Object} Statistics object
   */
  getStats() {
    const allChecks = Array.from(this.checks.values());
    const totalChecks = allChecks.length;

    if (totalChecks === 0) {
      return {
        totalChecks: 0,
        validEmails: 0,
        invalidEmails: 0,
        successRate: 0,
      };
    }

    const validEmails = allChecks.filter(check => check.isValid === true).length;
    const invalidEmails = totalChecks - validEmails;
    const successRate = Math.round((validEmails / totalChecks) * 100);

    return {
      totalChecks,
      validEmails,
      invalidEmails,
      successRate,
    };
  }

  /**
   * Get checks by email address
   * @param {string} email - Email address to search for
   * @returns {Array<Object>} Array of check results for the email
   */
  getChecksByEmail(email) {
    const sanitizedEmail = email?.toLowerCase().trim();
    if (!sanitizedEmail) return [];

    return Array.from(this.checks.values())
      .filter(check => check.email === sanitizedEmail)
      .sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt));
  }

  /**
   * Get recent checks within specified time period
   * @param {number} hours - Number of hours to look back (default: 24)
   * @returns {Array<Object>} Array of recent check results
   */
  getRecentChecks(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    return Array.from(this.checks.values())
      .filter(check => new Date(check.checkedAt) > cutoffTime)
      .sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt));
  }

  /**
   * Delete a specific check by ID
   * @param {string} id - Check ID to delete
   * @returns {boolean} Whether the check was deleted
   */
  deleteCheck(id) {
    return this.checks.delete(id);
  }

  /**
   * Update API key
   * @param {string} newApiKey - New API key
   * @returns {boolean} Whether the update was successful
   */
  updateApiKey(newApiKey) {
    if (typeof newApiKey !== 'string' || newApiKey.trim() === '') {
      return false;
    }
    this.apiKey = newApiKey.trim();
    return true;
  }

  /**
   * Check if service is properly configured
   * @returns {Object} Configuration status
   */
  getServiceStatus() {
    return {
      configured: !!this.apiKey,
      hasApiKey: !!this.apiKey,
      provider: this.provider,
      totalChecks: this.checks.size,
      lastCheck:
        this.checks.size > 0
          ? Math.max(...Array.from(this.checks.values()).map(c => new Date(c.checkedAt)))
          : null,
    };
  }
}

// Export a singleton instance
export const emailCheckerService = new EmailCheckerService();
