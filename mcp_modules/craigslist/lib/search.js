/**
 * Search functionality for Craigslist scraping
 * Main search orchestration and result processing
 */

import { logger } from '../../../src/utils/logger.js';
import { fetchWithPuppeteer, fetchWithRetry } from './http.js';
import { parseSearchResults, parsePostingDetails, isErrorPage } from './parsing.js';
import { processInParallel, processPostingDetails, processCitiesInParallel } from './parallel.js';
import { deduplicateByTitle, BASE_URL } from './utils.js';
import { buildPaginationUrls, estimateTotalPages } from './pagination.js';

/**
 * Search Craigslist for listings
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Array of search results
 */
export async function searchCraigslist(params) {
  const {
    query = '',
    category = 'sss', // for sale by owner
    city = 'sandiego',
    cities = [],
    subcategory = '',
    minPrice = null,
    maxPrice = null,
    limit = 100,
    includeDetails = false,
    usePuppeteer = true,
  } = params;

  try {
    logger.info(
      `Starting Craigslist search: query="${query}", category="${category}", city="${city}"`
    );

    // If multiple cities are specified, process them in parallel
    if (cities && cities.length > 0) {
      return await searchMultipleCities({ ...params, cities });
    }

    // Single city search
    const searchUrl = buildSearchUrl({ query, category, city, subcategory, minPrice, maxPrice });
    logger.info(`Search URL: ${searchUrl}`);

    // Fetch search results
    const searchResults = await fetchSearchResults(searchUrl, city, usePuppeteer);

    if (!searchResults || searchResults.length === 0) {
      logger.warn('No search results found');
      return [];
    }

    logger.info(`Found ${searchResults.length} search results`);

    // Apply limit
    const limitedResults = limit > 0 ? searchResults.slice(0, limit) : searchResults;

    // Fetch posting details if requested
    if (includeDetails) {
      logger.info('Fetching posting details...');
      const detailsFetcher = async url => {
        try {
          const response = usePuppeteer ? await fetchWithPuppeteer(url) : await fetchWithRetry(url);

          const html = await response.text();

          if (isErrorPage(html)) {
            throw new Error(`Invalid or empty content received for ${url}`);
          }

          return parsePostingDetails(html, url);
        } catch (error) {
          logger.error(`Error fetching details for ${url}: ${error.message}`);
          throw error;
        }
      };

      const resultsWithDetails = await processPostingDetails(limitedResults, detailsFetcher);
      return deduplicateByTitle(resultsWithDetails);
    }

    return deduplicateByTitle(limitedResults);
  } catch (error) {
    logger.error(`Error in searchCraigslist: ${error.message}`);
    throw error;
  }
}

/**
 * Search multiple cities in parallel
 * @param {Object} params - Search parameters with cities array
 * @returns {Promise<Array>} Combined results from all cities
 */
async function searchMultipleCities(params) {
  const { cities, ...searchParams } = params;

  logger.info(`Searching ${cities.length} cities in parallel`);

  const cityProcessor = async city => {
    try {
      const cityResults = await searchCraigslist({ ...searchParams, city });
      return cityResults.map(result => ({ ...result, city }));
    } catch (error) {
      logger.error(`Error searching city ${city}: ${error.message}`);
      return [];
    }
  };

  const allResults = await processCitiesInParallel(cities, cityProcessor);
  return deduplicateByTitle(allResults);
}

/**
 * Fetch search results from a search URL
 * @param {string} searchUrl - The search URL
 * @param {string} city - City code
 * @param {boolean} usePuppeteer - Whether to use Puppeteer
 * @returns {Promise<Array>} Array of search results
 */
async function fetchSearchResults(searchUrl, city, usePuppeteer = true) {
  try {
    logger.info(`Fetching search results from: ${searchUrl}`);

    const response = usePuppeteer
      ? await fetchWithPuppeteer(searchUrl)
      : await fetchWithRetry(searchUrl);

    const html = await response.text();

    if (isErrorPage(html)) {
      throw new Error('Search page returned an error or no results');
    }

    const results = parseSearchResults(html, city);

    if (results.length === 0) {
      logger.warn('No results found in search page HTML');
    }

    return results;
  } catch (error) {
    logger.error(`Error fetching search results: ${error.message}`);
    throw error;
  }
}

/**
 * Build search URL from parameters
 * @param {Object} params - Search parameters
 * @returns {string} Complete search URL
 */
function buildSearchUrl(params) {
  const {
    query = '',
    category = 'sss',
    city = 'sandiego',
    subcategory = '',
    minPrice = null,
    maxPrice = null,
  } = params;

  // Start with base URL
  const baseUrl = BASE_URL.replace('{city}', city);

  // Build category path
  let categoryPath = `/search/${category}`;
  if (subcategory) {
    categoryPath += `/${subcategory}`;
  }

  // Create URL object
  const url = new URL(categoryPath, baseUrl);

  // Add query parameter
  if (query) {
    url.searchParams.set('query', query);
  }

  // Add price filters
  if (minPrice !== null && minPrice > 0) {
    url.searchParams.set('min_price', minPrice.toString());
  }

  if (maxPrice !== null && maxPrice > 0) {
    url.searchParams.set('max_price', maxPrice.toString());
  }

  // Add other common parameters
  url.searchParams.set('sort', 'rel'); // Sort by relevance
  url.searchParams.set('bundleDuplicates', '1'); // Bundle duplicates

  return url.toString();
}

/**
 * Get posting details by URL
 * @param {string} postingUrl - URL of the posting
 * @param {boolean} usePuppeteer - Whether to use Puppeteer
 * @returns {Promise<Object>} Posting details
 */
export async function getPostingDetails(postingUrl, usePuppeteer = true) {
  try {
    logger.info(`Fetching posting details: ${postingUrl}`);

    const response = usePuppeteer
      ? await fetchWithPuppeteer(postingUrl)
      : await fetchWithRetry(postingUrl);

    const html = await response.text();

    if (isErrorPage(html)) {
      throw new Error(`Invalid or empty content received for ${postingUrl}`);
    }

    return parsePostingDetails(html, postingUrl);
  } catch (error) {
    logger.error(`Error fetching posting details: ${error.message}`);
    throw error;
  }
}

/**
 * Search with pagination support
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} All results from all pages
 */
export async function searchWithPagination(params) {
  const { maxPages = 5, resultsPerPage = 120, ...searchParams } = params;

  try {
    logger.info(`Starting paginated search with max ${maxPages} pages`);

    // Get first page to estimate total pages
    const firstPageUrl = buildSearchUrl(searchParams);
    const firstPageResponse = await fetchWithPuppeteer(firstPageUrl);
    const firstPageHtml = await firstPageResponse.text();

    if (isErrorPage(firstPageHtml)) {
      throw new Error('First page returned an error');
    }

    // Parse first page results
    const firstPageResults = parseSearchResults(firstPageHtml, searchParams.city || 'sandiego');

    // Estimate total pages
    const estimatedPages = Math.min(maxPages, estimateTotalPages(firstPageHtml, resultsPerPage));

    if (estimatedPages <= 1) {
      logger.info('Only one page of results available');
      return firstPageResults;
    }

    // Build URLs for all pages
    const pageUrls = buildPaginationUrls(firstPageUrl, estimatedPages, resultsPerPage);

    // Process all pages in parallel (excluding first page since we already have it)
    const remainingUrls = pageUrls.slice(1);

    const pageProcessor = async url => {
      try {
        const response = await fetchWithPuppeteer(url);
        const html = await response.text();

        if (isErrorPage(html)) {
          logger.warn(`Page returned error: ${url}`);
          return [];
        }

        return parseSearchResults(html, searchParams.city || 'sandiego');
      } catch (error) {
        logger.error(`Error processing page ${url}: ${error.message}`);
        return [];
      }
    };

    const remainingResults = await processInParallel(remainingUrls, pageProcessor, 3, 2000);

    // Combine all results
    const allResults = [firstPageResults, ...remainingResults].flat();

    logger.info(`Collected ${allResults.length} total results from ${estimatedPages} pages`);

    return deduplicateByTitle(allResults);
  } catch (error) {
    logger.error(`Error in paginated search: ${error.message}`);
    throw error;
  }
}

/**
 * Get available categories for a city
 * @param {string} city - City code
 * @returns {Promise<Array>} Array of available categories
 */
export async function getAvailableCategories() {
  // TODO: Implement actual category parsing from Craigslist main page
  // const baseUrl = BASE_URL.replace('{city}', city);
  // const response = await fetchWithRetry(baseUrl);
  // const html = await response.text();

  // For now, return common categories
  return [
    { code: 'sss', name: 'for sale by owner' },
    { code: 'hhh', name: 'housing' },
    { code: 'jjj', name: 'jobs' },
    { code: 'ggg', name: 'gigs' },
    { code: 'rrr', name: 'resumes' },
    { code: 'ccc', name: 'community' },
    { code: 'eee', name: 'events' },
    { code: 'sss', name: 'services' },
  ];
}
