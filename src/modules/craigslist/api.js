/**
 * Craigslist API utilities
 * 
 * This file contains functions for interacting with Craigslist sites
 * and parsing the results.
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { logger } from '../../utils/logger.js';

/**
 * Base URL for Craigslist sites
 * @type {string}
 */
const BASE_URL = 'https://{city}.craigslist.org';

/**
 * Search Craigslist in a specific city
 * 
 * @param {string} city - Craigslist city site code
 * @param {Object} options - Search options
 * @param {string} options.category - Category code to search in
 * @param {string} options.query - Search query
 * @param {Object} options.filters - Additional filters
 * @returns {Promise<Array>} Search results
 */
export async function searchCity(city, options) {
  try {
    const { category = 'sss', query = '', filters = {} } = options;
    
    // Build the search URL
    let url = `${BASE_URL.replace('{city}', city)}/search/${category}`;
    
    // Add query parameters
    const params = new URLSearchParams();
    if (query) {
      params.append('query', query);
    }
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const searchUrl = `${url}?${params.toString()}`;
    logger.debug(`Searching Craigslist: ${searchUrl}`);
    
    // Fetch the search results
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    return parseSearchResults(html, city);
  } catch (error) {
    logger.error(`Error searching Craigslist city ${city}: ${error.message}`);
    return [];
  }
}

/**
 * Parse Craigslist search results HTML
 * 
 * @param {string} html - HTML content to parse
 * @param {string} city - City code for building URLs
 * @returns {Array} Parsed search results
 */
function parseSearchResults(html, city) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Find all result items
    const resultItems = document.querySelectorAll('.result-row');
    const results = [];
    
    resultItems.forEach(item => {
      try {
        const id = item.getAttribute('data-pid');
        const dateElement = item.querySelector('.result-date');
        const linkElement = item.querySelector('.result-title');
        const priceElement = item.querySelector('.result-price');
        const locationElement = item.querySelector('.result-hood');
        
        if (!id || !linkElement) return;
        
        const title = linkElement.textContent.trim();
        const url = linkElement.getAttribute('href');
        const price = priceElement ? priceElement.textContent.trim() : null;
        const date = dateElement ? dateElement.getAttribute('datetime') : null;
        const location = locationElement ? locationElement.textContent.trim().replace(/[()]/g, '') : null;
        
        // Get image if available
        const imageElement = item.querySelector('.result-image');
        let imageUrl = null;
        
        if (imageElement) {
          // Try to get data-ids first (multiple images)
          const dataIds = imageElement.getAttribute('data-ids');
          if (dataIds) {
            const firstId = dataIds.split(',')[0].split(':')[1];
            imageUrl = `https://images.craigslist.org/${firstId}_300x300.jpg`;
          } else {
            // Try to get single image
            imageUrl = imageElement.getAttribute('src');
          }
        }
        
        results.push({
          id,
          title,
          url,
          price,
          date,
          location,
          imageUrl,
          city
        });
      } catch (error) {
        logger.error(`Error parsing result item: ${error.message}`);
      }
    });
    
    return results;
  } catch (error) {
    logger.error(`Error parsing search results: ${error.message}`);
    return [];
  }
}

/**
 * Search across multiple Craigslist cities
 * 
 * @param {Array<string>} cities - Array of city codes to search
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of cities to search (to avoid rate limiting)
 * @returns {Promise<Array>} Combined search results
 */
export async function searchMultipleCities(cities, options) {
  const { limit = 5, ...searchOptions } = options;
  
  // Limit the number of cities to search at once to avoid rate limiting
  const citiesToSearch = cities.slice(0, limit);
  
  logger.info(`Searching ${citiesToSearch.length} Craigslist cities: ${citiesToSearch.join(', ')}`);
  
  try {
    // Search each city in parallel
    const searchPromises = citiesToSearch.map(city => searchCity(city, searchOptions));
    const results = await Promise.all(searchPromises);
    
    // Combine and flatten results
    return results.flat();
  } catch (error) {
    logger.error(`Error searching multiple cities: ${error.message}`);
    return [];
  }
}

/**
 * Get details for a specific Craigslist posting
 * 
 * @param {string} url - URL of the posting
 * @returns {Promise<Object>} Posting details
 */
export async function getPostingDetails(url) {
  try {
    logger.debug(`Fetching Craigslist posting: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    return parsePostingDetails(html, url);
  } catch (error) {
    logger.error(`Error fetching posting details: ${error.message}`);
    return null;
  }
}

/**
 * Parse Craigslist posting details
 * 
 * @param {string} html - HTML content to parse
 * @param {string} url - Original URL of the posting
 * @returns {Object} Parsed posting details
 */
function parsePostingDetails(html, url) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Get basic posting info
    const title = document.querySelector('#titletextonly')?.textContent.trim() || null;
    const price = document.querySelector('.price')?.textContent.trim() || null;
    const postingBody = document.querySelector('#postingbody')?.textContent.trim() || null;
    const postingDate = document.querySelector('.date.timeago')?.textContent.trim() || null;
    
    // Get posting images
    const imageElements = document.querySelectorAll('#thumbs .thumb img');
    const images = Array.from(imageElements).map(img => {
      const thumbSrc = img.getAttribute('src');
      // Convert thumbnail URL to full-size image URL
      return thumbSrc.replace(/50x50c/, '600x450');
    });
    
    // Get posting attributes
    const attrGroups = document.querySelectorAll('.attrgroup');
    const attributes = {};
    
    attrGroups.forEach(group => {
      const spans = group.querySelectorAll('span');
      spans.forEach(span => {
        const text = span.textContent.trim();
        if (text.includes(':')) {
          const [key, value] = text.split(':').map(s => s.trim());
          attributes[key] = value;
        } else if (text) {
          // For spans without a colon, use the text as both key and value
          attributes[text] = true;
        }
      });
    });
    
    // Get posting location
    const mapElement = document.querySelector('#map');
    let latitude = null;
    let longitude = null;
    
    if (mapElement) {
      latitude = mapElement.getAttribute('data-latitude');
      longitude = mapElement.getAttribute('data-longitude');
    }
    
    return {
      title,
      price,
      description: postingBody,
      postingDate,
      images,
      attributes,
      location: {
        latitude,
        longitude
      },
      url
    };
  } catch (error) {
    logger.error(`Error parsing posting details: ${error.message}`);
    return null;
  }
}