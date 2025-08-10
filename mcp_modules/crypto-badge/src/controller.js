// Crypto Badge Controller Implementation (ESM, Node 20+)
import { cryptoBadgeService } from './service.js';

/**
 * Handles badge URL generation requests
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response with badge URL
 */
export async function generateBadgeHandler(c) {
  try {
    const params = await c.req.json();

    if (!params.baseUrl) {
      return c.json({ error: 'Missing required parameter: baseUrl' }, 400);
    }

    const badgeUrl = cryptoBadgeService.generateBadgeUrl(params);

    return c.json({
      tool: 'crypto-badge',
      action: 'generate',
      result: {
        badgeUrl,
        parameters: params,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Handles markdown badge generation requests
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response with markdown badge code
 */
export async function generateMarkdownHandler(c) {
  try {
    const params = await c.req.json();

    if (!params.baseUrl) {
      return c.json({ error: 'Missing required parameter: baseUrl' }, 400);
    }

    const { baseUrl, linkUrl = '#', altText = 'Crypto Payment', ...badgeParams } = params;

    const badgeUrl = cryptoBadgeService.generateBadgeUrl({ baseUrl, ...badgeParams });
    const code = cryptoBadgeService.generateMarkdownBadge({
      baseUrl,
      linkUrl,
      altText,
      ...badgeParams,
    });

    return c.json({
      tool: 'crypto-badge',
      action: 'generate-markdown',
      result: {
        format: 'markdown',
        code,
        badgeUrl,
        linkUrl,
        altText,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Handles HTML badge generation requests
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response with HTML badge code
 */
export async function generateHTMLHandler(c) {
  try {
    const params = await c.req.json();

    if (!params.baseUrl) {
      return c.json({ error: 'Missing required parameter: baseUrl' }, 400);
    }

    const { baseUrl, linkUrl = '#', altText = 'Crypto Payment', ...badgeParams } = params;

    const badgeUrl = cryptoBadgeService.generateBadgeUrl({ baseUrl, ...badgeParams });
    const code = cryptoBadgeService.generateHTMLBadge({
      baseUrl,
      linkUrl,
      altText,
      ...badgeParams,
    });

    return c.json({
      tool: 'crypto-badge',
      action: 'generate-html',
      result: {
        format: 'html',
        code,
        badgeUrl,
        linkUrl,
        altText,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Handles preset badge generation requests
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response with preset badge code
 */
export async function generatePresetHandler(c) {
  try {
    const params = await c.req.json();

    if (!params.baseUrl) {
      return c.json({ error: 'Missing required parameter: baseUrl' }, 400);
    }

    if (!params.preset) {
      return c.json({ error: 'Missing required parameter: preset' }, 400);
    }

    const result = cryptoBadgeService.generatePresetBadge(params);

    return c.json({
      tool: 'crypto-badge',
      action: 'generate-preset',
      result: {
        ...result,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Handles multi-crypto badge generation requests
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response with multi-crypto badge code
 */
export async function generateMultiCryptoHandler(c) {
  try {
    const params = await c.req.json();

    if (!params.baseUrl) {
      return c.json({ error: 'Missing required parameter: baseUrl' }, 400);
    }

    if (!params.cryptos || !Array.isArray(params.cryptos)) {
      return c.json({ error: 'Missing or invalid parameter: cryptos (must be array)' }, 400);
    }

    const result = cryptoBadgeService.generateMultiCryptoBadge(params);

    return c.json({
      tool: 'crypto-badge',
      action: 'generate-multi-crypto',
      result: {
        ...result,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Handles requests to list available presets
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response with available presets
 */
export async function listPresetsHandler(c) {
  try {
    const presets = Object.keys(cryptoBadgeService.BADGE_PRESETS).map(key => ({
      name: key,
      description: cryptoBadgeService.BADGE_PRESETS[key].altText,
      parameters: cryptoBadgeService.BADGE_PRESETS[key].badgeParams,
    }));

    return c.json({
      tool: 'crypto-badge',
      action: 'list-presets',
      result: {
        presets,
        count: presets.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Handles requests for service configuration and defaults
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response with service configuration
 */
export async function getConfigHandler(c) {
  try {
    return c.json({
      tool: 'crypto-badge',
      action: 'get-config',
      result: {
        defaultConfig: cryptoBadgeService.DEFAULT_CONFIG,
        maxTextLength: cryptoBadgeService.MAX_TEXT_LENGTH,
        availablePresets: Object.keys(cryptoBadgeService.BADGE_PRESETS),
        supportedFormats: ['markdown', 'html'],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Handles the main MCP tool endpoint with action-based routing
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response based on action
 */
export async function cryptoBadgeToolHandler(c) {
  try {
    const params = await c.req.json();

    if (!params.action) {
      return c.json({ error: 'Missing required parameter: action' }, 400);
    }

    switch (params.action) {
      case 'generate':
        return generateBadgeHandler(c);

      case 'generate-markdown':
        return generateMarkdownHandler(c);

      case 'generate-html':
        return generateHTMLHandler(c);

      case 'generate-preset':
        return generatePresetHandler(c);

      case 'generate-multi-crypto':
        return generateMultiCryptoHandler(c);

      case 'list-presets':
        return listPresetsHandler(c);

      case 'get-config':
        return getConfigHandler(c);

      default: {
        const availableActions = [
          'generate',
          'generate-markdown',
          'generate-html',
          'generate-preset',
          'generate-multi-crypto',
          'list-presets',
          'get-config',
        ];
        return c.json(
          {
            error: `Unknown action: ${params.action}. Available actions: ${availableActions.join(', ')}`,
          },
          400
        );
      }
    }
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Handles basic module info requests
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response with module info
 */
export async function moduleInfoHandler(c) {
  return c.json({
    module: 'crypto-badge',
    status: 'active',
    message: 'Generate crypto payment badges using PayBadge API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handles MCP tool info requests
 * @param {Object} c - Hono context object
 * @returns {Promise<Response>} - JSON response with tool info
 */
export async function toolInfoHandler(c) {
  return c.json({
    name: 'crypto-badge',
    description:
      'Generate crypto payment badges using PayBadge API with support for Bitcoin, Ethereum, Solana, USDC and custom configurations',
    parameters: {
      action: {
        type: 'string',
        description:
          'Action to perform: generate, generate-markdown, generate-html, generate-preset, generate-multi-crypto, list-presets, get-config',
        required: true,
        enum: [
          'generate',
          'generate-markdown',
          'generate-html',
          'generate-preset',
          'generate-multi-crypto',
          'list-presets',
          'get-config',
        ],
      },
      baseUrl: {
        type: 'string',
        description: 'Base URL for the PayBadge service (e.g., https://paybadge.profullstack.com)',
        required: true,
        example: 'https://paybadge.profullstack.com',
      },
      leftText: {
        type: 'string',
        description: 'Text for the left side of the badge',
        required: false,
        example: 'donate',
      },
      rightText: {
        type: 'string',
        description: 'Text for the right side of the badge',
        required: false,
        example: 'bitcoin',
      },
      leftColor: {
        type: 'string',
        description: 'Hex color for the left side of the badge',
        required: false,
        example: '#555',
      },
      rightColor: {
        type: 'string',
        description: 'Hex color for the right side of the badge',
        required: false,
        example: '#f7931a',
      },
      style: {
        type: 'string',
        description: 'Badge style: standard or enhanced',
        required: false,
        enum: ['standard', 'enhanced'],
        default: 'standard',
      },
      preset: {
        type: 'string',
        description: 'Preset configuration name (for generate-preset action)',
        required: false,
        enum: ['bitcoin', 'ethereum', 'solana', 'usdc', 'donation', 'support', 'multiCrypto'],
      },
      cryptos: {
        type: 'array',
        description: 'Array of cryptocurrency tickers (for generate-multi-crypto action)',
        required: false,
        example: ['btc', 'eth', 'sol'],
      },
      addresses: {
        type: 'object',
        description: 'Custom wallet addresses for cryptocurrencies',
        required: false,
        example: { btc: 'bc1q...', eth: '0x...' },
      },
      linkUrl: {
        type: 'string',
        description: 'URL to link to when badge is clicked',
        required: false,
        example: 'https://github.com/user/repo',
      },
      altText: {
        type: 'string',
        description: 'Alt text for the badge image',
        required: false,
        example: 'Support this project with crypto',
      },
      format: {
        type: 'string',
        description: 'Output format for badge code',
        required: false,
        enum: ['markdown', 'html'],
        default: 'markdown',
      },
      overrides: {
        type: 'object',
        description: 'Parameter overrides for preset configurations',
        required: false,
      },
    },
  });
}
