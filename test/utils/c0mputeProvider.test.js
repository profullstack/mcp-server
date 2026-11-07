/**
 * c0mpute provider tests: model id mapping, the c0mpute/<model> catalogue
 * entry, and the OpenAI fallback behind c0mpute (fetch stubbed, offline).
 */

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';

import { c0mputeProvider, getProviderForModel } from '../../src/utils/modelProviders.js';
import { getModelById } from '../../src/core/modelManager.js';
import { config } from '../../src/core/config.js';

describe('c0mpute provider', () => {
  let saved;
  let originalFetch;

  beforeEach(() => {
    saved = {
      c0mpute: { ...config.c0mpute },
      openaiKey: config.openai.apiKey,
      anthropicKey: config.anthropic.apiKey,
    };
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    Object.assign(config.c0mpute, saved.c0mpute);
    config.openai.apiKey = saved.openaiKey;
    config.anthropic.apiKey = saved.anthropicKey;
    globalThis.fetch = originalFetch;
  });

  it('maps c0mpute and c0mpute/<model> ids to the c0mpute provider', () => {
    expect(getProviderForModel('c0mpute')).to.equal(c0mputeProvider);
    expect(getProviderForModel('c0mpute/qwen2.5:7b')).to.equal(c0mputeProvider);
    expect(getProviderForModel('gpt-4')).to.not.equal(c0mputeProvider);
  });

  it('lists c0mpute and resolves c0mpute/<model> from it', async () => {
    const base = await getModelById('c0mpute');
    expect(base).to.include({ id: 'c0mpute', provider: 'c0mpute' });
    const pinned = await getModelById('c0mpute/qwen2.5:7b');
    expect(pinned).to.include({ id: 'c0mpute/qwen2.5:7b', provider: 'c0mpute' });
  });

  it('brings a longer timeout than the default inference timeout', () => {
    config.c0mpute.timeoutMs = 300000;
    expect(c0mputeProvider.timeoutMs).to.equal(300000);
  });

  it('does not stream', async () => {
    try {
      await c0mputeProvider.performStreamingInference({});
      expect.fail('should throw');
    } catch (e) {
      expect(e.message).to.match(/not supported/);
    }
  });

  it('falls back to OpenAI when c0mpute is off, and reports the provider', async () => {
    config.c0mpute.disabled = true;
    config.openai.apiKey = 'sk-test';
    config.anthropic.apiKey = '';
    globalThis.fetch = async url => {
      expect(String(url)).to.match(/\/chat\/completions$/);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'hello' } }], usage: {} }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    };
    const out = await c0mputeProvider.performInference({ model: 'c0mpute', prompt: 'hi' });
    expect(out.response).to.equal('hello');
    expect(out.rawResponse.provider).to.equal('openai');
  });

  it('fails when no provider is available', async () => {
    config.c0mpute.disabled = true;
    config.openai.apiKey = '';
    config.anthropic.apiKey = '';
    try {
      await c0mputeProvider.performInference({ model: 'c0mpute', prompt: 'hi' });
      expect.fail('should throw');
    } catch (e) {
      expect(e.message).to.match(/AI generation failed/);
    }
  });
});
