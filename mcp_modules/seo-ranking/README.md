# SEO Ranking Module

This MCP module provides SEO ranking checking functionality using the ValueSERP API. It can check rankings for single or multiple keywords and find matches in both organic and local search results.

## Features

- ✅ Single keyword ranking check
- ✅ Multiple keywords ranking check (up to 50 keywords)
- ✅ Google Places search
- ✅ Organic search results ranking
- ✅ Local search results ranking
- ✅ Batch processing with rate limiting
- ✅ Comprehensive ranking statistics
- ✅ API key validation
- ✅ Domain matching with subdomain support

## Requirements

- ValueSERP API key (required)
- Node.js >= 18.0.0

## Installation

This module is part of the MCP server and will be automatically loaded when the server starts.

## API Endpoints

### GET `/seo-ranking`

Get module status and information.

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
  "num": "100"
}
```

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
      "snippet": "Expert software development agency...",
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

Check rankings for multiple keywords.

**Request Body:**

```json
{
  "api_key": "your_valueserp_api_key",
  "keywords": ["software agency san jose", "web development san jose", "full stack development"],
  "domain": "profullstack.com",
  "location": "98146,Washington,United States",
  "batchSize": 5,
  "delay": 1000
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "domain": "profullstack.com",
    "total_keywords": 3,
    "results": [
      {
        "keyword": "software agency san jose",
        "domain": "profullstack.com",
        "organic_rank": { "position": 5, "title": "...", "link": "..." },
        "local_rank": null,
        "found": true,
        "timestamp": "2025-01-04T20:15:30.123Z"
      }
    ],
    "summary": {
      "total_checked": 3,
      "successful_checks": 3,
      "errors": 0,
      "found_in_results": 2,
      "found_in_organic": 2,
      "found_in_local": 0,
      "average_organic_rank": 7,
      "best_organic_rank": 3
    },
    "timestamp": "2025-01-04T20:15:35.456Z"
  }
}
```

### POST `/seo-ranking/places`

Search Google Places for businesses.

**Headers:**

- `x-api-key` (optional): ValueSERP API key (alternative to api_key in body)

**Request Body:**

```json
{
  "api_key": "your_valueserp_api_key",
  "query": "software company",
  "domain": "profullstack.com",
  "location": "San Francisco-Oakland-San Jose,CA,California,United States",
  "gl": "us",
  "hl": "en",
  "google_domain": "google.com",
  "num": "20"
}
```

**Parameters:**

- `api_key` (required*): ValueSERP API key (*can be provided via x-api-key header instead)
- `query` (required): Search query for places
- `domain` (required): Domain to find in results
- `location` (optional): Search location (default: "San Francisco-Oakland-San Jose,CA,California,United States")
- `gl` (optional): Google country code (default: "us")
- `hl` (optional): Google language code (default: "en")
- `google_domain` (optional): Google domain (default: "google.com")
- `num` (optional): Number of results to return (default: "20")

**Response:**

```json
{
  "success": true,
  "data": {
    "query": "software company",
    "domain": "profullstack.com",
    "places_rank": {
      "position": 3,
      "title": "ProFullStack Software Development",
      "website": "https://profullstack.com",
      "address": "San Francisco, CA",
      "phone": "555-0123",
      "rating": 4.8,
      "reviews": 25,
      "place_id": "ChIJd8BlQ2BZwokRAFQEcDlJRAQ",
      "types": ["establishment", "point_of_interest"]
    },
    "total_results": 20,
    "search_time": 0.32,
    "timestamp": "2025-01-04T20:15:30.123Z",
    "found": true
  }
}
```

### POST `/seo-ranking/validate-key`

Validate your ValueSERP API key.

**Headers:**

- `x-api-key` (optional): ValueSERP API key (alternative to api_key in body)

**Request Body:**

```json
{
  "api_key": "your_valueserp_api_key"
}
```

### GET `/seo-ranking/history/:domain`

Get ranking history for a domain (placeholder for future implementation).

## MCP Tool Usage

The module provides an MCP tool called `seo-ranking` that can be used through the MCP interface.

### Tool Parameters

- `action` (required): The action to perform
  - `"check"` - Check single keyword
  - `"check-multiple"` - Check multiple keywords
  - `"places"` - Search Google Places
  - `"validate-key"` - Validate API key
- `api_key` (required): Your ValueSERP API key
- `keyword` (required for "check"): Single keyword to check
- `keywords` (required for "check-multiple"): Array of keywords (max 50)
- `query` (required for "places"): Search query for places
- `domain` (required): Domain to find in search results
- `location` (optional): Search location (default: "98146,Washington,United States")
- `gl` (optional): Google country code (default: "us")
- `hl` (optional): Google language code (default: "en")
- `google_domain` (optional): Google domain (default: "google.com")
- `num` (optional): Number of results (default: "100")
- `batchSize` (optional): Batch size for multiple keywords (default: 5)
- `delay` (optional): Delay between batches in ms (default: 1000)

### Example Tool Usage

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

```json
{
  "action": "check-multiple",
  "api_key": "your_valueserp_api_key",
  "keywords": ["software agency", "web development", "full stack"],
  "domain": "profullstack.com",
  "batchSize": 3,
  "delay": 1500
}
```

```json
{
  "action": "places",
  "api_key": "your_valueserp_api_key",
  "query": "software company",
  "domain": "profullstack.com",
  "location": "San Francisco-Oakland-San Jose,CA,California,United States",
  "num": "20"
}
```

## Configuration Options

### Search Parameters

- **location**: Geographic location for search results
- **gl**: Google country code (affects search results)
- **hl**: Google language code (affects search interface)
- **google_domain**: Google domain to use for search
- **num**: Number of results to return (1-100)
- **include_ai_overview**: Include AI overview in results

### Rate Limiting

- **batchSize**: Number of keywords to process simultaneously (default: 5)
- **delay**: Delay between batches in milliseconds (default: 1000)

## Error Handling

The module handles various error scenarios:

- Invalid API key (401/403 errors)
- Missing required parameters
- Invalid keyword formats
- API rate limiting
- Network timeouts
- Invalid domain formats

## Examples

### Check Single Keyword

```bash
curl -X POST https://mcp.profullstack.com/seo-ranking/check \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_valueserp_api_key" \
  -d '{
    "api_key": "your_valueserp_api_key",
    "keyword": "software agency san jose",
    "domain": "profullstack.com"
  }'
```

### Check Multiple Keywords

```bash
curl -X POST https://mcp.profullstack.com/seo-ranking/check-multiple \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_valueserp_api_key" \
  -d '{
    "api_key": "your_valueserp_api_key",
    "keywords": ["software agency", "web development"],
    "domain": "profullstack.com",
    "batchSize": 2,
    "delay": 2000
  }'
```

### Search Google Places

```bash
curl -X POST https://mcp.profullstack.com/seo-ranking/places \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_valueserp_api_key" \
  -d '{
    "api_key": "your_valueserp_api_key",
    "query": "software company",
    "domain": "profullstack.com",
    "location": "San Francisco-Oakland-San Jose,CA,California,United States",
    "num": "20"
  }'
```

### Validate API Key

```bash
curl -X POST https://mcp.profullstack.com/seo-ranking/validate-key \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_valueserp_api_key" \
  -d '{
    "api_key": "your_valueserp_api_key"
  }'
```

### Get Module Status

```bash
curl -X GET https://mcp.profullstack.com/seo-ranking \
  -H "x-api-key: your_valueserp_api_key"
```

### Using MCP Tool Interface

```bash
curl -X POST https://mcp.profullstack.com/tools/seo-ranking \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_valueserp_api_key" \
  -d '{
    "action": "check",
    "api_key": "your_valueserp_api_key",
    "keyword": "software agency san jose",
    "domain": "profullstack.com",
    "num": "100"
  }'
```

### Check Multiple Keywords via MCP Tool

```bash
curl -X POST https://mcp.profullstack.com/tools/seo-ranking \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_valueserp_api_key" \
  -d '{
    "action": "check-multiple",
    "api_key": "your_valueserp_api_key",
    "keywords": ["software agency", "web development", "full stack"],
    "domain": "profullstack.com",
    "batchSize": 3,
    "delay": 1500
  }'
```

### Search Google Places via MCP Tool

```bash
curl -X POST https://mcp.profullstack.com/tools/seo-ranking \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_valueserp_api_key" \
  -d '{
    "action": "places",
    "api_key": "your_valueserp_api_key",
    "query": "software company",
    "domain": "profullstack.com",
    "location": "San Francisco-Oakland-San Jose,CA,California,United States",
    "num": "20"
  }'
```

## JavaScript Examples

### Search Google Places with Fetch

```javascript
// Using fetch API
const response = await fetch('https://mcp.profullstack.com/seo-ranking/places', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your_valueserp_api_key',
  },
  body: JSON.stringify({
    api_key: 'your_valueserp_api_key',
    query: 'software company',
    domain: 'profullstack.com',
    location: 'San Francisco-Oakland-San Jose,CA,California,United States',
    num: '20',
  }),
});

const data = await response.json();
console.log('Places search result:', data);
```

### Search Google Places with Node.js

```javascript
import fetch from 'node-fetch';

async function searchPlaces() {
  try {
    const response = await fetch('https://mcp.profullstack.com/seo-ranking/places', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VALUESERP_API_KEY,
      },
      body: JSON.stringify({
        query: 'software development agency',
        domain: 'profullstack.com',
        location: 'New York,NY,New York,United States',
        gl: 'us',
        hl: 'en',
        num: '20',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data.found) {
      console.log(`Found ${result.data.domain} at position ${result.data.places_rank.position}`);
      console.log(`Business: ${result.data.places_rank.title}`);
      console.log(
        `Rating: ${result.data.places_rank.rating} (${result.data.places_rank.reviews} reviews)`
      );
    } else {
      console.log(`Domain ${result.data.domain} not found in Places results`);
    }
  } catch (error) {
    console.error('Error searching places:', error);
  }
}

searchPlaces();
```

### Check Keyword Rankings with Fetch

```javascript
// Check single keyword
async function checkKeywordRanking() {
  const response = await fetch('https://mcp.profullstack.com/seo-ranking/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.VALUESERP_API_KEY,
    },
    body: JSON.stringify({
      keyword: 'software agency san jose',
      domain: 'profullstack.com',
      location: '98146,Washington,United States',
      num: '100',
    }),
  });

  const result = await response.json();

  if (result.success && result.data.found) {
    console.log(`Found at organic position: ${result.data.organic_rank?.position || 'Not found'}`);
    console.log(`Found at local position: ${result.data.local_rank?.position || 'Not found'}`);
  }
}

// Check multiple keywords
async function checkMultipleKeywords() {
  const response = await fetch('https://mcp.profullstack.com/seo-ranking/check-multiple', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.VALUESERP_API_KEY,
    },
    body: JSON.stringify({
      keywords: ['software agency', 'web development', 'full stack development'],
      domain: 'profullstack.com',
      batchSize: 3,
      delay: 1500,
    }),
  });

  const result = await response.json();

  if (result.success) {
    console.log(`Checked ${result.data.summary.total_checked} keywords`);
    console.log(`Found in ${result.data.summary.found_in_results} results`);
    console.log(`Average organic rank: ${result.data.summary.average_organic_rank}`);
  }
}
```

## ValueSERP API

This module uses the ValueSERP API to perform Google search queries. You need to:

1. Sign up for a ValueSERP account at https://valueserp.com/
2. Get your API key from the dashboard
3. Use the API key in your requests

### API Limits

- Free tier: 100 searches per month
- Paid tiers: Various limits based on plan
- Rate limiting: Respect API rate limits (module includes built-in rate limiting)

## Development

### Running Tests

```bash
npm test
```

### Module Structure

```
mcp_modules/seo-ranking/
├── index.js              # Main module file
├── package.json          # Module configuration
├── README.md            # This file
├── src/
│   ├── controller.js    # HTTP route handlers
│   ├── service.js       # Business logic
│   └── utils.js         # Utility functions
├── test/
│   ├── controller.test.js
│   └── service.test.js
├── examples/
│   └── basic-usage.js
└── docs/
    └── api.md
```

## License

ISC License
