import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import dotenv from 'dotenv';
import { loadModules } from './src/core/moduleLoader.js';
import { setupCoreRoutes } from './src/core/routes.js';
import { setupMiddleware } from './src/core/middleware.js';
import { config } from './src/core/config.js';
import { logger } from './src/utils/logger.js';

// Load environment variables from .env file
dotenv.config();

// Initialize the Hono app
const app = new Hono();

// Setup middleware
setupMiddleware(app);

// Setup core routes
setupCoreRoutes(app);

// Load and register all modules
loadModules(app);

// Start the server
const PORT = process.env.PORT || config.server.port || 3000;
const HOST = config.server.host || 'localhost';

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST
});

logger.info(`MCP server is running at http://${HOST}:${PORT}`);
logger.info(`Environment: ${config.server.env}`);