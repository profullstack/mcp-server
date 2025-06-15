# Domain Lookup Module

A comprehensive MCP server module for domain availability checking and brainstorming using the [tldx](https://github.com/brandonyoungdev/tldx) CLI tool.

## Features

- **Domain Availability Checking**: Check if specific domains are available for registration
- **Domain Suggestion Generation**: Generate domain suggestions with prefixes, suffixes, and TLDs
- **TLD Presets**: Use curated TLD sets (popular, tech, business, creative, etc.)
- **Bulk Domain Checking**: Check multiple keywords with various combinations
- **Multiple Output Formats**: Support for text, JSON, CSV, and streaming formats
- **Advanced Filtering**: Filter by availability, domain length, and more
- **Statistics**: Get detailed statistics about domain availability

## Prerequisites

This module requires the `tldx` CLI tool to be installed on your system.

### Installing tldx

#### macOS (Homebrew)

```bash
brew install brandonyoungdev/tldx/tldx
```

#### Arch Linux (AUR)

```bash
# Using yay
yay -S tldx

# Or build from source
yay -S tldx-bin
```

#### Go (Install from Source)

```bash
go install github.com/brandonyoungdev/tldx@latest
```

#### Manual Installation

Visit the [tldx releases page](https://github.com/brandonyoungdev/tldx/releases) and download the appropriate binary for your system.

## Installation

```bash
cd mcp_modules/domain_lookup
pnpm install
```

## Usage

### MCP Tools

The module provides four main MCP tools:

#### 1. Check Domain Availability

Check if specific domains are available:

```json
{
  "tool": "check_domain_availability",
  "parameters": {
    "domains": ["example.com", "test.org", "mysite.io"],
    "format": "json",
    "onlyAvailable": true
  }
}
```

#### 2. Generate Domain Suggestions

Generate domain suggestions from a keyword:

```json
{
  "tool": "generate_domain_suggestions",
  "parameters": {
    "keyword": "openai",
    "prefixes": ["get", "my", "use"],
    "suffixes": ["ly", "hub", "app"],
    "tlds": ["com", "io", "ai"],
    "onlyAvailable": true,
    "maxDomainLength": 20
  }
}
```

#### 3. Get TLD Presets

Get available TLD presets:

```json
{
  "tool": "get_tld_presets",
  "parameters": {}
}
```

#### 4. Bulk Domain Check

Check multiple keywords with combinations:

```json
{
  "tool": "bulk_domain_check",
  "parameters": {
    "keywords": ["openai", "google", "facebook"],
    "prefixes": ["get", "my"],
    "suffixes": ["ly", "hub"],
    "tldPreset": "popular",
    "onlyAvailable": true,
    "showStats": true
  }
}
```

### HTTP Endpoints

#### Basic Module Info

```
GET /domain-lookup
```

#### Check Domain Availability

```
POST /domain-lookup/check
Content-Type: application/json

{
  "domains": ["example.com", "test.org"],
  "format": "json"
}
```

#### Generate Domain Suggestions

```
POST /domain-lookup/suggest
Content-Type: application/json

{
  "keyword": "openai",
  "prefixes": ["get", "my"],
  "tlds": ["com", "io", "ai"]
}
```

#### Get TLD Presets

```
GET /domain-lookup/presets
```

#### Bulk Domain Check

```
POST /domain-lookup/bulk
Content-Type: application/json

{
  "keywords": ["openai", "google"],
  "tlds": ["com", "io"],
  "onlyAvailable": true
}
```

## Parameters

### Common Parameters

- **`format`** (string): Output format - `text`, `json`, `json-stream`, `json-array`, `csv`
- **`onlyAvailable`** (boolean): Show only available domains
- **`maxDomainLength`** (integer): Maximum domain name length (1-253)
- **`verbose`** (boolean): Show verbose output
- **`showStats`** (boolean): Show statistics at the end

### Domain Generation Parameters

- **`prefixes`** (array): Prefixes to add (e.g., `["get", "my", "use"]`)
- **`suffixes`** (array): Suffixes to add (e.g., `["ly", "hub", "ify"]`)
- **`tlds`** (array): TLDs to check (e.g., `["com", "io", "ai"]`)
- **`tldPreset`** (string): Use a TLD preset (`popular`, `tech`, `business`, etc.)

### TLD Presets

Available presets include:

- **`popular`**: com, co, io, net, org, ai
- **`tech`**: io, ai, dev, tech, app, cloud
- **`business`**: com, co, biz, ltd, llc, inc
- **`creative`**: art, design, ink, studio, gallery
- **`geo`**: au, de, us, eu, uk, ca

## Response Format

### Success Response

```json
{
  "success": true,
  "domains": [
    {
      "domain": "example.com",
      "available": true,
      "status": "available"
    },
    {
      "domain": "google.com",
      "available": false,
      "status": "not available"
    }
  ],
  "format": "json",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Error Response

```json
{
  "error": "tldx command failed: command not found"
}
```

## Examples

### Basic Domain Check

```javascript
// Check if domains are available
const response = await fetch('/domain-lookup/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domains: ['myawesomesite.com', 'coolapp.io'],
  }),
});

const result = await response.json();
console.log(result.domains);
```

### Domain Brainstorming

```javascript
// Generate domain suggestions for a startup
const response = await fetch('/domain-lookup/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: 'startup',
    prefixes: ['my', 'get', 'use'],
    suffixes: ['ly', 'hub', 'app'],
    tldPreset: 'tech',
    onlyAvailable: true,
    maxDomainLength: 15,
  }),
});

const suggestions = await response.json();
console.log(suggestions.domains);
```

### Bulk Analysis

```javascript
// Analyze multiple business ideas
const response = await fetch('/domain-lookup/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ['fintech', 'healthtech', 'edtech'],
    prefixes: ['get', 'my'],
    suffixes: ['ly', 'app'],
    tlds: ['com', 'io', 'co'],
    showStats: true,
    format: 'json',
  }),
});

const analysis = await response.json();
console.log(analysis.domains);
```

### Using curl Commands

#### Check Domain Availability

```bash
curl -X POST http://localhost:3000/domain-lookup/check \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["example.com", "test.org"],
    "format": "json"
  }'
```

#### Generate Domain Suggestions

```bash
curl -X POST http://localhost:3000/domain-lookup/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "startup",
    "prefixes": ["my", "get"],
    "tldPreset": "tech",
    "onlyAvailable": true
  }'
```

#### Get TLD Presets

```bash
curl http://localhost:3000/domain-lookup/presets
```

#### Bulk Domain Check

```bash
curl -X POST http://localhost:3000/domain-lookup/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["fintech", "healthtech"],
    "tlds": ["com", "io"],
    "showStats": true
  }'
```

#### Advanced Domain Brainstorming

```bash
curl -X POST http://localhost:3000/domain-lookup/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "ai",
    "prefixes": ["super", "ultra", "mega"],
    "suffixes": ["lab", "hub", "studio"],
    "tlds": ["com", "io", "ai"],
    "onlyAvailable": true,
    "maxDomainLength": 20,
    "format": "json",
    "showStats": true
  }'
```

## Testing

Run the test suite:

```bash
pnpm test
```

Run with coverage:

```bash
pnpm run test:coverage
```

## Development

### Project Structure

```
mcp_modules/domain_lookup/
├── src/
│   ├── controller.js    # HTTP request handlers
│   ├── service.js       # Business logic and tldx CLI interaction
│   └── utils.js         # Utility functions
├── test/
│   ├── controller.test.js
│   └── service.test.js
├── examples/
│   └── basic-usage.js
├── docs/
│   └── api.md
├── index.js             # Module entry point
├── package.json
└── README.md
```

### Adding New Features

1. Write tests first in the appropriate test file
2. Implement the feature in the service layer
3. Add controller endpoints if needed
4. Update the main index.js to register new tools
5. Update documentation

## Troubleshooting

### tldx Command Not Found

Make sure tldx is installed and available in your PATH:

```bash
tldx version
```

### Permission Errors

Ensure the Node.js process has permission to execute the tldx command.

### Rate Limiting

tldx uses RDAP for domain checking, which may have rate limits. Use the `--verbose` flag to see detailed output.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Implement your changes
5. Ensure all tests pass
6. Submit a pull request

## License

ISC License - see LICENSE file for details.
