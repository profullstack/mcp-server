/**
 * QR Code Generator Service
 *
 * This file contains the main business logic for the QR generator module.
 * Handles QR code generation with various options and formats.
 */

import QRCode from 'qrcode';
import { validateQRInput, formatQRResponse } from './utils.js';

/**
 * QR Code service class for handling QR code generation operations
 */
export class QRService {
  constructor() {
    this.maxTextLength = 4296; // Maximum characters for QR code
    this.defaultOptions = {
      size: 200,
      format: 'png',
      errorCorrectionLevel: 'M',
      margin: 4,
    };
  }

  /**
   * Generate QR code from text
   * @param {string} text - Text to encode
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - QR code data
   */
  async generateQRCode(text, options = {}) {
    try {
      // Validate input
      validateQRInput(text, options);

      // Merge with defaults
      const config = { ...this.defaultOptions, ...options };

      // Prepare QR code options
      const qrOptions = {
        errorCorrectionLevel: config.errorCorrectionLevel,
        type: 'image/png',
        quality: 0.92,
        margin: config.margin,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: config.size,
      };

      let qrData;
      let mimeType;
      let encoding;

      switch (config.format) {
        case 'png': {
          // Generate PNG buffer
          const buffer = await QRCode.toBuffer(text, qrOptions);
          qrData = buffer.toString('base64');
          mimeType = 'image/png';
          encoding = 'base64';
          break;
        }

        case 'svg': {
          // Generate SVG string
          const svgString = await QRCode.toString(text, {
            ...qrOptions,
            type: 'svg',
            width: config.size,
          });
          qrData = Buffer.from(svgString).toString('base64');
          mimeType = 'image/svg+xml';
          encoding = 'base64';
          break;
        }

        case 'base64': {
          // Generate data URL
          const dataURL = await QRCode.toDataURL(text, qrOptions);
          qrData = dataURL;
          mimeType = 'image/png';
          encoding = 'dataurl';
          break;
        }

        default:
          throw new Error(`Unsupported format: ${config.format}`);
      }

      return formatQRResponse({
        text,
        qrData,
        mimeType,
        encoding,
        options: config,
        size: this.calculateQRSize(text, config.errorCorrectionLevel),
      });
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Get QR code information without generating
   * @param {string} text - Text to analyze
   * @param {string} errorCorrectionLevel - Error correction level
   * @returns {Object} - QR code information
   */
  getQRInfo(text, errorCorrectionLevel = 'M') {
    try {
      validateQRInput(text, { errorCorrectionLevel });

      const info = {
        textLength: text.length,
        maxLength: this.maxTextLength,
        estimatedSize: this.calculateQRSize(text, errorCorrectionLevel),
        errorCorrectionLevel,
        supportedFormats: ['png', 'svg', 'base64'],
        supportedErrorLevels: {
          L: 'Low (~7% correction)',
          M: 'Medium (~15% correction)',
          Q: 'Quartile (~25% correction)',
          H: 'High (~30% correction)',
        },
      };

      return info;
    } catch (error) {
      throw new Error(`Failed to get QR info: ${error.message}`);
    }
  }

  /**
   * Calculate estimated QR code size (modules)
   * @param {string} text - Text to encode
   * @param {string} errorCorrectionLevel - Error correction level
   * @returns {Object} - Size information
   */
  calculateQRSize(text, errorCorrectionLevel) {
    // Simplified calculation - actual size depends on encoding mode and content
    const baseSize = Math.ceil(Math.sqrt(text.length * 8));
    const correctionMultiplier =
      {
        L: 1.0,
        M: 1.15,
        Q: 1.25,
        H: 1.3,
      }[errorCorrectionLevel] || 1.15;

    const estimatedModules = Math.max(21, Math.ceil(baseSize * correctionMultiplier));

    return {
      estimatedModules,
      minSize: 21, // QR codes start at 21x21 modules
      description: `Estimated ${estimatedModules}x${estimatedModules} modules`,
    };
  }

  /**
   * Validate if text can be encoded in QR code
   * @param {string} text - Text to validate
   * @returns {boolean} - Whether text is valid
   */
  canEncode(text) {
    try {
      validateQRInput(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get supported options
   * @returns {Object} - Supported options and their ranges
   */
  getSupportedOptions() {
    return {
      formats: ['png', 'svg', 'base64'],
      errorCorrectionLevels: ['L', 'M', 'Q', 'H'],
      sizeRange: { min: 50, max: 1000 },
      marginRange: { min: 0, max: 10 },
      maxTextLength: this.maxTextLength,
      defaults: this.defaultOptions,
    };
  }
}

// Export a singleton instance
export const qrService = new QRService();
