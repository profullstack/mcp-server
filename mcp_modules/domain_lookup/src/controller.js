import { domainLookupService } from './service.js';

/**
 * Check domain availability
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with domain availability results
 */
export async function checkDomainAvailability(c) {
  try {
    const params = await c.req.json();

    // Validate required parameters
    if (!params.domains) {
      return c.json(
        {
          error: 'Missing required parameter: domains (array of domain names)',
        },
        400
      );
    }

    if (!Array.isArray(params.domains)) {
      return c.json(
        {
          error: 'domains parameter must be an array',
        },
        400
      );
    }

    // Extract options
    const options = {
      format: params.format || 'text',
      onlyAvailable: params.onlyAvailable || false,
      maxDomainLength: params.maxDomainLength,
      verbose: params.verbose || false,
      noColor: params.noColor || true, // Default to no color for API responses
    };

    const result = await domainLookupService.checkDomainAvailability(params.domains, options);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Generate domain suggestions with prefixes, suffixes, and TLDs
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with domain suggestions
 */
export async function generateDomainSuggestions(c) {
  try {
    const params = await c.req.json();

    // Validate required parameters
    if (!params.keyword) {
      return c.json(
        {
          error: 'Missing required parameter: keyword',
        },
        400
      );
    }

    // Validate array parameters
    if (params.prefixes && !Array.isArray(params.prefixes)) {
      return c.json(
        {
          error: 'prefixes parameter must be an array',
        },
        400
      );
    }

    if (params.suffixes && !Array.isArray(params.suffixes)) {
      return c.json(
        {
          error: 'suffixes parameter must be an array',
        },
        400
      );
    }

    if (params.tlds && !Array.isArray(params.tlds)) {
      return c.json(
        {
          error: 'tlds parameter must be an array',
        },
        400
      );
    }

    // Extract options
    const options = {
      prefixes: params.prefixes,
      suffixes: params.suffixes,
      tlds: params.tlds,
      format: params.format || 'text',
      onlyAvailable: params.onlyAvailable || false,
      maxDomainLength: params.maxDomainLength,
      tldPreset: params.tldPreset,
      showStats: params.showStats || false,
      verbose: params.verbose || false,
      noColor: params.noColor || true,
    };

    const result = await domainLookupService.generateDomainSuggestions(params.keyword, options);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get available TLD presets
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with TLD presets
 */
export async function getTldPresets(c) {
  try {
    const result = await domainLookupService.getTldPresets();
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Bulk domain check with various options
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with bulk check results
 */
export async function bulkDomainCheck(c) {
  try {
    const params = await c.req.json();

    // Validate required parameters
    if (!params.keywords) {
      return c.json(
        {
          error: 'Missing required parameter: keywords (array of keywords)',
        },
        400
      );
    }

    if (!Array.isArray(params.keywords)) {
      return c.json(
        {
          error: 'keywords parameter must be an array',
        },
        400
      );
    }

    // Validate array parameters
    if (params.prefixes && !Array.isArray(params.prefixes)) {
      return c.json(
        {
          error: 'prefixes parameter must be an array',
        },
        400
      );
    }

    if (params.suffixes && !Array.isArray(params.suffixes)) {
      return c.json(
        {
          error: 'suffixes parameter must be an array',
        },
        400
      );
    }

    if (params.tlds && !Array.isArray(params.tlds)) {
      return c.json(
        {
          error: 'tlds parameter must be an array',
        },
        400
      );
    }

    // Extract options
    const options = {
      prefixes: params.prefixes,
      suffixes: params.suffixes,
      tlds: params.tlds,
      format: params.format || 'text',
      onlyAvailable: params.onlyAvailable || false,
      maxDomainLength: params.maxDomainLength,
      tldPreset: params.tldPreset,
      showStats: params.showStats || false,
      verbose: params.verbose || false,
      noColor: params.noColor || true,
    };

    const result = await domainLookupService.bulkDomainCheck(params.keywords, options);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get all domain lookup items (for compatibility with template structure)
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with empty items array
 */
export async function getAllItems(c) {
  return c.json({
    message: 'Domain lookup module does not store items. Use the domain checking tools instead.',
    availableTools: [
      'checkDomainAvailability',
      'generateDomainSuggestions',
      'getTldPresets',
      'bulkDomainCheck',
    ],
  });
}

/**
 * Get domain lookup item by ID (for compatibility with template structure)
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with not found message
 */
export async function getItemById(c) {
  return c.json(
    {
      error: 'Domain lookup module does not store items. Use the domain checking tools instead.',
    },
    404
  );
}

/**
 * Create domain lookup item (for compatibility with template structure)
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with not supported message
 */
export async function createItem(c) {
  return c.json(
    {
      error:
        'Domain lookup module does not support item creation. Use the domain checking tools instead.',
    },
    405
  );
}

/**
 * Update domain lookup item (for compatibility with template structure)
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with not supported message
 */
export async function updateItem(c) {
  return c.json(
    {
      error:
        'Domain lookup module does not support item updates. Use the domain checking tools instead.',
    },
    405
  );
}

/**
 * Delete domain lookup item (for compatibility with template structure)
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with not supported message
 */
export async function deleteItem(c) {
  return c.json(
    {
      error:
        'Domain lookup module does not support item deletion. Use the domain checking tools instead.',
    },
    405
  );
}

/**
 * Process domain lookup item (for compatibility with template structure)
 * @param {Object} c - Hono context
 * @returns {Promise<Response>} JSON response with not supported message
 */
export async function processItem(c) {
  return c.json(
    {
      error:
        'Domain lookup module does not support item processing. Use the domain checking tools instead.',
    },
    405
  );
}
