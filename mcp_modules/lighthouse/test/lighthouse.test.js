/**
 * Lighthouse Module Tests
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { lighthouseService } from '../src/service.js';
import {
  validateUrl,
  validateAuditOptions,
  extractMetrics,
  getPerformanceGrade,
} from '../src/utils.js';

describe('Lighthouse Module', () => {
  beforeEach(() => {
    // Clear reports before each test
    lighthouseService.clearReports();
  });

  afterEach(() => {
    // Restore any stubs
    sinon.restore();
  });

  describe('Utils', () => {
    describe('validateUrl', () => {
      it('should validate correct HTTP URLs', () => {
        expect(validateUrl('http://example.com')).to.be.true;
        expect(validateUrl('https://example.com')).to.be.true;
        expect(validateUrl('https://www.example.com/path?query=1')).to.be.true;
      });

      it('should reject invalid URLs', () => {
        expect(validateUrl('')).to.be.false;
        expect(validateUrl('not-a-url')).to.be.false;
        expect(validateUrl('ftp://example.com')).to.be.false;
        expect(validateUrl(null)).to.be.false;
        expect(validateUrl(undefined)).to.be.false;
      });
    });

    describe('validateAuditOptions', () => {
      it('should accept valid options', () => {
        expect(validateAuditOptions({})).to.be.true;
        expect(validateAuditOptions({ headless: true })).to.be.true;
        expect(validateAuditOptions({ categories: ['performance'] })).to.be.true;
        expect(
          validateAuditOptions({
            categories: ['performance', 'accessibility'],
            headless: false,
          })
        ).to.be.true;
      });

      it('should reject invalid options', () => {
        expect(validateAuditOptions({ headless: 'true' })).to.be.false;
        expect(validateAuditOptions({ categories: 'performance' })).to.be.false;
        expect(validateAuditOptions({ categories: ['invalid-category'] })).to.be.false;
      });
    });

    describe('getPerformanceGrade', () => {
      it('should return correct grades', () => {
        expect(getPerformanceGrade(0.95)).to.equal('A');
        expect(getPerformanceGrade(0.85)).to.equal('B');
        expect(getPerformanceGrade(0.75)).to.equal('C');
        expect(getPerformanceGrade(0.65)).to.equal('D');
        expect(getPerformanceGrade(0.45)).to.equal('F');
      });
    });

    describe('extractMetrics', () => {
      it('should extract metrics from LHR', () => {
        const mockLhr = {
          audits: {
            'first-contentful-paint': {
              numericValue: 1200,
              displayValue: '1.2 s',
              score: 0.85,
              numericUnit: 'ms',
            },
            'largest-contentful-paint': {
              numericValue: 2400,
              displayValue: '2.4 s',
              score: 0.75,
              numericUnit: 'ms',
            },
          },
        };

        const metrics = extractMetrics(mockLhr);

        expect(metrics).to.have.property('firstContentfulPaint');
        expect(metrics.firstContentfulPaint.value).to.equal(1200);
        expect(metrics.firstContentfulPaint.displayValue).to.equal('1.2 s');
        expect(metrics.firstContentfulPaint.score).to.equal(0.85);

        expect(metrics).to.have.property('largestContentfulPaint');
        expect(metrics.largestContentfulPaint.value).to.equal(2400);
      });
    });
  });

  describe('LighthouseService', () => {
    describe('Report Management', () => {
      it('should store and retrieve reports', () => {
        const mockReport = {
          id: 'test-report-1',
          url: 'https://example.com',
          timestamp: new Date().toISOString(),
          scores: { performance: { score: 0.85, displayValue: 85 } },
          metrics: {},
          opportunities: [],
          diagnostics: [],
        };

        // Manually add report for testing
        lighthouseService.reports.set(mockReport.id, mockReport);

        const retrieved = lighthouseService.getReport('test-report-1');
        expect(retrieved).to.deep.equal(mockReport);
      });

      it('should return null for non-existent reports', () => {
        const result = lighthouseService.getReport('non-existent');
        expect(result).to.be.null;
      });

      it('should list all reports', () => {
        const report1 = { id: 'report-1', url: 'https://example1.com' };
        const report2 = { id: 'report-2', url: 'https://example2.com' };

        lighthouseService.reports.set('report-1', report1);
        lighthouseService.reports.set('report-2', report2);

        const allReports = lighthouseService.getAllReports();
        expect(allReports).to.have.length(2);
        expect(allReports).to.include(report1);
        expect(allReports).to.include(report2);
      });

      it('should delete reports', () => {
        const report = { id: 'test-report', url: 'https://example.com' };
        lighthouseService.reports.set('test-report', report);

        const deleted = lighthouseService.deleteReport('test-report');
        expect(deleted).to.be.true;
        expect(lighthouseService.getReport('test-report')).to.be.null;
      });

      it('should clear all reports', () => {
        lighthouseService.reports.set('report-1', { id: 'report-1' });
        lighthouseService.reports.set('report-2', { id: 'report-2' });

        lighthouseService.clearReports();
        expect(lighthouseService.getAllReports()).to.have.length(0);
      });
    });

    describe('Score Extraction', () => {
      it('should extract scores from LHR', () => {
        const mockLhr = {
          categories: {
            performance: { score: 0.85 },
            accessibility: { score: 0.92 },
          },
        };

        const scores = lighthouseService.extractScores(mockLhr);

        expect(scores.performance.score).to.equal(0.85);
        expect(scores.performance.displayValue).to.equal(85);
        expect(scores.accessibility.score).to.equal(0.92);
        expect(scores.accessibility.displayValue).to.equal(92);
      });
    });

    describe('Opportunities Extraction', () => {
      it('should extract and sort opportunities', () => {
        const mockLhr = {
          audits: {
            'unused-css-rules': {
              title: 'Remove unused CSS',
              description: 'Remove dead rules from stylesheets',
              displayValue: 'Potential savings of 45 KiB',
              numericValue: 450,
              score: 0.5,
              details: { type: 'opportunity' },
            },
            'optimize-images': {
              title: 'Efficiently encode images',
              description: 'Optimized images load faster',
              displayValue: 'Potential savings of 120 KiB',
              numericValue: 1200,
              score: 0.3,
              details: { type: 'opportunity' },
            },
          },
        };

        const opportunities = lighthouseService.extractOpportunities(mockLhr);

        expect(opportunities).to.have.length(2);
        // Should be sorted by numericValue (descending)
        expect(opportunities[0].numericValue).to.equal(1200);
        expect(opportunities[1].numericValue).to.equal(450);
      });
    });

    describe('Summary Generation', () => {
      it('should generate report summary', () => {
        const mockReport = {
          id: 'test-report',
          url: 'https://example.com',
          timestamp: new Date().toISOString(),
          scores: { performance: { score: 0.85, displayValue: 85 } },
          metrics: { firstContentfulPaint: { value: 1200 } },
          opportunities: [{ title: 'Optimize images' }, { title: 'Remove unused CSS' }],
          diagnostics: [{ title: 'Use HTTP/2' }],
        };

        lighthouseService.reports.set('test-report', mockReport);

        const summary = lighthouseService.generateSummary('test-report');

        expect(summary.id).to.equal('test-report');
        expect(summary.url).to.equal('https://example.com');
        expect(summary.scores.performance.displayValue).to.equal(85);
        expect(summary.opportunitiesCount).to.equal(2);
        expect(summary.diagnosticsCount).to.equal(1);
        expect(summary.topOpportunities).to.have.length(2);
      });

      it('should throw error for non-existent report', () => {
        expect(() => {
          lighthouseService.generateSummary('non-existent');
        }).to.throw('Report with ID non-existent not found');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URLs in runAudit', async () => {
      try {
        await lighthouseService.runAudit('invalid-url');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid URL');
      }
    });

    it('should handle empty URL array in runBatchAudit', async () => {
      try {
        await lighthouseService.runBatchAudit([]);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('non-empty array');
      }
    });
  });
});
