/**
 * HTML parsing utilities for Craigslist scraping
 * Handles extraction of data from Craigslist HTML pages
 */

import { JSDOM } from 'jsdom';
import { logger } from '../../../src/utils/logger.js';
import { extractNumericPrice, extractSubcityFromUrl, getSlugWithFallback } from './utils.js';

/**
 * Parse search results from Craigslist HTML
 * @param {string} html - HTML content from search page
 * @param {string} city - City code
 * @returns {Array} Array of parsed search results
 */
export function parseSearchResults(html, city) {
  if (!html || html.trim().length === 0) {
    logger.warn('Empty HTML content provided to parseSearchResults');
    return [];
  }

  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Try multiple selectors for search results
    const selectors = [
      '.cl-search-result',
      '.result-row',
      '.result-data',
      '.search-result',
      'li.cl-search-result',
      'li.result-row',
      '.cl-static-search-result',
      '.gallery-card', // New modern Craigslist UI
      '.maptable .result-row', // Map view results
      'ul.rows li.result-row', // Another common pattern
      '.content ul.rows li', // Generic list pattern
      'li[data-pid]', // Items with posting IDs
      'a[data-id]', // Links with data-id attributes
    ];

    let results = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        logger.info(`Found ${elements.length} results using selector: ${selector}`);
        results = Array.from(elements);
        break;
      }
    }

    // If no results found with specific selectors, try a more generic approach
    if (results.length === 0) {
      logger.warn('No search results found with specific selectors, trying generic approach');

      // Look for any links that might be posting links
      const allLinks = document.querySelectorAll('a[href*=".html"]');
      if (allLinks.length > 0) {
        logger.info(`Found ${allLinks.length} potential posting links`);

        // Filter links that look like Craigslist posting links
        const postingLinks = Array.from(allLinks).filter(link => {
          const href = link.getAttribute('href');
          return (
            href &&
            (href.includes('/d/') || href.match(/\/\d+\.html$/) || href.includes('craigslist.org'))
          );
        });

        if (postingLinks.length > 0) {
          logger.info(`Found ${postingLinks.length} likely posting links`);

          // Create result elements from these links
          results = postingLinks.map(link => {
            const container = document.createElement('div');
            container.appendChild(link.cloneNode(true));
            return container;
          });
        }
      }
    }

    if (results.length === 0) {
      logger.warn('No search results found with any selector');

      // Save the HTML for debugging - using a separate async function
      saveDebugHTML(html, city, 'no-selectors').catch(err => {
        logger.error(`Failed to save debug HTML: ${err.message}`);
      });

      return [];
    }

    const parsedResults = [];

    for (const result of results) {
      try {
        const parsed = parseSearchResult(result, city);
        if (parsed) {
          parsedResults.push(parsed);
        }
      } catch (error) {
        logger.error(`Error parsing individual result: ${error.message}`);
      }
    }

    logger.info(`Successfully parsed ${parsedResults.length} search results`);
    return parsedResults;
  } catch (error) {
    logger.error(`Error parsing search results: ${error.message}`);
    return [];
  }
}

/**
 * Parse individual search result element
 * @param {Element} element - DOM element for the result
 * @param {string} city - City code
 * @returns {Object|null} Parsed result object
 */
function parseSearchResult(element, city) {
  try {
    // Extract title and URL
    const titleLink = element.querySelector(
      'a.cl-app-anchor, a.titlestring, .result-title a, .cl-search-result-title a, a[data-id]'
    );
    if (!titleLink) {
      logger.debug('No title link found in result element');
      return null;
    }

    const title = titleLink.textContent?.trim() || '';
    const relativeUrl = titleLink.getAttribute('href');

    if (!relativeUrl) {
      logger.debug('No URL found in title link');
      return null;
    }

    // Construct full URL
    const url = relativeUrl.startsWith('http')
      ? relativeUrl
      : `https://${city}.craigslist.org${relativeUrl}`;

    // Extract price
    const priceElement = element.querySelector('.price, .result-price, .cl-price');
    const priceText = priceElement?.textContent?.trim() || '';
    const price = extractNumericPrice(priceText);

    // Extract location/neighborhood
    const locationElement = element.querySelector(
      '.result-hood, .cl-search-result-neighborhood, .neighborhood'
    );
    const location = locationElement?.textContent?.trim()?.replace(/[()]/g, '') || '';

    // Extract posting date
    const dateElement = element.querySelector('.result-date, time, .cl-search-result-date');
    let date = null;
    if (dateElement) {
      const datetime = dateElement.getAttribute('datetime') || dateElement.textContent?.trim();
      if (datetime) {
        date = new Date(datetime);
        if (isNaN(date.getTime())) {
          date = null;
        }
      }
    }

    // Extract image URL with better selectors for Craigslist
    const imageSelectors = [
      '.cl-search-result-image img',
      '.result-image img',
      '.gallery img',
      'img[src*="craigslist"]',
      'img[data-src*="craigslist"]',
      '.swipe img',
      '.thumb img',
      'img',
    ];

    let imageUrl = null; // Default to null instead of empty string
    for (const selector of imageSelectors) {
      const imageElement = element.querySelector(selector);
      if (imageElement) {
        const src =
          imageElement.getAttribute('src') ||
          imageElement.getAttribute('data-src') ||
          imageElement.getAttribute('data-lazy-src');
        // Only set imageUrl if we have a valid, non-empty image URL
        if (
          src &&
          !src.includes('empty.png') &&
          !src.includes('placeholder') &&
          !src.includes('no_image') &&
          src.length > 10 && // Must be a reasonable length
          (src.includes('.jpg') ||
            src.includes('.jpeg') ||
            src.includes('.png') ||
            src.includes('.gif'))
        ) {
          imageUrl = src.startsWith('http') ? src : `https:${src}`;
          break;
        }
      }
    }

    // Extract posting ID from URL
    const postingIdMatch = url.match(/\/(\d+)\.html/);
    const postingId = postingIdMatch ? postingIdMatch[1] : null;

    // Extract subcity from URL
    const subcity = extractSubcityFromUrl(url);

    return {
      id: postingId,
      title,
      url,
      price,
      priceText,
      location,
      date,
      imageUrl,
      city,
      subcity,
      slug: getSlugWithFallback(url, title),
    };
  } catch (error) {
    logger.error(`Error parsing search result element: ${error.message}`);
    return null;
  }
}

/**
 * Parse posting details from individual posting page
 * @param {string} html - HTML content from posting page
 * @param {string} url - URL of the posting
 * @returns {Object} Parsed posting details
 */
export function parsePostingDetails(html, url) {
  if (!html || html.trim().length === 0) {
    throw new Error('Invalid or empty content received');
  }

  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Check if this is an error page
    const errorIndicators = [
      'Page Not Found',
      'This posting has been deleted',
      'This posting has expired',
      'blocked for unusual activity',
      'Access Denied',
    ];

    const pageText = document.body?.textContent || '';
    for (const indicator of errorIndicators) {
      if (pageText.includes(indicator)) {
        throw new Error(`Invalid or empty content received for ${url}`);
      }
    }

    // Extract title
    const titleElement = document.querySelector(
      '#titletextonly, .postingtitle #titletextonly, h1.postingtitle #titletextonly'
    );
    const title = titleElement?.textContent?.trim() || '';

    // Extract price
    const priceElement = document.querySelector('.price, .postinginfo .price');
    const priceText = priceElement?.textContent?.trim() || '';
    const price = extractNumericPrice(priceText);

    // Extract description
    const descriptionElement = document.querySelector('#postingbody, .postingbody, .userbody');
    const description = descriptionElement?.textContent?.trim() || '';

    // Extract attributes
    const attributes = {};
    const attrElements = document.querySelectorAll('.attrgroup span, .postinginfos .postinginfo');

    for (const attr of attrElements) {
      const text = attr.textContent?.trim();
      if (text) {
        // Parse key-value pairs like "condition: excellent"
        const colonIndex = text.indexOf(':');
        if (colonIndex > 0) {
          const key = text.substring(0, colonIndex).trim();
          const value = text.substring(colonIndex + 1).trim();
          attributes[key] = value;
        } else {
          // Handle single values like "excellent condition"
          attributes[text] = true;
        }
      }
    }

    // Extract images
    const images = [];
    const imageElements = document.querySelectorAll('#thumbs img, .gallery img, .slide img');

    for (const img of imageElements) {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && !src.includes('placeholder')) {
        // Convert thumbnail URLs to full-size URLs
        const fullSizeUrl = src.replace(/_\d+x\d+\./, '_1200x900.');
        images.push(fullSizeUrl);
      }
    }

    // Extract contact information
    const contact = {};

    // Phone number
    const phoneElement = document.querySelector('.reply-tel-number, .postinginfo .tel');
    if (phoneElement) {
      contact.phone = phoneElement.textContent?.trim();
    }

    // Email (usually hidden behind reply link)
    const replyElement = document.querySelector('.reply-button, .reply-link');
    if (replyElement) {
      const href = replyElement.getAttribute('href');
      if (href && href.includes('mailto:')) {
        contact.email = href.replace('mailto:', '');
      }
    }

    // Extract location details
    const mapElement = document.querySelector('#map');
    const location = {};

    if (mapElement) {
      location.latitude = parseFloat(mapElement.getAttribute('data-latitude')) || null;
      location.longitude = parseFloat(mapElement.getAttribute('data-longitude')) || null;
    }

    // Extract neighborhood/area
    const locationElement = document.querySelector(
      '.postinginfo .location, .postinginfos .postinginfo'
    );
    if (locationElement) {
      location.neighborhood = locationElement.textContent?.trim()?.replace(/[()]/g, '');
    }

    // Extract posting date
    let postedDate = null;
    const dateElement = document.querySelector('.postinginfo time, .postinginfos time');
    if (dateElement) {
      const datetime = dateElement.getAttribute('datetime');
      if (datetime) {
        postedDate = new Date(datetime);
        if (isNaN(postedDate.getTime())) {
          postedDate = null;
        }
      }
    }

    // Extract posting ID
    const postingIdMatch = url.match(/\/(\d+)\.html/);
    const postingId = postingIdMatch ? postingIdMatch[1] : null;

    return {
      id: postingId,
      title,
      description,
      price,
      priceText,
      attributes,
      images,
      contact,
      location,
      postedDate,
      url,
      slug: getSlugWithFallback(url, title),
    };
  } catch (error) {
    logger.error(`Error parsing posting details: ${error.message}`);
    throw error;
  }
}

/**
 * Extract posting URLs from search results HTML
 * @param {string} html - HTML content
 * @param {string} city - City code
 * @returns {Array<string>} Array of posting URLs
 */
export function extractPostingUrls(html, city) {
  if (!html || html.trim().length === 0) {
    return [];
  }

  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const urls = [];
    const linkElements = document.querySelectorAll(
      'a.cl-app-anchor, a.titlestring, .result-title a, .cl-search-result-title a, a[data-id]'
    );

    for (const link of linkElements) {
      const href = link.getAttribute('href');
      if (href) {
        const fullUrl = href.startsWith('http') ? href : `https://${city}.craigslist.org${href}`;
        urls.push(fullUrl);
      }
    }

    return urls;
  } catch (error) {
    logger.error(`Error extracting posting URLs: ${error.message}`);
    return [];
  }
}

/**
 * Check if HTML content indicates an error or blocked page
 * @param {string} html - HTML content to check
 * @returns {boolean} True if content indicates an error
 */
export function isErrorPage(html) {
  if (!html || html.trim().length === 0) {
    return true;
  }

  const errorIndicators = [
    'Page Not Found',
    'This posting has been deleted',
    'This posting has expired',
    'blocked for unusual activity',
    'Access Denied',
    'craigslist | Page Not Found',
    'HTTP Error 403',
    'HTTP Error 404',
    'HTTP Error 500',
  ];

  const lowerHtml = html.toLowerCase();
  return errorIndicators.some(indicator => lowerHtml.includes(indicator.toLowerCase()));
}

/**
 * Save HTML content to a debug file
 * @param {string} html - HTML content to save
 * @param {string} city - City code for filename
 * @param {string} prefix - Prefix for the filename
 * @returns {Promise<void>}
 */
async function saveDebugHTML(html, city, prefix) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const debugDir = path.join(process.cwd(), 'debug');

    // Create debug directory if it doesn't exist
    await fs.promises.mkdir(debugDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = path.join(debugDir, `${prefix}-${city}-${timestamp}.html`);

    await fs.promises.writeFile(filename, html);
    logger.info(`Saved debug HTML to ${filename}`);
  } catch (error) {
    logger.error(`Failed to save debug HTML: ${error.message}`);
  }
}
