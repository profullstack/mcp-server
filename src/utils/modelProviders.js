/**
 * Model Providers Utilities
 *
 * This file contains utility functions for interacting with various model providers.
 */

import { config } from '../core/config.js';
import { logger } from './logger.js';
import fetch from 'node-fetch';
import https from 'https';
import http from 'http';
import FormData from 'form-data';
import { createAiProviders } from '@profullstack/ai-providers';

// Create HTTP agents for proxy support if enabled
const createAgents = () => {
  if (!config.proxy.enabled) return {};

  const httpAgent = config.proxy.http ? new http.Agent({ proxy: config.proxy.http }) : undefined;

  const httpsAgent = config.proxy.https
    ? new https.Agent({ proxy: config.proxy.https })
    : undefined;

  return { httpAgent, httpsAgent };
};

const agents = createAgents();

/**
 * Generic fetch function with error handling and retry logic
 */
async function fetchWithRetry(url, options, retries = config.model.maxRetries) {
  try {
    const response = await fetch(url, {
      ...options,
      agent: url.startsWith('https:') ? agents.httpsAgent : agents.httpAgent,
      timeout: config.model.requestTimeout,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Request failed, retrying (${retries} attempts left): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, config.model.retryDelay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

/**
 * OpenAI API utilities for GPT models
 */
export const openaiProvider = {
  /**
   * Perform inference with OpenAI models (GPT-4, etc.)
   * @param {Object} data - Input data for inference
   * @returns {Promise<Object>} Inference result
   */
  async performInference(data) {
    // Use API key from request or fall back to config
    const apiKey = data.apiKey || config.openai.apiKey;

    // In test environment, always use config.openai.apiKey if available
    const effectiveApiKey = global.testOverrides ? config.openai.apiKey : apiKey;

    if (!effectiveApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Delete apiKey from data to avoid sending it to OpenAI
    if (data.apiKey) delete data.apiKey;

    const model = data.model || config.openai.defaultModel;
    const url = `${config.openai.baseUrl}/chat/completions`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${effectiveApiKey}`,
    };

    if (config.openai.orgId) {
      headers['OpenAI-Organization'] = config.openai.orgId;
    }

    if (config.openai.apiVersion) {
      headers['OpenAI-Version'] = config.openai.apiVersion;
    }

    const requestBody = {
      model,
      messages: [{ role: 'user', content: data.prompt }],
      temperature: data.temperature !== undefined ? data.temperature : config.openai.temperature,
      max_tokens: data.max_tokens !== undefined ? data.max_tokens : config.openai.maxTokens,
      top_p: data.top_p !== undefined ? data.top_p : 1,
      stream: false,
    };

    logger.debug(`OpenAI API request: ${JSON.stringify(requestBody)}`);

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    return {
      modelId: model,
      response: result.choices[0].message.content,
      timestamp: new Date().toISOString(),
      rawResponse: result,
      parameters: {
        temperature: requestBody.temperature,
        max_tokens: requestBody.max_tokens,
        top_p: requestBody.top_p,
      },
    };
  },

  /**
   * Perform streaming inference with OpenAI models
   * @param {Object} data - Input data for inference
   * @returns {Promise<ReadableStream>} Stream of inference results
   */
  async performStreamingInference(data) {
    // Use API key from request or fall back to config
    const apiKey = data.apiKey || config.openai.apiKey;

    // In test environment, always use config.openai.apiKey if available
    const effectiveApiKey = global.testOverrides ? config.openai.apiKey : apiKey;

    if (!effectiveApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Delete apiKey from data to avoid sending it to OpenAI
    if (data.apiKey) delete data.apiKey;

    const model = data.model || config.openai.defaultModel;
    const url = `${config.openai.baseUrl}/chat/completions`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${effectiveApiKey}`,
    };

    if (config.openai.orgId) {
      headers['OpenAI-Organization'] = config.openai.orgId;
    }

    if (config.openai.apiVersion) {
      headers['OpenAI-Version'] = config.openai.apiVersion;
    }

    const requestBody = {
      model,
      messages: [{ role: 'user', content: data.prompt }],
      temperature: data.temperature !== undefined ? data.temperature : config.openai.temperature,
      max_tokens: data.max_tokens !== undefined ? data.max_tokens : config.openai.maxTokens,
      top_p: data.top_p !== undefined ? data.top_p : 1,
      stream: true,
    };

    logger.debug(`OpenAI API streaming request: ${JSON.stringify(requestBody)}`);

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    return response.body;
  },

  /**
   * Transcribe audio using OpenAI's Whisper API
   * @param {Object} data - Input data for transcription
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudio(data) {
    // Use API key from request or fall back to config
    const apiKey = data.apiKey || config.openai.apiKey;

    // In test environment, always use config.openai.apiKey if available
    const effectiveApiKey = global.testOverrides ? config.openai.apiKey : apiKey;

    if (!effectiveApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Delete apiKey from data to avoid sending it to OpenAI
    if (data.apiKey) delete data.apiKey;

    if (!data.audioFile) {
      throw new Error('Audio file is required for transcription');
    }

    const model = data.model || config.openai.whisper.defaultModel;
    const url = `${config.openai.baseUrl}/audio/transcriptions`;

    const formData = new FormData();
    formData.append('file', data.audioFile);
    formData.append('model', model);

    if (data.language || config.openai.whisper.defaultLanguage) {
      formData.append('language', data.language || config.openai.whisper.defaultLanguage);
    }

    formData.append(
      'temperature',
      data.temperature !== undefined ? data.temperature : config.openai.whisper.defaultTemperature
    );

    formData.append(
      'response_format',
      data.response_format || config.openai.whisper.defaultResponseFormat
    );

    const headers = {
      Authorization: `Bearer ${effectiveApiKey}`,
    };

    if (config.openai.orgId) {
      headers['OpenAI-Organization'] = config.openai.orgId;
    }

    logger.debug(`Whisper API request for model: ${model}`);

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const result = await response.json();

    return {
      modelId: model,
      response: result.text,
      timestamp: new Date().toISOString(),
      rawResponse: result,
      parameters: {
        temperature: data.temperature || config.openai.whisper.defaultTemperature,
        language: data.language || config.openai.whisper.defaultLanguage,
        response_format: data.response_format || config.openai.whisper.defaultResponseFormat,
      },
    };
  },
};

/**
 * Stability AI utilities for image generation models
 */
export const stabilityProvider = {
  /**
   * Generate images using Stability AI models
   * @param {Object} data - Input data for image generation
   * @returns {Promise<Object>} Image generation result
   */
  async generateImage(data) {
    // Use API key from request or fall back to config
    const apiKey = data.apiKey || config.stability.apiKey;

    // In test environment, always use config.stability.apiKey if available
    const effectiveApiKey = global.testOverrides ? config.stability.apiKey : apiKey;

    if (!effectiveApiKey) {
      throw new Error('Stability AI API key is not configured');
    }

    // Delete apiKey from data to avoid sending it to Stability
    if (data.apiKey) delete data.apiKey;

    const engine = data.engine || config.stability.defaultEngine;
    const url = `${config.stability.baseUrl}/generation/${engine}/text-to-image`;

    const requestBody = {
      text_prompts: [
        {
          text: data.prompt,
          weight: data.weight || 1.0,
        },
      ],
      cfg_scale: data.cfg_scale !== undefined ? data.cfg_scale : config.stability.defaultCfgScale,
      height: data.height || config.stability.defaultHeight,
      width: data.width || config.stability.defaultWidth,
      steps: data.steps || config.stability.defaultSteps,
      samples: data.samples || 1,
    };

    logger.debug(`Stability AI request: ${JSON.stringify(requestBody)}`);

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${effectiveApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    // Process the images from base64 to usable format
    const images = result.artifacts.map(artifact => ({
      base64: artifact.base64,
      seed: artifact.seed,
      finishReason: artifact.finishReason,
    }));

    return {
      modelId: engine,
      response: images,
      timestamp: new Date().toISOString(),
      rawResponse: result,
      parameters: {
        cfg_scale: requestBody.cfg_scale,
        height: requestBody.height,
        width: requestBody.width,
        steps: requestBody.steps,
        samples: requestBody.samples,
      },
    };
  },
};

/**
 * Anthropic API utilities for Claude models
 */
export const anthropicProvider = {
  /**
   * Perform inference with Anthropic Claude models
   * @param {Object} data - Input data for inference
   * @returns {Promise<Object>} Inference result
   */
  async performInference(data) {
    // Use API key from request or fall back to config
    const apiKey = data.apiKey || config.anthropic.apiKey;

    // In test environment, always use config.anthropic.apiKey if available
    const effectiveApiKey = global.testOverrides ? config.anthropic.apiKey : apiKey;

    if (!effectiveApiKey) {
      throw new Error('Anthropic API key is not configured');
    }

    // Delete apiKey from data to avoid sending it to Anthropic
    if (data.apiKey) delete data.apiKey;

    const model = data.model || config.anthropic.defaultModel;
    const url = `${config.anthropic.baseUrl}/v1/messages`;

    const requestBody = {
      model,
      messages: [{ role: 'user', content: data.prompt }],
      temperature: data.temperature !== undefined ? data.temperature : config.anthropic.temperature,
      max_tokens: data.max_tokens !== undefined ? data.max_tokens : config.anthropic.maxTokens,
      stream: false,
    };

    logger.debug(`Anthropic API request: ${JSON.stringify(requestBody)}`);

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': effectiveApiKey,
        'anthropic-version': config.anthropic.apiVersion,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    return {
      modelId: model,
      response: result.content[0].text,
      timestamp: new Date().toISOString(),
      rawResponse: result,
      parameters: {
        temperature: requestBody.temperature,
        max_tokens: requestBody.max_tokens,
      },
    };
  },

  /**
   * Perform streaming inference with Anthropic Claude models
   * @param {Object} data - Input data for inference
   * @returns {Promise<ReadableStream>} Stream of inference results
   */
  async performStreamingInference(data) {
    // Use API key from request or fall back to config
    const apiKey = data.apiKey || config.anthropic.apiKey;

    // In test environment, always use config.anthropic.apiKey if available
    const effectiveApiKey = global.testOverrides ? config.anthropic.apiKey : apiKey;

    if (!effectiveApiKey) {
      throw new Error('Anthropic API key is not configured');
    }

    // Delete apiKey from data to avoid sending it to Anthropic
    if (data.apiKey) delete data.apiKey;

    const model = data.model || config.anthropic.defaultModel;
    const url = `${config.anthropic.baseUrl}/v1/messages`;

    const requestBody = {
      model,
      messages: [{ role: 'user', content: data.prompt }],
      temperature: data.temperature !== undefined ? data.temperature : config.anthropic.temperature,
      max_tokens: data.max_tokens !== undefined ? data.max_tokens : config.anthropic.maxTokens,
      stream: true,
    };

    logger.debug(`Anthropic API streaming request: ${JSON.stringify(requestBody)}`);

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': effectiveApiKey,
        'anthropic-version': config.anthropic.apiVersion,
      },
      body: JSON.stringify(requestBody),
    });

    return response.body;
  },
};

/**
 * Hugging Face API utilities
 */
export const huggingfaceProvider = {
  /**
   * Perform inference with Hugging Face models
   * @param {Object} data - Input data for inference
   * @returns {Promise<Object>} Inference result
   */
  async performInference(data) {
    // Use API key from request or fall back to config
    const apiKey = data.apiKey || config.huggingface.apiKey;

    // In test environment, always use config.huggingface.apiKey if available
    const effectiveApiKey = global.testOverrides ? config.huggingface.apiKey : apiKey;

    if (!effectiveApiKey) {
      throw new Error('Hugging Face API key is not configured');
    }

    // Delete apiKey from data to avoid sending it to Hugging Face
    if (data.apiKey) delete data.apiKey;

    if (!data.model) {
      throw new Error('Model name is required for Hugging Face inference');
    }

    const url = `${config.huggingface.baseUrl}/${data.model}`;

    const requestBody = {
      inputs: data.prompt,
      parameters: {
        temperature: data.temperature,
        max_tokens: data.max_tokens,
        top_p: data.top_p,
        ...data.parameters,
      },
      options: data.options || {},
    };

    logger.debug(`Hugging Face API request: ${JSON.stringify(requestBody)}`);

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    return {
      modelId: data.model,
      response: result[0]?.generated_text || JSON.stringify(result),
      timestamp: new Date().toISOString(),
      rawResponse: result,
      parameters: requestBody.parameters,
    };
  },
};

let c0mputeRouter;
let c0mputeRouterKey;

/** One router per configuration, so rotation and parking see every call. */
function getC0mputeRouter() {
  const key = [
    config.c0mpute.apiKey,
    config.c0mpute.timeoutMs,
    config.openai.apiKey,
    config.anthropic.apiKey,
  ].join('\0');
  if (!c0mputeRouter || c0mputeRouterKey !== key) {
    c0mputeRouter = createAiProviders({
      env: {
        ...process.env,
        C0MPUTE_API_KEY: config.c0mpute.apiKey || '',
        C0MPUTE_DISABLED: config.c0mpute.disabled ? '1' : '',
        OPENAI_API_KEY: config.openai.apiKey || '',
        ANTHROPIC_API_KEY: config.anthropic.apiKey || '',
      },
      c0mpute: { timeoutMs: config.c0mpute.timeoutMs },
    });
    c0mputeRouterKey = key;
  }
  return c0mputeRouter;
}

/**
 * c0mpute peer network for text generation, with OpenAI and Anthropic
 * (when their keys are configured) as alternating fallbacks.
 *
 * Model ids: `c0mpute` (the network's default models) or `c0mpute/<model>`
 * to ask for one model, e.g. `c0mpute/qwen2.5:7b`.
 */
export const c0mputeProvider = {
  /** Whole-call timeout; modelManager uses it instead of the shorter default. */
  get timeoutMs() {
    return config.c0mpute.timeoutMs;
  },

  /**
   * @param {Object} data - { prompt, model, max_tokens, temperature, system }
   * @returns {Promise<Object>} Inference result
   */
  async performInference(data) {
    // Request-level vendor keys are not forwarded to the shared router
    if (data.apiKey) delete data.apiKey;

    const modelId = data.model || 'c0mpute';
    const c0mputeModel = modelId.startsWith('c0mpute/')
      ? modelId.slice('c0mpute/'.length)
      : undefined;
    const maxTokens = data.max_tokens !== undefined ? data.max_tokens : config.openai.maxTokens;
    const temperature =
      data.temperature !== undefined ? data.temperature : config.openai.temperature;

    const result = await getC0mputeRouter().generateText({
      system: data.system,
      user: data.prompt,
      maxTokens,
      temperature,
      ...(c0mputeModel ? { models: { c0mpute: c0mputeModel } } : {}),
      feature: 'mcp-server',
    });

    return {
      modelId,
      response: result.text,
      timestamp: new Date().toISOString(),
      rawResponse: {
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      },
      parameters: {
        temperature,
        max_tokens: maxTokens,
      },
    };
  },

  async performStreamingInference() {
    throw new Error('Streaming is not supported for c0mpute models');
  },
};

/**
 * Get the appropriate provider for a given model ID
 * @param {string} modelId - The ID of the model
 * @returns {Object} The provider for the model
 */
export function getProviderForModel(modelId) {
  // Map model IDs to their providers
  if (modelId === 'c0mpute' || modelId.startsWith('c0mpute/')) {
    return c0mputeProvider;
  } else if (
    modelId.startsWith('gpt-') ||
    modelId === 'text-davinci-003' ||
    modelId === 'text-davinci-002'
  ) {
    return openaiProvider;
  } else if (modelId === 'whisper' || modelId === 'whisper-1') {
    return {
      performInference: openaiProvider.transcribeAudio,
      performStreamingInference: async () => {
        throw new Error('Streaming is not supported for Whisper models');
      },
    };
  } else if (modelId.startsWith('stable-diffusion')) {
    return {
      performInference: stabilityProvider.generateImage,
      performStreamingInference: async () => {
        throw new Error('Streaming is not supported for Stable Diffusion models');
      },
    };
  } else if (modelId.startsWith('claude')) {
    return anthropicProvider;
  } else {
    // Default to Hugging Face for unknown models
    return huggingfaceProvider;
  }
}
