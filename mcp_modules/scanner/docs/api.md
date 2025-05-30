# Scanner Module API Documentation

This document provides detailed information about the Scanner Module API endpoints.

## Base URL

All endpoints are relative to the MCP server base URL (e.g., `http://localhost:3000`).

## Authentication

Authentication is handled by the MCP server. Refer to the MCP server documentation for authentication details.

## Endpoints

### Get Module Information

```
GET /scanner
```

Returns basic information about the scanner module.

**Response**

```json
{
  "module": "scanner",
  "status": "active",
  "message": "Web application security scanner module",
  "version": "1.0.0"
}
```

### Get Scan History

```
GET /scanner/scans?limit=10
```

Returns a list of recent scans.

**Query Parameters**

- `limit` (optional): Maximum number of scans to return (default: 10)

**Response**

```json
{
  "success": true,
  "count": 2,
  "scans": [
    {
      "id": "scan-1621234567890",
      "target": "https://example.com",
      "startTime": "2023-05-17T12:34:56.789Z",
      "endTime": "2023-05-17T12:35:56.789Z",
      "duration": 60,
      "status": "completed",
      "summary": {
        "total": 5,
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 1,
        "info": 1
      }
    },
    {
      "id": "scan-1621234567891",
      "target": "https://test.com",
      "startTime": "2023-05-16T12:34:56.789Z",
      "endTime": "2023-05-16T12:35:56.789Z",
      "duration": 60,
      "status": "completed",
      "summary": {
        "total": 3,
        "critical": 0,
        "high": 0,
        "medium": 1,
        "low": 1,
        "info": 1
      }
    }
  ]
}
```

### Get Scan by ID

```
GET /scanner/scans/:id
```

Returns detailed information about a specific scan.

**URL Parameters**

- `id`: Scan ID

**Response**

```json
{
  "success": true,
  "scan": {
    "id": "scan-1621234567890",
    "target": "https://example.com",
    "parsedUrl": {
      "protocol": "https:",
      "hostname": "example.com",
      "port": "443",
      "pathname": "/",
      "search": "",
      "hash": "",
      "origin": "https://example.com"
    },
    "startTime": "2023-05-17T12:34:56.789Z",
    "endTime": "2023-05-17T12:35:56.789Z",
    "duration": 60,
    "tools": ["nikto", "wapiti", "nuclei"],
    "status": "completed",
    "results": {
      "nikto": {
        "status": "completed",
        "vulnerabilities": [
          {
            "id": "999012",
            "name": "HTTP TRACE method is active",
            "description": "The HTTP TRACE method is enabled on this server.",
            "severity": "medium",
            "location": "/",
            "evidence": "TRACE method enabled"
          }
        ]
      },
      "wapiti": {
        "status": "completed",
        "vulnerabilities": [
          {
            "id": "wapiti-xss-1",
            "name": "Cross-Site Scripting",
            "description": "Possible XSS vulnerability found",
            "severity": "high",
            "location": "/search?q=test",
            "evidence": "<script>alert(1)</script>"
          }
        ]
      },
      "nuclei": {
        "status": "completed",
        "vulnerabilities": [
          {
            "id": "nuclei-cookie-1",
            "name": "Cookie without Secure Flag",
            "description": "A cookie was set without the Secure flag",
            "severity": "low",
            "location": "/",
            "evidence": "Set-Cookie: session=123; Path=/"
          }
        ]
      }
    },
    "vulnerabilities": [
      {
        "id": "999012",
        "name": "HTTP TRACE method is active",
        "description": "The HTTP TRACE method is enabled on this server.",
        "severity": "medium",
        "location": "/",
        "evidence": "TRACE method enabled",
        "source": "nikto",
        "scanId": "scan-1621234567890"
      },
      {
        "id": "wapiti-xss-1",
        "name": "Cross-Site Scripting",
        "description": "Possible XSS vulnerability found",
        "severity": "high",
        "location": "/search?q=test",
        "evidence": "<script>alert(1)</script>",
        "source": "wapiti",
        "scanId": "scan-1621234567890"
      },
      {
        "id": "nuclei-cookie-1",
        "name": "Cookie without Secure Flag",
        "description": "A cookie was set without the Secure flag",
        "severity": "low",
        "location": "/",
        "evidence": "Set-Cookie: session=123; Path=/",
        "source": "nuclei",
        "scanId": "scan-1621234567890"
      }
    ],
    "summary": {
      "total": 3,
      "critical": 0,
      "high": 1,
      "medium": 1,
      "low": 1,
      "info": 0
    },
    "outputDir": "/home/user/.config/mcp-scanner/scans/scan-1621234567890"
  }
}
```

### Get Scan Statistics

```
GET /scanner/stats
```

Returns statistics about all scans.

**Response**

```json
{
  "success": true,
  "stats": {
    "totalScans": 10,
    "completedScans": 8,
    "failedScans": 2,
    "totalVulnerabilities": 25,
    "severityBreakdown": {
      "critical": 1,
      "high": 5,
      "medium": 8,
      "low": 6,
      "info": 5
    },
    "mostScannedTargets": [
      {
        "target": "example.com",
        "count": 3
      },
      {
        "target": "test.com",
        "count": 2
      }
    ],
    "averageScanTime": 75,
    "toolUsage": {
      "nikto": 8,
      "wapiti": 6,
      "nuclei": 7,
      "zap": 2,
      "sqlmap": 1
    }
  }
}
```

### Perform a Security Scan

```
POST /scanner/scan
```

Performs a security scan on a target.

**Request Body**

```json
{
  "target": "https://example.com",
  "tools": ["nikto", "wapiti", "nuclei"],
  "verbose": true,
  "timeout": 300,
  "toolOptions": {
    "nikto": {
      "tuning": "x"
    },
    "wapiti": {
      "scope": "domain"
    }
  },
  "auth": {
    "type": "basic",
    "username": "user",
    "password": "pass"
  },
  "headers": {
    "User-Agent": "Mozilla/5.0",
    "X-Custom-Header": "value"
  },
  "projectId": "project-123",
  "scanProfile": "full"
}
```

**Response**

```json
{
  "success": true,
  "message": "Scan completed successfully",
  "scanId": "scan-1621234567890",
  "summary": {
    "total": 3,
    "critical": 0,
    "high": 1,
    "medium": 1,
    "low": 1,
    "info": 0
  },
  "scan": {
    "id": "scan-1621234567890",
    "target": "https://example.com",
    "startTime": "2023-05-17T12:34:56.789Z",
    "endTime": "2023-05-17T12:35:56.789Z",
    "duration": 60,
    "status": "completed",
    "tools": ["nikto", "wapiti", "nuclei"],
    "vulnerabilities": [
      {
        "id": "999012",
        "name": "HTTP TRACE method is active",
        "description": "The HTTP TRACE method is enabled on this server.",
        "severity": "medium",
        "location": "/",
        "evidence": "TRACE method enabled",
        "source": "nikto",
        "scanId": "scan-1621234567890"
      }
    ]
  }
}
```

### Generate a Report

```
GET /scanner/reports/:id?format=json
```

Generates a report for a scan.

**URL Parameters**

- `id`: Scan ID

**Query Parameters**

- `format` (optional): Report format (json, html, pdf, csv) (default: json)

**Response**

For JSON format, the response is a JSON object containing the report data.

For HTML format, the response is an HTML document.

### Export a Report

```
GET /scanner/reports/:id/export?format=json&destination=/path/to/report.json
```

Exports a report for a scan to a file.

**URL Parameters**

- `id`: Scan ID

**Query Parameters**

- `format` (optional): Report format (json, html, pdf, csv) (default: json)
- `destination` (optional): Destination path for the report file

**Response**

```json
{
  "success": true,
  "message": "Report exported successfully",
  "result": {
    "scanId": "scan-1621234567890",
    "format": "json",
    "destination": "/path/to/report.json",
    "timestamp": "2023-05-17T12:36:56.789Z"
  }
}
```

## MCP Tool

The scanner module provides an MCP tool that can be used by other modules.

### Tool Information

```
GET /tools/scanner/info
```

Returns information about the scanner tool.

**Response**

```json
{
  "name": "scanner",
  "description": "Perform security scans on web applications",
  "parameters": {
    "action": {
      "type": "string",
      "description": "The action to perform (scan, history, stats, report)",
      "required": true
    },
    "target": {
      "type": "string",
      "description": "The target URL or IP address to scan",
      "required": false
    },
    "tools": {
      "type": "array",
      "description": "Array of tools to use (nikto, zap, wapiti, nuclei, sqlmap)",
      "required": false
    },
    "scanId": {
      "type": "string",
      "description": "The ID of the scan for report generation",
      "required": false
    },
    "format": {
      "type": "string",
      "description": "Report format (json, html, pdf, csv)",
      "required": false
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of scans to return in history",
      "required": false
    }
  }
}
```

### Tool Usage

```
POST /tools/scanner
```

Uses the scanner tool.

**Request Body**

```json
{
  "action": "scan",
  "target": "https://example.com",
  "tools": ["nikto", "wapiti", "nuclei"],
  "verbose": true,
  "timeout": 300
}
```

**Response**

```json
{
  "tool": "scanner",
  "action": "scan",
  "result": {
    "id": "scan-1621234567890",
    "target": "https://example.com",
    "startTime": "2023-05-17T12:34:56.789Z",
    "endTime": "2023-05-17T12:35:56.789Z",
    "duration": 60,
    "status": "completed",
    "summary": {
      "total": 3,
      "critical": 0,
      "high": 1,
      "medium": 1,
      "low": 1,
      "info": 0
    }
  },
  "timestamp": "2023-05-17T12:35:56.789Z"
}
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in case of failure.

Example error response:

```json
{
  "success": false,
  "error": "Invalid target URL or IP address"
}
```

Common error status codes:

- `400 Bad Request`: Missing or invalid parameters
- `404 Not Found`: Scan or resource not found
- `500 Internal Server Error`: Server-side error
