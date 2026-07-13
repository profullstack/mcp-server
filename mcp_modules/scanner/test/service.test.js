/**
 * Tests for the scanner module service
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { existsSync, rmSync } from 'fs';
import { join, resolve, sep } from 'path';
import { expect, sinon } from './setup.js';
import * as utils from '../src/utils.js';
import { ScannerService } from '../src/service.js';

describe('ScannerService', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('validateTarget', () => {
    it('should validate a valid URL', () => {
      const result = utils.validateTarget('https://example.com');
      expect(result).to.be.true;
    });

    it('should reject an invalid URL', () => {
      const result = utils.validateTarget('invalid-url');
      expect(result).to.be.false;
    });
  });

  describe('isValidUrl', () => {
    it('should validate a valid HTTP URL', () => {
      const result = utils.isValidUrl('http://example.com');
      expect(result).to.be.true;
    });

    it('should validate a valid HTTPS URL', () => {
      const result = utils.isValidUrl('https://example.com');
      expect(result).to.be.true;
    });

    it('should reject a URL with invalid protocol', () => {
      const result = utils.isValidUrl('ftp://example.com');
      expect(result).to.be.false;
    });

    it('should reject an invalid URL', () => {
      const result = utils.isValidUrl('not-a-url');
      expect(result).to.be.false;
    });
  });

  describe('isValidIpAddress', () => {
    it('should validate a valid IPv4 address', () => {
      const result = utils.isValidIpAddress('192.168.1.1');
      expect(result).to.be.true;
    });

    it('should reject an invalid IPv4 address', () => {
      const result = utils.isValidIpAddress('192.168.1.256');
      expect(result).to.be.false;
    });

    it('should reject a non-IP string', () => {
      const result = utils.isValidIpAddress('not-an-ip');
      expect(result).to.be.false;
    });
  });

  describe('formatDate', () => {
    it('should format a valid timestamp', () => {
      const timestamp = '2023-05-17T12:34:56.789Z';
      const result = utils.formatDate(timestamp);
      expect(result).to.be.a('string');
      expect(result).to.not.equal(timestamp);
    });

    it('should handle an empty timestamp', () => {
      const result = utils.formatDate('');
      expect(result).to.equal('');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      const result = utils.formatDuration(45);
      expect(result).to.equal('45s');
    });

    it('should format minutes and seconds', () => {
      const result = utils.formatDuration(125);
      expect(result).to.equal('2m 5s');
    });

    it('should format hours, minutes, and seconds', () => {
      const result = utils.formatDuration(3725);
      expect(result).to.equal('1h 2m 5s');
    });

    it('should handle zero duration', () => {
      const result = utils.formatDuration(0);
      expect(result).to.equal('0s');
    });
  });

  // Regression tests for GHSA-ppp9-2hc2-hfg5:
  // unauthenticated arbitrary file write via unvalidated `destination` in exportReport.
  describe('exportReport destination confinement', () => {
    const scanId = 'scan-security-test';
    let service;

    const stubScan = svc => {
      sinon.stub(svc, 'getScanById').returns({ id: scanId, status: 'completed' });
      sinon.stub(svc, 'generateReport').resolves('<html>report</html>');
    };

    beforeEach(() => {
      service = new ScannerService();
      stubScan(service);
    });

    const maliciousPaths = [
      '/tmp/pwned.html',
      '/etc/cron.d/x',
      '../../../../tmp/pwned.json',
      '../../.bashrc',
    ];

    maliciousPaths.forEach(destination => {
      it(`rejects out-of-bounds destination: ${destination}`, async () => {
        let threw = false;
        try {
          await service.exportReport(scanId, { format: 'html', destination });
        } catch (err) {
          threw = true;
          expect(err.message).to.match(/reports directory|Invalid destination/i);
        }
        expect(threw, 'exportReport should reject the malicious destination').to.be.true;
      });
    });

    it('allows a plain filename inside the reports directory', async () => {
      const reportsDir = resolve(join(service.dataDir, 'reports'));
      const result = await service.exportReport(scanId, {
        format: 'html',
        destination: 'safe-report.html',
      });
      const written = resolve(result.destination);
      expect(written === reportsDir || written.startsWith(reportsDir + sep)).to.be.true;
      expect(existsSync(written)).to.be.true;
      rmSync(written, { force: true });
    });
  });
});
