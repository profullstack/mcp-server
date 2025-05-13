# MCP Standard Methods

This document outlines the standard methods that all Model Control Protocol (MCP) servers should implement to ensure compatibility and interoperability.

## Core Methods

### Server Information

- **GET /** - Basic server information
  - Returns: Server name, version, status
  - Example response: `{ "name": "MCP Server", "version": "1.0.0", "status": "running" }`

- **GET /status** - Detailed server status
  - Returns: Server status, active model, uptime, timestamp
  - Example response: `{ "status": "running", "activeModel": "gpt-4", "uptime": 3600, "timestamp": "2025-05-12T14:30:00Z" }`

### Model Management

- **GET /models** - List available models
  - Returns: Array of available models with their metadata
  - Example response: `{ "models": [{ "id": "gpt-4", "name": "GPT-4", "version": "1.0" }] }`

- **GET /model/:modelId** - Get model information
  - Returns: Detailed information about a specific model
  - Example response: `{ "id": "gpt-4", "name": "GPT-4", "version": "1.0", "capabilities": ["text-generation", "embeddings"] }`

- **POST /model/:modelId/activate** - Activate a model
  - Request body: Optional configuration parameters
  - Returns: Activation status and model ID
  - Example response: `{ "activeModel": "gpt-4", "status": "activated" }`

- **POST /model/deactivate** - Deactivate the current model
  - Returns: Deactivation status
  - Example response: `{ "status": "deactivated", "previousModel": "gpt-4" }`

- **GET /model/active** - Get active model information
  - Returns: Information about the currently active model
  - Example response: `{ "activeModel": "gpt-4", "modelInfo": { "status": "activated", "activatedAt": "2025-05-12T14:00:00Z" } }`

### Inference

- **POST /model/infer** - Perform inference with the active model
  - Request body: Input data for inference (prompt, parameters, etc.)
  - Returns: Model response
  - Example request: `{ "prompt": "Hello, how are you?", "max_tokens": 100 }`
  - Example response: `{ "modelId": "gpt-4", "response": "I'm doing well, thank you for asking!" }`

- **POST /model/:modelId/infer** - Perform inference with a specific model
  - Request body: Input data for inference
  - Returns: Model response
  - Example request: `{ "prompt": "Hello, how are you?", "max_tokens": 100 }`
  - Example response: `{ "modelId": "gpt-4", "response": "I'm doing well, thank you for asking!" }`

#### Inference Parameters

The inference endpoints accept different parameters depending on the model type:

##### Text Generation Models (GPT, Claude)

```json
{
  "prompt": "Your prompt text here",
  "temperature": 0.7,           // Controls randomness (0.0 to 1.0)
  "max_tokens": 100,            // Maximum tokens to generate
  "top_p": 0.9,                 // Nucleus sampling parameter
  "stream": false               // Set to true for streaming responses
}
```

##### Image Generation Models (Stable Diffusion)

```json
{
  "prompt": "A description of the image to generate",
  "height": 1024,               // Image height in pixels
  "width": 1024,                // Image width in pixels
  "steps": 30,                  // Number of diffusion steps
  "cfg_scale": 7,               // How closely to follow the prompt
  "samples": 1                  // Number of images to generate
}
```

##### Speech-to-Text Models (Whisper)

For Whisper models, use multipart form data with the following fields:
- `file`: The audio file to transcribe
- `model`: The model to use (e.g., "whisper-1")
- `language`: Optional language code (e.g., "en")
- `temperature`: Controls randomness (0.0 to 1.0)
- `response_format`: Format of the response (json, text, srt, etc.)

#### Streaming Responses

For streaming responses, set `stream: true` in the request body. The response will be in Server-Sent Events (SSE) format with `Content-Type: text/event-stream`.

Example streaming request:
```json
{
  "prompt": "Write a short story",
  "stream": true
}
```

### Tools and Resources

- **GET /tools** - List available tools
  - Returns: Array of available tools with their metadata
  - Example response: `{ "tools": [{ "name": "calculator", "description": "Performs calculations" }] }`

- **POST /tools/:toolName** - Execute a tool
  - Request body: Tool input parameters
  - Returns: Tool execution result
  - Example request: `{ "expression": "2 + 2" }`
  - Example response: `{ "result": 4 }`

- **GET /resources** - List available resources
  - Returns: Array of available resources with their metadata
  - Example response: `{ "resources": [{ "uri": "weather://san-francisco", "description": "Weather data for San Francisco" }] }`

- **GET /resources/:resourceUri** - Access a resource
  - Returns: Resource data
  - Example response: `{ "temperature": 72, "conditions": "sunny" }`

## Module Management

- **GET /modules** - List installed modules
  - Returns: Array of installed modules with their metadata
  - Example response: `{ "modules": [{ "name": "weather", "version": "1.0.0", "status": "active" }] }`

- **GET /modules/:moduleId** - Get module information
  - Returns: Detailed information about a specific module
  - Example response: `{ "name": "weather", "version": "1.0.0", "description": "Weather forecasting module", "endpoints": ["/weather/forecast"] }`

- **POST /modules/:moduleId/enable** - Enable a module
  - Returns: Module status
  - Example response: `{ "name": "weather", "status": "enabled" }`

- **POST /modules/:moduleId/disable** - Disable a module
  - Returns: Module status
  - Example response: `{ "name": "weather", "status": "disabled" }`

## Health and Monitoring

- **GET /health** - Health check endpoint
  - Returns: Health status of the server
  - Example response: `{ "status": "healthy", "checks": { "database": "connected", "models": "available" } }`

- **GET /metrics** - Server metrics
  - Returns: Performance metrics and statistics
  - Example response: `{ "requests": 1000, "averageResponseTime": 250, "errorRate": 0.01 }`

## Implementation Notes

- All endpoints should return JSON responses
- Error responses should follow a consistent format:
  ```json
  {
    "error": {
      "code": "error_code",
      "message": "Human-readable error message"
    }
  }
  ```
- Authentication and authorization mechanisms are implementation-specific but should be consistent across endpoints
- Rate limiting and quota management should be implemented as appropriate