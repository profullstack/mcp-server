# SEO Ranking Module API Documentation

## Overview

The SEO Ranking module provides comprehensive SEO ranking checking functionality using the ValueSERP API. It allows you to check keyword rankings for both organic and local search results, supporting single keyword checks and batch processing of up to 50 keywords.

## Base URL

All endpoints are relative to your MCP server base URL (e.g., `http://localhost:3000`).

## Authentication

All requests require a valid ValueSERP API key passed in the request body as `api_key`.

## Endpoints

### GET `/seo-ranking`

Get module status and configuration information.

**Response:**

```json
{
  "success": true,
  "data": {
    "module": "seo-ranking",
    "status": "active",
    "api_provider": "ValueSERP",
    "features": [
      "Single keyword ranking check",
      "Multiple keywords ranking check (up to 50)",
      "Organic results ranking",
      "Local results ranking",
      "Batch processing with rate limiting"
    ],
    "endpoints": [
      "POST /seo-ranking/check - Check single keyword",
      "POST /seo-ranking/check-multiple - Check multiple keywords",
      "GET /seo-ranking/history/:domain - Get ranking history (placeholder)"
    ]
  }
}
```

### POST `/seo-ranking/check`

Check ranking for a single keyword.

**Request Body:**

```json
{
  "api_key": "your_valueserp_api_key",
  "keyword": "software agency san jose",
  "domain": "profullstack.com",
  "location": "98146,Washington,United States",
  "gl": "us",
  "hl": "en",
  "google_domain": "google.com",
  "num": "100",
  "include_ai_overview": "true"
}
```

**Parameters:**

- `api_key` (required): ValueSERP API key
- `keyword` (required): Search keyword
- `domain` (required): Domain to find in results
- `location` (optional): Search location (default: "98146,Washington,United States")
- `gl` (optional): Google country code (default: "us")
- `hl` (optional): Google language code (default: "en")
- `google_domain` (optional): Google domain (default: "google.com")
- `num` (optional): Number of results to return (default: "100")
- `include_ai_overview` (optional): Include AI overview (default: "true")

**Response:**

```json
{
  "success": true,
  "data": {
    "keyword": "software agency san jose",
    "domain": "profullstack.com",
    "organic_rank": {
      "position": 5,
      "title": "Professional Full Stack Development Services",
      "link": "https://profullstack.com/services",
      "snippet": "Expert software development agency specializing in full-stack solutions...",
      "displayed_link": "profullstack.com › services"
    },
    "local_rank": null,
    "total_results": 1250000,
    "search_time": 0.45,
    "timestamp": "2025-01-04T20:15:30.123Z",
    "found": true
  }
}
```

### POST `/seo-ranking/check-multiple`

Check rankings for multiple keywords (up to 50).

**Request Body:**

```json
{
  "api_key": "your_valueserp_api_key",
  "keywords": [
    "software agency san jose",
    "web development san jose",
    "full stack development",
    "react development services"
  ],
  "domain": "profullstack.com",
  "location": "98146,Washington,United States",
  "batchSize": 5,
  "delay": 1000
}
```

**Parameters:**

- `api_key` (required): ValueSERP API key
- `keywords` (required): Array of keywords (max 50)
- `domain` (required): Domain to find in results
- `location` (optional): Search location
- `gl` (optional): Google country code
- `hl` (optional): Google language code
- `google_domain` (optional): Google domain
- `num` (optional): Number of results to return
- `batchSize` (optional): Batch size for processing (default: 5)
- `delay` (optional): Delay between batches in ms (default: 1000)

**Response:**

```json
{
  "success": true,
  "data": {
    "domain": "profullstack.com",
    "total_keywords": 4,
    "results": [
      {
        "keyword": "software agency san jose",
        "domain": "profullstack.com",
        "organic_rank": {
          "position": 5,
          "title": "Professional Full Stack Development Services",
          "link": "https://profullstack.com/services",
          "snippet": "Expert software development agency...",
          "displayed_link": "profullstack.com › services"
        },
        "local_rank": null,
        "total_results": 1250000,
        "search_time": 0.45,
        "timestamp": "2025-01-04T20:15:30.123Z",
        "found": true
      },
      {
        "keyword": "web development san jose",
        "domain": "profullstack.com",
        "organic_rank": null,
        "local_rank": {
          "position": 2,
          "title": "ProFullStack - Web Development",
          "website": "https://profullstack.com",
          "address": "San Jose, CA",
          "phone": "555-0123",
          "rating": 4.8,
          "reviews": 25
        },
        "total_results": 890000,
        "search_time": 0.38,
        "timestamp": "2025-01-04T20:15:32.456Z",
        "found": true
      }
    ],
    "summary": {
      "total_checked": 4,
      "successful_checks": 4,
      "errors": 0,
      "found_in_results": 2,
      "found_in_organic": 1,
      "found_in_local": 1,
      "average_organic_rank": 5,
      "best_organic_rank": 5,
      "average_local_rank": 2,
      "best_local_rank": 2
    },
    "timestamp": "2025-01-04T20:15:35.789Z"
  }
}
```

### POST `/seo-ranking/validate-key`

Validate your ValueSERP API key.

**Request Body:**

```json
{
  "api_key": "your_valueserp_api_key"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "api_key_valid": true,
    "test_search_completed": true,
    "message": "API key is valid and working"
  }
}
```

**Response (Invalid Key):**

```json
{
  "success": false,
  "data": {
    "api_key_valid": false,
    "message": "Invalid API key"
  }
}
```

### GET `/seo-ranking/history/:domain`

Get ranking history for a domain (placeholder for future implementation).

**Parameters:**

- `domain` (path parameter): Domain to get history for

**Response:**

```json
{
  "success": true,
  "data": {
    "domain": "profullstack.com",
    "message": "Ranking history feature not yet implemented",
    "suggestion": "Use checkKeywordRanking or checkMultipleKeywords endpoints"
  }
}
```

## MCP Tool Interface

### GET `/tools/seo-ranking/info`

Get information about the MCP tool.

**Response:**

```json
{
  "name": "seo-ranking",
  "description": "Check SEO rankings for keywords using ValueSERP API",
  "parameters": {
    "action": {
      "type": "string",
      "description": "The action to perform (check, check-multiple, validate-key)",
      "required": true,
      "enum": ["check", "check-multiple", "validate-key"]
    },
    "api_key": {
      "type": "string",
      "description": "ValueSERP API key",
      "required": true
    },
    "keyword": {
      "type": "string",
      "description": "Single keyword to check (for check action)",
      "required": false
    },
    "keywords": {
      "type": "array",
      "description": "Array of keywords to check (for check-multiple action, max 50)",
      "required": false,
      "items": {
        "type": "string"
      },
      "maxItems": 50
    },
    "domain": {
      "type": "string",
      "description": "Domain to find in search results",
      "required": true
    }
  }
}
```

### POST `/tools/seo-ranking`

Execute the SEO ranking tool.

**Request Body (Single Keyword):**

```json
{
  "action": "check",
  "api_key": "your_valueserp_api_key",
  "keyword": "software agency san jose",
  "domain": "profullstack.com",
  "location": "98146,Washington,United States",
  "num": "100"
}
```

**Request Body (Multiple Keywords):**

```json
{
  "action": "check-multiple",
  "api_key": "your_valueserp_api_key",
  "keywords": ["software agency", "web development"],
  "domain": "profullstack.com",
  "batchSize": 2,
  "delay": 1000
}
```

**Request Body (Validate Key):**

```json
{
  "action": "validate-key",
  "api_key": "your_valueserp_api_key"
}
```

**Response:**

```json
{
  "tool": "seo-ranking",
  "action": "check",
  "result": {
    "keyword": "software agency san jose",
    "domain": "profullstack.com",
    "organic_rank": {
      "position": 5,
      "title": "Professional Full Stack Development Services",
      "link": "https://profullstack.com/services"
    },
    "found": true
  },
  "timestamp": "2025-01-04T20:15:30.123Z"
}
```

## Error Responses

### Validation Errors (400)

```json
{
  "error": "Validation failed",
  "details": ["API key is required", "Domain is required"]
}
```

### Authentication Errors (401)

```json
{
  "error": "Invalid API key",
  "details": "ValueSERP API error: 401 Unauthorized"
}
```

### Server Errors (500)

```json
{
  "error": "Network timeout",
  "details": "Request to ValueSERP API timed out"
}
```

## Rate Limiting

The module includes built-in rate limiting to respect ValueSERP API limits:

- **Batch Processing**: Keywords are processed in configurable batches (default: 5)
- **Delays**: Configurable delays between batches (default: 1000ms)
- **Error Handling**: Automatic retry logic for rate limit errors

## Best Practices

1. **API Key Management**: Store your API key securely and never expose it in client-side code
2. **Batch Size**: Use smaller batch sizes (3-5) for better rate limit compliance
3. **Delays**: Increase delays between batches if you encounter rate limiting
4. **Error Handling**: Always check the response status and handle errors appropriately
5. **Domain Matching**: Use clean domain names without protocols or paths
6. **Location Targeting**: Use specific locations for more accurate local results

## Examples

See the [basic usage examples](../examples/basic-usage.js) for complete code examples.

## ValueSERP API Documentation

For more information about ValueSERP API parameters and limits, visit:
https://valueserp.com/docs/
