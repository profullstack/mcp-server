# Test Module

A test module created to demonstrate the new module structure.

## Directory Structure

```
test-module/
├── assets/            # Static assets (images, CSS, etc.)
├── docs/              # Documentation files
├── examples/          # Example usage
├── src/               # Source code
├── test/              # Test files
├── index.js           # Main module entry point
└── README.md          # This file
```

## Features

- Demonstrates the new module structure
- Provides a basic endpoint for testing

## API Endpoints

| Endpoint       | Method | Description            |
| -------------- | ------ | ---------------------- |
| `/test-module` | GET    | Get module information |

## Usage

```javascript
// Example of accessing the test module
fetch('http://localhost:3000/test-module')
  .then(response => response.json())
  .then(data => console.log(data));
```

## License

ISC
