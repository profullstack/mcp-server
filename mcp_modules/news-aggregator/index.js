/**
 * News Aggregator Module
 *
 * A comprehensive news aggregation module that parses RSS feeds and scrapes websites
 * to provide real-time news from multiple sources.
 */

import { logger } from '../../src/utils/logger.js';
import {
  getRSSNews,
  getScrapedNews,
  getAggregatedNews,
  getAvailableSources,
  searchNews,
  clearCache,
  getHealthStatus,
  debugRSSFeed,
} from './src/controller.js';
import { newsAggregatorService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering news-aggregator module');

  // Basic module info endpoint
  app.get('/news-aggregator', c => {
    return c.json({
      module: 'news-aggregator',
      status: 'active',
      message: 'News aggregator module for RSS feeds and website scraping',
      version: metadata.version,
      availableEndpoints: metadata.endpoints.map(ep => `${ep.method} ${ep.path}`),
    });
  });

  // RSS news endpoints
  app.get('/news-aggregator/rss', getRSSNews);
  app.get('/news-aggregator/rss/:source', async c => {
    const source = c.req.param('source');
    const category = c.req.query('category');

    try {
      let result;

      switch (source.toLowerCase()) {
        case 'google':
          result = await newsAggregatorService.getGoogleNews(category);
          break;
        case 'hackernews':
          result = await newsAggregatorService.getHackerNews();
          break;
        case 'bbc':
          result = await newsAggregatorService.getBBCNews(category);
          break;
        case 'npr':
          result = await newsAggregatorService.getNPRNews();
          break;
        default:
          return c.json({ error: `Unknown RSS source: ${source}` }, 400);
      }

      return c.json(result);
    } catch (error) {
      logger.error(`Error fetching RSS from ${source}:`, error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Scraping endpoints
  app.get('/news-aggregator/scrape', getScrapedNews);
  app.get('/news-aggregator/scrape/:source', async c => {
    const source = c.req.param('source');

    try {
      let result;

      switch (source.toLowerCase()) {
        case 'techcrunch':
          result = await newsAggregatorService.getTechCrunchNews();
          break;
        case 'cnn':
          result = await newsAggregatorService.getCNNNews();
          break;
        default:
          return c.json({ error: `Unknown scrape source: ${source}` }, 400);
      }

      return c.json(result);
    } catch (error) {
      logger.error(`Error scraping ${source}:`, error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Aggregated news endpoint
  app.get('/news-aggregator/aggregate', getAggregatedNews);

  // Search endpoint
  app.get('/news-aggregator/search', searchNews);

  // Sources endpoint
  app.get('/news-aggregator/sources', getAvailableSources);

  // Health check endpoint
  app.get('/news-aggregator/health', getHealthStatus);

  // Cache management
  app.delete('/news-aggregator/cache', clearCache);

  // Debug endpoint
  app.get('/news-aggregator/debug', debugRSSFeed);

  // Register MCP tool info
  app.get('/tools/news-aggregator/info', c => {
    return c.json({
      name: 'news-aggregator',
      description: 'Aggregate news from multiple sources including RSS feeds and website scraping',
      parameters: {
        action: {
          type: 'string',
          description: 'The action to perform (rss, scrape, aggregate, search, sources)',
          required: true,
          enum: ['rss', 'scrape', 'aggregate', 'search', 'sources'],
        },
        source: {
          type: 'string',
          description: 'The news source',
          required: false,
          enum: [
            'google',
            'bbc',
            'npr',
            'reuters',
            'aljazeera',
            'cnbc',
            'yahoo-finance',
            'marketwatch',
            'investopedia',
            'seeking-alpha',
            'techcrunch',
            'the-verge',
            'hackernews',
            'ars-technica',
            'mit-tech-review',
            'coindesk',
            'cryptoslate',
            'bitcoin-magazine',
            'deutsche-welle',
            'france24',
            'japan-times',
            'scientific-american',
            'nature',
            'medical-news-today',
            'espn',
            'cnn-scraped',
            'bloomberg',
            'nytimes',
            'reuters-tech',
          ],
        },
        sources: {
          type: 'string',
          description:
            'Comma-separated list of sources for aggregation, or "all" to use all available sources',
          required: false,
        },
        category: {
          type: 'string',
          description: 'News category (technology, world, business, science, general)',
          required: false,
          enum: ['technology', 'world', 'business', 'science', 'general'],
        },
        keywords: {
          type: 'string',
          description: 'Comma-separated keywords for filtering/searching',
          required: false,
        },
        tickers: {
          type: 'string',
          description:
            'Comma-separated ticker symbols (e.g., "AAPL,MSFT,GOOGL") - will search for company names',
          required: false,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of articles to return',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/news-aggregator', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      let result;
      let sourceList;
      let keywordList;
      let searchSources;
      let searchResult;
      let filteredSources;
      let allArticles;
      let limitNum;

      switch (params.action) {
        case 'rss':
          if (!params.source) {
            return c.json({ error: 'Missing required parameter: source for RSS action' }, 400);
          }

          switch (params.source.toLowerCase()) {
            // General News
            case 'google':
              result = await newsAggregatorService.getGoogleNews(params.category);
              break;
            case 'bbc':
              result = await newsAggregatorService.getBBCNews(params.category);
              break;
            case 'npr':
              result = await newsAggregatorService.getNPRNews();
              break;
            case 'reuters':
              result = await newsAggregatorService.getReutersNews();
              break;
            case 'aljazeera':
              result = await newsAggregatorService.getAlJazeeraNews();
              break;

            // Finance & Business
            case 'cnbc':
              result = await newsAggregatorService.getCNBCNews();
              break;
            case 'yahoo-finance':
              result = await newsAggregatorService.getYahooFinanceNews();
              break;
            case 'marketwatch':
              result = await newsAggregatorService.getMarketWatchNews();
              break;
            case 'investopedia':
              result = await newsAggregatorService.getInvestopediaNews();
              break;
            case 'seeking-alpha':
              result = await newsAggregatorService.getSeekingAlphaNews();
              break;

            // Technology
            case 'techcrunch':
              result = await newsAggregatorService.getTechCrunchNews();
              break;
            case 'the-verge':
              result = await newsAggregatorService.getTheVergeNews();
              break;
            case 'hackernews':
              result = await newsAggregatorService.getHackerNews();
              break;
            case 'ars-technica':
              result = await newsAggregatorService.getArsTechnicaNews();
              break;
            case 'mit-tech-review':
              result = await newsAggregatorService.getMITTechReviewNews();
              break;

            // Cryptocurrency
            case 'coindesk':
              result = await newsAggregatorService.getCoinDeskNews();
              break;
            case 'cryptoslate':
              result = await newsAggregatorService.getCryptoSlateNews();
              break;
            case 'bitcoin-magazine':
              result = await newsAggregatorService.getBitcoinMagazineNews();
              break;

            // International
            case 'deutsche-welle':
              result = await newsAggregatorService.getDeutscheWelleNews();
              break;
            case 'france24':
              result = await newsAggregatorService.getFrance24News();
              break;
            case 'japan-times':
              result = await newsAggregatorService.getJapanTimesNews();
              break;

            // Science & Health
            case 'scientific-american':
              result = await newsAggregatorService.getScientificAmericanNews();
              break;
            case 'nature':
              result = await newsAggregatorService.getNatureNews();
              break;
            case 'medical-news-today':
              result = await newsAggregatorService.getMedicalNewsTodayNews();
              break;

            // Sports
            case 'espn':
              result = await newsAggregatorService.getESPNNews();
              break;

            default:
              return c.json({ error: `Unknown RSS source: ${params.source}` }, 400);
          }
          break;

        case 'scrape':
          if (!params.source) {
            return c.json({ error: 'Missing required parameter: source for scrape action' }, 400);
          }

          switch (params.source.toLowerCase()) {
            case 'cnn-scraped':
              result = await newsAggregatorService.getCNNScrapedNews();
              break;
            case 'bloomberg':
              result = await newsAggregatorService.getBloombergNews();
              break;
            case 'nytimes':
              result = await newsAggregatorService.getNYTimesNews();
              break;
            case 'reuters-tech':
              result = await newsAggregatorService.getReutersTechNews();
              break;
            default:
              return c.json({ error: `Unknown scrape source: ${params.source}` }, 400);
          }
          break;

        case 'aggregate':
          if (params.sources) {
            if (params.sources.toLowerCase() === 'all') {
              sourceList = newsAggregatorService.getAllSourceIds();
            } else {
              sourceList = params.sources.split(',').map(s => s.trim().toLowerCase());
            }
          } else {
            sourceList = ['google', 'hackernews', 'bbc'];
          }

          result = await newsAggregatorService.getAggregatedNews(sourceList, params.category);

          // Apply keyword filtering if provided
          if (params.keywords) {
            keywordList = params.keywords.split(',').map(k => k.trim());
            result.sources = result.sources.map(source => ({
              ...source,
              articles: newsAggregatorService.filterByKeywords(source.articles, keywordList),
            }));
            result.totalArticles = result.sources.reduce(
              (sum, source) => sum + source.articles.length,
              0
            );
          }
          break;

        case 'search': {
          if (!params.keywords && !params.tickers) {
            return c.json(
              { error: 'Missing required parameter: either keywords or tickers for search action' },
              400
            );
          }

          if (params.sources) {
            if (params.sources.toLowerCase() === 'all') {
              searchSources = newsAggregatorService.getAllSourceIds();
            } else {
              searchSources = params.sources.split(',').map(s => s.trim().toLowerCase());
            }
          } else {
            searchSources = ['google', 'hackernews', 'bbc'];
          }

          keywordList = [];
          let tickerInfo = [];

          // Handle tickers parameter
          if (params.tickers) {
            const tickerSymbols = params.tickers.split(',').map(t => t.trim().toUpperCase());

            for (const tickerSymbol of tickerSymbols) {
              const ticker = newsAggregatorService.findTicker(tickerSymbol);
              if (ticker) {
                // Clean up company name for search
                let companyName = ticker.name
                  .replace(
                    /\b(Inc\.?|Corp\.?|Corporation|Company|Co\.?|Ltd\.?|Limited|Class [A-Z]|Common Stock|Ordinary Shares|Rights|Warrants?)\b/gi,
                    ''
                  )
                  .replace(/\s+/g, ' ')
                  .trim();

                keywordList.push(companyName);
                tickerInfo.push({
                  symbol: tickerSymbol,
                  name: ticker.name,
                  searchTerm: companyName,
                  exchange: ticker.exchange,
                });
              } else {
                tickerInfo.push({
                  symbol: tickerSymbol,
                  name: null,
                  searchTerm: null,
                  exchange: null,
                  error: 'Ticker not found',
                });
              }
            }
          }

          // Handle keywords parameter
          if (params.keywords) {
            keywordList.push(...params.keywords.split(',').map(k => k.trim()));
          }

          if (keywordList.length === 0) {
            return c.json({ error: 'No valid search terms found' }, 400);
          }

          searchResult = await newsAggregatorService.getAggregatedNews(
            searchSources,
            params.category
          );

          // Filter by keywords
          filteredSources = searchResult.sources.map(source => ({
            ...source,
            articles: newsAggregatorService.filterByKeywords(source.articles, keywordList),
          }));

          // Flatten all articles and sort by date
          allArticles = [];
          filteredSources.forEach(source => {
            allArticles.push(
              ...source.articles.map(article => ({
                ...article,
                sourceCategory: source.category,
              }))
            );
          });

          // Sort by publication date (newest first)
          allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

          // Apply limit if specified
          if (params.limit) {
            limitNum = parseInt(params.limit, 10);
            if (!isNaN(limitNum) && limitNum > 0) {
              allArticles = allArticles.slice(0, limitNum);
            }
          }

          result = {
            keywords: keywordList,
            sources: searchSources,
            articles: allArticles,
            totalResults: allArticles.length,
            searchedAt: new Date().toISOString(),
          };

          // Include ticker information if tickers were provided
          if (params.tickers) {
            result.tickers = tickerInfo;
            result.tickerSymbols = params.tickers.split(',').map(t => t.trim().toUpperCase());
          }
          break;
        }

        case 'sources':
          result = newsAggregatorService.getAvailableSources();
          break;

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'news-aggregator',
        action: params.action,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error in news-aggregator tool:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/news-aggregator', c => {
    return c.json(metadata);
  });

  logger.info('News-aggregator module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering news-aggregator module');
  newsAggregatorService.clearCache();
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'News Aggregator Module',
  version: '1.0.0',
  description:
    'A comprehensive news aggregation module that parses RSS feeds and scrapes websites for real-time news',
  author: 'Your Name',
  tools: ['news-aggregator'],
  endpoints: [
    { path: '/news-aggregator', method: 'GET', description: 'Get module information' },
    {
      path: '/news-aggregator/rss',
      method: 'GET',
      description: 'Get RSS news with source parameter',
    },
    {
      path: '/news-aggregator/rss/:source',
      method: 'GET',
      description: 'Get RSS news from specific source',
    },
    {
      path: '/news-aggregator/scrape',
      method: 'GET',
      description: 'Get scraped news with source parameter',
    },
    {
      path: '/news-aggregator/scrape/:source',
      method: 'GET',
      description: 'Get scraped news from specific source',
    },
    {
      path: '/news-aggregator/aggregate',
      method: 'GET',
      description: 'Get aggregated news from multiple sources',
    },
    { path: '/news-aggregator/search', method: 'GET', description: 'Search news by keywords' },
    { path: '/news-aggregator/sources', method: 'GET', description: 'Get available news sources' },
    { path: '/news-aggregator/health', method: 'GET', description: 'Get module health status' },
    { path: '/news-aggregator/cache', method: 'DELETE', description: 'Clear news cache' },
    {
      path: '/tools/news-aggregator',
      method: 'POST',
      description: 'News aggregator tool endpoint',
    },
  ],
  categories: [
    'general',
    'world',
    'finance',
    'technology',
    'cryptocurrency',
    'international',
    'science',
    'health',
    'sports',
  ],
  sources: {
    rss: [
      'google',
      'bbc',
      'npr',
      'reuters',
      'aljazeera',
      'cnbc',
      'yahoo-finance',
      'marketwatch',
      'investopedia',
      'seeking-alpha',
      'techcrunch',
      'the-verge',
      'hackernews',
      'ars-technica',
      'mit-tech-review',
      'coindesk',
      'cryptoslate',
      'bitcoin-magazine',
      'deutsche-welle',
      'france24',
      'japan-times',
      'scientific-american',
      'nature',
      'medical-news-today',
      'espn',
    ],
    scrape: ['cnn-scraped', 'bloomberg', 'nytimes', 'reuters-tech'],
  },
};
