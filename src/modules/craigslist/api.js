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
    const { category = 'sss', query = '', filters = {}, fetchDetails = false } = options;

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
    return await parseSearchResults(html, city, category, query, fetchDetails);
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
 * @param {string} category - Category code
 * @param {string} query - Search query
 * @param {boolean} [fetchDetails=false] - Whether to fetch detailed attributes for each result
 * @returns {Array} Parsed search results
 */
async function parseSearchResults(html, city, category, query, fetchDetails = false) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // First, extract detailed information about each listing from the HTML
    // We'll collect as much data as possible to help with matching
    const listingDetails = [];

    // Look for the main container of search results
    const resultContainers = [
      'ul.rows', // Common container for listings
      'div.search-results', // Another common container
      'div.content', // Generic content container
      'div#search-results', // ID-based container
      'div.gallery-card-wrap', // Gallery view container
      'div.cl-search-result', // Another possible container
      'div.result-wrap', // Another possible container
      'body', // Fallback to body if no specific container found
    ];

    let mainContainer = null;
    for (const selector of resultContainers) {
      const container = document.querySelector(selector);
      if (container) {
        mainContainer = container;
        break;
      }
    }

    if (!mainContainer) {
      logger.error('Could not find main container for search results');
      mainContainer = document.body; // Fallback to body
    }

    // Look for listing elements within the main container
    const listingSelectors = [
      'li.result-row', // Traditional format
      'li.cl-static-search-result', // Another format
      'div.result-info', // Result info containers
      'div.gallery-card', // Gallery cards
      'div.result', // Generic results
      'a[href*="/d/"]', // Direct links to listings
      'a[href*=".html"]', // Any link to an HTML page
    ];

    // Try each selector to find listing elements
    let listingElements = [];
    for (const selector of listingSelectors) {
      const elements = mainContainer.querySelectorAll(selector);
      if (elements.length > 0) {
        listingElements = Array.from(elements);
        logger.debug(`Found ${elements.length} listing elements using selector: ${selector}`);
        break;
      }
    }

    // If we still don't have listing elements, try a more aggressive approach
    if (listingElements.length === 0) {
      // Look for any elements that might contain listing information
      const allLinks = document.querySelectorAll('a[href*=".html"]');
      listingElements = Array.from(allLinks);
      logger.debug(`Fallback: Found ${listingElements.length} links ending with .html`);
    }

    // Extract detailed information from each listing element
    listingElements.forEach((element, index) => {
      try {
        // Initialize listing details
        const details = {
          index,
          url: '',
          title: '',
          price: '',
          location: '',
          imageUrl: '',
          dateText: '',
          postId: '',
        };

        // Extract URL - either from the element itself if it's a link, or from a child link
        let linkElement =
          element.tagName === 'A' ? element : element.querySelector('a[href*=".html"]');
        if (linkElement) {
          const href = linkElement.getAttribute('href');
          if (href) {
            // Handle relative URLs
            if (href.startsWith('/')) {
              details.url = `https://${city}.craigslist.org${href}`;
            } else if (!href.startsWith('http')) {
              details.url = `https://${city}.craigslist.org/${href}`;
            } else {
              details.url = href;
            }

            // Try to extract post ID from URL
            const postIdMatch = details.url.match(/\/(\d+)\.html$/);
            if (postIdMatch && postIdMatch[1]) {
              details.postId = postIdMatch[1];
            }
          }
        }

        // Extract title
        const titleSelectors = ['.result-title', '.titlestring', '.posting-title', 'h3', '.title'];
        for (const selector of titleSelectors) {
          const titleElement =
            element.querySelector(selector) || (element.matches(selector) ? element : null);
          if (titleElement) {
            details.title = titleElement.textContent.trim();
            break;
          }
        }

        // If we still don't have a title and the element is a link, use its text
        if (!details.title && element.tagName === 'A') {
          details.title = element.textContent.trim();
        }

        // Extract price
        const priceSelectors = ['.result-price', '.price', '.priceinfo', '[class*="price"]'];
        for (const selector of priceSelectors) {
          const priceElement =
            element.querySelector(selector) || (element.matches(selector) ? element : null);
          if (priceElement) {
            details.price = priceElement.textContent.trim();
            break;
          }
        }

        // Extract location
        const locationSelectors = ['.result-hood', '.location', '.geo', '[class*="location"]'];
        for (const selector of locationSelectors) {
          const locationElement =
            element.querySelector(selector) || (element.matches(selector) ? element : null);
          if (locationElement) {
            details.location = locationElement.textContent.trim().replace(/[()]/g, '');
            break;
          }
        }

        // Extract image URL
        const imageSelectors = ['img', '.result-image', '.gallery-card-image'];
        for (const selector of imageSelectors) {
          const imageElement =
            element.querySelector(selector) || (element.matches(selector) ? element : null);
          if (imageElement) {
            details.imageUrl =
              imageElement.getAttribute('src') || imageElement.getAttribute('data-src') || '';
            break;
          }
        }

        // Extract date text
        const dateSelectors = ['.result-date', '.date', 'time', '[class*="date"]'];
        for (const selector of dateSelectors) {
          const dateElement =
            element.querySelector(selector) || (element.matches(selector) ? element : null);
          if (dateElement) {
            details.dateText = dateElement.textContent.trim();
            break;
          }
        }

        // Only add listings with a URL
        if (details.url) {
          listingDetails.push(details);
        }
      } catch (error) {
        logger.error(`Error extracting details from listing element: ${error.message}`);
      }
    });

    logger.debug(`Extracted details for ${listingDetails.length} listings from HTML`);

    // Now parse the JSON-LD data
    const jsonLdScript = document.querySelector('#ld_searchpage_results');

    if (!jsonLdScript) {
      logger.error('Could not find JSON-LD data in the HTML');
      return [];
    }

    try {
      // Parse the JSON-LD data
      const jsonLdData = JSON.parse(jsonLdScript.textContent);

      if (!jsonLdData.itemListElement || !Array.isArray(jsonLdData.itemListElement)) {
        logger.error('Invalid JSON-LD data structure');
        return [];
      }

      // Extract the results from the JSON-LD data
      const results = jsonLdData.itemListElement
        .map(listItem => {
          try {
            const item = listItem.item;
            if (!item) return null;

            // Generate a unique ID if none exists
            const id = listItem.position || Math.random().toString(36).substring(2, 15);

            // Extract the title
            const title = item.name || '';

            // Extract the price
            const price =
              item.offers && item.offers.price
                ? (item.offers.priceCurrency || '$') + item.offers.price
                : null;

            // Extract the date (may not be directly available in the JSON-LD)
            const date = item.datePosted || new Date().toISOString();

            // Extract the location
            let location = null;
            if (
              item.offers &&
              item.offers.availableAtOrFrom &&
              item.offers.availableAtOrFrom.address &&
              item.offers.availableAtOrFrom.address.addressLocality
            ) {
              location = item.offers.availableAtOrFrom.address.addressLocality;
            }

            // Extract all image URLs
            let images = [];
            if (item.image && Array.isArray(item.image)) {
              images = item.image;
            }

            // For backward compatibility, keep the first image as imageUrl
            let imageUrl = images.length > 0 ? images[0] : null;

            // Find the best matching HTML listing for this JSON-LD item
            let bestMatch = null;
            let bestScore = 0;

            for (const listing of listingDetails) {
              let score = 0;

              // Match by title (most important)
              if (listing.title && title) {
                // Calculate title similarity
                const titleSimilarity = calculateSimilarity(
                  listing.title.toLowerCase(),
                  title.toLowerCase()
                );
                score += titleSimilarity * 10; // Weight title heavily
              }

              // Match by price
              if (listing.price && price) {
                // Extract numeric price for comparison
                const listingPrice = extractNumericPrice(listing.price);
                const itemPrice = extractNumericPrice(price);

                if (listingPrice === itemPrice) {
                  score += 5;
                }
              }

              // Match by location
              if (listing.location && location) {
                if (
                  listing.location.toLowerCase().includes(location.toLowerCase()) ||
                  location.toLowerCase().includes(listing.location.toLowerCase())
                ) {
                  score += 3;
                }
              }

              // Match by image URL
              if (listing.imageUrl && imageUrl) {
                // Extract image ID from URLs for comparison
                const listingImageId = extractImageId(listing.imageUrl);
                const itemImageId = extractImageId(imageUrl);

                if (listingImageId && itemImageId && listingImageId === itemImageId) {
                  score += 8; // Strong indicator if image IDs match
                }
              }

              // If this is the best match so far, update bestMatch
              if (score > bestScore) {
                bestScore = score;
                bestMatch = listing;
              }
            }

            // Use the best match URL if found, otherwise use a fallback
            let url = '';
            if (bestMatch && bestMatch.url) {
              url = bestMatch.url;
            } else {
              // Fallback to a search URL
              const searchQuery = encodeURIComponent(title);
              url = `https://${city}.craigslist.org/search/${category}?query=${searchQuery}`;
            }

            // Try to extract description from the item or from the HTML
            let description = item.description || '';

            // Extract attributes from the JSON-LD data
            let attributes = {};

            // If we have offers data, extract attributes from there
            if (item.offers) {
              // Price already extracted, but might have additional info
              if (item.offers.priceCurrency) {
                attributes['currency'] = item.offers.priceCurrency;
              }

              // Extract location details
              if (item.offers.availableAtOrFrom && item.offers.availableAtOrFrom.address) {
                const address = item.offers.availableAtOrFrom.address;

                if (address.addressLocality) {
                  attributes['city'] = address.addressLocality;
                }

                if (address.addressRegion) {
                  attributes['state'] = address.addressRegion;
                }

                if (address.postalCode) {
                  attributes['zip'] = address.postalCode;
                }
              }

              // Extract any other offer properties
              Object.entries(item.offers).forEach(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number') {
                  attributes[key.toLowerCase()] = value;
                }
              });
            }

            // Add bicycle-specific attributes that are commonly found in post details
            // These will be overridden if we fetch the actual post details
            if (bestMatch) {
              // Try to extract bicycle-specific attributes from the title and description
              const bikeAttributes = {
                'bicycle type': null,
                'frame size': null,
                'wheel size': null,
                'bicycle frame material': null,
                suspension: null,
                'brake type': null,
                'handlebar type': null,
                'electric assist': null,
                condition: null,
                'make / manufacturer': null,
                'model name / number': null,
              };

              // Extract from title
              if (title) {
                // Look for bicycle type
                const bikeTypePatterns = [
                  { pattern: /\b(road|racing)\b/i, value: 'road' },
                  { pattern: /\b(mountain|mtb)\b/i, value: 'mountain' },
                  { pattern: /\b(hybrid)\b/i, value: 'hybrid' },
                  { pattern: /\b(cruiser)\b/i, value: 'cruiser' },
                  { pattern: /\b(bmx)\b/i, value: 'bmx' },
                  { pattern: /\b(kids|children|child)\b/i, value: 'kids' },
                ];

                for (const { pattern, value } of bikeTypePatterns) {
                  if (pattern.test(title)) {
                    bikeAttributes['bicycle type'] = value;
                    break;
                  }
                }

                // Look for frame size
                const frameSizeMatch = title.match(
                  /\b(\d+(?:\.\d+)?)["\s-]?(?:inch|in|\s*")?\s*(?:frame)?\b/i
                );
                if (frameSizeMatch) {
                  bikeAttributes['frame size'] = frameSizeMatch[1] + '"';
                }

                // Look for wheel size
                const wheelSizeMatch = title.match(
                  /\b(\d+(?:\.\d+)?)["\s-]?(?:inch|in|\s*")?\s*(?:wheel|wheels)?\b/i
                );
                if (wheelSizeMatch) {
                  bikeAttributes['wheel size'] = wheelSizeMatch[1] + ' in';
                }

                // Look for speeds
                const speedsMatch = title.match(/\b(\d+)[\s-]?speed\b/i);
                if (speedsMatch) {
                  attributes['speeds'] = speedsMatch[1];
                }

                // Look for brand
                const brandPatterns = [
                  /\b(schwinn|trek|specialized|giant|cannondale|raleigh|diamondback|jamis|bianchi|fuji|gt|kona|scott|cervelo|felt|santa cruz|surly|salsa|marin|norco|pinarello|colnago|de rosa|look|orbea|cube|canyon|focus|ghost|lapierre|merida|ridley|rose|wilier|yeti|intense|pivot|ibis|devinci|rocky mountain|transition|commencal|nukeproof|mondraker|propain|yt|canyon|evil|guerrilla gravity|pole|nicolai|liteville|last|alutech|banshee|knolly|kona|transition|norco|rocky mountain|devinci|commencal|nukeproof|mondraker|propain|yt|canyon|evil|guerrilla gravity|pole|nicolai|liteville|last|alutech|banshee|knolly)\b/i,
                ];

                for (const pattern of brandPatterns) {
                  const match = title.match(pattern);
                  if (match) {
                    attributes['brand'] =
                      match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                    bikeAttributes['make / manufacturer'] =
                      match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                    break;
                  }
                }
              }

              // Add the extracted bike attributes to the main attributes object
              for (const [key, value] of Object.entries(bikeAttributes)) {
                if (value) {
                  attributes[key] = value;
                }
              }
            }

            // Extract from the title - many listings include specs in the title
            if (title) {
              // Look for common bike specs in the title
              const bikeSpecs = [
                { pattern: /(\d+)[\s-]?speed/i, key: 'speeds' },
                { pattern: /(\d+)[\s-]?inch|(\d+)"/i, key: 'wheel size' },
                { pattern: /(small|medium|large|s|m|l|xl)/i, key: 'size' },
                { pattern: /(carbon|aluminum|steel|titanium)/i, key: 'frame material' },
                { pattern: /(road|mountain|hybrid|cruiser|bmx|kids)/i, key: 'type' },
                {
                  pattern: /(schwinn|trek|specialized|giant|cannondale|raleigh|diamondback|jamis)/i,
                  key: 'brand',
                },
              ];

              bikeSpecs.forEach(spec => {
                const match = title.match(spec.pattern);
                if (match) {
                  attributes[spec.key] = match[1] || match[0];
                }
              });
            }

            // Try to extract attributes from the best match
            if (bestMatch) {
              // Extract any attributes from the listing element
              const attrSelectors = ['.attrgroup', '.attrs', '.postinginfo', '[class*="attr"]'];

              for (const selector of attrSelectors) {
                const attrElements = document.querySelectorAll(selector);
                attrElements.forEach(element => {
                  const spans = element.querySelectorAll('span, p, li');
                  spans.forEach(span => {
                    const text = span.textContent.trim();
                    if (text.includes(':')) {
                      const [key, value] = text.split(':').map(s => s.trim());
                      if (key && value) {
                        attributes[key.toLowerCase()] = value;
                      }
                    } else if (text) {
                      // For spans without a colon, use the text as both key and value
                      attributes[text.toLowerCase()] = true;
                    }
                  });
                });
              }

              // Try to extract description from the listing element
              if (!description) {
                const descSelectors = [
                  '.postingbody',
                  '#postingbody',
                  '.description',
                  '[id*="desc"]',
                  '.result-meta',
                  '.result-info',
                ];

                for (const selector of descSelectors) {
                  const descElement = document.querySelector(selector);
                  if (descElement) {
                    description = descElement.textContent.trim();
                    // Clean up the description
                    description = description.replace(/\s+/g, ' ').trim();
                    break;
                  }
                }
              }
            }

            // If we have an image URL, try to extract some attributes from it
            if (imageUrl) {
              // Craigslist image URLs sometimes contain metadata
              // Example: https://images.craigslist.org/00K0K_jwMrumpmdGU_0CI0pO_600x450.jpg
              const parts = imageUrl.split('/').pop().split('_');
              if (parts.length >= 3) {
                // The first part might be a code for the item condition or category
                const code = parts[0];
                if (code && !attributes['condition']) {
                  // This is just a guess, but some codes might indicate condition
                  if (code.includes('00')) attributes['condition'] = 'good';
                  if (code.includes('01')) attributes['condition'] = 'like new';
                }
              }
            }

            // If we still don't have a description, create one from the title and attributes
            if (!description || description.length < 10) {
              description = title;

              // Add some attributes to the description
              const importantAttrs = [
                'brand',
                'type',
                'size',
                'speeds',
                'frame material',
                'wheel size',
                'condition',
              ];
              const attrDesc = importantAttrs
                .filter(attr => attributes[attr])
                .map(attr => `${attr}: ${attributes[attr]}`)
                .join(', ');

              if (attrDesc) {
                description += ` (${attrDesc})`;
              }

              if (location) {
                description += ` - Located in ${location}`;
              }
            }

            return {
              id,
              title,
              url,
              price,
              date,
              location,
              description,
              attributes,
              imageUrl, // Keep for backward compatibility
              images, // Add all images array
              city,
            };
          } catch (error) {
            logger.error(`Error parsing JSON-LD item: ${error.message}`);
            return null;
          }
        })
        .filter(item => item !== null);

      // If fetchDetails is true, fetch detailed attributes for each result
      if (fetchDetails) {
        logger.info(`Fetching detailed attributes for ${results.length} results`);

        // Limit the number of concurrent requests to avoid rate limiting
        const concurrentLimit = 5;
        const detailedResults = [];

        for (let i = 0; i < results.length; i += concurrentLimit) {
          const batch = results.slice(i, i + concurrentLimit);
          const detailPromises = batch.map(async result => {
            try {
              const details = await getPostingDetails(result.url);
              if (details && details.attributes) {
                // Merge the detailed attributes with the search result
                return {
                  ...result,
                  attributes: {
                    ...result.attributes,
                    ...details.attributes,
                  },
                };
              }
              return result;
            } catch (error) {
              logger.error(`Error fetching details for ${result.url}: ${error.message}`);
              return result;
            }
          });

          const batchResults = await Promise.all(detailPromises);
          detailedResults.push(...batchResults);

          // Add a small delay between batches to avoid rate limiting
          if (i + concurrentLimit < results.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        return detailedResults;
      }

      return results;
    } catch (error) {
      logger.error(`Error parsing JSON-LD data: ${error.message}`);
      return [];
    }
  } catch (error) {
    logger.error(`Error parsing search results: ${error.message}`);
    return [];
  }
}

/**
 * Calculate similarity between two strings (simple implementation)
 * @param {string} str1
 * @param {string} str2
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  // Simple word overlap calculation
  const words1 = str1.split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.split(/\s+/).filter(w => w.length > 2);

  let matches = 0;
  for (const word of words1) {
    if (words2.some(w => w.includes(word) || word.includes(w))) {
      matches++;
    }
  }

  return matches / Math.max(words1.length, 1);
}

/**
 * Extract numeric price from price string
 * @param {string} priceStr
 * @returns {number|null}
 */
function extractNumericPrice(priceStr) {
  if (!priceStr) return null;

  // Extract digits from price string
  const matches = priceStr.match(/[\d.]+/);
  if (matches && matches[0]) {
    return parseFloat(matches[0]);
  }

  return null;
}

/**
 * Extract image ID from image URL
 * @param {string} imageUrl
 * @returns {string|null}
 */
function extractImageId(imageUrl) {
  if (!imageUrl) return null;

  // Try to extract image ID from Craigslist image URL
  // Format is often like: https://images.craigslist.org/00101_3kHkVAcfZtu_0bC0pa_600x450.jpg
  const matches = imageUrl.match(/\/([a-zA-Z0-9]+)_[a-zA-Z0-9]+_[a-zA-Z0-9]+_/);
  if (matches && matches[1]) {
    return matches[1];
  }

  return null;
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
  const { limit = 5, fetchDetails = false, ...searchOptions } = options;

  // Limit the number of cities to search at once to avoid rate limiting
  const citiesToSearch = cities.slice(0, limit);

  logger.info(`Searching ${citiesToSearch.length} Craigslist cities: ${citiesToSearch.join(', ')}`);

  try {
    // Search each city in parallel
    const searchPromises = citiesToSearch.map(city =>
      searchCity(city, { ...searchOptions, fetchDetails })
    );
    const results = await Promise.all(searchPromises);

    // Combine and flatten results
    const flatResults = results.flat();

    // If fetchDetails is true, fetch detailed attributes for each result
    if (fetchDetails) {
      logger.info(`Fetching detailed attributes for ${flatResults.length} results`);

      // Limit the number of concurrent requests to avoid rate limiting
      const concurrentLimit = 5;
      const detailedResults = [];

      for (let i = 0; i < flatResults.length; i += concurrentLimit) {
        const batch = flatResults.slice(i, i + concurrentLimit);
        const detailPromises = batch.map(async result => {
          try {
            const details = await getPostingDetails(result.url);
            if (details && details.attributes) {
              // Merge the detailed attributes with the search result
              return {
                ...result,
                attributes: {
                  ...result.attributes,
                  ...details.attributes,
                },
              };
            }
            return result;
          } catch (error) {
            logger.error(`Error fetching details for ${result.url}: ${error.message}`);
            return result;
          }
        });

        const batchResults = await Promise.all(detailPromises);
        detailedResults.push(...batchResults);

        // Add a small delay between batches to avoid rate limiting
        if (i + concurrentLimit < flatResults.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return detailedResults;
    }

    return flatResults;
  } catch (error) {
    logger.error(`Error searching multiple cities: ${error.message}`);
    return [];
  }
}

/**
 * Get details for a specific Craigslist posting
 *
 * @param {string} url - URL of the posting
 * @param {boolean} [forSearch=false] - Whether this is being called from search results
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
 * @param {boolean} [forSearch=false] - Whether this is being called from search results
 * @returns {Object} Parsed posting details
 */
function parsePostingDetails(html, url) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Get basic posting info
    const title = document.querySelector('#titletextonly')?.textContent.trim() || null;
    const price = document.querySelector('.price')?.textContent.trim() || null;

    // Get the full posting body text with proper cleaning
    let postingBody = '';
    const postingBodyElement = document.querySelector('#postingbody');
    if (postingBodyElement) {
      // Clone the element to avoid modifying the original
      const cleanedElement = postingBodyElement.cloneNode(true);

      // Remove the "QR Code Link to This Post" text that's often included
      const qrCodeElement = cleanedElement.querySelector('.print-information');
      if (qrCodeElement) {
        qrCodeElement.remove();
      }

      // Remove any other non-content elements
      const noticeElements = cleanedElement.querySelectorAll('.notices, .postinginfo');
      noticeElements.forEach(el => el.remove());

      // Get the cleaned text
      postingBody = cleanedElement.textContent.trim();
    }

    const postingDate =
      document.querySelector('.date.timeago')?.textContent.trim() ||
      document.querySelector('.date')?.textContent.trim() ||
      document.querySelector('time')?.textContent.trim() ||
      null;

    // Get posting images - try multiple selectors for different page layouts
    let images = [];

    // Try the thumbs container first (traditional layout)
    const thumbElements = document.querySelectorAll('#thumbs .thumb img');
    if (thumbElements.length > 0) {
      images = Array.from(thumbElements).map(img => {
        const thumbSrc = img.getAttribute('src');
        // Convert thumbnail URL to full-size image URL
        return thumbSrc.replace(/50x50c/, '600x450');
      });
    }

    // If no images found, try the gallery (newer layout)
    if (images.length === 0) {
      const galleryImages = document.querySelectorAll('.gallery img, .swipe img, .carousel img');
      if (galleryImages.length > 0) {
        images = Array.from(galleryImages)
          .map(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src');
            if (src) {
              // If it's already a full-size image, use it as is
              if (src.includes('600x450')) {
                return src;
              }
              // Otherwise, try to convert to full-size
              return src.replace(/\d+x\d+c?/, '600x450');
            }
            return null;
          })
          .filter(src => src !== null);
      }
    }

    // If still no images, look for any image that might be relevant
    if (images.length === 0) {
      const anyImages = document.querySelectorAll('img[src*="craigslist"]');
      images = Array.from(anyImages)
        .map(img => img.getAttribute('src'))
        .filter(src => src && !src.includes('icon') && !src.includes('logo'));
    }

    // Create a comprehensive collection of attributes and specs
    const tempAttributes = {};
    const attributeKeys = new Set(); // To track attribute keys for deduplication

    // Helper function to add an attribute with proper formatting and deduplication
    const addAttribute = (key, value) => {
      if (!key || key.length < 2) return;

      // Format the key consistently
      const formattedKey = key
        .toLowerCase()
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Convert camelCase to spaces
        .replace(/_/g, ' ') // Convert snake_case to spaces
        .trim();

      // Skip very long keys
      if (formattedKey.length > 50) return;

      // For string/number values
      if (typeof value === 'string' || typeof value === 'number') {
        const stringValue = String(value).trim();

        // Skip empty or very long values
        if (!stringValue || stringValue.length > 200) return;

        // Store the formatted value
        tempAttributes[formattedKey] = stringValue;
        attributeKeys.add(formattedKey);

        // Don't add this value as a boolean flag later
        attributeKeys.add(stringValue.toLowerCase());
        return;
      }

      // For boolean values (flags)
      if (value === true) {
        // Only add as boolean if we don't already have this key
        if (!attributeKeys.has(formattedKey)) {
          tempAttributes[formattedKey] = true;
          attributeKeys.add(formattedKey);
        }
        return;
      }
    };

    // 1. First, extract from attribute groups (most reliable)
    const attrGroups = document.querySelectorAll('.attrgroup');
    attrGroups.forEach(group => {
      const spans = group.querySelectorAll('span, b, p, li');
      spans.forEach(span => {
        const text = span.textContent.trim();
        if (text.includes(':')) {
          const [key, value] = text.split(':').map(s => s.trim());
          if (key && value) {
            addAttribute(key, value);
          }
        } else if (text) {
          // For spans without a colon, use the text as a boolean flag
          addAttribute(text, true);
        }

        // Check for links within spans that might contain attribute values
        const links = span.querySelectorAll('a');
        links.forEach(link => {
          const linkText = link.textContent.trim();
          if (linkText && linkText.length > 1) {
            addAttribute(linkText, true);
          }
        });
      });
    });

    // 2. Look for additional specs in various containers, focusing on right-hand side attributes
    const specContainers = [
      '.mapAndAttrs', // Main container for attributes on right side
      '.mapbox', // Contains map and attributes
      '.attrgroup', // Groups of attributes
      '.postinginfos', // Posting information (date, ID, etc.)
      'p.attrgroup', // Paragraph-based attribute groups
      'div.mapbox', // Another map container
      '.notices', // Notices that might contain attributes
      '.content', // Generic content container
      'ul.notices', // List-based notices
      '.adInfo', // Ad information
      '.attrlist', // Attribute lists
      '.housing', // Housing-specific attributes
      '.attrsContainer', // Generic attributes container
      'div.mapAndAttrs', // Another map and attributes container
      'div.attrgroup', // Another attribute group container
      'section.attributes', // Section-based attributes
      'section.userbody', // User-provided content section
    ];

    // First pass: focus on the right-hand side containers that typically have product attributes
    const rightSideContainers = [
      '.mapAndAttrs',
      '.attrgroup',
      'div.mapAndAttrs',
      'section.attributes',
    ];
    for (const selector of rightSideContainers) {
      const containers = document.querySelectorAll(selector);
      containers.forEach(container => {
        // Look specifically for structured attribute elements
        const attrElements = container.querySelectorAll(
          '.attrgroup > span, .attr > span, .attr, p.attrgroup > span'
        );
        attrElements.forEach(element => {
          const text = element.textContent.trim();

          // Skip empty or very short texts
          if (!text || text.length < 3) return;

          // Try to extract key-value pairs
          if (text.includes(':')) {
            const [key, value] = text.split(':').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else if (text.includes('=')) {
            const [key, value] = text.split('=').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else if (text.includes(' - ')) {
            const [key, value] = text.split(' - ').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else {
            // For standalone attributes (like "pet friendly"), use as boolean flags
            addAttribute(text, true);
          }

          // Check for links within the element that might contain attribute values
          const links = element.querySelectorAll('a');
          links.forEach(link => {
            const linkText = link.textContent.trim();
            if (linkText && linkText.length > 1) {
              addAttribute(linkText, true);
            }
          });
        });

        // Also look for table-based attributes (sometimes used in right sidebar)
        const tableRows = container.querySelectorAll('table tr');
        tableRows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2) {
            const key = cells[0].textContent.trim();
            const value = cells[1].textContent.trim();
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          }
        });
      });
    }

    // Second pass: check other containers for additional attributes
    for (const selector of specContainers) {
      // Skip containers we already processed
      if (rightSideContainers.includes(selector)) continue;

      const containers = document.querySelectorAll(selector);
      containers.forEach(container => {
        // Look for key-value pairs in various formats
        const specElements = container.querySelectorAll('p, li, span, div, b');
        specElements.forEach(element => {
          const text = element.textContent.trim();

          // Skip empty or very short texts
          if (!text || text.length < 3) return;

          // Try to extract key-value pairs
          if (text.includes(':')) {
            const [key, value] = text.split(':').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else if (text.includes('=')) {
            const [key, value] = text.split('=').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          } else if (text.includes(' - ')) {
            const [key, value] = text.split(' - ').map(s => s.trim());
            if (key && value && key.length > 1) {
              addAttribute(key, value);
            }
          }
        });
      });
    }

    // Look for posting info elements which often contain important metadata
    const postingInfoElements = document.querySelectorAll('.postinginfo');
    postingInfoElements.forEach(element => {
      const text = element.textContent.trim();

      // Extract post ID
      const postIdMatch = text.match(/post\s*id:\s*(\d+)/i);
      if (postIdMatch) {
        addAttribute('post id', postIdMatch[1]);
      }

      // Extract posting date
      const postedMatch = text.match(/posted:\s*(.*)/i);
      if (postedMatch) {
        addAttribute('posted', postedMatch[1].trim());
      }

      // Extract update date
      const updatedMatch = text.match(/updated:\s*(.*)/i);
      if (updatedMatch) {
        addAttribute('updated', updatedMatch[1].trim());
      }
    });

    // 3. Extract from the posting body for additional specs
    if (postingBody) {
      // Look for common specs patterns in the description
      const specPatterns = [
        { pattern: /(\w+[\s\w]*?):\s*([\w\s\d.]+)/g, keyIndex: 1, valueIndex: 2 },
        { pattern: /(\w+[\s\w]*?)\s*=\s*([\w\s\d.]+)/g, keyIndex: 1, valueIndex: 2 },
        { pattern: /(\w+[\s\w]*?)\s*-\s*([\w\s\d.]+)/g, keyIndex: 1, valueIndex: 2 },
      ];

      for (const { pattern, keyIndex, valueIndex } of specPatterns) {
        let match;
        // We need to create a new RegExp for each iteration to reset lastIndex
        const regex = new RegExp(pattern);
        while ((match = regex.exec(postingBody)) !== null) {
          const key = match[keyIndex].trim();
          const value = match[valueIndex].trim();

          // Only add if it looks like a valid spec (key is reasonable length, not a common word)
          if (
            key.length > 2 &&
            key.length < 30 &&
            !/^(and|the|this|that|with|for|from|have|has|had|not|are|is|was|were|will|would|could|should|may|might|must|can|do|does|did|but|or|if|then|than|when|where|why|how|all|any|both|each|few|more|most|some|such|only|very|same|too)$/i.test(
              key
            )
          ) {
            addAttribute(key, value);
          }
        }
      }

      // Look for specific bike-related specs
      const bikeSpecsPatterns = [
        { pattern: /(\d+)[\s-]?speed/i, key: 'speeds' },
        { pattern: /(\d+)[\s-]?inch|(\d+)"/i, key: 'wheel size' },
        { pattern: /(small|medium|large|s|m|l|xl)/i, key: 'size' },
        { pattern: /(carbon|aluminum|steel|titanium)/i, key: 'frame material' },
        { pattern: /(road|mountain|hybrid|cruiser|bmx|kids)/i, key: 'type' },
        {
          pattern: /(schwinn|trek|specialized|giant|cannondale|raleigh|diamondback|jamis)/i,
          key: 'brand',
        },
        { pattern: /(shimano|sram|campagnolo)/i, key: 'components' },
        { pattern: /(disc|rim|hydraulic|mechanical)[\s-]?brakes/i, key: 'brakes' },
        { pattern: /(front|rear|full)[\s-]?suspension/i, key: 'suspension' },
        { pattern: /(\d+)[\s-]?cm/i, key: 'frame size' },
      ];

      for (const { pattern, key } of bikeSpecsPatterns) {
        const match = postingBody.match(pattern);
        if (match) {
          addAttribute(key, match[1] || match[0]);
        }
      }
    }

    // 4. Extract structured data from JSON-LD if available
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const jsonLdData = JSON.parse(script.textContent);

        // Extract from Product type
        if (jsonLdData['@type'] === 'Product') {
          if (jsonLdData.brand && jsonLdData.brand.name) {
            addAttribute('brand', jsonLdData.brand.name);
          }

          if (jsonLdData.model) {
            addAttribute('model', jsonLdData.model);
          }

          // Extract any additional properties
          if (jsonLdData.additionalProperty && Array.isArray(jsonLdData.additionalProperty)) {
            jsonLdData.additionalProperty.forEach(prop => {
              if (prop.name && prop.value) {
                addAttribute(prop.name, prop.value);
              }
            });
          }
        }

        // Extract from other types
        if (jsonLdData.offers) {
          if (jsonLdData.offers.itemCondition) {
            addAttribute(
              'condition',
              jsonLdData.offers.itemCondition.replace('http://schema.org/', '')
            );
          }
        }

        // Extract any top-level properties that might be useful
        for (const [key, value] of Object.entries(jsonLdData)) {
          if (typeof value === 'string' || typeof value === 'number') {
            // Skip type and context
            if (key !== '@type' && key !== '@context') {
              addAttribute(key, value);
            }
          }
        }
      } catch (error) {
        logger.error(`Error parsing JSON-LD data: ${error.message}`);
      }
    });

    // 5. Extract from meta tags
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');

      if (name && content && content.length > 0) {
        // Skip some common meta tags that aren't useful as specs
        if (!['viewport', 'description', 'keywords', 'robots', 'generator'].includes(name)) {
          // Clean up the name
          const cleanName = name.replace('og:', '').replace('twitter:', '');
          addAttribute(cleanName, content);
        }
      }
    });

    // Get posting location
    const mapElement = document.querySelector('#map');
    let latitude = null;
    let longitude = null;

    if (mapElement) {
      latitude = mapElement.getAttribute('data-latitude');
      longitude = mapElement.getAttribute('data-longitude');
    }

    // Final pass to clean up and deduplicate attributes
    const cleanedAttributes = {};

    // First, add all key-value pairs (non-boolean attributes)
    for (const [key, value] of Object.entries(tempAttributes)) {
      if (value !== true) {
        cleanedAttributes[key] = value;
      }
    }

    // Create a set of values that should not be added as boolean flags
    const valueSet = new Set();
    for (const value of Object.values(cleanedAttributes)) {
      if (typeof value === 'string') {
        valueSet.add(value.toLowerCase());
      }
    }

    // Then, add boolean flags only if they don't exist as keys already
    // and don't match any existing values
    for (const [key, value] of Object.entries(tempAttributes)) {
      if (
        value === true &&
        !Object.prototype.hasOwnProperty.call(cleanedAttributes, key) &&
        !valueSet.has(key.toLowerCase())
      ) {
        cleanedAttributes[key] = true;
      }
    }

    return {
      title,
      price,
      description: postingBody,
      postingDate,
      images,
      attributes: cleanedAttributes,
      specs: cleanedAttributes, // Alias for attributes for clarity
      location: {
        latitude,
        longitude,
      },
      url,
    };
  } catch (error) {
    logger.error(`Error parsing posting details: ${error.message}`);
    return null;
  }
}
