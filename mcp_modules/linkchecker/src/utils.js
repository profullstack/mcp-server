/**
 * Linkchecker Module Utilities
 *
 * This file contains utility functions for the linkchecker module.
 */

/**
 * Validate a URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Format response data
 * @param {Object} data - Data to format
 * @returns {Object} Formatted response
 */
export function formatResponse(data) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format error response
 * @param {string} message - Error message
 * @param {number} code - Error code
 * @returns {Object} Formatted error response
 */
export function formatErrorResponse(message, code = 500) {
  return {
    success: false,
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Validate link check options
 * @param {Object} options - Options to validate
 * @returns {boolean} Whether the options are valid
 */
export function validateOptions(options) {
  if (!options || typeof options !== 'object') {
    return true; // Options are optional
  }

  // Validate timeout
  if (options.timeout !== undefined) {
    if (typeof options.timeout !== 'number' || options.timeout < 0) {
      return false;
    }
  }

  // Validate concurrency
  if (options.concurrency !== undefined) {
    if (typeof options.concurrency !== 'number' || options.concurrency < 1) {
      return false;
    }
  }

  // Validate recurse
  if (options.recurse !== undefined) {
    if (typeof options.recurse !== 'boolean') {
      return false;
    }
  }

  // Validate markdown
  if (options.markdown !== undefined) {
    if (typeof options.markdown !== 'boolean') {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize URL for safe processing
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove any potential XSS or injection attempts
  return url.trim().replace(/[<>'"]/g, '');
}

/**
 * Generate a summary of link check results
 * @param {Array} links - Array of link results
 * @returns {Object} Summary object
 */
export function generateSummary(links) {
  if (!Array.isArray(links)) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  return {
    total: links.length,
    passed: links.filter(link => link.state === 'OK').length,
    failed: links.filter(link => link.state === 'BROKEN').length,
    skipped: links.filter(link => link.state === 'SKIPPED').length,
  };
}

/**
 * Create a delayed response (for testing purposes)
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export function delayedResponse(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
