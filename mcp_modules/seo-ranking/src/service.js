/**
 * SEO Ranking Module Service
 *
 * This file contains the main business logic for the SEO ranking module.
 * Uses ValueSERP API to check search rankings for keywords.
 */

import { logger } from '../../../src/utils/logger.js';

/**
 * SEO Ranking Service class
 */
export class SeoRankingService {
  constructor() {
    this.baseUrl = 'https://api.valueserp.com/search';
  }

  /**
   * Check ranking for a single keyword
   * @param {string} apiKey - ValueSERP API key
   * @param {string} keyword - Search keyword
   * @param {string} domain - Domain to find in results
   * @param {Object} options - Additional search options
   * @returns {Promise<Object>} Ranking result
   */
  async checkKeywordRanking(apiKey, keyword, domain, options = {}) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    if (!keyword) {
      throw new Error('Keyword is required');
    }
    if (!domain) {
      throw new Error('Domain is required');
    }

    const searchParams = new URLSearchParams({
      api_key: apiKey,
      q: keyword,
      location: options.location || '98146,Washington,United States',
      gl: options.gl || 'us',
      hl: options.hl || 'en',
      google_domain: options.google_domain || 'google.com',
      include_ai_overview: options.include_ai_overview || 'true',
      num: options.num || '100',
    });

    try {
      logger.info(`Checking ranking for keyword: ${keyword}, domain: ${domain}`);

      const response = await fetch(`${this.baseUrl}?${searchParams}`);

      if (!response.ok) {
        throw new Error(`ValueSERP API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Check organic results
      const organicRank = this.findDomainInResults(data.organic_results || [], domain);

      // Check local results
      const localRank = this.findDomainInLocalResults(data.local_results || [], domain);

      return {
        keyword,
        domain,
        organic_rank: organicRank,
        local_rank: localRank,
        total_results: data.search_information?.total_results || 0,
        search_time: data.search_information?.time_taken_displayed || 0,
        timestamp: new Date().toISOString(),
        found: organicRank !== null || localRank !== null,
      };
    } catch (error) {
      logger.error(`Error checking ranking for ${keyword}:`, error);
      throw error;
    }
  }

  /**
   * Check rankings for multiple keywords (up to 50)
   * @param {string} apiKey - ValueSERP API key
   * @param {Array<string>} keywords - Array of keywords to check
   * @param {string} domain - Domain to find in results
   * @param {Object} options - Additional search options
   * @returns {Promise<Array>} Array of ranking results
   */
  async checkMultipleKeywords(apiKey, keywords, domain, options = {}) {
    if (!Array.isArray(keywords)) {
      throw new Error('Keywords must be an array');
    }

    if (keywords.length > 50) {
      throw new Error('Maximum 50 keywords allowed per request');
    }

    const results = [];
    const batchSize = options.batchSize || 5; // Process in batches to avoid rate limiting
    const delay = options.delay || 1000; // Delay between batches in ms

    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);

      const batchPromises = batch.map(keyword =>
        this.checkKeywordRanking(apiKey, keyword, domain, options).catch(error => ({
          keyword,
          domain,
          error: error.message,
          timestamp: new Date().toISOString(),
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      domain,
      total_keywords: keywords.length,
      results,
      summary: this.generateSummary(results),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Find domain in organic search results
   * @param {Array} results - Organic search results
   * @param {string} domain - Domain to find
   * @returns {Object|null} Ranking information or null if not found
   */
  findDomainInResults(results, domain) {
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.link && result.link.includes(domain)) {
        return {
          position: result.position || i + 1,
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          displayed_link: result.displayed_link,
        };
      }
    }
    return null;
  }

  /**
   * Find domain in local search results
   * @param {Array} results - Local search results
   * @param {string} domain - Domain to find
   * @returns {Object|null} Local ranking information or null if not found
   */
  findDomainInLocalResults(results, domain) {
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.website && result.website.includes(domain)) {
        return {
          position: i + 1,
          title: result.title,
          website: result.website,
          address: result.address,
          phone: result.phone,
          rating: result.rating,
          reviews: result.reviews,
        };
      }
    }
    return null;
  }

  /**
   * Generate summary statistics from results
   * @param {Array} results - Array of ranking results
   * @returns {Object} Summary statistics
   */
  generateSummary(results) {
    const validResults = results.filter(r => !r.error);
    const foundResults = validResults.filter(r => r.found);
    const organicRanks = validResults.filter(r => r.organic_rank).map(r => r.organic_rank.position);
    const localRanks = validResults.filter(r => r.local_rank).map(r => r.local_rank.position);

    return {
      total_checked: results.length,
      successful_checks: validResults.length,
      errors: results.length - validResults.length,
      found_in_results: foundResults.length,
      found_in_organic: organicRanks.length,
      found_in_local: localRanks.length,
      average_organic_rank:
        organicRanks.length > 0
          ? Math.round(organicRanks.reduce((a, b) => a + b, 0) / organicRanks.length)
          : null,
      best_organic_rank: organicRanks.length > 0 ? Math.min(...organicRanks) : null,
      average_local_rank:
        localRanks.length > 0
          ? Math.round(localRanks.reduce((a, b) => a + b, 0) / localRanks.length)
          : null,
      best_local_rank: localRanks.length > 0 ? Math.min(...localRanks) : null,
    };
  }

  /**
   * Validate search parameters
   * @param {Object} params - Search parameters
   * @returns {Object} Validation result
   */
  validateSearchParams(params) {
    const errors = [];

    if (!params.api_key) {
      errors.push('API key is required');
    }

    if (!params.keyword && !params.keywords) {
      errors.push('Either keyword or keywords array is required');
    }

    if (!params.domain) {
      errors.push('Domain is required');
    }

    if (params.keywords && Array.isArray(params.keywords) && params.keywords.length > 50) {
      errors.push('Maximum 50 keywords allowed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export a singleton instance
export const seoRankingService = new SeoRankingService();
