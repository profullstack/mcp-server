/**
 * Test Setup for Email Checker Module
 *
 * This file sets up the test environment and global configurations
 * for the email checker module test suite.
 */

// Setup global fetch for Node.js environment
// This is needed for the API request tests
if (!globalThis.fetch) {
  // Mock fetch for testing purposes
  globalThis.fetch = async (_url, _options) => {
    // This is a mock implementation for testing
    // In real tests, we'll stub this with sinon
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ valid: true, email: 'test@example.com' }),
      text: async () => 'OK',
    };
  };
}

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.EMAIL_CHECKER_API_KEY = 'test-api-key';

// Global test configuration
const testConfig = {
  timeout: 5000,
  retries: 2,
  apiKey: 'test-api-key',
  mockApiUrl: 'https://www.un.limited.mx/api/emails/urls',
};

// Export test utilities
export { testConfig };

// Setup global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
});

// Test helper functions
export const testHelpers = {
  /**
   * Create a mock email check result
   * @param {Object} overrides - Properties to override
   * @returns {Object} Mock check result
   */
  createMockCheckResult(overrides = {}) {
    return {
      id: 'test-check-id',
      email: 'test@example.com',
      isValid: true,
      checkedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a mock API response
   * @param {Object} overrides - Properties to override
   * @returns {Object} Mock API response
   */
  createMockApiResponse(overrides = {}) {
    return {
      valid: true,
      email: 'test@example.com',
      ...overrides,
    };
  },

  /**
   * Wait for a specified amount of time
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  async wait(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  },

  /**
   * Generate a random email for testing
   * @param {string} domain - Domain to use (default: example.com)
   * @returns {string} Random email address
   */
  generateRandomEmail(domain = 'example.com') {
    const randomString = Math.random().toString(36).substring(2, 8);
    return `test-${randomString}@${domain}`;
  },

  /**
   * Create multiple test emails
   * @param {number} count - Number of emails to create
   * @returns {Array<string>} Array of test emails
   */
  createTestEmails(count = 3) {
    return Array.from({ length: count }, (_, i) => `test${i + 1}@example.com`);
  },
};

console.log('✅ Email Checker test environment initialized');
