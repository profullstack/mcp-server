/**
 * SEO Ranking Controller Tests
 */

import { expect } from 'chai';
import sinon from 'sinon';
import * as controller from '../src/controller.js';
import { seoRankingService } from '../src/service.js';

describe('SEO Ranking Controller', () => {
  let mockContext;
  let serviceStub;

  beforeEach(() => {
    mockContext = {
      req: {
        json: sinon.stub(),
        param: sinon.stub(),
      },
      json: sinon.stub().returnsThis(),
    };
    serviceStub = sinon.stub(seoRankingService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('checkKeywordRanking', () => {
    it('should successfully check keyword ranking', async () => {
      const requestBody = {
        api_key: 'test-key',
        keyword: 'test keyword',
        domain: 'example.com',
      };

      const serviceResult = {
        keyword: 'test keyword',
        domain: 'example.com',
        organic_rank: { position: 5 },
        local_rank: null,
        found: true,
      };

      mockContext.req.json.resolves(requestBody);
      serviceStub.validateSearchParams.returns({ valid: true, errors: [] });
      serviceStub.checkKeywordRanking.resolves(serviceResult);

      await controller.checkKeywordRanking(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          data: serviceResult,
        })
      ).to.be.true;
    });

    it('should handle validation errors', async () => {
      const requestBody = {
        keyword: 'test keyword',
        domain: 'example.com',
        // missing api_key
      };

      mockContext.req.json.resolves(requestBody);
      serviceStub.validateSearchParams.returns({
        valid: false,
        errors: ['API key is required'],
      });

      await controller.checkKeywordRanking(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Validation failed',
            details: ['API key is required'],
          },
          400
        )
      ).to.be.true;
    });

    it('should handle service errors', async () => {
      const requestBody = {
        api_key: 'test-key',
        keyword: 'test keyword',
        domain: 'example.com',
      };

      mockContext.req.json.resolves(requestBody);
      serviceStub.validateSearchParams.returns({ valid: true, errors: [] });
      serviceStub.checkKeywordRanking.rejects(new Error('API error'));

      await controller.checkKeywordRanking(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'API error',
          },
          500
        )
      ).to.be.true;
    });
  });

  describe('checkMultipleKeywords', () => {
    it('should successfully check multiple keywords', async () => {
      const requestBody = {
        api_key: 'test-key',
        keywords: ['keyword1', 'keyword2'],
        domain: 'example.com',
      };

      const serviceResult = {
        domain: 'example.com',
        total_keywords: 2,
        results: [
          { keyword: 'keyword1', found: true },
          { keyword: 'keyword2', found: false },
        ],
        summary: {
          total_checked: 2,
          found_in_results: 1,
        },
      };

      mockContext.req.json.resolves(requestBody);
      serviceStub.validateSearchParams.returns({ valid: true, errors: [] });
      serviceStub.checkMultipleKeywords.resolves(serviceResult);

      await controller.checkMultipleKeywords(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          data: serviceResult,
        })
      ).to.be.true;
    });

    it('should handle validation errors for multiple keywords', async () => {
      const requestBody = {
        api_key: 'test-key',
        keywords: Array(51).fill('keyword'), // too many keywords
        domain: 'example.com',
      };

      mockContext.req.json.resolves(requestBody);
      serviceStub.validateSearchParams.returns({
        valid: false,
        errors: ['Maximum 50 keywords allowed'],
      });

      await controller.checkMultipleKeywords(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Validation failed',
            details: ['Maximum 50 keywords allowed'],
          },
          400
        )
      ).to.be.true;
    });
  });

  describe('getRankingHistory', () => {
    it('should return placeholder response', async () => {
      mockContext.req.param.withArgs('domain').returns('example.com');

      await controller.getRankingHistory(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          data: {
            domain: 'example.com',
            message: 'Ranking history feature not yet implemented',
            suggestion: 'Use checkKeywordRanking or checkMultipleKeywords endpoints',
          },
        })
      ).to.be.true;
    });

    it('should handle missing domain parameter', async () => {
      mockContext.req.param.withArgs('domain').returns(undefined);

      await controller.getRankingHistory(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Domain parameter is required',
          },
          400
        )
      ).to.be.true;
    });
  });

  describe('getModuleStatus', () => {
    it('should return module status', async () => {
      await controller.getModuleStatus(mockContext);

      expect(mockContext.json.calledOnce).to.be.true;
      const callArgs = mockContext.json.getCall(0).args[0];
      expect(callArgs.success).to.be.true;
      expect(callArgs.data.module).to.equal('seo-ranking');
      expect(callArgs.data.status).to.equal('active');
      expect(callArgs.data.api_provider).to.equal('ValueSERP');
      expect(callArgs.data.features).to.be.an('array');
      expect(callArgs.data.endpoints).to.be.an('array');
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      const requestBody = {
        api_key: 'valid-key',
      };

      const serviceResult = {
        keyword: 'test',
        domain: 'example.com',
        found: true,
      };

      mockContext.req.json.resolves(requestBody);
      serviceStub.checkKeywordRanking.resolves(serviceResult);

      await controller.validateApiKey(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          data: {
            api_key_valid: true,
            test_search_completed: true,
            message: 'API key is valid and working',
          },
        })
      ).to.be.true;
    });

    it('should handle missing API key', async () => {
      const requestBody = {};

      mockContext.req.json.resolves(requestBody);

      await controller.validateApiKey(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'API key is required',
          },
          400
        )
      ).to.be.true;
    });

    it('should handle invalid API key', async () => {
      const requestBody = {
        api_key: 'invalid-key',
      };

      mockContext.req.json.resolves(requestBody);
      serviceStub.checkKeywordRanking.rejects(new Error('ValueSERP API error: 401 Unauthorized'));

      await controller.validateApiKey(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            data: {
              api_key_valid: false,
              message: 'Invalid API key',
            },
          },
          401
        )
      ).to.be.true;
    });

    it('should handle other API errors', async () => {
      const requestBody = {
        api_key: 'test-key',
      };

      mockContext.req.json.resolves(requestBody);
      serviceStub.checkKeywordRanking.rejects(new Error('Network error'));

      await controller.validateApiKey(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Network error',
          },
          500
        )
      ).to.be.true;
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockContext.req.json.rejects(new Error('Invalid JSON'));

      await controller.checkKeywordRanking(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Invalid JSON',
          },
          500
        )
      ).to.be.true;
    });

    it('should handle unexpected errors', async () => {
      mockContext.req.json.resolves({
        api_key: 'test-key',
        keyword: 'test',
        domain: 'example.com',
      });
      serviceStub.validateSearchParams.throws(new Error('Unexpected error'));

      await controller.checkKeywordRanking(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Unexpected error',
          },
          500
        )
      ).to.be.true;
    });
  });
});
