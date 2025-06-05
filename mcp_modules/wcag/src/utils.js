/**
 * WCAG Module Utilities
 *
 * This file contains utility functions for the WCAG module.
 */

/**
 * Validate if a string is a valid URL
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
 * Sanitize input to prevent command injection
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters
  return input.replace(/[;&|`$(){}[\]]/g, '');
}

/**
 * Validate WCAG test data
 * @param {Object} data - Data to validate
 * @returns {boolean} Whether the data is valid
 */
export function validateWcagData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check for required fields
  if (!data.urls && !data.url) {
    return false;
  }

  // Validate URLs
  if (data.url && !validateUrl(data.url)) {
    return false;
  }

  if (data.urls) {
    if (!Array.isArray(data.urls) || data.urls.length === 0) {
      return false;
    }

    for (const url of data.urls) {
      if (!validateUrl(url)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Format WCAG response for consistent output
 * @param {Object} data - Response data to format
 * @returns {Object} Formatted response
 */
export function formatWcagResponse(data) {
  const { url, standard, result, timestamp } = data;

  // Handle different Pa11y output formats
  let issues = [];
  let documentTitle = '';
  let pageUrl = url;

  if (Array.isArray(result)) {
    // Pa11y JSON format returns an array of issues
    issues = result.map(issue => ({
      type: issue.type || 'error',
      code: issue.code || 'unknown',
      message: issue.message || 'No message provided',
      context: issue.context || '',
      selector: issue.selector || '',
      runner: issue.runner || 'htmlcs',
      runnerExtras: issue.runnerExtras || {},
    }));
  } else if (typeof result === 'object' && result.issues) {
    // Alternative format
    issues = result.issues;
    documentTitle = result.documentTitle || '';
    pageUrl = result.pageUrl || url;
  }

  return {
    url: pageUrl,
    documentTitle,
    standard,
    timestamp,
    issueCount: issues.length,
    issues: issues,
    summary: {
      errors: issues.filter(issue => issue.type === 'error').length,
      warnings: issues.filter(issue => issue.type === 'warning').length,
      notices: issues.filter(issue => issue.type === 'notice').length,
    },
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

/**
 * Format error response
 * @param {Error} error - Error object
 * @param {string} context - Error context
 * @returns {Object} Formatted error response
 */
export function formatErrorResponse(error, context = 'WCAG Test') {
  return {
    error: true,
    context,
    message: error.message || 'Unknown error occurred',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate WCAG standard
 * @param {string} standard - WCAG standard to validate
 * @returns {boolean} Whether the standard is valid
 */
export function validateWcagStandard(standard) {
  const validStandards = ['WCAG2A', 'WCAG2AA', 'WCAG2AAA'];
  return validStandards.includes(standard);
}

/**
 * Validate reporter format
 * @param {string} reporter - Reporter format to validate
 * @returns {boolean} Whether the reporter is valid
 */
export function validateReporter(reporter) {
  const validReporters = ['json', 'csv', 'html', 'cli'];
  return validReporters.includes(reporter);
}

/**
 * Parse viewport string into width and height
 * @param {string} viewport - Viewport string (e.g., "1280x1024")
 * @returns {Object} Viewport object with width and height
 */
export function parseViewport(viewport) {
  if (!viewport || typeof viewport !== 'string') {
    return { width: 1280, height: 1024 };
  }

  const parts = viewport.split('x');
  if (parts.length !== 2) {
    return { width: 1280, height: 1024 };
  }

  const width = parseInt(parts[0], 10);
  const height = parseInt(parts[1], 10);

  if (isNaN(width) || isNaN(height) || width < 320 || height < 240) {
    return { width: 1280, height: 1024 };
  }

  return { width, height };
}

/**
 * Generate a unique test ID
 * @returns {string} Unique test ID
 */
export function generateTestId() {
  return `wcag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert Pa11y issues to CSV format
 * @param {Array} issues - Array of Pa11y issues
 * @returns {string} CSV formatted string
 */
export function issuesToCsv(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return 'Type,Code,Message,Context,Selector\n';
  }

  const headers = 'Type,Code,Message,Context,Selector\n';
  const rows = issues
    .map(issue => {
      const type = (issue.type || '').replace(/"/g, '""');
      const code = (issue.code || '').replace(/"/g, '""');
      const message = (issue.message || '').replace(/"/g, '""');
      const context = (issue.context || '').replace(/"/g, '""');
      const selector = (issue.selector || '').replace(/"/g, '""');

      return `"${type}","${code}","${message}","${context}","${selector}"`;
    })
    .join('\n');

  return headers + rows;
}

/**
 * Filter issues by type
 * @param {Array} issues - Array of issues
 * @param {string} type - Issue type to filter by
 * @returns {Array} Filtered issues
 */
export function filterIssuesByType(issues, type) {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.filter(issue => issue.type === type);
}

/**
 * Group issues by code
 * @param {Array} issues - Array of issues
 * @returns {Object} Issues grouped by code
 */
export function groupIssuesByCode(issues) {
  if (!Array.isArray(issues)) {
    return {};
  }

  return issues.reduce((groups, issue) => {
    const code = issue.code || 'unknown';
    if (!groups[code]) {
      groups[code] = [];
    }
    groups[code].push(issue);
    return groups;
  }, {});
}
