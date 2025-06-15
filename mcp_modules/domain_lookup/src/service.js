import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
      const command = this.buildTldxCommand(domains, options);
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stdout) {
        throw new Error(`tldx command failed: ${stderr}`);
      }

      const parsedDomains = this.parseOutput(stdout, options.format || 'text');

      return {
        success: true,
        domains: parsedDomains,
        format: options.format || 'text',
        timestamp: new Date().toISOString(),
        command,
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
      const command = this.buildTldxCommand([keyword], options);
      const { stdout, stderr } = await execAsync(command);

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
      const command = 'tldx show-tld-presets';
      const { stdout, stderr } = await execAsync(command);

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
      const command = this.buildTldxCommand(keywords, options);
      const { stdout, stderr } = await execAsync(command);

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
   * Build tldx command with options
   * @param {string[]} keywords - Keywords to check
   * @param {Object} options - Command options
   * @returns {string} Complete tldx command
   */
  buildTldxCommand(keywords, options = {}) {
    let command = `tldx ${keywords.join(' ')}`;

    if (options.prefixes?.length) {
      command += ` --prefixes ${options.prefixes.join(',')}`;
    }

    if (options.suffixes?.length) {
      command += ` --suffixes ${options.suffixes.join(',')}`;
    }

    if (options.tlds?.length) {
      command += ` --tlds ${options.tlds.join(',')}`;
    }

    if (options.format) {
      command += ` --format ${options.format}`;
    }

    if (options.onlyAvailable) {
      command += ' --only-available';
    }

    if (options.maxDomainLength) {
      command += ` --max-domain-length ${options.maxDomainLength}`;
    }

    if (options.tldPreset) {
      command += ` --tld-preset ${options.tldPreset}`;
    }

    if (options.showStats) {
      command += ' --show-stats';
    }

    if (options.verbose) {
      command += ' --verbose';
    }

    if (options.noColor) {
      command += ' --no-color';
    }

    return command;
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
