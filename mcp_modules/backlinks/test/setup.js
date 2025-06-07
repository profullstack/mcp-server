/**
 * Test Setup for Backlinks Module
 */

import { expect } from 'chai';
import sinon from 'sinon';

// Global test setup
before(() => {
  // Any global setup needed for tests
});

after(() => {
  // Any global cleanup needed after tests
});

beforeEach(() => {
  // Setup before each test
});

afterEach(() => {
  // Cleanup after each test
  sinon.restore();
});

// Make chai and sinon available globally if needed
global.expect = expect;
global.sinon = sinon;
