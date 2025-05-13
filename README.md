# MCP Server (Model Control Protocol)

A generic, modular server for implementing the Model Control Protocol (MCP). This server provides a framework for controlling and interacting with various models through a standardized API.

## Features

- Modular architecture for easy extension
- Dynamic module loading
- Core model management functionality
- Standardized API for model control
- Simple configuration system
- Logging utilities
- Enhanced module structure with proper separation of concerns
- Package.json support for modules with dependency management
- Comprehensive testing infrastructure with Mocha and Chai
- Powerful module search functionality
- Module metadata display in API responses

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- pnpm 10.x or higher

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

### Module Management

- `GET /modules` - List installed modules
- `GET /modules/:moduleId` - Get module information
- `GET /modules/search/:query` - Search modules by any field in their package.json or metadata

### Tools and Resources

- `GET /tools` - List available tools
- `GET /resources` - List available resources

For detailed information about these methods, see [MCP Standard Methods](docs/mcp_standard_methods.md).

## Configuration

Configuration is stored in `src/core/config.js`. You can modify this file to change server settings.

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
cp -r examples/custom-module src/modules/calculator
```

## Creating Modules

Modules are the primary way to extend the MCP server. Each module is a self-contained package that can add new functionality to the server.

### Module Structure

Modules now follow an enhanced structure with better organization:

```
src/modules/your-module/
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

- A simple example module is provided in `src/modules/example/` to demonstrate how to create a module.
- A more complex example with a calculator tool is provided in `examples/custom-module/`.
- A health check module is provided in `src/modules/health-check/` for system monitoring.
- A template for creating new modules is available in `src/modules/template/`.

### Creating New Modules

You can create a new module using the provided script:

```bash
# Create a new module
pnpm create-module

# Or with a module name
pnpm create-module my-module
```

The script will:

1. Create a new module directory in `src/modules/`
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

## Documentation

- [MCP Standard Methods](docs/mcp_standard_methods.md): Documentation of the standard methods that all MCP servers should implement.
- [MCP Interface](docs/mcp_interface.ts): TypeScript interface definitions for the MCP protocol.
- [Architecture](docs/architecture.md): Overview of the MCP server architecture.

## License

ISC
