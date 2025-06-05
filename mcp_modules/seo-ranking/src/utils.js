/**
 * SEO Ranking Module Utilities
 *
 * This file contains utility functions for the SEO ranking module.
 */

/**
 * Clean and normalize a domain name
 * @param {string} domain - Domain to clean
 * @returns {string} Cleaned domain
 */
export function cleanDomain(domain) {
  if (!domain) return '';

  // Remove protocol if present
  let cleaned = domain.replace(/^https?:\/\//, '');

  // Remove www. if present
  cleaned = cleaned.replace(/^www\./, '');

  // Remove trailing slash
  cleaned = cleaned.replace(/\/$/, '');

  // Remove path if present (keep only domain)
  cleaned = cleaned.split('/')[0];

  return cleaned.toLowerCase();
}

/**
 * Validate a keyword
 * @param {string} keyword - Keyword to validate
 * @returns {boolean} Whether the keyword is valid
 */
export function validateKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    return false;
  }

  // Check length (reasonable limits)
  if (keyword.length < 1 || keyword.length > 200) {
    return false;
  }

  // Check for only whitespace
  if (keyword.trim().length === 0) {
    return false;
  }

  return true;
}

/**
 * Validate an array of keywords
 * @param {Array} keywords - Array of keywords to validate
 * @returns {Object} Validation result with valid keywords and errors
 */
export function validateKeywords(keywords) {
  if (!Array.isArray(keywords)) {
    return {
      valid: false,
      validKeywords: [],
      errors: ['Keywords must be an array'],
    };
  }

  if (keywords.length === 0) {
    return {
      valid: false,
      validKeywords: [],
      errors: ['Keywords array cannot be empty'],
    };
  }

  if (keywords.length > 50) {
    return {
      valid: false,
      validKeywords: [],
      errors: ['Maximum 50 keywords allowed'],
    };
  }

  const validKeywords = [];
  const errors = [];

  keywords.forEach((keyword, index) => {
    if (validateKeyword(keyword)) {
      validKeywords.push(keyword.trim());
    } else {
      errors.push(`Invalid keyword at index ${index}: "${keyword}"`);
    }
  });

  return {
    valid: validKeywords.length > 0 && errors.length === 0,
    validKeywords,
    errors,
  };
}

/**
 * Format ranking position for display
 * @param {number|null} position - Ranking position
 * @returns {string} Formatted position
 */
export function formatPosition(position) {
  if (position === null || position === undefined) {
    return 'Not found';
  }

  if (position === 1) return '1st';
  if (position === 2) return '2nd';
  if (position === 3) return '3rd';

  return `${position}th`;
}

/**
 * Calculate ranking score (higher is better)
 * @param {number|null} position - Ranking position
 * @param {number} _totalResults - Total number of results (unused but kept for API compatibility)
 * @returns {number} Score from 0-100
 */
export function calculateRankingScore(position, _totalResults = 100) {
  if (position === null || position === undefined) {
    return 0;
  }

  // Score decreases as position increases
  // Position 1 = 100 points, position 100 = 1 point
  const score = Math.max(0, 101 - position);
  return Math.round(score);
}

/**
 * Generate ranking insights
 * @param {Object} result - Ranking result
 * @returns {Object} Insights object
 */
export function generateRankingInsights(result) {
  const insights = {
    keyword: result.keyword,
    domain: result.domain,
    found: result.found,
    insights: [],
  };

  if (result.organic_rank) {
    const position = result.organic_rank.position;
    const score = calculateRankingScore(position);

    insights.insights.push({
      type: 'organic',
      position: position,
      formatted_position: formatPosition(position),
      score: score,
      message: getPositionMessage(position, 'organic'),
    });
  }

  if (result.local_rank) {
    const position = result.local_rank.position;
    const score = calculateRankingScore(position, 20); // Local results usually have fewer items

    insights.insights.push({
      type: 'local',
      position: position,
      formatted_position: formatPosition(position),
      score: score,
      message: getPositionMessage(position, 'local'),
    });
  }

  if (!result.found) {
    insights.insights.push({
      type: 'not_found',
      message: 'Domain not found in top 100 results. Consider optimizing for this keyword.',
      suggestions: [
        'Review on-page SEO for this keyword',
        'Check if the keyword is relevant to your content',
        'Consider long-tail variations of this keyword',
        'Analyze competitor content for this keyword',
      ],
    });
  }

  return insights;
}

/**
 * Get position-specific message
 * @param {number} position - Ranking position
 * @param {string} type - Type of result (organic/local)
 * @returns {string} Position message
 */
function getPositionMessage(position, type) {
  const resultType = type === 'local' ? 'local' : 'organic';

  if (position === 1) {
    return `Excellent! You're ranking #1 in ${resultType} results.`;
  } else if (position <= 3) {
    return `Great! You're in the top 3 ${resultType} results.`;
  } else if (position <= 10) {
    return `Good! You're on the first page of ${resultType} results.`;
  } else if (position <= 20) {
    return `You're on the second page of ${resultType} results. Consider optimization.`;
  } else if (position <= 50) {
    return `You're ranking in the top 50 ${resultType} results. There's room for improvement.`;
  } else {
    return `You're ranking beyond the top 50 ${resultType} results. Significant optimization needed.`;
  }
}

/**
 * Delay execution for rate limiting
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format response data for consistent output
 * @param {Object} data - Data to format
 * @returns {Object} Formatted response
 */
export function formatResponse(data) {
  return {
    ...data,
    timestamp: new Date().toISOString(),
    formatted_timestamp: new Date().toLocaleString(),
  };
}

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} Extracted domain
 */
export function extractDomain(url) {
  if (!url) return '';

  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, '').toLowerCase();
  } catch (error) {
    // Fallback to simple string manipulation
    return cleanDomain(url);
  }
}

/**
 * Check if two domains match (considering subdomains)
 * @param {string} domain1 - First domain
 * @param {string} domain2 - Second domain
 * @returns {boolean} Whether domains match
 */
export function domainsMatch(domain1, domain2) {
  const clean1 = cleanDomain(domain1);
  const clean2 = cleanDomain(domain2);

  // Exact match
  if (clean1 === clean2) return true;

  // Check if one is a subdomain of the other
  if (clean1.endsWith(`.${clean2}`) || clean2.endsWith(`.${clean1}`)) {
    return true;
  }

  return false;
}
