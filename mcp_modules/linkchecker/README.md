# Linkchecker Module

A comprehensive MCP server module for checking links on web pages using the linkinator library. This module can detect broken links, validate URLs, and provide detailed reports in JSON format.

## Features

- Check links on any web page or website
- Recursive link checking support
- Configurable timeout and concurrency settings
- Detailed JSON reports with link status
- Support for markdown files
- RESTful API for managing link check results
- MCP tool integration for easy use in other modules

## Installation

The module uses the [linkinator](https://github.com/JustinBeckwith/linkinator) library for link checking functionality.

```bash
cd mcp_modules/linkchecker
npm install
```

## API Endpoints

| Endpoint                       | Method | Description                          |
| ------------------------------ | ------ | ------------------------------------ |
| `/linkchecker`                 | GET    | Get module information               |
| `/linkchecker/check`           | POST   | Check links for a URL                |
| `/linkchecker/check?url=<url>` | GET    | Quick link check via query parameter |
| `/linkchecker/results`         | GET    | Get all link check results           |
| `/linkchecker/results/:id`     | GET    | Get link check result by ID          |
| `/linkchecker/results/:id`     | DELETE | Delete a link check result           |
| `/linkchecker/results`         | DELETE | Clear all link check results         |
| `/tools/linkchecker`           | POST   | Linkchecker tool endpoint            |

## MCP Tool

This module provides an MCP tool that can be used to check links:

### Parameters

- **url** (required): The URL to check for broken links
- **recurse** (optional): Whether to recursively check links on the page (default: false)
- **timeout** (optional): Timeout in milliseconds for each link check (default: 5000)
- **concurrency** (optional): Number of concurrent link checks (default: 100)
- **markdown** (optional): Whether to check markdown files (default: false)

### Example Usage

```javascript
// Using the MCP tool
const result = await useLinkchecker({
  url: 'https://example.com',
  recurse: true,
  timeout: 10000,
  concurrency: 50,
});

console.log(result);
```

## API Usage Examples

### Using curl with mcp.profullstack.com

#### Check Links (POST)

```bash
curl -X POST https://mcp.profullstack.com/linkchecker/check \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "recurse": false,
      "timeout": 5000,
      "concurrency": 50
    }
  }'
```

#### Quick Check (GET)

```bash
curl "https://mcp.profullstack.com/linkchecker/check?url=https://example.com"
```

#### MCP Tool Endpoint

```bash
curl -X POST https://mcp.profullstack.com/tools/linkchecker \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com",
    "recurse": true,
    "timeout": 10000,
    "concurrency": 25
  }'
```

#### Get All Results

```bash
curl https://mcp.profullstack.com/linkchecker/results
```

#### Get Specific Result

```bash
curl https://mcp.profullstack.com/linkchecker/results/check_abc123_1234567890
```

#### Clear All Results

```bash
curl -X DELETE https://mcp.profullstack.com/linkchecker/results
```

### JavaScript Examples (for local development)

#### Check Links (POST)

```javascript
const response = await fetch('http://localhost:3000/linkchecker/check', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    options: {
      recurse: false,
      timeout: 5000,
      concurrency: 100,
    },
  }),
});

const result = await response.json();
console.log(result);
```

#### Quick Check (GET)

```javascript
const response = await fetch('http://localhost:3000/linkchecker/check?url=https://example.com');
const result = await response.json();
console.log(result);
```

#### Get All Results

```javascript
const response = await fetch('http://localhost:3000/linkchecker/results');
const results = await response.json();
console.log(results);
```

## Response Format

The module returns detailed JSON responses with the following structure:

```json
{
  "success": true,
  "data": {
    "id": "check_abc123_1234567890",
    "url": "https://example.com",
    "timestamp": "2023-12-07T10:30:00.000Z",
    "passed": true,
    "links": [
      {
        "url": "https://example.com/page1",
        "status": 200,
        "statusText": "OK",
        "state": "OK",
        "parent": "https://example.com"
      },
      {
        "url": "https://example.com/broken-link",
        "status": 404,
        "statusText": "Not Found",
        "state": "BROKEN",
        "parent": "https://example.com"
      }
    ],
    "summary": {
      "total": 25,
      "passed": 23,
      "failed": 2,
      "skipped": 0
    }
  },
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

## Configuration Options

When checking links, you can provide the following options:

- **recurse**: Follow links and check them recursively
- **timeout**: Maximum time to wait for each link check (in milliseconds)
- **concurrency**: Number of links to check simultaneously
- **markdown**: Include markdown files in the check

## Error Handling

The module provides comprehensive error handling:

- Invalid URLs are rejected with appropriate error messages
- Network timeouts are handled gracefully
- Detailed error information is included in responses
- Failed checks are stored with error details for debugging

## Testing

The module includes comprehensive tests using Mocha and Chai:

```bash
# Run tests
cd mcp_modules/linkchecker
npm test
```

## Dependencies

- **linkinator**: ^6.0.4 - Core link checking functionality
- **Node.js**: >=18.0.0
- **Hono**: Provided by the MCP server framework

## Use Cases

- **Website Maintenance**: Regularly check your website for broken links
- **Content Validation**: Ensure all links in documentation are working
- **SEO Optimization**: Identify and fix broken links that hurt search rankings
- **Quality Assurance**: Automated link checking in CI/CD pipelines
- **Site Migration**: Verify links after moving or restructuring content

## License

ISC
