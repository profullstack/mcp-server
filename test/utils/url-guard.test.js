/**
 * Tests for the shared SSRF guard.
 *
 * Covers the address classifier directly (no DNS needed) and the URL-level
 * checks that back GHSA-qgcm-wf9m-hqwc, GHSA-7h99-c5qj-vhxp and
 * GHSA-6cj5-68cm-v828.
 */

import { expect } from 'chai';

import {
  assertSafeUrl,
  hostIsAllowed,
  isBlockedAddress,
  UnsafeUrlError,
} from '../../src/utils/url-guard.js';

describe('url-guard', () => {
  describe('isBlockedAddress', () => {
    it('blocks IPv4 loopback, RFC1918 and link-local ranges', () => {
      const blocked = [
        '0.0.0.0',
        '127.0.0.1',
        '127.255.255.254',
        '10.0.0.1',
        '172.16.0.1',
        '172.31.255.255',
        '192.168.1.1',
        '169.254.169.254', // cloud metadata
        '100.64.0.1', // CGNAT
        '192.0.0.1',
        '192.0.2.5',
        '198.18.0.1',
        '198.51.100.7',
        '203.0.113.7',
        '224.0.0.1',
        '255.255.255.255',
      ];
      for (const ip of blocked) {
        expect(isBlockedAddress(ip), ip).to.equal(true);
      }
    });

    it('allows public IPv4 addresses', () => {
      const allowed = ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '172.15.255.255'];
      for (const ip of allowed) {
        expect(isBlockedAddress(ip), ip).to.equal(false);
      }
    });

    it('blocks IPv6 loopback, unique-local, link-local and multicast', () => {
      const blocked = ['::', '::1', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1', '2001:db8::1'];
      for (const ip of blocked) {
        expect(isBlockedAddress(ip), ip).to.equal(true);
      }
    });

    it('unwraps IPv4-mapped and NAT64 IPv6 forms before deciding', () => {
      expect(isBlockedAddress('::ffff:127.0.0.1')).to.equal(true);
      expect(isBlockedAddress('::ffff:192.168.1.1')).to.equal(true);
      expect(isBlockedAddress('::ffff:169.254.169.254')).to.equal(true);
      expect(isBlockedAddress('64:ff9b::127.0.0.1')).to.equal(true);
      expect(isBlockedAddress('::ffff:8.8.8.8')).to.equal(false);
    });

    it('allows public IPv6 addresses', () => {
      expect(isBlockedAddress('2606:4700:4700::1111')).to.equal(false);
      expect(isBlockedAddress('2001:4860:4860::8888')).to.equal(false);
    });

    it('fails closed on unparseable input', () => {
      expect(isBlockedAddress('not-an-ip')).to.equal(true);
      expect(isBlockedAddress('')).to.equal(true);
    });
  });

  describe('hostIsAllowed', () => {
    it('matches exact entries', () => {
      expect(hostIsAllowed('convert2doc.com', ['convert2doc.com'])).to.equal(true);
      expect(hostIsAllowed('evil.com', ['convert2doc.com'])).to.equal(false);
    });

    it('matches the host itself and subdomains for dot-prefixed entries', () => {
      expect(hostIsAllowed('craigslist.org', ['.craigslist.org'])).to.equal(true);
      expect(hostIsAllowed('sfbay.craigslist.org', ['.craigslist.org'])).to.equal(true);
      expect(hostIsAllowed('evilcraigslist.org', ['.craigslist.org'])).to.equal(false);
    });
  });

  describe('assertSafeUrl', () => {
    it('rejects non-http(s) schemes', async () => {
      for (const url of ['file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com']) {
        try {
          await assertSafeUrl(url);
          throw new Error(`expected rejection for ${url}`);
        } catch (error) {
          expect(error).to.be.instanceOf(UnsafeUrlError);
        }
      }
    });

    it('rejects loopback and link-local literals without touching DNS', async () => {
      for (const url of [
        'http://127.0.0.1:9200/',
        'http://169.254.169.254/latest/meta-data/',
        'http://[::1]:8080/',
        'http://10.0.0.5/',
      ]) {
        try {
          await assertSafeUrl(url);
          throw new Error(`expected rejection for ${url}`);
        } catch (error) {
          expect(error, url).to.be.instanceOf(UnsafeUrlError);
        }
      }
    });

    it('rejects localhost-style names before resolving them', async () => {
      for (const url of [
        'http://localhost:3000/',
        'http://foo.localhost/',
        'http://db.internal/',
        'http://metadata.google.internal/',
      ]) {
        try {
          await assertSafeUrl(url);
          throw new Error(`expected rejection for ${url}`);
        } catch (error) {
          expect(error, url).to.be.instanceOf(UnsafeUrlError);
        }
      }
    });

    it('rejects embedded credentials', async () => {
      try {
        await assertSafeUrl('https://allowed.example.com@127.0.0.1/', { resolveDns: false });
        throw new Error('expected rejection');
      } catch (error) {
        expect(error).to.be.instanceOf(UnsafeUrlError);
      }
    });

    it('enforces the host allowlist', async () => {
      try {
        await assertSafeUrl('https://evil.example.com/', {
          allowedHosts: ['.craigslist.org'],
          resolveDns: false,
        });
        throw new Error('expected rejection');
      } catch (error) {
        expect(error).to.be.instanceOf(UnsafeUrlError);
        expect(error.message).to.contain('not allowed');
      }
    });

    it('accepts an allowlisted public host', async () => {
      const result = await assertSafeUrl('https://sfbay.craigslist.org/d/x/123.html', {
        allowedHosts: ['.craigslist.org'],
        resolveDns: false,
      });
      expect(result.hostname).to.equal('sfbay.craigslist.org');
    });

    it('accepts a public IP literal', async () => {
      const result = await assertSafeUrl('https://8.8.8.8/');
      expect(result.addresses).to.deep.equal(['8.8.8.8']);
    });

    it('rejects empty, non-string and over-long input', async () => {
      for (const value of ['', null, undefined, 42, `https://example.com/${'a'.repeat(4000)}`]) {
        try {
          await assertSafeUrl(value);
          throw new Error(`expected rejection for ${String(value).slice(0, 20)}`);
        } catch (error) {
          expect(error).to.be.instanceOf(UnsafeUrlError);
        }
      }
    });
  });
});
