/**
 * Main entry point for the refactored Craigslist library
 * Exports all the modular components
 */

// Main API
export { CraigslistAPI, craigslistAPI as default } from './api-refactored.js';

// Core search functionality
export {
  searchCraigslist,
  getPostingDetails,
  searchWithPagination,
  getAvailableCategories,
} from './search.js';

// Browser management
export { getBrowser, closeBrowser, PuppeteerError } from './browser.js';

// HTTP utilities
export { fetchWithRetry, fetchWithPuppeteer } from './http.js';

// Parsing utilities
export {
  parseSearchResults,
  parsePostingDetails,
  extractPostingUrls,
  isErrorPage,
} from './parsing.js';

// Parallel processing
export {
  processInParallel,
  processPostingDetails,
  processCitiesInParallel,
  RateLimiter,
  createRateLimitedFunction,
} from './parallel.js';

// Pagination utilities
export {
  implementInfiniteScroll,
  navigatePagination,
  extractPaginationInfo,
  buildPaginationUrls,
  estimateTotalPages,
} from './pagination.js';

// Utility functions
export {
  getRandomUserAgent,
  delay,
  createSlugFromTitle,
  extractSubcityFromUrl,
  extractNumericPrice,
  extractImageId,
  calculateSimilarity,
  deduplicateByTitle,
  BASE_URL,
  PARALLEL_CONFIG,
} from './utils.js';
