/**
 * Backlinks Module Utilities
 *
 * This file contains utility functions for the backlinks module.
 */

import * as cheerio from 'cheerio';

/**
 * Validate submission data
 * @param {Object} data - Data to validate
 * @returns {boolean} Whether the data is valid
 */
export function validateSubmissionData(data) {
  if (!data) return false;
  if (typeof data !== 'object') return false;
  if (!data.product_url) return false;
  if (!data.description) return false;

  // Validate URL format
  try {
    new URL(data.product_url);
  } catch {
    return false;
  }

  return true;
}

/**
 * Generate submission content using AI-like logic
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Generated content
 */
export async function generateSubmissionContent(params) {
  const { targetSite, productUrl, description, keywords = [] } = params;

  // Extract site context for tailored content
  const siteContext = await extractSiteContext(targetSite.url);

  // Generate title variations based on site type
  const titles = generateTitleVariations(description, keywords, siteContext);

  // Generate description variations
  const descriptions = generateDescriptionVariations(description, keywords, siteContext);

  // Select best variations
  const selectedTitle = selectBestTitle(titles, siteContext);
  const selectedDescription = selectBestDescription(descriptions, siteContext);

  return {
    title: selectedTitle,
    description: selectedDescription,
    url: productUrl,
    keywords: keywords.join(', '),
    category: inferCategory(keywords, siteContext),
    tags: generateTags(keywords, description),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Extract context from target site
 * @param {string} url - Site URL
 * @returns {Promise<Object>} Site context
 */
export async function extractSiteContext(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const context = {
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      headings: [],
      formFields: [],
      categories: [],
      siteType: 'unknown',
    };

    // Extract headings
    $('h1, h2, h3').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 100) {
        context.headings.push(text);
      }
    });

    // Extract form field names
    $('input, textarea, select').each((i, el) => {
      const name = $(el).attr('name') || $(el).attr('id') || '';
      if (name) {
        context.formFields.push(name.toLowerCase());
      }
    });

    // Extract categories from select options
    $('select option').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 50) {
        context.categories.push(text);
      }
    });

    // Infer site type
    context.siteType = inferSiteType(url, context);

    return context;
  } catch (error) {
    return {
      title: '',
      description: '',
      keywords: '',
      headings: [],
      formFields: [],
      categories: [],
      siteType: 'unknown',
      error: error.message,
    };
  }
}

/**
 * Infer site type from URL and context
 * @param {string} url - Site URL
 * @param {Object} context - Site context
 * @returns {string} Site type
 */
export function inferSiteType(url, context) {
  const urlLower = url.toLowerCase();
  const titleLower = context.title.toLowerCase();

  if (urlLower.includes('directory') || titleLower.includes('directory')) {
    return 'directory';
  }
  if (urlLower.includes('startup') || titleLower.includes('startup')) {
    return 'startup_showcase';
  }
  if (urlLower.includes('product') || titleLower.includes('product')) {
    return 'product_showcase';
  }
  if (urlLower.includes('submit') || titleLower.includes('submit')) {
    return 'submission_site';
  }
  if (urlLower.includes('gallery') || titleLower.includes('gallery')) {
    return 'gallery';
  }

  return 'general';
}

/**
 * Generate title variations
 * @param {string} description - Product description
 * @param {Array} keywords - Keywords
 * @param {Object} siteContext - Site context
 * @returns {Array} Title variations
 */
export function generateTitleVariations(description, keywords, siteContext) {
  const productName = extractProductName(description);
  const primaryKeyword = keywords[0] || '';

  const variations = [
    productName,
    `${productName} - ${primaryKeyword}`,
    `${productName}: ${description.split('.')[0]}`,
    `${primaryKeyword} Tool: ${productName}`,
    `Introducing ${productName}`,
    `${productName} - AI-Powered ${primaryKeyword}`,
    `Revolutionary ${primaryKeyword}: ${productName}`,
    `${productName} - The Ultimate ${primaryKeyword} Solution`,
  ];

  // Add site-specific variations
  if (siteContext.siteType === 'startup_showcase') {
    variations.push(`Startup Spotlight: ${productName}`);
    variations.push(`New Startup: ${productName}`);
  }

  if (siteContext.siteType === 'product_showcase') {
    variations.push(`Product Launch: ${productName}`);
    variations.push(`Featured Product: ${productName}`);
  }

  return variations.filter(v => v && v.length <= 100);
}

/**
 * Generate description variations
 * @param {string} description - Original description
 * @param {Array} keywords - Keywords
 * @param {Object} siteContext - Site context
 * @returns {Array} Description variations
 */
export function generateDescriptionVariations(description, keywords, siteContext) {
  const variations = [
    description,
    `${description} Perfect for ${keywords.join(', ')} enthusiasts.`,
    `Discover ${description.toLowerCase()} Features include ${keywords.slice(0, 3).join(', ')}.`,
    `${description} Built with cutting-edge technology for ${keywords[0] || 'modern users'}.`,
    `Experience the future of ${keywords[0] || 'productivity'} with ${description.toLowerCase()}`,
    `${description} Join thousands of users who trust our ${keywords[0] || 'solution'}.`,
  ];

  // Add site-specific variations
  if (siteContext.siteType === 'startup_showcase') {
    variations.push(`Innovative startup bringing you ${description.toLowerCase()}`);
  }

  if (siteContext.siteType === 'directory') {
    variations.push(`Professional ${keywords[0] || 'business'} solution: ${description}`);
  }

  return variations.filter(v => v && v.length <= 500);
}

/**
 * Extract product name from description
 * @param {string} description - Product description
 * @returns {string} Product name
 */
export function extractProductName(description) {
  // Try to extract product name from description
  const sentences = description.split(/[.!?]/);
  const firstSentence = sentences[0].trim();

  // Look for patterns like "ProductName is..." or "Introducing ProductName"
  const patterns = [
    /^([A-Z][a-zA-Z0-9\s]{2,20})\s+is\s+/,
    /^Introducing\s+([A-Z][a-zA-Z0-9\s]{2,20})/,
    /^([A-Z][a-zA-Z0-9\s]{2,20})\s*[-:]/,
    /^([A-Z][a-zA-Z0-9\s]{2,20})\s+helps/,
    /^([A-Z][a-zA-Z0-9\s]{2,20})\s+provides/,
  ];

  for (const pattern of patterns) {
    const match = firstSentence.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback: use first few words
  const words = firstSentence.split(' ').slice(0, 3);
  return words.join(' ');
}

/**
 * Select best title based on site context
 * @param {Array} titles - Title variations
 * @param {Object} siteContext - Site context
 * @returns {string} Best title
 */
export function selectBestTitle(titles, siteContext) {
  if (titles.length === 0) return 'Untitled';

  // Score titles based on site context
  const scoredTitles = titles.map(title => ({
    title,
    score: scoreTitleForSite(title, siteContext),
  }));

  // Sort by score and return best
  scoredTitles.sort((a, b) => b.score - a.score);
  return scoredTitles[0].title;
}

/**
 * Select best description based on site context
 * @param {Array} descriptions - Description variations
 * @param {Object} siteContext - Site context
 * @returns {string} Best description
 */
export function selectBestDescription(descriptions, siteContext) {
  if (descriptions.length === 0) return 'No description available';

  // Score descriptions based on site context
  const scoredDescriptions = descriptions.map(desc => ({
    description: desc,
    score: scoreDescriptionForSite(desc, siteContext),
  }));

  // Sort by score and return best
  scoredDescriptions.sort((a, b) => b.score - a.score);
  return scoredDescriptions[0].description;
}

/**
 * Score title for specific site
 * @param {string} title - Title to score
 * @param {Object} siteContext - Site context
 * @returns {number} Score
 */
export function scoreTitleForSite(title, siteContext) {
  let score = 0;

  // Length scoring
  if (title.length >= 20 && title.length <= 60) score += 10;
  if (title.length > 60) score -= 5;

  // Keyword matching with site
  const titleLower = title.toLowerCase();
  siteContext.headings.forEach(heading => {
    const headingWords = heading.toLowerCase().split(' ');
    headingWords.forEach(word => {
      if (word.length > 3 && titleLower.includes(word)) {
        score += 2;
      }
    });
  });

  // Site type specific scoring
  if (siteContext.siteType === 'startup_showcase' && titleLower.includes('startup')) {
    score += 5;
  }
  if (siteContext.siteType === 'product_showcase' && titleLower.includes('product')) {
    score += 5;
  }

  return score;
}

/**
 * Score description for specific site
 * @param {string} description - Description to score
 * @param {Object} siteContext - Site context
 * @returns {number} Score
 */
export function scoreDescriptionForSite(description) {
  let score = 0;

  // Length scoring
  if (description.length >= 100 && description.length <= 300) score += 10;
  if (description.length > 500) score -= 5;

  // Keyword density
  const words = description.toLowerCase().split(' ');
  const uniqueWords = new Set(words);
  if (uniqueWords.size / words.length > 0.7) score += 5; // Good variety

  return score;
}

/**
 * Infer category from keywords and site context
 * @param {Array} keywords - Keywords
 * @param {Object} siteContext - Site context
 * @returns {string} Category
 */
export function inferCategory(keywords, siteContext) {
  const categories = siteContext.categories;

  if (categories.length === 0) {
    // Default categories based on keywords
    const keywordStr = keywords.join(' ').toLowerCase();
    if (keywordStr.includes('ai') || keywordStr.includes('artificial intelligence')) {
      return 'AI & Machine Learning';
    }
    if (keywordStr.includes('seo') || keywordStr.includes('marketing')) {
      return 'Marketing & SEO';
    }
    if (keywordStr.includes('productivity') || keywordStr.includes('tool')) {
      return 'Productivity Tools';
    }
    if (keywordStr.includes('web') || keywordStr.includes('website')) {
      return 'Web Development';
    }
    return 'Technology';
  }

  // Match keywords with available categories
  for (const category of categories) {
    const categoryLower = category.toLowerCase();
    for (const keyword of keywords) {
      if (
        categoryLower.includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(categoryLower)
      ) {
        return category;
      }
    }
  }

  return categories[0]; // Default to first available category
}

/**
 * Generate tags from keywords and description
 * @param {Array} keywords - Keywords
 * @param {string} description - Description
 * @returns {Array} Generated tags
 */
export function generateTags(keywords, description) {
  const tags = [...keywords];

  // Extract additional tags from description
  const words = description.toLowerCase().split(/\s+/);
  const commonTags = [
    'ai',
    'automation',
    'tool',
    'software',
    'platform',
    'solution',
    'service',
    'app',
    'web',
    'mobile',
  ];

  commonTags.forEach(tag => {
    if (words.includes(tag) && !tags.includes(tag)) {
      tags.push(tag);
    }
  });

  return tags.slice(0, 10); // Limit to 10 tags
}

/**
 * Score a site based on real metrics and relevance
 * @param {Object} siteInfo - Site information
 * @param {Object} campaign - Campaign data
 * @returns {number} Site score
 */
export function scoreSite(siteInfo, campaign) {
  let score = 0;

  // Base score for functional sites
  score += 20;

  // Relevance to keywords (primary scoring factor)
  const siteText = `${siteInfo.title} ${siteInfo.description}`.toLowerCase();
  campaign.keywords.forEach(keyword => {
    if (siteText.includes(keyword.toLowerCase())) {
      score += 15; // Increased weight for keyword relevance
    }
  });

  // Site type bonus (based on submission likelihood)
  if (siteInfo.siteType === 'startup_showcase') score += 20;
  if (siteInfo.siteType === 'product_showcase') score += 18;
  if (siteInfo.siteType === 'directory') score += 15;
  if (siteInfo.siteType === 'submission_site') score += 25;

  // Submission form availability bonus
  if (siteInfo.hasSubmissionForm) score += 10;

  // Content quality indicators
  if (siteInfo.title && siteInfo.title.length > 10) score += 5;
  if (siteInfo.description && siteInfo.description.length > 50) score += 5;
  if (siteInfo.categories && siteInfo.categories.length > 0) score += 5;

  // Penalty for errors
  if (siteInfo.error) score -= 30;

  return Math.max(0, Math.round(score));
}

/**
 * Extract site information for scoring
 * @param {string} url - Site URL
 * @returns {Promise<Object>} Site information
 */
export async function extractSiteInfo(url) {
  try {
    const context = await extractSiteContext(url);
    const domain = new URL(url).hostname;

    return {
      url,
      domain,
      title: context.title,
      description: context.description,
      siteType: context.siteType,
      hasSubmissionForm: context.formFields.length > 0,
      categories: context.categories,
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      url,
      domain: new URL(url).hostname,
      error: error.message,
      extractedAt: new Date().toISOString(),
    };
  }
}

/**
 * Add delay for rate limiting
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format response object
 * @param {Object} data - Data to format
 * @returns {Object} Formatted response
 */
export function formatResponse(data) {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Validate email configuration
 * @param {Object} config - Email config
 * @returns {Object} Validation result with details
 */
export function validateEmailConfig(config) {
  if (!config) {
    return { valid: false, error: 'Email configuration is required' };
  }

  // Check for Mailgun configuration
  if (config.mailgun_api_key && config.mailgun_domain) {
    return { valid: true, provider: 'mailgun' };
  }

  // Check for SMTP configuration
  if (config.smtp_host && config.smtp_user && config.smtp_pass) {
    return { valid: true, provider: 'smtp' };
  }

  return {
    valid: false,
    error:
      'Invalid email configuration. Required: either Mailgun (mailgun_api_key, mailgun_domain) or SMTP (smtp_host, smtp_user, smtp_pass)',
  };
}

/**
 * Generate unique campaign ID
 * @returns {string} Unique ID
 */
export function generateCampaignId() {
  return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize URL for safe processing
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
export function sanitizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    return '';
  }
}
