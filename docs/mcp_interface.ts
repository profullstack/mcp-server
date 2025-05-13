/**
 * MCP Server Interface Definition
 * 
 * This file provides TypeScript-like interface definitions for the MCP protocol.
 * It's meant to be used as documentation, not as actual code.
 */

/**
 * Server Information
 */

// GET /
interface ServerInfo {
  name: string;       // Server name
  version: string;    // Server version
  status: string;     // Server status (e.g., "running")
}

// GET /status
interface ServerStatus {
  status: string;       // Server status (e.g., "running")
  activeModel: string;  // ID of the active model, or null if none
  uptime: number;       // Server uptime in seconds
  timestamp: string;    // ISO timestamp
}

// GET /health
interface HealthStatus {
  status: string;       // Overall health status (e.g., "healthy", "degraded")
  checks: {             // Individual component health checks
    [key: string]: string;  // Component name -> status
  };
}

// GET /metrics
interface ServerMetrics {
  uptime: number;       // Server uptime in seconds
  memory: object;       // Memory usage statistics
  cpu: object;          // CPU usage statistics
  // Additional metrics as needed
}

/**
 * Model Management
 */

// GET /models
interface ModelsList {
  models: Model[];      // Array of available models
}

// Model object structure
interface Model {
  id: string;           // Unique model identifier
  name: string;         // Human-readable model name
  version: string;      // Model version
  description: string;  // Model description
  capabilities: string[]; // Array of model capabilities
  status?: string;      // Current status (e.g., "available", "activated")
}

// GET /model/:modelId
// Returns a Model object

// POST /model/:modelId/activate
interface ActivateModelRequest {
  config?: object;      // Optional model configuration
}

interface ActivateModelResponse {
  activeModel: string;  // ID of the activated model
  status: string;       // Activation status (e.g., "activated")
  timestamp: string;    // ISO timestamp
  config?: object;      // Applied configuration
}

// POST /model/deactivate
interface DeactivateModelResponse {
  status: string;       // Deactivation status (e.g., "deactivated")
  previousModel: string; // ID of the previously active model, or null
  timestamp: string;    // ISO timestamp
}

// GET /model/active
interface ActiveModelInfo {
  activeModel: string;  // ID of the active model, or null if none
  modelInfo: object;    // Model-specific information
  timestamp: string;    // ISO timestamp
}

/**
 * Inference
 */

// POST /model/infer or POST /model/:modelId/infer
interface InferenceRequest {
  prompt: string;       // Input prompt
  [key: string]: any;   // Additional model-specific parameters
}

interface InferenceResponse {
  modelId: string;      // ID of the model used for inference
  response: string;     // Model response
  timestamp: string;    // ISO timestamp
}

/**
 * Module Management
 */

// GET /modules
interface ModulesList {
  modules: Module[];    // Array of installed modules
}

// Module object structure
interface Module {
  name: string;         // Module name
  version: string;      // Module version
  description: string;  // Module description
  author?: string;      // Module author
  license?: string;     // Module license
  enabled?: boolean;    // Whether the module is enabled
}

// GET /modules/:moduleId
// Returns a Module object

/**
 * Tools and Resources
 */

// GET /tools
interface ToolsList {
  tools: Tool[];        // Array of available tools
}

// Tool object structure
interface Tool {
  name: string;         // Tool name
  description: string;  // Tool description
  parameters?: object;  // Tool parameters schema
}

// POST /tools/:toolName
// Request and response formats are tool-specific

// GET /resources
interface ResourcesList {
  resources: Resource[]; // Array of available resources
}

// Resource object structure
interface Resource {
  uri: string;          // Resource URI
  description: string;  // Resource description
  type?: string;        // Resource type
}

// GET /resources/:resourceUri
// Response format is resource-specific

/**
 * Error Responses
 */

interface ErrorResponse {
  error: {
    code: string;       // Error code
    message: string;    // Human-readable error message
  };
}