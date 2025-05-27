/**
 * QR Code Generator Module
 *
 * A module for generating QR codes from text input.
 * Returns binary image data that can be used anywhere.
 */

import { logger } from '../../src/utils/logger.js';
import { generateQRCode, getQRCodeInfo } from './src/controller.js';
import { qrService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering QR generator module');

  // Basic module info endpoint
  app.get('/qr-generator', c => {
    return c.json({
      module: 'qr-generator',
      status: 'active',
      message: 'QR Code Generator - Convert text to QR codes',
      version: metadata.version,
    });
  });

  // Register QR generator routes
  app.post('/qr-generator/generate', generateQRCode);
  app.get('/qr-generator/info', getQRCodeInfo);

  // Register MCP tool info
  app.get('/tools/qr-generator/info', c => {
    return c.json({
      name: 'qr-generator',
      description: 'Generate QR codes from text input',
      parameters: {
        text: {
          type: 'string',
          description: 'Text to encode in the QR code (max 4296 characters)',
          required: true,
        },
        size: {
          type: 'number',
          description: 'Size of the QR code in pixels (default: 200, max: 1000)',
          required: false,
        },
        format: {
          type: 'string',
          description: 'Output format: png, svg, or base64 (default: png)',
          required: false,
        },
        errorCorrectionLevel: {
          type: 'string',
          description: 'Error correction level: L, M, Q, H (default: M)',
          required: false,
        },
        margin: {
          type: 'number',
          description: 'Margin around QR code in modules (default: 4)',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/qr-generator', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.text || typeof params.text !== 'string') {
        return c.json({ error: 'Missing or invalid required parameter: text' }, 400);
      }

      // Validate text length
      if (params.text.length > 4296) {
        return c.json({ error: 'Text too long. Maximum length is 4296 characters.' }, 400);
      }

      // Set defaults and validate optional parameters
      const options = {
        size: params.size || 200,
        format: params.format || 'png',
        errorCorrectionLevel: params.errorCorrectionLevel || 'M',
        margin: params.margin || 4,
      };

      // Validate size
      if (options.size < 50 || options.size > 1000) {
        return c.json({ error: 'Size must be between 50 and 1000 pixels' }, 400);
      }

      // Validate format
      if (!['png', 'svg', 'base64'].includes(options.format)) {
        return c.json({ error: 'Format must be png, svg, or base64' }, 400);
      }

      // Validate error correction level
      if (!['L', 'M', 'Q', 'H'].includes(options.errorCorrectionLevel)) {
        return c.json({ error: 'Error correction level must be L, M, Q, or H' }, 400);
      }

      // Validate margin
      if (options.margin < 0 || options.margin > 10) {
        return c.json({ error: 'Margin must be between 0 and 10 modules' }, 400);
      }

      const result = await qrService.generateQRCode(params.text, options);

      return c.json({
        tool: 'qr-generator',
        input: {
          text: params.text,
          options,
        },
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/qr-generator', c => {
    return c.json(metadata);
  });

  logger.info('QR generator module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering QR generator module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'QR Code Generator Module',
  version: '1.0.0',
  description: 'Generate QR codes from text input with customizable options',
  author: 'Profullstack, Inc.',
  tools: ['qr-generator'],
  endpoints: [
    { path: '/qr-generator', method: 'GET', description: 'Get module information' },
    { path: '/qr-generator/generate', method: 'POST', description: 'Generate QR code from text' },
    { path: '/qr-generator/info', method: 'GET', description: 'Get QR code generation info' },
    { path: '/tools/qr-generator', method: 'POST', description: 'QR generator tool endpoint' },
  ],
};
