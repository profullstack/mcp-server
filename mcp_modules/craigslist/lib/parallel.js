/**
 * Parallel processing utilities for Craigslist scraping
 * Handles concurrent operations with configurable limits
 */

import { logger } from '../../../src/utils/logger.js';
import { delay, PARALLEL_CONFIG } from './utils.js';

/**
 * Process items in parallel with configurable concurrency
 * @param {Array} items - Items to process
 * @param {Function} processor - Function to process each item
 * @param {number} concurrency - Maximum concurrent operations
 * @param {number} delayMs - Delay between batches
 * @returns {Promise<Array>} Results array
 */
export async function processInParallel(items, processor, concurrency = 5, delayMs = 1000) {
  const results = [];
  const batches = [];

  // Split items into batches
  for (let i = 0; i < items.length; i += concurrency) {
    batches.push(items.slice(i, i + concurrency));
  }

  logger.info(
    `Processing ${items.length} items in ${batches.length} batches with concurrency ${concurrency}`
  );

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);

    // Process batch in parallel
    const batchPromises = batch.map(async (item, index) => {
      try {
        // Add a small delay between individual requests within a batch
        if (index > 0) {
          await delay(PARALLEL_CONFIG.REQUEST_DELAY);
        }
        return await processor(item);
      } catch (error) {
        logger.error(`Error processing item in batch ${i + 1}: ${error.message}`);
        return null; // Return null for failed items
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    logger.info(
      `Batch ${i + 1}/${batches.length} completed. Total results: ${results.filter(r => r !== null).length}/${results.length}`
    );

    // Add delay between batches (except for the last batch)
    if (i < batches.length - 1) {
      await delay(delayMs);
    }
  }

  return results.filter(result => result !== null); // Filter out failed items
}

/**
 * Process posting details in parallel with rate limiting
 * @param {Array} postings - Array of posting objects with URLs
 * @param {Function} detailsFetcher - Function to fetch details for a posting
 * @returns {Promise<Array>} Array of postings with details
 */
export async function processPostingDetails(postings, detailsFetcher) {
  if (!postings || postings.length === 0) {
    return [];
  }

  logger.info(`Processing details for ${postings.length} postings`);

  const processor = async posting => {
    try {
      const details = await detailsFetcher(posting.url);
      return {
        ...posting,
        ...details,
      };
    } catch (error) {
      logger.error(`Error fetching details for ${posting.url}: ${error.message}`);
      return posting; // Return original posting if details fetch fails
    }
  };

  return await processInParallel(
    postings,
    processor,
    PARALLEL_CONFIG.MAX_CONCURRENT_DETAILS,
    PARALLEL_CONFIG.BATCH_DELAY
  );
}

/**
 * Process multiple cities in parallel
 * @param {Array} cities - Array of city codes
 * @param {Function} cityProcessor - Function to process each city
 * @returns {Promise<Array>} Combined results from all cities
 */
export async function processCitiesInParallel(cities, cityProcessor) {
  if (!cities || cities.length === 0) {
    return [];
  }

  logger.info(`Processing ${cities.length} cities in parallel`);

  const processor = async city => {
    try {
      logger.info(`Processing city: ${city}`);
      const results = await cityProcessor(city);
      logger.info(`City ${city} completed with ${results?.length || 0} results`);
      return results || [];
    } catch (error) {
      logger.error(`Error processing city ${city}: ${error.message}`);
      return [];
    }
  };

  const allResults = await processInParallel(
    cities,
    processor,
    PARALLEL_CONFIG.MAX_CONCURRENT_CITIES,
    PARALLEL_CONFIG.BATCH_DELAY
  );

  // Flatten results from all cities
  const flatResults = allResults.flat();
  logger.info(`Total results from all cities: ${flatResults.length}`);

  return flatResults;
}

/**
 * Rate limiter class to control request frequency
 */
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * Wait if necessary to respect rate limits
   * @returns {Promise<void>}
   */
  async waitIfNeeded() {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // If we're at the limit, wait until the oldest request expires
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer

      if (waitTime > 0) {
        logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
        await delay(waitTime);
      }
    }

    // Record this request
    this.requests.push(now);
  }
}

/**
 * Create a rate-limited version of a function
 * @param {Function} fn - Function to rate limit
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Rate-limited function
 */
export function createRateLimitedFunction(fn, maxRequests = 10, windowMs = 60000) {
  const rateLimiter = new RateLimiter(maxRequests, windowMs);

  return async (...args) => {
    await rateLimiter.waitIfNeeded();
    return await fn(...args);
  };
}
