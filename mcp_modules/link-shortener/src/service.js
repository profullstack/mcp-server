/**
 * Link Shortener Service
 *
 * This file contains the main business logic for the link shortener module.
 * Integrates with hynt.us API for creating and managing short links.
 */

import { validateUrl as validateUrlUtil, generateRandomAlias, formatLinkData } from './utils.js';

/**
 * Link Shortener service class for handling URL shortening operations
 */
export class LinkService {
  constructor() {
    this.baseUrl = 'https://hynt.us';
    this.apiEndpoint = `${this.baseUrl}/links`;
    this.userAgent = 'MCP-Link-Shortener-Module/1.0 (contact@profullstack.com)';
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour for link data
  }

  /**
   * Create a short link using hynt.us API
   * @param {string} url - The long URL to shorten
   * @param {Object} options - Link creation options
   * @returns {Promise<Object>} - Short link data
   */
  async createShortLink(url, options = {}) {
    try {
      const { alias = null, apiKey } = options;

      // Validate the URL
      validateUrlUtil(url);

      // Generate alias if not provided
      const linkAlias = alias || generateRandomAlias();

      // Check cache first
      const cacheKey = `create_${url}_${linkAlias}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Prepare request body based on hynt.us API structure
      const requestBody = {
        url: url,
        alias: linkAlias,
      };

      // Make API request to hynt.us
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': this.userAgent,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `hynt.us API request failed: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error || errorData.message) {
            errorMessage = errorData.error || errorData.message;
          }
        } catch (e) {
          // Use default error message if JSON parsing fails
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Format the response data
      const formattedData = formatLinkData(data, url, linkAlias);

      // Cache the result
      this.cache.set(cacheKey, {
        data: formattedData,
        timestamp: Date.now(),
      });

      return formattedData;
    } catch (error) {
      throw new Error(`Failed to create short link: ${error.message}`);
    }
  }

  /**
   * Get link information by alias
   * @param {string} alias - The short link alias
   * @param {string} apiKey - API key for authentication
   * @returns {Promise<Object>} - Link information
   */
  async getLinkInfo(alias, apiKey) {
    try {
      if (!alias || typeof alias !== 'string') {
        throw new Error('Invalid alias provided');
      }

      const cacheKey = `info_${alias}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Make API request to get link info
      const response = await fetch(`${this.apiEndpoint}/${alias}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Short link not found');
        }
        throw new Error(`hynt.us API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Format the response data
      const formattedData = {
        alias: alias,
        shortUrl: `${this.baseUrl}/${alias}`,
        originalUrl: data.url,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        clicks: data.clicks || 0,
        active: data.active !== false,
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: formattedData,
        timestamp: Date.now(),
      });

      return formattedData;
    } catch (error) {
      throw new Error(`Failed to get link info: ${error.message}`);
    }
  }

  /**
   * Validate URL and check if it's accessible
   * @param {string} url - URL to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateUrlAccess(url) {
    try {
      validateUrlUtil(url);

      // Check if URL is accessible
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: 10000, // 10 second timeout
      });

      return {
        valid: true,
        accessible: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: url,
        redirected: response.redirected,
        finalUrl: response.url,
      };
    } catch (error) {
      return {
        valid: false,
        accessible: false,
        error: error.message,
        url: url,
      };
    }
  }

  /**
   * Generate a preview of what the short link will look like
   * @param {string} url - The long URL
   * @param {string} alias - Optional custom alias
   * @returns {Object} - Preview information
   */
  generatePreview(url, alias = null) {
    try {
      validateUrlUtil(url);

      const linkAlias = alias || generateRandomAlias();
      const shortUrl = `${this.baseUrl}/${linkAlias}`;

      // Extract domain and path info from original URL
      const urlObj = new URL(url);

      return {
        originalUrl: url,
        shortUrl: shortUrl,
        alias: linkAlias,
        customAlias: !!alias,
        domain: urlObj.hostname,
        path: urlObj.pathname,
        savings: {
          originalLength: url.length,
          shortLength: shortUrl.length,
          savedCharacters: url.length - shortUrl.length,
          compressionRatio: (((url.length - shortUrl.length) / url.length) * 100).toFixed(1) + '%',
        },
        preview: {
          title: `Short link for ${urlObj.hostname}`,
          description: `Redirects to ${url}`,
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate preview: ${error.message}`);
    }
  }

  /**
   * Bulk create multiple short links
   * @param {Array} urls - Array of URLs to shorten
   * @param {Object} options - Options for bulk creation
   * @returns {Promise<Array>} - Array of short link results
   */
  async bulkCreateShortLinks(urls, options = {}) {
    try {
      const { apiKey, prefix = null } = options;

      if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error('URLs must be a non-empty array');
      }

      if (urls.length > 10) {
        throw new Error('Maximum 10 URLs allowed per bulk request');
      }

      const results = [];

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          const alias = prefix ? `${prefix}-${i + 1}` : null;
          const result = await this.createShortLink(url, { alias, apiKey });
          results.push({
            success: true,
            url: url,
            result: result,
          });
        } catch (error) {
          results.push({
            success: false,
            url: url,
            error: error.message,
          });
        }
      }

      return {
        total: urls.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results,
      };
    } catch (error) {
      throw new Error(`Failed to bulk create short links: ${error.message}`);
    }
  }

  /**
   * Get analytics for a short link
   * @param {string} alias - The short link alias
   * @param {string} apiKey - API key for authentication
   * @returns {Promise<Object>} - Analytics data
   */
  async getLinkAnalytics(alias, apiKey) {
    try {
      const linkInfo = await this.getLinkInfo(alias, apiKey);

      // For now, return basic analytics based on available data
      // In a full implementation, this would call a dedicated analytics endpoint
      return {
        alias: alias,
        shortUrl: `${this.baseUrl}/${alias}`,
        originalUrl: linkInfo.originalUrl,
        totalClicks: linkInfo.clicks || 0,
        createdAt: linkInfo.createdAt,
        lastAccessed: linkInfo.updatedAt,
        active: linkInfo.active,
        analytics: {
          clicksToday: 0, // Would need real analytics API
          clicksThisWeek: 0,
          clicksThisMonth: 0,
          topReferrers: [],
          topCountries: [],
          deviceTypes: [],
        },
        note: 'Detailed analytics require hynt.us analytics API integration',
      };
    } catch (error) {
      throw new Error(`Failed to get link analytics: ${error.message}`);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Test API connectivity
   * @param {string} apiKey - API key to test
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection(apiKey) {
    try {
      // Test with a simple URL
      const testUrl = 'https://example.com';
      const testAlias = `test-${Date.now()}`;

      const result = await this.createShortLink(testUrl, {
        alias: testAlias,
        apiKey,
      });

      return {
        success: true,
        message: 'API connection successful',
        testLink: result.shortUrl,
        apiKey: apiKey.substring(0, 8) + '...',
      };
    } catch (error) {
      return {
        success: false,
        message: 'API connection failed',
        error: error.message,
        apiKey: apiKey.substring(0, 8) + '...',
      };
    }
  }
}

// Export a singleton instance
export const linkService = new LinkService();
