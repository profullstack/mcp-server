/**
 * Regression tests for GHSA-7h99-c5qj-vhxp.
 *
 * The advisory PoC posts an internal URL to /craigslist/details, which drove a
 * headless-Chrome navigation at whatever the caller named. The host allowlist
 * must now reject it before any navigation happens.
 */

import { expect } from 'chai';

import { getPostingDetails } from '../lib/search.js';

describe('craigslist details SSRF guard', () => {
  const blocked = [
    'http://169.254.169.254/latest/meta-data/', // advisory PoC
    'http://127.0.0.1:8080/',
    'http://localhost/admin',
    'http://10.0.0.5/',
    'http://[::1]/',
    'https://evil.example.com/posting.html',
    'https://evilcraigslist.org/x.html', // suffix-confusion attempt
    'file:///etc/passwd',
  ];

  for (const url of blocked) {
    it(`refuses ${url}`, async () => {
      let threw = false;
      try {
        await getPostingDetails(url);
      } catch (error) {
        threw = true;
        expect(error.code, `${url} -> ${error.message}`).to.equal('UNSAFE_URL');
      }
      expect(threw, `${url} should be rejected`).to.equal(true);
    });
  }

  it('rejects a craigslist-looking URL with embedded credentials', async () => {
    let threw = false;
    try {
      await getPostingDetails('https://sfbay.craigslist.org@127.0.0.1/x.html');
    } catch (error) {
      threw = true;
      expect(error.code).to.equal('UNSAFE_URL');
    }
    expect(threw).to.equal(true);
  });

  it('does not reject a real craigslist host on allowlist grounds', async () => {
    // No DNS in this environment, so the fetch itself cannot succeed; the point
    // is that the rejection is never "host is not allowed".
    try {
      await getPostingDetails('https://sfbay.craigslist.org/d/bikes/7654321.html', false);
    } catch (error) {
      expect(error.message).to.not.match(/host is not allowed/);
    }
  });

  it('honours CRAIGSLIST_ALLOWED_HOSTS for operators running a mirror', async () => {
    const previous = process.env.CRAIGSLIST_ALLOWED_HOSTS;
    process.env.CRAIGSLIST_ALLOWED_HOSTS = 'mirror.example.net';
    try {
      await getPostingDetails('https://mirror.example.net/x.html', false);
    } catch (error) {
      expect(error.message).to.not.match(/host is not allowed/);
    } finally {
      if (previous === undefined) delete process.env.CRAIGSLIST_ALLOWED_HOSTS;
      else process.env.CRAIGSLIST_ALLOWED_HOSTS = previous;
    }
  });
});
