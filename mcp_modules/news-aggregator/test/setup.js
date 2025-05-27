/**
 * Test Setup for News Aggregator Module
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Global test setup
global.fetch = require('node-fetch');

// Mock console methods for cleaner test output
const originalConsole = { ...console };

before(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
});

after(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});
