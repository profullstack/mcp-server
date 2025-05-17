// Import the real modules
import * as realModelManager from './modelManager.js';
import * as realModuleLoader from './moduleLoader.js';

// Use test overrides if they exist (for testing)
const modelManager = global.testOverrides?.modelManager || realModelManager;
const moduleLoader = global.testOverrides?.moduleLoader || realModuleLoader;

// Don't destructure to ensure we always use the latest values
// const { getModulesInfo } = moduleLoader;
import { config } from './config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as streamTransform from 'stream-transform';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')
);
const { version } = packageJson;

/**
 * Sets up the core MCP routes on the provided Hono app instance
 * @param {import('hono').Hono} app - The Hono app instance
 */
export function setupCoreRoutes(app) {
  // Server Information

  // MCP Root endpoint
  app.get('/', async c => {
    // Get module information
    const modules = await moduleLoader.getModulesInfo();

    // Create a summary of modules
    const modulesSummary = modules.map(m => ({
      name: m.name,
      directoryName: m.directoryName,
      version: m.version,
      description: m.description,
      author: m.author,
      tools: m.tools || [],
    }));

    return c.json({
      name: 'MCP Server',
      version: version,
      status: 'running',
      modules: modulesSummary,
    });
  });

  // Server status endpoint
  app.get('/status', c => {
    // For tests, we need to handle the case where the active model is set directly
    // in the global testOverrides object
    const activeModel =
      global.testOverrides?.modelManager?.modelState?.activeModel ||
      modelManager.modelState.activeModel;

    return c.json({
      status: 'running',
      activeModel: activeModel,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint
  app.get('/health', c => {
    // For tests, we need to handle the case where the active model is set directly
    // in the global testOverrides object
    const activeModel =
      global.testOverrides?.modelManager?.modelState?.activeModel ||
      modelManager.modelState.activeModel;

    return c.json({
      status: 'healthy',
      checks: {
        server: 'running',
        models: activeModel ? 'active' : 'available',
      },
    });
  });

  // Server metrics
  app.get('/metrics', c => {
    return c.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    });
  });

  // Model Management

  // List available models
  app.get('/models', async c => {
    const models = await modelManager.listModels();
    return c.json({ models });
  });

  // Get model information
  app.get('/model/:modelId', async c => {
    const { modelId } = c.req.param();
    const model = await modelManager.getModelById(modelId);

    if (!model) {
      return c.json({ error: `Model ${modelId} not found` }, 404);
    }

    return c.json(model);
  });

  // Activate a model
  app.post('/model/:modelId/activate', async c => {
    const { modelId } = c.req.param();
    let config = {};

    try {
      const body = await c.req.json();
      config = body.config || {};
    } catch (error) {
      // No body or invalid JSON, use default config
    }

    const result = await modelManager.activateModel(modelId, config);
    return c.json(result);
  });

  // Deactivate the current model
  app.post('/model/deactivate', async c => {
    await modelManager.deactivateModel();
    return c.json({ success: true });
  });

  // Get active model information
  app.get('/model/active', async c => {
    // For tests, we need to handle the case where the active model is set directly
    // in the global testOverrides object
    if (global.testOverrides?.modelManager?.getActiveModel) {
      const result = await global.testOverrides.modelManager.getActiveModel();
      return c.json(result);
    }

    const result = await modelManager.getActiveModel();

    if (!result.activeModel) {
      return c.json({ error: 'No active model' }, 404);
    }

    return c.json(result);
  });

  // Inference

  // Perform inference with active model
  app.post('/model/infer', async c => {
    // For tests, we need to handle the case where the active model is set directly
    // in the global testOverrides object
    const active =
      global.testOverrides?.modelManager?.modelState?.activeModel ||
      modelManager.modelState.activeModel;

    if (!active) {
      return c.json(
        {
          error: {
            code: 'no_active_model',
            message: 'No active model',
          },
        },
        400
      );
    }

    try {
      const body = await c.req.json();

      // Check if streaming is requested
      if (body.stream === true) {
        // Set up streaming response
        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');

        try {
          const result = await modelManager.performStreamingInference(active, body);

          // Handle real streaming responses from model providers
          if (result.response && typeof result.response.pipe === 'function') {
            // If we got a real stream, pipe it to the client
            // First convert the stream to SSE format if needed
            const stream = result.response;

            // Create a new transform stream to convert the provider's stream format to SSE
            const transformStream = streamTransform(function (chunk, callback) {
              // Convert chunk to string if it's a buffer
              const data = chunk instanceof Buffer ? chunk.toString() : chunk;

              // Format as SSE
              callback(null, `data: ${data}\n\n`);
            });

            // Pipe the provider's stream through our transformer
            const transformedStream = stream.pipe(transformStream);

            // Return the transformed stream
            return c.body(transformedStream);
          } else {
            // For backward compatibility with the mock implementation
            // Just send the entire response as one event
            return c.body(`data: ${JSON.stringify(result)}\n\n`);
          }
        } catch (error) {
          return c.body(
            `data: ${JSON.stringify({
              error: {
                code: 'streaming_inference_failed',
                message: error.message,
              },
            })}\n\n`
          );
        }
      } else {
        // Regular non-streaming inference
        const result = await modelManager.performInference(active, body);
        return c.json(result);
      }
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'inference_failed',
            message: error.message || 'Inference failed',
          },
        },
        error.message && error.message.includes('Missing required parameter') ? 400 : 500
      );
    }
  });

  // Perform inference with specific model
  app.post('/model/:modelId/infer', async c => {
    const { modelId } = c.req.param();

    try {
      const body = await c.req.json();

      // Check if streaming is requested
      if (body.stream === true) {
        // Set up streaming response
        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');

        try {
          const result = await modelManager.performStreamingInference(modelId, body);

          // Handle real streaming responses from model providers
          if (result.response && typeof result.response.pipe === 'function') {
            // If we got a real stream, pipe it to the client
            // First convert the stream to SSE format if needed
            const stream = result.response;

            // Create a new transform stream to convert the provider's stream format to SSE
            const transformStream = streamTransform(function (chunk, callback) {
              // Convert chunk to string if it's a buffer
              const data = chunk instanceof Buffer ? chunk.toString() : chunk;

              // Format as SSE
              callback(null, `data: ${data}\n\n`);
            });

            // Pipe the provider's stream through our transformer
            const transformedStream = stream.pipe(transformStream);

            // Return the transformed stream
            return c.body(transformedStream);
          } else {
            // For backward compatibility with the mock implementation
            // Just send the entire response as one event
            return c.body(`data: ${JSON.stringify(result)}\n\n`);
          }
        } catch (error) {
          return c.body(
            `data: ${JSON.stringify({
              error: {
                code: 'streaming_inference_failed',
                message: error.message,
              },
            })}\n\n`
          );
        }
      } else {
        // Regular non-streaming inference
        const result = await modelManager.performInference(modelId, body);
        return c.json(result);
      }
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'inference_failed',
            message: error.message || 'Inference failed',
          },
        },
        error.message && error.message.includes('Missing required parameter') ? 400 : 500
      );
    }
  });

  // Module Management

  // List installed modules
  app.get('/modules', async c => {
    const modules = await moduleLoader.getModulesInfo();
    return c.json({ modules });
  });

  // Get module information
  app.get('/modules/:moduleId', async c => {
    const { moduleId } = c.req.param();
    const modules = await moduleLoader.getModulesInfo();

    // Try to find the module by name
    const module = modules.find(m => m.name === moduleId);

    if (!module) {
      return c.json({ error: `Module ${moduleId} not found` }, 404);
    }

    return c.json(module);
  });

  // Search modules
  app.get('/modules/search/:query', async c => {
    const { query } = c.req.param();
    const modules = await moduleLoader.getModulesInfo();

    // Search through all module information
    const results = modules.filter(module => {
      // Convert module to string for searching
      const moduleString = JSON.stringify(module).toLowerCase();
      return moduleString.includes(query.toLowerCase());
    });

    return c.json({
      query,
      count: results.length,
      results,
    });
  });

  // Enable a module
  app.post('/modules/:moduleId/enable', async c => {
    const { moduleId } = c.req.param();

    try {
      const result = await moduleLoader.enableModule(moduleId);
      return c.json(result);
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'module_enable_failed',
            message: error.message || 'Failed to enable module',
          },
        },
        error.message && error.message.includes('not found') ? 404 : 500
      );
    }
  });

  // Disable a module
  app.post('/modules/:moduleId/disable', async c => {
    const { moduleId } = c.req.param();

    try {
      const result = await moduleLoader.disableModule(moduleId);
      return c.json(result);
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'module_disable_failed',
            message: error.message || 'Failed to disable module',
          },
        },
        error.message && error.message.includes('not found') ? 404 : 500
      );
    }
  });

  // Tools and Resources (placeholder endpoints)

  // List available tools
  app.get('/tools', c => {
    return c.json({
      tools: [], // To be populated by modules
    });
  });

  // List available resources
  app.get('/resources', c => {
    return c.json({
      resources: [], // To be populated by modules
    });
  });

  // Error handling for undefined routes
  app.notFound(c => {
    return c.json(
      {
        error: {
          code: 'not_found',
          message: 'The requested endpoint does not exist',
        },
      },
      404
    );
  });
}
