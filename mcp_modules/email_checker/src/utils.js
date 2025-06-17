/**
 * Email Checker Module Utilities
 *
 * This file contains utility functions for email validation and API communication.
 */

/**
 * Email validation regex pattern
 * Matches most common email formats
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * API configuration
 */
const API_CONFIG = {
  baseUrl: 'https://www.un.limited.mx/api/emails/urls',
  timeout: 10000, // 10 seconds
};

/**
 * Validate email format using regex
 * @param {string} email - Email to validate
 * @returns {boolean} Whether the email format is valid
 */
export function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Sanitize email input
 * @param {any} email - Email input to sanitize
 * @returns {string} Sanitized email string
 */
export function sanitizeEmail(email) {
  if (email === null || email === undefined) {
    return '';
  }
  return String(email).trim().toLowerCase();
}

/**
 * Comprehensive email validation
 * @param {string} email - Email to validate
 * @returns {Object} Validation result object
 */
export function validateEmail(email) {
  const sanitized = sanitizeEmail(email);
  const errors = [];

  if (!sanitized) {
    errors.push('Email is required');
  } else if (!isValidEmailFormat(sanitized)) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    email: sanitized,
    errors,
  };
}

/**
 * Make API request to email validation service
 * @param {string} email - Email to check
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} API response
 * @throws {Error} If API request fails
 */
export async function makeApiRequest(email, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('API key is required');
  }

  const requestOptions = {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  };

  try {
    const response = await fetch(API_CONFIG.baseUrl, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('API request failed')) {
      throw error;
    }
    throw new Error(`Network error occurred: ${error.message}`);
  }
}

/**
 * Format response object consistently
 * @param {any} data - Data to include in response
 * @param {Error} [error] - Error object if response is an error
 * @returns {Object} Formatted response
 */
export function formatResponse(data, error = null) {
  const response = {
    success: !error,
    timestamp: new Date().toISOString(),
  };

  if (error) {
    response.error = error.message;
  } else {
    response.data = data;
  }

  return response;
}

/**
 * Generate unique ID for email checks
 * @returns {string} Unique identifier
 */
export function generateCheckId() {
  return `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} Whether API key format is valid
 */
export function isValidApiKey(apiKey) {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

/**
 * Create delay for rate limiting
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Batch process emails with rate limiting
 * @param {Array<string>} emails - Array of emails to process
 * @param {Function} processor - Function to process each email
 * @param {number} [batchSize=5] - Number of emails to process concurrently
 * @param {number} [delayMs=100] - Delay between batches in milliseconds
 * @returns {Promise<Array>} Array of processed results
 */
export async function batchProcessEmails(emails, processor, batchSize = 5, delayMs = 100) {
  const results = [];

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.allSettled(batchPromises);

    results.push(...batchResults);

    // Add delay between batches to respect rate limits
    if (i + batchSize < emails.length && delayMs > 0) {
      await delay(delayMs);
    }
  }

  return results;
}
