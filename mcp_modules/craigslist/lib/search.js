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
    isDirectSearch = false, // Flag to indicate direct search vs. multi-city search
    isNestedCall = false, // Flag to prevent infinite recursion
  } = params;

  try {
    // Validate city if provided
    if (city && city !== 'sandiego') {
      // Simple validation to check if city looks like a valid domain name component
      const validCityRegex = /^[a-z0-9-]{2,50}$/;
      if (!validCityRegex.test(city)) {
        throw new Error(`Invalid city format: ${city}`);
      }
    }

    logger.info(
      `Starting Craigslist search: query="${query}", category="${category}", city="${city}"`
    );

    // If cities array is provided and this is not a direct search
    if (Array.isArray(cities) && !isDirectSearch) {
      // Only return empty results if cities array is empty AND this is the top-level call
      if (cities.length === 0 && !isNestedCall) {
        logger.info('Empty cities array provided, returning empty results');
        return [];
      }

      // Prevent infinite recursion by checking if this is already a nested call
      if (!isNestedCall) {
        logger.info(`Delegating to searchMultipleCities with ${cities.length} cities`);
        return await searchMultipleCities({
          ...params,
          isNestedCall: true,
        });
      }
    }

    // If we have a city parameter, we should use it for direct search
    logger.info(`Performing direct search for city: ${city}`);

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

  // Validate cities array
  if (!Array.isArray(cities) || cities.length === 0) {
    logger.warn('Invalid or empty cities array provided to searchMultipleCities');
    return [];
  }

  logger.info(`Searching ${cities.length} cities in parallel`);

  const cityProcessor = async city => {
    try {
      logger.info(`Processing city ${city} with direct search`);
      // Pass isDirectSearch flag to prevent recursion
      const cityResults = await searchCraigslist({
        ...searchParams,
        city,
        isDirectSearch: true,
      });

      if (cityResults && cityResults.length > 0) {
        logger.info(`Found ${cityResults.length} results for city ${city}`);
        return cityResults.map(result => ({ ...result, city }));
      } else {
        logger.warn(`No results found for city ${city}`);
        return [];
      }
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

    // Add debug logging
    logger.debug(`Search URL: ${searchUrl}, City: ${city}, UsePuppeteer: ${usePuppeteer}`);

    // Try a direct fetch first to see if we can get results
    let response;
    let html;

    try {
      // First try with Puppeteer if enabled
      if (usePuppeteer) {
        logger.info(`Using Puppeteer to fetch: ${searchUrl}`);
        response = await fetchWithPuppeteer(searchUrl);
      } else {
        logger.info(`Using direct HTTP fetch: ${searchUrl}`);
        response = await fetchWithRetry(searchUrl);
      }

      html = await response.text();
      logger.info(`Received HTML response of length: ${html.length}`);

      // Check if we got a valid response
      if (html.length < 1000) {
        logger.warn(
          `Suspiciously short HTML response (${html.length} chars), might be an error page`
        );
        logger.debug(`Short HTML content: ${html}`);
      }
    } catch (fetchError) {
      logger.error(`Error during initial fetch: ${fetchError.message}`);

      // If Puppeteer failed, try direct HTTP fetch as fallback
      if (usePuppeteer) {
        logger.info('Puppeteer fetch failed, trying direct HTTP fetch as fallback');
        try {
          response = await fetchWithRetry(searchUrl);
          html = await response.text();
          logger.info(`Fallback fetch successful, received ${html.length} chars`);
        } catch (fallbackError) {
          logger.error(`Fallback fetch also failed: ${fallbackError.message}`);
          throw fallbackError;
        }
      } else {
        throw fetchError;
      }
    }

    // Check if it's an error page
    if (isErrorPage(html)) {
      logger.warn(`Error page detected for URL: ${searchUrl}`);

      // Save the error page for debugging
      try {
        const fs = await import('fs');
        const path = await import('path');
        const debugDir = path.join(process.cwd(), 'debug');
        await fs.promises.mkdir(debugDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = path.join(debugDir, `error-page-${city}-${timestamp}.html`);
        await fs.promises.writeFile(filename, html);
        logger.info(`Saved error page HTML to ${filename}`);
      } catch (fsError) {
        logger.error(`Failed to save error page HTML: ${fsError.message}`);
      }

      throw new Error('Search page returned an error or no results');
    }

    // Parse the results
    const results = parseSearchResults(html, city);
    logger.info(`Parsed ${results.length} results from search page`);

    if (results.length === 0) {
      logger.warn('No results found in search page HTML');

      // Debug: Save the HTML to a file for inspection
      try {
        const fs = await import('fs');
        const path = await import('path');
        const debugDir = path.join(process.cwd(), 'debug');

        // Create debug directory if it doesn't exist
        await fs.promises.mkdir(debugDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = path.join(debugDir, `empty-results-${city}-${timestamp}.html`);

        await fs.promises.writeFile(filename, html);
        logger.info(`Saved empty results HTML to ${filename}`);
      } catch (fsError) {
        logger.error(`Failed to save debug HTML: ${fsError.message}`);
      }
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
  logger.debug(`Base URL: ${baseUrl}`);

  // Build category path
  let categoryPath = `/search/${category}`;
  if (subcategory) {
    categoryPath += `/${subcategory}`;
  }
  logger.debug(`Category path: ${categoryPath}`);

  // Create URL object
  const url = new URL(categoryPath, baseUrl);
  logger.debug(`Initial URL: ${url.toString()}`);

  // Add query parameter
  if (query) {
    url.searchParams.set('query', query);
    logger.debug(`Added query parameter: ${query}`);
  }

  // Add price filters
  if (minPrice !== null && minPrice > 0) {
    url.searchParams.set('min_price', minPrice.toString());
    logger.debug(`Added min_price parameter: ${minPrice}`);
  }

  if (maxPrice !== null && maxPrice > 0) {
    url.searchParams.set('max_price', maxPrice.toString());
    logger.debug(`Added max_price parameter: ${maxPrice}`);
  }

  // Add other common parameters
  url.searchParams.set('sort', 'rel'); // Sort by relevance
  url.searchParams.set('bundleDuplicates', '1'); // Bundle duplicates

  // Try direct search for "free" items
  if (query.toLowerCase() === 'free') {
    url.searchParams.set('is_free', 'yes');
    logger.debug('Added is_free=yes parameter for free items');
  }

  const finalUrl = url.toString();
  logger.info(`Final search URL: ${finalUrl}`);
  return finalUrl;
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
