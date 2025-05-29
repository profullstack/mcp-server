/**
 * Craigslist Module API Tests
 *
 * This file contains tests for the Craigslist module API functions.
 */

import { expect } from 'chai';
import sinon from 'sinon';

/* global describe, beforeEach, afterEach, it */

describe('Craigslist API', () => {
  // Sinon sandbox for managing stubs
  let sandbox;

  beforeEach(() => {
    // Create a new sandbox before each test
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    // Restore all stubs after each test
    sandbox.restore();
  });

  describe('API Functions', () => {
    it('should export searchCraigslist function', () => {
      // Import the API functions dynamically to test exports
      import('../api.js').then(api => {
        expect(api.searchCraigslist).to.be.a('function');
      });
    });

    it('should export searchCraigslist function', () => {
      import('../api.js').then(api => {
        expect(api.searchCraigslist).to.be.a('function');
      });
    });

    it('should export getPostingDetails function', () => {
      import('../api.js').then(api => {
        expect(api.getPostingDetails).to.be.a('function');
      });
    });

    it('should handle invalid city gracefully', async () => {
      // Import the API functions
      const api = await import('../api.js');

      try {
        // Test with a clearly invalid city that should throw an error
        await api.searchCraigslist({
          city: 'nonexistent-invalid-city-12345',
          category: 'sss',
          query: 'test',
        });

        // If we get here, the function didn't throw (unexpected)
        expect.fail('Expected function to throw an error for invalid city');
      } catch (error) {
        // Should throw an error for invalid city
        expect(error).to.be.an('error');
        expect(error.message).to.include('ERR_NAME_NOT_RESOLVED');
      }
    });

    it('should handle search function with empty cities array', async function () {
      // Increase timeout for this test since it makes a real request
      this.timeout(10000);

      const api = await import('../api.js');

      // Test with empty cities array - this should return empty results quickly
      const results = await api.searchCraigslist({
        cities: [],
        category: 'sss',
      });

      // Should return an empty array
      expect(results).to.be.an('array').that.is.empty;
    });

    it('should handle getPostingDetails with invalid URL', async () => {
      const api = await import('../api.js');

      try {
        // Test with clearly invalid URL
        await api.getPostingDetails('https://invalid-nonexistent-domain-12345.com/test');

        // If we get here, the function didn't throw (unexpected)
        expect.fail('Expected function to throw an error for invalid URL');
      } catch (error) {
        // Should throw an error for invalid URL
        expect(error).to.be.an('error');
        expect(error.message).to.include('ERR_NAME_NOT_RESOLVED');
      }
    });
  });
});
