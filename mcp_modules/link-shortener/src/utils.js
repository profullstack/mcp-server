/**
 * Link Shortener Utilities
 *
 * Utility functions for URL validation, alias generation, and data formatting.
 */

/**
 * Validate URL format and protocol
 * @param {string} url - URL to validate
 * @throws {Error} If URL is invalid
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  // Remove leading/trailing whitespace
  url = url.trim();

  if (url.length === 0) {
    throw new Error('URL cannot be empty');
  }

  // Check if URL is too long (reasonable limit)
  if (url.length > 2048) {
    throw new Error('URL is too long (maximum 2048 characters)');
  }

  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  // Validate protocol
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    throw new Error('URL must use HTTP or HTTPS protocol');
  }

  // Check for localhost/private IPs in production
  const hostname = urlObj.hostname.toLowerCase();
  const privatePatterns = [
    /^localhost$/,
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^::1$/,
    /^fe80:/,
  ];

  const isPrivate = privatePatterns.some(pattern => pattern.test(hostname));
  if (isPrivate) {
    console.warn('Warning: URL appears to be a private/local address');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [/javascript:/i, /data:/i, /vbscript:/i, /file:/i, /ftp:/i];

  if (suspiciousPatterns.some(pattern => pattern.test(url))) {
    throw new Error('URL contains suspicious or unsupported protocol');
  }

  return true;
}

/**
 * Generate a random alias for short links
 * @param {number} length - Length of the alias (default: 6)
 * @returns {string} - Random alias
 */
export function generateRandomAlias(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Validate alias format
 * @param {string} alias - Alias to validate
 * @returns {boolean} - Whether alias is valid
 */
export function validateAlias(alias) {
  if (!alias || typeof alias !== 'string') {
    return false;
  }

  // Alias should be 3-20 characters, alphanumeric plus hyphens and underscores
  const aliasPattern = /^[a-zA-Z0-9_-]{3,20}$/;

  if (!aliasPattern.test(alias)) {
    return false;
  }

  // Check for reserved words
  const reservedWords = [
    'api',
    'www',
    'admin',
    'root',
    'user',
    'login',
    'register',
    'dashboard',
    'settings',
    'profile',
    'help',
    'support',
    'about',
    'contact',
    'terms',
    'privacy',
    'legal',
    'blog',
    'news',
    'docs',
    'documentation',
    'guide',
    'app',
    'mobile',
    'desktop',
    'web',
    'site',
    'short',
    'link',
    'url',
    'redirect',
    'forward',
  ];

  if (reservedWords.includes(alias.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Format link data from hynt.us API response
 * @param {Object} data - Raw API response data
 * @param {string} originalUrl - Original long URL
 * @param {string} alias - Link alias
 * @returns {Object} - Formatted link data
 */
export function formatLinkData(data, originalUrl, alias) {
  const baseUrl = 'https://hynt.us';

  return {
    success: true,
    originalUrl: originalUrl,
    shortUrl: `${baseUrl}/${alias}`,
    alias: alias,
    id: data.id || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    clicks: data.clicks || 0,
    active: data.active !== false,
    qrCode: `${baseUrl}/qr/${alias}`, // Assuming QR code endpoint exists
    analytics: `${baseUrl}/analytics/${alias}`,
    metadata: {
      title: extractTitleFromUrl(originalUrl),
      domain: extractDomainFromUrl(originalUrl),
      path: extractPathFromUrl(originalUrl),
    },
  };
}

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} - Domain name
 */
export function extractDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Extract path from URL
 * @param {string} url - URL to extract path from
 * @returns {string} - URL path
 */
export function extractPathFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch (error) {
    return '/';
  }
}

/**
 * Extract title from URL (simple heuristic)
 * @param {string} url - URL to extract title from
 * @returns {string} - Extracted title
 */
export function extractTitleFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const path = urlObj.pathname;

    if (path === '/' || path === '') {
      return `${domain} - Homepage`;
    }

    // Extract meaningful parts from path
    const pathParts = path.split('/').filter(part => part.length > 0);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      const title = lastPart
        .replace(/[-_]/g, ' ')
        .replace(/\.[^.]*$/, '') // Remove file extension
        .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words

      return `${domain} - ${title}`;
    }

    return domain;
  } catch (error) {
    return 'Short Link';
  }
}

/**
 * Calculate URL compression statistics
 * @param {string} originalUrl - Original long URL
 * @param {string} shortUrl - Short URL
 * @returns {Object} - Compression statistics
 */
export function calculateCompressionStats(originalUrl, shortUrl) {
  const originalLength = originalUrl.length;
  const shortLength = shortUrl.length;
  const savedCharacters = originalLength - shortLength;
  const compressionRatio = ((savedCharacters / originalLength) * 100).toFixed(1);

  return {
    originalLength,
    shortLength,
    savedCharacters,
    compressionRatio: `${compressionRatio}%`,
    compressionFactor: (originalLength / shortLength).toFixed(2),
  };
}

/**
 * Sanitize alias for safe usage
 * @param {string} alias - Alias to sanitize
 * @returns {string} - Sanitized alias
 */
export function sanitizeAlias(alias) {
  if (!alias || typeof alias !== 'string') {
    return generateRandomAlias();
  }

  // Remove invalid characters and convert to lowercase
  let sanitized = alias
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 20);

  // Ensure minimum length
  if (sanitized.length < 3) {
    sanitized = generateRandomAlias();
  }

  // Ensure it doesn't start or end with special characters
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, '');

  // If empty after sanitization, generate random
  if (sanitized.length === 0) {
    sanitized = generateRandomAlias();
  }

  return sanitized;
}

/**
 * Check if URL is likely to be safe
 * @param {string} url - URL to check
 * @returns {Object} - Safety check result
 */
export function checkUrlSafety(url) {
  const warnings = [];
  const errors = [];

  try {
    const urlObj = new URL(url);

    // Check for suspicious TLDs
    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.bit'];
    const hostname = urlObj.hostname.toLowerCase();

    if (suspiciousTlds.some(tld => hostname.endsWith(tld))) {
      warnings.push('URL uses a TLD commonly associated with spam');
    }

    // Check for URL shorteners (recursive shortening)
    const shortenerDomains = [
      'bit.ly',
      'tinyurl.com',
      't.co',
      'goo.gl',
      'ow.ly',
      'short.link',
      'tiny.cc',
      'is.gd',
      'buff.ly',
    ];

    if (shortenerDomains.some(domain => hostname.includes(domain))) {
      warnings.push('URL appears to be already shortened');
    }

    // Check for suspicious patterns in URL
    const suspiciousPatterns = [/phishing/i, /malware/i, /virus/i, /hack/i, /exploit/i];

    if (suspiciousPatterns.some(pattern => pattern.test(url))) {
      warnings.push('URL contains potentially suspicious keywords');
    }

    // Check for excessive redirects indicator
    if (url.includes('redirect') && url.includes('url=')) {
      warnings.push('URL appears to contain redirect parameters');
    }

    return {
      safe: errors.length === 0,
      warnings: warnings,
      errors: errors,
      score: Math.max(0, 100 - warnings.length * 20 - errors.length * 50),
    };
  } catch (error) {
    errors.push('Invalid URL format');
    return {
      safe: false,
      warnings: warnings,
      errors: errors,
      score: 0,
    };
  }
}

/**
 * Format timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted timestamp
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';

  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch (error) {
    return timestamp;
  }
}

/**
 * Generate QR code URL for a short link
 * @param {string} shortUrl - Short URL
 * @returns {string} - QR code URL
 */
export function generateQrCodeUrl(shortUrl) {
  // Using a free QR code service
  const qrService = 'https://api.qrserver.com/v1/create-qr-code/';
  const params = new URLSearchParams({
    size: '200x200',
    data: shortUrl,
    format: 'png',
  });

  return `${qrService}?${params.toString()}`;
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} - Whether API key format is valid
 */
export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Basic format validation - adjust based on hynt.us API key format
  // Assuming format like "apikeys:xxxxxxxxxxxxx"
  const apiKeyPattern = /^apikeys:[a-zA-Z0-9]{10,}$/;

  return apiKeyPattern.test(apiKey);
}

/**
 * Mask API key for logging/display
 * @param {string} apiKey - API key to mask
 * @returns {string} - Masked API key
 */
export function maskApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return 'invalid';
  }

  if (apiKey.length <= 8) {
    return '*'.repeat(apiKey.length);
  }

  return apiKey.substring(0, 8) + '*'.repeat(apiKey.length - 8);
}

/**
 * Get URL preview information
 * @param {string} url - URL to get preview for
 * @returns {Object} - Preview information
 */
export function getUrlPreview(url) {
  try {
    const urlObj = new URL(url);

    return {
      url: url,
      domain: urlObj.hostname,
      protocol: urlObj.protocol,
      path: urlObj.pathname,
      query: urlObj.search,
      fragment: urlObj.hash,
      isSecure: urlObj.protocol === 'https:',
      estimatedTitle: extractTitleFromUrl(url),
      favicon: `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`,
    };
  } catch (error) {
    return {
      url: url,
      error: 'Invalid URL',
      valid: false,
    };
  }
}
