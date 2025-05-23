# MCP Server (Model Context Protocol)

A generic, modular server for implementing the Model Context Protocol (MCP). This server provides a framework for controlling and interacting with various models through a standardized API.

## Features

- Modular architecture for easy extension
- Dynamic module loading
- Core model management functionality
- Standardized API for model context
- Simple configuration system
- Logging utilities
- Enhanced module structure with proper separation of concerns
- Package.json support for modules with dependency management
- Comprehensive testing infrastructure with Mocha and Chai
- Powerful module search functionality
- Module metadata display in API responses
- Integration with real AI model providers (OpenAI, Stability AI, Anthropic, Hugging Face)
- Support for text generation, image generation, and speech-to-text models
- Streaming inference support for compatible models

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- pnpm 10.x or higher

This project uses ES Modules (ESM) exclusively. All imports use the `import` syntax rather than `require()`.

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-server.git
cd mcp-server

# Install dependencies
pnpm install
```

### Running the Server

```bash
# Install dependencies
pnpm install

# Start the server
pnpm start

# Start the server in development mode (with auto-reload)
pnpm dev
```

The server will start on http://localhost:3000 by default.

### Configuration

Copy the sample environment file and edit it with your API keys:

```bash
# Copy the sample environment file
cp sample.env .env

# Edit the file with your favorite editor
nano .env
```

At minimum, you'll need to add API keys for the model providers you want to use:

```
# OpenAI API (for GPT-4 and Whisper)
OPENAI_API_KEY=your_openai_api_key_here

# Stability AI API (for Stable Diffusion)
STABILITY_API_KEY=your_stability_api_key_here

# Anthropic API (for Claude models)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

You can get these API keys from:

- OpenAI: https://platform.openai.com/api-keys
- Stability AI: https://platform.stability.ai/account/keys
- Anthropic: https://console.anthropic.com/settings/keys

### Testing the Server

The repository includes comprehensive testing using Mocha and Chai:

```bash
# Run all tests
pnpm test

# Run only module tests
pnpm test:modules

# Run all tests (both core and modules)
pnpm test:all
```

The testing infrastructure includes:

1. Core server tests for module loading, routing, and other core functionality
2. Module-specific tests for each module's functionality
3. Support for ES modules in tests
4. Mocking and stubbing utilities with Sinon

Tests are organized in a structured way:

- Core tests in `/test/core/`
- Module tests in each module's `test/` directory

This comprehensive testing ensures code quality and makes it easier to detect regressions when making changes.

### Pre-commit Hooks

The repository includes pre-commit hooks using Husky and lint-staged:

```bash
# The hooks are automatically installed when you run
pnpm install
```

The pre-commit hooks:

1. Run ESLint on JavaScript files
2. Run Prettier on all staged files

This ensures that all code committed to the repository follows coding standards and maintains code quality. The test suite is continuously being improved to provide better coverage and reliability, and will be enabled in the pre-commit hook once it's more stable.

### Docker Support

The repository includes Docker support for easy containerization and deployment:

```bash
# Build and run with Docker
docker build -t mcp-server .
docker run -p 3000:3000 mcp-server

# Or use Docker Compose
docker-compose up
```

The Docker configuration:

- Uses Node.js 20 Alpine as the base image
- Exposes port 3000
- Mounts the modules directory as a volume for easy module management
- Includes health checks

## Standard MCP Methods

The MCP server implements a standardized set of methods that all MCP servers should provide:

### Server Information

- `GET /` - Basic server information
- `GET /status` - Detailed server status
- `GET /health` - Health check endpoint
- `GET /metrics` - Server metrics

### Model Management

- `GET /models` - List available models
- `GET /model/:modelId` - Get model information
- `POST /model/:modelId/activate` - Activate a specific model
- `POST /model/deactivate` - Deactivate the current model
- `GET /model/active` - Get information about the active model

### Inference

- `POST /model/infer` - Perform inference with the active model
- `POST /model/:modelId/infer` - Perform inference with a specific model

#### Supported Models

The MCP server supports the following model types:

| Model Type       | Provider     | Capabilities     | Example IDs                    |
| ---------------- | ------------ | ---------------- | ------------------------------ |
| GPT Models       | OpenAI       | Text generation  | gpt-4, gpt-3.5-turbo           |
| Whisper          | OpenAI       | Speech-to-text   | whisper, whisper-1             |
| Stable Diffusion | Stability AI | Image generation | stable-diffusion-xl-1024-v1-0  |
| Claude Models    | Anthropic    | Text generation  | claude-3-opus, claude-3-sonnet |
| Custom Models    | Hugging Face | Various          | (any Hugging Face model ID)    |

#### Inference Examples

Text generation with GPT-4:

```bash
# Activate the model
curl -X POST http://localhost:3000/model/gpt-4/activate \
  -H "Content-Type: application/json" \
  -d '{"config": {"temperature": 0.7}}'

# Perform inference
curl -X POST http://localhost:3000/model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in simple terms",
    "temperature": 0.5,
    "max_tokens": 200
  }'
```

Image generation with Stable Diffusion:

```bash
# Activate the model
curl -X POST http://localhost:3000/model/stable-diffusion/activate \
  -H "Content-Type: application/json" \
  -d '{}'

# Generate an image
curl -X POST http://localhost:3000/model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "height": 1024,
    "width": 1024,
    "steps": 30
  }'
```

Streaming text generation:

```bash
# Enable streaming
curl -X POST http://localhost:3000/model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short story about a robot",
    "stream": true
  }'
```

### Module Management

- `GET /modules` - List installed modules
- `GET /modules/:moduleId` - Get module information
- `GET /modules/search/:query` - Search modules by any field in their package.json or metadata

### Tools and Resources

- `GET /tools` - List available tools
- `GET /resources` - List available resources

For detailed information about these methods, see [MCP Standard Methods](docs/mcp_standard_methods.md).

## Configuration

Configuration is loaded from environment variables and stored in `src/core/config.js`. The easiest way to configure the server is to edit the `.env` file in the project root.

### Environment Variables

Key environment variables include:

| Variable            | Description                          | Default                            |
| ------------------- | ------------------------------------ | ---------------------------------- |
| PORT                | Server port                          | 3000                               |
| HOST                | Server host                          | localhost                          |
| NODE_ENV            | Environment (development/production) | development                        |
| OPENAI_API_KEY      | OpenAI API key                       | (required for OpenAI models)       |
| STABILITY_API_KEY   | Stability AI API key                 | (required for Stable Diffusion)    |
| ANTHROPIC_API_KEY   | Anthropic API key                    | (required for Claude models)       |
| HUGGINGFACE_API_KEY | Hugging Face API key                 | (required for Hugging Face models) |

See `sample.env` for a complete list of configuration options.

## Examples

The repository includes several examples to help you get started:

- **Client Example**: `examples/client.js` demonstrates how to interact with the MCP server from a client application.
- **Custom Module Example**: `examples/custom-module/` shows how to create a custom module that adds a calculator tool to the server.

To run the client example:

```bash
node examples/client.js
```

To use the custom module example, copy it to the modules directory:

```bash
cp -r examples/custom-module mcp_modules/calculator
```

## Creating Modules

Modules are the primary way to extend the MCP server. Each module is a self-contained package that can add new functionality to the server.

### Module Structure

Modules now follow an enhanced structure with better organization:

```
mcp_modules/your-module/
├── assets/          # Static assets (images, CSS, etc.)
├── docs/            # Documentation files
├── examples/        # Example usage
├── src/             # Source code
│   ├── controller.js  # HTTP route handlers
│   ├── service.js     # Business logic
│   └── utils.js       # Utility functions
├── test/            # Test files
│   ├── controller.test.js
│   └── service.test.js
├── index.js         # Main module file with register function
├── package.json     # Module metadata, dependencies, and scripts
└── README.md        # Module documentation
```

Each module should include a `package.json` file with:

- Name, version, description
- Author and license information
- Dependencies and dev dependencies
- Scripts (especially for testing)
- Keywords and other metadata

This structure provides better separation of concerns, makes testing easier, and improves module discoverability.

### Module Implementation

The main module file (`index.js`) must export a `register` function that will be called when the module is loaded:

```javascript
/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  // Register routes, middleware, etc.
  app.get('/your-module/endpoint', c => {
    return c.json({ message: 'Your module is working!' });
  });
}

// Optional: Export module metadata
export const metadata = {
  name: 'Your Module',
  version: '1.0.0',
  description: 'Description of your module',
  author: 'Your Name',
};
```

### Example Modules

- A simple example module is provided in `mcp_modules/example/` to demonstrate how to create a module.
- A more complex example with a calculator tool is provided in `examples/custom-module/`.
- A health check module is provided in `mcp_modules/health-check/` for system monitoring.
- A template for creating new modules is available in `mcp_modules/template/`.

### Creating New Modules

You can create a new module using the provided script:

```bash
# Create a new module
pnpm create-module

# Or with a module name
pnpm create-module my-module
```

The script will:

1. Create a new module directory in `mcp_modules/`
2. Copy the template files
3. Replace placeholders with your module information
4. Provide next steps for implementing your module

## Module Search

The MCP server includes a powerful search functionality that allows you to find modules based on any information in their package.json or metadata.

### Search Endpoints

- `GET /modules/search/:query` - Search for modules containing the specified query string in any field

### Search Examples

```bash
# Find modules by name or description
curl http://localhost:3000/modules/search/craigslist

# Find modules by dependency
curl http://localhost:3000/modules/search/jsdom

# Find modules by keyword
curl http://localhost:3000/modules/search/mcp

# Find modules by author
curl http://localhost:3000/modules/search/"MCP Server Team"

# Find modules by license
curl http://localhost:3000/modules/search/ISC
```

### JavaScript Example

```javascript
// Function to search modules by any field
async function searchModules(query) {
  const response = await fetch(`http://localhost:3000/modules/search/${query}`);
  const data = await response.json();

  console.log(`Found ${data.count} modules matching "${query}":`);
  data.results.forEach(module => {
    console.log(`- ${module.name} (${module.directoryName}): ${module.description}`);
  });

  return data.results;
}
```

The search is comprehensive and will find matches in any field, including nested objects like dependencies, keywords, and other metadata.

## Model Providers

The MCP server integrates with several AI model providers:

### OpenAI

OpenAI provides GPT models for text generation and Whisper for speech-to-text:

```javascript
// Text generation example
const response = await fetch('http://localhost:3000/model/infer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Write a poem about artificial intelligence',
    temperature: 0.7,
    max_tokens: 200,
  }),
});

// Speech-to-text example (requires multipart form data)
const formData = new FormData();
formData.append('file', audioFile);
formData.append('model', 'whisper-1');
formData.append('language', 'en');

const response = await fetch('http://localhost:3000/model/whisper/infer', {
  method: 'POST',
  body: formData,
});
```

### Stability AI

Stability AI provides Stable Diffusion for image generation:

```javascript
const response = await fetch('http://localhost:3000/model/infer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A photorealistic image of a futuristic city',
    height: 1024,
    width: 1024,
    steps: 30,
    cfg_scale: 7,
  }),
});

// The response includes base64-encoded images
const result = await response.json();
const imageBase64 = result.response[0].base64;
```

### Anthropic

Anthropic provides Claude models for text generation:

```javascript
const response = await fetch('http://localhost:3000/model/infer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Explain how neural networks work',
    temperature: 0.5,
    max_tokens: 300,
  }),
});
```

### Hugging Face

Hugging Face provides access to thousands of open-source models:

```javascript
const response = await fetch('http://localhost:3000/model/custom-model-name/infer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Input for the model',
    parameters: {
      // Model-specific parameters
    },
  }),
});
```

## Documentation

- [MCP Standard Methods](docs/mcp_standard_methods.md): Documentation of the standard methods that all MCP servers should implement.
- [MCP Interface](docs/mcp_interface.ts): TypeScript interface definitions for the MCP protocol.
- [Architecture](docs/architecture.md): Overview of the MCP server architecture.

## License

ISC
