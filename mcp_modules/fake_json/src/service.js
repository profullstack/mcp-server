/**
 * Fake JSON Module Service
 *
 * This file contains the main business logic for the fake_json module.
 */

import { performInference } from '../../../src/core/modelManager.js';
import { logger } from '../../../src/utils/logger.js';
import { parseJsonResponse, createSystemPrompt } from './utils.js';

/**
 * Service class for the fake_json module
 */
export class FakeJsonService {
  constructor() {
    // Default model to use for inference
    this.defaultModel = 'gpt-4';

    // Cache for responses to avoid repeated API calls
    this.responseCache = new Map();

    // Cache expiration time (30 minutes)
    this.cacheExpirationMs = 30 * 60 * 1000;
  }

  /**
   * Generate a JSON response for the given endpoint
   * @param {string} endpoint - The endpoint path
   * @param {string} fields - Optional comma-separated list of fields to include
   * @param {string} apiKey - Optional OpenAI API key
   * @returns {Promise<Object>} Generated JSON response
   */
  async generateJson(endpoint, fields, apiKey) {
    try {
      // Create a cache key from the endpoint and fields
      const cacheKey = `${endpoint}:${fields || ''}`;

      // Check if we have a cached response
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        logger.debug(`Using cached response for ${endpoint}`);
        return cachedResponse;
      }

      // Create the system prompt
      const systemPrompt = createSystemPrompt(endpoint, fields);

      // Perform inference using the MCP server's model manager
      const inferenceResult = await performInference(this.defaultModel, {
        prompt: systemPrompt,
        temperature: 0.7,
        max_tokens: 1000,
        apiKey: apiKey, // Pass the API key if provided
      });

      // Parse the response to ensure it's valid JSON
      const jsonResponse = parseJsonResponse(inferenceResult.response);

      // Cache the response
      this.cacheResponse(cacheKey, jsonResponse);

      return jsonResponse;
    } catch (error) {
      logger.error(`Error generating JSON for ${endpoint}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a cached response if it exists and is not expired
   * @param {string} key - Cache key
   * @returns {Object|null} Cached response or null if not found or expired
   */
  getCachedResponse(key) {
    if (!this.responseCache.has(key)) {
      return null;
    }

    const { timestamp, data } = this.responseCache.get(key);
    const now = Date.now();

    // Check if the cached response has expired
    if (now - timestamp > this.cacheExpirationMs) {
      this.responseCache.delete(key);
      return null;
    }

    return data;
  }

  /**
   * Cache a response
   * @param {string} key - Cache key
   * @param {Object} data - Response data to cache
   */
  cacheResponse(key, data) {
    this.responseCache.set(key, {
      timestamp: Date.now(),
      data,
    });
  }
}

// Export a singleton instance
export const fakeJsonService = new FakeJsonService();
