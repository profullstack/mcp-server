/**
 * Craigslist Module for MCP Server
 *
 * This module provides a Craigslist search API that allows searching across
 * all Craigslist sites with filtering by categories and other options.
 */

import { logger } from '../../utils/logger.js';
import cities from './cities.js';
import categories from './categories.js';
import { search, getPostingDetails } from './api.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering craigslist module');

  // Get cities endpoint
  app.get('/craigslist/cities', c => {
    return c.json({
      count: cities.length,
      cities,
    });
  });

  // Get categories endpoint
  app.get('/craigslist/categories', c => {
    return c.json({
      categories,
    });
  });

  // Search endpoint
  app.post('/craigslist/search', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.query && !params.category) {
        return c.json({ error: 'Either query or category is required' }, 400);
      }

      // Get cities to search
      let citiesToSearch = params.cities || [];

      // If no cities specified, search all cities (limited by maxCities)
      if (citiesToSearch.length === 0) {
        citiesToSearch = cities;
      }

      // Validate cities
      citiesToSearch = citiesToSearch.filter(city => cities.includes(city));

      if (citiesToSearch.length === 0) {
        return c.json({ error: 'No valid cities specified' }, 400);
      }

      // Get search options
      const searchOptions = {
        query: params.query || '',
        category: params.category || 'sss', // Default to all for sale
        filters: params.filters || {},
        limit: params.maxCities || 5, // Limit number of cities to search at once
        fetchDetails: params.fetchDetails || false, // Whether to fetch detailed attributes
      };

      // Perform the search
      const results = await search(citiesToSearch, searchOptions);

      return c.json({
        query: params.query,
        category: params.category,
        cities: citiesToSearch.slice(0, searchOptions.limit),
        totalCities: citiesToSearch.length,
        searchedCities: Math.min(citiesToSearch.length, searchOptions.limit),
        count: results.length,
        results,
      });
    } catch (error) {
      logger.error(`Error in Craigslist search: ${error.message}`);
      return c.json({ error: error.message }, 500);
    }
  });

  // Get posting details endpoint
  app.post('/craigslist/details', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.url) {
        return c.json({ error: 'URL is required' }, 400);
      }

      // Get posting details
      const details = await getPostingDetails(params.url);

      if (!details) {
        return c.json({ error: 'Failed to get posting details' }, 404);
      }

      return c.json({
        details,
      });
    } catch (error) {
      logger.error(`Error getting Craigslist posting details: ${error.message}`);
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the MCP tool
  app.get('/tools/craigslist/info', c => {
    return c.json({
      name: 'craigslist',
      description: 'Search across Craigslist sites with filtering by categories',
      parameters: {
        query: {
          type: 'string',
          description: 'Search query',
          required: false,
        },
        category: {
          type: 'string',
          description: 'Category code to search in',
          required: false,
        },
        cities: {
          type: 'array',
          description: 'Array of city codes to search (empty for all cities)',
          required: false,
        },
        maxCities: {
          type: 'number',
          description: 'Maximum number of cities to search at once',
          required: false,
        },
        filters: {
          type: 'object',
          description: 'Additional filters for the search',
          required: false,
        },
        fetchDetails: {
          type: 'boolean',
          description: 'Whether to fetch detailed attributes for each result',
          required: false,
        },
      },
    });
  });

  // Register the MCP tool endpoint
  app.post('/tools/craigslist', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.query && !params.category) {
        return c.json({ error: 'Either query or category is required' }, 400);
      }

      // Get cities to search
      let citiesToSearch = params.cities || [];

      // If no cities specified, search all cities (limited by maxCities)
      if (citiesToSearch.length === 0) {
        citiesToSearch = cities;
      }

      // Validate cities
      citiesToSearch = citiesToSearch.filter(city => cities.includes(city));

      if (citiesToSearch.length === 0) {
        return c.json({ error: 'No valid cities specified' }, 400);
      }

      // Get search options
      const searchOptions = {
        query: params.query || '',
        category: params.category || 'sss', // Default to all for sale
        filters: params.filters || {},
        limit: params.maxCities || 5, // Limit number of cities to search at once
        fetchDetails: params.fetchDetails || false, // Whether to fetch detailed attributes
      };

      // Perform the search
      const results = await search(citiesToSearch, searchOptions);

      return c.json({
        tool: 'craigslist',
        query: params.query,
        category: params.category,
        cities: citiesToSearch.slice(0, searchOptions.limit),
        totalCities: citiesToSearch.length,
        searchedCities: Math.min(citiesToSearch.length, searchOptions.limit),
        count: results.length,
        results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/craigslist', c => {
    return c.json(metadata);
  });

  logger.info('Craigslist module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering craigslist module');
  // No cleanup needed for this module
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Craigslist Module',
  version: '1.0.0',
  description: 'Search across all Craigslist sites with filtering by categories',
  author: 'MCP Server Team',
  tools: ['craigslist'],
  endpoints: [
    { path: '/craigslist/cities', method: 'GET', description: 'Get list of Craigslist cities' },
    {
      path: '/craigslist/categories',
      method: 'GET',
      description: 'Get list of Craigslist categories',
    },
    { path: '/craigslist/search', method: 'POST', description: 'Search Craigslist' },
    { path: '/craigslist/details', method: 'POST', description: 'Get Craigslist posting details' },
    { path: '/tools/craigslist', method: 'POST', description: 'Craigslist search tool' },
  ],
};
