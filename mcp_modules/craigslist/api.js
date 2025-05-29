/**
 * Craigslist API - Compatibility Layer
 * This file serves as a compatibility wrapper for the refactored modular code.
 * All functionality has been moved to the lib/ directory for better organization.
 */

// Import all functionality from the refactored lib modules
export {
  searchCraigslist,
  getPostingDetails,
  searchWithPagination,
  getAvailableCategories,
} from './lib/search.js';

export { parseSearchResults, parsePostingDetails, isErrorPage } from './lib/parsing.js';

export { fetchWithPuppeteer, fetchWithRetry } from './lib/http.js';

export {
  processInParallel,
  processPostingDetails,
  processCitiesInParallel,
} from './lib/parallel.js';

export {
  implementInfiniteScroll,
  navigatePagination,
  extractPaginationInfo,
  buildPaginationUrls,
  estimateTotalPages,
} from './lib/pagination.js';

export { getBrowser, closeBrowser, PuppeteerError } from './lib/browser.js';

export {
  getRandomUserAgent,
  delay,
  createSlugFromTitle,
  extractSlugFromUrl,
  getSlugWithFallback,
  extractSubcityFromUrl,
  extractNumericPrice,
  extractImageId,
  calculateSimilarity,
  deduplicateByTitle,
  BASE_URL,
  PARALLEL_CONFIG,
} from './lib/utils.js';

// Re-export everything from the main lib index for convenience
export * from './lib/index.js';
