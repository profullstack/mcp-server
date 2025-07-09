/**
 * Utility Functions
 * Helper functions for parameter validation, response formatting, and common operations
 */

/**
 * Validate request parameters
 * @param {object} params - Parameters to validate
 * @param {string[]} required - Required parameter names
 * @param {object} [types] - Expected types for parameters
 * @returns {object} Validation result with valid flag and errors array
 */
export function validateParameters(params, required = [], types = {}) {
  const errors = [];

  // Check required parameters
  for (const param of required) {
    if (!(param in params) || params[param] === undefined || params[param] === null) {
      errors.push(`Missing required parameter: ${param}`);
    }
  }

  // Check parameter types
  for (const [param, expectedType] of Object.entries(types)) {
    if (param in params && params[param] !== undefined && params[param] !== null) {
      const actualType = getParameterType(params[param]);
      if (actualType !== expectedType) {
        errors.push(`Parameter ${param} must be of type ${expectedType}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the type of a parameter for validation
 * @param {*} value - Value to check
 * @returns {string} Type name
 */
function getParameterType(value) {
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

/**
 * Format a response for MCP tools
 * @param {object} result - Result object from service
 * @param {string} toolName - Name of the MCP tool
 * @returns {object} Formatted response
 */
export function formatResponse(result, toolName) {
  return {
    tool: toolName,
    success: result.success,
    result,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {number} [statusCode=500] - HTTP status code
 * @returns {object} Error response object
 */
export function createErrorResponse(message, statusCode = 500) {
  return {
    error: message,
    statusCode,
  };
}

/**
 * Sanitize content by trimming whitespace and normalizing
 * @param {object} content - Content object to sanitize
 * @returns {object} Sanitized content object
 */
export function sanitizeContent(content) {
  const sanitized = { ...content };

  // Trim text if present
  if (sanitized.text && typeof sanitized.text === 'string') {
    sanitized.text = sanitized.text.trim();
  }

  // Trim link if present
  if (sanitized.link && typeof sanitized.link === 'string') {
    sanitized.link = sanitized.link.trim();
  }

  return sanitized;
}

/**
 * Get display name for a platform
 * @param {string} platformId - Platform identifier
 * @returns {string} Human-readable platform name
 */
export function getPlatformDisplayName(platformId) {
  if (!platformId) {
    return '';
  }

  const displayNames = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    reddit: 'Reddit',
    facebook: 'Facebook',
    'hacker-news': 'Hacker News',
    'stacker-news': 'Stacker News',
    primal: 'Primal',
  };

  return displayNames[platformId] || capitalize(platformId);
}

/**
 * Capitalize the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  if (!str || typeof str !== 'string') {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Validate if a string is a valid URL
 * @param {string} url - URL string to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Create a standardized error for missing parameters
 * @param {string} paramName - Name of the missing parameter
 * @returns {object} Error response
 */
export function createMissingParameterError(paramName) {
  return createErrorResponse(`Missing required parameter: ${paramName}`, 400);
}

/**
 * Create a standardized error for invalid parameter types
 * @param {string} paramName - Name of the parameter
 * @param {string} expectedType - Expected type
 * @returns {object} Error response
 */
export function createInvalidTypeError(paramName, expectedType) {
  return createErrorResponse(`Parameter ${paramName} must be of type ${expectedType}`, 400);
}

/**
 * Validate content object structure
 * @param {*} content - Content to validate
 * @returns {object} Validation result
 */
export function validateContentStructure(content) {
  const errors = [];

  if (!content || typeof content !== 'object') {
    errors.push('Content must be an object');
    return { valid: false, errors };
  }

  if (!content.text && !content.link) {
    errors.push('Content must have either text or link');
  }

  if (content.text && typeof content.text !== 'string') {
    errors.push('Text must be a string');
  }

  if (content.link && !isValidUrl(content.link)) {
    errors.push('Link must be a valid URL');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate platforms array
 * @param {*} platforms - Platforms to validate
 * @returns {object} Validation result
 */
export function validatePlatformsArray(platforms) {
  const errors = [];

  if (platforms !== undefined && platforms !== null) {
    if (!Array.isArray(platforms)) {
      errors.push('Platforms must be an array');
    } else {
      // Check that all platforms are strings
      for (let i = 0; i < platforms.length; i++) {
        if (typeof platforms[i] !== 'string') {
          errors.push(`Platform at index ${i} must be a string`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a success response for MCP tools
 * @param {object} data - Response data
 * @param {string} toolName - Tool name
 * @returns {object} Success response
 */
export function createSuccessResponse(data, toolName) {
  return {
    tool: toolName,
    success: true,
    result: data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response for MCP tools
 * @param {string} message - Error message
 * @param {string} toolName - Tool name
 * @returns {object} Error response
 */
export function createToolErrorResponse(message, toolName) {
  return {
    tool: toolName,
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Safe JSON parsing with error handling
 * @param {string} jsonString - JSON string to parse
 * @returns {object} Parsed object or error result
 */
export function safeJsonParse(jsonString) {
  try {
    return {
      success: true,
      data: JSON.parse(jsonString),
    };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${error.message}`,
    };
  }
}

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current timestamp in ISO format
 * @returns {string} ISO timestamp string
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}
