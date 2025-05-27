/**
 * News Aggregator Controller
 *
 * Handles HTTP requests for news aggregation endpoints
 */

import { newsAggregatorService } from './service.js';
import { logger } from '../../../src/utils/logger.js';

/**
 * Get news from RSS feeds
 */
export async function getRSSNews(c) {
  try {
    const { source, category } = c.req.query();

    if (!source) {
      return c.json({ error: 'Source parameter is required' }, 400);
    }

    let result;

    switch (source.toLowerCase()) {
      // General News
      case 'google':
        result = await newsAggregatorService.getGoogleNews(category);
        break;
      case 'bbc':
        result = await newsAggregatorService.getBBCNews(category);
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
        return c.json({ error: `Unknown RSS source: ${source}` }, 400);
    }

    return c.json(result);
  } catch (error) {
    logger.error('Error in getRSSNews:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get news from scraped websites
 */
export async function getScrapedNews(c) {
  try {
    const { source } = c.req.query();

    if (!source) {
      return c.json({ error: 'Source parameter is required' }, 400);
    }

    let result;

    switch (source.toLowerCase()) {
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
        return c.json({ error: `Unknown scrape source: ${source}` }, 400);
    }

    return c.json(result);
  } catch (error) {
    logger.error('Error in getScrapedNews:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get aggregated news from multiple sources
 */
export async function getAggregatedNews(c) {
  try {
    const { sources, category, keywords } = c.req.query();

    // Parse sources parameter
    let sourceList = ['google', 'hackernews', 'bbc']; // default sources
    if (sources) {
      if (sources.toLowerCase() === 'all') {
        sourceList = newsAggregatorService.getAllSourceIds();
      } else {
        sourceList = sources.split(',').map(s => s.trim().toLowerCase());
      }
    }

    const result = await newsAggregatorService.getAggregatedNews(sourceList, category);

    // Apply keyword filtering if provided
    if (keywords) {
      const keywordList = keywords.split(',').map(k => k.trim());
      result.sources = result.sources.map(source => ({
        ...source,
        articles: newsAggregatorService.filterByKeywords(source.articles, keywordList),
      }));
      result.totalArticles = result.sources.reduce(
        (sum, source) => sum + source.articles.length,
        0
      );
    }

    // Add additional metadata
    result.successfulSources = result.sources.length;
    result.totalSources = sourceList.length;

    return c.json(result);
  } catch (error) {
    logger.error('Error in getAggregatedNews:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get available news sources
 */
export async function getAvailableSources(c) {
  try {
    const sources = newsAggregatorService.getAvailableSources();
    return c.json({
      sources,
      total: sources.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in getAvailableSources:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Search news articles by keywords
 */
export async function searchNews(c) {
  try {
    const { keywords, tickers, sources, category, limit } = c.req.query();

    if (!keywords && !tickers) {
      return c.json({ error: 'Either keywords or tickers parameter is required' }, 400);
    }

    // Parse sources parameter
    let sourceList = ['google', 'hackernews', 'bbc']; // default sources
    if (sources) {
      if (sources.toLowerCase() === 'all') {
        sourceList = newsAggregatorService.getAllSourceIds();
      } else {
        sourceList = sources.split(',').map(s => s.trim().toLowerCase());
      }
    }

    let keywordList = [];
    let tickerInfo = [];

    // Handle tickers parameter
    if (tickers) {
      const tickerSymbols = tickers.split(',').map(t => t.trim().toUpperCase());

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
    if (keywords) {
      keywordList.push(...keywords.split(',').map(k => k.trim()));
    }

    if (keywordList.length === 0) {
      return c.json({ error: 'No valid search terms found' }, 400);
    }

    // Get aggregated news
    const result = await newsAggregatorService.getAggregatedNews(sourceList, category);

    // Filter by keywords
    const filteredSources = result.sources.map(source => ({
      ...source,
      articles: newsAggregatorService.filterByKeywords(source.articles, keywordList),
    }));

    // Flatten all articles and sort by date
    let allArticles = [];
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
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        allArticles = allArticles.slice(0, limitNum);
      }
    }

    const response = {
      keywords: keywordList,
      sources: sourceList,
      articles: allArticles,
      totalResults: allArticles.length,
      errors: result.errors || [],
      successfulSources: result.sources.length,
      totalSources: sourceList.length,
      searchedAt: new Date().toISOString(),
    };

    // Include ticker information if tickers were provided
    if (tickers) {
      response.tickers = tickerInfo;
      response.tickerSymbols = tickers.split(',').map(t => t.trim().toUpperCase());
    }

    return c.json(response);
  } catch (error) {
    logger.error('Error in searchNews:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Clear news cache
 */
export async function clearCache(c) {
  try {
    newsAggregatorService.clearCache();
    return c.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in clearCache:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get news module health status
 */
export async function getHealthStatus(c) {
  try {
    // Test a simple RSS feed to check if the service is working
    const testResult = await newsAggregatorService.getHackerNews();

    return c.json({
      status: 'healthy',
      message: 'News aggregator service is operational',
      testArticles: testResult.articles.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in getHealthStatus:', error);
    return c.json(
      {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}

/**
 * Debug RSS feed to see raw data
 */
export async function debugRSSFeed(c) {
  try {
    const source = c.req.query('source') || 'yahoo-finance';

    let result;
    switch (source.toLowerCase()) {
      case 'yahoo-finance':
        result = await newsAggregatorService.getYahooFinanceNews();
        break;
      case 'cnbc':
        result = await newsAggregatorService.getCNBCNews();
        break;
      case 'marketwatch':
        result = await newsAggregatorService.getMarketWatchNews();
        break;
      default:
        return c.json({ error: `Unknown source: ${source}` }, 400);
    }

    return c.json({
      source,
      totalArticles: result.articles.length,
      sampleArticle: result.articles[0] || null,
      allArticles: result.articles,
    });
  } catch (error) {
    logger.error('Error in debugRSSFeed:', error);
    return c.json({ error: error.message }, 500);
  }
}
