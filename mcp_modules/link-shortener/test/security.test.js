/**
 * Regression tests for GHSA-6cj5-68cm-v828.
 *
 * `validateUrl` detected private/loopback hosts but only `console.warn`ed, so
 * control fell through to `return true` and the URL reached a server-side HEAD
 * request. The detection must now throw, like the scheme check beside it.
 */

import { expect } from 'chai';

import { validateUrl } from '../src/utils.js';
import { LinkService } from '../src/service.js';

describe('link-shortener SSRF guard', () => {
  const privateUrls = [
    'http://localhost/',
    'http://localhost:3000/admin',
    'http://127.0.0.1/',
    'http://127.0.0.1:9200/_cat/indices',
    'http://10.0.0.1/',
    'http://192.168.1.1/',
    'http://172.16.0.1/',
    'http://172.31.255.255/',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1/',
    'http://[::1]:8080/',
    'http://[fe80::1]/',
    'http://[fc00::1]/',
    'http://0.0.0.0/',
    'http://db.internal/',
    'http://host.local/',
  ];

  for (const url of privateUrls) {
    it(`throws for ${url}`, () => {
      expect(() => validateUrl(url)).to.throw(/private or local address/);
    });
  }

  it('throws for IPv4-mapped IPv6 loopback', () => {
    expect(() => validateUrl('http://[::ffff:127.0.0.1]/')).to.throw(/private or local address/);
  });

  it('throws for embedded credentials', () => {
    expect(() => validateUrl('http://example.com@127.0.0.1/')).to.throw(/embedded credentials/);
  });

  it('still accepts ordinary public URLs', () => {
    expect(() => validateUrl('https://example.com/path?q=1')).to.not.throw();
    expect(() => validateUrl('https://8.8.8.8/')).to.not.throw();
    expect(() => validateUrl('http://example.com:8080/x')).to.not.throw();
  });

  it('validateUrlAccess reports a private target as invalid instead of probing it', async () => {
    const service = new LinkService();
    let fetched = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetched = true;
      return new Response(null, { status: 200 });
    };

    try {
      const result = await service.validateUrlAccess('http://127.0.0.1:9200/');
      expect(result.valid).to.equal(false);
      expect(result.accessible).to.equal(false);
      expect(fetched, 'no HEAD request should reach the internal host').to.equal(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
