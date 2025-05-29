/**
 * HTTP utilities for Craigslist scraping
 * Handles HTTP requests with retries, proxies, and caching
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { logger } from '../../../src/utils/logger.js';
import { getBrowser } from './browser.js';
import { getRandomUserAgent, delay } from './utils.js';

// Get proxy URL from environment variables
const PROXY_URL = process.env.WEBSHARE_PROXY;

// Simple in-memory cache for responses
const responseCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Enhanced fetch function with retries, user agent rotation, proxy support, and caching
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries
 * @param {number} initialDelayMs - Initial delay between retries
 * @returns {Promise<Response>} Response object
 */
export async function fetchWithRetry(url, options = {}, retries = 5, initialDelayMs = 2000) {
  let lastError;

  // Check cache first if it's a GET request (default)
  const cacheKey = url + (options.method || 'GET');
  if ((options.method || 'GET') === 'GET') {
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse && cachedResponse.timestamp > Date.now() - CACHE_TTL) {
      logger.debug(`Using cached response for ${url}`);
      return cachedResponse.response;
    }
  }

  // Add randomization to the delay to make it look more human
  const randomizeDelay = base => {
    return base + Math.floor(Math.random() * 2000);
  };

  // Create a proxy agent if PROXY_URL is available
  let proxyAgent = null;
  if (PROXY_URL) {
    try {
      proxyAgent = new HttpsProxyAgent(PROXY_URL);
      logger.info(`Using proxy: ${PROXY_URL.replace(/:[^:]*@/, ':****@')}`);
    } catch (error) {
      logger.error(`Error creating proxy agent: ${error.message}`);
    }
  } else {
    logger.warn(
      'No proxy URL found in environment variables. Set WEBSHARE_PROXY to avoid 403 errors.'
    );
  }

  // Implement exponential backoff for retries
  for (let i = 0; i < retries; i++) {
    try {
      // Add a random user agent if not provided
      if (!options.headers) {
        options.headers = {};
      }
      if (!options.headers['User-Agent']) {
        options.headers['User-Agent'] = getRandomUserAgent();
      }

      // Add a referrer to make the request look more legitimate
      if (!options.headers['Referer']) {
        const referrers = [
          'https://www.google.com/search?q=craigslist+listings',
          'https://www.bing.com/search?q=apartments+for+rent',
          'https://www.facebook.com/marketplace/category/propertyrentals',
          'https://www.reddit.com/r/apartments',
          'https://www.twitter.com/search?q=apartments',
        ];
        options.headers['Referer'] = referrers[Math.floor(Math.random() * referrers.length)];
      }

      // Add additional headers to make the request look more like a browser
      options.headers['Accept'] =
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
      options.headers['Accept-Language'] = 'en-US,en;q=0.9';
      options.headers['Connection'] = 'keep-alive';
      options.headers['Upgrade-Insecure-Requests'] = '1';
      options.headers['Cache-Control'] = 'max-age=0';
      options.headers['Sec-Fetch-Dest'] = 'document';
      options.headers['Sec-Fetch-Mode'] = 'navigate';
      options.headers['Sec-Fetch-Site'] = 'cross-site';
      options.headers['Sec-Fetch-User'] = '?1';
      options.headers['Sec-Ch-Ua'] =
        '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"';
      options.headers['Sec-Ch-Ua-Mobile'] = '?0';
      options.headers['Sec-Ch-Ua-Platform'] = '"Windows"';

      // Add a cookie header to simulate a returning visitor
      options.headers['Cookie'] =
        `cl_b=${Math.random().toString(36).substring(2, 15)}; cl_def_hp=newyork`;

      // Add proxy agent if available
      if (proxyAgent) {
        options.agent = proxyAgent;
      }

      // Add a delay before each retry with exponential backoff
      if (i > 0) {
        const exponentialDelay = initialDelayMs * Math.pow(2, i - 1); // Exponential backoff
        const randomDelay = randomizeDelay(exponentialDelay);
        logger.debug(`Waiting ${randomDelay}ms before retry ${i + 1}...`);
        await delay(randomDelay);
      }

      logger.debug(`Fetching ${url} with User-Agent: ${options.headers['User-Agent']}`);
      logger.debug(`Using proxy: ${proxyAgent ? 'Yes' : 'No'}`);

      // Log all request headers for debugging
      logger.debug(`Request headers: ${JSON.stringify(options.headers)}`);

      const response = await fetch(url, options);

      // If we get a 403, try again with a different user agent
      if (response.status === 403) {
        logger.warn(`Got 403 Forbidden from ${url}, retrying with different User-Agent...`);
        continue;
      }

      // If successful, cache the response
      if (response.ok && (options.method || 'GET') === 'GET') {
        // Clone the response before caching
        const clonedResponse = {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          text: async () => {
            const text = await response.text();
            return text;
          },
          json: async () => {
            const text = await response.text();
            return JSON.parse(text);
          },
        };

        responseCache.set(cacheKey, {
          response: clonedResponse,
          timestamp: Date.now(),
        });

        return clonedResponse;
      }

      return response;
    } catch (error) {
      lastError = error;
      logger.error(`Error fetching ${url}: ${error.message}, retrying...`);

      // Add a longer delay for network errors
      const networkErrorDelay = randomizeDelay(initialDelayMs * Math.pow(2, i));
      logger.debug(`Network error, waiting ${networkErrorDelay}ms before retry...`);
      await delay(networkErrorDelay);
    }
  }

  // Log the last error for debugging
  if (lastError) {
    logger.error(`Last error: ${lastError.message}`);
  }

  // Instead of throwing an error, return a mock response
  logger.warn(`Failed to fetch ${url} after ${retries} retries, returning mock response`);
  return {
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    text: async () => '<html><body><h1>Access Denied</h1></body></html>',
    json: async () => ({ error: 'Access Denied' }),
  };
}

/**
 * Fetch a URL using Puppeteer
 * @param {string} url - URL to fetch
 * @param {Object} options - Options for the fetch
 * @returns {Promise<Object>} Response-like object with text() method
 */
export async function fetchWithPuppeteer(url, options = {}) {
  try {
    // Check cache first
    const cacheKey = url + (options.method || 'GET');
    if ((options.method || 'GET') === 'GET') {
      const cachedResponse = responseCache.get(cacheKey);
      if (cachedResponse && cachedResponse.timestamp > Date.now() - CACHE_TTL) {
        logger.debug(`Using cached response for ${url}`);
        return cachedResponse.response;
      }
    }

    logger.info(`Fetching ${url} with Puppeteer`);

    // Get or create browser instance - this will throw if Chrome is not available
    const browser = await getBrowser();

    // Create a new page
    const page = await browser.newPage();

    // Set viewport to a common resolution
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent
    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);

    // Set extra HTTP headers to look more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      Referer: 'https://www.google.com/search?q=craigslist+chicago',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    });

    // Set cookies to appear more like a returning visitor
    await page.setCookie({
      name: 'cl_b',
      value: Math.random().toString(36).substring(2, 15),
      domain: '.craigslist.org',
      path: '/',
    });

    // Disable webdriver flag
    await page.evaluateOnNewDocument(() => {
      /* global navigator, window, Notification */
      // Overwrite the 'webdriver' property to make it undetectable
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Overwrite the plugins to include a normal set
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Overwrite the languages property
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Add a fake notification permission
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = parameters =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    });

    // Set proxy authentication if needed
    if (PROXY_URL && PROXY_URL.includes('@')) {
      const proxyAuth = PROXY_URL.split('@')[0].split('//')[1].split(':');
      if (proxyAuth.length === 2) {
        await page.authenticate({
          username: proxyAuth[0],
          password: proxyAuth[1],
        });
      }
    }

    // Navigate to the URL with more patience
    await page.goto(url, {
      waitUntil: 'networkidle2', // Wait until network is idle
      timeout: 60000, // Longer timeout (60 seconds)
    });

    // Wait for content to load with more patience
    await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});

    // Wait for AJAX content to load - try to wait for result-data elements
    try {
      await page.waitForSelector('.result-data, .cl-search-result, .result-row', {
        timeout: 10000,
      });
      logger.info('Found search result elements after AJAX load');
    } catch (waitError) {
      logger.warn('No search result elements found after waiting for AJAX');
    }

    // Handle different page types
    if (url.includes('/search/')) {
      logger.info('Implementing infinite scroll pagination for search results');
      const { implementInfiniteScroll } = await import('./pagination.js');
      await implementInfiniteScroll(page);
    } else {
      // For individual posting pages, just do basic scrolling
      // Add a longer delay to let any JavaScript execute and AJAX load
      await delay(5000);

      // Scroll down to load any lazy-loaded content
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });

      // Wait a bit more for any lazy-loaded content
      await delay(2000);

      // Scroll down more to trigger any additional lazy loading
      await page.evaluate(() => {
        window.scrollBy(0, 1000);
      });

      // Final wait for any additional AJAX content
      await delay(3000);
    }

    // Get the HTML content
    const content = await page.content();

    // Debug: Dump the HTML content to see what we're getting
    logger.info(`HTML content length: ${content.length} characters`);
    logger.info(`HTML content preview (first 1000 chars): ${content.substring(0, 1000)}`);

    // Also dump to a file for easier inspection
    try {
      const fs = await import('fs');
      const path = await import('path');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const debugFileName = `debug-html-${timestamp}.html`;

      // Try multiple possible debug directories
      const possiblePaths = [
        path.join(process.cwd(), 'debug', debugFileName),
        path.join('/tmp', debugFileName),
        path.join('.', debugFileName),
      ];

      let debugFilePath = null;
      for (const testPath of possiblePaths) {
        try {
          await fs.promises.mkdir(path.dirname(testPath), { recursive: true });
          debugFilePath = testPath;
          break;
        } catch (dirError) {
          logger.debug(`Cannot create directory for ${testPath}: ${dirError.message}`);
        }
      }

      if (debugFilePath) {
        await fs.promises.writeFile(debugFilePath, content, 'utf8');
        logger.info(`HTML content dumped to: ${debugFilePath}`);
      } else {
        logger.error('Could not find a writable directory for debug files');
      }
    } catch (writeError) {
      logger.error(`Failed to write debug HTML file: ${writeError.message}`);
    }

    // Close the page
    await page.close();

    // Create a response-like object
    const response = {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => content,
      json: async () => JSON.parse(content),
    };

    // Cache the response
    responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });

    return response;
  } catch (error) {
    // If it's already a PuppeteerError, rethrow it
    if (error.name === 'PuppeteerError') {
      throw error;
    }

    // If it's a Chrome-related error, convert it to a PuppeteerError
    if (error.message.includes('Chrome') || error.message.includes('browser')) {
      const { PuppeteerError } = await import('./browser.js');
      throw new PuppeteerError(
        'Chrome browser is required for Craigslist scraping. Please install Chrome with: npx puppeteer browsers install chrome'
      );
    }

    logger.error(`Error fetching with Puppeteer: ${error.message}`);

    // For other errors, throw a generic error
    throw new Error(`Error fetching with Puppeteer: ${error.message}`);
  }
}
