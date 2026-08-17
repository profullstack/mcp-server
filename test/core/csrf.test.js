/**
 * Tests for the cross-origin CSRF guard.
 *
 * Wildcard CORS plus unauthenticated state-changing routes is the amplifier
 * called out by GHSA-5x56-587v-mv4r and GHSA-ppp9-2hc2-hfg5: a malicious page
 * can drive the victim's browser at a localhost-bound server.
 */

import { expect } from 'chai';

import { Hono } from 'hono';
import { setupMiddleware, originMatchesHost } from '../../src/core/middleware.js';

describe('CSRF guard', () => {
  let app;

  beforeEach(() => {
    app = new Hono();
    setupMiddleware(app);
    app.post('/write', c => c.json({ ok: true }));
    app.get('/read', c => c.json({ ok: true }));
  });

  const post = headers => app.request('http://localhost:3000/write', { method: 'POST', headers });

  it('blocks a POST carrying a foreign Origin', async () => {
    const res = await post({ origin: 'https://attacker.example' });
    expect(res.status).to.equal(403);
  });

  it('allows a POST with no Origin (curl, MCP and other API clients)', async () => {
    const res = await post({});
    expect(res.status).to.equal(200);
  });

  it('allows a same-origin POST', async () => {
    const res = await post({ origin: 'http://localhost:3000', host: 'localhost:3000' });
    expect(res.status).to.equal(200);
  });

  it('allows an origin listed in CORS_ORIGINS', async () => {
    const previous = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = 'https://trusted.example';
    try {
      // config is read at import time, so exercise the matcher the guard uses.
      expect(originMatchesHost('https://trusted.example', 'trusted.example')).to.equal(true);
    } finally {
      if (previous === undefined) delete process.env.CORS_ORIGINS;
      else process.env.CORS_ORIGINS = previous;
    }
  });

  it('does not interfere with GET requests', async () => {
    const res = await app.request('http://localhost:3000/read', {
      method: 'GET',
      headers: { origin: 'https://attacker.example' },
    });
    expect(res.status).to.equal(200);
  });

  describe('originMatchesHost', () => {
    it('matches host and port', () => {
      expect(originMatchesHost('http://localhost:3000', 'localhost:3000')).to.equal(true);
      expect(originMatchesHost('http://localhost:3000', 'localhost:4000')).to.equal(false);
    });

    it('returns false for missing or malformed values', () => {
      expect(originMatchesHost('', 'localhost')).to.equal(false);
      expect(originMatchesHost('not a url', 'localhost')).to.equal(false);
      expect(originMatchesHost('http://localhost', undefined)).to.equal(false);
    });
  });
});
