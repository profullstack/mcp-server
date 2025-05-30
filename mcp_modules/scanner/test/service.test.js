/**
 * Tests for the scanner module service
 */

import { describe, it, afterEach } from 'mocha';
import { expect, sinon } from './setup.js';
import * as utils from '../src/utils.js';

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
});
