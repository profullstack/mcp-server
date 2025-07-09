# Template Module

A comprehensive template for creating new MCP server modules with a structured directory layout and best practices.

## Directory Structure

```
template/
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

- Complete module structure with separation of concerns
- RESTful API for managing items
- MCP tool integration
- Comprehensive documentation
- Example code and tests
- Asset management

## API Endpoints

| Endpoint                      | Method | Description            |
| ----------------------------- | ------ | ---------------------- |
| `/template`                   | GET    | Get module information |
| `/template/items`             | GET    | Get all items          |
| `/template/items/:id`         | GET    | Get item by ID         |
| `/template/items`             | POST   | Create a new item      |
| `/template/items/:id`         | PUT    | Update an item         |
| `/template/items/:id`         | DELETE | Delete an item         |
| `/template/items/:id/process` | POST   | Process an item        |
| `/tools/template`             | POST   | Template tool endpoint |

For detailed API documentation, see [docs/api.md](docs/api.md).

## MCP Tool

This module provides an MCP tool that can be used by other modules:

````javascript
// Example of using the template tool in another module
const result = await useTemplateModule({
  action: 'create',
  item: {
    id: 'mcp-example',
    name: 'MCP Example Item',
    value: 100,
  },
});

## Testing Setup

This template includes a complete testing setup with Mocha, Chai, and Sinon:

### Running Tests

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run with verbose output
TEST_VERBOSE=1 pnpm test
````

### Test Structure

- **Mocha**: Test runner with ESM support
- **Chai**: Assertion library with expect syntax
- **Sinon**: Mocking and stubbing library
- **sinon-chai**: Chai assertions for Sinon

### Global Test Utilities

The test setup provides global utilities available in all test files:

```javascript
// Assertions
expect(value).to.equal(expected);
expect(stub).to.have.been.called;

// Mocking
const stub = sinon.stub(object, 'method');
const spy = sinon.spy();

// Mock factories
const mockContext = createMockContext();
const mockService = createMockService();
```

### Test File Examples

**Service Tests** (`test/service.test.js`):

```javascript
describe('Service Function', () => {
  it('should return expected result', () => {
    const result = serviceFunction('input');
    expect(result).to.equal('expected');
  });
});
```

**Controller Tests** (`test/controller.test.js`):

```javascript
describe('Controller Endpoint', () => {
  it('should handle request correctly', async () => {
    const mockContext = createMockContext();
    mockContext.req.json.resolves({ data: 'test' });

    await controllerFunction(mockContext);

    expect(mockContext.json).to.have.been.called;
  });
});
```

### Code Quality

```bash
# Lint code
pnpm run lint

# Format code
pnpm run format
```

### Configuration Files

- `.mocharc.json` - Mocha test configuration
- `.eslintrc.json` - ESLint rules and settings
- `.prettierrc` - Code formatting rules
- `test/setup.js` - Test environment setup

````

## Usage Examples

See the [examples](examples/) directory for complete usage examples.

Basic example:

```javascript
// Create an item
const createResponse = await fetch('http://localhost:3000/template/items', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: 'example1',
    name: 'Example Item',
    description: 'This is an example item',
  }),
});

// Get all items
const getAllResponse = await fetch('http://localhost:3000/template/items');
const items = await getAllResponse.json();
````

## Testing

The module includes comprehensive tests using Mocha and Chai in the [test](test/) directory. These tests demonstrate how to test the module's functionality.

To run the tests:

```bash
# Run just this module's tests
cd src/modules/template
pnpm test

# Or run from the project root
pnpm test:modules
```

The tests include:

- Unit tests for the service layer
- Controller tests with request/response mocking
- Integration tests for the API endpoints

The testing infrastructure uses:

- Mocha as the test runner
- Chai for assertions
- Sinon for mocking and stubbing

Example test:

```javascript
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { TemplateService } from '../src/service.js';

describe('TemplateService', () => {
  it('should return all items', () => {
    const service = new TemplateService();
    service.createItem({ id: 'test1', name: 'Test 1' });

    const items = service.getAllItems();
    expect(items).to.be.an('array').with.lengthOf(1);
    expect(items[0].id).to.equal('test1');
  });
});
```

## Customizing

When creating a new module based on this template:

1. Copy the entire directory to a new location
2. Rename all occurrences of "template" to your module name
3. Update the metadata in index.js
4. Implement your specific functionality in the src/ directory
5. Update the documentation and examples

## Package.json

This module includes a package.json file with:

```json
{
  "name": "mcp-module-template",
  "version": "1.0.0",
  "description": "A template for creating new MCP server modules",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "test": "mocha test/**/*.test.js"
  },
  "keywords": ["mcp", "module", "template"],
  "author": "Your Name",
  "license": "ISC",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {},
  "devDependencies": {
    "chai": "^4.3.7",
    "mocha": "^10.2.0",
    "sinon": "^15.0.3"
  }
}
```

When creating a new module, make sure to update the package.json with your module's specific information.

## Dependencies

This module requires:

- Hono framework (provided by the MCP server)
- Node.js v18 or higher
- Mocha, Chai, and Sinon for testing (as dev dependencies)

## License

ISC
