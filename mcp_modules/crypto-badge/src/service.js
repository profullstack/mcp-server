// Crypto Badge Service Implementation (ESM, Node 20+)

/**
 * Default configuration for crypto badges
 */
const DEFAULT_CONFIG = {
  leftText: 'paybadge',
  rightText: 'crypto',
  leftColor: '#555',
  rightColor: '#4c1',
  altText: 'Crypto Payment',
  linkUrl: '#',
  style: 'standard',
};

/**
 * Maximum allowed text length to prevent abuse
 */
const MAX_TEXT_LENGTH = 50;

/**
 * Maximum allowed length for address parameters (longer to accommodate multiple addresses)
 */
const MAX_ADDRESS_LENGTH = 500;

/**
 * Predefined badge configurations for common cryptocurrencies
 */
const BADGE_PRESETS = {
  bitcoin: {
    badgeParams: {
      ticker: 'btc',
      rightText: 'bitcoin',
      rightColor: '#f7931a',
      icon: 'bitcoin',
    },
    altText: 'Bitcoin Payment',
  },
  ethereum: {
    badgeParams: {
      ticker: 'eth',
      rightText: 'ethereum',
      rightColor: '#627eea',
      icon: 'ethereum',
    },
    altText: 'Ethereum Payment',
  },
  solana: {
    badgeParams: {
      ticker: 'sol',
      rightText: 'solana',
      rightColor: '#00ffa3',
      icon: 'solana',
    },
    altText: 'Solana Payment',
  },
  usdc: {
    badgeParams: {
      ticker: 'usdc',
      rightText: 'USDC',
      rightColor: '#2775ca',
      icon: 'usdc',
    },
    altText: 'USDC Payment',
  },
  donation: {
    badgeParams: {
      leftText: 'donate',
      rightText: 'crypto',
      rightColor: '#28a745',
    },
    altText: 'Donate with Crypto',
  },
  support: {
    badgeParams: {
      leftText: 'support',
      rightText: 'project',
      rightColor: '#17a2b8',
    },
    altText: 'Support this Project',
  },
  multiCrypto: {
    badgeParams: {
      tickers: 'btc,eth,sol,usdc',
      style: 'enhanced',
      rightText: 'crypto',
    },
    altText: 'Multi-Crypto Payment',
  },
};

/**
 * Sanitizes input text to prevent XSS and other security issues
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum allowed length (defaults to MAX_TEXT_LENGTH)
 * @returns {string} - Sanitized text
 */
function sanitizeText(text, maxLength = MAX_TEXT_LENGTH) {
  if (typeof text !== 'string') {
    return '';
  }

  // First decode URL encoding, then sanitize
  let decoded;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    decoded = text; // If decoding fails, use original
  }

  // Remove dangerous patterns completely
  let sanitized = decoded
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/script|alert|eval|prompt|confirm/gi, '') // Remove dangerous keywords
    .replace(/[<>&"']/g, match => {
      const entities = {
        '<': '',
        '>': '',
        '&': '',
        '"': '',
        "'": '',
      };
      return entities[match];
    })
    .trim()
    .substring(0, maxLength);

  // If sanitization removed everything, return empty string
  return sanitized || '';
}

/**
 * Validates color format (basic hex color validation)
 * @param {string} color - Color to validate
 * @returns {boolean} - Whether color is valid
 */
function isValidColor(color) {
  if (typeof color !== 'string') return false;
  const colorRegex = /^#[0-9A-Fa-f]{3,6}$/;
  return colorRegex.test(color);
}

/**
 * Validates and sanitizes badge parameters
 * @param {Object} params - Raw parameters
 * @returns {Object} - Sanitized parameters
 */
function validateAndSanitizeParams(params = {}) {
  const sanitized = {};

  // Sanitize text parameters
  if (params.leftText) {
    sanitized.leftText = sanitizeText(params.leftText);
  }
  if (params.rightText) {
    sanitized.rightText = sanitizeText(params.rightText);
  }

  // Validate and sanitize colors
  if (params.leftColor && isValidColor(params.leftColor)) {
    sanitized.leftColor = params.leftColor;
  }
  if (params.rightColor && isValidColor(params.rightColor)) {
    sanitized.rightColor = params.rightColor;
  }

  // Handle other parameters
  if (params.style) {
    sanitized.style = sanitizeText(params.style);
  }
  if (params.icon) {
    sanitized.icon = sanitizeText(params.icon);
  }
  if (params.ticker) {
    sanitized.ticker = sanitizeText(params.ticker);
  }
  if (params.tickers) {
    sanitized.tickers = sanitizeText(params.tickers);
  }
  if (params.recipientAddress) {
    sanitized.recipientAddress = sanitizeText(params.recipientAddress, MAX_ADDRESS_LENGTH);
  }
  if (params.recipientAddresses) {
    sanitized.recipientAddresses = sanitizeText(params.recipientAddresses, MAX_ADDRESS_LENGTH);
  }

  return sanitized;
}

/**
 * Builds query string from parameters object
 * @param {Object} params - Parameters object
 * @returns {string} - URL-encoded query string
 */
function buildQueryString(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Escapes HTML entities in text
 * @param {string} text - Text to escape
 * @returns {string} - HTML-escaped text
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates badge URL with specified parameters
 * @param {Object} options - Badge generation options
 * @returns {string} - Complete badge URL
 */
function generateBadgeUrl(options = {}) {
  const { baseUrl, ...badgeParams } = options;

  if (!baseUrl) {
    throw new Error('baseUrl is required');
  }

  // Validate URL format
  try {
    new URL(baseUrl);
  } catch {
    throw new Error('Invalid baseUrl format');
  }

  // Sanitize parameters
  const sanitized = validateAndSanitizeParams(badgeParams);

  // Determine badge endpoint based on style
  const isEnhanced = sanitized.style === 'enhanced';
  const endpoint = isEnhanced ? '/badge-crypto.svg' : '/badge.svg';

  // Remove style from query params since it's handled by endpoint
  const queryParams = { ...sanitized };
  delete queryParams.style;

  const queryString = buildQueryString(queryParams);
  return `${baseUrl}${endpoint}${queryString}`;
}

/**
 * Generates markdown badge code
 * @param {Object} options - Badge generation options
 * @returns {string} - Markdown badge code
 */
function generateMarkdownBadge(options = {}) {
  const {
    baseUrl,
    linkUrl = DEFAULT_CONFIG.linkUrl,
    altText = DEFAULT_CONFIG.altText,
    ...badgeParams
  } = options;

  const badgeUrl = generateBadgeUrl({ baseUrl, ...badgeParams });
  return `[![${altText}](${badgeUrl})](${linkUrl})`;
}

/**
 * Generates HTML badge code
 * @param {Object} options - Badge generation options
 * @returns {string} - HTML badge code
 */
function generateHTMLBadge(options = {}) {
  const {
    baseUrl,
    linkUrl = DEFAULT_CONFIG.linkUrl,
    altText = DEFAULT_CONFIG.altText,
    ...badgeParams
  } = options;

  const badgeUrl = generateBadgeUrl({ baseUrl, ...badgeParams });
  const escapedAltText = escapeHtml(altText);

  return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">
  <img src="${badgeUrl}" alt="${escapedAltText}" />
</a>`;
}

/**
 * Generates badge code using a preset configuration
 * @param {Object} options - Badge generation options
 * @returns {Object} - Generated badge code with metadata
 */
function generatePresetBadge(options = {}) {
  const {
    baseUrl,
    preset,
    linkUrl = DEFAULT_CONFIG.linkUrl,
    format = 'markdown',
    overrides = {},
  } = options;

  const presetConfig = BADGE_PRESETS[preset];

  if (!presetConfig) {
    const availablePresets = Object.keys(BADGE_PRESETS).join(', ');
    throw new Error(`Unknown preset: ${preset}. Available presets: ${availablePresets}`);
  }

  const badgeParams = { ...presetConfig.badgeParams, ...overrides };
  const altText = overrides.altText || presetConfig.altText;

  const badgeUrl = generateBadgeUrl({ baseUrl, ...badgeParams });
  const markdown = generateMarkdownBadge({ baseUrl, linkUrl, altText, ...badgeParams });
  const html = generateHTMLBadge({ baseUrl, linkUrl, altText, ...badgeParams });

  return {
    preset,
    format: format.toLowerCase(),
    code: format.toLowerCase() === 'html' ? html : markdown,
    markdown,
    html,
    badgeUrl,
    linkUrl,
    altText,
  };
}

/**
 * Generates badge code for multiple cryptocurrencies
 * @param {Object} options - Badge generation options
 * @returns {Object} - Generated badge code with metadata
 */
function generateMultiCryptoBadge(options = {}) {
  const {
    baseUrl,
    cryptos = ['btc', 'eth', 'sol'],
    addresses = {},
    linkUrl = DEFAULT_CONFIG.linkUrl,
    format = 'markdown',
  } = options;

  const badgeParams = {};

  // Handle single vs multiple cryptocurrencies
  if (cryptos.length === 1) {
    badgeParams.ticker = cryptos[0];
    if (addresses[cryptos[0]]) {
      badgeParams.recipientAddress = addresses[cryptos[0]];
    }
  } else {
    badgeParams.tickers = cryptos.join(',');

    // Build recipient_addresses parameter if custom addresses provided
    const addressPairs = [];
    cryptos.forEach(crypto => {
      if (addresses[crypto]) {
        addressPairs.push(`${crypto}:${addresses[crypto]}`);
      }
    });

    if (addressPairs.length > 0) {
      badgeParams.recipientAddresses = addressPairs.join(',');
    }
  }

  const altText = 'Multi-Crypto Payment';
  const badgeUrl = generateBadgeUrl({ baseUrl, ...badgeParams });
  const markdown = generateMarkdownBadge({ baseUrl, linkUrl, altText, ...badgeParams });
  const html = generateHTMLBadge({ baseUrl, linkUrl, altText, ...badgeParams });

  return {
    format: format.toLowerCase(),
    code: format.toLowerCase() === 'html' ? html : markdown,
    markdown,
    html,
    badgeUrl,
    linkUrl,
    altText,
    cryptos,
    addresses,
  };
}

/**
 * Crypto Badge Service
 */
export const cryptoBadgeService = {
  generateBadgeUrl,
  generateMarkdownBadge,
  generateHTMLBadge,
  generatePresetBadge,
  generateMultiCryptoBadge,

  // Utility functions
  sanitizeText,
  isValidColor,
  validateAndSanitizeParams,
  buildQueryString,
  escapeHtml,

  // Constants
  DEFAULT_CONFIG,
  BADGE_PRESETS,
  MAX_TEXT_LENGTH,
  MAX_ADDRESS_LENGTH,
};
