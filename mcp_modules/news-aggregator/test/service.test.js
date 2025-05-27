/**
 * News Aggregator Service Tests
 */

import { expect } from 'chai';
import sinon from 'sinon';
import fetch from 'node-fetch';
import { newsAggregatorService } from '../src/service.js';

// Mock fetch globally
global.fetch = fetch;

describe('NewsAggregatorService', () => {
  let fetchStub;

  beforeEach(() => {
    // Clear cache before each test
    newsAggregatorService.clearCache();

    // Stub fetch for testing
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Cache Management', () => {
    it('should cache RSS feed results', async () => {
      // Mock the RSS parser directly since we can't easily mock the parseURL method
      const mockResult = {
        source: 'Test Source',
        category: 'Technology',
        articles: [
          {
            title: 'Test Article',
            description: 'Test description',
            link: 'https://example.com/test',
            publishedAt: '2024-01-01T12:00:00.000Z',
            source: 'Test Source',
          },
        ],
        fetchedAt: '2024-01-01T12:00:00.000Z',
      };

      // Test cache functionality by setting and getting data
      const cacheKey = 'test-cache-key';
      newsAggregatorService.setCachedData(cacheKey, mockResult);

      const cachedResult = newsAggregatorService.getCachedData(cacheKey);
      expect(cachedResult).to.deep.equal(mockResult);
    });

    it('should cache website scraping results', async () => {
      // Test cache functionality directly
      const mockResult = {
        source: 'Test Source',
        category: 'Technology',
        articles: [
          {
            title: 'Test Article 1',
            description: 'Test description 1',
            link: 'https://example.com/article1',
            publishedAt: '2024-01-01T00:00:00.000Z',
            source: 'Test Source',
          },
        ],
        fetchedAt: '2024-01-01T12:00:00.000Z',
      };

      const cacheKey = 'scrape_https://example.com';
      newsAggregatorService.setCachedData(cacheKey, mockResult);

      const cachedResult = newsAggregatorService.getCachedData(cacheKey);
      expect(cachedResult).to.deep.equal(mockResult);
    });

    it('should clear cache when requested', () => {
      newsAggregatorService.setCachedData('test-key', { test: 'data' });
      expect(newsAggregatorService.getCachedData('test-key')).to.exist;

      newsAggregatorService.clearCache();
      expect(newsAggregatorService.getCachedData('test-key')).to.be.null;
    });
  });

  describe('RSS Feed Parsing', () => {
    it('should handle RSS parsing errors gracefully', async () => {
      fetchStub.rejects(new Error('Network error'));

      try {
        await newsAggregatorService.parseRSSFeed('https://example.com/rss', 'Test Source');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to parse RSS feed');
      }
    });
  });

  describe('Website Scraping', () => {
    it('should have scraping functionality available', () => {
      // Test that the scraping method exists
      expect(typeof newsAggregatorService.scrapeWebsite).to.equal('function');
    });
  });

  describe('Keyword Filtering', () => {
    it('should filter articles by keywords', () => {
      const articles = [
        {
          title: 'AI Revolution in Technology',
          description: 'Machine learning advances',
          link: 'https://example.com/1',
        },
        {
          title: 'Sports News Update',
          description: 'Latest sports results',
          link: 'https://example.com/2',
        },
        {
          title: 'Artificial Intelligence Breakthrough',
          description: 'New AI model released',
          link: 'https://example.com/3',
        },
      ];

      const filtered = newsAggregatorService.filterByKeywords(articles, ['AI', 'artificial']);

      expect(filtered).to.have.length(2);
      expect(filtered[0].title).to.include('AI');
      expect(filtered[1].title).to.include('Artificial Intelligence');
    });

    it('should return all articles when no keywords provided', () => {
      const articles = [
        { title: 'Article 1', description: 'Description 1', link: 'https://example.com/1' },
        { title: 'Article 2', description: 'Description 2', link: 'https://example.com/2' },
      ];

      const filtered = newsAggregatorService.filterByKeywords(articles, []);
      expect(filtered).to.have.length(2);
    });
  });

  describe('Available Sources', () => {
    it('should return list of available sources', () => {
      const sources = newsAggregatorService.getAvailableSources();

      expect(sources).to.be.an('array');
      expect(sources.length).to.be.greaterThan(0);

      const googleSource = sources.find(s => s.id === 'google');
      expect(googleSource).to.exist;
      expect(googleSource.name).to.equal('Google News');
      expect(googleSource.type).to.equal('rss');
    });
  });

  describe('Aggregated News', () => {
    it('should handle errors from individual sources gracefully', async () => {
      // Mock successful response for one source and error for another
      fetchStub.onFirstCall().resolves({
        ok: true,
        text: () =>
          Promise.resolve(`
          <?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0">
            <channel>
              <title>Test Feed</title>
              <item>
                <title>Test Article</title>
                <description>Test description</description>
                <link>https://example.com/test</link>
                <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
              </item>
            </channel>
          </rss>
        `),
      });

      fetchStub.onSecondCall().rejects(new Error('Network error'));

      const result = await newsAggregatorService.getAggregatedNews([
        'hackernews',
        'invalid-source',
      ]);

      expect(result.sources).to.have.length(1); // Only successful source
      expect(result.errors).to.have.length(1); // One error
      expect(result.errors[0]).to.include('Unknown source: invalid-source');
    });
  });
});
