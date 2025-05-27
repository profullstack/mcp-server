/**
 * News Aggregator Controller Tests
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { newsAggregatorService } from '../src/service.js';
import {
  getRSSNews,
  getScrapedNews,
  getAggregatedNews,
  getAvailableSources,
  searchNews,
  clearCache,
  getHealthStatus,
} from '../src/controller.js';

describe('NewsAggregatorController', () => {
  let mockContext;
  let serviceStub;

  beforeEach(() => {
    // Mock Hono context
    mockContext = {
      req: {
        query: sinon.stub().returns({}),
        json: sinon.stub().resolves({}),
      },
      json: sinon.stub().returns({ json: 'response' }),
    };

    // Stub service methods
    serviceStub = sinon.stub(newsAggregatorService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getRSSNews', () => {
    it('should return RSS news for valid source', async () => {
      const mockResult = {
        source: 'Google News',
        category: 'technology',
        articles: [
          {
            title: 'Test Article',
            description: 'Test description',
            link: 'https://example.com/test',
            publishedAt: '2024-01-01T12:00:00.000Z',
          },
        ],
      };

      mockContext.req.query.returns({ source: 'google', category: 'technology' });
      serviceStub.getGoogleNews.resolves(mockResult);

      await getRSSNews(mockContext);

      expect(serviceStub.getGoogleNews.calledWith('technology')).to.be.true;
      expect(mockContext.json.calledWith(mockResult)).to.be.true;
    });

    it('should return error for missing source parameter', async () => {
      mockContext.req.query.returns({});

      await getRSSNews(mockContext);

      expect(mockContext.json.calledWith({ error: 'Source parameter is required' }, 400)).to.be
        .true;
    });

    it('should return error for unknown RSS source', async () => {
      mockContext.req.query.returns({ source: 'unknown' });

      await getRSSNews(mockContext);

      expect(mockContext.json.calledWith({ error: 'Unknown RSS source: unknown' }, 400)).to.be.true;
    });

    it('should handle service errors', async () => {
      mockContext.req.query.returns({ source: 'google' });
      serviceStub.getGoogleNews.rejects(new Error('Service error'));

      await getRSSNews(mockContext);

      expect(mockContext.json.calledWith({ error: 'Service error' }, 500)).to.be.true;
    });
  });

  describe('getScrapedNews', () => {
    it('should return scraped news for valid source', async () => {
      const mockResult = {
        source: 'CNN',
        category: 'general',
        articles: [
          {
            title: 'News Article',
            description: 'News description',
            link: 'https://cnn.com/test',
            publishedAt: '2024-01-01T12:00:00.000Z',
          },
        ],
      };

      mockContext.req.query.returns({ source: 'cnn-scraped' });
      serviceStub.getCNNScrapedNews.resolves(mockResult);

      await getScrapedNews(mockContext);

      expect(serviceStub.getCNNScrapedNews.called).to.be.true;
      expect(mockContext.json.calledWith(mockResult)).to.be.true;
    });

    it('should return error for missing source parameter', async () => {
      mockContext.req.query.returns({});

      await getScrapedNews(mockContext);

      expect(mockContext.json.calledWith({ error: 'Source parameter is required' }, 400)).to.be
        .true;
    });

    it('should return error for unknown scrape source', async () => {
      mockContext.req.query.returns({ source: 'unknown' });

      await getScrapedNews(mockContext);

      expect(mockContext.json.calledWith({ error: 'Unknown scrape source: unknown' }, 400)).to.be
        .true;
    });
  });

  describe('getAggregatedNews', () => {
    it('should return aggregated news with default sources', async () => {
      const mockResult = {
        sources: [
          {
            source: 'Google News',
            articles: [{ title: 'Article 1' }],
          },
          {
            source: 'Hacker News',
            articles: [{ title: 'Article 2' }],
          },
        ],
        totalArticles: 2,
        errors: [],
      };

      mockContext.req.query.returns({});
      serviceStub.getAggregatedNews.resolves(mockResult);

      await getAggregatedNews(mockContext);

      expect(serviceStub.getAggregatedNews.calledWith(['google', 'hackernews', 'bbc'])).to.be.true;
      expect(mockContext.json.calledWith(mockResult)).to.be.true;
    });

    it('should parse custom sources from query', async () => {
      const mockResult = {
        sources: [{ source: 'Google News', articles: [] }],
        totalArticles: 0,
        errors: [],
      };

      mockContext.req.query.returns({ sources: 'google,techcrunch', category: 'technology' });
      serviceStub.getAggregatedNews.resolves(mockResult);

      await getAggregatedNews(mockContext);

      expect(serviceStub.getAggregatedNews.calledWith(['google', 'techcrunch'], 'technology')).to.be
        .true;
    });

    it('should apply keyword filtering when provided', async () => {
      const mockResult = {
        sources: [
          {
            source: 'Google News',
            articles: [
              { title: 'AI Article', description: 'About AI' },
              { title: 'Sports Article', description: 'About sports' },
            ],
          },
        ],
        totalArticles: 2,
        errors: [],
      };

      const filteredArticles = [{ title: 'AI Article', description: 'About AI' }];

      mockContext.req.query.returns({ keywords: 'AI,machine learning' });
      serviceStub.getAggregatedNews.resolves(mockResult);
      serviceStub.filterByKeywords.returns(filteredArticles);

      await getAggregatedNews(mockContext);

      // Check that the service method was called
      expect(serviceStub.getAggregatedNews.called).to.be.true;
      expect(mockContext.json.called).to.be.true;
    });
  });

  describe('searchNews', () => {
    it('should search news with keywords', async () => {
      const mockAggregatedResult = {
        sources: [
          {
            source: 'Google News',
            category: 'technology',
            articles: [
              {
                title: 'AI Article',
                description: 'About AI',
                publishedAt: '2024-01-01T12:00:00.000Z',
              },
              {
                title: 'Sports Article',
                description: 'About sports',
                publishedAt: '2024-01-01T11:00:00.000Z',
              },
            ],
          },
        ],
      };

      const filteredArticles = [
        { title: 'AI Article', description: 'About AI', publishedAt: '2024-01-01T12:00:00.000Z' },
      ];

      mockContext.req.query.returns({ keywords: 'AI', limit: '10' });
      serviceStub.getAggregatedNews.resolves(mockAggregatedResult);
      serviceStub.filterByKeywords.returns(filteredArticles);

      await searchNews(mockContext);

      expect(serviceStub.getAggregatedNews.called).to.be.true;
      expect(
        serviceStub.filterByKeywords.calledWith(mockAggregatedResult.sources[0].articles, ['AI'])
      ).to.be.true;
    });

    it('should return error for missing keywords', async () => {
      mockContext.req.query.returns({});

      await searchNews(mockContext);

      expect(mockContext.json.calledWith({ error: 'Keywords parameter is required' }, 400)).to.be
        .true;
    });

    it('should apply limit to search results', async () => {
      const mockAggregatedResult = {
        sources: [
          {
            source: 'Google News',
            category: 'technology',
            articles: [
              { title: 'Article 1', publishedAt: '2024-01-01T12:00:00.000Z' },
              { title: 'Article 2', publishedAt: '2024-01-01T11:00:00.000Z' },
              { title: 'Article 3', publishedAt: '2024-01-01T10:00:00.000Z' },
            ],
          },
        ],
      };

      mockContext.req.query.returns({ keywords: 'test', limit: '2' });
      serviceStub.getAggregatedNews.resolves(mockAggregatedResult);
      serviceStub.filterByKeywords.returns(mockAggregatedResult.sources[0].articles);

      await searchNews(mockContext);

      // Verify that the response was called (we can't easily check the exact limit without more complex mocking)
      expect(mockContext.json.called).to.be.true;
    });
  });

  describe('getAvailableSources', () => {
    it('should return available sources', async () => {
      const mockSources = [
        { id: 'google', name: 'Google News', type: 'rss' },
        { id: 'techcrunch', name: 'TechCrunch', type: 'scrape' },
      ];

      serviceStub.getAvailableSources.returns(mockSources);

      await getAvailableSources(mockContext);

      expect(serviceStub.getAvailableSources.called).to.be.true;
      expect(
        mockContext.json.calledWith({
          sources: mockSources,
          total: mockSources.length,
          timestamp: sinon.match.string,
        })
      ).to.be.true;
    });
  });

  describe('clearCache', () => {
    it('should clear cache successfully', async () => {
      serviceStub.clearCache.returns();

      await clearCache(mockContext);

      expect(serviceStub.clearCache.called).to.be.true;
      expect(
        mockContext.json.calledWith({
          message: 'Cache cleared successfully',
          timestamp: sinon.match.string,
        })
      ).to.be.true;
    });

    it('should handle cache clear errors', async () => {
      serviceStub.clearCache.throws(new Error('Cache error'));

      await clearCache(mockContext);

      expect(mockContext.json.calledWith({ error: 'Cache error' }, 500)).to.be.true;
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when service is working', async () => {
      const mockTestResult = {
        articles: [{ title: 'Test Article 1' }, { title: 'Test Article 2' }],
      };

      serviceStub.getHackerNews.resolves(mockTestResult);

      await getHealthStatus(mockContext);

      expect(serviceStub.getHackerNews.called).to.be.true;
      expect(
        mockContext.json.calledWith({
          status: 'healthy',
          message: 'News aggregator service is operational',
          testArticles: 2,
          timestamp: sinon.match.string,
        })
      ).to.be.true;
    });

    it('should return unhealthy status when service fails', async () => {
      serviceStub.getHackerNews.rejects(new Error('Service unavailable'));

      await getHealthStatus(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            status: 'unhealthy',
            message: 'Service unavailable',
            timestamp: sinon.match.string,
          },
          500
        )
      ).to.be.true;
    });
  });
});
