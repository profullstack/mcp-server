/**
 * The startup config dump runs in development, which is the default NODE_ENV,
 * so it must not print credentials to stdout (CWE-532).
 */

import { expect } from 'chai';

import { _internal } from '../../src/core/config.js';

const { redactSecrets } = _internal;

describe('config secret redaction', () => {
  it('redacts credential-shaped string values', () => {
    const redacted = redactSecrets({
      openai: { apiKey: 'sk-proj-real-secret' },
      auth: { token: 'abc', password: 'hunter2', clientSecret: 'shh' },
    });

    expect(redacted.openai.apiKey).to.equal('[redacted]');
    expect(redacted.auth.token).to.equal('[redacted]');
    expect(redacted.auth.password).to.equal('[redacted]');
    expect(redacted.auth.clientSecret).to.equal('[redacted]');
  });

  it('leaves non-secret values alone, including numeric look-alikes', () => {
    const redacted = redactSecrets({
      model: { maxTokens: 4096, defaultModel: 'gpt-4' },
      server: { port: 3000, host: 'localhost' },
      security: { cors: { origins: ['*'] } },
    });

    expect(redacted.model.maxTokens).to.equal(4096);
    expect(redacted.model.defaultModel).to.equal('gpt-4');
    expect(redacted.server.port).to.equal(3000);
    expect(redacted.security.cors.origins).to.deep.equal(['*']);
  });

  it('handles nested arrays, null and undefined without throwing', () => {
    const redacted = redactSecrets({
      list: [{ apiKey: 'x' }, { name: 'y' }],
      missing: null,
      absent: undefined,
    });

    expect(redacted.list[0].apiKey).to.equal('[redacted]');
    expect(redacted.list[1].name).to.equal('y');
    expect(redacted.missing).to.equal(null);
  });
});
