/**
 * MCP Server Configuration
 * This file contains all the configuration settings for the MCP server.
 * Environment variables can override these settings.
 */

// Helper function to parse boolean environment variables
const parseBool = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
};

// Helper function to parse number environment variables
const parseNum = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
};

export const config = {
  server: {
    port: parseNum(process.env.PORT, 3000),
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },

  // Default model settings
  model: {
    defaultTimeout: parseNum(process.env.MODEL_TIMEOUT, 30000), // 30 seconds
    maxConcurrentRequests: parseNum(process.env.MAX_CONCURRENT_REQUESTS, 5),
    requestTimeout: parseNum(process.env.REQUEST_TIMEOUT_MS, 60000), // 60 seconds
    inferenceTimeout: parseNum(process.env.INFERENCE_TIMEOUT_MS, 120000), // 120 seconds
    maxRetries: parseNum(process.env.MAX_RETRIES, 3),
    retryDelay: parseNum(process.env.RETRY_DELAY_MS, 1000),
  },

  // OpenAI API configuration (for GPT-4 and Whisper)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    orgId: process.env.OPENAI_ORG_ID,
    baseUrl: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
    apiVersion: process.env.OPENAI_API_VERSION,
    maxTokens: parseNum(process.env.OPENAI_MAX_TOKENS, 4096),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4',
    whisper: {
      defaultModel: process.env.WHISPER_DEFAULT_MODEL || 'whisper-1',
      defaultLanguage: process.env.WHISPER_DEFAULT_LANGUAGE,
      defaultTemperature: parseFloat(process.env.WHISPER_DEFAULT_TEMPERATURE || '0'),
      defaultResponseFormat: process.env.WHISPER_DEFAULT_RESPONSE_FORMAT || 'json',
    },
  },

  // Stability AI configuration (for Stable Diffusion)
  stability: {
    apiKey: process.env.STABILITY_API_KEY,
    baseUrl: process.env.STABILITY_API_BASE_URL || 'https://api.stability.ai/v1',
    defaultEngine: process.env.STABILITY_DEFAULT_ENGINE || 'stable-diffusion-xl-1024-v1-0',
    defaultSteps: parseNum(process.env.STABILITY_DEFAULT_STEPS, 30),
    defaultCfgScale: parseFloat(process.env.STABILITY_DEFAULT_CFG_SCALE || '7'),
    defaultWidth: parseNum(process.env.STABILITY_DEFAULT_WIDTH, 1024),
    defaultHeight: parseNum(process.env.STABILITY_DEFAULT_HEIGHT, 1024),
  },

  // Anthropic API configuration (optional)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: process.env.ANTHROPIC_API_BASE_URL || 'https://api.anthropic.com',
    apiVersion: process.env.ANTHROPIC_API_VERSION || '2023-06-01',
    defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-opus-20240229',
    maxTokens: parseNum(process.env.ANTHROPIC_MAX_TOKENS, 4096),
    temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7'),
  },

  // Hugging Face API configuration (optional)
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY,
    baseUrl: process.env.HUGGINGFACE_API_BASE_URL || 'https://api-inference.huggingface.co/models',
  },

  // Proxy settings
  proxy: {
    enabled: parseBool(process.env.USE_PROXY, false),
    http: process.env.HTTP_PROXY,
    https: process.env.HTTPS_PROXY,
    noProxy: process.env.NO_PROXY,
  },

  // Cache settings
  cache: {
    redis: {
      enabled: parseBool(process.env.REDIS_ENABLED, false),
      host: process.env.REDIS_HOST || 'localhost',
      port: parseNum(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD,
      ttl: parseNum(process.env.REDIS_TTL, 3600),
    },
  },

  // Module settings
  modules: {
    directory: process.env.MODULES_DIRECTORY || './mcp_modules',
    autoload: parseBool(process.env.MODULES_AUTOLOAD, true),
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Monitoring settings
  monitoring: {
    metrics: {
      enabled: parseBool(process.env.ENABLE_METRICS, true),
      port: parseNum(process.env.METRICS_PORT, 9090),
    },
  },

  // Security settings
  security: {
    cors: {
      enabled: parseBool(process.env.CORS_ENABLED, true),
      origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
    },
    rateLimit: {
      enabled: parseBool(process.env.RATE_LIMIT_ENABLED, true),
      windowMs: parseNum(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
      max: parseNum(process.env.RATE_LIMIT_MAX, 100), // limit each IP to 100 requests per windowMs
    },
  },
};

// Log the configuration in development mode
if (config.server.env === 'development') {
  console.log('MCP Server Configuration:');
  console.log(JSON.stringify(config, null, 2));
}
