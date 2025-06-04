# Fake JSON Module

A module that generates fake JSON responses for any endpoint using AI inference.

## Overview

The Fake JSON Module is inspired by the "Anything API" concept. It uses AI inference to generate realistic JSON responses for any endpoint path. This is useful for:

- Prototyping applications without a real backend
- Testing frontend components with realistic data
- Generating sample data for documentation
- Creating mock APIs for development

## Directory Structure

```
fake_json/
├── assets/            # Static assets (images, CSS, etc.)
├── docs/              # Documentation files
│   └── api.md         # API documentation
├── examples/          # Example usage
│   └── basic-usage.js # Basic usage example
├── src/               # Source code
│   ├── controller.js  # HTTP route handlers
│   ├── service.js     # Business logic
│   └── utils.js       # Utility functions
├── test/              # Test files
│   └── service.test.js # Service tests
├── index.js           # Main module entry point
└── README.md          # This file
```

## Features

- Generate JSON responses for any endpoint path
- Specify fields to include in the response
- Response caching to reduce API calls
- CORS support for cross-origin requests
- MCP tool integration for use in other modules

## API Endpoints

| Endpoint           | Method | Description                         |
| ------------------ | ------ | ----------------------------------- |
| `/fake_json`       | GET    | Get module information              |
| `/fake_json/*`     | GET    | Generate JSON for any endpoint path |
| `/tools/fake_json` | POST   | Fake JSON tool endpoint             |

## Query Parameters

When making requests to `/fake_json/*`, you can use the following query parameters:

- `fields` - Comma-separated list of fields to include in the response

Example:

```
GET /fake_json/users?fields=id,name,email
```

## MCP Tool

This module provides an MCP tool that can be used by other modules:

```javascript
// Example of using the fake_json tool in another module
const result = await useMcpTool({
  server_name: 'mcp-server',
  tool_name: 'fake_json',
  arguments: {
    endpoint: '/users/123',
    fields: 'id,name,email',
  },
});
```

## Usage Examples

See the [examples](examples/) directory for complete usage examples.

Basic example:

```javascript
// Get fake user data
const response = await fetch('http://localhost:3000/fake_json/users/123');
const userData = await response.json();
console.log(userData);

// Get fake product data with specific fields
const productsResponse = await fetch(
  'http://localhost:3000/fake_json/products?fields=id,name,price'
);
const productsData = await productsResponse.json();
console.log(productsData);
```

## How It Works

1. The module receives a request to a path like `/fake_json/users/123`
2. It extracts the endpoint path (`/users/123`) and any query parameters
3. It creates a system prompt for the AI based on the endpoint and requested fields
4. It uses the MCP server's model manager to perform inference with the prompt
5. It parses the AI's response to ensure it's valid JSON
6. It caches the response for future requests to the same endpoint
7. It returns the JSON response with appropriate CORS headers

## Dependencies

This module requires:

- MCP server with a configured language model (GPT-4 by default)
- Hono framework (provided by the MCP server)
- Node.js v18 or higher

## License

ISC
