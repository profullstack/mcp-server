/**
 * Domain Lookup Utilities
 * Helper functions for domain validation, formatting, and CLI interaction
 */

/**
 * Validate domain name format
 * @param {string} domain - Domain name to validate
 * @returns {boolean} True if domain is valid format
 */
export function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Basic domain validation regex
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Check length (max 253 characters for full domain)
  if (domain.length > 253) {
    return false;
  }

  // Check each label (part between dots) is max 63 characters
  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length > 63 || label.length === 0) {
      return false;
    }
  }

  return domainRegex.test(domain);
}

/**
 * Validate keyword for domain generation
 * @param {string} keyword - Keyword to validate
 * @returns {boolean} True if keyword is valid
 */
export function isValidKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    return false;
  }

  // Keywords should be alphanumeric and reasonable length
  const keywordRegex = /^[a-zA-Z0-9-]{1,50}$/;
  return keywordRegex.test(keyword);
}

/**
 * Validate TLD format
 * @param {string} tld - TLD to validate
 * @returns {boolean} True if TLD is valid format
 */
export function isValidTld(tld) {
  if (!tld || typeof tld !== 'string') {
    return false;
  }

  // TLD should be 2-63 characters, letters only
  const tldRegex = /^[a-zA-Z]{2,63}$/;
  return tldRegex.test(tld);
}

/**
 * Sanitize command line arguments to prevent injection
 * @param {string} arg - Argument to sanitize
 * @returns {string} Sanitized argument
 */
export function sanitizeCliArg(arg) {
  if (!arg || typeof arg !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters
  return arg.replace(/[;&|`$(){}[\]\\]/g, '').trim();
}

/**
 * Format domain availability status for display
 * @param {boolean} available - Whether domain is available
 * @returns {string} Formatted status string
 */
export function formatAvailabilityStatus(available) {
  return available ? '✔️ Available' : '❌ Not Available';
}

/**
 * Parse domain from various input formats
 * @param {string} input - Input string that might contain a domain
 * @returns {string|null} Extracted domain or null if not found
 */
export function extractDomain(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove protocol if present
  let domain = input.replace(/^https?:\/\//, '');

  // Remove path if present
  [domain] = domain.split('/');

  // Remove port if present
  [domain] = domain.split(':');

  // Validate the extracted domain
  return isValidDomain(domain) ? domain : null;
}

/**
 * Generate domain combinations from keywords and options
 * @param {string[]} keywords - Base keywords
 * @param {Object} options - Generation options
 * @returns {string[]} Array of domain combinations
 */
export function generateDomainCombinations(keywords, options = {}) {
  const combinations = [];
  const prefixes = options.prefixes || [''];
  const suffixes = options.suffixes || [''];
  const tlds = options.tlds || ['com'];

  for (const keyword of keywords) {
    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        for (const tld of tlds) {
          const domain = `${prefix}${keyword}${suffix}.${tld}`;
          if (isValidDomain(domain)) {
            combinations.push(domain);
          }
        }
      }
    }
  }

  return combinations;
}

/**
 * Filter domains by length
 * @param {string[]} domains - Array of domains to filter
 * @param {number} maxLength - Maximum domain length
 * @returns {string[]} Filtered domains
 */
export function filterDomainsByLength(domains, maxLength) {
  if (!maxLength || maxLength <= 0) {
    return domains;
  }

  return domains.filter(domain => domain.length <= maxLength);
}

/**
 * Sort domains by availability and length
 * @param {Object[]} domains - Array of domain objects with availability info
 * @returns {Object[]} Sorted domains
 */
export function sortDomains(domains) {
  return domains.sort((a, b) => {
    // Available domains first
    if (a.available !== b.available) {
      return b.available - a.available;
    }

    // Then by length (shorter first)
    return a.domain.length - b.domain.length;
  });
}

/**
 * Group domains by TLD
 * @param {Object[]} domains - Array of domain objects
 * @returns {Object} Domains grouped by TLD
 */
export function groupDomainsByTld(domains) {
  const grouped = {};

  for (const domain of domains) {
    const tld = domain.domain.split('.').pop();
    if (!grouped[tld]) {
      grouped[tld] = [];
    }
    grouped[tld].push(domain);
  }

  return grouped;
}

/**
 * Calculate domain statistics
 * @param {Object[]} domains - Array of domain objects
 * @returns {Object} Statistics object
 */
export function calculateDomainStats(domains) {
  const total = domains.length;
  const available = domains.filter(d => d.available).length;
  const unavailable = total - available;
  const availabilityRate = total > 0 ? ((available / total) * 100).toFixed(2) : 0;

  const tldStats = {};
  for (const domain of domains) {
    const tld = domain.domain.split('.').pop();
    if (!tldStats[tld]) {
      tldStats[tld] = { total: 0, available: 0 };
    }
    tldStats[tld].total++;
    if (domain.available) {
      tldStats[tld].available++;
    }
  }

  return {
    total,
    available,
    unavailable,
    availabilityRate: `${availabilityRate}%`,
    tldBreakdown: tldStats,
  };
}

/**
 * Format CLI output for better readability
 * @param {string} output - Raw CLI output
 * @returns {string} Formatted output
 */
export function formatCliOutput(output) {
  if (!output) {
    return '';
  }

  return output
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Check if tldx CLI is available
 * @returns {Promise<boolean>} True if tldx is available
 */
export async function checkTldxAvailability() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('tldx version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get tldx version information
 * @returns {Promise<string>} Version string or error message
 */
export async function getTldxVersion() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync('tldx version');
    return stdout.trim();
  } catch {
    return 'tldx not available';
  }
}
