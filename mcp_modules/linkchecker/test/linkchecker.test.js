/**
 * Linkchecker Module Tests
 *
 * This file contains tests for the linkchecker module functionality.
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { LinkCheckerService } from '../src/service.js';
import { validateUrl, validateOptions, formatResponse, formatErrorResponse } from '../src/utils.js';

describe('LinkChecker Module', () => {
  let service;

  beforeEach(() => {
    service = new LinkCheckerService();
  });

  describe('LinkCheckerService', () => {
    it('should create a new service instance', () => {
      expect(service).to.be.an.instanceOf(LinkCheckerService);
      expect(service.results).to.be.a('map');
    });

    it('should generate unique check IDs', async () => {
      const url = 'https://example.com';
      const id1 = service.generateCheckId(url);

      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      const id2 = service.generateCheckId(url);

      expect(id1).to.be.a('string');
      expect(id2).to.be.a('string');
      expect(id1).to.not.equal(id2);
      expect(id1).to.include('check_');
    });

    it('should store and retrieve results', () => {
      const testResult = {
        id: 'test-id',
        url: 'https://example.com',
        passed: true,
        links: [],
      };

      service.results.set('test-id', testResult);

      const retrieved = service.getResultById('test-id');
      expect(retrieved).to.deep.equal(testResult);
    });

    it('should return null for non-existent results', () => {
      const result = service.getResultById('non-existent');
      expect(result).to.be.null;
    });

    it('should delete results', () => {
      const testResult = { id: 'test-id', url: 'https://example.com' };
      service.results.set('test-id', testResult);

      const deleted = service.deleteResult('test-id');
      expect(deleted).to.be.true;

      const retrieved = service.getResultById('test-id');
      expect(retrieved).to.be.null;
    });

    it('should return false when deleting non-existent results', () => {
      const deleted = service.deleteResult('non-existent');
      expect(deleted).to.be.false;
    });

    it('should clear all results', () => {
      service.results.set('test-1', { id: 'test-1' });
      service.results.set('test-2', { id: 'test-2' });

      expect(service.getAllResults()).to.have.lengthOf(2);

      service.clearAllResults();
      expect(service.getAllResults()).to.have.lengthOf(0);
    });

    it('should get all results as array', () => {
      const result1 = { id: 'test-1', url: 'https://example1.com' };
      const result2 = { id: 'test-2', url: 'https://example2.com' };

      service.results.set('test-1', result1);
      service.results.set('test-2', result2);

      const allResults = service.getAllResults();
      expect(allResults).to.be.an('array');
      expect(allResults).to.have.lengthOf(2);
      expect(allResults).to.include(result1);
      expect(allResults).to.include(result2);
    });
  });

  describe('URL Validation', () => {
    it('should validate correct HTTP URLs', () => {
      expect(validateUrl('http://example.com')).to.be.true;
      expect(validateUrl('https://example.com')).to.be.true;
      expect(validateUrl('https://www.example.com/path?query=1')).to.be.true;
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('')).to.be.false;
      expect(validateUrl(null)).to.be.false;
      expect(validateUrl(undefined)).to.be.false;
      expect(validateUrl('not-a-url')).to.be.false;
      expect(validateUrl('ftp://example.com')).to.be.false;
      expect(validateUrl('file:///path/to/file')).to.be.false;
    });

    it('should reject non-string inputs', () => {
      expect(validateUrl(123)).to.be.false;
      expect(validateUrl({})).to.be.false;
      expect(validateUrl([])).to.be.false;
    });
  });

  describe('Options Validation', () => {
    it('should accept valid options', () => {
      expect(validateOptions({})).to.be.true;
      expect(validateOptions({ recurse: true })).to.be.true;
      expect(validateOptions({ timeout: 5000 })).to.be.true;
      expect(validateOptions({ concurrency: 50 })).to.be.true;
      expect(validateOptions({ markdown: false })).to.be.true;
    });

    it('should accept undefined options', () => {
      expect(validateOptions()).to.be.true;
      expect(validateOptions(null)).to.be.true;
    });

    it('should reject invalid timeout values', () => {
      expect(validateOptions({ timeout: -1 })).to.be.false;
      expect(validateOptions({ timeout: 'invalid' })).to.be.false;
    });

    it('should reject invalid concurrency values', () => {
      expect(validateOptions({ concurrency: 0 })).to.be.false;
      expect(validateOptions({ concurrency: 'invalid' })).to.be.false;
    });

    it('should reject invalid boolean options', () => {
      expect(validateOptions({ recurse: 'true' })).to.be.false;
      expect(validateOptions({ markdown: 1 })).to.be.false;
    });
  });

  describe('Response Formatting', () => {
    it('should format success responses correctly', () => {
      const data = { test: 'data' };
      const response = formatResponse(data);

      expect(response).to.have.property('success', true);
      expect(response).to.have.property('data', data);
      expect(response).to.have.property('timestamp');
      expect(response.timestamp).to.be.a('string');
    });

    it('should format error responses correctly', () => {
      const message = 'Test error';
      const code = 400;
      const response = formatErrorResponse(message, code);

      expect(response).to.have.property('success', false);
      expect(response).to.have.property('error');
      expect(response.error).to.have.property('message', message);
      expect(response.error).to.have.property('code', code);
      expect(response.error).to.have.property('timestamp');
    });

    it('should use default error code when not provided', () => {
      const response = formatErrorResponse('Test error');
      expect(response.error.code).to.equal(500);
    });
  });

  describe('Link Checking Integration', () => {
    // Note: These tests would require actual network calls or mocking
    // For now, we'll test the error handling for invalid inputs

    it('should reject invalid URLs in checkLinks', async () => {
      try {
        await service.checkLinks('invalid-url');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid URL');
      }
    });

    it('should reject empty URLs in checkLinks', async () => {
      try {
        await service.checkLinks('');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid URL');
      }
    });
  });
});
