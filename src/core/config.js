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
  },
  
  // Module settings
  modules: {
    directory: process.env.MODULES_DIRECTORY || './src/modules',
    autoload: parseBool(process.env.MODULES_AUTOLOAD, true),
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
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
  }
};

// Log the configuration in development mode
if (config.server.env === 'development') {
  console.log('MCP Server Configuration:');
  console.log(JSON.stringify(config, null, 2));
}