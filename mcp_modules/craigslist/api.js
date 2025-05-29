/**
 * Craigslist API utilities
 *
 * This file contains functions for interacting with Craigslist sites
 * and parsing the results.
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { logger } from '../../src/utils/logger.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

// Get proxy URL from environment variables
const PROXY_URL = process.env.WEBSHARE_PROXY;

// Configuration for parallel processing
const PARALLEL_CONFIG = {
  // Maximum number of concurrent city searches
  MAX_CONCURRENT_CITIES: parseInt(process.env.MAX_CONCURRENT_CITIES) || 10,
  // Maximum number of concurrent posting detail fetches
  MAX_CONCURRENT_DETAILS: parseInt(process.env.MAX_CONCURRENT_DETAILS) || 10,
  // Delay between batches (ms)
  BATCH_DELAY: parseInt(process.env.BATCH_DELAY) || 1000,
  // Delay between individual requests (ms)
  REQUEST_DELAY: parseInt(process.env.REQUEST_DELAY) || 500,
};

/**
 * Process items in parallel with configurable concurrency
 * @param {Array} items - Items to process
 * @param {Function} processor - Function to process each item
 * @param {number} maxConcurrent - Maximum concurrent operations
 * @param {number} batchDelay - Delay between batches in ms
 * @returns {Promise<Array>} Results array
 */
async function processInParallel(items, processor, maxConcurrent = 10, batchDelay = 1000) {
  const results = [];
  const total = items.length;

  logger.info(`Processing ${total} items with max concurrency: ${maxConcurrent}`);

  for (let i = 0; i < total; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    const batchNumber = Math.floor(i / maxConcurrent) + 1;
    const totalBatches = Math.ceil(total / maxConcurrent);

    logger.info(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

    try {
      // Process batch in parallel
      const batchPromises = batch.map(async (item, index) => {
        try {
          // Add a small staggered delay to avoid overwhelming the server
          const staggerDelay = index * (PARALLEL_CONFIG.REQUEST_DELAY / maxConcurrent);
          if (staggerDelay > 0) {
            await delay(staggerDelay);
          }

          const result = await processor(item);
          logger.debug(`Completed item ${i + index + 1}/${total}`);
          return result;
        } catch (error) {
          logger.error(`Error processing item ${i + index + 1}: ${error.message}`);
          return null; // Return null for failed items
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      logger.info(
        `Batch ${batchNumber}/${totalBatches} completed. Total results: ${results.filter(r => r !== null).length}/${results.length}`
      );

      // Add delay between batches (except for the last batch)
      if (i + maxConcurrent < total) {
        logger.debug(`Waiting ${batchDelay}ms before next batch...`);
        await delay(batchDelay);
      }
    } catch (error) {
      logger.error(`Error processing batch ${batchNumber}: ${error.message}`);
      // Continue with next batch even if current batch fails
    }
  }

  const successfulResults = results.filter(result => result !== null);
  logger.info(
    `Parallel processing completed: ${successfulResults.length}/${total} items successful`
  );

  return successfulResults;
}

// Array of user agents to rotate through
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
];

// Get a random user agent
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Add a delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Implement infinite scroll pagination for Craigslist search results
 * @param {Page} page - Puppeteer page instance
 */
async function implementInfiniteScroll(page) {
  let previousResultCount = 0;
  let currentResultCount = 0;
  let noNewResultsCount = 0;
  const maxScrollAttempts = 20; // Maximum number of scroll attempts
  const maxNoNewResultsAttempts = 3; // Stop after 3 attempts with no new results

  logger.info('Starting infinite scroll pagination');

  for (let scrollAttempt = 0; scrollAttempt < maxScrollAttempts; scrollAttempt++) {
    // Count current results
    try {
      currentResultCount = await page.evaluate(() => {
        /* eslint-disable no-undef */
        const selectors = [
          '.result-data',
          '.cl-search-result',
          '.result-row',
          'a[href*="/d/"][href*=".html"]',
        ];

        let totalResults = 0;
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            totalResults = elements.length;
            break;
          }
        }
        return totalResults;
      });

      logger.info(
        `Scroll attempt ${scrollAttempt + 1}: Found ${currentResultCount} results (previous: ${previousResultCount})`
      );

      // Check if we got new results
      if (currentResultCount > previousResultCount) {
        noNewResultsCount = 0; // Reset counter
        previousResultCount = currentResultCount;
      } else {
        noNewResultsCount++;
        logger.info(
          `No new results found (attempt ${noNewResultsCount}/${maxNoNewResultsAttempts})`
        );

        if (noNewResultsCount >= maxNoNewResultsAttempts) {
          logger.info('No new results after multiple attempts, stopping pagination');
          break;
        }
      }

      // Scroll to bottom of page
      await page.evaluate(() => {
        /* eslint-disable no-undef */
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for images to load
      logger.debug('Waiting for images to load...');
      await delay(2000);

      // Wait for any lazy-loaded content
      try {
        await page.waitForFunction(
          () => {
            /* eslint-disable no-undef */
            const images = document.querySelectorAll('img');
            return Array.from(images).every(img => img.complete || img.naturalHeight > 0);
          },
          { timeout: 5000 }
        );
        logger.debug('Images loaded successfully');
      } catch (imageWaitError) {
        logger.debug('Timeout waiting for images, continuing...');
      }

      // Additional scroll to trigger more content loading
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });

      // Wait for potential AJAX requests
      await delay(3000);

      // Check if we've reached the end of the page
      const isAtBottom = await page.evaluate(() => {
        /* eslint-disable no-undef */
        return window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
      });

      if (isAtBottom && noNewResultsCount > 0) {
        logger.info('Reached bottom of page with no new results, stopping pagination');
        break;
      }
    } catch (error) {
      logger.error(`Error during scroll attempt ${scrollAttempt + 1}: ${error.message}`);
      break;
    }
  }

  logger.info(`Infinite scroll completed. Final result count: ${currentResultCount}`);
  return currentResultCount;
}

// Simple in-memory cache for responses
const responseCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Puppeteer browser instance (lazy-loaded)
let browser = null;

/**
 * Get or create a Puppeteer browser instance
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
class PuppeteerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PuppeteerError';
    this.status = 500;
    this.code = 'CHROME_NOT_FOUND';
  }
}

async function getBrowser() {
  if (!browser) {
    logger.info('Launching Puppeteer browser with stealth mode');
    try {
      // Try to use Chromium first, then fall back to Chrome if available
      const chromiumPath = '/usr/bin/chromium';
      const chromePath = process.env.CHROME_PATH;

      logger.info(
        `Attempting to launch browser with paths: chromium=${chromiumPath}, chrome=${chromePath}`
      );

      // Enable proxy if needed
      const useProxy = true; // Set to true to enable proxy

      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-first-run',
        '--no-pings',
        '--no-zygote',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--ignore-ssl-errors',
        '--use-gl=swiftshader',
        '--use-angle=swiftshader-webgl',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      ];

      // Add proxy argument if enabled - using the format suggested by the user
      if (useProxy && PROXY_URL) {
        try {
          // Parse the proxy URL to get the components
          const proxyUrlObj = new URL(PROXY_URL);
          const protocol = proxyUrlObj.protocol.replace(':', '');
          const host = proxyUrlObj.hostname;
          const port = proxyUrlObj.port || '80';

          // Format the proxy argument correctly for Chromium
          args.push(`--proxy-server=${protocol}://${host}:${port}`);
          logger.info(`Using proxy server: ${protocol}://${host}:${port}`);
        } catch (proxyError) {
          logger.error(`Invalid proxy URL format: ${proxyError.message}`);
          logger.info('Running without proxy');
          // Continue without proxy if there's an error
        }
      } else {
        logger.info('Running without proxy');
      }

      // Force Chromium usage - prioritize Chromium paths over Chrome
      const possibleBrowserPaths = [
        '/usr/bin/chromium', // Standard Chromium installation
        '/usr/bin/chromium-browser', // Alternative Chromium name
        '/snap/bin/chromium', // Snap-installed Chromium
        '/usr/bin/chromium-stable', // Stable Chromium
        '/opt/chromium/chromium', // Custom Chromium installation
        chromiumPath, // Explicitly defined Chromium path
        chromePath, // Environment variable (fallback)
        '/usr/bin/google-chrome-stable', // Chrome as last resort
        '/usr/bin/google-chrome', // Chrome as last resort
      ].filter(Boolean);

      let executablePath = null;
      for (const path of possibleBrowserPaths) {
        try {
          const fs = await import('fs');
          await fs.promises.access(path);
          executablePath = path;
          logger.info(`Found browser at: ${path}`);
          break;
        } catch (error) {
          logger.debug(`Browser not found at: ${path}`);
        }
      }

      if (!executablePath) {
        throw new Error('No Chrome/Chromium browser found. Please install Chrome or Chromium.');
      }

      browser = await puppeteer.launch({
        headless: true, // Use true instead of 'new' for better compatibility
        args: args,
        executablePath: executablePath,
        ignoreDefaultArgs: ['--disable-extensions'],
        ignoreHTTPSErrors: true,
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        // Add extra options for stealth
        protocolTimeout: 240000,
      });

      logger.info(
        `Successfully launched browser using: ${chromiumPath || chromePath || 'default'}`
      );

      // Set up proxy authentication if needed and proxy is enabled
      // This is done AFTER browser launch, as per the user's example
      if (useProxy && PROXY_URL && PROXY_URL.includes('@')) {
        try {
          // Get all pages or create a new one
          const pages = await browser.pages();
          const page = pages[0] || (await browser.newPage());

          // Extract username and password from proxy URL
          const proxyUrlObj = new URL(PROXY_URL);
          const username = proxyUrlObj.username;
          const password = proxyUrlObj.password;

          if (username && password) {
            // Set authentication for the page
            await page.authenticate({
              username,
              password,
            });
            logger.info(`Set proxy authentication for user: ${username}:${password}`);
          }
        } catch (authError) {
          logger.error(`Error setting proxy authentication: ${authError.message}`);
          // Continue without authentication if there's an error
        }
      }

      // Handle browser disconnection
      browser.on('disconnected', () => {
        logger.info('Puppeteer browser disconnected');
        browser = null;
      });
    } catch (error) {
      logger.error(`Error launching Puppeteer browser: ${error.message}`);
      logger.error('To use Puppeteer, you need to install Chromium or Chrome');
      logger.error('For Chromium: apt-get install chromium-browser');
      logger.error('For Chrome: npx puppeteer browsers install chrome');
      // Throw a custom error with clear instructions
      throw new PuppeteerError(
        'Browser is required for Craigslist scraping. Please install Chromium or Chrome.'
      );
    }
  }
  return browser;
}

/**
 * Fetch a URL using Puppeteer
 * @param {string} url - URL to fetch
 * @param {Object} options - Options for the fetch
 * @returns {Promise<Object>} Response-like object with text() method
 */
async function fetchWithPuppeteer(url, options = {}) {
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

    // Implement infinite scroll pagination for search results pages
    if (url.includes('/search/')) {
      logger.info('Implementing infinite scroll pagination for search results');
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
      throw new PuppeteerError(
        'Chrome browser is required for Craigslist scraping. Please install Chrome with: npx puppeteer browsers install chrome'
      );
    }

    logger.error(`Error fetching with Puppeteer: ${error.message}`);

    // For other errors, throw a generic error
    throw new Error(`Error fetching with Puppeteer: ${error.message}`);
  }
}

// Enhanced fetch function with retries, user agent rotation, proxy support, and caching
async function fetchWithRetry(url, options = {}, retries = 5, initialDelayMs = 2000) {
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
 * Helper function to extract bike-specific attributes from posting body
 * @param {string} body - The posting body text
 * @param {Function} addAttributeFunc - Function to add attributes
 */
function extractBikeAttributesFromBody(body, addAttributeFunc) {
  logger.debug('Extracting bike-specific attributes from posting body');

  // Common bike attributes to look for
  const bikePatterns = [
    // Speeds
    { pattern: /(\d+)[\s-]?speed/i, key: 'speeds' },

    // Wheel size
    { pattern: /(\d+(?:\.\d+)?)[\s-]?inch\s+wheels?/i, key: 'wheel size' },
    { pattern: /(\d+(?:\.\d+)?)"?\s+wheels?/i, key: 'wheel size' },
    { pattern: /wheels?[\s:-]+(\d+(?:\.\d+)?)"?/i, key: 'wheel size' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:in|inch)(?:\s+diam(?:eter)?)?/i, key: 'wheel size' },
    { pattern: /(\d+)c\b/i, key: 'wheel size' }, // For 700c, 650c etc.

    // Frame size
    { pattern: /(\d+(?:\.\d+)?)"?\s+frame/i, key: 'frame size' },
    { pattern: /frame[\s:-]+(\d+(?:\.\d+)?)"?/i, key: 'frame size' },
    { pattern: /(\d+(?:\.\d+)?)\s*cm\s+frame/i, key: 'frame size' },
    { pattern: /frame[\s:-]+(\d+(?:\.\d+)?)\s*cm/i, key: 'frame size' },

    // Frame material
    {
      pattern:
        /(carbon|aluminum|aluminium|steel|titanium|ti|alloy|chromoly)(?:\s+(?:fiber|fibre|frame|alloy))?/i,
      key: 'frame material',
    },
    {
      pattern: /frame[\s:-]+(carbon|aluminum|aluminium|steel|titanium|ti|alloy|chromoly)/i,
      key: 'frame material',
    },

    // Bike type
    {
      pattern:
        /\b(road|racing|mountain|mtb|hybrid|cruiser|commuter|touring|gravel|fixie|fixed gear|single speed|bmx|kids|children|folding|electric|e-bike)\s+(?:bike|bicycle)\b/i,
      key: 'type',
    },
    {
      pattern:
        /\b(?:bike|bicycle)[\s:-]+(road|racing|mountain|mtb|hybrid|cruiser|commuter|touring|gravel|fixie|fixed gear|single speed|bmx|kids|children|folding|electric|e-bike)\b/i,
      key: 'type',
    },

    // Brand
    {
      pattern:
        /\b(schwinn|trek|specialized|giant|cannondale|raleigh|diamondback|jamis|bianchi|fuji|gt|kona|scott|cervelo|felt|santa cruz|surly|salsa|marin|norco|pinarello|colnago|de rosa|look|orbea|cube|canyon|focus|ghost|lapierre|merida|ridley|rose|wilier|yeti|intense|pivot|ibis|devinci|rocky mountain|transition|commencal|nukeproof|mondraker|propain|yt|canyon|evil|guerrilla gravity|pole|nicolai|liteville|last|alutech|banshee|knolly)\b/i,
      key: 'brand',
    },

    // Condition
    {
      pattern: /\b(new|like new|excellent|good|fair|poor)\s+(?:condition|shape)\b/i,
      key: 'condition',
    },
    { pattern: /condition[\s:-]+(new|like new|excellent|good|fair|poor)/i, key: 'condition' },

    // Gender
    { pattern: /\b(men'?s|women'?s|unisex|boys'?|girls'?)\s+(?:bike|bicycle)\b/i, key: 'gender' },

    // Components
    {
      pattern:
        /(shimano|sram|campagnolo|campy)\s+([\w\s\d-]+)(?:\s+(?:groupset|group|drivetrain|components))?/i,
      key: 'components',
    },

    // Brakes
    {
      pattern: /\b(disc|rim|v-brake|cantilever|hydraulic|mechanical)[\s-]?brakes\b/i,
      key: 'brakes',
    },
    { pattern: /brakes[\s:-]+(disc|rim|v-brake|cantilever|hydraulic|mechanical)/i, key: 'brakes' },

    // Suspension
    { pattern: /\b(front|rear|full|no)[\s-]?suspension\b/i, key: 'suspension' },
    { pattern: /suspension[\s:-]+(front|rear|full|none)/i, key: 'suspension' },

    // Year
    { pattern: /\b(19\d\d|20\d\d)\s+(?:model|year)?\b/i, key: 'year' },
    { pattern: /model[\s:-]+(19\d\d|20\d\d)/i, key: 'year' },

    // Size (S/M/L/XL)
    { pattern: /\bsize[\s:-]+(xs|s|sm|m|med|medium|ml|l|lg|large|xl|xxl)\b/i, key: 'size' },
    { pattern: /\b(xs|small|medium|large|xl|xxl)[\s-]?(?:size|frame)?\b/i, key: 'size' },

    // Specific model
    { pattern: /\bmodel[\s:-]+([a-z0-9][\w\s\d-]{2,})/i, key: 'model' },
  ];

  // Process each pattern
  for (const { pattern, key } of bikePatterns) {
    const matches = body.match(pattern);
    if (matches) {
      // For most patterns, the first capture group is what we want
      const value = matches[1] || matches[0];
      logger.debug(`Found bike attribute in body: ${key} = ${value}`);

      // Format the value appropriately based on the key
      let formattedValue = value;

      // Add appropriate units for measurements
      if (
        key === 'wheel size' &&
        !value.includes('in') &&
        !value.includes('"') &&
        !value.toLowerCase().includes('c')
      ) {
        formattedValue = `${value}"`;
      } else if (
        key === 'frame size' &&
        !value.includes('in') &&
        !value.includes('"') &&
        !value.includes('cm')
      ) {
        formattedValue = `${value}"`;
      }

      // Capitalize brand names
      if (key === 'brand') {
        formattedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }

      // Add the attribute
      addAttributeFunc(key, formattedValue);
    }
  }

  // Look for antique/vintage indicators
  if (body.match(/\b(antique|vintage|classic|old|retro)\b/i)) {
    addAttributeFunc('vintage', true);
  }
}

/**
 * Base URL for Craigslist sites
 * @type {string}
 */
const BASE_URL = 'https://{city}.craigslist.org';

/**
 * Search Craigslist in a specific city
 *
 * @param {string} city - Craigslist city site code
 * @param {Object} options - Search options
 * @param {string} options.category - Category code to search in
 * @param {string} options.query - Search query
 * @param {Object} options.filters - Additional filters
 * @returns {Promise<Array>} Search results
 */
export async function searchCity(city, options) {
  try {
    const { category = 'sss', query = '', filters = {}, fetchDetails = false } = options;

    // Build the search URL
    let url = `${BASE_URL.replace('{city}', city)}/search/${category}`;

    // Add query parameters
    const params = new URLSearchParams();
    if (query) {
      params.append('query', query);
    }

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const searchUrl = `${url}?${params.toString()}`;
    logger.info(`Searching Craigslist: ${searchUrl}`);

    // Fetch the search results with Puppeteer first
    logger.info(`Searching Craigslist with Puppeteer: ${searchUrl}`);

    let response;
    let html;

    try {
      // Use Puppeteer to fetch search results - will throw if Chrome is not available
      response = await fetchWithPuppeteer(searchUrl);
      logger.info(`Puppeteer fetch completed for: ${searchUrl}`);
    } catch (puppeteerError) {
      logger.error(`Puppeteer fetch failed for ${searchUrl}: ${puppeteerError.message}`);
      throw puppeteerError;
    }

    if (response.ok) {
      html = await response.text();

      // Debug: Dump the search results HTML
      logger.info(`Search results HTML length: ${html.length} characters`);
      logger.info(`Search results HTML preview (first 1000 chars): ${html.substring(0, 1000)}`);

      // Also dump search results to a file for easier inspection
      try {
        const fs = await import('fs');
        const path = await import('path');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const debugFileName = `debug-search-${city}-${category}-${timestamp}.html`;

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
          await fs.promises.writeFile(debugFilePath, html, 'utf8');
          logger.info(`Search results HTML dumped to: ${debugFilePath}`);
        } else {
          logger.error('Could not find a writable directory for debug files');
        }
      } catch (writeError) {
        logger.error(`Failed to write debug search HTML file: ${writeError.message}`);
      }

      // Check if the HTML contains actual search results - be more lenient
      if (
        html.includes('result-row') ||
        html.includes('gallery-card') ||
        html.includes('cl-search-result') ||
        html.includes('result-info') ||
        html.includes('result-title') ||
        html.includes('result-image') ||
        html.includes('result-meta') ||
        html.includes('result-price') ||
        html.includes('result-date') ||
        html.includes('result-hood') ||
        html.includes('search-results') ||
        html.includes('search-result') ||
        html.includes('searchresult') ||
        html.includes('rows') ||
        html.includes('row') ||
        html.includes('posting') ||
        html.includes('postings') ||
        html.includes('gallery') ||
        html.includes('card') ||
        html.includes('title') ||
        html.includes('price') ||
        html.includes('date') ||
        html.includes('location') ||
        html.includes('href="/') ||
        html.includes('href="https://') ||
        html.includes('.html"') ||
        html.includes('/d/')
      ) {
        logger.info(`Successfully fetched search results with Puppeteer: ${searchUrl}`);
      } else {
        logger.warn(`Puppeteer fetch returned empty or invalid search results for ${searchUrl}`);
        // Don't throw an error, just continue with empty results
        logger.info(`Continuing with empty results for ${searchUrl}`);
        return [];
      }
    }

    // If the response is OK, parse the results
    if (response.ok) {
      // Add a longer random delay to avoid rate limiting (between 2000ms and 5000ms)
      const randomDelay = 2000 + Math.floor(Math.random() * 3000);
      logger.debug(`Adding delay of ${randomDelay}ms to avoid rate limiting`);
      await delay(randomDelay);

      const html = await response.text();
      const results = await parseSearchResults(html, city, category, query, fetchDetails);

      // If we got results, deduplicate and return them
      if (results.length > 0) {
        const deduplicatedResults = deduplicateByTitle(results);
        if (deduplicatedResults.length !== results.length) {
          logger.info(
            `Deduplicated ${results.length} results to ${deduplicatedResults.length} unique listings for city ${city}`
          );
        }
        return deduplicatedResults;
      }
    }

    // If direct search failed or returned no results, try an alternative approach
    logger.info('Direct search failed or returned no results, trying alternative approach');

    // Try to extract links directly from the HTML as a fallback
    logger.debug('Attempting to extract links directly from HTML');

    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Look for any links that might be listings
      const allLinks = document.querySelectorAll('a[href*=".html"], a[href*="/d/"]');
      logger.debug(`Found ${allLinks.length} potential listing links in HTML`);

      if (allLinks.length > 0) {
        // Create mock results from the links
        const mockResults = [];

        // Process only the first 20 links to avoid rate limiting
        const linksToProcess = Array.from(allLinks).slice(0, 20);

        for (const link of linksToProcess) {
          const href = link.getAttribute('href');
          if (href && (href.includes('.html') || href.includes('/d/'))) {
            // Build the full URL
            let fullUrl = href;
            if (href.startsWith('/')) {
              fullUrl = `https://${city}.craigslist.org${href}`;
            } else if (!href.startsWith('http')) {
              fullUrl = `https://${city}.craigslist.org/${href}`;
            }

            // Extract title from the link text
            const title = link.textContent.trim();

            // Look for price near the link
            let price = null;
            const parentElement = link.parentElement;
            if (parentElement) {
              const priceElement = parentElement.querySelector('.price, [class*="price"]');
              if (priceElement) {
                price = priceElement.textContent.trim();
              }
            }

            // Create a basic result
            const mockResult = {
              id: Math.random().toString(36).substring(2, 15),
              title: title || 'Listing',
              url: fullUrl,
              price: price,
              date: new Date().toISOString(),
              location: null,
              description: title || 'Listing',
              attributes: {},
              imageUrl: null,
              images: [],
              city,
            };

            mockResults.push(mockResult);
          }
        }

        if (mockResults.length > 0) {
          logger.info(`Extracted ${mockResults.length} results directly from HTML links`);
          return mockResults;
        }
      }
    } catch (error) {
      logger.error(`Error extracting links from HTML: ${error.message}`);
    }

    // For apartment listings, we can try to get recent listings from the main page
    if (category === 'apa' || category === 'hhh' || category === 'bik' || category === 'bia') {
      const mainPageUrl = `${BASE_URL.replace('{city}', city)}/${category}`;
      logger.info(`Fetching main page: ${mainPageUrl}`);

      const mainPageResponse = await fetchWithRetry(mainPageUrl, {});

      if (mainPageResponse.ok) {
        // Add a longer random delay to avoid rate limiting
        const randomDelay = 2000 + Math.floor(Math.random() * 3000);
        logger.debug(`Adding delay of ${randomDelay}ms to avoid rate limiting`);
        await delay(randomDelay);

        const mainPageHtml = await mainPageResponse.text();

        // Parse the main page to extract recent listings
        const dom = new JSDOM(mainPageHtml);
        const document = dom.window.document;

        // Look for listing links
        const listingLinks = Array.from(document.querySelectorAll('a[href*="/apa/d/"]'));
        logger.debug(`Found ${listingLinks.length} listing links on main page`);

        if (listingLinks.length > 0) {
          // Create mock results from the links
          const mockResults = [];

          // Process only the first 10 links to avoid rate limiting
          const linksToProcess = listingLinks.slice(0, 10);

          for (const link of linksToProcess) {
            const href = link.getAttribute('href');
            if (href) {
              // Build the full URL
              let fullUrl = href;
              if (href.startsWith('/')) {
                fullUrl = `https://${city}.craigslist.org${href}`;
              }

              // Extract title from the link text
              const title = link.textContent.trim();

              // Create a basic result
              const mockResult = {
                id: Math.random().toString(36).substring(2, 15),
                title: title || 'Apartment Listing',
                url: fullUrl,
                price: null,
                date: new Date().toISOString(),
                location: null,
                description: title || 'Apartment Listing',
                attributes: {},
                imageUrl: null,
                images: [],
                city,
              };

              // If fetchDetails is true, get the full details
              if (fetchDetails) {
                try {
                  // Add a delay to avoid rate limiting
                  await delay(2000 + Math.floor(Math.random() * 3000));

                  const details = await getPostingDetails(fullUrl);
                  if (details) {
                    // Merge the details with the mock result
                    mockResult.title = details.title || mockResult.title;
                    mockResult.price = details.price || mockResult.price;
                    mockResult.description = details.description || mockResult.description;
                    mockResult.images = details.images || mockResult.images;
                    mockResult.imageUrl =
                      details.images && details.images.length > 0 ? details.images[0] : null;
                    mockResult.attributes = details.attributes || mockResult.attributes;
                    mockResult.location = details.location?.name || mockResult.location;
                  }
                } catch (error) {
                  logger.error(`Error fetching details for ${fullUrl}: ${error.message}`);
                }
              }

              // Apply filters if needed
              let includeResult = true;

              if (filters.min_price && mockResult.price) {
                const price = extractNumericPrice(mockResult.price);
                if (price && price < filters.min_price) {
                  includeResult = false;
                }
              }

              if (filters.max_price && mockResult.price) {
                const price = extractNumericPrice(mockResult.price);
                if (price && price > filters.max_price) {
                  includeResult = false;
                }
              }

              if (filters.bedrooms && mockResult.attributes && mockResult.attributes.bedrooms) {
                const bedrooms = parseFloat(mockResult.attributes.bedrooms);
                if (bedrooms && bedrooms < filters.bedrooms) {
                  includeResult = false;
                }
              }

              if (filters.bathrooms && mockResult.attributes && mockResult.attributes.bathrooms) {
                const bathrooms = parseFloat(mockResult.attributes.bathrooms);
                if (bathrooms && bathrooms < filters.bathrooms) {
                  includeResult = false;
                }
              }

              if (filters.has_image && (!mockResult.images || mockResult.images.length === 0)) {
                includeResult = false;
              }

              if (includeResult) {
                mockResults.push(mockResult);
              }
            }
          }

          return mockResults;
        }
      }
    }

    // If all approaches failed, return an empty array
    logger.warn('All search approaches failed, returning empty results');
    return [];
  } catch (error) {
    logger.error(`Error searching Craigslist city ${city}: ${error.message}`);
    return [];
  }
}

/**
 * Parse Craigslist search results HTML
 *
 * @param {string} html - HTML content to parse
 * @param {string} city - City code for building URLs
 * @param {string} category - Category code
 * @param {string} query - Search query
 * @param {boolean} [fetchDetails=false] - Whether to fetch detailed attributes for each result
 * @returns {Array} Parsed search results
 */
async function parseSearchResults(html, city, category, query, fetchDetails = false) {
  // Log the first 500 characters of the HTML for debugging
  logger.debug(`Parsing search results HTML (first 500 chars): ${html.substring(0, 500)}...`);

  // Check if this is a gallery view page
  const isGalleryView = html.includes('cl-search-view-mode-gallery');
  if (isGalleryView) {
    logger.info('Detected gallery view search results page');
  }

  // Additional debugging: log key indicators (updated for new Craigslist structure)
  const indicators = [
    'result-data',
    'cl-app-anchor',
    'cl-search-anchor',
    'label',
    'meta', // New structure
    'result-row',
    'gallery-card',
    'cl-search-result',
    'cl-search-view-mode-gallery', // Gallery view indicator
    'result-info',
    'result-title', // Legacy
    'result-image',
    'result-meta',
    'result-price',
    'result-date',
    'result-hood', // Legacy
    'search-results',
    'search-result',
    'searchresult',
    'rows',
    'row',
    'posting',
    'postings',
    'gallery',
    'card',
    'title',
    'price',
    'priceinfo', // Gallery view price selector
    'date',
    'location',
    'href="/',
    'href="https://',
    '.html"',
    '/d/',
  ];

  const foundIndicators = indicators.filter(indicator => html.includes(indicator));
  logger.info(`Found ${foundIndicators.length} indicators in HTML: ${foundIndicators.join(', ')}`);

  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // First, extract detailed information about each listing from the HTML
    // We'll collect as much data as possible to help with matching
    const listingDetails = [];

    // Look for the main container of search results
    const resultContainers = [
      'ul.rows', // Common container for listings
      'div.search-results', // Another common container
      'div.content', // Generic content container
      'div#search-results', // ID-based container
      'div.gallery-card-wrap', // Gallery view container
      'div.cl-search-result', // Another possible container
      'div.result-wrap', // Another possible container
      'body', // Fallback to body if no specific container found
    ];

    let mainContainer = null;
    for (const selector of resultContainers) {
      const container = document.querySelector(selector);
      if (container) {
        mainContainer = container;
        break;
      }
    }

    if (!mainContainer) {
      logger.error('Could not find main container for search results');
      mainContainer = document.body; // Fallback to body
    }

    // Look for listing elements within the main container - prioritize new Craigslist structure
    const listingSelectors = [
      '.result-data', // New Craigslist structure (2024+) - PRIORITY
      'div.result-data', // Explicit div selector for result-data
      '.cl-search-result', // Alternative new format (includes gallery view)
      'div.cl-search-result.cl-search-view-mode-gallery', // Explicit gallery view results
      'li.result-row', // Traditional format (legacy)
      'li.cl-static-search-result', // Another format (legacy)
      'div.result-info', // Result info containers (legacy)
      'div.gallery-card', // Gallery cards (legacy)
      'div.result', // Generic results (legacy)
      'a[href*="/d/"][href*=".html"]', // Direct links to listings (must have both /d/ and .html)
      'a[href*="/bik/d/"][href*=".html"]', // Links to bike listings with proper format
      'a[href*="/bia/d/"][href*=".html"]', // Links to bike accessories with proper format
      'a[href*="/apa/d/"][href*=".html"]', // Links to apartments with proper format
      'a[href*="/hhh/d/"][href*=".html"]', // Links to housing with proper format
      'a[href*="/sss/d/"][href*=".html"]', // Links to for sale by owner with proper format
      '.result a[href*=".html"]', // Links within result elements
      '.card a[href*=".html"]', // Links within card elements
      '.gallery-card a[href*=".html"]', // Links within gallery card elements
      '.search-result a[href*=".html"]', // Links within search result elements
      '.posting a[href*=".html"]', // Links within posting elements
      '.row a[href*=".html"]', // Links within row elements
      'a[href*=".html"]', // Any link to an HTML page (fallback)
    ];

    // Try each selector to find listing elements
    let listingElements = [];
    for (const selector of listingSelectors) {
      const elements = mainContainer.querySelectorAll(selector);
      if (elements.length > 0) {
        listingElements = Array.from(elements);
        logger.info(`Found ${elements.length} listing elements using selector: ${selector}`);

        // Debug: Show sample of what we found
        if (elements.length > 0) {
          const sampleElement = elements[0];
          logger.info(`Sample element HTML: ${sampleElement.outerHTML.substring(0, 200)}...`);
          logger.info(
            `Sample element text content: ${sampleElement.textContent.substring(0, 100)}...`
          );
        }
        break;
      } else {
        logger.debug(`No elements found for selector: ${selector}`);
      }
    }

    // If we still don't have listing elements, try a more aggressive approach
    if (listingElements.length === 0) {
      // Look for any elements that might contain listing information
      const allLinks = document.querySelectorAll('a[href*=".html"]');
      listingElements = Array.from(allLinks);
      logger.debug(`Fallback: Found ${listingElements.length} links ending with .html`);
    }

    // Extract detailed information from each listing element
    listingElements.forEach((element, index) => {
      try {
        // Initialize listing details
        const details = {
          index,
          url: '',
          title: '',
          price: '',
          location: '',
          imageUrl: '',
          dateText: '',
          postId: '',
        };

        // Extract URL - prioritize new Craigslist structure, then fallback to legacy
        let linkElement =
          element.tagName === 'A'
            ? element
            : element.querySelector(
                '.cl-app-anchor, .cl-search-anchor, a[href*=".html"], a[href*="/d/"]'
              );
        if (linkElement) {
          const href = linkElement.getAttribute('href');
          if (href) {
            // Handle relative URLs
            if (href.startsWith('/')) {
              details.url = `https://${city}.craigslist.org${href}`;
            } else if (!href.startsWith('http')) {
              details.url = `https://${city}.craigslist.org/${href}`;
            } else {
              details.url = href;
            }

            // Try to extract post ID from URL - multiple patterns
            // Pattern 1: /d/title/7849519172.html (ID before .html) - MOST COMMON
            let postIdMatch = details.url.match(/\/d\/[^/]+\/(\d{7,})\.html/);
            if (postIdMatch && postIdMatch[1]) {
              details.postId = postIdMatch[1];
              logger.debug(
                `Extracted post ID from URL (pattern 1 - /d/title/ID.html): ${details.postId}`
              );
            }
            // Pattern 2: /7849519172.html (direct ID at end)
            else {
              postIdMatch = details.url.match(/\/(\d{7,})\.html$/);
              if (postIdMatch && postIdMatch[1]) {
                details.postId = postIdMatch[1];
                logger.debug(
                  `Extracted post ID from URL (pattern 2 - /ID.html): ${details.postId}`
                );
              }
            }
            // Pattern 3: Any numeric ID in the URL that's 7+ digits (likely a post ID)
            if (!details.postId && details.url.match(/\/\d{7,}/)) {
              postIdMatch = details.url.match(/\/(\d{7,})(?:\/|\.html|$)/);
              if (postIdMatch && postIdMatch[1]) {
                details.postId = postIdMatch[1];
                logger.debug(
                  `Extracted post ID from URL (pattern 3 - any 7+ digit number): ${details.postId}`
                );
              }
            }

            // If we still don't have a post ID, try to find it in the data attributes
            if (!details.postId) {
              const dataId = linkElement.getAttribute('data-id');
              if (dataId && /^\d{7,}$/.test(dataId)) {
                details.postId = dataId;
                logger.debug(`Extracted post ID from data-id attribute: ${details.postId}`);
              }
            }

            // If we still don't have a post ID, try to find it in other attributes
            if (!details.postId) {
              // Check all attributes for potential post IDs
              const attrs = linkElement.attributes;
              for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                const match = attr.value.match(/(\d{7,})/);
                if (match && match[1]) {
                  details.postId = match[1];
                  logger.debug(`Extracted post ID from attribute ${attr.name}: ${details.postId}`);
                  break;
                }
              }
            }

            // If we still don't have a post ID, try to find it in the link text
            if (!details.postId) {
              const linkText = linkElement.textContent;
              const match = linkText.match(/(\d{7,})/);
              if (match && match[1]) {
                details.postId = match[1];
                logger.debug(`Extracted post ID from link text: ${details.postId}`);
              }
            }

            // If we still don't have a post ID, try to find it in the parent element
            if (!details.postId && linkElement.parentElement) {
              const parentHTML = linkElement.parentElement.innerHTML;
              const match = parentHTML.match(
                /data-pid="(\d{7,})"|data-id="(\d{7,})"|id="(\d{7,})"|postingid="(\d{7,})"/
              );
              if (match) {
                details.postId = match[1] || match[2] || match[3] || match[4];
                logger.debug(`Extracted post ID from parent element: ${details.postId}`);
              }
            }
          }
        }

        // Extract title - updated for new Craigslist structure
        const titleSelectors = [
          '.label', // New Craigslist structure - title is in .label span
          '.cl-app-anchor .label', // More specific selector for new structure
          '.posting-title .label', // Alternative new structure
          '.result-title', // Traditional format (legacy)
          '.titlestring', // Legacy
          '.posting-title', // Legacy
          'h3', // Generic heading
          '.title', // Generic title
        ];

        for (const selector of titleSelectors) {
          const titleElement =
            element.querySelector(selector) || (element.matches(selector) ? element : null);
          if (titleElement) {
            details.title = titleElement.textContent.trim();
            break;
          }
        }

        // If we still don't have a title, try to get it from .cl-app-anchor link text
        if (!details.title) {
          const linkElement = element.querySelector('.cl-app-anchor, .cl-search-anchor');
          if (linkElement) {
            details.title = linkElement.textContent.trim();
          }
        }

        // If we still don't have a title and the element is a link, use its text
        if (!details.title && element.tagName === 'A') {
          details.title = element.textContent.trim();
        }

        // Extract price - prioritize .priceinfo for gallery view
        const priceSelectors = isGalleryView
          ? ['.priceinfo', '.result-price', '.price', '[class*="price"]']
          : ['.result-price', '.price', '.priceinfo', '[class*="price"]'];

        for (const selector of priceSelectors) {
          const priceElement =
            element.querySelector(selector) || (element.matches(selector) ? element : null);
          if (priceElement) {
            details.price = priceElement.textContent.trim();
            logger.debug(`Found price "${details.price}" using selector "${selector}"`);
            break;
          }
        }

        // Extract location - updated for new Craigslist structure
        const locationSelectors = [
          '.meta', // New structure - location is in meta section (need to parse text)
          '.result-hood', // Legacy
          '.location', // Legacy
          '.geo', // Legacy
          '[class*="location"]', // Legacy
        ];

        for (const selector of locationSelectors) {
          const locationElement =
            element.querySelector(selector) || (element.matches(selector) ? element : null);
          if (locationElement) {
            let locationText = locationElement.textContent.trim();

            // For new structure, location is mixed with other meta info, extract it
            if (selector === '.meta') {
              // Location is typically the first text segment before separators
              const parts = locationText.split(/\s*\u2022\s*|\s*·\s*|\s*\|\s*/); // Split on bullet, middle dot, or pipe
              if (parts.length > 0) {
                // Skip empty parts and find the location (usually not a date or "pic" button)
                for (const part of parts) {
                  const cleanPart = part.trim();
                  if (
                    cleanPart &&
                    !cleanPart.match(/^\d+\/\d+$/) && // Not a date like "6/8"
                    !cleanPart.match(/^posted \d+\/\d+$/) && // Not "posted 5/11"
                    !cleanPart.includes('pic') && // Not "pic" button
                    !cleanPart.includes('hide') && // Not "hide" button
                    cleanPart.length > 2
                  ) {
                    details.location = cleanPart.replace(/[()]/g, '');
                    break;
                  }
                }
              }
            } else {
              details.location = locationText.replace(/[()]/g, '');
            }

            if (details.location) break;
          }
        }

        // Extract image URL - be even more aggressive in finding images
        const imageSelectors = [
          'img',
          '.result-image',
          '.gallery-card-image',
          'img[src*="craigslist"]',
          'img[data-src*="craigslist"]',
          'img[src*="images"]',
          'img[data-src*="images"]',
          'img[src*=".jpg"]',
          'img[src*=".jpeg"]',
          'img[src*=".png"]',
          'img[data-src*=".jpg"]',
          'img[data-src*=".jpeg"]',
          'img[data-src*=".png"]',
          'picture source',
          '.slide img',
          '.swipe img',
          '.gallery img',
        ];

        // First try to find images in the element itself
        for (const selector of imageSelectors) {
          const imageElements = element.querySelectorAll(selector);
          if (imageElements.length > 0) {
            for (const imgEl of imageElements) {
              const src =
                imgEl.getAttribute('src') ||
                imgEl.getAttribute('data-src') ||
                imgEl.getAttribute('srcset');
              if (src && !src.includes('icon') && !src.includes('logo')) {
                details.imageUrl = src;
                break;
              }
            }
            if (details.imageUrl) break;
          } else if (element.matches && element.matches(selector)) {
            const src =
              element.getAttribute('src') ||
              element.getAttribute('data-src') ||
              element.getAttribute('srcset');
            if (src && !src.includes('icon') && !src.includes('logo')) {
              details.imageUrl = src;
              break;
            }
          }
        }

        // If no image found, try to find it in the parent elements
        if (!details.imageUrl) {
          let parentElement = element.parentElement;
          for (let i = 0; i < 3 && parentElement; i++) {
            // Check up to 3 levels up
            for (const selector of imageSelectors) {
              const imageElements = parentElement.querySelectorAll(selector);
              if (imageElements.length > 0) {
                for (const imgEl of imageElements) {
                  const src =
                    imgEl.getAttribute('src') ||
                    imgEl.getAttribute('data-src') ||
                    imgEl.getAttribute('srcset');
                  if (src && !src.includes('icon') && !src.includes('logo')) {
                    details.imageUrl = src;
                    break;
                  }
                }
                if (details.imageUrl) break;
              }
            }
            if (details.imageUrl) break;
            parentElement = parentElement.parentElement;
          }
        }

        // If still no image, try to extract from style background
        if (!details.imageUrl) {
          const elementsWithStyle = [
            element,
            ...Array.from(element.querySelectorAll('[style*="background"]')),
          ];
          for (const el of elementsWithStyle) {
            const style = el.getAttribute('style');
            if (style && style.includes('background')) {
              const urlMatch = style.match(/url\(['"]?(https?:\/\/[^'")]+)['"]?\)/i);
              if (urlMatch && urlMatch[1]) {
                details.imageUrl = urlMatch[1];
                break;
              }
            }
          }
        }

        // Extract date text
        const dateSelectors = ['.result-date', '.date', 'time', '[class*="date"]'];
        for (const selector of dateSelectors) {
          const dateElement =
            element.querySelector(selector) || (element.matches(selector) ? element : null);
          if (dateElement) {
            details.dateText = dateElement.textContent.trim();
            break;
          }
        }

        // Only add listings with a URL
        if (details.url) {
          listingDetails.push(details);
        }
      } catch (error) {
        logger.error(`Error extracting details from listing element: ${error.message}`);
      }
    });

    logger.debug(`Extracted details for ${listingDetails.length} listings from HTML`);

    // Now parse the JSON-LD data
    logger.debug('Looking for JSON-LD data in the HTML');

    // Try multiple selectors for JSON-LD data
    const jsonLdSelectors = [
      '#ld_searchpage_results',
      'script[type="application/ld+json"]',
      'script[id*="ld"]',
      'script[id*="json"]',
    ];

    let jsonLdScript = null;
    for (const selector of jsonLdSelectors) {
      const scripts = document.querySelectorAll(selector);
      if (scripts.length > 0) {
        logger.debug(`Found ${scripts.length} scripts matching selector: ${selector}`);
        // Use the first script that contains itemListElement
        for (const script of scripts) {
          if (script.textContent.includes('itemListElement')) {
            jsonLdScript = script;
            logger.debug(`Found JSON-LD script with itemListElement using selector: ${selector}`);
            break;
          }
        }
        if (jsonLdScript) break;
      }
    }

    if (!jsonLdScript) {
      logger.error('Could not find JSON-LD data in the HTML');

      // Try to extract data directly from the HTML as a fallback
      logger.debug('Falling back to extracting data directly from HTML');

      // First filter out listings with invalid URLs or missing post IDs
      const validListings = listingDetails.filter(listing => {
        const directUrl = listing.url || '';

        // Skip listings with invalid URLs and no post ID
        if (
          (directUrl === '' ||
            directUrl === `https://${city}.craigslist.org/${category}/` ||
            directUrl === `https://${city}.craigslist.org/${category}` ||
            directUrl === `https://${city}.craigslist.org/search/${category}`) &&
          (!listing.postId || listing.postId === '0')
        ) {
          logger.debug(`Filtering out listing with invalid URL: ${directUrl}`);
          return false;
        }

        return true;
      });

      // Create results from the filtered listing details
      const results = validListings.map(listing => {
        // Process image URL to ensure it's a full URL
        let imageUrl = listing.imageUrl || null;
        let images = [];

        if (imageUrl) {
          // Fix relative URLs
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (imageUrl.startsWith('/')) {
            imageUrl = `https://${city}.craigslist.org${imageUrl}`;
          }

          // Convert thumbnail to full size if possible
          if (imageUrl.includes('50x50c') || imageUrl.includes('thumbnail')) {
            imageUrl = imageUrl.replace(/50x50c|thumbnail/, '600x450');
          }

          images = [imageUrl];
        }

        // Make sure we have a direct URL to the posting, not a search URL
        const directUrl = listing.url || '';
        let finalUrl = '';

        // If the URL already has the correct format and is a full URL, use it
        if (
          directUrl &&
          directUrl.startsWith('https://') &&
          directUrl.includes('/d/') &&
          directUrl.includes('.html')
        ) {
          finalUrl = directUrl;
          logger.debug(`Using existing direct URL: ${finalUrl}`);
        }
        // If we have a post ID, construct a proper direct URL with descriptive slug
        else if (listing.postId && listing.postId !== '0' && listing.postId.length >= 7) {
          // Create a slug from the title
          const slug = listing.title ? createSlugFromTitle(listing.title) : 'craigslist-posting';
          // Use the subcity code if available, otherwise use the main city code
          const subcity = extractSubcityFromUrl(directUrl) || city;
          finalUrl = `https://${city}.craigslist.org/${subcity}/${category}/d/${slug}/${listing.postId}.html`;
          logger.debug(`Constructed direct posting URL from ID: ${finalUrl}`);
        }
        // If the URL doesn't look like a direct posting URL, try to extract a post ID
        else if (directUrl && (!directUrl.includes('/d/') || !directUrl.includes('.html'))) {
          const postIdMatch = directUrl.match(/\/(\d+)(?:\.html)?$/);
          if (postIdMatch && postIdMatch[1] && postIdMatch[1] !== '0') {
            const postId = postIdMatch[1];
            const slug = listing.title ? createSlugFromTitle(listing.title) : 'craigslist-posting';
            const subcity = extractSubcityFromUrl(directUrl) || city;
            finalUrl = `https://${city}.craigslist.org/${subcity}/${category}/d/${slug}/${postId}.html`;
            logger.debug(`Converted search URL to direct posting URL: ${finalUrl}`);
          }
        }

        // Set a flag for filtering invalid URLs later
        const isValidUrl =
          finalUrl !== '' &&
          finalUrl !== `https://${city}.craigslist.org/${category}/` &&
          finalUrl.includes('/d/') &&
          finalUrl.includes('.html');

        if (!isValidUrl) {
          logger.debug(`Invalid final URL detected: ${finalUrl}`);
        }

        // For titles that look like search queries, try to extract a post ID from the title
        if (finalUrl === directUrl && (!finalUrl.includes('/d/') || !finalUrl.includes('.html'))) {
          // Try to extract a post ID from the title
          const titlePostIdMatch = listing.title && listing.title.match(/\b(\d{10})\b/);
          if (titlePostIdMatch && titlePostIdMatch[1]) {
            const postId = titlePostIdMatch[1];
            const slug = createSlugFromTitle(listing.title);
            finalUrl = `https://${city}.craigslist.org/${city}/${category}/d/${slug}/${postId}.html`;
            logger.debug(`Extracted post ID from title: ${titlePostIdMatch[1]}`);
          } else {
            // Force a direct URL format even without a post ID - this will at least go to the category page
            finalUrl = `https://${city}.craigslist.org/${category}/`;
            logger.debug(`Using category URL as fallback: ${finalUrl}`);
          }
        }

        // For apartment listings, try to extract more images from the URL pattern
        if ((category === 'apa' || category === 'hhh') && imageUrl) {
          // Craigslist often has multiple images with sequential numbers
          // Example: https://images.craigslist.org/00101_3kHkVAcfZtu_0bC0pa_600x450.jpg
          const baseImageMatch = imageUrl.match(/(https?:\/\/[^_]+)_[^_]+_[^_]+_/);
          if (baseImageMatch) {
            const baseImageUrl = baseImageMatch[1];
            // Generate a few potential additional images
            for (let i = 1; i <= 5; i++) {
              // Use different common suffixes for additional images
              const additionalImage = `${baseImageUrl}_${i}abcde_${i}fghij_600x450.jpg`;
              if (!images.includes(additionalImage)) {
                images.push(additionalImage);
              }
            }
          }
        }

        // URL handling is now done above with finalUrl variable

        // If we have a post ID from the anchor link but the URL doesn't reflect it,
        // reconstruct the URL with the correct post ID
        if (
          listing.postId &&
          finalUrl === directUrl &&
          (!finalUrl.includes('/d/') || !finalUrl.includes(listing.postId))
        ) {
          const slug = listing.title ? createSlugFromTitle(listing.title) : 'craigslist-posting';
          const subcity = extractSubcityFromUrl(directUrl) || city;
          finalUrl = `https://${city}.craigslist.org/${subcity}/${category}/d/${slug}/${listing.postId}.html`;
          logger.debug(`Reconstructed URL with post ID from anchor: ${finalUrl}`);
        }

        // Always extract the ID from the URL
        let extractedPostId = null;
        const urlIdMatch = finalUrl.match(/\/(\d+)\.html$/);
        if (urlIdMatch && urlIdMatch[1]) {
          extractedPostId = urlIdMatch[1];
          logger.debug(`Extracted post ID from URL: ${extractedPostId}`);
        } else {
          // Don't use index as fallback - only use valid post IDs
          extractedPostId = listing.postId || null;
        }

        return {
          id: extractedPostId,
          title: listing.title || '',
          url: finalUrl,
          price: listing.price || null,
          date: new Date().toISOString(),
          location: listing.location || null,
          description: listing.title || '',
          attributes: {},
          imageUrl: imageUrl,
          images: images,
          city,
        };
      });

      // Filter out results with invalid URLs or missing post IDs
      const validResults = results.filter(result => {
        // Check if we have a valid post ID
        const hasValidPostId = result.id && result.id !== 'null' && /^\d{7,}$/.test(result.id);

        // Check if URL is valid
        const isValidUrl =
          result.url &&
          result.url.startsWith('https://') &&
          result.url.includes('/d/') &&
          result.url.includes('.html') &&
          !result.url.endsWith(`/${category}/`) &&
          result.url.match(/\/\d{7,}\.html$/); // Must end with a numeric ID (7+ digits) and .html

        const isValid = hasValidPostId && isValidUrl;

        if (!isValid) {
          logger.debug(
            `Filtering out result - hasValidPostId: ${hasValidPostId}, isValidUrl: ${isValidUrl}, URL: ${result.url}, ID: ${result.id}`
          );
        }

        return isValid;
      });

      logger.debug(
        `Created ${validResults.length} valid results from ${results.length} total results`
      );
      return validResults;
    }

    try {
      // Parse the JSON-LD data
      let jsonLdData;
      try {
        jsonLdData = JSON.parse(jsonLdScript.textContent);
        logger.debug(
          `Successfully parsed JSON-LD data: ${jsonLdScript.textContent.substring(0, 100)}...`
        );
      } catch (error) {
        logger.error(`Error parsing JSON-LD data: ${error.message}`);
        logger.debug(`JSON-LD content: ${jsonLdScript.textContent.substring(0, 100)}...`);
        return [];
      }

      if (!jsonLdData.itemListElement || !Array.isArray(jsonLdData.itemListElement)) {
        logger.error(
          `Invalid JSON-LD data structure: ${JSON.stringify(jsonLdData).substring(0, 200)}...`
        );
        return [];
      }

      logger.debug(`Found ${jsonLdData.itemListElement.length} items in JSON-LD data`);

      // Extract the results from the JSON-LD data
      const results = jsonLdData.itemListElement
        .map(listItem => {
          try {
            const item = listItem.item;
            if (!item) return null;

            // Extract the post ID from the item
            let id = null;

            // Try to get ID from identifier property
            if (item.identifier) {
              id = item.identifier;
            }

            // Try to get ID from URL if available
            if (!id && item.url) {
              const postIdMatch = item.url.match(/\/(\d+)\.html$/);
              if (postIdMatch && postIdMatch[1]) {
                id = postIdMatch[1];
                logger.debug(`Extracted post ID from URL: ${id}`);
              }
            }

            // Try to extract ID from the title if it contains a numeric pattern
            if (!id && item.name) {
              const titleIdMatch = item.name.match(/\b(\d{10})\b/);
              if (titleIdMatch && titleIdMatch[1]) {
                id = titleIdMatch[1];
                logger.debug(`Extracted post ID from title: ${id}`);
              }
            }

            // Try to extract ID from image URLs if available
            if ((!id || id === '0') && item.image) {
              const images = Array.isArray(item.image) ? item.image : [item.image];
              for (const imageUrl of images) {
                if (typeof imageUrl === 'string') {
                  // Format: https://images.craigslist.org/d/7844041038/00000_e7w60ipP7IX_0rR0kT_300x300.jpg
                  const imageIdMatch = imageUrl.match(/\/d\/(\d+)\//);
                  if (imageIdMatch && imageIdMatch[1] && imageIdMatch[1].length >= 8) {
                    id = imageIdMatch[1];
                    logger.debug(`Extracted post ID from image URL: ${id}`);
                    break;
                  }
                }
              }
            }

            // Fallback to position or random ID
            if (!id || id === '0') {
              id = listItem.position || Math.random().toString(36).substring(2, 15);
            }

            // Extract the title
            const title = item.name || '';

            // Extract the price - be more aggressive in finding price
            let price = null;

            // Try to get price from offers
            if (item.offers && item.offers.price) {
              const currency = item.offers.priceCurrency || '$';
              price = currency + item.offers.price;
            }

            // If no price found, try to find it in the HTML
            if (!price) {
              for (const listing of listingDetails) {
                if (listing.price) {
                  price = listing.price;
                  break;
                }
              }
            }

            // If still no price, try to find it in meta tags
            if (!price) {
              const priceMetaTag = document.querySelector('meta[property="og:price:amount"]');
              if (priceMetaTag) {
                const priceAmount = priceMetaTag.getAttribute('content');
                if (priceAmount) {
                  const priceCurrencyTag = document.querySelector(
                    'meta[property="og:price:currency"]'
                  );
                  const currency = priceCurrencyTag
                    ? priceCurrencyTag.getAttribute('content') || '$'
                    : '$';
                  price = `${currency}${priceAmount}`;
                }
              }
            }

            // Extract the date (may not be directly available in the JSON-LD)
            const date = item.datePosted || new Date().toISOString();

            // Extract the location - be more aggressive in finding location
            let location = null;

            // Try to get location from offers
            if (
              item.offers &&
              item.offers.availableAtOrFrom &&
              item.offers.availableAtOrFrom.address
            ) {
              const address = item.offers.availableAtOrFrom.address;

              if (address.addressLocality) {
                location = address.addressLocality;

                // Add region if available
                if (address.addressRegion) {
                  location += `, ${address.addressRegion}`;
                }
              }
            }

            // If no location found, try to find it in the HTML
            if (!location) {
              for (const listing of listingDetails) {
                if (listing.location) {
                  location = listing.location;
                  break;
                }
              }
            }

            // If still no location, try to find it in meta tags
            if (!location) {
              const geoPlacenameTag = document.querySelector('meta[name="geo.placename"]');
              if (geoPlacenameTag) {
                const placename = geoPlacenameTag.getAttribute('content');
                if (placename) {
                  location = placename;

                  // Add region if available
                  const geoRegionTag = document.querySelector('meta[name="geo.region"]');
                  if (geoRegionTag) {
                    const region = geoRegionTag.getAttribute('content');
                    if (region) {
                      location += `, ${region.replace('US-', '')}`;
                    }
                  }
                }
              }
            }

            // Extract all image URLs - be even more aggressive in finding images
            let images = [];

            // Try to get images from the JSON-LD data
            if (item.image) {
              if (Array.isArray(item.image)) {
                images = item.image.filter(img => img && typeof img === 'string');
              } else if (typeof item.image === 'string') {
                images = [item.image];
              }
            }

            // Check for images in other properties
            if (item.offers) {
              // Check direct image property
              if (item.offers.image) {
                if (Array.isArray(item.offers.image)) {
                  images.push(...item.offers.image.filter(img => img && typeof img === 'string'));
                } else if (typeof item.offers.image === 'string') {
                  images.push(item.offers.image);
                }
              }

              // Check additional properties
              if (item.offers.additionalProperty && Array.isArray(item.offers.additionalProperty)) {
                const imgProps = item.offers.additionalProperty.filter(
                  prop =>
                    prop.name &&
                    (prop.name.toLowerCase().includes('image') ||
                      prop.name.toLowerCase().includes('photo') ||
                      prop.name.toLowerCase().includes('picture'))
                );

                for (const prop of imgProps) {
                  if (prop.value) {
                    if (Array.isArray(prop.value)) {
                      images.push(...prop.value.filter(img => img && typeof img === 'string'));
                    } else if (typeof prop.value === 'string') {
                      images.push(prop.value);
                    }
                  }
                }
              }
            }

            // Look for images in all listings from HTML
            for (const listing of listingDetails) {
              if (listing.imageUrl && listing.imageUrl.trim() !== '') {
                images.push(listing.imageUrl);
              }
            }

            // Look for images in the document
            const imgSelectors = [
              'img[src*="craigslist"]',
              'img[src*="images"]',
              'img[src*=".jpg"]',
              'img[src*=".jpeg"]',
              'img[src*=".png"]',
              'img[data-src*="craigslist"]',
              'img[data-src*="images"]',
              'img[data-src*=".jpg"]',
              'img[data-src*=".jpeg"]',
              'img[data-src*=".png"]',
            ];

            for (const selector of imgSelectors) {
              const imgElements = document.querySelectorAll(selector);
              if (imgElements.length > 0) {
                const newImages = Array.from(imgElements)
                  .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
                  .filter(src => src && !src.includes('icon') && !src.includes('logo'));

                images.push(...newImages);

                if (images.length > 0) {
                  logger.debug(`Found ${newImages.length} images using selector: ${selector}`);
                  break;
                }
              }
            }

            // If we still don't have images, look for image URLs in the HTML
            if (images.length === 0) {
              const html = document.documentElement.innerHTML;
              const imgRegex = /https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|gif)/gi;
              const matches = html.match(imgRegex) || [];
              images.push(
                ...matches.filter(
                  url =>
                    !url.includes('icon') &&
                    !url.includes('logo') &&
                    (url.includes('craigslist') || url.includes('images'))
                )
              );
            }

            // Deduplicate images
            images = [...new Set(images)];

            // For backward compatibility, keep the first image as imageUrl
            let imageUrl = images.length > 0 ? images[0] : null;

            // Log image count for debugging
            logger.debug(`Found ${images.length} images for listing: ${title}`);

            // Find the best matching HTML listing for this JSON-LD item
            let bestMatch = null;
            let bestScore = 0;

            for (const listing of listingDetails) {
              let score = 0;

              // Match by title (most important)
              if (listing.title && title) {
                // Calculate title similarity
                const titleSimilarity = calculateSimilarity(
                  listing.title.toLowerCase(),
                  title.toLowerCase()
                );
                score += titleSimilarity * 10; // Weight title heavily
              }

              // Match by price
              if (listing.price && price) {
                // Extract numeric price for comparison
                const listingPrice = extractNumericPrice(listing.price);
                const itemPrice = extractNumericPrice(price);

                if (listingPrice === itemPrice) {
                  score += 5;
                }
              }

              // Match by location
              if (listing.location && location) {
                if (
                  listing.location.toLowerCase().includes(location.toLowerCase()) ||
                  location.toLowerCase().includes(listing.location.toLowerCase())
                ) {
                  score += 3;
                }
              }

              // Match by image URL
              if (listing.imageUrl && imageUrl) {
                // Extract image ID from URLs for comparison
                const listingImageId = extractImageId(listing.imageUrl);
                const itemImageId = extractImageId(imageUrl);

                if (listingImageId && itemImageId && listingImageId === itemImageId) {
                  score += 8; // Strong indicator if image IDs match
                }
              }

              // If this is the best match so far, update bestMatch
              if (score > bestScore) {
                bestScore = score;
                bestMatch = listing;
              }
            }

            // Always prioritize creating a direct URL from the post ID
            let url = '';

            // First try to get a post ID from various sources, prioritizing the best match from HTML
            // which contains the post ID from anchor links
            let postId = null;

            // First priority: best match from HTML parsing (contains post ID from anchor links)
            if (
              bestMatch &&
              bestMatch.postId &&
              /^\d+$/.test(bestMatch.postId) &&
              bestMatch.postId !== '0'
            ) {
              postId = bestMatch.postId;
              logger.debug(`Using post ID from best match (anchor link): ${postId}`);
            }
            // Second priority: ID from JSON-LD data
            else if (id && /^\d+$/.test(id) && id !== '0') {
              postId = id;
              logger.debug(`Using post ID from JSON-LD data: ${postId}`);
            }
            // Third priority: identifier or id property
            else if (
              (item.identifier && /^\d+$/.test(item.identifier) && item.identifier !== '0') ||
              (item.id && /^\d+$/.test(item.id) && item.id !== '0')
            ) {
              postId = item.identifier || item.id;
              logger.debug(`Using post ID from identifier/id property: ${postId}`);
            }

            // If the URL already has the correct format and is a full URL, use it
            if (
              item.url &&
              item.url.startsWith('https://') &&
              item.url.includes('/d/') &&
              item.url.includes('.html')
            ) {
              url = item.url;
              logger.debug(`Using existing direct URL: ${url}`);
            }
            // If we have a best match with a direct URL that's a full URL, use that
            else if (
              bestMatch &&
              bestMatch.url &&
              bestMatch.url.startsWith('https://') &&
              bestMatch.url.includes('/d/') &&
              bestMatch.url.includes('.html')
            ) {
              url = bestMatch.url;
              logger.debug(`Using best match URL: ${url}`);
            }
            // If we have a post ID, construct a proper direct URL with descriptive slug
            else if (
              postId &&
              typeof postId === 'string' &&
              /^\d+$/.test(postId) &&
              postId !== '0' &&
              postId.length >= 7
            ) {
              // Create a slug from the title
              const slug = title ? createSlugFromTitle(title) : 'craigslist-posting';
              // Use the subcity code if available, otherwise use the main city code
              const subcity = city;
              url = `https://${city}.craigslist.org/${subcity}/${category}/d/${slug}/${postId}.html`;
              logger.debug(`Constructed direct posting URL from ID: ${url}`);
            } else {
              // Last resort: fallback to a category URL
              url = `https://${city}.craigslist.org/${category}/`;
              logger.debug(`Using category URL fallback: ${url}`);
            }

            // Try to extract description from the item or from the HTML
            let description = item.description || '';

            // Extract attributes from the JSON-LD data
            let attributes = {};

            // If we have offers data, extract attributes from there
            if (item.offers) {
              // Price already extracted, but might have additional info
              if (item.offers.priceCurrency) {
                attributes['currency'] = item.offers.priceCurrency;
              }

              // Extract location details
              if (item.offers.availableAtOrFrom && item.offers.availableAtOrFrom.address) {
                const address = item.offers.availableAtOrFrom.address;

                if (address.addressLocality) {
                  attributes['city'] = address.addressLocality;
                }

                if (address.addressRegion) {
                  attributes['state'] = address.addressRegion;
                }

                if (address.postalCode) {
                  attributes['zip'] = address.postalCode;
                }
              }

              // Extract any other offer properties
              Object.entries(item.offers).forEach(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number') {
                  attributes[key.toLowerCase()] = value;
                }
              });
            }

            // Add category-specific attributes that are commonly found in post details
            // These will be overridden if we fetch the actual post details
            if (bestMatch) {
              // Only apply bike-specific extraction for bike-related categories
              if (category === 'bia' || category === 'bik' || category.includes('bike')) {
                // Try to extract bicycle-specific attributes from the title and description
                const bikeAttributes = {
                  'bicycle type': null,
                  'frame size': null,
                  'wheel size': null,
                  'bicycle frame material': null,
                  suspension: null,
                  'brake type': null,
                  'handlebar type': null,
                  'electric assist': null,
                  condition: null,
                  'make / manufacturer': null,
                  'model name / number': null,
                };

                // Extract from title
                if (title) {
                  // Look for bicycle type
                  const bikeTypePatterns = [
                    { pattern: /\b(road|racing)\b/i, value: 'road' },
                    { pattern: /\b(mountain|mtb)\b/i, value: 'mountain' },
                    { pattern: /\b(hybrid)\b/i, value: 'hybrid' },
                    { pattern: /\b(cruiser)\b/i, value: 'cruiser' },
                    { pattern: /\b(bmx)\b/i, value: 'bmx' },
                    { pattern: /\b(kids|children|child)\b/i, value: 'kids' },
                  ];

                  for (const { pattern, value } of bikeTypePatterns) {
                    if (pattern.test(title)) {
                      bikeAttributes['bicycle type'] = value;
                      break;
                    }
                  }

                  // Look for frame size
                  const frameSizeMatch = title.match(
                    /\b(\d+(?:\.\d+)?)["\s-]?(?:inch|in|\s*")?\s*(?:frame)?\b/i
                  );
                  if (frameSizeMatch) {
                    bikeAttributes['frame size'] = frameSizeMatch[1] + '"';
                  }

                  // Look for wheel size
                  const wheelSizeMatch = title.match(
                    /\b(\d+(?:\.\d+)?)["\s-]?(?:inch|in|\s*")?\s*(?:wheel|wheels)?\b/i
                  );
                  if (wheelSizeMatch) {
                    bikeAttributes['wheel size'] = wheelSizeMatch[1] + ' in';
                  }

                  // Look for speeds
                  const speedsMatch = title.match(/\b(\d+)[\s-]?speed\b/i);
                  if (speedsMatch) {
                    attributes['speeds'] = speedsMatch[1];
                  }

                  // Look for brand
                  const brandPatterns = [
                    /\b(schwinn|trek|specialized|giant|cannondale|raleigh|diamondback|jamis|bianchi|fuji|gt|kona|scott|cervelo|felt|santa cruz|surly|salsa|marin|norco|pinarello|colnago|de rosa|look|orbea|cube|canyon|focus|ghost|lapierre|merida|ridley|rose|wilier|yeti|intense|pivot|ibis|devinci|rocky mountain|transition|commencal|nukeproof|mondraker|propain|yt|canyon|evil|guerrilla gravity|pole|nicolai|liteville|last|alutech|banshee|knolly|kona|transition|norco|rocky mountain|devinci|commencal|nukeproof|mondraker|propain|yt|canyon|evil|guerrilla gravity|pole|nicolai|liteville|last|alutech|banshee|knolly)\b/i,
                  ];

                  for (const pattern of brandPatterns) {
                    const match = title.match(pattern);
                    if (match) {
                      attributes['brand'] =
                        match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                      bikeAttributes['make / manufacturer'] =
                        match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                      break;
                    }
                  }
                }

                // Add the extracted bike attributes to the main attributes object
                for (const [key, value] of Object.entries(bikeAttributes)) {
                  if (value) {
                    attributes[key] = value;
                  }
                }
              }

              // For apartment listings, extract relevant housing attributes
              if (
                category === 'apa' ||
                category === 'hhh' ||
                category.includes('housing') ||
                category.includes('apartment')
              ) {
                // Extract housing-specific attributes
                const housingAttributes = {
                  bedrooms: null,
                  bathrooms: null,
                  sqft: null,
                  pets: null,
                  furnished: null,
                  laundry: null,
                  parking: null,
                };

                // Extract from title
                if (title) {
                  // Look for bedrooms
                  const bedroomsMatch = title.match(/\b(\d+(?:\.\d+)?)\s*(?:bed|bedroom|br|bd)\b/i);
                  if (bedroomsMatch) {
                    housingAttributes['bedrooms'] = bedroomsMatch[1];
                  }

                  // Look for bathrooms
                  const bathroomsMatch = title.match(
                    /\b(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba|bth)\b/i
                  );
                  if (bathroomsMatch) {
                    housingAttributes['bathrooms'] = bathroomsMatch[1];
                  }

                  // Look for square footage
                  const sqftMatch = title.match(
                    /\b(\d+)\s*(?:sq\s*ft|sqft|sf|ft2|square\s*feet)\b/i
                  );
                  if (sqftMatch) {
                    housingAttributes['sqft'] = sqftMatch[1];
                  }
                }

                // Add the extracted housing attributes to the main attributes object
                for (const [key, value] of Object.entries(housingAttributes)) {
                  if (value) {
                    attributes[key] = value;
                  }
                }
              }
            }

            // Extract category-specific attributes from the title
            if (title) {
              // For bike listings only - be very strict about the category check
              if (category === 'bia' || category === 'bik') {
                // Look for common bike specs in the title
                const bikeSpecs = [
                  { pattern: /(\d+)[\s-]?speed/i, key: 'speeds' },
                  { pattern: /(\d+)[\s-]?inch|(\d+)"/i, key: 'wheel size' },
                  { pattern: /(carbon|aluminum|steel|titanium)/i, key: 'frame material' },
                  { pattern: /(road|mountain|hybrid|cruiser|bmx|kids)/i, key: 'type' },
                  {
                    pattern:
                      /(schwinn|trek|specialized|giant|cannondale|raleigh|diamondback|jamis)/i,
                    key: 'brand',
                  },
                ];

                // Only apply size pattern for bikes
                const sizeMatch = title.match(/(small|medium|large|s|m|l|xl)/i);
                if (sizeMatch) {
                  attributes['size'] = sizeMatch[1] || sizeMatch[0];
                }

                bikeSpecs.forEach(spec => {
                  const match = title.match(spec.pattern);
                  if (match) {
                    attributes[spec.key] = match[1] || match[0];
                  }
                });
              }

              // For apartment/housing listings
              if (
                category === 'apa' ||
                category === 'hhh' ||
                category.includes('housing') ||
                category.includes('apartment')
              ) {
                const housingSpecs = [
                  { pattern: /(\d+(?:\.\d+)?)\s*(?:bed|bedroom|br|bd)/i, key: 'bedrooms' },
                  { pattern: /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba|bth)/i, key: 'bathrooms' },
                  { pattern: /(\d+)\s*(?:sq\s*ft|sqft|sf|ft2|square\s*feet)/i, key: 'sqft' },
                  { pattern: /\b(furnished)\b/i, key: 'furnished' },
                  {
                    pattern: /\b(pets|pet friendly|dog friendly|cat friendly)\b/i,
                    key: 'pets allowed',
                  },
                  { pattern: /\b(parking|garage|driveway)\b/i, key: 'parking' },
                ];

                housingSpecs.forEach(spec => {
                  const match = title.match(spec.pattern);
                  if (match) {
                    attributes[spec.key] = match[1] || match[0];
                  }
                });
              }
            }

            // Try to extract attributes from the best match
            if (bestMatch) {
              // Extract any attributes from the listing element
              const attrSelectors = ['.attrgroup', '.attrs', '.postinginfo', '[class*="attr"]'];

              for (const selector of attrSelectors) {
                const attrElements = document.querySelectorAll(selector);
                attrElements.forEach(element => {
                  const spans = element.querySelectorAll('span, p, li');
                  spans.forEach(span => {
                    const text = span.textContent.trim();
                    if (text.includes(':')) {
                      const [key, value] = text.split(':').map(s => s.trim());
                      if (key && value) {
                        attributes[key.toLowerCase()] = value;
                      }
                    } else if (text) {
                      // For spans without a colon, use the text as both key and value
                      attributes[text.toLowerCase()] = true;
                    }
                  });
                });
              }

              // Try to extract description from the listing element
              if (!description) {
                const descSelectors = [
                  '.postingbody',
                  '#postingbody',
                  '.description',
                  '[id*="desc"]',
                  '.result-meta',
                  '.result-info',
                ];

                for (const selector of descSelectors) {
                  const descElement = document.querySelector(selector);
                  if (descElement) {
                    description = descElement.textContent.trim();
                    // Clean up the description
                    description = description.replace(/\s+/g, ' ').trim();
                    break;
                  }
                }
              }
            }

            // If we have an image URL, try to extract some attributes from it
            if (imageUrl) {
              // Craigslist image URLs sometimes contain metadata
              // Example: https://images.craigslist.org/00K0K_jwMrumpmdGU_0CI0pO_600x450.jpg
              const parts = imageUrl.split('/').pop().split('_');
              if (parts.length >= 3) {
                // The first part might be a code for the item condition or category
                const code = parts[0];
                if (code && !attributes['condition']) {
                  // This is just a guess, but some codes might indicate condition
                  if (code.includes('00')) attributes['condition'] = 'good';
                  if (code.includes('01')) attributes['condition'] = 'like new';
                }
              }
            }

            // If we still don't have a description, create one from the title and attributes
            if (!description || description.length < 10) {
              description = title;

              // Add some attributes to the description
              const importantAttrs = [
                'brand',
                'type',
                'size',
                'speeds',
                'frame material',
                'wheel size',
                'condition',
              ];
              const attrDesc = importantAttrs
                .filter(attr => attributes[attr])
                .map(attr => `${attr}: ${attributes[attr]}`)
                .join(', ');

              if (attrDesc) {
                description += ` (${attrDesc})`;
              }

              if (location) {
                description += ` - Located in ${location}`;
              }
            }

            // Extract location name from meta tags if available
            let locationName = location;

            // If we have a bestMatch with location, use that
            if (bestMatch && bestMatch.location) {
              locationName = bestMatch.location;
            }

            // Ensure the URL contains the correct post ID
            if (id && id !== '0' && url && (!url.includes(id) || !url.includes('/d/'))) {
              // Reconstruct the URL with the correct post ID
              const slug = title ? createSlugFromTitle(title) : 'craigslist-posting';
              const subcity = extractSubcityFromUrl(url) || city;
              url = `https://${city}.craigslist.org/${subcity}/${category}/d/${slug}/${id}.html`;
              logger.debug(`Reconstructed URL with correct post ID: ${url}`);
            }

            // Always extract the ID from the URL
            let extractedPostId = null;
            const urlIdMatch = url.match(/\/(\d+)\.html$/);
            if (urlIdMatch && urlIdMatch[1]) {
              extractedPostId = urlIdMatch[1];
              logger.debug(`Extracted post ID from URL: ${extractedPostId}`);
            } else {
              extractedPostId = id || '0';
              logger.debug(`Using fallback ID: ${extractedPostId}`);
            }

            return {
              id: extractedPostId,
              title,
              url,
              price,
              date,
              location: locationName,
              description,
              attributes,
              imageUrl, // Keep for backward compatibility
              images, // Add all images array
              city,
            };
          } catch (error) {
            logger.error(`Error parsing JSON-LD item: ${error.message}`);
            return null;
          }
        })
        .filter(item => item !== null);

      // If fetchDetails is true, fetch detailed attributes for each result in parallel
      if (fetchDetails && results.length > 0) {
        logger.info(
          `Fetching detailed attributes for ${results.length} results with max concurrency: ${PARALLEL_CONFIG.MAX_CONCURRENT_DETAILS}`
        );

        const detailProcessor = async result => {
          try {
            const details = await getPostingDetails(result.url);
            if (details && details.attributes) {
              // Extract the ID from the URL to ensure consistency
              let extractedUrlId = result.id;
              const urlIdMatch = result.url.match(/\/(\d+)\.html$/);
              if (urlIdMatch && urlIdMatch[1]) {
                extractedUrlId = urlIdMatch[1];
                logger.debug(`Using ID from URL: ${extractedUrlId}`);
              }

              // Merge the detailed attributes with the search result
              return {
                ...result,
                id: extractedUrlId,
                attributes: {
                  ...result.attributes,
                  ...details.attributes,
                },
                // Include additional details from the posting page
                description: details.description || result.description,
                images: details.images || result.images,
                galleryImages: details.galleryImages || [],
                mapAddress: details.mapAddress || null,
                location: {
                  ...result.location,
                  ...details.location,
                },
              };
            }
            return result;
          } catch (error) {
            logger.error(`Error fetching details for ${result.url}: ${error.message}`);
            return result; // Return original result if detail fetch fails
          }
        };

        const detailedResults = await processInParallel(
          results,
          detailProcessor,
          PARALLEL_CONFIG.MAX_CONCURRENT_DETAILS,
          PARALLEL_CONFIG.BATCH_DELAY
        );

        logger.info(`Completed fetching details for ${detailedResults.length} results`);
        return detailedResults;
      }

      // Filter out results with invalid URLs
      const validResults = results.filter(result => {
        const isValidUrl =
          result.url &&
          result.url.startsWith('https://') &&
          result.url.includes('/d/') &&
          result.url.includes('.html') &&
          !result.url.endsWith(`/${category}/`) &&
          result.url.match(/\/\d{7,}\.html$/); // Must end with a numeric ID (7+ digits) and .html

        if (!isValidUrl) {
          logger.debug(`Filtering out result with invalid URL: ${result.url}`);
        }

        return isValidUrl;
      });

      logger.debug(
        `Created ${validResults.length} valid results from ${results.length} total results`
      );
      return validResults;
    } catch (error) {
      logger.error(`Error parsing JSON-LD data: ${error.message}`);
      return [];
    }
  } catch (error) {
    logger.error(`Error parsing search results: ${error.message}`);
    return [];
  }
}

/**
 * Calculate similarity between two strings (simple implementation)
 * @param {string} str1
 * @param {string} str2
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  // Simple word overlap calculation
  const words1 = str1.split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.split(/\s+/).filter(w => w.length > 2);

  let matches = 0;
  for (const word of words1) {
    if (words2.some(w => w.includes(word) || word.includes(w))) {
      matches++;
    }
  }

  return matches / Math.max(words1.length, 1);
}

/**
 * Create a URL-friendly slug from a title
 * @param {string} title - The title to convert to a slug
 * @returns {string} A URL-friendly slug
 */
function createSlugFromTitle(title) {
  if (!title) return 'craigslist-posting';

  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) || // Limit length
    'craigslist-posting'
  ); // Fallback if empty
}

/**
 * Extract subcity code from a Craigslist URL
 * @param {string} url - The URL to extract from
 * @returns {string|null} The subcity code or null if not found
 */
function extractSubcityFromUrl(url) {
  if (!url) return null;

  // Try to match the subcity code from the URL
  // Format: https://chicago.craigslist.org/chc/bik/...
  const match = url.match(/craigslist\.org\/([a-z]{3})\//i);

  return match ? match[1] : null;
}

/**
 * Extract numeric price from price string
 * @param {string} priceStr
 * @returns {number|null}
 */
function extractNumericPrice(priceStr) {
  if (!priceStr) return null;

  // Extract digits from price string
  const matches = priceStr.match(/[\d.]+/);
  if (matches && matches[0]) {
    return parseFloat(matches[0]);
  }

  return null;
}

/**
 * Extract image ID from image URL
 * @param {string} imageUrl
 * @returns {string|null}
 */
function extractImageId(imageUrl) {
  if (!imageUrl) return null;

  // Try to extract image ID from Craigslist image URL
  // Format is often like: https://images.craigslist.org/00101_3kHkVAcfZtu_0bC0pa_600x450.jpg
  const matches = imageUrl.match(/\/([a-zA-Z0-9]+)_[a-zA-Z0-9]+_[a-zA-Z0-9]+_/);
  if (matches && matches[1]) {
    return matches[1];
  }

  return null;
}

/**
 * Deduplicate search results based on title similarity
 * @param {Array} results - Array of search results
 * @returns {Array} Deduplicated results
 */
function deduplicateByTitle(results) {
  if (!results || results.length === 0) return results;

  const uniqueResults = [];
  const seenTitles = new Set();

  for (const result of results) {
    if (!result.title) {
      uniqueResults.push(result);
      continue;
    }

    // Normalize title for comparison
    const normalizedTitle = result.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Check if we've seen a very similar title
    let isDuplicate = false;
    for (const seenTitle of seenTitles) {
      const similarity = calculateSimilarity(normalizedTitle, seenTitle);
      if (similarity > 0.85) {
        // 85% similarity threshold
        isDuplicate = true;
        logger.debug(`Filtering duplicate title: "${result.title}" (similar to existing)`);
        break;
      }
    }

    if (!isDuplicate) {
      seenTitles.add(normalizedTitle);
      uniqueResults.push(result);
    }
  }

  return uniqueResults;
}

/**
 * Search across multiple Craigslist cities
 *
 * @param {Array<string>} cities - Array of city codes to search
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of cities to search (to avoid rate limiting)
 * @param {number} options.maxConcurrentCities - Maximum concurrent city searches
 * @param {number} options.maxConcurrentDetails - Maximum concurrent detail fetches
 * @returns {Promise<Array>} Combined search results
 */
export async function search(cities, options) {
  const {
    limit = cities.length,
    fetchDetails = false,
    maxConcurrentCities = PARALLEL_CONFIG.MAX_CONCURRENT_CITIES,
    maxConcurrentDetails = PARALLEL_CONFIG.MAX_CONCURRENT_DETAILS,
    ...searchOptions
  } = options;

  // Limit the number of cities to search
  const citiesToSearch = cities.slice(0, limit);

  logger.info(
    `Searching ${citiesToSearch.length} Craigslist cities with max concurrency: ${maxConcurrentCities}`
  );
  logger.info(`Cities: ${citiesToSearch.join(', ')}`);

  try {
    // Search cities in parallel with configurable concurrency
    const cityProcessor = async city => {
      try {
        logger.info(`Starting search for city: ${city}`);
        const results = await searchCity(city, { ...searchOptions, fetchDetails: false }); // Don't fetch details in city search
        logger.info(`Completed search for city: ${city} - found ${results.length} results`);
        return results;
      } catch (error) {
        logger.error(`Error searching city ${city}: ${error.message}`);
        return []; // Return empty array for failed cities
      }
    };

    const cityResults = await processInParallel(
      citiesToSearch,
      cityProcessor,
      maxConcurrentCities,
      PARALLEL_CONFIG.BATCH_DELAY
    );

    // Combine and flatten results
    const flatResults = cityResults.flat();
    logger.info(`Combined results from all cities: ${flatResults.length} total listings`);

    // Deduplicate results based on title similarity
    const deduplicatedResults = deduplicateByTitle(flatResults);
    logger.info(
      `Deduplicated ${flatResults.length} results to ${deduplicatedResults.length} unique listings`
    );

    // If fetchDetails is true, fetch detailed attributes for each result in parallel
    if (fetchDetails && deduplicatedResults.length > 0) {
      logger.info(
        `Fetching detailed attributes for ${deduplicatedResults.length} results with max concurrency: ${maxConcurrentDetails}`
      );

      const detailProcessor = async result => {
        try {
          const details = await getPostingDetails(result.url);
          if (details && details.attributes) {
            // Extract the ID from the URL to ensure consistency
            let extractedUrlId = result.id;
            const urlIdMatch = result.url.match(/\/(\d+)\.html$/);
            if (urlIdMatch && urlIdMatch[1]) {
              extractedUrlId = urlIdMatch[1];
              logger.debug(`Using ID from URL: ${extractedUrlId}`);
            }

            // Merge the detailed attributes with the search result
            return {
              ...result,
              id: extractedUrlId,
              attributes: {
                ...result.attributes,
                ...details.attributes,
              },
              // Include additional details from the posting page
              description: details.description || result.description,
              images: details.images || result.images,
              galleryImages: details.galleryImages || [],
              mapAddress: details.mapAddress || null,
              location: {
                ...result.location,
                ...details.location,
              },
            };
          }
          return result;
        } catch (error) {
          logger.error(`Error fetching details for ${result.url}: ${error.message}`);
          return result; // Return original result if detail fetch fails
        }
      };

      const detailedResults = await processInParallel(
        deduplicatedResults,
        detailProcessor,
        maxConcurrentDetails,
        PARALLEL_CONFIG.BATCH_DELAY
      );

      logger.info(`Completed fetching details for ${detailedResults.length} results`);
      return detailedResults;
    }

    return deduplicatedResults;
  } catch (error) {
    logger.error(`Error searching multiple cities: ${error.message}`);
    return [];
  }
}

/**
 * Get details for a specific Craigslist posting
 *
 * @param {string} url - URL of the posting
 * @param {boolean} [forSearch=false] - Whether this is being called from search results
 * @returns {Promise<Object>} Posting details
 */
export async function getPostingDetails(url) {
  try {
    logger.info(`Fetching Craigslist posting with${PROXY_URL ? '' : 'out'} proxy: ${url}`);

    // Use Puppeteer to fetch the posting details - will throw if Chrome is not available
    logger.info(`Fetching with Puppeteer: ${url}`);
    const response = await fetchWithPuppeteer(url);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText} for ${url}`);
    }

    const html = await response.text();

    // Check if the HTML contains actual content
    if (!html.includes('postingbody') && !html.includes('gallery') && !html.includes('attrgroup')) {
      throw new Error(`Invalid or empty content received for ${url}`);
    }

    logger.info(`Successfully fetched with Puppeteer: ${url}`);

    // Add a longer random delay to avoid rate limiting (between 2000ms and 5000ms)
    const randomDelay = 2000 + Math.floor(Math.random() * 3000);
    logger.debug(`Adding delay of ${randomDelay}ms to avoid rate limiting`);
    await delay(randomDelay);

    return parsePostingDetails(html, url);
  } catch (error) {
    // If it's already a PuppeteerError, just rethrow it
    if (error.name === 'PuppeteerError') {
      throw error;
    }

    logger.error(`Error fetching posting details: ${error.message}`);

    // Convert generic errors to a more specific error
    if (error.message.includes('Chrome') || error.message.includes('Puppeteer')) {
      throw new PuppeteerError(
        'Chrome browser is required for Craigslist scraping. Please install Chrome with: npx puppeteer browsers install chrome'
      );
    }

    throw error; // Rethrow other errors
  }
}

/**
 * Parse Craigslist posting details
 *
 * @param {string} html - HTML content to parse
 * @param {string} url - Original URL of the posting
 * @param {boolean} [forSearch=false] - Whether this is being called from search results
 * @returns {Object} Parsed posting details
 */
function parsePostingDetails(html, url) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Get basic posting info
    const title = document.querySelector('#titletextonly')?.textContent.trim() || null;

    // Enhanced price parsing for posting pages - try multiple selectors
    const priceSelectors = [
      'span.price', // Standard price selector: <span class="price">$25</span>
      '.price', // Generic price class
      '.postingtitle .price', // Price in posting title
      '[class*="price"]', // Any element with "price" in class name
    ];

    let price = null;
    for (const selector of priceSelectors) {
      const priceElement = document.querySelector(selector);
      if (priceElement) {
        price = priceElement.textContent.trim();
        console.log(`Found price "${price}" using selector "${selector}"`);
        break;
      }
    }

    // Log the URL for debugging
    logger.debug(`Parsing posting details for URL: ${url}`);

    // Get the full posting body text with proper cleaning
    let postingBody = '';
    const postingBodyElement = document.querySelector('#postingbody');
    if (postingBodyElement) {
      // Clone the element to avoid modifying the original
      const cleanedElement = postingBodyElement.cloneNode(true);

      // Remove the "QR Code Link to This Post" text that's often included
      const qrCodeElement = cleanedElement.querySelector('.print-information');
      if (qrCodeElement) {
        qrCodeElement.remove();
      }

      // Remove any other non-content elements
      const noticeElements = cleanedElement.querySelectorAll('.notices, .postinginfo');
      noticeElements.forEach(el => el.remove());

      // Get the cleaned text
      postingBody = cleanedElement.textContent.trim();
    }

    // Parse map address
    let mapAddress = null;
    const mapAddressElement = document.querySelector('.mapaddress');
    if (mapAddressElement) {
      mapAddress = mapAddressElement.textContent.trim();
      logger.debug(`Found map address: ${mapAddress}`);
    }

    // Parse gallery images from the new structure
    let galleryImages = [];
    const galleryElement = document.querySelector('.gallery');
    if (galleryElement) {
      // Look for images in the swipe gallery
      const slideImages = galleryElement.querySelectorAll('.slide img, .swipe img');
      slideImages.forEach(img => {
        const src = img.getAttribute('src');
        if (
          src &&
          !src.includes('no_image.png') &&
          !src.includes('icon') &&
          !src.includes('logo')
        ) {
          // Convert to full size if it's a thumbnail
          let fullSizeSrc = src;
          if (src.includes('_1200x900')) {
            fullSizeSrc = src; // Already full size
          } else if (src.includes('_600x450')) {
            fullSizeSrc = src.replace('_600x450', '_1200x900');
          } else if (src.includes('_300x300')) {
            fullSizeSrc = src.replace('_300x300', '_1200x900');
          }
          galleryImages.push(fullSizeSrc);
        }
      });
      logger.debug(`Found ${galleryImages.length} gallery images`);
    }

    // Parse attributes from .attrgroup sections
    let parsedAttributes = {};
    const attributeGroups = document.querySelectorAll('.attrgroup');
    attributeGroups.forEach((group, groupIndex) => {
      logger.debug(`Processing attribute group ${groupIndex + 1}`);

      // Look for .attr elements within the group
      const attrElements = group.querySelectorAll('.attr');
      attrElements.forEach(attr => {
        // Get the attribute name from the class or data attribute
        const attrClasses = Array.from(attr.classList);
        const attrClass = attrClasses.find(cls => cls.startsWith('attr_') || cls !== 'attr');

        if (attrClass && attrClass !== 'attr') {
          const attrName = attrClass.replace('attr_', '').replace(/_/g, ' ');

          // Get the value from the .valu span or link
          const valuElement = attr.querySelector('.valu');
          if (valuElement) {
            const link = valuElement.querySelector('a');
            const value = link ? link.textContent.trim() : valuElement.textContent.trim();

            if (value) {
              parsedAttributes[attrName] = value;
              logger.debug(`Found attribute: ${attrName} = ${value}`);
            }
          }
        }
      });
    });

    const postingDate =
      document.querySelector('.date.timeago')?.textContent.trim() ||
      document.querySelector('.date')?.textContent.trim() ||
      document.querySelector('time')?.textContent.trim() ||
      null;

    // Get posting images - try multiple selectors for different page layouts
    let images = [];
    logger.debug(`Extracting images from posting: ${url}`);

    // Try the thumbs container first (traditional layout)
    const thumbElements = document.querySelectorAll('#thumbs .thumb img');
    if (thumbElements.length > 0) {
      logger.debug(`Found ${thumbElements.length} thumbnail images`);
      images = Array.from(thumbElements).map(img => {
        const thumbSrc = img.getAttribute('src');
        // Convert thumbnail URL to full-size image URL
        return thumbSrc.replace(/50x50c/, '600x450');
      });
    }

    // If no images found, try the gallery (newer layout)
    if (images.length === 0) {
      const gallerySelectors = [
        '.gallery img',
        '.swipe img',
        '.carousel img',
        '.slide img',
        '.image img',
        '.gallery-image img',
      ];

      for (const selector of gallerySelectors) {
        const galleryImages = document.querySelectorAll(selector);
        if (galleryImages.length > 0) {
          logger.debug(`Found ${galleryImages.length} gallery images using selector: ${selector}`);
          images = Array.from(galleryImages)
            .map(img => {
              const src = img.getAttribute('src') || img.getAttribute('data-src');
              if (src) {
                // If it's already a full-size image, use it as is
                if (src.includes('600x450')) {
                  return src;
                }
                // Otherwise, try to convert to full-size
                return src.replace(/\d+x\d+c?/, '600x450');
              }
              return null;
            })
            .filter(src => src !== null);
          break;
        }
      }
    }

    // Try to find images in picture elements
    if (images.length === 0) {
      const pictureElements = document.querySelectorAll('picture source');
      if (pictureElements.length > 0) {
        logger.debug(`Found ${pictureElements.length} picture source elements`);
        images = Array.from(pictureElements)
          .map(source => source.getAttribute('srcset') || source.getAttribute('src'))
          .filter(src => src && !src.includes('icon') && !src.includes('logo'));
      }
    }

    // If still no images, look for any image that might be relevant
    if (images.length === 0) {
      const imgSelectors = [
        'img[src*="craigslist"]',
        'img[src*="images"]',
        'img[src*=".jpg"]',
        'img[src*=".jpeg"]',
        'img[src*=".png"]',
        'img[data-src*="craigslist"]',
        'img[data-src*="images"]',
        'img[data-src*=".jpg"]',
        'img[data-src*=".jpeg"]',
        'img[data-src*=".png"]',
      ];

      for (const selector of imgSelectors) {
        const imgElements = document.querySelectorAll(selector);
        if (imgElements.length > 0) {
          logger.debug(`Found ${imgElements.length} images using selector: ${selector}`);
          const newImages = Array.from(imgElements)
            .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
            .filter(src => src && !src.includes('icon') && !src.includes('logo'));

          images.push(...newImages);

          if (images.length > 0) {
            break;
          }
        }
      }
    }

    // If we still don't have images, look for image URLs in the HTML
    if (images.length === 0) {
      logger.debug('Searching for image URLs in HTML');
      const html = document.documentElement.innerHTML;
      const imgRegex = /https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|gif)/gi;
      const matches = html.match(imgRegex) || [];
      images = matches.filter(
        url =>
          !url.includes('icon') &&
          !url.includes('logo') &&
          (url.includes('craigslist') || url.includes('images'))
      );

      if (images.length > 0) {
        logger.debug(`Found ${images.length} image URLs in HTML`);
      }
    }

    // Deduplicate images
    images = [...new Set(images)];
    logger.debug(`Total unique images found: ${images.length}`);

    // Create a comprehensive collection of attributes and specs
    const tempAttributes = {};
    const attributeKeys = new Set(); // To track attribute keys for deduplication

    // Helper function to add an attribute with proper formatting and deduplication
    const addAttribute = (key, value) => {
      if (!key || key.length < 2) return;

      // Format the key consistently
      const formattedKey = key
        .toLowerCase()
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Convert camelCase to spaces
        .replace(/_/g, ' ') // Convert snake_case to spaces
        .trim();

      // Skip very long keys
      if (formattedKey.length > 50) return;

      // For string/number values
      if (typeof value === 'string' || typeof value === 'number') {
        const stringValue = String(value).trim();

        // Skip empty or very long values
        if (!stringValue || stringValue.length > 200) return;

        // Store the formatted value
        tempAttributes[formattedKey] = stringValue;
        attributeKeys.add(formattedKey);

        // Don't add this value as a boolean flag later
        attributeKeys.add(stringValue.toLowerCase());
        return;
      }

      // For boolean values (flags)
      if (value === true) {
        // Only add as boolean if we don't already have this key
        if (!attributeKeys.has(formattedKey)) {
          tempAttributes[formattedKey] = true;
          attributeKeys.add(formattedKey);
        }
        return;
      }
    };

    // 1. First, extract from attribute groups (most reliable)
    const attrGroups = document.querySelectorAll('.attrgroup');

    // Log the number of attribute groups found
    logger.debug(`Found ${attrGroups.length} attribute groups`);

    // If this is a bike listing, we need to be more aggressive
    const isBikeListing = url.includes('/bik/') || url.includes('/bia/');
    if (isBikeListing) {
      logger.debug('This appears to be a bike listing, using specialized extraction');
    }

    attrGroups.forEach((group, groupIndex) => {
      logger.debug(`Processing attribute group ${groupIndex + 1}`);

      // Get the raw HTML for debugging
      const groupHtml = group.outerHTML;
      logger.debug(
        `Group HTML: ${groupHtml.substring(0, 200)}${groupHtml.length > 200 ? '...' : ''}`
      );

      const spans = group.querySelectorAll('span, b, p, li');
      logger.debug(`Found ${spans.length} attribute elements in group ${groupIndex + 1}`);

      spans.forEach(span => {
        const text = span.textContent.trim();
        logger.debug(`Processing attribute text: "${text}"`);

        if (text.includes(':')) {
          const [key, value] = text.split(':').map(s => s.trim());
          if (key && value) {
            logger.debug(`Found key-value pair: ${key} = ${value}`);
            addAttribute(key, value);
          }
        } else if (text) {
          // For spans without a colon, use the text as a boolean flag
          logger.debug(`Found boolean attribute: ${text}`);
          addAttribute(text, true);

          // For bike listings, try to extract more information
          if (isBikeListing) {
            // Check for common bike attributes in the text
            const bikePatterns = [
              { pattern: /(\d+)[\s-]?speed/i, key: 'speeds' },
              { pattern: /(\d+(?:\.\d+)?)[\s-]?inch|(\d+(?:\.\d+)?)"/, key: 'wheel size' },
              { pattern: /(small|medium|large|s|m|l|xl)/i, key: 'size' },
              { pattern: /(carbon|aluminum|steel|titanium)/i, key: 'frame material' },
              { pattern: /(road|mountain|hybrid|cruiser|bmx|kids)/i, key: 'type' },
              {
                pattern: /(schwinn|trek|specialized|giant|cannondale|raleigh|diamondback|jamis)/i,
                key: 'brand',
              },
              { pattern: /(new|like new|excellent|good|fair|poor)/i, key: 'condition' },
              { pattern: /(men'?s|women'?s|unisex)/i, key: 'gender' },
              { pattern: /(disc|rim|hydraulic|mechanical)[\s-]?brakes/i, key: 'brakes' },
              { pattern: /(front|rear|full)[\s-]?suspension/i, key: 'suspension' },
              { pattern: /(\d+)[\s-]?cm/i, key: 'frame size' },
              { pattern: /(\d{4})/i, key: 'year' },
            ];

            for (const { pattern, key } of bikePatterns) {
              const match = text.match(pattern);
              if (match) {
                logger.debug(
                  `Extracted bike attribute from text: ${key} = ${match[1] || match[0]}`
                );
                addAttribute(key, match[1] || match[0]);
              }
            }
          }
        }

        // Check for links within spans that might contain attribute values
        const links = span.querySelectorAll('a');
        links.forEach(link => {
          const linkText = link.textContent.trim();
          if (linkText && linkText.length > 1) {
            logger.debug(`Found link attribute: ${linkText}`);
            addAttribute(linkText, true);
          }
        });
      });
    });

    // 2. Look for additional specs in various containers, focusing on right-hand side attributes
    const specContainers = [
      '.mapAndAttrs', // Main container for attributes on right side
      '.mapbox', // Contains map and attributes
      '.attrgroup', // Groups of attributes
      '.postinginfos', // Posting information (date, ID, etc.)
      'p.attrgroup', // Paragraph-based attribute groups
      'div.mapbox', // Another map container
      '.notices', // Notices that might contain attributes
      '.content', // Generic content container
      'ul.notices', // List-based notices
      '.adInfo', // Ad information
      '.attrlist', // Attribute lists
      '.housing', // Housing-specific attributes
      '.attrsContainer', // Generic attributes container
      'div.mapAndAttrs', // Another map and attributes container
      'div.attrgroup', // Another attribute group container
      'section.attributes', // Section-based attributes
      'section.userbody', // User-provided content section
    ];

    // First pass: focus on the right-hand side containers that typically have product attributes
    const rightSideContainers = [
      '.mapAndAttrs',
      '.attrgroup',
      'div.mapAndAttrs',
      'section.attributes',
    ];
    for (const selector of rightSideContainers) {
      const containers = document.querySelectorAll(selector);
      containers.forEach(container => {
        // Look specifically for structured attribute elements
        const attrElements = container.querySelectorAll(
          '.attrgroup > span, .attr > span, .attr, p.attrgroup > span'
        );
        attrElements.forEach(element => {
          const text = element.textContent.trim();

          // Skip empty or very short texts
          if (!text || text.length < 3) return;

          // Try to extract key-value pairs
          if (text.includes(':')) {
            const [key, value] = text.split(':').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else if (text.includes('=')) {
            const [key, value] = text.split('=').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else if (text.includes(' - ')) {
            const [key, value] = text.split(' - ').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else {
            // For standalone attributes (like "pet friendly"), use as boolean flags
            addAttribute(text, true);
          }

          // Check for links within the element that might contain attribute values
          const links = element.querySelectorAll('a');
          links.forEach(link => {
            const linkText = link.textContent.trim();
            if (linkText && linkText.length > 1) {
              addAttribute(linkText, true);
            }
          });
        });

        // Also look for table-based attributes (sometimes used in right sidebar)
        const tableRows = container.querySelectorAll('table tr');
        tableRows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2) {
            const key = cells[0].textContent.trim();
            const value = cells[1].textContent.trim();
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          }
        });
      });
    }

    // Second pass: check other containers for additional attributes
    for (const selector of specContainers) {
      // Skip containers we already processed
      if (rightSideContainers.includes(selector)) continue;

      const containers = document.querySelectorAll(selector);
      containers.forEach(container => {
        // Look for key-value pairs in various formats
        const specElements = container.querySelectorAll('p, li, span, div, b');
        specElements.forEach(element => {
          const text = element.textContent.trim();

          // Skip empty or very short texts
          if (!text || text.length < 3) return;

          // Try to extract key-value pairs
          if (text.includes(':')) {
            const [key, value] = text.split(':').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else if (text.includes('=')) {
            const [key, value] = text.split('=').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else if (text.includes(' - ')) {
            const [key, value] = text.split(' - ').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          }
        });
      });
    }

    // Look for posting info elements which often contain important metadata
    const postingInfoElements = document.querySelectorAll('.postinginfo');

    postingInfoElements.forEach(element => {
      const text = element.textContent.trim();

      // Extract post ID
      const postIdMatch = text.match(/post\s*id:\s*(\d+)/i);
      if (postIdMatch) {
        addAttribute('post id', postIdMatch[1]);
      }

      // Extract posting date from time element with datetime attribute
      if (text.includes('posted:')) {
        const timeElement = element.querySelector('time.date.timeago');
        if (timeElement) {
          const datetime = timeElement.getAttribute('datetime');
          const title = timeElement.getAttribute('title');
          const textContent = timeElement.textContent.trim();

          if (datetime) {
            addAttribute('posted datetime', datetime);
            addAttribute('posted', title || textContent);
            logger.debug(`Extracted posting date: ${datetime} (${textContent})`);
          }
        } else {
          // Fallback to text parsing if no time element
          const postedMatch = text.match(/posted:\s*(.*)/i);
          if (postedMatch) {
            addAttribute('posted', postedMatch[1].trim());
          }
        }
      }

      // Extract update date from time element with datetime attribute
      if (text.includes('updated:')) {
        const timeElement = element.querySelector('time.date.timeago');
        if (timeElement) {
          const datetime = timeElement.getAttribute('datetime');
          const title = timeElement.getAttribute('title');
          const textContent = timeElement.textContent.trim();

          if (datetime) {
            addAttribute('updated datetime', datetime);
            addAttribute('updated', title || textContent);
            logger.debug(`Extracted updated date: ${datetime} (${textContent})`);
          }
        } else {
          // Fallback to text parsing if no time element
          const updatedMatch = text.match(/updated:\s*(.*)/i);
          if (updatedMatch) {
            addAttribute('updated', updatedMatch[1].trim());
          }
        }
      }
    });

    // 3. Extract from the posting body for additional specs
    if (postingBody) {
      logger.debug(`Extracting attributes from posting body (${postingBody.length} chars)`);

      // Check if this is a bike listing
      const isBikeListing = url.includes('/bik/') || url.includes('/bia/');

      // If this is a bike listing, use specialized extraction
      if (isBikeListing) {
        logger.debug('Using specialized bike attribute extraction for posting body');
        extractBikeAttributesFromBody(postingBody, addAttribute);
      }

      // Look for common specs patterns in the description
      const specPatterns = [
        { pattern: /(\w+[\s\w]*?):\s*([\w\s\d.]+)/g, keyIndex: 1, valueIndex: 2 },
        { pattern: /(\w+[\s\w]*?)\s*=\s*([\w\s\d.]+)/g, keyIndex: 1, valueIndex: 2 },
        { pattern: /(\w+[\s\w]*?)\s*-\s*([\w\s\d.]+)/g, keyIndex: 1, valueIndex: 2 },
      ];

      for (const { pattern, keyIndex, valueIndex } of specPatterns) {
        let match;
        // We need to create a new RegExp for each iteration to reset lastIndex
        const regex = new RegExp(pattern);
        while ((match = regex.exec(postingBody)) !== null) {
          const key = match[keyIndex].trim();
          const value = match[valueIndex].trim();

          // Only add if it looks like a valid spec (key is reasonable length, not a common word)
          if (
            key.length > 2 &&
            key.length < 30 &&
            !/^(and|the|this|that|with|for|from|have|has|had|not|are|is|was|were|will|would|could|should|may|might|must|can|do|does|did|but|or|if|then|than|when|where|why|how|all|any|both|each|few|more|most|some|such|only|very|same|too)$/i.test(
              key
            )
          ) {
            addAttribute(key, value);
          }
        }
      }

      // Extract category-specific attributes from the posting body
      // Try to determine the category from the URL if not provided
      const urlCategory = url.match(/\/([a-z]{3})\/d\//);
      const postCategory = urlCategory ? urlCategory[1] : '';

      // For bike listings only - be very strict about the category check
      if (postCategory === 'bia' || postCategory === 'bik') {
        // Look for specific bike-related specs
        const bikeSpecsPatterns = [
          { pattern: /(\d+)[\s-]?speed/i, key: 'speeds' },
          { pattern: /(\d+)[\s-]?inch|(\d+)"/i, key: 'wheel size' },
          { pattern: /(small|medium|large|s|m|l|xl)/i, key: 'size' },
          { pattern: /(carbon|aluminum|steel|titanium)/i, key: 'frame material' },
          { pattern: /(road|mountain|hybrid|cruiser|bmx|kids)/i, key: 'type' },
          {
            pattern: /(schwinn|trek|specialized|giant|cannondale|raleigh|diamondback|jamis)/i,
            key: 'brand',
          },
          { pattern: /(shimano|sram|campagnolo)/i, key: 'components' },
          { pattern: /(disc|rim|hydraulic|mechanical)[\s-]?brakes/i, key: 'brakes' },
          { pattern: /(front|rear|full)[\s-]?suspension/i, key: 'suspension' },
          { pattern: /(\d+)[\s-]?cm/i, key: 'frame size' },
        ];

        for (const { pattern, key } of bikeSpecsPatterns) {
          const match = postingBody.match(pattern);
          if (match) {
            addAttribute(key, match[1] || match[0]);
          }
        }
      }

      // For apartment/housing listings
      if (
        postCategory === 'apa' ||
        postCategory === 'hhh' ||
        postCategory.includes('housing') ||
        postCategory.includes('apartment')
      ) {
        // Look for specific housing-related specs
        const housingSpecsPatterns = [
          { pattern: /(\d+(?:\.\d+)?)\s*(?:bed|bedroom|br|bd)/i, key: 'bedrooms' },
          { pattern: /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba|bth)/i, key: 'bathrooms' },
          { pattern: /(\d+)\s*(?:sq\s*ft|sqft|sf|ft2|square\s*feet)/i, key: 'sqft' },
          { pattern: /\b(furnished)\b/i, key: 'furnished' },
          { pattern: /\b(pets|pet friendly|dog friendly|cat friendly)\b/i, key: 'pets allowed' },
          { pattern: /\b(parking|garage|driveway)\b/i, key: 'parking' },
          { pattern: /\b(laundry|washer|dryer|w\/d)\b/i, key: 'laundry' },
          { pattern: /\b(dishwasher)\b/i, key: 'dishwasher' },
          { pattern: /\b(air conditioning|ac|a\/c)\b/i, key: 'air conditioning' },
          { pattern: /\b(balcony|patio|deck)\b/i, key: 'outdoor space' },
        ];

        for (const { pattern, key } of housingSpecsPatterns) {
          const match = postingBody.match(pattern);
          if (match) {
            addAttribute(key, match[1] || match[0]);
          }
        }
      }
    }

    // 4. Extract structured data from JSON-LD if available
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const jsonLdData = JSON.parse(script.textContent);

        // Extract from Product type
        if (jsonLdData['@type'] === 'Product') {
          if (jsonLdData.brand && jsonLdData.brand.name) {
            addAttribute('brand', jsonLdData.brand.name);
          }

          if (jsonLdData.model) {
            addAttribute('model', jsonLdData.model);
          }

          // Extract any additional properties
          if (jsonLdData.additionalProperty && Array.isArray(jsonLdData.additionalProperty)) {
            jsonLdData.additionalProperty.forEach(prop => {
              if (prop.name && prop.value) {
                addAttribute(prop.name, prop.value);
              }
            });
          }
        }

        // Extract from other types
        if (jsonLdData.offers) {
          if (jsonLdData.offers.itemCondition) {
            addAttribute(
              'condition',
              jsonLdData.offers.itemCondition.replace('http://schema.org/', '')
            );
          }
        }

        // Extract any top-level properties that might be useful
        for (const [key, value] of Object.entries(jsonLdData)) {
          if (typeof value === 'string' || typeof value === 'number') {
            // Skip type and context
            if (key !== '@type' && key !== '@context') {
              addAttribute(key, value);
            }
          }
        }
      } catch (error) {
        logger.error(`Error parsing JSON-LD data: ${error.message}`);
      }
    });

    // 5. Extract from meta tags
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');

      if (name && content && content.length > 0) {
        // Skip some common meta tags that aren't useful as specs
        if (!['viewport', 'description', 'keywords', 'robots', 'generator'].includes(name)) {
          // Clean up the name
          const cleanName = name.replace('og:', '').replace('twitter:', '');
          addAttribute(cleanName, content);
        }
      }
    });

    // Get posting location
    const mapElement = document.querySelector('#map');
    let latitude = null;
    let longitude = null;

    if (mapElement) {
      latitude = mapElement.getAttribute('data-latitude');
      longitude = mapElement.getAttribute('data-longitude');
    }

    // Final pass to clean up and deduplicate attributes
    const cleanedAttributes = {};

    // First, add all key-value pairs (non-boolean attributes)
    for (const [key, value] of Object.entries(tempAttributes)) {
      if (value !== true) {
        cleanedAttributes[key] = value;
      }
    }

    // Create a set of values that should not be added as boolean flags
    const valueSet = new Set();
    for (const value of Object.values(cleanedAttributes)) {
      if (typeof value === 'string') {
        valueSet.add(value.toLowerCase());
      }
    }

    // Then, add boolean flags only if they don't exist as keys already
    // and don't match any existing values
    for (const [key, value] of Object.entries(tempAttributes)) {
      if (
        value === true &&
        !Object.prototype.hasOwnProperty.call(cleanedAttributes, key) &&
        !valueSet.has(key.toLowerCase())
      ) {
        cleanedAttributes[key] = true;
      }
    }

    // Extract price from meta tags if not already found
    if (!price) {
      const priceMetaTag = document.querySelector('meta[property="og:price:amount"]');
      if (priceMetaTag) {
        const priceAmount = priceMetaTag.getAttribute('content');
        if (priceAmount) {
          const priceCurrencyTag = document.querySelector('meta[property="og:price:currency"]');
          const currency = priceCurrencyTag ? priceCurrencyTag.getAttribute('content') || '$' : '$';
          const formattedPrice = `${currency}${priceAmount}`;
          addAttribute('price', formattedPrice);
        }
      }
    }

    // Extract location from meta tags if not already found
    if (!latitude && !longitude) {
      const geoPositionTag = document.querySelector('meta[name="geo.position"]');
      if (geoPositionTag) {
        const geoPosition = geoPositionTag.getAttribute('content');
        if (geoPosition) {
          const [lat, lng] = geoPosition.split(';');
          if (lat && lng) {
            latitude = lat;
            longitude = lng;
          }
        }
      }
    }

    // Extract location name from meta tags
    let locationName = null;
    const geoPlacenameTag = document.querySelector('meta[name="geo.placename"]');
    if (geoPlacenameTag) {
      locationName = geoPlacenameTag.getAttribute('content');
    }

    return {
      title,
      price,
      description: postingBody,
      postingDate,
      images: galleryImages.length > 0 ? galleryImages : images, // Prefer gallery images if available
      attributes: { ...cleanedAttributes, ...parsedAttributes }, // Merge both attribute sets
      specs: { ...cleanedAttributes, ...parsedAttributes }, // Alias for attributes for clarity
      location: {
        name: locationName || mapAddress, // Use map address if no location name
        latitude,
        longitude,
        address: mapAddress, // Include the specific address
      },
      url,
      galleryImages, // Include gallery images separately
      mapAddress, // Include map address separately
    };
  } catch (error) {
    logger.error(`Error parsing posting details: ${error.message}`);
    return null;
  }
}
