# Lighthouse Module API Documentation

## Overview

The Lighthouse Module provides comprehensive website performance auditing capabilities through Google's Lighthouse tool. It offers both HTTP REST API endpoints and MCP tool interfaces for running performance audits, managing reports, and analyzing website optimization opportunities.

## MCP Tool Interface

### Tool Name: `lighthouse`

The module exposes a single MCP tool called `lighthouse` that supports multiple actions.

### Actions

#### `audit` - Run Single URL Audit

Performs a Lighthouse audit on a single URL.

**Parameters:**

- `action`: `"audit"` (required)
- `url`: Target URL to audit (required)
- `options`: Audit configuration (optional)
  - `categories`: Array of audit categories (default: `["performance"]`)
  - `headless`: Run in headless mode (default: `true`)

**Example:**

```json
{
  "action": "audit",
  "url": "https://example.com",
  "options": {
    "categories": ["performance", "accessibility"],
    "headless": true
  }
}
```

**Response:**

```json
{
  "tool": "lighthouse",
  "action": "audit",
  "result": {
    "id": "audit_1234567890_abc123",
    "url": "https://example.com",
    "timestamp": "2023-12-07T10:30:00.000Z",
    "scores": {
      "performance": {
        "score": 0.85,
        "displayValue": 85
      }
    },
    "metrics": {
      "firstContentfulPaint": {
        "value": 1200,
        "displayValue": "1.2 s",
        "score": 0.85,
        "unit": "ms"
      }
    },
    "opportunities": [...],
    "diagnostics": [...]
  },
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

#### `batch-audit` - Run Multiple URL Audits

Performs Lighthouse audits on multiple URLs.

**Parameters:**

- `action`: `"batch-audit"` (required)
- `urls`: Array of URLs to audit (required)
- `options`: Audit configuration (optional)

**Example:**

```json
{
  "action": "batch-audit",
  "urls": ["https://example.com", "https://google.com", "https://github.com"],
  "options": {
    "categories": ["performance"],
    "headless": true
  }
}
```

#### `get-report` - Retrieve Stored Report

Retrieves a previously generated audit report by ID.

**Parameters:**

- `action`: `"get-report"` (required)
- `id`: Report ID (required)

**Example:**

```json
{
  "action": "get-report",
  "id": "audit_1234567890_abc123"
}
```

#### `get-summary` - Get Report Summary

Generates a condensed summary of an audit report.

**Parameters:**

- `action`: `"get-summary"` (required)
- `id`: Report ID (required)

**Example:**

```json
{
  "action": "get-summary",
  "id": "audit_1234567890_abc123"
}
```

#### `list-reports` - List All Reports

Returns a list of all stored audit reports.

**Parameters:**

- `action`: `"list-reports"` (required)

**Example:**

```json
{
  "action": "list-reports"
}
```

#### `delete-report` - Delete Report

Deletes a specific audit report.

**Parameters:**

- `action`: `"delete-report"` (required)
- `id`: Report ID (required)

**Example:**

```json
{
  "action": "delete-report",
  "id": "audit_1234567890_abc123"
}
```

#### `clear-reports` - Clear All Reports

Deletes all stored audit reports.

**Parameters:**

- `action`: `"clear-reports"` (required)

**Example:**

```json
{
  "action": "clear-reports"
}
```

## HTTP REST API

### Base Path: `/lighthouse`

#### Module Information

**GET** `/lighthouse`

- Returns module information and status

**GET** `/lighthouse/health`

- Returns module health status and metrics

#### Report Management

**GET** `/lighthouse/reports`

- Returns all stored audit reports

**GET** `/lighthouse/reports/:id`

- Returns specific audit report by ID

**GET** `/lighthouse/reports/:id/summary`

- Returns condensed summary of audit report

**GET** `/lighthouse/reports/:id/text`

- Returns human-readable text summary of audit report

**DELETE** `/lighthouse/reports/:id`

- Deletes specific audit report

**DELETE** `/lighthouse/reports`

- Clears all stored audit reports

#### Audit Operations

**POST** `/lighthouse/audit`

- Runs Lighthouse audit on single URL

Request Body:

```json
{
  "url": "https://example.com",
  "options": {
    "categories": ["performance"],
    "headless": true
  }
}
```

**POST** `/lighthouse/batch-audit`

- Runs Lighthouse audits on multiple URLs

Request Body:

```json
{
  "urls": ["https://example.com", "https://google.com"],
  "options": {
    "categories": ["performance", "accessibility"],
    "headless": true
  }
}
```

## Audit Categories

The following Lighthouse audit categories are supported:

- `performance` - Core Web Vitals and performance metrics
- `accessibility` - Accessibility compliance and best practices
- `best-practices` - General web development best practices
- `seo` - Search engine optimization factors
- `pwa` - Progressive Web App compliance

## Core Web Vitals Metrics

The module automatically extracts and reports on Core Web Vitals:

### Performance Metrics

- **First Contentful Paint (FCP)** - Time until first content appears
- **Largest Contentful Paint (LCP)** - Time until largest content element appears
- **First Input Delay (FID)** - Time from first user interaction to browser response
- **Cumulative Layout Shift (CLS)** - Visual stability metric
- **Total Blocking Time (TBT)** - Time when main thread was blocked
- **Speed Index** - How quickly content is visually displayed

### Scoring

- Scores range from 0 to 1 (0-100 when displayed as percentage)
- Performance grades: A (90-100), B (80-89), C (70-79), D (60-69), F (0-59)

## Error Handling

### Common Error Responses

**400 Bad Request**

```json
{
  "error": "Missing required parameter: url"
}
```

**404 Not Found**

```json
{
  "error": "Report not found"
}
```

**500 Internal Server Error**

```json
{
  "error": "Lighthouse audit failed: Chrome launch failed"
}
```

### Error Scenarios

- Invalid URLs
- Missing required parameters
- Chrome/Chromium not available
- Network connectivity issues
- Insufficient system resources

## Integration Examples

### Using with MCP Client

```javascript
// Run audit via MCP tool
const result = await mcpClient.useTool('lighthouse', {
  action: 'audit',
  url: 'https://example.com',
  options: {
    categories: ['performance', 'accessibility'],
    headless: true,
  },
});

console.log(`Performance Score: ${result.result.scores.performance.displayValue}/100`);
```

### Using HTTP API

```javascript
// Run audit via HTTP API
const response = await fetch('/lighthouse/audit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    options: { categories: ['performance'] },
  }),
});

const audit = await response.json();
console.log(`Audit ID: ${audit.data.id}`);
```

## Performance Considerations

- Audits typically take 30-60 seconds per URL
- Chrome instances consume significant memory and CPU
- Batch audits run sequentially to avoid resource exhaustion
- Reports are stored in memory and cleared on module restart
- Headless mode is recommended for automated environments

## Requirements

- Node.js >= 18.0.0
- Chrome or Chromium browser installed
- Sufficient system resources (RAM and CPU)
- Network connectivity for target URLs
