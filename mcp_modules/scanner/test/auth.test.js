/**
 * Tests for scanner authentication middleware (GHSA-ppp9-2hc2-hfg5 hardening).
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect, sinon } from './setup.js';
import { requireScannerAuth } from '../src/auth.js';

/**
 * Build a fake Hono context with the given request headers.
 */
const makeContext = (headers = {}) => {
  const lower = {};
  for (const [k, v] of Object.entries(headers)) {
    lower[k.toLowerCase()] = v;
  }
  return {
    req: {
      header: name => lower[String(name).toLowerCase()],
    },
    json: sinon.stub().callsFake((body, status) => ({ body, status: status || 200 })),
  };
};

describe('requireScannerAuth', () => {
  const originalToken = process.env.SCANNER_API_TOKEN;

  afterEach(() => {
    sinon.restore();
    if (originalToken === undefined) {
      delete process.env.SCANNER_API_TOKEN;
    } else {
      process.env.SCANNER_API_TOKEN = originalToken;
    }
  });

  describe('when SCANNER_API_TOKEN is not configured', () => {
    beforeEach(() => {
      delete process.env.SCANNER_API_TOKEN;
    });

    it('allows the request through (backward compatible)', async () => {
      const c = makeContext();
      const next = sinon.stub().resolves();
      await requireScannerAuth(c, next);
      expect(next.calledOnce).to.be.true;
      expect(c.json.called).to.be.false;
    });
  });

  describe('when SCANNER_API_TOKEN is configured', () => {
    const TOKEN = 'super-secret-token';

    beforeEach(() => {
      process.env.SCANNER_API_TOKEN = TOKEN;
    });

    it('rejects a request with no credential (401)', async () => {
      const c = makeContext();
      const next = sinon.stub().resolves();
      await requireScannerAuth(c, next);
      expect(next.called).to.be.false;
      expect(c.json.calledWith(sinon.match.any, 401)).to.be.true;
    });

    it('rejects a wrong bearer token (401)', async () => {
      const c = makeContext({ Authorization: 'Bearer wrong-token' });
      const next = sinon.stub().resolves();
      await requireScannerAuth(c, next);
      expect(next.called).to.be.false;
      expect(c.json.calledWith(sinon.match.any, 401)).to.be.true;
    });

    it('allows a correct bearer token', async () => {
      const c = makeContext({ Authorization: `Bearer ${TOKEN}` });
      const next = sinon.stub().resolves();
      await requireScannerAuth(c, next);
      expect(next.calledOnce).to.be.true;
      expect(c.json.called).to.be.false;
    });

    it('allows a correct X-API-Key', async () => {
      const c = makeContext({ 'X-API-Key': TOKEN });
      const next = sinon.stub().resolves();
      await requireScannerAuth(c, next);
      expect(next.calledOnce).to.be.true;
      expect(c.json.called).to.be.false;
    });

    it('rejects a wrong X-API-Key (401)', async () => {
      const c = makeContext({ 'X-API-Key': 'nope' });
      const next = sinon.stub().resolves();
      await requireScannerAuth(c, next);
      expect(next.called).to.be.false;
      expect(c.json.calledWith(sinon.match.any, 401)).to.be.true;
    });
  });
});
