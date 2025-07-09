/**
 * Test Setup
 * Global test configuration and setup for Mocha tests
 */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

// Configure Chai
chai.use(sinonChai);

// Global test configuration
global.expect = chai.expect;
global.sinon = sinon;

// Set up global test hooks
beforeEach(() => {
  // Create a sandbox for each test
  global.sandbox = sinon.createSandbox();
});

afterEach(() => {
  // Clean up after each test
  if (global.sandbox) {
    global.sandbox.restore();
  }
});

// Global test utilities
global.createMockContext = () => {
  return {
    req: {
      json: sinon.stub(),
    },
    json: sinon.stub(),
    set: sinon.stub(),
  };
};

global.createMockService = () => {
  return {
    postContent: sinon.stub(),
    loginToPlatform: sinon.stub(),
    getPlatformStatus: sinon.stub(),
    getAvailablePlatforms: sinon.stub(),
    getSupportedPlatforms: sinon.stub(),
    createSampleContent: sinon.stub(),
    getPostingStats: sinon.stub(),
    validateContent: sinon.stub(),
    close: sinon.stub(),
  };
};

// Test timeout configuration
const originalTimeout = 5000;
if (process.env.NODE_ENV === 'test') {
  // Increase timeout for CI environments
  global.testTimeout = process.env.CI ? 10000 : originalTimeout;
} else {
  global.testTimeout = originalTimeout;
}

// Console override for cleaner test output
const originalConsole = console;
global.testConsole = {
  log: process.env.TEST_VERBOSE ? originalConsole.log : () => {},
  error: process.env.TEST_VERBOSE ? originalConsole.error : () => {},
  warn: process.env.TEST_VERBOSE ? originalConsole.warn : () => {},
  info: process.env.TEST_VERBOSE ? originalConsole.info : () => {},
};

// Override console during tests unless verbose mode is enabled
if (!process.env.TEST_VERBOSE) {
  console.log = global.testConsole.log;
  console.error = global.testConsole.error;
  console.warn = global.testConsole.warn;
  console.info = global.testConsole.info;
}

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.SOCIAL_POSTER_HEADLESS = 'true';
process.env.SOCIAL_POSTER_TIMEOUT = '5000';

console.log('Test environment initialized');
