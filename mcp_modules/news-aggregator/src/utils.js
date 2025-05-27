/**
 * News Aggregator Utilities
 *
 * Helper functions for news aggregation
 */

import { logger } from '../../../src/utils/logger.js';

/**
 * Validate URL format
 */
export function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean and normalize text content
 */
export function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n+/g, ' ') // Replace newlines with space
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Extract domain from URL
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    logger.warn(`Invalid URL for domain extraction: ${url}`);
    return 'unknown';
  }
}

/**
 * Format date to ISO string with fallback
 */
export function formatDate(dateInput) {
  if (!dateInput) {
    return new Date().toISOString();
  }

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    logger.warn(`Invalid date format: ${dateInput}`);
    return new Date().toISOString();
  }
}

/**
 * Truncate text to specified length
 */
export function truncateText(text, maxLength = 200) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Remove HTML tags from text
 */
export function stripHtml(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate news article object
 */
export function validateArticle(article) {
  const errors = [];

  if (!article.title || typeof article.title !== 'string') {
    errors.push('Title is required and must be a string');
  }

  if (!article.link || typeof article.link !== 'string' || !isValidUrl(article.link)) {
    errors.push('Link is required and must be a valid URL');
  }

  if (article.publishedAt && !formatDate(article.publishedAt)) {
    errors.push('PublishedAt must be a valid date');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Deduplicate articles by URL
 */
export function deduplicateArticles(articles) {
  const seen = new Set();
  const deduplicated = [];

  for (const article of articles) {
    if (!seen.has(article.link)) {
      seen.add(article.link);
      deduplicated.push(article);
    }
  }

  return deduplicated;
}

/**
 * Sort articles by publication date (newest first)
 */
export function sortArticlesByDate(articles) {
  return articles.sort((a, b) => {
    const dateA = new Date(a.publishedAt);
    const dateB = new Date(b.publishedAt);
    return dateB - dateA; // Newest first
  });
}

/**
 * Filter articles by date range
 */
export function filterArticlesByDateRange(articles, startDate, endDate) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  return articles.filter(article => {
    const articleDate = new Date(article.publishedAt);

    if (start && articleDate < start) {
      return false;
    }

    if (end && articleDate > end) {
      return false;
    }

    return true;
  });
}

/**
 * Calculate reading time estimate (words per minute)
 */
export function estimateReadingTime(text, wordsPerMinute = 200) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extract keywords from text using simple frequency analysis
 */
export function extractKeywords(text, maxKeywords = 10) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Common stop words to filter out
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'this',
    'that',
    'these',
    'those',
  ]);

  // Extract words and count frequency
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Generate cache key for news requests
 */
export function generateCacheKey(source, category, keywords) {
  const parts = [source];

  if (category) {
    parts.push(category);
  }

  if (keywords && keywords.length > 0) {
    parts.push(keywords.sort().join(','));
  }

  return parts.join('_').toLowerCase();
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries - 1) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  canMakeRequest(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const keyRequests = this.requests.get(key);

    // Remove old requests outside the window
    const validRequests = keyRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);

    return validRequests.length < this.maxRequests;
  }

  recordRequest(key) {
    const now = Date.now();

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    this.requests.get(key).push(now);
  }
}
