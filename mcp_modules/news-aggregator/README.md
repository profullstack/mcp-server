# News Aggregator Module

A comprehensive news aggregation module for the MCP server that provides real-time news by parsing RSS feeds and scraping selected websites. Built with Node.js, featuring efficient caching, keyword filtering, and structured JSON output.

## Features

- **RSS Feed Parsing**: Direct parsing of RSS feeds from reputable sources
- **Website Scraping**: HTML scraping using Cheerio for sites without RSS
- **Multi-Source Aggregation**: Combine news from multiple sources
- **Keyword Filtering**: Filter articles by keywords across all sources
- **Caching**: 5-minute cache to improve performance and reduce load
- **Category Support**: Filter by news categories (Technology, World, Business, etc.)
- **Search Functionality**: Search across multiple sources with keyword matching
- **Rate Limiting**: Built-in rate limiting for API calls
- **Error Handling**: Graceful error handling with detailed logging

## Supported Sources

### RSS Sources

- **Google News**: Technology, World, Business categories
- **Hacker News**: Technology focus
- **BBC News**: World, Technology, Business, Science categories
- **NPR**: General news

### Scraped Sources

- **TechCrunch**: Technology news
- **CNN**: World news

## Installation

1. Install dependencies:

```bash
cd mcp_modules/news-aggregator
npm install
```

2. The module will be automatically loaded by the MCP server.

## API Endpoints

### Basic Module Info

```
GET /news-aggregator
```

Returns module information and status.

### RSS News

```
GET /news-aggregator/rss?source=google&category=technology
GET /news-aggregator/rss/hackernews
```

Fetch news from RSS sources.

**Parameters:**

- `source`: RSS source (google, hackernews, bbc, npr)
- `category`: News category (technology, world, business, science, general)

### Scraped News

```
GET /news-aggregator/scrape?source=techcrunch
GET /news-aggregator/scrape/cnn
```

Fetch news from scraped websites.

**Parameters:**

- `source`: Scrape source (techcrunch, cnn)

### Aggregated News

```
GET /news-aggregator/aggregate?sources=google,hackernews,bbc&category=technology&keywords=AI,machine learning
```

Get news from multiple sources with optional filtering.

**Parameters:**

- `sources`: Comma-separated list of sources
- `category`: News category filter
- `keywords`: Comma-separated keywords for filtering

### Search News

```
GET /news-aggregator/search?keywords=artificial intelligence&sources=google,hackernews&limit=20
```

Search for news articles by keywords.

**Parameters:**

- `keywords`: Comma-separated search keywords (required)
- `sources`: Comma-separated list of sources
- `category`: News category filter
- `limit`: Maximum number of results

### Available Sources

```
GET /news-aggregator/sources
```

Get list of all available news sources and their capabilities.

### Health Check

```
GET /news-aggregator/health
```

Check if the news aggregator service is operational.

### Cache Management

```
DELETE /news-aggregator/cache
```

Clear the news cache.

## MCP Tool Usage

The module provides an MCP tool that can be used programmatically:

```javascript
// Tool info
GET /tools/news-aggregator/info

// Tool execution
POST /tools/news-aggregator
{
  "action": "aggregate",
  "sources": "google,hackernews,bbc",
  "category": "technology",
  "keywords": "AI,machine learning",
  "limit": 10
}
```

### Tool Actions

1. **rss**: Fetch from RSS source

   - Required: `source`
   - Optional: `category`

2. **scrape**: Fetch from scraped source

   - Required: `source`

3. **aggregate**: Get news from multiple sources

   - Optional: `sources`, `category`, `keywords`

4. **search**: Search by keywords

   - Required: `keywords`
   - Optional: `sources`, `category`, `limit`

5. **sources**: Get available sources

## Response Format

All endpoints return JSON in the following format:

### Single Source Response

```json
{
  "source": "Google News",
  "category": "technology",
  "articles": [
    {
      "title": "Article Title",
      "description": "Article description or excerpt",
      "link": "https://example.com/article",
      "publishedAt": "2024-01-01T12:00:00.000Z",
      "source": "Google News"
    }
  ],
  "fetchedAt": "2024-01-01T12:00:00.000Z"
}
```

### Aggregated Response

```json
{
  "sources": [
    {
      "source": "Google News",
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

### Search Response

```json
{
  "keywords": ["AI", "machine learning"],
  "sources": ["google", "hackernews"],
  "articles": [...],
  "totalResults": 15,
  "searchedAt": "2024-01-01T12:00:00.000Z"
}
```

## Usage Examples

### Get Technology News from Multiple Sources

```bash
curl "http://localhost:3000/news-aggregator/aggregate?sources=google,hackernews,techcrunch&category=technology"
```

### Search for AI-related Articles

```bash
curl "http://localhost:3000/news-aggregator/search?keywords=artificial intelligence,machine learning&limit=10"
```

### Get BBC World News

```bash
curl "http://localhost:3000/news-aggregator/rss/bbc?category=world"
```

### Using the MCP Tool

```bash
curl -X POST "http://localhost:3000/tools/news-aggregator" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search",
    "keywords": "climate change,environment",
    "sources": "bbc,npr",
    "limit": 5
  }'
```

## Configuration

The module uses the following default settings:

- **Cache Timeout**: 5 minutes
- **Rate Limiting**: 10 requests per minute per source
- **Default Sources**: google, hackernews, bbc
- **User Agent**: Mozilla/5.0 (compatible; NewsAggregator/1.0)

## Error Handling

The module includes comprehensive error handling:

- Network failures are logged and return appropriate HTTP status codes
- Invalid sources return 400 Bad Request
- Parsing errors are caught and logged
- Rate limiting prevents overwhelming news sources
- Graceful fallbacks for missing or malformed data

## Caching Strategy

- **Cache Duration**: 5 minutes per source
- **Cache Key**: Based on source, category, and keywords
- **Memory Storage**: In-memory cache for fast access
- **Automatic Cleanup**: Expired entries are automatically removed

## Development

### Running Tests

```bash
npm test
```

### Adding New Sources

To add a new RSS source:

1. Add the source configuration to `src/service.js`
2. Update the `getAggregatedNews` method
3. Add the source to the available sources list

To add a new scraped source:

1. Define CSS selectors for the site structure
2. Add a new method in `src/service.js`
3. Update the controller and main index file

## Dependencies

- **cheerio**: HTML parsing and manipulation
- **rss-parser**: RSS feed parsing
- **node-fetch**: HTTP requests
- **mocha**: Testing framework
- **chai**: Assertion library
- **sinon**: Test spies and mocks

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and questions:

1. Check the logs for error details
2. Verify network connectivity to news sources
3. Test with the health endpoint
4. Clear cache if experiencing stale data
