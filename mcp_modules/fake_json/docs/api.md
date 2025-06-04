# Fake JSON Module API Documentation

This document provides detailed information about the Fake JSON Module API endpoints and usage.

## HTTP Endpoints

### Get Module Information

```
GET /fake_json
```

Returns basic information about the module, including its status and version.

**Example Response:**

```json
{
  "module": "fake_json",
  "status": "active",
  "message": "This module generates fake JSON responses for any endpoint",
  "version": "1.0.0"
}
```

### Generate JSON for Any Endpoint

```
GET /fake_json/*
```

Generates a JSON response for any endpoint path. The path after `/fake_json/` is used to determine the content of the response.

**Query Parameters:**

- `fields` (optional): Comma-separated list of fields to include in the response

**Example Requests:**

```
GET /fake_json/users/123
GET /fake_json/products?fields=id,name,price
GET /fake_json/weather/forecast
```

**Example Response for `/fake_json/users/123`:**

```json
{
  "id": 123,
  "name": "John Smith",
  "email": "john.smith@example.com",
  "age": 32,
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345"
  },
  "phoneNumber": "555-123-4567",
  "registeredAt": "2023-01-15T08:30:00Z"
}
```

## MCP Tool

### Tool Information

```
GET /tools/fake_json/info
```

Returns information about the fake_json tool, including its parameters.

**Example Response:**

```json
{
  "name": "fake_json",
  "description": "Generate fake JSON responses for any endpoint",
  "parameters": {
    "endpoint": {
      "type": "string",
      "description": "The endpoint path to generate JSON for (e.g., /users, /products/123)",
      "required": true
    },
    "fields": {
      "type": "string",
      "description": "Comma-separated list of fields to include in the response",
      "required": false
    }
  }
}
```

### Use Tool

```
POST /tools/fake_json
```

Generates a JSON response for the specified endpoint.

**Request Body:**

```json
{
  "endpoint": "/users/123",
  "fields": "id,name,email"
}
```

**Example Response:**

```json
{
  "tool": "fake_json",
  "endpoint": "/users/123",
  "result": {
    "id": 123,
    "name": "John Smith",
    "email": "john.smith@example.com"
  },
  "timestamp": "2023-06-04T11:05:28.123Z"
}
```

## Using the Tool in Other Modules

To use the fake_json tool in other modules, you can use the MCP tool interface:

```javascript
const result = await useMcpTool({
  server_name: 'mcp-server',
  tool_name: 'fake_json',
  arguments: {
    endpoint: '/users/123',
    fields: 'id,name,email,address',
  },
});

console.log(result);
```

## Error Handling

If an error occurs, the API will return a JSON response with an error message:

```json
{
  "error": "Error message",
  "path": "/fake_json/users/123",
  "timestamp": "2023-06-04T11:05:28.123Z"
}
```

Common error scenarios:

- Invalid JSON format in the AI response
- Inference timeout
- Model not available
