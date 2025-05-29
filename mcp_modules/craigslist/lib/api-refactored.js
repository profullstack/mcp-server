/**
 * Refactored Craigslist API using modular components
 * This is the new main API file that replaces the monolithic api.js
 */

import { logger } from '../../../src/utils/logger.js';
import {
  searchCraigslist,
  getPostingDetails,
  searchWithPagination,
  getAvailableCategories,
} from './search.js';
import { closeBrowser } from './browser.js';
import { deduplicateByTitle } from './utils.js';

// Import cities and categories from existing files
import cities from '../cities.js';
import categories from '../categories.js';

/**
 * Main API class for Craigslist scraping
 */
export class CraigslistAPI {
  constructor() {
    this.cities = cities;
    this.categories = categories;
  }

  /**
   * Search Craigslist listings
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Array of search results
   */
  async search(params = {}) {
    try {
      logger.info('CraigslistAPI.search called with params:', JSON.stringify(params));
      return await searchCraigslist(params);
    } catch (error) {
      logger.error(`CraigslistAPI.search error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search with pagination support
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} All results from all pages
   */
  async searchWithPagination(params = {}) {
    try {
      logger.info('CraigslistAPI.searchWithPagination called with params:', JSON.stringify(params));
      return await searchWithPagination(params);
    } catch (error) {
      logger.error(`CraigslistAPI.searchWithPagination error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get posting details by URL
   * @param {string} postingUrl - URL of the posting
   * @param {boolean} usePuppeteer - Whether to use Puppeteer
   * @returns {Promise<Object>} Posting details
   */
  async getPostingDetails(postingUrl, usePuppeteer = true) {
    try {
      logger.info(`CraigslistAPI.getPostingDetails called for: ${postingUrl}`);
      return await getPostingDetails(postingUrl, usePuppeteer);
    } catch (error) {
      logger.error(`CraigslistAPI.getPostingDetails error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available categories for a city
   * @param {string} city - City code
   * @returns {Promise<Array>} Array of available categories
   */
  async getCategories(city = 'sandiego') {
    try {
      logger.info(`CraigslistAPI.getCategories called for city: ${city}`);
      return await getAvailableCategories(city);
    } catch (error) {
      logger.error(`CraigslistAPI.getCategories error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get list of supported cities
   * @returns {Array} Array of city objects
   */
  getCities() {
    return this.cities;
  }

  /**
   * Get list of supported categories
   * @returns {Array} Array of category objects
   */
  getSupportedCategories() {
    return Object.keys(this.categories);
  }

  /**
   * Clean up resources (close browser, etc.)
   */
  async cleanup() {
    try {
      logger.info('CraigslistAPI.cleanup called');
      await closeBrowser();
    } catch (error) {
      logger.error(`CraigslistAPI.cleanup error: ${error.message}`);
    }
  }

  /**
   * Search multiple cities for listings
   * @param {Object} params - Search parameters
   * @param {Array} cities - Array of city codes
   * @returns {Promise<Array>} Combined results from all cities
   */
  async searchMultipleCities(params = {}, cities = []) {
    try {
      logger.info(`CraigslistAPI.searchMultipleCities called for ${cities.length} cities`);
      const searchParams = { ...params, cities };
      const results = await searchCraigslist(searchParams);
      return deduplicateByTitle(results);
    } catch (error) {
      logger.error(`CraigslistAPI.searchMultipleCities error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for housing listings
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Housing search results
   */
  async searchHousing(params = {}) {
    const housingParams = {
      ...params,
      category: 'hhh', // housing category
    };
    return await this.search(housingParams);
  }

  /**
   * Search for job listings
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Job search results
   */
  async searchJobs(params = {}) {
    const jobParams = {
      ...params,
      category: 'jjj', // jobs category
    };
    return await this.search(jobParams);
  }

  /**
   * Search for sale items
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} For sale search results
   */
  async searchForSale(params = {}) {
    const saleParams = {
      ...params,
      category: 'sss', // for sale category
    };
    return await this.search(saleParams);
  }

  /**
   * Search for services
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Services search results
   */
  async searchServices(params = {}) {
    const serviceParams = {
      ...params,
      category: 'bbb', // services category
    };
    return await this.search(serviceParams);
  }

  /**
   * Search for gigs
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Gigs search results
   */
  async searchGigs(params = {}) {
    const gigParams = {
      ...params,
      category: 'ggg', // gigs category
    };
    return await this.search(gigParams);
  }

  /**
   * Search for community posts
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Community search results
   */
  async searchCommunity(params = {}) {
    const communityParams = {
      ...params,
      category: 'ccc', // community category
    };
    return await this.search(communityParams);
  }

  /**
   * Search for events
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Events search results
   */
  async searchEvents(params = {}) {
    const eventParams = {
      ...params,
      category: 'eee', // events category
    };
    return await this.search(eventParams);
  }

  /**
   * Validate search parameters
   * @param {Object} params - Search parameters to validate
   * @returns {Object} Validated parameters
   */
  validateSearchParams(params) {
    const validated = { ...params };

    // Validate city
    if (validated.city && !this.cities.includes(validated.city)) {
      logger.warn(`Invalid city code: ${validated.city}, using default`);
      validated.city = 'sandiego';
    }

    // Validate category
    if (validated.category && !Object.keys(this.categories).includes(validated.category)) {
      logger.warn(`Invalid category code: ${validated.category}, using default`);
      validated.category = 'sss';
    }

    // Validate price range
    if (validated.minPrice && validated.maxPrice && validated.minPrice > validated.maxPrice) {
      logger.warn('minPrice is greater than maxPrice, swapping values');
      [validated.minPrice, validated.maxPrice] = [validated.maxPrice, validated.minPrice];
    }

    // Validate limit
    if (validated.limit && (validated.limit < 1 || validated.limit > 1000)) {
      logger.warn(`Invalid limit: ${validated.limit}, using default`);
      validated.limit = 100;
    }

    return validated;
  }
}

// Create and export a default instance
export const craigslistAPI = new CraigslistAPI();

// Export individual functions for backward compatibility
export { searchCraigslist, getPostingDetails, searchWithPagination, getAvailableCategories };

// Export utility functions
export { deduplicateByTitle } from './utils.js';
export { closeBrowser } from './browser.js';

// Default export
export default craigslistAPI;
