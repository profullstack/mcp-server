/**
 * Mocha setup file for ES modules
 *
 * This file configures Mocha to work with ES modules and sets up global test utilities.
 */

// Set Node.js options for ES modules
process.env.NODE_OPTIONS = '--experimental-vm-modules --no-warnings';

// Import chai for assertions
import chai from 'chai';
global.expect = chai.expect;

// Import sinon for mocking and stubbing
import sinon from 'sinon';
global.sinon = sinon;

// Setup any global test utilities or mocks here
console.log('Mocha setup complete - running tests with ES module support');
