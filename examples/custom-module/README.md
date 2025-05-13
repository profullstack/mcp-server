# Calculator Module Example

This is an example of a custom module for the MCP server. It adds a simple calculator tool that can perform basic arithmetic operations.

## Features

- Adds a calculator tool to the MCP server
- Supports basic arithmetic operations (add, subtract, multiply, divide)
- Demonstrates how to create a custom module with tools

## Installation

To use this module, copy the `custom-module` directory to the `src/modules` directory of your MCP server:

```bash
cp -r examples/custom-module src/modules/calculator
```

The module will be automatically loaded when the server starts.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tools/calculator/info` | GET | Get information about the calculator tool |
| `/tools/calculator` | POST | Perform a calculation |
| `/modules/calculator` | GET | Get information about the calculator module |

## Usage Examples

### Get Calculator Tool Information

```javascript
fetch('http://localhost:3000/tools/calculator/info')
  .then(response => response.json())
  .then(data => console.log(data));
```

Response:
```json
{
  "name": "calculator",
  "description": "Performs basic arithmetic operations",
  "parameters": {
    "operation": {
      "type": "string",
      "description": "The operation to perform (add, subtract, multiply, divide)",
      "required": true
    },
    "a": {
      "type": "number",
      "description": "The first operand",
      "required": true
    },
    "b": {
      "type": "number",
      "description": "The second operand",
      "required": true
    }
  }
}
```

### Perform a Calculation

```javascript
fetch('http://localhost:3000/tools/calculator', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    operation: 'add',
    a: 5,
    b: 3
  })
})
  .then(response => response.json())
  .then(data => console.log(data));
```

Response:
```json
{
  "tool": "calculator",
  "operation": "add",
  "a": 5,
  "b": 3,
  "result": 8,
  "timestamp": "2025-05-12T14:30:00Z"
}
```

## How It Works

The module exports three main components:

1. A `register` function that sets up the module's routes and functionality
2. An `unregister` function for cleanup (optional)
3. A `metadata` object with information about the module

When the MCP server starts, it calls the module's `register` function, passing in the Hono app instance. The module then registers its routes and functionality with the app.

The calculator tool is implemented as a simple function that takes an operation and two operands, performs the calculation, and returns the result.