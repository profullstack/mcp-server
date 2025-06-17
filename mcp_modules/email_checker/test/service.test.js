/**
 * Email Checker Service Tests
 *
 * Test suite for the EmailCheckerService class
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { EmailCheckerService } from '../src/service.js';

describe('EmailCheckerService', () => {
  let service;
  let fetchStub;

  beforeEach(() => {
    service = new EmailCheckerService('test-api-key');
    // Stub the global fetch instead of trying to stub ES modules
    fetchStub = sinon.stub(globalThis, 'fetch');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should initialize with empty checks history', () => {
      expect(service.checks).to.be.instanceOf(Map);
      expect(service.checks.size).to.equal(0);
    });

    it('should set API key from environment or parameter', () => {
      const customService = new EmailCheckerService('custom-key');
      expect(customService.apiKey).to.equal('custom-key');
    });
  });

  describe('checkEmail', () => {
    it('should successfully check a valid email', async () => {
      const email = 'test@example.com';
      const apiResponse = { valid: true, email, score: 95 };

      // Mock successful API response
      fetchStub.resolves({
        ok: true,
        status: 200,
        json: sinon.stub().resolves(apiResponse),
      });

      const result = await service.checkEmail(email);

      expect(result).to.have.property('email', email);
      expect(result).to.have.property('isValid', true);
      expect(result).to.have.property('apiResponse');
      expect(result).to.have.property('checkedAt');
      expect(result).to.have.property('id');
    });

    it('should handle invalid email format', async () => {
      const email = 'invalid-email';

      try {
        await service.checkEmail(email);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Invalid email format');
        expect(fetchStub.called).to.be.false;
      }
    });

    it('should handle API request failure', async () => {
      const email = 'test@example.com';

      fetchStub.resolves({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: sinon.stub().resolves('Invalid request'),
      });

      try {
        await service.checkEmail(email);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('API request failed');
      }
    });

    it('should store check result in history', async () => {
      const email = 'test@example.com';
      const apiResponse = { valid: true, email };

      fetchStub.resolves({
        ok: true,
        status: 200,
        json: sinon.stub().resolves(apiResponse),
      });

      const result = await service.checkEmail(email);

      expect(service.checks.has(result.id)).to.be.true;
      expect(service.checks.get(result.id)).to.deep.equal(result);
    });
  });

  describe('checkMultipleEmails', () => {
    it('should check multiple emails successfully', async () => {
      const emails = ['test1@example.com', 'test2@example.com'];

      fetchStub.resolves({
        ok: true,
        status: 200,
        json: sinon.stub().resolves({ valid: true }),
      });

      const results = await service.checkMultipleEmails(emails);

      expect(results).to.have.length(2);
      results.forEach(result => {
        expect(result).to.have.property('email');
        expect(result).to.have.property('isValid');
        expect(result).to.have.property('checkedAt');
      });
    });

    it('should handle mixed valid and invalid emails', async () => {
      const emails = ['valid@example.com', 'invalid-email'];

      fetchStub.resolves({
        ok: true,
        status: 200,
        json: sinon.stub().resolves({ valid: true }),
      });

      const results = await service.checkMultipleEmails(emails);

      expect(results).to.have.length(2);
      expect(results[0].isValid).to.be.true;
      expect(results[1].error).to.equal('Invalid email format');
    });

    it('should handle empty email array', async () => {
      const results = await service.checkMultipleEmails([]);
      expect(results).to.deep.equal([]);
    });
  });

  describe('getCheckHistory', () => {
    it('should return all check history', () => {
      const mockCheck = {
        id: 'test-id',
        email: 'test@example.com',
        isValid: true,
        checkedAt: new Date().toISOString(),
      };

      service.checks.set('test-id', mockCheck);

      const history = service.getCheckHistory();
      expect(history).to.have.length(1);
      expect(history[0]).to.deep.equal(mockCheck);
    });

    it('should return empty array when no history', () => {
      const history = service.getCheckHistory();
      expect(history).to.deep.equal([]);
    });
  });

  describe('getCheckById', () => {
    it('should return check by ID', () => {
      const mockCheck = {
        id: 'test-id',
        email: 'test@example.com',
        isValid: true,
      };

      service.checks.set('test-id', mockCheck);

      const result = service.getCheckById('test-id');
      expect(result).to.deep.equal(mockCheck);
    });

    it('should return null for non-existent ID', () => {
      const result = service.getCheckById('non-existent');
      expect(result).to.be.null;
    });
  });

  describe('clearHistory', () => {
    it('should clear all check history', () => {
      service.checks.set('test-id', { id: 'test-id' });
      expect(service.checks.size).to.equal(1);

      const result = service.clearHistory();

      expect(service.checks.size).to.equal(0);
      expect(result).to.be.true;
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const validCheck = {
        id: 'valid-1',
        email: 'valid@example.com',
        isValid: true,
        checkedAt: new Date().toISOString(),
      };

      const invalidCheck = {
        id: 'invalid-1',
        email: 'invalid@example.com',
        isValid: false,
        error: 'Invalid email',
        checkedAt: new Date().toISOString(),
      };

      service.checks.set('valid-1', validCheck);
      service.checks.set('invalid-1', invalidCheck);

      const stats = service.getStats();

      expect(stats).to.deep.equal({
        totalChecks: 2,
        validEmails: 1,
        invalidEmails: 1,
        successRate: 50,
      });
    });

    it('should handle empty history', () => {
      const stats = service.getStats();

      expect(stats).to.deep.equal({
        totalChecks: 0,
        validEmails: 0,
        invalidEmails: 0,
        successRate: 0,
      });
    });
  });
});
