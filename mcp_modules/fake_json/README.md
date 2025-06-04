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
- `apiKey` - Your OpenAI API key (if the server doesn't have one configured)

Examples:

```
GET /fake_json/users?fields=id,name,email
GET /fake_json/products?apiKey=sk-your-openai-api-key
GET /fake_json/weather?fields=temperature,humidity&apiKey=sk-your-openai-api-key
```

You can also pass the API key as an HTTP header:

```
x-api-key: sk-your-openai-api-key
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
    apiKey: 'sk-your-openai-api-key', // Optional: Your OpenAI API key
  },
});
```

## Usage Examples

See the [examples](examples/) directory for complete usage examples.

### JavaScript Examples

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

### Curl Examples

Using the public mcp.profullstack.com instance:

```bash
# Get module information
curl "https://mcp.profullstack.com/fake_json"

# Get fake user data
curl "https://mcp.profullstack.com/fake_json/users/123"

# Get fake product data with specific fields
curl "https://mcp.profullstack.com/fake_json/products?fields=id,name,price,description"

# Get fake blog posts
curl "https://mcp.profullstack.com/fake_json/blog/posts"

# Get fake weather data
curl "https://mcp.profullstack.com/fake_json/weather/forecast/daily"

# Get fake API settings
curl "https://mcp.profullstack.com/fake_json/api/settings"

# Using your OpenAI API key as a query parameter (replace with your actual key)
curl "https://mcp.profullstack.com/fake_json/users/123?apiKey=sk-your-openai-api-key"

# Using your OpenAI API key with the header approach for GET requests
curl -H "x-api-key: sk-your-openai-api-key" "https://mcp.profullstack.com/fake_json/products"

# Using your OpenAI API key with the header approach for GET requests with fields
curl -H "x-api-key: sk-your-openai-api-key" "https://mcp.profullstack.com/fake_json/products?fields=id,name,price"

# Use the MCP tool endpoint
curl -X POST "https://mcp.profullstack.com/tools/fake_json" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/users/123",
    "fields": "id,name,email,address",
    "apiKey": "sk-your-openai-api-key"
  }'
```

Note: When using curl with URLs that contain query parameters (like `?fields=...`), it's important to enclose the URL in quotes to prevent the shell from interpreting special characters like `?` and `&` as shell wildcards or operators.

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
