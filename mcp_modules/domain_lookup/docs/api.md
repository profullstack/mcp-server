# Domain Lookup Module API Documentation

## Overview

The Domain Lookup Module provides comprehensive domain availability checking and brainstorming capabilities through both HTTP endpoints and MCP tools. It leverages the powerful `tldx` CLI tool to perform fast, concurrent domain availability checks using RDAP.

## Base URL

All endpoints are prefixed with `/domain-lookup` when the module is loaded.

## Authentication

No authentication is required for this module.

## HTTP Endpoints

### Module Information

#### GET /domain-lookup

Get basic information about the domain lookup module.

**Response:**

```json
{
  "module": "domain-lookup",
  "status": "active",
  "message": "Domain availability checker and brainstorming tool using tldx CLI",
  "version": "1.0.0",
  "tools": [
    "check_domain_availability",
    "generate_domain_suggestions",
    "get_tld_presets",
    "bulk_domain_check"
  ],
  "tldxRequired": true
}
```

### Domain Checking

#### POST /domain-lookup/check

Check availability of specific domains.

**Request Body:**

```json
{
  "domains": ["example.com", "test.org"],
  "format": "json",
  "onlyAvailable": false,
  "maxDomainLength": 50,
  "verbose": false
}
```

**Parameters:**

- `domains` (array, required): Array of domain names to check
- `format` (string, optional): Output format - `text`, `json`, `json-stream`, `json-array`, `csv`
- `onlyAvailable` (boolean, optional): Show only available domains
- `maxDomainLength` (integer, optional): Maximum domain name length (1-253)
- `verbose` (boolean, optional): Show verbose output

**Response:**

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
      "domain": "test.org",
      "available": false,
      "status": "not available"
    }
  ],
  "format": "json",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "command": "tldx example.com test.org --format json --no-color"
}
```

### Domain Suggestions

#### POST /domain-lookup/suggest

Generate domain suggestions from a keyword with prefixes, suffixes, and TLDs.

**Request Body:**

```json
{
  "keyword": "openai",
  "prefixes": ["get", "my", "use"],
  "suffixes": ["ly", "hub", "app"],
  "tlds": ["com", "io", "ai"],
  "tldPreset": "tech",
  "format": "json",
  "onlyAvailable": true,
  "maxDomainLength": 20,
  "showStats": false,
  "verbose": false
}
```

**Parameters:**

- `keyword` (string, required): Base keyword for domain generation
- `prefixes` (array, optional): Prefixes to add before the keyword
- `suffixes` (array, optional): Suffixes to add after the keyword
- `tlds` (array, optional): TLDs to check
- `tldPreset` (string, optional): Use a TLD preset instead of specifying TLDs
- `format` (string, optional): Output format
- `onlyAvailable` (boolean, optional): Show only available domains
- `maxDomainLength` (integer, optional): Maximum domain name length
- `showStats` (boolean, optional): Show statistics at the end
- `verbose` (boolean, optional): Show verbose output

**Response:**

```json
{
  "success": true,
  "keyword": "openai",
  "domains": [
    {
      "domain": "getopenai.com",
      "available": true,
      "status": "available"
    },
    {
      "domain": "myopenaily.io",
      "available": true,
      "status": "available"
    }
  ],
  "format": "json",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "options": {
    "prefixes": ["get", "my"],
    "suffixes": ["ly"],
    "tlds": ["com", "io"]
  }
}
```

### TLD Presets

#### GET /domain-lookup/presets

Get available TLD presets.

**Response:**

```json
{
  "success": true,
  "presets": {
    "popular": ["com", "co", "io", "net", "org", "ai"],
    "tech": ["io", "ai", "dev", "tech", "app", "cloud"],
    "business": ["com", "co", "biz", "ltd", "llc", "inc"],
    "creative": ["art", "design", "ink", "studio", "gallery"],
    "geo": ["au", "de", "us", "eu", "uk", "ca"]
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Bulk Domain Check

#### POST /domain-lookup/bulk

Check multiple keywords with various combinations of prefixes, suffixes, and TLDs.

**Request Body:**

```json
{
  "keywords": ["fintech", "healthtech", "edtech"],
  "prefixes": ["get", "my"],
  "suffixes": ["ly", "app"],
  "tlds": ["com", "io", "co"],
  "tldPreset": "popular",
  "format": "json",
  "onlyAvailable": true,
  "maxDomainLength": 25,
  "showStats": true,
  "verbose": false
}
```

**Parameters:**

- `keywords` (array, required): Array of keywords to check
- All other parameters are the same as the suggest endpoint

**Response:**

```json
{
  "success": true,
  "keywords": ["fintech", "healthtech", "edtech"],
  "domains": [
    {
      "domain": "getfintech.com",
      "available": true,
      "status": "available"
    },
    {
      "domain": "myhealthtechly.io",
      "available": false,
      "status": "not available"
    }
  ],
  "format": "json",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "options": {
    "prefixes": ["get", "my"],
    "suffixes": ["ly", "app"],
    "tlds": ["com", "io", "co"]
  }
}
```

## MCP Tools

The module provides four MCP tools that can be called through the MCP protocol.

### check_domain_availability

Check availability of specific domains.

**Tool Info Endpoint:** `GET /tools/check_domain_availability/info`

**Tool Endpoint:** `POST /tools/check_domain_availability`

**Parameters:** Same as the `/domain-lookup/check` endpoint.

### generate_domain_suggestions

Generate domain suggestions from a keyword.

**Tool Info Endpoint:** `GET /tools/generate_domain_suggestions/info`

**Tool Endpoint:** `POST /tools/generate_domain_suggestions`

**Parameters:** Same as the `/domain-lookup/suggest` endpoint.

### get_tld_presets

Get available TLD presets.

**Tool Info Endpoint:** `GET /tools/get_tld_presets/info`

**Tool Endpoint:** `POST /tools/get_tld_presets`

**Parameters:** None required.

### bulk_domain_check

Perform bulk domain checking.

**Tool Info Endpoint:** `GET /tools/bulk_domain_check/info`

**Tool Endpoint:** `POST /tools/bulk_domain_check`

**Parameters:** Same as the `/domain-lookup/bulk` endpoint.

## Error Responses

All endpoints return appropriate HTTP status codes and error messages.

### 400 Bad Request

Missing or invalid parameters:

```json
{
  "error": "Missing required parameter: domains (array of domain names)"
}
```

```json
{
  "error": "domains parameter must be an array"
}
```

### 500 Internal Server Error

Service errors (usually tldx CLI issues):

```json
{
  "error": "tldx command failed: command not found"
}
```

```json
{
  "error": "Domain suggestion generation failed: Invalid keyword format"
}
```

## Output Formats

The module supports multiple output formats from the tldx CLI:

### text (default)

Human-readable text format with emoji indicators:

```
✔️ example.com is available
❌ google.com is not available
```

### json

JSON array format:

```json
[
  {
    "domain": "example.com",
    "available": true
  },
  {
    "domain": "google.com",
    "available": false
  }
]
```

### json-stream

Newline-delimited JSON format:

```
{"domain":"example.com","available":true}
{"domain":"google.com","available":false}
```

### json-array

Same as json format.

### csv

Comma-separated values format:

```
domain,available,error
example.com,true,
google.com,false,
```

## TLD Presets

The following TLD presets are typically available (actual presets depend on tldx version):

- **popular**: com, co, io, net, org, ai
- **tech**: io, ai, dev, tech, app, cloud, software
- **business**: com, co, biz, ltd, llc, inc, corp
- **creative**: art, design, ink, studio, gallery, creative
- **geo**: au, de, us, eu, uk, ca, fr, jp
- **new**: xyz, online, site, website, store, shop

## Rate Limiting

The tldx CLI uses RDAP for domain checking, which may have rate limits imposed by registry operators. The module does not implement additional rate limiting, but you should be aware of potential limits when making bulk requests.

## Examples

### Using curl

#### Check Single Domain

```bash
curl -X POST http://localhost:3000/domain-lookup/check \
  -H "Content-Type: application/json" \
  -d '{"domains": ["example.com"]}'
```

#### Generate Suggestions

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

#### Bulk Check

```bash
curl -X POST http://localhost:3000/domain-lookup/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["fintech", "healthtech"],
    "tlds": ["com", "io"],
    "showStats": true
  }'
```

### Using fetch (JavaScript)

#### Check Domain Availability

```javascript
const response = await fetch('http://localhost:3000/domain-lookup/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domains: ['example.com', 'test.org'],
    format: 'json',
  }),
});

const result = await response.json();
console.log(result.domains);
```

#### Generate Domain Suggestions

```javascript
const response = await fetch('http://localhost:3000/domain-lookup/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: 'startup',
    prefixes: ['my', 'get'],
    tldPreset: 'tech',
    onlyAvailable: true,
  }),
});

const suggestions = await response.json();
console.log(suggestions.domains);
```

#### Get TLD Presets

```javascript
const response = await fetch('http://localhost:3000/domain-lookup/presets');
const presets = await response.json();
console.log(presets.presets);
```

#### Bulk Domain Check

```javascript
const response = await fetch('http://localhost:3000/domain-lookup/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ['fintech', 'healthtech'],
    tlds: ['com', 'io'],
    showStats: true,
  }),
});

const analysis = await response.json();
console.log(analysis.domains);
```

## Dependencies

- **tldx CLI**: Must be installed and available in the system PATH
- **Node.js**: Version 20 or higher
- **child_process**: Built-in Node.js module for CLI execution

## Troubleshooting

### tldx Command Not Found

Ensure tldx is installed and available in your PATH:

```bash
tldx version
```

### Permission Errors

Ensure the Node.js process has permission to execute the tldx command.

### Timeout Errors

Large bulk requests may timeout. Consider breaking them into smaller batches.

### Rate Limiting

If you encounter rate limiting from RDAP servers, reduce the frequency of requests or use smaller batches.
