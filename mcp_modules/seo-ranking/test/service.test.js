/**
 * SEO Ranking Service Tests
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { SeoRankingService } from '../src/service.js';

describe('SeoRankingService', () => {
  let service;
  let fetchStub;

  beforeEach(() => {
    service = new SeoRankingService();
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('validateSearchParams', () => {
    it('should validate required parameters', () => {
      const result = service.validateSearchParams({
        api_key: 'test-key',
        keyword: 'test keyword',
        domain: 'example.com',
      });

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should reject missing api_key', () => {
      const result = service.validateSearchParams({
        keyword: 'test keyword',
        domain: 'example.com',
      });

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('API key is required');
    });

    it('should reject missing keyword and keywords', () => {
      const result = service.validateSearchParams({
        api_key: 'test-key',
        domain: 'example.com',
      });

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Either keyword or keywords array is required');
    });

    it('should reject missing domain', () => {
      const result = service.validateSearchParams({
        api_key: 'test-key',
        keyword: 'test keyword',
      });

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Domain is required');
    });

    it('should reject too many keywords', () => {
      const keywords = Array(51).fill('keyword');
      const result = service.validateSearchParams({
        api_key: 'test-key',
        keywords: keywords,
        domain: 'example.com',
      });

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Maximum 50 keywords allowed');
    });
  });

  describe('findDomainInResults', () => {
    it('should find domain in organic results', () => {
      const results = [
        {
          position: 1,
          title: 'Example Site',
          link: 'https://example.com/page1',
          snippet: 'Test snippet',
          displayed_link: 'example.com › page1',
        },
        {
          position: 2,
          title: 'Other Site',
          link: 'https://other.com/page',
          snippet: 'Other snippet',
          displayed_link: 'other.com › page',
        },
      ];

      const result = service.findDomainInResults(results, 'example.com');

      expect(result).to.not.be.null;
      expect(result.position).to.equal(1);
      expect(result.title).to.equal('Example Site');
      expect(result.link).to.equal('https://example.com/page1');
    });

    it('should return null when domain not found', () => {
      const results = [
        {
          position: 1,
          title: 'Other Site',
          link: 'https://other.com/page',
          snippet: 'Other snippet',
        },
      ];

      const result = service.findDomainInResults(results, 'example.com');
      expect(result).to.be.null;
    });

    it('should handle empty results array', () => {
      const result = service.findDomainInResults([], 'example.com');
      expect(result).to.be.null;
    });
  });

  describe('findDomainInLocalResults', () => {
    it('should find domain in local results', () => {
      const results = [
        {
          title: 'Example Business',
          website: 'https://example.com',
          address: '123 Main St',
          phone: '555-1234',
          rating: 4.5,
          reviews: 100,
        },
      ];

      const result = service.findDomainInLocalResults(results, 'example.com');

      expect(result).to.not.be.null;
      expect(result.position).to.equal(1);
      expect(result.title).to.equal('Example Business');
      expect(result.website).to.equal('https://example.com');
    });

    it('should return null when domain not found in local results', () => {
      const results = [
        {
          title: 'Other Business',
          website: 'https://other.com',
        },
      ];

      const result = service.findDomainInLocalResults(results, 'example.com');
      expect(result).to.be.null;
    });
  });

  describe('generateSummary', () => {
    it('should generate correct summary statistics', () => {
      const results = [
        {
          keyword: 'keyword1',
          found: true,
          organic_rank: { position: 5 },
          local_rank: null,
        },
        {
          keyword: 'keyword2',
          found: true,
          organic_rank: { position: 10 },
          local_rank: { position: 2 },
        },
        {
          keyword: 'keyword3',
          found: false,
          organic_rank: null,
          local_rank: null,
        },
        {
          keyword: 'keyword4',
          error: 'API error',
        },
      ];

      const summary = service.generateSummary(results);

      expect(summary.total_checked).to.equal(4);
      expect(summary.successful_checks).to.equal(3);
      expect(summary.errors).to.equal(1);
      expect(summary.found_in_results).to.equal(2);
      expect(summary.found_in_organic).to.equal(2);
      expect(summary.found_in_local).to.equal(1);
      expect(summary.average_organic_rank).to.equal(8); // (5 + 10) / 2 = 7.5, rounded to 8
      expect(summary.best_organic_rank).to.equal(5);
      expect(summary.average_local_rank).to.equal(2);
      expect(summary.best_local_rank).to.equal(2);
    });

    it('should handle empty results', () => {
      const summary = service.generateSummary([]);

      expect(summary.total_checked).to.equal(0);
      expect(summary.successful_checks).to.equal(0);
      expect(summary.errors).to.equal(0);
      expect(summary.found_in_results).to.equal(0);
      expect(summary.average_organic_rank).to.be.null;
      expect(summary.best_organic_rank).to.be.null;
    });
  });

  describe('checkKeywordRanking', () => {
    it('should successfully check keyword ranking', async () => {
      const mockResponse = {
        organic_results: [
          {
            position: 3,
            title: 'Example Page',
            link: 'https://example.com/page',
            snippet: 'Test snippet',
            displayed_link: 'example.com › page',
          },
        ],
        local_results: [],
        search_information: {
          total_results: 1000000,
          time_taken_displayed: 0.45,
        },
      };

      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.checkKeywordRanking(
        'test-api-key',
        'test keyword',
        'example.com'
      );

      expect(result.keyword).to.equal('test keyword');
      expect(result.domain).to.equal('example.com');
      expect(result.found).to.be.true;
      expect(result.organic_rank).to.not.be.null;
      expect(result.organic_rank.position).to.equal(3);
      expect(result.local_rank).to.be.null;
    });

    it('should handle API errors', async () => {
      fetchStub.resolves({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      try {
        await service.checkKeywordRanking('invalid-api-key', 'test keyword', 'example.com');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('ValueSERP API error: 401');
      }
    });

    it('should validate required parameters', async () => {
      try {
        await service.checkKeywordRanking('', 'keyword', 'domain');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('API key is required');
      }

      try {
        await service.checkKeywordRanking('key', '', 'domain');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Keyword is required');
      }

      try {
        await service.checkKeywordRanking('key', 'keyword', '');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Domain is required');
      }
    });
  });

  describe('checkMultipleKeywords', () => {
    it('should validate keywords array', async () => {
      try {
        await service.checkMultipleKeywords('key', 'not-array', 'domain');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Keywords must be an array');
      }

      try {
        const tooManyKeywords = Array(51).fill('keyword');
        await service.checkMultipleKeywords('key', tooManyKeywords, 'domain');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Maximum 50 keywords allowed per request');
      }
    });

    it('should process multiple keywords successfully', async () => {
      const mockResponse = {
        organic_results: [
          {
            position: 1,
            title: 'Example Page',
            link: 'https://example.com/page',
            snippet: 'Test snippet',
          },
        ],
        local_results: [],
        search_information: {
          total_results: 1000000,
          time_taken_displayed: 0.45,
        },
      };

      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.checkMultipleKeywords(
        'test-api-key',
        ['keyword1', 'keyword2'],
        'example.com',
        { batchSize: 1, delay: 0 }
      );

      expect(result.domain).to.equal('example.com');
      expect(result.total_keywords).to.equal(2);
      expect(result.results).to.have.length(2);
      expect(result.summary).to.exist;
    });
  });
});
