/**
 * News Aggregator Service
 *
 * Handles RSS feed parsing and website scraping for news aggregation
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { logger } from '../../../src/utils/logger.js';
import { readFileSync } from 'fs';
import { join } from 'path';

class NewsAggregatorService {
  constructor() {
    // Set up proxy configuration for all fetch operations (RSS and scraping)
    this.proxyUrl = process.env.WEBSHARE_PROXY;
    this.proxyAgent = null;

    if (this.proxyUrl) {
      try {
        const proxyURL = new URL(this.proxyUrl);
        this.proxyAgent =
          proxyURL.protocol === 'https:'
            ? new HttpsProxyAgent(this.proxyUrl)
            : new HttpProxyAgent(this.proxyUrl);
        logger.info(`Proxy configured for all requests: ${proxyURL.hostname}:${proxyURL.port}`);
      } catch (error) {
        logger.error('Invalid proxy URL, proceeding without proxy:', error);
        this.proxyAgent = null;
      }
    }

    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Load exchange data
    this.exchangeData = this.loadExchangeData();
  }

  /**
   * Load ticker data from exchange JSON files
   */
  loadExchangeData() {
    const exchanges = {};
    const exchangeFiles = [
      'nasdaq_full_tickers.json',
      'nyse_full_tickers.json',
      'amex_full_tickers.json',
    ];

    for (const file of exchangeFiles) {
      try {
        const exchangeName = file.replace('_full_tickers.json', '');
        const filePath = join(process.cwd(), 'docs', file);
        const data = JSON.parse(readFileSync(filePath, 'utf8'));
        exchanges[exchangeName] = data;
        logger.info(`Loaded ${data.length} tickers from ${exchangeName}`);
      } catch (error) {
        logger.error(`Error loading ${file}:`, error);
        exchanges[file.replace('_full_tickers.json', '')] = [];
      }
    }

    return exchanges;
  }

  /**
   * Find ticker information across all exchanges
   */
  findTicker(symbol) {
    const upperSymbol = symbol.toUpperCase();

    for (const [exchange, tickers] of Object.entries(this.exchangeData)) {
      const ticker = tickers.find(t => t.symbol === upperSymbol);
      if (ticker) {
        return {
          ...ticker,
          exchange: exchange.toUpperCase(),
        };
      }
    }

    return null;
  }

  /**
   * Get ticker information and related news
   */
  async getTickerNews(tickers) {
    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase());
    const results = [];

    for (const tickerSymbol of tickerList) {
      try {
        // Find ticker information
        const tickerInfo = this.findTicker(tickerSymbol);

        if (!tickerInfo) {
          results.push({
            symbol: tickerSymbol,
            error: 'Ticker not found in any exchange',
            tickerInfo: null,
            news: null,
          });
          continue;
        }

        // Extract company name for news search
        let companyName = tickerInfo.name;

        // Clean up company name for better search results
        companyName = companyName
          .replace(
            /\b(Inc\.?|Corp\.?|Corporation|Company|Co\.?|Ltd\.?|Limited|Class [A-Z]|Common Stock|Ordinary Shares|Rights|Warrants?)\b/gi,
            ''
          )
          .replace(/\s+/g, ' ')
          .trim();

        // Search for news using company name
        const newsResult = await this.searchNewsByKeywords(
          [companyName],
          ['yahoo-finance', 'cnbc', 'marketwatch'],
          10
        );

        results.push({
          symbol: tickerSymbol,
          tickerInfo,
          companyName,
          news: newsResult,
          error: null,
        });
      } catch (error) {
        logger.error(`Error processing ticker ${tickerSymbol}:`, error);
        results.push({
          symbol: tickerSymbol,
          error: error.message,
          tickerInfo: null,
          news: null,
        });
      }
    }

    return {
      tickers: results,
      totalTickers: tickerList.length,
      successfulLookups: results.filter(r => !r.error).length,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Search news by keywords with specific sources and limit
   */
  async searchNewsByKeywords(keywords, sources = ['google', 'hackernews', 'bbc'], limit = 5) {
    try {
      // Get aggregated news from specified sources
      const result = await this.getAggregatedNews(sources);

      // Filter by keywords
      const keywordRegex = new RegExp(keywords.join('|'), 'i');
      const filteredSources = result.sources.map(source => ({
        ...source,
        articles: source.articles.filter(
          article => keywordRegex.test(article.title) || keywordRegex.test(article.description)
        ),
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

      // Apply limit
      if (limit && limit > 0) {
        allArticles = allArticles.slice(0, limit);
      }

      return {
        keywords,
        sources,
        articles: allArticles,
        totalResults: allArticles.length,
        searchedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error in searchNewsByKeywords:', error);
      throw error;
    }
  }

  /**
   * Get cached data if available and not expired
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set data in cache
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Parse RSS feed from URL using custom fetch + XML parsing
   */
  async parseRSSFeed(url, source, category = 'General') {
    const cacheKey = `rss_${url}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      logger.info(`Returning cached RSS data for ${source}`);
      return cached;
    }

    try {
      logger.info(`Fetching RSS feed from ${url}`);

      // Fetch RSS XML without proxy (RSS feeds work better direct)
      const fetchOptions = {
        headers: {
          'User-Agent': 'curl/7.68.0',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
      };

      // Don't use proxy for RSS feeds - they work better with direct connections
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const $ = cheerio.load(xmlText, { xmlMode: true });

      const articles = [];

      // Parse RSS items (supports both RSS and Atom feeds)
      $('item, entry').each((index, element) => {
        const $item = $(element);

        // Extract title
        const title = $item.find('title').text().trim() || 'No title';

        // Extract description from multiple possible fields
        let description =
          $item.find('description').text() ||
          $item.find('summary').text() ||
          $item.find('content\\:encoded').text() ||
          $item.find('content').text() ||
          'No description available';

        // Clean up description - remove HTML tags and limit length
        if (description && description !== 'No description available') {
          description = description
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .substring(0, 300); // Limit to 300 characters

          if (description.length === 300) {
            description += '...';
          }
        }

        // Extract link
        let link = $item.find('link').text() || $item.find('link').attr('href') || '';

        // For Atom feeds, link might be in href attribute
        if (!link) {
          link = $item.find('link[rel="alternate"]').attr('href') || '';
        }

        // Extract publication date
        const pubDate =
          $item.find('pubDate').text() ||
          $item.find('published').text() ||
          $item.find('updated').text() ||
          '';

        let publishedAt;
        try {
          publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
        } catch {
          publishedAt = new Date().toISOString();
        }

        // Extract author/creator
        const author =
          $item.find('author').text() ||
          $item.find('dc\\:creator').text() ||
          $item.find('creator').text() ||
          source;

        if (title && link) {
          articles.push({
            title,
            description,
            link,
            publishedAt,
            source: author,
          });
        }
      });

      const result = {
        source,
        category,
        articles,
        fetchedAt: new Date().toISOString(),
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Error parsing RSS feed from ${url}:`, error);
      throw new Error(`Failed to parse RSS feed: ${error.message}`);
    }
  }

  /**
   * Scrape website using Cheerio
   */
  async scrapeWebsite(url, source, selectors, category = 'General') {
    const cacheKey = `scrape_${url}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      logger.info(`Returning cached scrape data for ${source}`);
      return cached;
    }

    try {
      logger.info(`Scraping website ${url}`);
      const fetchOptions = {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      };

      // Use proxy if available
      if (this.proxyAgent) {
        fetchOptions.agent = this.proxyAgent;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const articles = [];

      $(selectors.container).each((index, element) => {
        const $element = $(element);

        const title = $element.find(selectors.title).text().trim();
        const description = $element.find(selectors.description).text().trim();
        const link = $element.find(selectors.link).attr('href');
        const dateText = $element.find(selectors.date).text().trim();

        if (title && link) {
          // Ensure absolute URL
          const absoluteLink = link.startsWith('http') ? link : new URL(link, url).href;

          // Parse date or use current time
          let publishedAt;
          try {
            publishedAt = dateText ? new Date(dateText).toISOString() : new Date().toISOString();
          } catch {
            publishedAt = new Date().toISOString();
          }

          articles.push({
            title,
            description: description || 'No description available',
            link: absoluteLink,
            publishedAt,
            source,
          });
        }
      });

      const result = {
        source,
        category,
        articles,
        fetchedAt: new Date().toISOString(),
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Error scraping website ${url}:`, error);
      throw new Error(`Failed to scrape website: ${error.message}`);
    }
  }

  // ===== GENERAL NEWS RSS FEEDS =====

  /**
   * Get news from Google News RSS (Top Stories)
   */
  async getGoogleNews(category = 'general') {
    const url = 'https://news.google.com/rss';
    return this.parseRSSFeed(url, 'Google News', category);
  }

  /**
   * Get news from BBC World RSS
   */
  async getBBCNews(category = 'world') {
    const url = 'http://feeds.bbci.co.uk/news/world/rss.xml';
    return this.parseRSSFeed(url, 'BBC News', category);
  }

  /**
   * Get news from NPR RSS
   */
  async getNPRNews() {
    const url = 'https://feeds.npr.org/1001/rss.xml';
    return this.parseRSSFeed(url, 'NPR', 'General');
  }

  /**
   * Get news from Reuters RSS
   */
  async getReutersNews() {
    const url = 'https://www.reuters.com/arc/outboundfeeds/rss/';
    return this.parseRSSFeed(url, 'Reuters', 'World');
  }

  /**
   * Get news from Al Jazeera RSS
   */
  async getAlJazeeraNews() {
    const url = 'https://www.aljazeera.com/xml/rss/all.xml';
    return this.parseRSSFeed(url, 'Al Jazeera', 'World');
  }

  // ===== FINANCE & BUSINESS RSS FEEDS =====

  /**
   * Get news from CNBC RSS
   */
  async getCNBCNews() {
    const url = 'https://www.cnbc.com/id/100003114/device/rss/rss.html';
    return this.parseRSSFeed(url, 'CNBC', 'Finance');
  }

  /**
   * Get news from Yahoo Finance RSS
   */
  async getYahooFinanceNews() {
    const url = 'https://finance.yahoo.com/news/rssindex';
    return this.parseRSSFeed(url, 'Yahoo Finance', 'Finance');
  }

  /**
   * Get news from MarketWatch RSS
   */
  async getMarketWatchNews() {
    const url = 'https://feeds.marketwatch.com/marketwatch/topstories/';
    return this.parseRSSFeed(url, 'MarketWatch', 'Finance');
  }

  /**
   * Get news from Investopedia RSS
   */
  async getInvestopediaNews() {
    const url = 'https://www.investopedia.com/feedbuilder/feed/getfeed/?feedName=rss_headline';
    return this.parseRSSFeed(url, 'Investopedia', 'Finance');
  }

  /**
   * Get news from Seeking Alpha RSS
   */
  async getSeekingAlphaNews() {
    const url = 'https://seekingalpha.com/market_currents.xml';
    return this.parseRSSFeed(url, 'Seeking Alpha', 'Finance');
  }

  // ===== TECHNOLOGY RSS FEEDS =====

  /**
   * Get news from TechCrunch RSS
   */
  async getTechCrunchNews() {
    const url = 'https://techcrunch.com/feed/';
    return this.parseRSSFeed(url, 'TechCrunch', 'Technology');
  }

  /**
   * Get news from The Verge RSS
   */
  async getTheVergeNews() {
    const url = 'https://www.theverge.com/rss/index.xml';
    return this.parseRSSFeed(url, 'The Verge', 'Technology');
  }

  /**
   * Get news from Hacker News RSS
   */
  async getHackerNews() {
    const url = 'https://news.ycombinator.com/rss';
    return this.parseRSSFeed(url, 'Hacker News', 'Technology');
  }

  /**
   * Get news from Ars Technica RSS
   */
  async getArsTechnicaNews() {
    const url = 'http://feeds.arstechnica.com/arstechnica/index';
    return this.parseRSSFeed(url, 'Ars Technica', 'Technology');
  }

  /**
   * Get news from MIT Technology Review RSS
   */
  async getMITTechReviewNews() {
    const url = 'https://www.technologyreview.com/feed/';
    return this.parseRSSFeed(url, 'MIT Technology Review', 'Technology');
  }

  /**
   * Get news from Wired RSS
   */
  async getWiredNews() {
    const url = 'https://www.wired.com/feed/rss';
    return this.parseRSSFeed(url, 'Wired', 'Technology');
  }

  /**
   * Get news from Engadget RSS
   */
  async getEngadgetNews() {
    const url = 'https://www.engadget.com/rss.xml';
    return this.parseRSSFeed(url, 'Engadget', 'Technology');
  }

  /**
   * Get news from VentureBeat RSS
   */
  async getVentureBeatNews() {
    const url = 'https://venturebeat.com/feed/';
    return this.parseRSSFeed(url, 'VentureBeat', 'Technology');
  }

  // ===== CRYPTOCURRENCY RSS FEEDS =====

  /**
   * Get news from CoinDesk RSS
   */
  async getCoinDeskNews() {
    const url = 'https://www.coindesk.com/arc/outboundfeeds/rss/';
    return this.parseRSSFeed(url, 'CoinDesk', 'Cryptocurrency');
  }

  /**
   * Get news from CryptoSlate RSS
   */
  async getCryptoSlateNews() {
    const url = 'https://cryptoslate.com/feed/';
    return this.parseRSSFeed(url, 'CryptoSlate', 'Cryptocurrency');
  }

  /**
   * Get news from Bitcoin Magazine RSS
   */
  async getBitcoinMagazineNews() {
    const url = 'https://bitcoinmagazine.com/feed';
    return this.parseRSSFeed(url, 'Bitcoin Magazine', 'Cryptocurrency');
  }

  // ===== INTERNATIONAL RSS FEEDS =====

  /**
   * Get news from Deutsche Welle RSS
   */
  async getDeutscheWelleNews() {
    const url = 'https://rss.dw.com/rdf/rss-en-top';
    return this.parseRSSFeed(url, 'Deutsche Welle', 'International');
  }

  /**
   * Get news from France24 RSS
   */
  async getFrance24News() {
    const url = 'https://www.france24.com/en/rss';
    return this.parseRSSFeed(url, 'France24', 'International');
  }

  /**
   * Get news from Japan Times RSS
   */
  async getJapanTimesNews() {
    const url = 'https://www.japantimes.co.jp/feed/topstories/';
    return this.parseRSSFeed(url, 'Japan Times', 'International');
  }

  // ===== SCIENCE & HEALTH RSS FEEDS =====

  /**
   * Get news from Scientific American RSS
   */
  async getScientificAmericanNews() {
    const url = 'https://www.scientificamerican.com/platform/syndication/rss/';
    return this.parseRSSFeed(url, 'Scientific American', 'Science');
  }

  /**
   * Get news from Nature RSS
   */
  async getNatureNews() {
    const url = 'https://feeds.nature.com/nature/rss/current';
    return this.parseRSSFeed(url, 'Nature', 'Science');
  }

  /**
   * Get news from Medical News Today RSS
   */
  async getMedicalNewsTodayNews() {
    const url = 'https://www.medicalnewstoday.com/rss';
    return this.parseRSSFeed(url, 'Medical News Today', 'Health');
  }

  // ===== SPORTS RSS FEEDS =====

  /**
   * Get news from ESPN RSS
   */
  async getESPNNews() {
    const url = 'https://www.espn.com/espn/rss/news';
    return this.parseRSSFeed(url, 'ESPN', 'Sports');
  }

  // ===== SCRAPABLE WEBSITES =====

  /**
   * Scrape CNN
   */
  async getCNNScrapedNews() {
    const selectors = {
      container: '.container__headline, .cd__headline',
      title: '.container__headline-text, .cd__headline-text',
      description: '.container__headline-text, .cd__headline-text',
      link: 'a',
      date: '.container__date, .cd__date',
    };

    return this.scrapeWebsite('https://edition.cnn.com', 'CNN', selectors, 'General');
  }

  /**
   * Scrape Bloomberg
   */
  async getBloombergNews() {
    const selectors = {
      container: '[data-module="Story"]',
      title: '[data-module="Headline"]',
      description: '[data-module="Summary"]',
      link: 'a',
      date: '[data-module="Timestamp"]',
    };

    return this.scrapeWebsite('https://www.bloomberg.com', 'Bloomberg', selectors, 'Finance');
  }

  /**
   * Scrape New York Times
   */
  async getNYTimesNews() {
    const selectors = {
      container: 'article',
      title: 'h3',
      description: 'p',
      link: 'a',
      date: 'time',
    };

    return this.scrapeWebsite('https://www.nytimes.com', 'New York Times', selectors, 'General');
  }

  /**
   * Scrape Reuters Technology
   */
  async getReutersTechNews() {
    const selectors = {
      container: '[data-testid="MediaStoryCard"]',
      title: '[data-testid="Heading"]',
      description: '[data-testid="Body"]',
      link: 'a',
      date: 'time',
    };

    return this.scrapeWebsite(
      'https://www.reuters.com/technology/',
      'Reuters Technology',
      selectors,
      'Technology'
    );
  }

  /**
   * Get aggregated news from multiple sources
   */
  async getAggregatedNews(sources = ['google', 'hackernews', 'bbc'], category = 'technology') {
    const results = [];
    const errors = [];

    const sourceMap = {
      // General News
      google: () => this.getGoogleNews(category),
      bbc: () => this.getBBCNews(category),
      npr: () => this.getNPRNews(),
      aljazeera: () => this.getAlJazeeraNews(),

      // Finance & Business
      cnbc: () => this.getCNBCNews(),
      'yahoo-finance': () => this.getYahooFinanceNews(),
      marketwatch: () => this.getMarketWatchNews(),
      investopedia: () => this.getInvestopediaNews(),
      'seeking-alpha': () => this.getSeekingAlphaNews(),

      // Technology
      techcrunch: () => this.getTechCrunchNews(),
      'the-verge': () => this.getTheVergeNews(),
      hackernews: () => this.getHackerNews(),
      'ars-technica': () => this.getArsTechnicaNews(),
      'mit-tech-review': () => this.getMITTechReviewNews(),
      wired: () => this.getWiredNews(),
      engadget: () => this.getEngadgetNews(),
      venturebeat: () => this.getVentureBeatNews(),

      // Cryptocurrency
      coindesk: () => this.getCoinDeskNews(),
      cryptoslate: () => this.getCryptoSlateNews(),
      'bitcoin-magazine': () => this.getBitcoinMagazineNews(),

      // International
      'deutsche-welle': () => this.getDeutscheWelleNews(),
      france24: () => this.getFrance24News(),
      'japan-times': () => this.getJapanTimesNews(),

      // Science & Health
      'scientific-american': () => this.getScientificAmericanNews(),
      nature: () => this.getNatureNews(),
      'medical-news-today': () => this.getMedicalNewsTodayNews(),

      // Sports
      espn: () => this.getESPNNews(),

      // Scrapable Sites
      'cnn-scraped': () => this.getCNNScrapedNews(),
      bloomberg: () => this.getBloombergNews(),
      nytimes: () => this.getNYTimesNews(),
      'reuters-tech': () => this.getReutersTechNews(),
    };

    // Create promises for all sources to fetch in parallel
    const sourcePromises = sources.map(async source => {
      if (!sourceMap[source]) {
        return { source, error: `Unknown source: ${source}` };
      }

      try {
        const result = await sourceMap[source]();
        return { source, result };
      } catch (error) {
        logger.error(`Error fetching from ${source}:`, error);
        return { source, error: error.message };
      }
    });

    // Wait for all sources to complete (or fail)
    const settledResults = await Promise.allSettled(sourcePromises);

    // Process results
    settledResults.forEach(settled => {
      if (settled.status === 'fulfilled') {
        const { source, result, error } = settled.value;
        if (error) {
          errors.push(`${source}: ${error}`);
        } else {
          results.push(result);
        }
      } else {
        errors.push(`Promise rejected: ${settled.reason}`);
      }
    });

    return {
      sources: results,
      errors,
      totalArticles: results.reduce((sum, result) => sum + result.articles.length, 0),
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Filter articles by keywords
   */
  filterByKeywords(articles, keywords) {
    if (!keywords || keywords.length === 0) {
      return articles;
    }

    const keywordRegex = new RegExp(keywords.join('|'), 'i');

    return articles.filter(
      article => keywordRegex.test(article.title) || keywordRegex.test(article.description)
    );
  }

  /**
   * Get available news sources
   */
  getAvailableSources() {
    return [
      // General News RSS
      { id: 'google', name: 'Google News', type: 'rss', categories: ['general'] },
      { id: 'bbc', name: 'BBC News', type: 'rss', categories: ['world'] },
      { id: 'npr', name: 'NPR', type: 'rss', categories: ['general'] },
      { id: 'reuters', name: 'Reuters', type: 'rss', categories: ['world'] },
      { id: 'aljazeera', name: 'Al Jazeera', type: 'rss', categories: ['world'] },

      // Finance & Business RSS
      { id: 'cnbc', name: 'CNBC', type: 'rss', categories: ['finance'] },
      { id: 'yahoo-finance', name: 'Yahoo Finance', type: 'rss', categories: ['finance'] },
      { id: 'marketwatch', name: 'MarketWatch', type: 'rss', categories: ['finance'] },
      { id: 'investopedia', name: 'Investopedia', type: 'rss', categories: ['finance'] },
      { id: 'seeking-alpha', name: 'Seeking Alpha', type: 'rss', categories: ['finance'] },

      // Technology RSS
      { id: 'techcrunch', name: 'TechCrunch', type: 'rss', categories: ['technology'] },
      { id: 'the-verge', name: 'The Verge', type: 'rss', categories: ['technology'] },
      { id: 'hackernews', name: 'Hacker News', type: 'rss', categories: ['technology'] },
      { id: 'ars-technica', name: 'Ars Technica', type: 'rss', categories: ['technology'] },
      {
        id: 'mit-tech-review',
        name: 'MIT Technology Review',
        type: 'rss',
        categories: ['technology'],
      },
      { id: 'wired', name: 'Wired', type: 'rss', categories: ['technology'] },
      { id: 'engadget', name: 'Engadget', type: 'rss', categories: ['technology'] },
      { id: 'venturebeat', name: 'VentureBeat', type: 'rss', categories: ['technology'] },

      // Cryptocurrency RSS
      { id: 'coindesk', name: 'CoinDesk', type: 'rss', categories: ['cryptocurrency'] },
      { id: 'cryptoslate', name: 'CryptoSlate', type: 'rss', categories: ['cryptocurrency'] },
      {
        id: 'bitcoin-magazine',
        name: 'Bitcoin Magazine',
        type: 'rss',
        categories: ['cryptocurrency'],
      },

      // International RSS
      { id: 'deutsche-welle', name: 'Deutsche Welle', type: 'rss', categories: ['international'] },
      { id: 'france24', name: 'France24', type: 'rss', categories: ['international'] },
      { id: 'japan-times', name: 'Japan Times', type: 'rss', categories: ['international'] },

      // Science & Health RSS
      {
        id: 'scientific-american',
        name: 'Scientific American',
        type: 'rss',
        categories: ['science'],
      },
      { id: 'nature', name: 'Nature', type: 'rss', categories: ['science'] },
      { id: 'medical-news-today', name: 'Medical News Today', type: 'rss', categories: ['health'] },

      // Sports RSS
      { id: 'espn', name: 'ESPN', type: 'rss', categories: ['sports'] },

      // Scrapable Sites
      { id: 'cnn-scraped', name: 'CNN (Scraped)', type: 'scrape', categories: ['general'] },
      { id: 'bloomberg', name: 'Bloomberg', type: 'scrape', categories: ['finance'] },
      { id: 'nytimes', name: 'New York Times', type: 'scrape', categories: ['general'] },
      {
        id: 'reuters-tech',
        name: 'Reuters Technology',
        type: 'scrape',
        categories: ['technology'],
      },
    ];
  }

  /**
   * Get all available source IDs
   */
  getAllSourceIds() {
    return [
      // General News
      'google',
      'bbc',
      'npr',
      'reuters',
      'aljazeera',
      // Finance & Business
      'cnbc',
      'yahoo-finance',
      'marketwatch',
      'investopedia',
      'seeking-alpha',
      // Technology
      'techcrunch',
      'the-verge',
      'hackernews',
      'ars-technica',
      'mit-tech-review',
      'wired',
      'engadget',
      'venturebeat',
      // Cryptocurrency
      'coindesk',
      'cryptoslate',
      'bitcoin-magazine',
      // International
      'deutsche-welle',
      'france24',
      'japan-times',
      // Science & Health
      'scientific-american',
      'nature',
      'medical-news-today',
      // Sports
      'espn',
      // Scrapable Sites
      'cnn-scraped',
      'bloomberg',
      'nytimes',
      'reuters-tech',
    ];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('News aggregator cache cleared');
  }
}

export const newsAggregatorService = new NewsAggregatorService();
