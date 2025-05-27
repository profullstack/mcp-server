/**
 * Convert2Doc Module
 *
 * A module for converting documents between various formats using the convert2doc.com API.
 * Supports conversion from PDF, DOCX, DOC, EPUB, TXT, PPTX, XLSX to Markdown and other formats.
 */

import { logger } from '../../src/utils/logger.js';

/**
 * Convert a document using the convert2doc.com API
 * @param {string} apiKey - The convert2doc.com API key
 * @param {string} fileBase64 - Base64 encoded file content
 * @param {string} filename - Original filename with extension
 * @param {string} fromFormat - Source format (pdf, docx, doc, epub, txt, pptx, xlsx, html)
 * @param {string} toFormat - Target format (markdown, html, pdf, etc.)
 * @param {string} baseUrl - API base URL (defaults to https://convert2doc.com)
 * @param {boolean} store - Whether to store in Supabase
 * @returns {Promise<string>} - Converted content
 */
async function convertDocument(
  apiKey,
  fileBase64,
  filename,
  fromFormat,
  toFormat = 'markdown',
  baseUrl = 'https://convert2doc.com',
  store = false
) {
  try {
    logger.info(`Converting ${fromFormat} to ${toFormat}: ${filename}`);

    // Validate inputs
    if (!apiKey) {
      throw new Error('API key is required');
    }
    if (!fileBase64) {
      throw new Error('File content is required');
    }
    if (!filename) {
      throw new Error('Filename is required');
    }

    // Supported conversions
    const supportedFromFormats = ['pdf', 'docx', 'doc', 'epub', 'txt', 'pptx', 'xlsx', 'html'];
    const supportedToFormats = ['markdown', 'html', 'pdf'];

    if (!supportedFromFormats.includes(fromFormat.toLowerCase())) {
      throw new Error(
        `Unsupported source format: ${fromFormat}. Supported formats: ${supportedFromFormats.join(', ')}`
      );
    }

    if (!supportedToFormats.includes(toFormat.toLowerCase())) {
      throw new Error(
        `Unsupported target format: ${toFormat}. Supported formats: ${supportedToFormats.join(', ')}`
      );
    }

    // Build endpoint URL
    const endpoint = `${baseUrl}/api/1/${fromFormat.toLowerCase()}-to-${toFormat.toLowerCase()}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        file: fileBase64,
        filename: filename,
        store: store,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Conversion failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const convertedContent = await response.text();
    logger.info(`Successfully converted ${filename} from ${fromFormat} to ${toFormat}`);

    return convertedContent;
  } catch (error) {
    logger.error(`Error converting document: ${error.message}`);
    throw error;
  }
}

/**
 * Get supported conversion formats
 * @returns {Object} - Object containing supported formats
 */
function getSupportedFormats() {
  return {
    from: ['pdf', 'docx', 'doc', 'epub', 'txt', 'pptx', 'xlsx', 'html'],
    to: ['markdown', 'html', 'pdf'],
    popular: [
      { from: 'pdf', to: 'markdown', description: 'Convert PDF documents to Markdown' },
      { from: 'docx', to: 'markdown', description: 'Convert Word documents to Markdown' },
      { from: 'html', to: 'markdown', description: 'Convert HTML to Markdown' },
      { from: 'epub', to: 'markdown', description: 'Convert EPUB e-books to Markdown' },
      { from: 'txt', to: 'markdown', description: 'Convert plain text to Markdown' },
    ],
  };
}

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering convert2doc module');

  // Basic module info endpoint
  app.get('/convert2doc', c => {
    return c.json({
      module: 'convert2doc',
      status: 'active',
      message: 'Document conversion module using convert2doc.com API',
      version: metadata.version,
      supportedFormats: getSupportedFormats(),
    });
  });

  // Document conversion endpoint
  app.post('/convert2doc/convert', async c => {
    try {
      const body = await c.req.json();
      const {
        apiKey,
        fileBase64,
        filename,
        fromFormat,
        toFormat = 'markdown',
        baseUrl = 'https://convert2doc.com',
        store = false,
      } = body;

      if (!apiKey) {
        return c.json({ error: 'Missing required parameter: apiKey' }, 400);
      }
      if (!fileBase64) {
        return c.json({ error: 'Missing required parameter: fileBase64' }, 400);
      }
      if (!filename) {
        return c.json({ error: 'Missing required parameter: filename' }, 400);
      }
      if (!fromFormat) {
        return c.json({ error: 'Missing required parameter: fromFormat' }, 400);
      }

      const convertedContent = await convertDocument(
        apiKey,
        fileBase64,
        filename,
        fromFormat,
        toFormat,
        baseUrl,
        store
      );

      return c.json({
        success: true,
        originalFilename: filename,
        fromFormat,
        toFormat,
        convertedContent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });

  // Get supported formats endpoint
  app.get('/convert2doc/formats', c => {
    return c.json(getSupportedFormats());
  });

  // Register MCP tool info
  app.get('/tools/convert2doc/info', c => {
    return c.json({
      name: 'convert2doc',
      description: 'Convert documents between various formats using convert2doc.com API',
      parameters: {
        apiKey: {
          type: 'string',
          description: 'Your convert2doc.com API key',
          required: true,
        },
        fileBase64: {
          type: 'string',
          description: 'Base64 encoded file content',
          required: true,
        },
        filename: {
          type: 'string',
          description: 'Original filename with extension (e.g., document.pdf)',
          required: true,
        },
        fromFormat: {
          type: 'string',
          description: 'Source format (pdf, docx, doc, epub, txt, pptx, xlsx, html)',
          required: true,
        },
        toFormat: {
          type: 'string',
          description: 'Target format (markdown, html, pdf). Defaults to markdown',
          required: false,
        },
        baseUrl: {
          type: 'string',
          description: 'API base URL. Defaults to https://convert2doc.com',
          required: false,
        },
        store: {
          type: 'boolean',
          description: 'Whether to store the converted document in Supabase. Defaults to false',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/convert2doc', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.apiKey) {
        return c.json({ error: 'Missing required parameter: apiKey' }, 400);
      }
      if (!params.fileBase64) {
        return c.json({ error: 'Missing required parameter: fileBase64' }, 400);
      }
      if (!params.filename) {
        return c.json({ error: 'Missing required parameter: filename' }, 400);
      }
      if (!params.fromFormat) {
        return c.json({ error: 'Missing required parameter: fromFormat' }, 400);
      }

      const convertedContent = await convertDocument(
        params.apiKey,
        params.fileBase64,
        params.filename,
        params.fromFormat,
        params.toFormat || 'markdown',
        params.baseUrl || 'https://convert2doc.com',
        params.store || false
      );

      return c.json({
        tool: 'convert2doc',
        success: true,
        originalFilename: params.filename,
        fromFormat: params.fromFormat,
        toFormat: params.toFormat || 'markdown',
        convertedContent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });

  // Register the module info endpoint
  app.get('/modules/convert2doc', c => {
    return c.json(metadata);
  });

  logger.info('Convert2doc module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering convert2doc module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Convert2Doc Module',
  version: '1.0.0',
  description:
    'Document conversion module using convert2doc.com API for converting between various document formats',
  author: 'Profullstack, Inc.',
  tools: ['convert2doc'],
  endpoints: [
    {
      path: '/convert2doc',
      method: 'GET',
      description: 'Get module information and supported formats',
    },
    {
      path: '/convert2doc/convert',
      method: 'POST',
      description: 'Convert a document between formats',
    },
    {
      path: '/convert2doc/formats',
      method: 'GET',
      description: 'Get supported conversion formats',
    },
    { path: '/tools/convert2doc', method: 'POST', description: 'Convert2doc tool endpoint' },
  ],
  supportedConversions: [
    'PDF to Markdown',
    'DOCX to Markdown',
    'DOC to Markdown',
    'EPUB to Markdown',
    'TXT to Markdown',
    'PPTX to Markdown',
    'XLSX to Markdown',
    'HTML to Markdown',
    'And more format combinations',
  ],
};
