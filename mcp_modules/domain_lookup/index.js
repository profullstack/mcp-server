/**
 * Domain Lookup Module
 *
 * Domain availability checker and brainstorming tool using tldx CLI.
 * Provides comprehensive domain checking, suggestion generation, and TLD preset management.
 */

import { logger } from '../../src/utils/logger.js';
import {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  processItem,
  checkDomainAvailability,
  generateDomainSuggestions,
  getTldPresets,
  bulkDomainCheck,
} from './src/controller.js';
// Domain lookup service available for future use
// import { domainLookupService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering domain lookup module');

  // Basic module info endpoint
  app.get('/domain-lookup', c => {
    return c.json({
      module: 'domain-lookup',
      status: 'active',
      message: 'Domain availability checker and brainstorming tool using tldx CLI',
      version: metadata.version,
      tools: metadata.tools,
      tldxRequired: true,
    });
  });

  // Register legacy item routes for compatibility
  app.get('/domain-lookup/items', getAllItems);
  app.get('/domain-lookup/items/:id', getItemById);
  app.post('/domain-lookup/items', createItem);
  app.put('/domain-lookup/items/:id', updateItem);
  app.delete('/domain-lookup/items/:id', deleteItem);
  app.post('/domain-lookup/items/:id/process', processItem);

  // Register domain lookup specific routes
  app.post('/domain-lookup/check', checkDomainAvailability);
  app.post('/domain-lookup/suggest', generateDomainSuggestions);
  app.get('/domain-lookup/presets', getTldPresets);
  app.post('/domain-lookup/bulk', bulkDomainCheck);

  // Register MCP tools
  registerMcpTools(app);

  // Register the module info endpoint
  app.get('/modules/domain-lookup', c => {
    return c.json(metadata);
  });

  logger.info('Domain lookup module registered successfully');
}

/**
 * Register MCP tools for domain lookup
 * @param {import('hono').Hono} app - The Hono app instance
 */
function registerMcpTools(app) {
  // Check Domain Availability Tool
  app.get('/tools/check_domain_availability/info', c => {
    return c.json({
      name: 'check_domain_availability',
      description: 'Check availability of one or more domain names',
      parameters: {
        domains: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of domain names to check (e.g., ["example.com", "test.org"])',
          required: true,
        },
        format: {
          type: 'string',
          enum: ['text', 'json', 'json-stream', 'json-array', 'csv'],
          description: 'Output format for results',
          default: 'text',
          required: false,
        },
        onlyAvailable: {
          type: 'boolean',
          description: 'Show only available domains',
          default: false,
          required: false,
        },
        maxDomainLength: {
          type: 'integer',
          description: 'Maximum length of domain name',
          minimum: 1,
          maximum: 253,
          required: false,
        },
        verbose: {
          type: 'boolean',
          description: 'Show verbose output',
          default: false,
          required: false,
        },
      },
    });
  });

  app.post('/tools/check_domain_availability', checkDomainAvailability);

  // Generate Domain Suggestions Tool
  app.get('/tools/generate_domain_suggestions/info', c => {
    return c.json({
      name: 'generate_domain_suggestions',
      description: 'Generate domain suggestions with prefixes, suffixes, and TLDs',
      parameters: {
        keyword: {
          type: 'string',
          description: 'Base keyword for domain generation (e.g., "openai")',
          required: true,
        },
        prefixes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Prefixes to add (e.g., ["get", "my", "use"])',
          required: false,
        },
        suffixes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suffixes to add (e.g., ["ly", "hub", "ify"])',
          required: false,
        },
        tlds: {
          type: 'array',
          items: { type: 'string' },
          description: 'TLDs to check (e.g., ["com", "io", "ai"])',
          required: false,
        },
        tldPreset: {
          type: 'string',
          description: 'Use a TLD preset (e.g., "popular", "tech", "business")',
          required: false,
        },
        format: {
          type: 'string',
          enum: ['text', 'json', 'json-stream', 'json-array', 'csv'],
          description: 'Output format for results',
          default: 'text',
          required: false,
        },
        onlyAvailable: {
          type: 'boolean',
          description: 'Show only available domains',
          default: false,
          required: false,
        },
        maxDomainLength: {
          type: 'integer',
          description: 'Maximum length of domain name',
          minimum: 1,
          maximum: 253,
          required: false,
        },
        showStats: {
          type: 'boolean',
          description: 'Show statistics at the end',
          default: false,
          required: false,
        },
        verbose: {
          type: 'boolean',
          description: 'Show verbose output',
          default: false,
          required: false,
        },
      },
    });
  });

  app.post('/tools/generate_domain_suggestions', generateDomainSuggestions);

  // Get TLD Presets Tool
  app.get('/tools/get_tld_presets/info', c => {
    return c.json({
      name: 'get_tld_presets',
      description: 'Get available TLD presets (popular, tech, business, creative, etc.)',
      parameters: {},
    });
  });

  app.post('/tools/get_tld_presets', getTldPresets);

  // Bulk Domain Check Tool
  app.get('/tools/bulk_domain_check/info', c => {
    return c.json({
      name: 'bulk_domain_check',
      description:
        'Check multiple keywords with various combinations of prefixes, suffixes, and TLDs',
      parameters: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of keywords to check (e.g., ["openai", "google", "facebook"])',
          required: true,
        },
        prefixes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Prefixes to add (e.g., ["get", "my", "use"])',
          required: false,
        },
        suffixes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suffixes to add (e.g., ["ly", "hub", "ify"])',
          required: false,
        },
        tlds: {
          type: 'array',
          items: { type: 'string' },
          description: 'TLDs to check (e.g., ["com", "io", "ai"])',
          required: false,
        },
        tldPreset: {
          type: 'string',
          description: 'Use a TLD preset (e.g., "popular", "tech", "business")',
          required: false,
        },
        format: {
          type: 'string',
          enum: ['text', 'json', 'json-stream', 'json-array', 'csv'],
          description: 'Output format for results',
          default: 'text',
          required: false,
        },
        onlyAvailable: {
          type: 'boolean',
          description: 'Show only available domains',
          default: false,
          required: false,
        },
        maxDomainLength: {
          type: 'integer',
          description: 'Maximum length of domain name',
          minimum: 1,
          maximum: 253,
          required: false,
        },
        showStats: {
          type: 'boolean',
          description: 'Show statistics at the end',
          default: false,
          required: false,
        },
        verbose: {
          type: 'boolean',
          description: 'Show verbose output',
          default: false,
          required: false,
        },
      },
    });
  });

  app.post('/tools/bulk_domain_check', bulkDomainCheck);
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering domain lookup module');
  // Perform any cleanup here
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Domain Lookup Module',
  version: '1.0.0',
  description: 'Domain availability checker and brainstorming tool using tldx CLI',
  author: 'MCP Server',
  tools: [
    'check_domain_availability',
    'generate_domain_suggestions',
    'get_tld_presets',
    'bulk_domain_check',
  ],
  endpoints: [
    { path: '/domain-lookup', method: 'GET', description: 'Get module information' },
    { path: '/domain-lookup/check', method: 'POST', description: 'Check domain availability' },
    { path: '/domain-lookup/suggest', method: 'POST', description: 'Generate domain suggestions' },
    { path: '/domain-lookup/presets', method: 'GET', description: 'Get TLD presets' },
    { path: '/domain-lookup/bulk', method: 'POST', description: 'Bulk domain check' },
    {
      path: '/tools/check_domain_availability',
      method: 'POST',
      description: 'Check domain availability tool',
    },
    {
      path: '/tools/generate_domain_suggestions',
      method: 'POST',
      description: 'Generate domain suggestions tool',
    },
    { path: '/tools/get_tld_presets', method: 'POST', description: 'Get TLD presets tool' },
    { path: '/tools/bulk_domain_check', method: 'POST', description: 'Bulk domain check tool' },
  ],
  requirements: {
    tldx: {
      description: 'tldx CLI tool must be installed',
      installation:
        'brew install brandonyoungdev/tldx/tldx or go install github.com/brandonyoungdev/tldx@latest',
      checkCommand: 'tldx version',
    },
  },
};
