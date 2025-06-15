/**
 * Test setup file for Domain Lookup Module
 *
 * This file is loaded before all tests run and sets up the testing environment.
 */

// Set up global test environment
process.env.NODE_ENV = 'test';

// Suppress console output during tests unless explicitly needed
const originalConsole = { ...console };

before(() => {
  // You can add global setup here if needed
});

after(() => {
  // You can add global cleanup here if needed
});

// Export utilities that might be useful across tests
export { originalConsole };
