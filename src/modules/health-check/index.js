/**
 * Health Check Module
 * 
 * This module provides detailed health check endpoints for the MCP server.
 * It monitors system resources, server status, and module health.
 */

import os from 'os';
import { logger } from '../../utils/logger.js';
import { getModulesInfo } from '../../core/moduleLoader.js';
import { modelState } from '../../core/modelManager.js';

/**
 * Gets system information
 * @returns {Object} System information
 */
function getSystemInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptime: process.uptime(),
    processMemory: process.memoryUsage(),
    systemMemory: {
      total: os.totalmem(),
      free: os.freemem(),
      usage: (1 - os.freemem() / os.totalmem()) * 100
    },
    cpus: os.cpus().length,
    loadAverage: os.loadavg()
  };
}

/**
 * Gets server health status
 * @returns {Object} Server health status
 */
async function getServerHealth() {
  const modules = await getModulesInfo();
  
  return {
    status: 'healthy', // Could be 'healthy', 'degraded', or 'unhealthy'
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    models: {
      active: modelState.activeModel,
      available: Object.keys(modelState.models).length,
      status: modelState.activeModel ? 'active' : 'inactive'
    },
    modules: {
      count: modules.length,
      names: modules.map(m => m.name)
    }
  };
}

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering health-check module');
  
  // Detailed health check endpoint
  app.get('/health/detailed', async (c) => {
    const health = await getServerHealth();
    const system = getSystemInfo();
    
    return c.json({
      health,
      system
    });
  });
  
  // System information endpoint
  app.get('/system/info', (c) => {
    return c.json(getSystemInfo());
  });
  
  // Module information
  app.get('/modules/health-check', (c) => {
    return c.json(metadata);
  });
  
  logger.info('Health-check module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering health-check module');
  // No cleanup needed for this module
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Health Check Module',
  version: '1.0.0',
  description: 'Provides detailed health check endpoints for the MCP server',
  author: 'MCP Server Team',
  endpoints: [
    { path: '/health/detailed', method: 'GET', description: 'Get detailed health information' },
    { path: '/system/info', method: 'GET', description: 'Get system information' }
  ]
};