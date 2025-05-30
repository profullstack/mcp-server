# Scanner Module

A comprehensive web application security scanning module for MCP server that integrates with the [@profullstack/scanner](https://github.com/profullstack/scanner) package.

## Directory Structure

```
scanner/
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

- Comprehensive web application security scanning
- Integration with multiple security tools (Nikto, ZAP, Wapiti, Nuclei, SQLMap)
- Scan history management
- Detailed vulnerability reporting
- Multiple report formats (JSON, HTML, PDF, CSV)
- OWASP compliance

## API Endpoints

| Endpoint                      | Method | Description                  |
| ----------------------------- | ------ | ---------------------------- |
| `/scanner`                    | GET    | Get module information       |
| `/scanner/scans`              | GET    | Get scan history             |
| `/scanner/scans/:id`          | GET    | Get scan by ID               |
| `/scanner/stats`              | GET    | Get scan statistics          |
| `/scanner/scan`               | POST   | Perform a security scan      |
| `/scanner/reports/:id`        | GET    | Generate a report for a scan |
| `/scanner/reports/:id/export` | GET    | Export a report for a scan   |
| `/tools/scanner`              | POST   | Scanner tool endpoint        |

For detailed API documentation, see [docs/api.md](docs/api.md).

## MCP Tool

This module provides an MCP tool that can be used by other modules:

```javascript
// Example of using the scanner tool in another module
const result = await useScannerModule({
  action: 'scan',
  target: 'https://example.com',
  tools: ['nikto', 'nuclei'],
  verbose: true,
  timeout: 300,
});
```

## Usage Examples

See the [examples](examples/) directory for complete usage examples.

Basic example:

```javascript
// Perform a security scan
const scanResponse = await fetch('http://localhost:3000/scanner/scan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    target: 'https://example.com',
    tools: ['nikto', 'wapiti', 'nuclei'],
    verbose: true,
    timeout: 300,
  }),
});

// Get scan history
const historyResponse = await fetch('http://localhost:3000/scanner/scans?limit=10');
const history = await historyResponse.json();
```

## Testing

The module includes tests using Mocha and Chai in the [test](test/) directory.

To run the tests:

```bash
# Run just this module's tests
cd mcp_modules/scanner
pnpm test

# Or run from the project root
pnpm test:modules
```

## Customizing

You can customize the scanner module by:

1. Modifying the scan options in the service.js file
2. Adding support for additional security tools
3. Customizing the report formats
4. Implementing additional endpoints

## Dependencies

This module requires:

- [@profullstack/scanner](https://github.com/profullstack/scanner) package
- Hono framework (provided by the MCP server)
- Node.js v18 or higher

## Security Tools

The scanner module supports the following security tools:

- **Nikto**: Web server scanner
- **OWASP ZAP**: Web application security scanner
- **Wapiti**: Web application vulnerability scanner
- **Nuclei**: Vulnerability scanner
- **SQLMap**: SQL injection scanner

These tools must be installed separately on the system for the scanner to use them.

## License

MIT
