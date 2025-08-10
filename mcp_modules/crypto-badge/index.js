/**
 * Crypto Badge Module
 *
 * Generates crypto payment badges using PayBadge API with support for Bitcoin,
 * Ethereum, Solana, USDC and custom configurations.
 */

import { logger } from '../../src/utils/logger.js';
import {
  cryptoBadgeToolHandler,
  moduleInfoHandler,
  toolInfoHandler,
  generateBadgeHandler,
  generateMarkdownHandler,
  generateHTMLHandler,
  generatePresetHandler,
  generateMultiCryptoHandler,
  listPresetsHandler,
  getConfigHandler,
} from './src/controller.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering crypto-badge module');

  // Basic module info endpoint
  app.get('/crypto-badge', moduleInfoHandler);

  // HTTP routes for direct API access
  app.post('/crypto-badge/generate', generateBadgeHandler);
  app.post('/crypto-badge/generate-markdown', generateMarkdownHandler);
  app.post('/crypto-badge/generate-html', generateHTMLHandler);
  app.post('/crypto-badge/generate-preset', generatePresetHandler);
  app.post('/crypto-badge/generate-multi-crypto', generateMultiCryptoHandler);
  app.get('/crypto-badge/presets', listPresetsHandler);
  app.get('/crypto-badge/config', getConfigHandler);

  // MCP tool info endpoint
  app.get('/tools/crypto-badge/info', toolInfoHandler);

  // Main MCP tool endpoint with action-based routing
  app.post('/tools/crypto-badge', cryptoBadgeToolHandler);

  // Module metadata endpoint
  app.get('/modules/crypto-badge', c => {
    return c.json(metadata);
  });

  logger.info('crypto-badge module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering crypto-badge module');
  // Perform any cleanup here if necessary
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Crypto Badge Module',
  version: '1.0.0',
  description:
    'Generate crypto payment badges using PayBadge API with support for Bitcoin, Ethereum, Solana, USDC and custom configurations',
  author: 'Profullstack, Inc.',
  tools: ['crypto-badge'],
  endpoints: [
    {
      path: '/crypto-badge',
      method: 'GET',
      description: 'Get module information',
    },
    {
      path: '/crypto-badge/generate',
      method: 'POST',
      description: 'Generate badge URL with custom parameters',
    },
    {
      path: '/crypto-badge/generate-markdown',
      method: 'POST',
      description: 'Generate markdown badge code',
    },
    {
      path: '/crypto-badge/generate-html',
      method: 'POST',
      description: 'Generate HTML badge code',
    },
    {
      path: '/crypto-badge/generate-preset',
      method: 'POST',
      description: 'Generate badge using preset configuration',
    },
    {
      path: '/crypto-badge/generate-multi-crypto',
      method: 'POST',
      description: 'Generate badge for multiple cryptocurrencies',
    },
    {
      path: '/crypto-badge/presets',
      method: 'GET',
      description: 'List available preset configurations',
    },
    {
      path: '/crypto-badge/config',
      method: 'GET',
      description: 'Get service configuration and defaults',
    },
    {
      path: '/tools/crypto-badge/info',
      method: 'GET',
      description: 'Get MCP tool information and parameters',
    },
    {
      path: '/tools/crypto-badge',
      method: 'POST',
      description: 'Crypto badge MCP tool endpoint with action-based routing',
    },
  ],
  actions: [
    {
      name: 'generate',
      description: 'Generate badge URL with custom parameters',
      parameters: ['baseUrl', 'leftText', 'rightText', 'leftColor', 'rightColor', 'style'],
    },
    {
      name: 'generate-markdown',
      description: 'Generate markdown badge code',
      parameters: [
        'baseUrl',
        'linkUrl',
        'altText',
        'leftText',
        'rightText',
        'leftColor',
        'rightColor',
      ],
    },
    {
      name: 'generate-html',
      description: 'Generate HTML badge code',
      parameters: [
        'baseUrl',
        'linkUrl',
        'altText',
        'leftText',
        'rightText',
        'leftColor',
        'rightColor',
      ],
    },
    {
      name: 'generate-preset',
      description: 'Generate badge using preset configuration',
      parameters: ['baseUrl', 'preset', 'linkUrl', 'format', 'overrides'],
    },
    {
      name: 'generate-multi-crypto',
      description: 'Generate badge for multiple cryptocurrencies',
      parameters: ['baseUrl', 'cryptos', 'addresses', 'linkUrl', 'format'],
    },
    {
      name: 'list-presets',
      description: 'List available preset configurations',
      parameters: [],
    },
    {
      name: 'get-config',
      description: 'Get service configuration and defaults',
      parameters: [],
    },
  ],
  presets: [
    {
      name: 'bitcoin',
      description: 'Bitcoin payment badge with orange branding',
      example: { preset: 'bitcoin', baseUrl: 'https://paybadge.profullstack.com' },
    },
    {
      name: 'ethereum',
      description: 'Ethereum payment badge with blue branding',
      example: { preset: 'ethereum', baseUrl: 'https://paybadge.profullstack.com' },
    },
    {
      name: 'solana',
      description: 'Solana payment badge with green branding',
      example: { preset: 'solana', baseUrl: 'https://paybadge.profullstack.com' },
    },
    {
      name: 'usdc',
      description: 'USDC payment badge with blue branding',
      example: { preset: 'usdc', baseUrl: 'https://paybadge.profullstack.com' },
    },
    {
      name: 'donation',
      description: 'Generic donation badge',
      example: { preset: 'donation', baseUrl: 'https://paybadge.profullstack.com' },
    },
    {
      name: 'support',
      description: 'Project support badge',
      example: { preset: 'support', baseUrl: 'https://paybadge.profullstack.com' },
    },
    {
      name: 'multiCrypto',
      description: 'Multi-cryptocurrency payment badge',
      example: { preset: 'multiCrypto', baseUrl: 'https://paybadge.profullstack.com' },
    },
  ],
  examples: [
    {
      title: 'Generate Bitcoin Badge',
      description: 'Create a Bitcoin payment badge with custom link',
      request: {
        action: 'generate-preset',
        baseUrl: 'https://paybadge.profullstack.com',
        preset: 'bitcoin',
        linkUrl: 'https://github.com/user/repo',
      },
    },
    {
      title: 'Generate Custom Badge',
      description: 'Create a custom badge with specific colors and text',
      request: {
        action: 'generate-markdown',
        baseUrl: 'https://paybadge.profullstack.com',
        leftText: 'support',
        rightText: 'project',
        rightColor: '#28a745',
        linkUrl: 'https://github.com/user/repo',
        altText: 'Support this project',
      },
    },
    {
      title: 'Generate Multi-Crypto Badge',
      description: 'Create a badge supporting multiple cryptocurrencies',
      request: {
        action: 'generate-multi-crypto',
        baseUrl: 'https://paybadge.profullstack.com',
        cryptos: ['btc', 'eth', 'sol'],
        addresses: {
          btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          eth: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
        linkUrl: 'https://github.com/user/repo',
      },
    },
  ],
};
