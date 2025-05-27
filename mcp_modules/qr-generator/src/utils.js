/**
 * QR Code Generator Utilities
 *
 * Utility functions for QR code generation, validation, and formatting.
 */

/**
 * Validate QR code input parameters
 * @param {string} text - Text to encode
 * @param {Object} options - Generation options
 * @throws {Error} If validation fails
 */
export function validateQRInput(text, options = {}) {
  // Validate text
  if (typeof text !== 'string') {
    throw new Error('Text must be a string');
  }

  if (text.length === 0) {
    throw new Error('Text cannot be empty');
  }

  if (text.length > 4296) {
    throw new Error('Text too long. Maximum length is 4296 characters');
  }

  // Validate options if provided
  if (options.size !== undefined) {
    if (typeof options.size !== 'number' || options.size < 50 || options.size > 1000) {
      throw new Error('Size must be a number between 50 and 1000 pixels');
    }
  }

  if (options.format !== undefined) {
    if (!['png', 'svg', 'base64'].includes(options.format)) {
      throw new Error('Format must be png, svg, or base64');
    }
  }

  if (options.errorCorrectionLevel !== undefined) {
    if (!['L', 'M', 'Q', 'H'].includes(options.errorCorrectionLevel)) {
      throw new Error('Error correction level must be L, M, Q, or H');
    }
  }

  if (options.margin !== undefined) {
    if (typeof options.margin !== 'number' || options.margin < 0 || options.margin > 10) {
      throw new Error('Margin must be a number between 0 and 10 modules');
    }
  }
}

/**
 * Format QR code response
 * @param {Object} data - QR code generation data
 * @returns {Object} - Formatted response
 */
export function formatQRResponse(data) {
  const response = {
    success: true,
    qrCode: {
      data: data.qrData,
      mimeType: data.mimeType,
      encoding: data.encoding,
      size: {
        pixels: data.options.size,
        modules: data.size.estimatedModules,
      },
    },
    input: {
      text: data.text,
      textLength: data.text.length,
      options: data.options,
    },
    metadata: {
      errorCorrectionLevel: data.options.errorCorrectionLevel,
      margin: data.options.margin,
      format: data.options.format,
      estimatedSize: data.size.description,
    },
    usage: {
      description: 'QR code generated successfully',
      instructions: getUsageInstructions(data.options.format),
    },
  };

  return response;
}

/**
 * Get usage instructions based on format
 * @param {string} format - Output format
 * @param {string} encoding - Data encoding
 * @returns {Object} - Usage instructions
 */
function getUsageInstructions(format) {
  const instructions = {
    png: {
      description: 'PNG image data encoded in base64',
      usage: 'Decode base64 and save as .png file, or use in <img> tag with data URL',
      example: 'data:image/png;base64,[qrCode.data]',
    },
    svg: {
      description: 'SVG vector image encoded in base64',
      usage: 'Decode base64 to get SVG markup, or use directly in HTML',
      example: 'Decode base64 to get <svg>...</svg> markup',
    },
    base64: {
      description: 'Complete data URL ready for immediate use',
      usage: 'Use directly in <img> src attribute or save to file',
      example: 'Use qrCode.data directly as image source',
    },
  };

  return instructions[format] || instructions.png;
}

/**
 * Estimate QR code capacity for different data types
 * @param {string} errorCorrectionLevel - Error correction level
 * @returns {Object} - Capacity information
 */
export function getQRCapacity(errorCorrectionLevel = 'M') {
  // Approximate capacities for different QR code versions and error correction levels
  const capacities = {
    L: { numeric: 7089, alphanumeric: 4296, binary: 2953 },
    M: { numeric: 5596, alphanumeric: 3391, binary: 2331 },
    Q: { numeric: 3993, alphanumeric: 2420, binary: 1663 },
    H: { numeric: 3057, alphanumeric: 1852, binary: 1273 },
  };

  return {
    errorCorrectionLevel,
    maxCharacters: capacities[errorCorrectionLevel]?.binary || 2331,
    capacities: capacities[errorCorrectionLevel] || capacities.M,
    description: `Maximum capacity with ${errorCorrectionLevel} error correction`,
  };
}

/**
 * Detect optimal encoding mode for text
 * @param {string} text - Text to analyze
 * @returns {Object} - Encoding information
 */
export function detectEncodingMode(text) {
  const numericRegex = /^[0-9]+$/;
  const alphanumericRegex = /^[0-9A-Z $%*+\-./:]+$/;

  if (numericRegex.test(text)) {
    return {
      mode: 'numeric',
      efficiency: 'highest',
      description: 'Numeric mode - most efficient for numbers',
    };
  }

  if (alphanumericRegex.test(text)) {
    return {
      mode: 'alphanumeric',
      efficiency: 'high',
      description: 'Alphanumeric mode - efficient for uppercase letters and numbers',
    };
  }

  return {
    mode: 'binary',
    efficiency: 'standard',
    description: 'Binary mode - supports all characters',
  };
}

/**
 * Generate QR code statistics
 * @param {string} text - Input text
 * @param {Object} options - Generation options
 * @returns {Object} - Statistics
 */
export function generateQRStats(text, options) {
  const encoding = detectEncodingMode(text);
  const capacity = getQRCapacity(options.errorCorrectionLevel);

  return {
    input: {
      length: text.length,
      encoding: encoding.mode,
      efficiency: encoding.efficiency,
    },
    capacity: {
      used: text.length,
      available: capacity.maxCharacters,
      utilization: Math.round((text.length / capacity.maxCharacters) * 100),
    },
    options: {
      size: `${options.size}x${options.size} pixels`,
      format: options.format.toUpperCase(),
      errorCorrection: options.errorCorrectionLevel,
      margin: `${options.margin} modules`,
    },
  };
}

/**
 * Validate and sanitize text input
 * @param {string} text - Input text
 * @returns {string} - Sanitized text
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input must be a string');
  }

  // Remove null bytes and other problematic characters
  const sanitized = text.replace(/\0/g, '').trim();

  if (sanitized.length === 0) {
    throw new Error('Text cannot be empty after sanitization');
  }

  return sanitized;
}

/**
 * Get recommended settings for different use cases
 * @param {string} useCase - Use case type
 * @returns {Object} - Recommended settings
 */
export function getRecommendedSettings(useCase) {
  const presets = {
    url: {
      size: 200,
      errorCorrectionLevel: 'M',
      margin: 4,
      format: 'png',
      description: 'Optimized for URLs and web links',
    },
    text: {
      size: 250,
      errorCorrectionLevel: 'Q',
      margin: 4,
      format: 'png',
      description: 'Optimized for text content',
    },
    print: {
      size: 400,
      errorCorrectionLevel: 'H',
      margin: 6,
      format: 'svg',
      description: 'Optimized for printing and physical media',
    },
    mobile: {
      size: 150,
      errorCorrectionLevel: 'M',
      margin: 3,
      format: 'png',
      description: 'Optimized for mobile scanning',
    },
    default: {
      size: 200,
      errorCorrectionLevel: 'M',
      margin: 4,
      format: 'png',
      description: 'Balanced settings for general use',
    },
  };

  return presets[useCase] || presets.default;
}

/**
 * Convert base64 to buffer
 * @param {string} base64 - Base64 string
 * @returns {Buffer} - Buffer data
 */
export function base64ToBuffer(base64) {
  try {
    return Buffer.from(base64, 'base64');
  } catch (error) {
    throw new Error(`Invalid base64 data: ${error.message}`);
  }
}

/**
 * Convert buffer to base64
 * @param {Buffer} buffer - Buffer data
 * @returns {string} - Base64 string
 */
export function bufferToBase64(buffer) {
  try {
    return buffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to convert buffer to base64: ${error.message}`);
  }
}
