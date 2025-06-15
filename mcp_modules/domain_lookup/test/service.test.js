import { expect } from 'chai';
import { domainLookupService } from '../src/service.js';

describe('Domain Lookup Service', () => {
  describe('buildTldxCommand', () => {
    it('should build basic command', () => {
      const cmd = domainLookupService.buildTldxCommand(['example']);
      expect(cmd).to.equal('tldx example');
    });

    it('should build command with multiple keywords', () => {
      const cmd = domainLookupService.buildTldxCommand(['example', 'test']);
      expect(cmd).to.equal('tldx example test');
    });

    it('should build command with prefixes', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        prefixes: ['get', 'my'],
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--prefixes get,my');
    });

    it('should build command with suffixes', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        suffixes: ['ly', 'hub'],
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--suffixes ly,hub');
    });

    it('should build command with TLDs', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        tlds: ['com', 'io', 'ai'],
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--tlds com,io,ai');
    });

    it('should build command with format option', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        format: 'json',
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--format json');
    });

    it('should build command with onlyAvailable flag', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        onlyAvailable: true,
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--only-available');
    });

    it('should build command with maxDomainLength', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        maxDomainLength: 20,
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--max-domain-length 20');
    });

    it('should build command with tldPreset', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        tldPreset: 'popular',
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--tld-preset popular');
    });

    it('should build command with showStats flag', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        showStats: true,
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--show-stats');
    });

    it('should build command with verbose flag', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        verbose: true,
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--verbose');
    });

    it('should build command with noColor flag', () => {
      const cmd = domainLookupService.buildTldxCommand(['example'], {
        noColor: true,
      });
      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--no-color');
    });

    it('should build command with all options', () => {
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

      const cmd = domainLookupService.buildTldxCommand(['example'], options);

      expect(cmd).to.include('tldx example');
      expect(cmd).to.include('--prefixes get,my');
      expect(cmd).to.include('--suffixes ly,hub');
      expect(cmd).to.include('--tlds com,io');
      expect(cmd).to.include('--format json');
      expect(cmd).to.include('--only-available');
      expect(cmd).to.include('--max-domain-length 20');
      expect(cmd).to.include('--tld-preset popular');
      expect(cmd).to.include('--show-stats');
      expect(cmd).to.include('--verbose');
      expect(cmd).to.include('--no-color');
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
