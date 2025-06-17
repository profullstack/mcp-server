/**
 * Email Checker Utils Tests
 *
 * Test suite for email checker utility functions
 */

import { expect } from 'chai';
import sinon from 'sinon';
import {
  validateEmail,
  isValidEmailFormat,
  makeApiRequest,
  formatResponse,
  sanitizeEmail,
} from '../src/utils.js';

describe('Email Checker Utils', () => {
  describe('isValidEmailFormat', () => {
    it('should return true for valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
        'a@b.co',
      ];

      validEmails.forEach(email => {
        expect(isValidEmailFormat(email)).to.be.true;
      });
    });

    it('should return false for invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@@domain.com',
        'user@domain',
        '',
        null,
        undefined,
        123,
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmailFormat(email)).to.be.false;
      });
    });
  });

  describe('sanitizeEmail', () => {
    it('should trim whitespace and convert to lowercase', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).to.equal('test@example.com');
      expect(sanitizeEmail('User@Domain.Org')).to.equal('user@domain.org');
    });

    it('should handle null and undefined inputs', () => {
      expect(sanitizeEmail(null)).to.equal('');
      expect(sanitizeEmail(undefined)).to.equal('');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeEmail(123)).to.equal('123');
      expect(sanitizeEmail({})).to.equal('[object object]');
    });
  });

  describe('validateEmail', () => {
    it('should return validation object for valid email', () => {
      const result = validateEmail('test@example.com');
      expect(result).to.deep.equal({
        isValid: true,
        email: 'test@example.com',
        errors: [],
      });
    });

    it('should return validation object for invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result).to.deep.equal({
        isValid: false,
        email: 'invalid-email',
        errors: ['Invalid email format'],
      });
    });

    it('should handle empty email', () => {
      const result = validateEmail('');
      expect(result).to.deep.equal({
        isValid: false,
        email: '',
        errors: ['Email is required'],
      });
    });

    it('should handle null/undefined email', () => {
      const result = validateEmail(null);
      expect(result).to.deep.equal({
        isValid: false,
        email: '',
        errors: ['Email is required'],
      });
    });
  });

  describe('makeApiRequest', () => {
    let fetchStub;

    beforeEach(() => {
      fetchStub = sinon.stub(global, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should make successful API request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: sinon.stub().resolves({ valid: true, email: 'test@example.com' }),
      };
      fetchStub.resolves(mockResponse);

      const result = await makeApiRequest('test@example.com', 'test-api-key');

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.firstCall.args[0]).to.equal('https://www.un.limited.mx/api/emails/urls');
      expect(fetchStub.firstCall.args[1]).to.deep.include({
        method: 'POST',
        headers: {
          'X-API-Key': 'test-api-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      expect(result).to.deep.equal({ valid: true, email: 'test@example.com' });
    });

    it('should handle API request failure', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: sinon.stub().resolves('Invalid request'),
      };
      fetchStub.resolves(mockResponse);

      try {
        await makeApiRequest('test@example.com', 'test-api-key');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('API request failed');
        expect(error.message).to.include('400');
        expect(error.message).to.include('Bad Request');
      }
    });

    it('should handle network errors', async () => {
      fetchStub.rejects(new Error('Network error'));

      try {
        await makeApiRequest('test@example.com', 'test-api-key');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Network error occurred');
      }
    });

    it('should throw error for missing API key', async () => {
      try {
        await makeApiRequest('test@example.com', '');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('API key is required');
      }
    });
  });

  describe('formatResponse', () => {
    it('should format successful response', () => {
      const data = { email: 'test@example.com', valid: true };
      const result = formatResponse(data);

      expect(result).to.have.property('success', true);
      expect(result).to.have.property('timestamp');
      expect(result).to.have.property('data', data);
      expect(new Date(result.timestamp)).to.be.instanceOf(Date);
    });

    it('should format error response', () => {
      const error = new Error('Test error');
      const result = formatResponse(null, error);

      expect(result).to.have.property('success', false);
      expect(result).to.have.property('timestamp');
      expect(result).to.have.property('error', 'Test error');
      expect(result).to.not.have.property('data');
    });

    it('should handle null data', () => {
      const result = formatResponse(null);

      expect(result).to.have.property('success', true);
      expect(result).to.have.property('data', null);
    });
  });
});
