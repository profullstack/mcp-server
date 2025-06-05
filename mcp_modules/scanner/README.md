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

### Fetch Examples

```javascript
// Perform a security scan with nuclei
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
const scanResult = await scanResponse.json();
console.log('Scan ID:', scanResult.scanId);

// Get scan history
const historyResponse = await fetch('http://localhost:3000/scanner/scans?limit=10');
const history = await historyResponse.json();
console.log('Recent scans:', history.scans);

// Get specific scan details
const scanId = 'scan-1621234567890';
const scanDetailsResponse = await fetch(`http://localhost:3000/scanner/scans/${scanId}`);
const scanDetails = await scanDetailsResponse.json();
console.log('Scan details:', scanDetails.scan);

// Generate a report
const reportResponse = await fetch(`http://localhost:3000/scanner/reports/${scanId}?format=json`);
const report = await reportResponse.json();

// Use MCP tool endpoint
const mcpToolResponse = await fetch('http://localhost:3000/tools/scanner', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'scan',
    target: 'https://example.com',
    tools: ['nuclei'],
    verbose: true,
    timeout: 300,
  }),
});
const mcpResult = await mcpToolResponse.json();
```

### cURL Examples

```bash
# Perform a security scan with nuclei
curl -X POST http://localhost:3000/scanner/scan \
  -H "Content-Type: application/json" \
  -d '{
    "target": "https://example.com",
    "tools": ["nuclei"],
    "verbose": true,
    "timeout": 300
  }'

# Perform a comprehensive scan with multiple tools
curl -X POST http://localhost:3000/scanner/scan \
  -H "Content-Type: application/json" \
  -d '{
    "target": "https://example.com",
    "tools": ["nikto", "wapiti", "nuclei"],
    "verbose": true,
    "timeout": 600,
    "toolOptions": {
      "nikto": {
        "tuning": "x"
      },
      "nuclei": {
        "severity": "medium,high,critical"
      }
    }
  }'

# Get scan history
curl http://localhost:3000/scanner/scans?limit=5

# Get specific scan details
curl http://localhost:3000/scanner/scans/scan-1621234567890

# Get scan statistics
curl http://localhost:3000/scanner/stats

# Generate HTML report
curl "http://localhost:3000/scanner/reports/scan-1621234567890?format=html"

# Export report to file
curl "http://localhost:3000/scanner/reports/scan-1621234567890/export?format=json&destination=/tmp/scan-report.json"

# Use MCP tool endpoint
curl -X POST http://localhost:3000/tools/scanner \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scan",
    "target": "https://example.com",
    "tools": ["nuclei"],
    "verbose": true
  }'

# Get scan history via MCP tool
curl -X POST http://localhost:3000/tools/scanner \
  -H "Content-Type: application/json" \
  -d '{
    "action": "history",
    "limit": 10
  }'

# Get scan statistics via MCP tool
curl -X POST http://localhost:3000/tools/scanner \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stats"
  }'
```

### Nuclei-Specific Examples

```bash
# Scan with nuclei only
curl -X POST http://localhost:3000/scanner/scan \
  -H "Content-Type: application/json" \
  -d '{
    "target": "https://example.com",
    "tools": ["nuclei"],
    "verbose": true,
    "timeout": 300
  }'

# Nuclei scan with custom severity filter
curl -X POST http://localhost:3000/scanner/scan \
  -H "Content-Type: application/json" \
  -d '{
    "target": "https://example.com",
    "tools": ["nuclei"],
    "toolOptions": {
      "nuclei": {
        "severity": "high,critical",
        "tags": "cve,rce"
      }
    },
    "timeout": 600
  }'
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
