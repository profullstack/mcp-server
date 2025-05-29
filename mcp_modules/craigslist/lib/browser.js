/**
 * Browser management utilities for Craigslist scraping
 * Handles Puppeteer browser instance creation and management
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from '../../../src/utils/logger.js';

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

// Get proxy URL from environment variables
const PROXY_URL = process.env.WEBSHARE_PROXY;

// Puppeteer browser instance (lazy-loaded)
let browser = null;

/**
 * Custom error class for Puppeteer-related errors
 */
export class PuppeteerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PuppeteerError';
    this.status = 500;
    this.code = 'CHROME_NOT_FOUND';
  }
}

/**
 * Get or create a Puppeteer browser instance
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
export async function getBrowser() {
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
 * Close the browser instance
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    logger.info('Browser closed');
  }
}
