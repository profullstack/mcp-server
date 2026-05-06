import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const TLDX_BINARY = 'tldx';

// Allowlists used to defend the tldx invocation against OS command injection
// (CWE-78). Inputs that fail these checks are rejected before reaching the
// child process; arguments are passed as an array to execFile so /bin/sh is
// never involved and shell metacharacters cannot be interpreted.
const KEYWORD_PATTERN = /^[a-zA-Z0-9-]{1,63}$/;
const DOMAIN_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const TLD_PATTERN = /^[a-zA-Z]{2,63}$/;
const PRESET_PATTERN = /^[a-zA-Z0-9_-]{1,32}$/;
const ALLOWED_FORMATS = new Set(['text', 'json', 'json-stream', 'json-array', 'csv']);

function assertSafeList(values, pattern, fieldName) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`Invalid ${fieldName}: expected a non-empty array`);
  }
  for (const value of values) {
    if (typeof value !== 'string' || !pattern.test(value)) {
      throw new Error(`Invalid ${fieldName} value: ${JSON.stringify(value)}`);
    }
  }
}

function assertSafeScalar(value, pattern, fieldName) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(`Invalid ${fieldName} value: ${JSON.stringify(value)}`);
  }
}

/**
 * Domain Lookup Service
 * Provides domain availability checking and brainstorming functionality using tldx CLI
 */
export const domainLookupService = {
  /**
   * Check domain availability for given domains
   * @param {string[]} domains - Array of domain names to check
   * @param {Object} options - Options for domain checking
   * @returns {Promise<Object>} Result object with domain availability data
   */
  async checkDomainAvailability(domains, options = {}) {
    try {
      const args = this.buildTldxArgs(domains, options);
      const { stdout, stderr } = await execFileAsync(TLDX_BINARY, args);

      if (stderr && !stdout) {
        throw new Error(`tldx command failed: ${stderr}`);
      }

      const parsedDomains = this.parseOutput(stdout, options.format || 'text');

      return {
        success: true,
        domains: parsedDomains,
        format: options.format || 'text',
        timestamp: new Date().toISOString(),
        command: [TLDX_BINARY, ...args].join(' '),
      };
    } catch (error) {
      throw new Error(`tldx command failed: ${error.message}`);
    }
  },

  /**
   * Generate domain suggestions with prefixes, suffixes, and TLDs
   * @param {string} keyword - Base keyword for domain generation
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Result object with generated domain suggestions
   */
  async generateDomainSuggestions(keyword, options = {}) {
    try {
      const args = this.buildTldxArgs([keyword], options);
      const { stdout, stderr } = await execFileAsync(TLDX_BINARY, args);

      if (stderr && !stdout) {
        throw new Error(`tldx command failed: ${stderr}`);
      }

      const parsedDomains = this.parseOutput(stdout, options.format || 'text');

      // Filter by max domain length if specified
      let filteredDomains = parsedDomains;
      if (options.maxDomainLength) {
        filteredDomains = parsedDomains.filter(d => d.domain.length <= options.maxDomainLength);
      }

      // Filter only available if specified
      if (options.onlyAvailable) {
        filteredDomains = filteredDomains.filter(d => d.available);
      }

      return {
        success: true,
        keyword,
        domains: filteredDomains,
        format: options.format || 'text',
        timestamp: new Date().toISOString(),
        options,
      };
    } catch (error) {
      throw new Error(`Domain suggestion generation failed: ${error.message}`);
    }
  },

  /**
   * Get available TLD presets
   * @returns {Promise<Object>} Result object with TLD presets
   */
  async getTldPresets() {
    try {
      const { stdout, stderr } = await execFileAsync(TLDX_BINARY, ['show-tld-presets']);

      if (stderr && !stdout) {
        throw new Error(`Failed to get TLD presets: ${stderr}`);
      }

      const presets = this.parseTldPresets(stdout);

      return {
        success: true,
        presets,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get TLD presets: ${error.message}`);
    }
  },

  /**
   * Bulk domain check with various options
   * @param {string[]} keywords - Array of keywords to check
   * @param {Object} options - Bulk check options
   * @returns {Promise<Object>} Result object with bulk check results
   */
  async bulkDomainCheck(keywords, options = {}) {
    try {
      const args = this.buildTldxArgs(keywords, options);
      const { stdout, stderr } = await execFileAsync(TLDX_BINARY, args);

      if (stderr && !stdout) {
        throw new Error(`Bulk domain check failed: ${stderr}`);
      }

      const parsedDomains = this.parseOutput(stdout, options.format || 'text');

      return {
        success: true,
        keywords,
        domains: parsedDomains,
        format: options.format || 'text',
        timestamp: new Date().toISOString(),
        options,
      };
    } catch (error) {
      throw new Error(`Bulk domain check failed: ${error.message}`);
    }
  },

  /**
   * Build tldx argument array with options.
   *
   * Returns a string[] suitable for execFile('tldx', args). Every
   * user-controlled value is validated against an allowlist before being
   * added so that shell metacharacters (or anything outside RFC 1035-style
   * hostname syntax) cannot reach the binary. The intent is defense-in-depth
   * — execFile already avoids /bin/sh, but rejecting bad input early gives a
   * clear error and prevents passing nonsense flags to tldx.
   *
   * @param {string[]} keywords - Keywords or domains to pass to tldx
   * @param {Object} options - Command options
   * @returns {string[]} tldx argument array (excluding the binary name)
   */
  buildTldxArgs(keywords, options = {}) {
    // Keywords/domains may contain dots (e.g. "example.com"), so accept the
    // domain pattern when a value contains a dot and the keyword pattern
    // otherwise. Both reject shell metacharacters.
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new Error('Invalid keywords: expected a non-empty array');
    }
    for (const value of keywords) {
      if (typeof value !== 'string') {
        throw new Error(`Invalid keyword value: ${JSON.stringify(value)}`);
      }
      const pattern = value.includes('.') ? DOMAIN_PATTERN : KEYWORD_PATTERN;
      if (!pattern.test(value)) {
        throw new Error(`Invalid keyword value: ${JSON.stringify(value)}`);
      }
    }

    const args = [...keywords];

    if (options.prefixes?.length) {
      assertSafeList(options.prefixes, KEYWORD_PATTERN, 'prefixes');
      args.push('--prefixes', options.prefixes.join(','));
    }

    if (options.suffixes?.length) {
      assertSafeList(options.suffixes, KEYWORD_PATTERN, 'suffixes');
      args.push('--suffixes', options.suffixes.join(','));
    }

    if (options.tlds?.length) {
      assertSafeList(options.tlds, TLD_PATTERN, 'tlds');
      args.push('--tlds', options.tlds.join(','));
    }

    if (options.format) {
      if (!ALLOWED_FORMATS.has(options.format)) {
        throw new Error(`Invalid format value: ${JSON.stringify(options.format)}`);
      }
      args.push('--format', options.format);
    }

    if (options.onlyAvailable) {
      args.push('--only-available');
    }

    if (options.maxDomainLength !== undefined && options.maxDomainLength !== null) {
      const len = Number(options.maxDomainLength);
      if (!Number.isInteger(len) || len < 1 || len > 253) {
        throw new Error(`Invalid maxDomainLength value: ${JSON.stringify(options.maxDomainLength)}`);
      }
      args.push('--max-domain-length', String(len));
    }

    if (options.tldPreset) {
      assertSafeScalar(options.tldPreset, PRESET_PATTERN, 'tldPreset');
      args.push('--tld-preset', options.tldPreset);
    }

    if (options.showStats) {
      args.push('--show-stats');
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    if (options.noColor) {
      args.push('--no-color');
    }

    return args;
  },

  /**
   * Parse tldx output based on format
   * @param {string} output - Raw tldx output
   * @param {string} format - Output format (text, json, csv, etc.)
   * @returns {Array} Parsed domain objects
   */
  parseOutput(output, format = 'text') {
    switch (format) {
      case 'json':
      case 'json-array':
        return this.parseJsonOutput(output);
      case 'json-stream':
        return this.parseJsonStreamOutput(output);
      case 'csv':
        return this.parseCsvOutput(output);
      case 'text':
      default:
        return this.parseTextOutput(output);
    }
  },

  /**
   * Parse text format output
   * @param {string} output - Text output from tldx
   * @returns {Array} Parsed domain objects
   */
  parseTextOutput(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const domains = [];

    for (const line of lines) {
      if (line.includes('✔️') && line.includes('is available')) {
        const domain = line.match(/✔️\s+(.+?)\s+is available/)?.[1];
        if (domain) {
          domains.push({
            domain: domain.trim(),
            available: true,
            status: 'available',
          });
        }
      } else if (line.includes('❌') && line.includes('is not available')) {
        const domain = line.match(/❌\s+(.+?)\s+is not available/)?.[1];
        if (domain) {
          domains.push({
            domain: domain.trim(),
            available: false,
            status: 'not available',
          });
        }
      }
    }

    return domains;
  },

  /**
   * Parse JSON format output
   * @param {string} output - JSON output from tldx
   * @returns {Array} Parsed domain objects
   */
  parseJsonOutput(output) {
    try {
      const data = JSON.parse(output);
      return Array.isArray(data)
        ? data.map(item => ({
            domain: item.domain,
            available: item.available,
            status: item.available ? 'available' : 'not available',
            error: item.error || null,
          }))
        : [];
    } catch (error) {
      throw new Error(`Failed to parse JSON output: ${error.message}`);
    }
  },

  /**
   * Parse JSON stream format output
   * @param {string} output - JSON stream output from tldx
   * @returns {Array} Parsed domain objects
   */
  parseJsonStreamOutput(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const domains = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        domains.push({
          domain: data.domain,
          available: data.available,
          status: data.available ? 'available' : 'not available',
          error: data.error || null,
        });
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }

    return domains;
  },

  /**
   * Parse CSV format output
   * @param {string} output - CSV output from tldx
   * @returns {Array} Parsed domain objects
   */
  parseCsvOutput(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const domains = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const [domain, available, error] = lines[i].split(',');
      if (domain) {
        domains.push({
          domain: domain.trim(),
          available: available?.trim() === 'true',
          status: available?.trim() === 'true' ? 'available' : 'not available',
          error: error?.trim() || null,
        });
      }
    }

    return domains;
  },

  /**
   * Parse TLD presets output
   * @param {string} output - TLD presets output from tldx
   * @returns {Object} Parsed presets object
   */
  parseTldPresets(output) {
    const presets = {};
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/^-\s+(\w+):\s+(.+)$/);
      if (match) {
        const [, name, tlds] = match;
        presets[name] = tlds.split(',').map(tld => tld.trim());
      }
    }

    return presets;
  },
};
