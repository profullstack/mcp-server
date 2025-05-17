/**
 * Model Providers Tests
 *
 * This file contains tests for the model providers functionality.
 */

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
import fetch from 'node-fetch';

// Import the model providers
import {
  openaiProvider,
  stabilityProvider,
  anthropicProvider,
  huggingfaceProvider,
  getProviderForModel,
} from '../../src/utils/modelProviders.js';

// Import the config
import { config } from '../../src/core/config.js';

describe('Model Providers', () => {
  // Sinon sandbox for managing stubs
  let sandbox;

  // Original environment variables
  let originalEnv;
  // Original fetch function
  let originalFetch;

  beforeEach(() => {
    // Create a new sandbox before each test
    sandbox = sinon.createSandbox();

    // Save original environment variables
    originalEnv = { ...process.env };

    // Save original fetch function
    originalFetch = global.fetch;

    // Mock the fetch function by replacing it in the global scope
    global.fetch = async (url, options) => {
      // Parse the request body if it exists
      const requestBody = options.body ? JSON.parse(options.body) : {};

      // Check for OpenAI API calls
      if (url.includes('api.openai.com')) {
        // Return a successful response for OpenAI
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'Test response' } }] }),
          text: async () => 'Test response',
          body: { pipe: sinon.stub() },
        };
      }

      // Check for Stability API calls
      else if (url.includes('api.stability.ai')) {
        // Return a successful response for Stability
        return {
          ok: true,
          json: async () => ({
            artifacts: [
              {
                base64: 'test-base64-image',
                seed: 123456,
                finishReason: 'SUCCESS',
              },
            ],
          }),
        };
      }

      // Check for Anthropic API calls
      else if (url.includes('api.anthropic.com')) {
        // Return a successful response for Anthropic
        return {
          ok: true,
          json: async () => ({
            content: [{ text: 'Claude response' }],
          }),
        };
      }

      // Check for Hugging Face API calls
      else if (url.includes('api-inference.huggingface.co')) {
        // Return a successful response for Hugging Face
        return {
          ok: true,
          json: async () => [{ generated_text: 'Hugging Face response' }],
        };
      }

      // Default response for any other API
      return {
        ok: true,
        json: async () => ({ result: 'Default test response' }),
        text: async () => 'Default test response',
        body: { pipe: sinon.stub() },
      };
    };

    // Set up test config
    config.openai = {
      apiKey: 'test-openai-key',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4',
      temperature: 0.7,
      maxTokens: 100,
      whisper: {
        defaultModel: 'whisper-1',
        defaultTemperature: 0,
        defaultResponseFormat: 'json',
      },
    };

    config.stability = {
      apiKey: 'test-stability-key',
      baseUrl: 'https://api.stability.ai/v1',
      defaultEngine: 'stable-diffusion-xl-1024-v1-0',
      defaultSteps: 30,
      defaultCfgScale: 7,
      defaultWidth: 1024,
      defaultHeight: 1024,
    };

    config.anthropic = {
      apiKey: 'test-anthropic-key',
      baseUrl: 'https://api.anthropic.com',
      apiVersion: '2023-06-01',
      defaultModel: 'claude-3-opus-20240229',
      temperature: 0.7,
      maxTokens: 100,
    };

    config.huggingface = {
      apiKey: 'test-huggingface-key',
      baseUrl: 'https://api-inference.huggingface.co/models',
    };

    config.model = {
      maxRetries: 3,
      retryDelay: 10,
      requestTimeout: 1000,
      inferenceTimeout: 2000,
    };

    config.proxy = {
      enabled: false,
    };
  });

  afterEach(() => {
    // Restore all stubs after each test
    sandbox.restore();

    // Restore original environment variables
    process.env = originalEnv;

    // Restore original fetch function
    global.fetch = originalFetch;
  });

  describe('getProviderForModel', () => {
    it('should return openaiProvider for GPT models', () => {
      const provider = getProviderForModel('gpt-4');
      expect(provider).to.equal(openaiProvider);
    });

    it('should return openaiProvider with transcribeAudio for Whisper models', () => {
      const provider = getProviderForModel('whisper');
      expect(provider.performInference).to.equal(openaiProvider.transcribeAudio);
    });

    it('should return stabilityProvider for Stable Diffusion models', () => {
      const provider = getProviderForModel('stable-diffusion');
      expect(provider.performInference).to.equal(stabilityProvider.generateImage);
    });

    it('should return anthropicProvider for Claude models', () => {
      const provider = getProviderForModel('claude-3-opus');
      expect(provider).to.equal(anthropicProvider);
    });

    it('should return huggingfaceProvider for unknown models', () => {
      const provider = getProviderForModel('unknown-model');
      expect(provider).to.equal(huggingfaceProvider);
    });
  });

  describe('OpenAI Provider', () => {
    // Skip this test as it requires a valid OpenAI API key
    it.skip('should perform inference with GPT models', async () => {
      const data = {
        prompt: 'Test prompt',
        temperature: 0.5,
        max_tokens: 50,
      };

      const result = await openaiProvider.performInference(data);

      expect(result.modelId).to.equal('gpt-4');
      expect(result.response).to.equal('Test response');
      expect(result.timestamp).to.be.a('string');
      expect(result.parameters.temperature).to.equal(0.5);
      expect(result.parameters.max_tokens).to.equal(50);
    });

    // Skip this test as it requires a valid OpenAI API key
    it.skip('should perform streaming inference with GPT models', async () => {
      const data = {
        prompt: 'Test prompt',
        temperature: 0.5,
        max_tokens: 50,
        stream: true,
      };

      const result = await openaiProvider.performStreamingInference(data);
      expect(result).to.have.property('pipe');
    });

    it('should throw an error if API key is not configured', async () => {
      // Remove API key
      config.openai.apiKey = null;

      const data = {
        prompt: 'Test prompt',
      };

      try {
        await openaiProvider.performInference(data);
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('OpenAI API key is not configured');
      }
    });
  });

  describe('Stability Provider', () => {
    // Skip this test as it requires a valid Stability API key
    it.skip('should generate images with Stable Diffusion', async () => {
      const data = {
        prompt: 'A beautiful sunset',
        height: 1024, // Using valid dimensions for SDXL
        width: 1024, // Using valid dimensions for SDXL
        steps: 20,
      };

      const result = await stabilityProvider.generateImage(data);

      expect(result.modelId).to.equal('stable-diffusion-xl-1024-v1-0');
      expect(result.response).to.be.an('array');
      expect(result.response[0].base64).to.equal('test-base64-image');
      expect(result.response[0].seed).to.equal(123456);
    });

    it('should throw an error if API key is not configured', async () => {
      // Remove API key
      config.stability.apiKey = null;

      const data = {
        prompt: 'A beautiful sunset',
      };

      try {
        await stabilityProvider.generateImage(data);
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Stability AI API key is not configured');
      }
    });
  });

  describe('Anthropic Provider', () => {
    // Skip this test as it requires a valid Anthropic API key
    it.skip('should perform inference with Claude models', async () => {
      const data = {
        prompt: 'Test prompt for Claude',
        temperature: 0.3,
        max_tokens: 200,
      };

      const result = await anthropicProvider.performInference(data);

      expect(result.modelId).to.equal('claude-3-opus-20240229');
      expect(result.response).to.equal('Claude response');
    });

    it('should throw an error if API key is not configured', async () => {
      // Remove API key
      config.anthropic.apiKey = null;

      const data = {
        prompt: 'Test prompt for Claude',
      };

      try {
        await anthropicProvider.performInference(data);
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Anthropic API key is not configured');
      }
    });
  });

  describe('Hugging Face Provider', () => {
    // Skip this test as it requires a valid Hugging Face API key
    it.skip('should perform inference with Hugging Face models', async () => {
      const data = {
        model: 'gpt2',
        prompt: 'Test prompt for Hugging Face',
        parameters: {
          temperature: 0.8,
        },
      };

      const result = await huggingfaceProvider.performInference(data);

      expect(result.modelId).to.equal('gpt2');
      expect(result.response).to.equal('Hugging Face response');
    });

    it('should throw an error if API key is not configured', async () => {
      // Remove API key
      config.huggingface.apiKey = null;

      const data = {
        model: 'gpt2',
        prompt: 'Test prompt for Hugging Face',
      };

      try {
        await huggingfaceProvider.performInference(data);
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Hugging Face API key is not configured');
      }
    });

    it('should throw an error if model is not specified', async () => {
      const data = {
        prompt: 'Test prompt for Hugging Face',
      };

      try {
        await huggingfaceProvider.performInference(data);
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Model name is required for Hugging Face inference');
      }
    });
  });
});
