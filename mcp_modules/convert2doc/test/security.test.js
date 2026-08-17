/**
 * Regression tests for GHSA-qgcm-wf9m-hqwc.
 *
 * The advisory PoC points `baseUrl` at an internal host and reads the reflected
 * response body. The conversion must now be refused before any request is made.
 */

import { expect } from 'chai';

import { Hono } from 'hono';
import { register } from '../index.js';

const PAYLOAD = {
  apiKey: 'x',
  fileBase64: 'aGVsbG8=',
  filename: 'doc.pdf',
  fromFormat: 'pdf',
  toFormat: 'markdown',
};

describe('convert2doc security', () => {
  let app;
  let fetchCalls;
  let originalFetch;

  beforeEach(async () => {
    app = new Hono();
    await register(app);

    // Any outbound request at all is a failure for the blocked cases.
    fetchCalls = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args[0]);
      throw new Error('network disabled in tests');
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const post = (path, body) =>
    app.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const internalBaseUrls = [
    'http://127.0.0.1:9200',
    'http://localhost:9200',
    'http://169.254.169.254',
    'http://10.0.0.5',
    'http://[::1]:9200',
    'https://evil.example.com',
    'file:///etc/passwd',
  ];

  for (const baseUrl of internalBaseUrls) {
    it(`refuses baseUrl ${baseUrl} on /convert2doc/convert`, async () => {
      const res = await post('/convert2doc/convert', { ...PAYLOAD, baseUrl });

      expect(res.status).to.equal(400);
      const body = await res.json();
      expect(body.error).to.match(/baseUrl/);
      expect(fetchCalls, 'no outbound request should be made').to.have.length(0);
    });

    it(`refuses baseUrl ${baseUrl} on /tools/convert2doc`, async () => {
      const res = await post('/tools/convert2doc', { ...PAYLOAD, baseUrl });

      expect(res.status).to.equal(400);
      expect(fetchCalls, 'no outbound request should be made').to.have.length(0);
    });
  }

  it('rejects a baseUrl that embeds credentials for an allowed host', async () => {
    const res = await post('/convert2doc/convert', {
      ...PAYLOAD,
      baseUrl: 'https://convert2doc.com@127.0.0.1/',
    });

    expect(res.status).to.equal(400);
    expect(fetchCalls).to.have.length(0);
  });

  it('does not reject the default convert2doc.com host on allowlist grounds', async () => {
    // This environment has no DNS, so the request cannot complete; the point is
    // that the legitimate host is never turned away by the allowlist itself.
    const res = await post('/convert2doc/convert', PAYLOAD);
    const body = await res.json();

    expect(body.error).to.not.match(/host is not allowed/);
  });

  it('allows an operator-configured host through to the network', async () => {
    // A public IP literal keeps the assertion deterministic without DNS.
    const previous = process.env.CONVERT2DOC_ALLOWED_HOSTS;
    process.env.CONVERT2DOC_ALLOWED_HOSTS = '8.8.8.8';
    try {
      await post('/convert2doc/convert', { ...PAYLOAD, baseUrl: 'https://8.8.8.8' });

      // The fetch stub throws, so the conversion fails — but the request was
      // attempted, which proves the guard passed the allowed host through.
      expect(fetchCalls).to.have.length(1);
      expect(String(fetchCalls[0])).to.equal('https://8.8.8.8/api/1/pdf-to-markdown');
    } finally {
      if (previous === undefined) delete process.env.CONVERT2DOC_ALLOWED_HOSTS;
      else process.env.CONVERT2DOC_ALLOWED_HOSTS = previous;
    }
  });
});
