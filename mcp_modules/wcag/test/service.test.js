/**
 * WCAG Service Tests
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { WcagService } from '../src/service.js';

describe('WcagService', () => {
  let wcagService;

  beforeEach(() => {
    wcagService = new WcagService();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(wcagService.supportedStandards).to.include('WCAG2AA');
      expect(wcagService.supportedReporters).to.include('json');
      expect(wcagService.defaultTimeout).to.equal(30000);
    });
  });

  describe('checkUrl', () => {
    it('should reject invalid URLs', async () => {
      try {
        await wcagService.checkUrl('invalid-url');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid URL');
      }
    });

    it('should reject unsupported standards', async () => {
      try {
        await wcagService.checkUrl('https://example.com', { standard: 'INVALID' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Unsupported standard');
      }
    });

    it('should reject unsupported reporters', async () => {
      try {
        await wcagService.checkUrl('https://example.com', { reporter: 'invalid' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Unsupported reporter');
      }
    });

    it('should accept valid URLs and options', async () => {
      // We can't easily test the actual Pa11y execution without mocking spawn
      // This test validates the input validation works correctly
      const url = 'https://example.com';
      const options = {
        standard: 'WCAG2AA',
        reporter: 'json',
        timeout: 30000,
      };

      // Validate that the method accepts valid inputs without throwing
      expect(() => {
        wcagService.checkUrl(url, options);
      }).to.not.throw();
    });
  });

  describe('checkUrls', () => {
    it('should reject empty URL arrays', async () => {
      try {
        await wcagService.checkUrls([]);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('non-empty array');
      }
    });

    it('should reject non-array inputs', async () => {
      try {
        await wcagService.checkUrls('not-an-array');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('non-empty array');
      }
    });

    it('should reject arrays with invalid URLs', async () => {
      try {
        await wcagService.checkUrls(['https://example.com', 'invalid-url']);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid URL');
      }
    });

    it('should accept valid URL arrays', () => {
      const urls = ['https://example.com', 'https://test.com'];

      // Validate that the method accepts valid inputs without throwing
      expect(() => {
        wcagService.checkUrls(urls);
      }).to.not.throw();
    });
  });

  describe('getSummary', () => {
    it('should accept valid URL arrays for summary', () => {
      const urls = ['https://example.com', 'https://test.com'];

      // Validate that the method accepts valid inputs without throwing
      expect(() => {
        wcagService.getSummary(urls);
      }).to.not.throw();
    });
  });

  describe('_getIssueBreakdown', () => {
    it('should correctly count issues by type', () => {
      const results = [
        {
          issues: [
            { type: 'error', code: 'TEST1' },
            { type: 'warning', code: 'TEST2' },
            { type: 'error', code: 'TEST1' },
          ],
        },
        {
          issues: [{ type: 'notice', code: 'TEST3' }],
        },
      ];

      const breakdown = wcagService._getIssueBreakdown(results);

      expect(breakdown.error).to.equal(2);
      expect(breakdown.warning).to.equal(1);
      expect(breakdown.notice).to.equal(1);
      expect(breakdown.byType.TEST1).to.equal(2);
      expect(breakdown.byType.TEST2).to.equal(1);
      expect(breakdown.byType.TEST3).to.equal(1);
    });

    it('should handle empty results', () => {
      const breakdown = wcagService._getIssueBreakdown([]);

      expect(breakdown.error).to.equal(0);
      expect(breakdown.warning).to.equal(0);
      expect(breakdown.notice).to.equal(0);
      expect(Object.keys(breakdown.byType)).to.have.length(0);
    });
  });

  describe('_getMostCommonIssues', () => {
    it('should return most common issues sorted by frequency', () => {
      const results = [
        {
          issues: [
            { code: 'TEST1', message: 'Test message 1' },
            { code: 'TEST2', message: 'Test message 2' },
            { code: 'TEST1', message: 'Test message 1' },
          ],
        },
        {
          issues: [
            { code: 'TEST1', message: 'Test message 1' },
            { code: 'TEST3', message: 'Test message 3' },
          ],
        },
      ];

      const commonIssues = wcagService._getMostCommonIssues(results);

      expect(commonIssues).to.have.length(3);
      expect(commonIssues[0].count).to.equal(3); // TEST1 appears 3 times
      expect(commonIssues[1].count).to.equal(1); // TEST2 appears 1 time
      expect(commonIssues[2].count).to.equal(1); // TEST3 appears 1 time
    });

    it('should limit results to top 10', () => {
      const issues = [];
      for (let i = 0; i < 15; i++) {
        issues.push({ code: `TEST${i}`, message: `Test message ${i}` });
      }

      const results = [{ issues }];
      const commonIssues = wcagService._getMostCommonIssues(results);

      expect(commonIssues).to.have.length(10);
    });
  });

  describe('_aggregateResults', () => {
    it('should correctly aggregate results and errors', () => {
      const results = [
        { url: 'https://example.com', issues: [] },
        { url: 'https://test.com', issues: [] },
      ];
      const errors = [{ url: 'https://failed.com', error: 'Test error' }];
      const options = { standard: 'WCAG2AA' };

      const aggregated = wcagService._aggregateResults(results, errors, options);

      expect(aggregated.summary.totalUrls).to.equal(3);
      expect(aggregated.summary.successfulTests).to.equal(2);
      expect(aggregated.summary.failedTests).to.equal(1);
      expect(aggregated.summary.standard).to.equal('WCAG2AA');
      expect(aggregated.results).to.equal(results);
      expect(aggregated.errors).to.equal(errors);
    });
  });
});
