/**
 * Utility Functions Tests
 * Tests for helper functions and utilities
 */

import { expect } from 'chai';
import {
  validateParameters,
  formatResponse,
  createErrorResponse,
  sanitizeContent,
  getPlatformDisplayName,
  isValidUrl,
} from '../src/utils.js';

describe('Utility Functions', () => {
  describe('validateParameters', () => {
    it('should validate required parameters', () => {
      const params = { content: { text: 'Hello' } };
      const required = ['content'];

      const result = validateParameters(params, required);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should detect missing required parameters', () => {
      const params = {};
      const required = ['content'];

      const result = validateParameters(params, required);

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Missing required parameter: content');
    });

    it('should validate parameter types', () => {
      const params = { content: 'invalid-type' };
      const required = ['content'];
      const types = { content: 'object' };

      const result = validateParameters(params, required, types);

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Parameter content must be of type object');
    });

    it('should validate array parameters', () => {
      const params = { platforms: ['x', 'linkedin'] };
      const required = [];
      const types = { platforms: 'array' };

      const result = validateParameters(params, required, types);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should handle optional parameters', () => {
      const params = { content: { text: 'Hello' } };
      const required = ['content'];
      const types = { content: 'object', platforms: 'array' };

      const result = validateParameters(params, required, types);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });
  });

  describe('formatResponse', () => {
    it('should format successful response', () => {
      const result = { success: true, data: 'test' };
      const toolName = 'test-tool';

      const response = formatResponse(result, toolName);

      expect(response).to.have.property('tool', toolName);
      expect(response).to.have.property('success', true);
      expect(response).to.have.property('result', result);
      expect(response).to.have.property('timestamp');
    });

    it('should format error response', () => {
      const result = { success: false, error: 'Test error' };
      const toolName = 'test-tool';

      const response = formatResponse(result, toolName);

      expect(response).to.have.property('tool', toolName);
      expect(response).to.have.property('success', false);
      expect(response).to.have.property('result', result);
      expect(response).to.have.property('timestamp');
    });

    it('should include timestamp in ISO format', () => {
      const result = { success: true };
      const toolName = 'test-tool';

      const response = formatResponse(result, toolName);

      expect(response.timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with message', () => {
      const message = 'Test error message';

      const response = createErrorResponse(message);

      expect(response).to.have.property('error', message);
    });

    it('should create error response with status code', () => {
      const message = 'Bad request';
      const statusCode = 400;

      const response = createErrorResponse(message, statusCode);

      expect(response).to.have.property('error', message);
      expect(response).to.have.property('statusCode', statusCode);
    });

    it('should default to 500 status code', () => {
      const message = 'Internal error';

      const response = createErrorResponse(message);

      expect(response).to.have.property('statusCode', 500);
    });
  });

  describe('sanitizeContent', () => {
    it('should sanitize text content', () => {
      const content = {
        text: '  Hello world!  ',
        type: 'text',
      };

      const sanitized = sanitizeContent(content);

      expect(sanitized.text).to.equal('Hello world!');
      expect(sanitized.type).to.equal('text');
    });

    it('should sanitize link content', () => {
      const content = {
        text: '  Check this out!  ',
        link: '  https://example.com  ',
        type: 'link',
      };

      const sanitized = sanitizeContent(content);

      expect(sanitized.text).to.equal('Check this out!');
      expect(sanitized.link).to.equal('https://example.com');
      expect(sanitized.type).to.equal('link');
    });

    it('should handle missing text', () => {
      const content = {
        link: 'https://example.com',
        type: 'link',
      };

      const sanitized = sanitizeContent(content);

      expect(sanitized).not.to.have.property('text');
      expect(sanitized.link).to.equal('https://example.com');
    });

    it('should preserve other properties', () => {
      const content = {
        text: 'Hello',
        customProperty: 'value',
      };

      const sanitized = sanitizeContent(content);

      expect(sanitized.text).to.equal('Hello');
      expect(sanitized.customProperty).to.equal('value');
    });
  });

  describe('getPlatformDisplayName', () => {
    it('should return display names for known platforms', () => {
      expect(getPlatformDisplayName('x')).to.equal('X (Twitter)');
      expect(getPlatformDisplayName('linkedin')).to.equal('LinkedIn');
      expect(getPlatformDisplayName('reddit')).to.equal('Reddit');
      expect(getPlatformDisplayName('facebook')).to.equal('Facebook');
      expect(getPlatformDisplayName('hacker-news')).to.equal('Hacker News');
      expect(getPlatformDisplayName('stacker-news')).to.equal('Stacker News');
      expect(getPlatformDisplayName('primal')).to.equal('Primal');
    });

    it('should return capitalized name for unknown platforms', () => {
      expect(getPlatformDisplayName('unknown')).to.equal('Unknown');
      expect(getPlatformDisplayName('custom-platform')).to.equal('Custom-platform');
    });

    it('should handle empty or null input', () => {
      expect(getPlatformDisplayName('')).to.equal('');
      expect(getPlatformDisplayName(null)).to.equal('');
      expect(getPlatformDisplayName(undefined)).to.equal('');
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).to.be.true;
      expect(isValidUrl('http://example.com')).to.be.true;
      expect(isValidUrl('https://subdomain.example.com/path')).to.be.true;
      expect(isValidUrl('https://example.com:8080/path?query=value')).to.be.true;
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).to.be.false;
      expect(isValidUrl('ftp://example.com')).to.be.false;
      expect(isValidUrl('example.com')).to.be.false;
      expect(isValidUrl('')).to.be.false;
      expect(isValidUrl(null)).to.be.false;
      expect(isValidUrl(undefined)).to.be.false;
    });

    it('should handle edge cases', () => {
      expect(isValidUrl('https://')).to.be.false;
      expect(isValidUrl('https://.')).to.be.false;
      expect(isValidUrl('https://localhost')).to.be.true;
      expect(isValidUrl('https://127.0.0.1')).to.be.true;
    });
  });

  describe('Parameter type validation helpers', () => {
    it('should validate string types', () => {
      const params = { name: 'test' };
      const types = { name: 'string' };

      const result = validateParameters(params, [], types);

      expect(result.valid).to.be.true;
    });

    it('should validate number types', () => {
      const params = { count: 42 };
      const types = { count: 'number' };

      const result = validateParameters(params, [], types);

      expect(result.valid).to.be.true;
    });

    it('should validate boolean types', () => {
      const params = { enabled: true };
      const types = { enabled: 'boolean' };

      const result = validateParameters(params, [], types);

      expect(result.valid).to.be.true;
    });

    it('should reject incorrect types', () => {
      const params = { name: 123 };
      const types = { name: 'string' };

      const result = validateParameters(params, [], types);

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Parameter name must be of type string');
    });
  });
});
