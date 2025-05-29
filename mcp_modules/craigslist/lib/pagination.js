/**
 * Pagination utilities for Craigslist scraping
 * Handles infinite scroll and pagination logic
 */

import { logger } from '../../../src/utils/logger.js';
import { delay } from './utils.js';

/**
 * Implement infinite scroll pagination for search results
 * @param {Page} page - Puppeteer page object
 * @param {Object} options - Pagination options
 * @returns {Promise<void>}
 */
export async function implementInfiniteScroll(page, options = {}) {
  const { maxScrolls = 5, scrollDelay = 2000, waitForResults = 3000 } = options;

  try {
    logger.info('Implementing infinite scroll pagination');

    // Wait for initial content to load
    await delay(waitForResults);

    let scrollCount = 0;
    let previousHeight = 0;

    while (scrollCount < maxScrolls) {
      // Get current page height
      const currentHeight = await page.evaluate(() => document.body.scrollHeight); // eslint-disable-line no-undef

      // If height hasn't changed, we might have reached the end
      if (currentHeight === previousHeight && scrollCount > 0) {
        logger.info('Page height unchanged, might have reached end of results');
        break;
      }

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight); // eslint-disable-line no-undef
      });

      logger.debug(`Scroll ${scrollCount + 1}/${maxScrolls} - Height: ${currentHeight}`);

      // Wait for new content to load
      await delay(scrollDelay);

      // Try to wait for new results to appear
      try {
        await page.waitForFunction(
          prevHeight => document.body.scrollHeight > prevHeight, // eslint-disable-line no-undef
          { timeout: waitForResults },
          currentHeight
        );
        logger.debug('New content loaded after scroll');
      } catch (timeoutError) {
        logger.debug('No new content detected after scroll');
      }

      previousHeight = currentHeight;
      scrollCount++;
    }

    logger.info(`Completed infinite scroll with ${scrollCount} scrolls`);
  } catch (error) {
    logger.error(`Error during infinite scroll: ${error.message}`);
  }
}

/**
 * Navigate through traditional pagination links
 * @param {Page} page - Puppeteer page object
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} Array of page URLs visited
 */
export async function navigatePagination(page, options = {}) {
  const { maxPages = 5, pageDelay = 2000 } = options;

  const visitedUrls = [];

  try {
    logger.info('Navigating through pagination links');

    let currentPage = 1;

    while (currentPage <= maxPages) {
      const currentUrl = page.url();
      visitedUrls.push(currentUrl);

      logger.info(`Processing page ${currentPage}/${maxPages}: ${currentUrl}`);

      // Look for next page link
      const nextPageLink = await page.$(
        'a.next, .pagination .next, a[aria-label="next"], .paginator .next'
      );

      if (!nextPageLink) {
        logger.info('No next page link found, reached end of pagination');
        break;
      }

      // Check if next link is disabled
      const isDisabled = await page.evaluate(link => {
        return (
          link.classList.contains('disabled') ||
          link.getAttribute('aria-disabled') === 'true' ||
          link.hasAttribute('disabled')
        );
      }, nextPageLink);

      if (isDisabled) {
        logger.info('Next page link is disabled, reached end of pagination');
        break;
      }

      // Click next page link
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          nextPageLink.click(),
        ]);

        logger.info(`Successfully navigated to page ${currentPage + 1}`);

        // Wait for page to load
        await delay(pageDelay);
      } catch (navigationError) {
        logger.error(`Error navigating to next page: ${navigationError.message}`);
        break;
      }

      currentPage++;
    }

    logger.info(`Completed pagination navigation, visited ${visitedUrls.length} pages`);
    return visitedUrls;
  } catch (error) {
    logger.error(`Error during pagination navigation: ${error.message}`);
    return visitedUrls;
  }
}

/**
 * Extract pagination information from the current page
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<Object>} Pagination info
 */
export async function extractPaginationInfo(page) {
  try {
    const paginationInfo = await page.evaluate(() => {
      // Look for pagination elements
      const paginationContainer = document.querySelector('.pagination, .paginator, .page-links'); // eslint-disable-line no-undef

      if (!paginationContainer) {
        return { hasNextPage: false, currentPage: 1, totalPages: 1 };
      }

      // Extract current page
      const currentPageElement = paginationContainer.querySelector(
        '.current, .active, [aria-current="page"]'
      );
      const currentPage = currentPageElement ? parseInt(currentPageElement.textContent) || 1 : 1;

      // Check for next page
      const nextPageLink = paginationContainer.querySelector('a.next, .next:not(.disabled)');
      const hasNextPage = nextPageLink && !nextPageLink.classList.contains('disabled');

      // Try to extract total pages
      const pageLinks = paginationContainer.querySelectorAll('a[href*="page="], a[href*="s="]');
      let totalPages = 1;

      for (const link of pageLinks) {
        const pageNum = parseInt(link.textContent);
        if (pageNum && pageNum > totalPages) {
          totalPages = pageNum;
        }
      }

      return {
        hasNextPage,
        currentPage,
        totalPages,
        paginationExists: true,
      };
    });

    logger.debug(`Pagination info: ${JSON.stringify(paginationInfo)}`);
    return paginationInfo;
  } catch (error) {
    logger.error(`Error extracting pagination info: ${error.message}`);
    return { hasNextPage: false, currentPage: 1, totalPages: 1, paginationExists: false };
  }
}

/**
 * Build pagination URLs for a search
 * @param {string} baseUrl - Base search URL
 * @param {number} totalPages - Total number of pages
 * @param {number} resultsPerPage - Results per page (default 120 for Craigslist)
 * @returns {Array<string>} Array of pagination URLs
 */
export function buildPaginationUrls(baseUrl, totalPages, resultsPerPage = 120) {
  const urls = [];

  for (let page = 0; page < totalPages; page++) {
    const startIndex = page * resultsPerPage;

    // Add start parameter to URL
    const url = new URL(baseUrl);
    if (startIndex > 0) {
      url.searchParams.set('s', startIndex.toString());
    }

    urls.push(url.toString());
  }

  logger.info(`Built ${urls.length} pagination URLs`);
  return urls;
}

/**
 * Estimate total pages based on result count
 * @param {string} html - HTML content from search page
 * @param {number} resultsPerPage - Results per page
 * @returns {number} Estimated total pages
 */
export function estimateTotalPages(html, resultsPerPage = 120) {
  try {
    // Look for result count indicators in the HTML
    const resultCountPatterns = [
      /(\d+)\s*results?/i,
      /showing\s+\d+\s*-\s*\d+\s+of\s+(\d+)/i,
      /(\d+)\s*listings?/i,
    ];

    let totalResults = 0;

    for (const pattern of resultCountPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        totalResults = parseInt(match[1]);
        break;
      }
    }

    if (totalResults === 0) {
      // Fallback: count actual result elements in HTML
      const resultElementPatterns = [
        /<li[^>]*class="[^"]*result-row[^"]*"/g,
        /<div[^>]*class="[^"]*cl-search-result[^"]*"/g,
        /<li[^>]*class="[^"]*cl-search-result[^"]*"/g,
      ];

      for (const pattern of resultElementPatterns) {
        const matches = html.match(pattern);
        if (matches) {
          totalResults = matches.length;
          break;
        }
      }
    }

    const totalPages = Math.ceil(totalResults / resultsPerPage);
    logger.info(`Estimated ${totalPages} total pages based on ${totalResults} results`);

    return Math.max(1, totalPages);
  } catch (error) {
    logger.error(`Error estimating total pages: ${error.message}`);
    return 1;
  }
}
