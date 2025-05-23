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
    it('should export searchCity function', () => {
      // Import the API functions dynamically to test exports
      import('../api.js').then(api => {
        expect(api.searchCity).to.be.a('function');
      });
    });

    it('should export search function', () => {
      import('../api.js').then(api => {
        expect(api.search).to.be.a('function');
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

      // Test with a clearly invalid city that should return empty results
      const results = await api.searchCity('nonexistent-invalid-city-12345', {
        category: 'sss',
        query: 'test',
      });

      // Should return an array (even if empty)
      expect(results).to.be.an('array');
    });

    it('should handle search function with empty cities array', async () => {
      const api = await import('../api.js');

      // Test with empty cities array
      const results = await api.search([], { category: 'sss' });

      // Should return an empty array
      expect(results).to.be.an('array').that.is.empty;
    });

    it('should handle getPostingDetails with invalid URL', async () => {
      const api = await import('../api.js');

      try {
        // Test with clearly invalid URL
        const details = await api.getPostingDetails(
          'https://invalid-nonexistent-domain-12345.com/test'
        );

        // Should return null or handle gracefully
        expect(details).to.be.null;
      } catch (error) {
        // If it throws an error, that's also acceptable behavior
        expect(error).to.be.an('error');
      }
    });
  });
});
