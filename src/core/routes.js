// Import the real modules
import * as realModelManager from './modelManager.js';
import * as realModuleLoader from './moduleLoader.js';

// Use test overrides if they exist (for testing)
const modelManager = global.testOverrides?.modelManager || realModelManager;
const moduleLoader = global.testOverrides?.moduleLoader || realModuleLoader;

// Don't destructure to ensure we always use the latest values
// const { getModulesInfo } = moduleLoader;
// eslint-disable-next-line no-unused-vars
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

  // MCP transport: dedicated /mcp endpoint per spec
  // Shared JSON-RPC handler to support both POST / and POST /mcp for compatibility
  async function handleJsonRpcRequest(c, body) {
    // Helper to process a single JSON-RPC message and produce a response object or null (for notifications)
    const processOne = async payload => {
      // Basic envelope validation
      if (!payload || typeof payload !== 'object') {
        return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
      }
      if (payload.jsonrpc !== '2.0') {
        return {
          jsonrpc: '2.0',
          id: payload.id ?? null,
          error: { code: -32600, message: 'Invalid Request' },
        };
      }

      const hasId = Object.prototype.hasOwnProperty.call(payload, 'id');
      // If this is a JSON-RPC response (has id, has result or error, and no method), accept silently (202 at top level)
      const isResponseLike =
        hasId &&
        !Object.prototype.hasOwnProperty.call(payload, 'method') &&
        (Object.prototype.hasOwnProperty.call(payload, 'result') ||
          Object.prototype.hasOwnProperty.call(payload, 'error'));
      if (isResponseLike) {
        return null;
      }
      const id = hasId ? payload.id : undefined; // undefined means notification
      const methodName = String(payload?.method ?? '').toLowerCase();
      const params = payload?.params ?? {};

      // Any JSON-RPC notification (no id) must not produce a response per spec
      if (!hasId) {
        // notifications/initialized is the common lifecycle notification
        return null;
      }

      // initialize / handshake
      if (
        methodName === 'initialize' ||
        methodName === 'handshake' ||
        methodName === 'initialize_session'
      ) {
        const result = {
          serverInfo: { name: 'MCP Server', version },
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
          },
        };
        return { jsonrpc: '2.0', id, result };
      }

      // tools/list
      if (methodName === 'tools/list' || methodName === 'tools.list') {
        try {
          const modules = await moduleLoader.getModulesInfo();
          const tools = modules.flatMap(m => {
            const moduleTools = Array.isArray(m.tools) ? m.tools : [];
            return moduleTools.map(t => {
              const name = typeof t === 'string' ? t : (t?.name ?? String(t));
              return {
                name,
                description: m.description || `Tool from module ${m.name}`,
                inputSchema: { type: 'object', additionalProperties: true },
              };
            });
          });
          return { jsonrpc: '2.0', id, result: { tools } };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32000, message: error?.message || 'Failed to list tools' },
          };
        }
      }

      // tools/call
      if (methodName === 'tools/call' || methodName === 'tools.call') {
        try {
          const name = params?.name;
          const args = params?.arguments ?? {};
          if (!name || typeof name !== 'string') {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Invalid params: "name" must be a string' },
            };
          }
          // Map tool name to module by metadata
          const modules = await moduleLoader.getModulesInfo();
          const found = modules.find(
            m =>
              Array.isArray(m.tools) &&
              m.tools.some(t => (typeof t === 'string' ? t : t?.name) === name)
          );
          if (!found) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Tool not found: ${name}` },
            };
          }

          // Attempt to call a conventional endpoint provided by the module:
          // POST /tools/:module/:tool with JSON body = args
          // Since we're inside the same Hono app instance, we can forward internally by constructing a Request.
          // Fallback: if endpoint is not registered, return method not found.
          const modDir = found.directoryName || found.name;
          const toolPath = `/tools/${modDir}/${encodeURIComponent(name)}`;
          // Hono context doesn't expose a direct internal dispatch; we'll try to call via fetch against the same server origin path.
          // As a minimal adapter, if such an endpoint is not available in this process, we return -32601.

          // Heuristic: if module declared endpoints listing includes a /tools/ path for this module and tool, we can hint success.
          // Our current metadata sometimes has "endpoints" array; use that to detect existence.
          const endpointExists = Array.isArray(found.endpoints)
            ? found.endpoints.some(e => typeof e?.path === 'string' && e.path.includes('/tools/'))
            : false;

          if (!endpointExists) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Tool endpoint not available for ${name}` },
            };
          }

          // Since we cannot synchronously dispatch to Hono route here without server URL, return a structured stub:
          // We acknowledge the call but instruct consumers that this server hosts HTTP tool endpoints; they should call via standard HTTP.
          // To adhere to MCP tools/call result shape, wrap info textually.
          const text = `Tool '${name}' is exposed via HTTP endpoint(s) on this server for module '${modDir}'. Invoke the module's HTTP route directly. Arguments received: ${JSON.stringify(args)}`;
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text }], isError: false },
          };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message: error?.message || 'Tool invocation failed' },
          };
        }
      }

      // resources/list
      if (methodName === 'resources/list' || methodName === 'resources.list') {
        try {
          const rootDir = path.resolve(__dirname, '..', '..', 'mcp_resources');
          const resources = [];
          if (fs.existsSync(rootDir)) {
            const modules = fs
              .readdirSync(rootDir, { withFileTypes: true })
              .filter(d => d.isDirectory())
              .map(d => d.name);
            for (const mod of modules) {
              const base = path.join(rootDir, mod);
              const infoPath = path.join(base, 'info.json');
              if (fs.existsSync(infoPath)) {
                try {
                  const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                  resources.push({
                    uri: `resource://${mod}/info`,
                    name: info.name || `${mod} info`,
                    description: info.description || `Information resource for ${mod} module`,
                    mimeType: 'application/json',
                  });
                } catch {
                  resources.push({
                    uri: `resource://${mod}/info`,
                    name: `${mod} info`,
                    description: `Information resource for ${mod} module`,
                    mimeType: 'application/json',
                  });
                }
              }
              const docsLink = path.join(base, 'docs');
              if (fs.existsSync(docsLink)) {
                resources.push({
                  uri: `resource://${mod}/docs`,
                  name: `${mod} docs`,
                  description: `Documentation symlink for ${mod} module`,
                  mimeType: 'application/json',
                });
              }
              const examplesLink = path.join(base, 'examples');
              if (fs.existsSync(examplesLink)) {
                resources.push({
                  uri: `resource://${mod}/examples`,
                  name: `${mod} examples`,
                  description: `Examples symlink for ${mod} module`,
                  mimeType: 'application/json',
                });
              }
            }
          }
          return { jsonrpc: '2.0', id, result: { resources } };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32010, message: error?.message || 'Failed to list resources' },
          };
        }
      }

      // resources/read
      if (methodName === 'resources/read' || methodName === 'resources.read') {
        try {
          const uri = params?.uri;
          if (!uri || typeof uri !== 'string') {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Invalid params: "uri" must be a string' },
            };
          }
          const prefix = 'resource://';
          if (!uri.startsWith(prefix)) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Invalid resource URI scheme' },
            };
          }
          const rest = uri.slice(prefix.length);
          const [mod, kind] = rest.split('/');
          if (!mod || !kind) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Invalid resource URI format' },
            };
          }
          const base = path.resolve(__dirname, '..', '..', 'mcp_resources', mod);
          if (kind === 'info') {
            const infoPath = path.join(base, 'info.json');
            if (!fs.existsSync(infoPath)) {
              return { jsonrpc: '2.0', id, error: { code: -32011, message: 'Resource not found' } };
            }
            const data = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
            const text = JSON.stringify(data, null, 2);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                uri,
                contents: [{ uri: `${uri}#info`, mimeType: 'application/json', text }],
              },
            };
          }
          if (kind === 'docs' || kind === 'examples') {
            const dirPath = path.join(base, kind);
            if (!fs.existsSync(dirPath)) {
              return { jsonrpc: '2.0', id, error: { code: -32011, message: 'Resource not found' } };
            }
            const listFiles = dir => {
              const out = [];
              const walk = rel => {
                const abs = path.join(dir, rel);
                const entries = fs.readdirSync(abs, { withFileTypes: true });
                for (const e of entries) {
                  const nextRel = path.join(rel, e.name);
                  if (e.isDirectory()) {
                    walk(nextRel);
                  } else {
                    out.push(nextRel);
                  }
                }
              };
              walk('.');
              return out;
            };
            const files = listFiles(dirPath);
            const data = { directory: kind, module: mod, files };
            return {
              jsonrpc: '2.0',
              id,
              result: {
                uri,
                contents: [
                  {
                    uri: `${uri}#listing`,
                    mimeType: 'application/json',
                    text: JSON.stringify(data, null, 2),
                  },
                ],
              },
            };
          }
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: 'Resource kind not supported' },
          };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32012, message: error?.message || 'Failed to read resource' },
          };
        }
      }

      // Unknown method
      return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
    };

    // Parse request body once
    let input;
    try {
      input = body ?? (await c.req.json());
    } catch (e) {
      // JSON parse error (for POST with invalid JSON)
      return c.json(
        { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
        200
      );
    }

    // If array => batch
    if (Array.isArray(input)) {
      const results = [];
      let hasAnyResponse = false;
      for (const item of input) {
        const res = await processOne(item);
        if (res && Object.prototype.hasOwnProperty.call(res, 'id')) {
          results.push(res);
          hasAnyResponse = true;
        }
      }
      if (!hasAnyResponse) {
        // Only notifications/responses => 202 no body
        return c.text('', 202);
      }
      return c.json(results, 200);
    }

    // Single object
    const singleRes = await processOne(input);
    if (singleRes === null || typeof singleRes?.id === 'undefined') {
      // Notification (no response expected)
      return c.text('', 202);
    }
    return c.json(singleRes, 200);
  }

  // POST /mcp (primary MCP endpoint)
  app.post('/mcp', async c => {
    return handleJsonRpcRequest(c);
  });

  // GET /mcp (no SSE yet) -> 405 Method Not Allowed
  app.get('/mcp', c => {
    c.header('Allow', 'POST');
    return c.text('Method Not Allowed', 405);
  });

  // Back-compat: also accept POST / as MCP endpoint
  app.post('/', async c => {
    return handleJsonRpcRequest(c);
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

  // Activate all models
  app.post('/models/activate-all', async c => {
    try {
      const result = await modelManager.activateAllModels();
      return c.json(result);
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'models_activation_failed',
            message: error.message || 'Failed to activate all models',
          },
        },
        500
      );
    }
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

      // Add headers to the body object only if not in test environment
      if (!global.testOverrides) {
        // Extract authorization header using Hono's API
        const authHeader = c.req.header('Authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        // Add API key from header if present
        if (token) {
          body.apiKey = token;
        }

        // Add X-API-Key header if present
        const xApiKey = c.req.header('X-API-Key');
        if (xApiKey) {
          body.apiKey = xApiKey;
        }
      }

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

      // Add headers to the body object only if not in test environment
      if (!global.testOverrides) {
        // Extract authorization header using Hono's API
        const authHeader = c.req.header('Authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        // Add API key from header if present
        if (token) {
          body.apiKey = token;
        }

        // Add X-API-Key header if present
        const xApiKey = c.req.header('X-API-Key');
        if (xApiKey) {
          body.apiKey = xApiKey;
        }
      }

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

  // List available tools (aggregated from modules metadata)
  app.get('/tools', async c => {
    try {
      const modules = await moduleLoader.getModulesInfo();
      const tools = modules.flatMap(m => {
        const moduleTools = Array.isArray(m.tools) ? m.tools : [];
        return moduleTools.map(t => ({
          name: typeof t === 'string' ? t : (t?.name ?? String(t)),
          module: m.name,
          directoryName: m.directoryName,
          endpoints: Array.isArray(m.endpoints)
            ? m.endpoints.filter(e => e?.path?.includes('/tools/'))
            : [],
        }));
      });

      return c.json({ tools });
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'tools_list_failed',
            message: error.message || 'Failed to list tools',
          },
        },
        500
      );
    }
  });

  // List available resources (HTTP GET)
  app.get('/resources', async c => {
    try {
      const rootDir = path.resolve(__dirname, '..', '..', 'mcp_resources');
      const resources = [];

      if (fs.existsSync(rootDir)) {
        const modules = fs
          .readdirSync(rootDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);

        for (const mod of modules) {
          const base = path.join(rootDir, mod);

          // info.json resource
          const infoPath = path.join(base, 'info.json');
          if (fs.existsSync(infoPath)) {
            let name = `${mod} info`;
            let description = `Information resource for ${mod} module`;
            try {
              const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
              name = info.name || name;
              description = info.description || description;
            } catch (err) {
              // ignore invalid JSON in resources aggregation
              // eslint-disable-next-line no-console
              console.warn?.('Skipping invalid info.json for %s: %s', mod, err?.message);
            }
            resources.push({
              uri: `resource://${mod}/info`,
              name,
              description,
              mimeType: 'application/json',
            });
          }

          // docs directory resource (list files)
          const docsLink = path.join(base, 'docs');
          const moduleDir = path.resolve(__dirname, '..', '..', 'mcp_modules', mod);
          const docsFallbackDir = path.join(moduleDir, 'docs');
          const readmePath = path.join(moduleDir, 'README.md');
          if (
            fs.existsSync(docsLink) ||
            fs.existsSync(docsFallbackDir) ||
            fs.existsSync(readmePath)
          ) {
            resources.push({
              uri: `resource://${mod}/docs`,
              name: `${mod} docs`,
              description: `Documentation symlink or fallback for ${mod} module`,
              mimeType: 'application/json',
            });
          }

          // examples directory resource (list files)
          const examplesLink = path.join(base, 'examples');
          if (fs.existsSync(examplesLink)) {
            resources.push({
              uri: `resource://${mod}/examples`,
              name: `${mod} examples`,
              description: `Examples symlink for ${mod} module`,
              mimeType: 'application/json',
            });
          }
        }
      }

      return c.json({ resources });
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'resources_list_failed',
            message: error.message || 'Failed to list resources',
          },
        },
        500
      );
    }
  });

  // Module-specific resource summary (e.g. /resources/readme-badges?list=true)
  app.get('/resources/:module', async c => {
    try {
      const { module: mod } = c.req.param();
      const base = path.resolve(__dirname, '..', '..', 'mcp_resources', mod);

      if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
        return c.json(
          {
            error: {
              code: 'resource_module_not_found',
              message: `Resource module ${mod} not found`,
            },
          },
          404
        );
      }

      const infoPath = path.join(base, 'info.json');
      const docsPath = path.join(base, 'docs');
      const examplesPath = path.join(base, 'examples');

      const moduleDir = path.resolve(__dirname, '..', '..', 'mcp_modules', mod);
      const docsFallbackDir = path.join(moduleDir, 'docs');
      const readmePath = path.join(moduleDir, 'README.md');
      let info = null;
      if (fs.existsSync(infoPath)) {
        try {
          info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
        } catch (err) {
          // ignore invalid JSON in resources aggregation
          // eslint-disable-next-line no-console
          console.warn?.('Skipping invalid info.json for %s: %s', mod, err?.message);
        }
      }

      const listParam = c.req.query('list') === 'true';
      const listFiles = dir => {
        const out = [];
        const walk = rel => {
          const abs = path.join(dir, rel);
          const entries = fs.readdirSync(abs, { withFileTypes: true });
          for (const e of entries) {
            const nextRel = path.join(rel, e.name);
            if (e.isDirectory()) {
              walk(nextRel);
            } else {
              out.push(nextRel);
            }
          }
        };
        walk('.');
        return out;
      };

      const available = {
        info: fs.existsSync(infoPath),
        docs:
          fs.existsSync(docsPath) || fs.existsSync(docsFallbackDir) || fs.existsSync(readmePath),
        examples: fs.existsSync(examplesPath),
      };

      const uris = [];
      if (available.info) uris.push(`resource://${mod}/info`);
      if (available.docs) uris.push(`resource://${mod}/docs`);
      if (available.examples) uris.push(`resource://${mod}/examples`);

      const payload = {
        module: mod,
        available,
        uris,
      };

      if (info) payload.info = info;
      if (listParam) {
        if (available.docs) payload.docs = listFiles(docsPath);
        if (available.examples) payload.examples = listFiles(examplesPath);
      }

      return c.json(payload);
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'resource_module_failed',
            message: error.message || 'Failed to read resource module',
          },
        },
        500
      );
    }
  });

  // Read a specific resource kind via HTTP (info/docs/examples)
  app.get('/resources/:module/:kind', async c => {
    try {
      const { module: mod, kind } = c.req.param();
      const base = path.resolve(__dirname, '..', '..', 'mcp_resources', mod);

      if (!['info', 'docs', 'examples'].includes(kind)) {
        return c.json(
          {
            error: { code: 'resource_kind_not_supported', message: 'Resource kind not supported' },
          },
          400
        );
      }

      if (!fs.existsSync(base)) {
        return c.json(
          {
            error: {
              code: 'resource_module_not_found',
              message: `Resource module ${mod} not found`,
            },
          },
          404
        );
      }

      if (kind === 'info') {
        const infoPath = path.join(base, 'info.json');
        if (!fs.existsSync(infoPath)) {
          return c.json(
            { error: { code: 'resource_not_found', message: 'Resource not found' } },
            404
          );
        }
        const data = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
        return c.json({
          uri: `resource://${mod}/info`,
          contents: [
            {
              uri: `resource://${mod}/info#info`,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            },
          ],
        });
      }

      const dirPath = path.join(base, kind);
      if (!fs.existsSync(dirPath)) {
        const moduleDir = path.resolve(__dirname, '..', '..', 'mcp_modules', mod);
        const fallbackDir = path.join(moduleDir, 'docs');
        const readmePath = path.join(moduleDir, 'README.md');

        if (fs.existsSync(fallbackDir)) {
          // Minimal local lister for fallback dir (avoid reordering code)
          const listFilesFrom = dir => {
            const out = [];
            const walk = rel => {
              const abs = path.join(dir, rel);
              const entries = fs.readdirSync(abs, { withFileTypes: true });
              for (const e of entries) {
                const nextRel = path.join(rel, e.name);
                if (e.isDirectory()) {
                  walk(nextRel);
                } else {
                  out.push(nextRel);
                }
              }
            };
            walk('.');
            return out;
          };
          const files = listFilesFrom(fallbackDir);
          return c.json({
            uri: `resource://${mod}/${kind}`,
            contents: [
              {
                uri: `resource://${mod}/${kind}#listing`,
                mimeType: 'application/json',
                text: JSON.stringify({ directory: kind, module: mod, files }, null, 2),
              },
            ],
          });
        } else if (fs.existsSync(readmePath)) {
          // Single-file fallback to README.md
          const files = ['README.md'];
          return c.json({
            uri: `resource://${mod}/${kind}`,
            contents: [
              {
                uri: `resource://${mod}/${kind}#listing`,
                mimeType: 'application/json',
                text: JSON.stringify({ directory: kind, module: mod, files }, null, 2),
              },
            ],
          });
        }

        return c.json(
          { error: { code: 'resource_not_found', message: 'Resource not found' } },
          404
        );
      }

      const listFiles = dir => {
        const out = [];
        const walk = rel => {
          const abs = path.join(dir, rel);
          const entries = fs.readdirSync(abs, { withFileTypes: true });
          for (const e of entries) {
            const nextRel = path.join(rel, e.name);
            if (e.isDirectory()) {
              walk(nextRel);
            } else {
              out.push(nextRel);
            }
          }
        };
        walk('.');
        return out;
      };

      const files = listFiles(dirPath);

      return c.json({
        uri: `resource://${mod}/${kind}`,
        contents: [
          {
            uri: `resource://${mod}/${kind}#listing`,
            mimeType: 'application/json',
            text: JSON.stringify({ directory: kind, module: mod, files }, null, 2),
          },
        ],
      });
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'resource_read_failed',
            message: error.message || 'Failed to read resource',
          },
        },
        500
      );
    }
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
