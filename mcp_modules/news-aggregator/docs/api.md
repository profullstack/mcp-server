# News Aggregator API Documentation

## Overview

The News Aggregator module provides comprehensive news aggregation capabilities through RSS feed parsing and website scraping. This document details all available endpoints, parameters, and response formats.

## Base URL

All endpoints are relative to the MCP server base URL:

```
http://localhost:3000
```

## Authentication

No authentication is required for the news aggregator endpoints.

## Rate Limiting

The module implements internal rate limiting to prevent overwhelming news sources:

- 10 requests per minute per source
- Automatic retry with exponential backoff
- 5-minute caching to reduce external requests

## Endpoints

### Module Information

#### GET /news-aggregator

Get basic module information and status.

**Response:**

```json
{
  "module": "news-aggregator",
  "status": "active",
  "message": "News aggregator module for RSS feeds and website scraping",
  "version": "1.0.0",
  "availableEndpoints": ["GET /news-aggregator", "GET /news-aggregator/rss", ...]
}
```

### RSS News Endpoints

#### GET /news-aggregator/rss

Get RSS news with source parameter.

**Query Parameters:**

- `source` (required): RSS source (google, hackernews, bbc, npr)
- `category` (optional): News category (technology, world, business, science, general)

**Example:**

```
GET /news-aggregator/rss?source=google&category=technology
```

#### GET /news-aggregator/rss/:source

Get RSS news from a specific source.

**Path Parameters:**

- `source`: RSS source (google, hackernews, bbc, npr)

**Query Parameters:**

- `category` (optional): News category

**Example:**

```
GET /news-aggregator/rss/hackernews
GET /news-aggregator/rss/bbc?category=world
```

**Response:**

```json
{
  "source": "Hacker News",
  "category": "technology",
  "articles": [
    {
      "title": "Article Title",
      "description": "Article description",
      "link": "https://example.com/article",
      "publishedAt": "2024-01-01T12:00:00.000Z",
      "source": "Hacker News"
    }
  ],
  "fetchedAt": "2024-01-01T12:00:00.000Z"
}
```

### Scraped News Endpoints

#### GET /news-aggregator/scrape

Get scraped news with source parameter.

**Query Parameters:**

- `source` (required): Scrape source (techcrunch, cnn)

**Example:**

```
GET /news-aggregator/scrape?source=techcrunch
```

#### GET /news-aggregator/scrape/:source

Get scraped news from a specific source.

**Path Parameters:**

- `source`: Scrape source (techcrunch, cnn)

**Example:**

```
GET /news-aggregator/scrape/techcrunch
```

**Response:**

```json
{
  "source": "TechCrunch",
  "category": "technology",
  "articles": [
    {
      "title": "Tech Article Title",
      "description": "Article description",
      "link": "https://techcrunch.com/article",
      "publishedAt": "2024-01-01T12:00:00.000Z",
      "source": "TechCrunch"
    }
  ],
  "fetchedAt": "2024-01-01T12:00:00.000Z"
}
```

### Aggregated News

#### GET /news-aggregator/aggregate

Get news from multiple sources with optional filtering.

**Query Parameters:**

- `sources` (optional): Comma-separated list of sources (default: google,hackernews,bbc)
- `category` (optional): News category filter
- `keywords` (optional): Comma-separated keywords for filtering

**Example:**

```
GET /news-aggregator/aggregate?sources=google,hackernews,techcrunch&category=technology&keywords=AI,machine learning
```

**Response:**

```json
{
  "sources": [
    {
      "source": "Google News",
      "category": "technology",
      "articles": [...],
      "fetchedAt": "2024-01-01T12:00:00.000Z"
    },
    {
      "source": "Hacker News",
      "category": "technology",
      "articles": [...],
      "fetchedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "errors": [],
  "totalArticles": 25,
  "fetchedAt": "2024-01-01T12:00:00.000Z"
}
```

### Search News

#### GET /news-aggregator/search

Search for news articles by keywords across multiple sources.

**Query Parameters:**

- `keywords` (required): Comma-separated search keywords
- `sources` (optional): Comma-separated list of sources (default: google,hackernews,bbc)
- `category` (optional): News category filter
- `limit` (optional): Maximum number of results

**Example:**

```
GET /news-aggregator/search?keywords=artificial intelligence,machine learning&sources=google,hackernews&limit=10
```

**Response:**

```json
{
  "keywords": ["artificial intelligence", "machine learning"],
  "sources": ["google", "hackernews"],
  "articles": [
    {
      "title": "AI Article Title",
      "description": "Article description",
      "link": "https://example.com/article",
      "publishedAt": "2024-01-01T12:00:00.000Z",
      "source": "Google News",
      "sourceCategory": "technology"
    }
  ],
  "totalResults": 5,
  "searchedAt": "2024-01-01T12:00:00.000Z"
}
```

### Available Sources

#### GET /news-aggregator/sources

Get list of all available news sources and their capabilities.

**Response:**

```json
{
  "sources": [
    {
      "id": "google",
      "name": "Google News",
      "type": "rss",
      "categories": ["technology", "world", "business"]
    },
    {
      "id": "techcrunch",
      "name": "TechCrunch",
      "type": "scrape",
      "categories": ["technology"]
    }
  ],
  "total": 6,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Health Check

#### GET /news-aggregator/health

Check if the news aggregator service is operational.

**Response (Healthy):**

```json
{
  "status": "healthy",
  "message": "News aggregator service is operational",
  "testArticles": 10,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Response (Unhealthy):**

```json
{
  "status": "unhealthy",
  "message": "Service unavailable",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Cache Management

#### DELETE /news-aggregator/cache

Clear the news cache.

**Response:**

```json
{
  "message": "Cache cleared successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## MCP Tool Interface

### Tool Information

#### GET /tools/news-aggregator/info

Get information about the news aggregator MCP tool.

**Response:**

```json
{
  "name": "news-aggregator",
  "description": "Aggregate news from multiple sources including RSS feeds and website scraping",
  "parameters": {
    "action": {
      "type": "string",
      "description": "The action to perform",
      "required": true,
      "enum": ["rss", "scrape", "aggregate", "search", "sources"]
    },
    "source": {
      "type": "string",
      "description": "The news source",
      "required": false,
      "enum": ["google", "hackernews", "bbc", "npr", "techcrunch", "cnn"]
    }
  }
}
```

### Tool Execution

#### POST /tools/news-aggregator

Execute the news aggregator tool with specified parameters.

**Request Body:**

```json
{
  "action": "search",
  "keywords": "climate change,environment",
  "sources": "bbc,npr",
  "limit": 5
}
```

**Response:**

```json
{
  "tool": "news-aggregator",
  "action": "search",
  "result": {
    "keywords": ["climate change", "environment"],
    "sources": ["bbc", "npr"],
    "articles": [...],
    "totalResults": 5,
    "searchedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Tool Actions

### RSS Action

Fetch news from an RSS source.

**Required Parameters:**

- `action`: "rss"
- `source`: RSS source (google, hackernews, bbc, npr)

**Optional Parameters:**

- `category`: News category

**Example:**

```json
{
  "action": "rss",
  "source": "bbc",
  "category": "world"
}
```

### Scrape Action

Fetch news from a scraped website.

**Required Parameters:**

- `action`: "scrape"
- `source`: Scrape source (techcrunch, cnn)

**Example:**

```json
{
  "action": "scrape",
  "source": "techcrunch"
}
```

### Aggregate Action

Get news from multiple sources.

**Required Parameters:**

- `action`: "aggregate"

**Optional Parameters:**

- `sources`: Comma-separated list of sources
- `category`: News category
- `keywords`: Comma-separated keywords for filtering

**Example:**

```json
{
  "action": "aggregate",
  "sources": "google,hackernews,bbc",
  "category": "technology",
  "keywords": "AI,machine learning"
}
```

### Search Action

Search for news by keywords.

**Required Parameters:**

- `action`: "search"
- `keywords`: Comma-separated search keywords

**Optional Parameters:**

- `sources`: Comma-separated list of sources
- `category`: News category
- `limit`: Maximum number of results

**Example:**

```json
{
  "action": "search",
  "keywords": "artificial intelligence,machine learning",
  "sources": "google,hackernews",
  "limit": 10
}
```

### Sources Action

Get available sources.

**Required Parameters:**

- `action`: "sources"

**Example:**

```json
{
  "action": "sources"
}
```

## Error Responses

All endpoints return appropriate HTTP status codes and error messages:

### 400 Bad Request

```json
{
  "error": "Missing required parameter: source"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to parse RSS feed: Network error"
}
```

## Supported Sources

### RSS Sources

| Source      | ID         | Categories                           | Description                       |
| ----------- | ---------- | ------------------------------------ | --------------------------------- |
| Google News | google     | technology, world, business          | Google's news aggregation service |
| Hacker News | hackernews | technology                           | Technology-focused community news |
| BBC News    | bbc        | world, technology, business, science | British Broadcasting Corporation  |
| NPR         | npr        | general                              | National Public Radio             |

### Scraped Sources

| Source     | ID         | Categories | Description             |
| ---------- | ---------- | ---------- | ----------------------- |
| TechCrunch | techcrunch | technology | Technology startup news |
| CNN        | cnn        | world      | Cable News Network      |

## Caching

The module implements intelligent caching:

- **Cache Duration**: 5 minutes per source
- **Cache Keys**: Based on source, category, and keywords
- **Storage**: In-memory for fast access
- **Cleanup**: Automatic expiration handling

## Rate Limiting

Built-in rate limiting protects news sources:

- **Limit**: 10 requests per minute per source
- **Window**: 60 seconds
- **Behavior**: Requests exceeding limit are delayed
- **Retry**: Automatic retry with exponential backoff

## Best Practices

1. **Use Caching**: Avoid clearing cache unnecessarily
2. **Batch Requests**: Use aggregate endpoint for multiple sources
3. **Filter Early**: Use category and keyword filters to reduce data
4. **Handle Errors**: Always check for errors in aggregated responses
5. **Monitor Health**: Use health endpoint to verify service status

## Examples

See the `examples/basic-usage.js` file for comprehensive usage examples covering all endpoints and use cases.
