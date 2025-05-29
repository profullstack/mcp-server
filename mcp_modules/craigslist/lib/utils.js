/**
 * Utility functions for Craigslist scraping
 * Contains helper functions for URLs, delays, user agents, etc.
 */

import { logger } from '../../../src/utils/logger.js';

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

/**
 * Get a random user agent
 * @returns {string} Random user agent string
 */
export function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Add a delay function
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a URL-friendly slug from a title
 * @param {string} title - The title to convert to a slug
 * @returns {string} A URL-friendly slug
 */
export function createSlugFromTitle(title) {
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
 * Extract slug from a Craigslist URL
 * @param {string} url - The URL to extract from
 * @returns {string|null} The slug or null if not found
 */
export function extractSlugFromUrl(url) {
  if (!url) {
    logger.debug('extractSlugFromUrl: No URL provided');
    return null;
  }

  // Try to match the slug from Craigslist URL
  // Format: https://city.craigslist.org/subcity/category/d/slug/postId.html
  const match = url.match(/\/d\/([^/]+)\/\d+\.html/i);

  if (match && match[1]) {
    logger.info(`✅ Extracted slug from URL: "${match[1]}" from ${url}`);
    return match[1];
  }

  logger.warn(`❌ No slug found in URL: ${url}`);
  return null;
}

/**
 * Get slug with fallback - extract from URL first, then generate from title
 * @param {string} url - The URL to extract slug from
 * @param {string} title - The title to generate slug from as fallback
 * @returns {string} The slug (extracted or generated)
 */
export function getSlugWithFallback(url, title) {
  logger.info(`🔄 getSlugWithFallback called with URL: "${url}", Title: "${title}"`);

  // First try to extract from URL
  const extractedSlug = extractSlugFromUrl(url);
  if (extractedSlug) {
    logger.info(`✅ Using extracted slug: "${extractedSlug}"`);
    return extractedSlug;
  }

  // Fallback to generating from title
  const generatedSlug = createSlugFromTitle(title);
  logger.info(`🔄 Using generated slug: "${generatedSlug}" (no URL slug found)`);
  return generatedSlug;
}

/**
 * Extract subcity code from a Craigslist URL
 * @param {string} url - The URL to extract from
 * @returns {string|null} The subcity code or null if not found
 */
export function extractSubcityFromUrl(url) {
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
export function extractNumericPrice(priceStr) {
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
export function extractImageId(imageUrl) {
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
 * Calculate similarity between two strings (simple implementation)
 * @param {string} str1
 * @param {string} str2
 * @returns {number} Similarity score between 0 and 1
 */
export function calculateSimilarity(str1, str2) {
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
 * Deduplicate search results based on title similarity
 * @param {Array} results - Array of search results
 * @returns {Array} Deduplicated results
 */
export function deduplicateByTitle(results) {
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
 * Base URL for Craigslist sites
 * @type {string}
 */
export const BASE_URL = 'https://{city}.craigslist.org';

/**
 * Configuration for parallel processing
 */
export const PARALLEL_CONFIG = {
  // Maximum number of concurrent city searches
  MAX_CONCURRENT_CITIES: parseInt(process.env.MAX_CONCURRENT_CITIES) || 10,
  // Maximum number of concurrent posting detail fetches
  MAX_CONCURRENT_DETAILS: parseInt(process.env.MAX_CONCURRENT_DETAILS) || 10,
  // Delay between batches (ms)
  BATCH_DELAY: parseInt(process.env.BATCH_DELAY) || 1000,
  // Delay between individual requests (ms)
  REQUEST_DELAY: parseInt(process.env.REQUEST_DELAY) || 500,
};
