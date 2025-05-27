/**
 * QR Code Generator Controller
 *
 * HTTP route handlers for the QR generator module endpoints.
 */

import { qrService } from './service.js';
import { sanitizeText, generateQRStats } from './utils.js';

/**
 * Generate QR code from text
 * @param {Object} c - Hono context
 * @returns {Response} QR code data
 */
export async function generateQRCode(c) {
  try {
    const body = await c.req.json();

    if (!body.text || typeof body.text !== 'string') {
      return c.json({ error: 'Missing or invalid required parameter: text' }, 400);
    }

    // Sanitize input text
    const sanitizedText = sanitizeText(body.text);

    // Prepare options
    const options = {
      size: body.size || 200,
      format: body.format || 'png',
      errorCorrectionLevel: body.errorCorrectionLevel || 'M',
      margin: body.margin || 4,
    };

    // Generate QR code
    const result = await qrService.generateQRCode(sanitizedText, options);

    // Add statistics
    result.statistics = generateQRStats(sanitizedText, options);

    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get QR code information
 * @param {Object} c - Hono context
 * @returns {Response} QR code information
 */
export async function getQRCodeInfo(c) {
  try {
    const text = c.req.query('text');
    const errorCorrectionLevel = c.req.query('errorCorrectionLevel') || 'M';

    if (!text) {
      // Return general information
      return c.json({
        module: 'qr-generator',
        capabilities: qrService.getSupportedOptions(),
        description: 'QR Code Generator - Convert text to QR codes',
        examples: {
          basic: {
            text: 'Hello, World!',
            options: { size: 200, format: 'png' },
          },
          url: {
            text: 'https://example.com',
            options: { size: 250, format: 'png', errorCorrectionLevel: 'M' },
          },
          advanced: {
            text: 'Custom QR code with high error correction',
            options: { size: 400, format: 'svg', errorCorrectionLevel: 'H', margin: 6 },
          },
        },
      });
    }

    // Return information for specific text
    const sanitizedText = sanitizeText(text);
    const info = qrService.getQRInfo(sanitizedText, errorCorrectionLevel);

    return c.json({
      text: sanitizedText,
      info,
      canEncode: qrService.canEncode(sanitizedText),
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get QR code with custom settings
 * @param {Object} c - Hono context
 * @returns {Response} QR code with binary data
 */
export async function getQRCodeBinary(c) {
  try {
    const text = c.req.query('text');
    const format = c.req.query('format') || 'png';
    const size = parseInt(c.req.query('size')) || 200;
    const errorCorrectionLevel = c.req.query('errorCorrectionLevel') || 'M';
    const margin = parseInt(c.req.query('margin')) || 4;

    if (!text) {
      return c.json({ error: 'Missing required parameter: text' }, 400);
    }

    const sanitizedText = sanitizeText(text);
    const options = { size, format, errorCorrectionLevel, margin };

    const result = await qrService.generateQRCode(sanitizedText, options);

    if (format === 'png') {
      // Return binary PNG data
      const buffer = Buffer.from(result.qrCode.data, 'base64');
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': 'inline; filename="qrcode.png"',
        },
      });
    } else if (format === 'svg') {
      // Return SVG data
      const svgData = Buffer.from(result.qrCode.data, 'base64').toString();
      return new Response(svgData, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': 'inline; filename="qrcode.svg"',
        },
      });
    } else {
      // Return JSON for base64 format
      return c.json(result);
    }
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Validate QR code text
 * @param {Object} c - Hono context
 * @returns {Response} Validation result
 */
export async function validateQRText(c) {
  try {
    const body = await c.req.json();

    if (!body.text) {
      return c.json({ error: 'Missing required parameter: text' }, 400);
    }

    const sanitizedText = sanitizeText(body.text);
    const canEncode = qrService.canEncode(sanitizedText);
    const info = qrService.getQRInfo(sanitizedText, body.errorCorrectionLevel || 'M');

    return c.json({
      valid: canEncode,
      text: sanitizedText,
      originalLength: body.text.length,
      sanitizedLength: sanitizedText.length,
      info,
      recommendations: canEncode
        ? 'Text is valid for QR code generation'
        : 'Text is too long or contains invalid characters',
    });
  } catch (error) {
    return c.json(
      {
        valid: false,
        error: error.message,
        recommendations: 'Please check your input text and try again',
      },
      400
    );
  }
}

/**
 * Get QR code presets for common use cases
 * @param {Object} c - Hono context
 * @returns {Response} Available presets
 */
export async function getQRPresets(c) {
  try {
    const presets = {
      url: {
        name: 'URL/Link',
        description: 'Optimized for web links and URLs',
        settings: { size: 200, errorCorrectionLevel: 'M', margin: 4, format: 'png' },
        example: 'https://example.com',
      },
      text: {
        name: 'Text Content',
        description: 'Optimized for general text content',
        settings: { size: 250, errorCorrectionLevel: 'Q', margin: 4, format: 'png' },
        example: 'Hello, World! This is a QR code.',
      },
      contact: {
        name: 'Contact Info',
        description: 'Optimized for contact information (vCard)',
        settings: { size: 300, errorCorrectionLevel: 'Q', margin: 5, format: 'png' },
        example: 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD',
      },
      wifi: {
        name: 'WiFi Credentials',
        description: 'Optimized for WiFi connection info',
        settings: { size: 250, errorCorrectionLevel: 'H', margin: 4, format: 'png' },
        example: 'WIFI:T:WPA;S:NetworkName;P:password123;H:false;;',
      },
      print: {
        name: 'Print Quality',
        description: 'High resolution for printing',
        settings: { size: 400, errorCorrectionLevel: 'H', margin: 6, format: 'svg' },
        example: 'High quality QR code for printing',
      },
      mobile: {
        name: 'Mobile Optimized',
        description: 'Smaller size for mobile displays',
        settings: { size: 150, errorCorrectionLevel: 'M', margin: 3, format: 'png' },
        example: 'Mobile-friendly QR code',
      },
    };

    return c.json({
      presets,
      usage: 'Select a preset based on your use case, then customize as needed',
      note: 'All presets can be further customized with different text content',
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
