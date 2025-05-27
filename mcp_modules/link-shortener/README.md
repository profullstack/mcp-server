# Link Shortener Module

A comprehensive URL shortening module for the MCP server that integrates with the hynt.us API to create short, shareable links. Transform long URLs into concise, branded short links with custom aliases, analytics, and QR code generation.

## Features

- **URL Shortening** - Convert long URLs into short hynt.us links
- **Custom Aliases** - Create branded, memorable short links
- **URL Validation** - Comprehensive validation and safety checks
- **Bulk Operations** - Create multiple short links at once
- **Link Analytics** - Track clicks and usage statistics
- **QR Code Generation** - Automatic QR codes for mobile sharing
- **Safety Checks** - Detect suspicious URLs and prevent abuse
- **Caching** - Intelligent caching for improved performance
- **API Integration** - Seamless hynt.us API integration

## API Key Setup

This module comes with a default hynt.us API key for immediate use. You can also provide your own API key:

**Default API Key:** `apikeys:1t7nfaw9ra0nmznsbdni` (provided)

**To use your own API key:**

1. Visit [hynt.us](https://hynt.us) and create an account
2. Generate an API key in your dashboard
3. Use the API key format: `apikeys:your_key_here`
4. Include it in your requests (optional - defaults to provided key)

## Usage

### As an MCP Tool

**Create a Short Link (with default API key):**

```json
{
  "url": "https://example.com/very/long/path/to/resource?with=many&parameters=here",
  "alias": "mylink"
}
```

**Create a Short Link (with custom API key):**

```json
{
  "url": "https://example.com/very/long/path/to/resource?with=many&parameters=here",
  "alias": "mylink",
  "apiKey": "apikeys:your_custom_key_here"
}
```

**Response:**

```json
{
  "tool": "link-shortener",
  "input": {
    "url": "https://example.com/very/long/path/to/resource?with=many&parameters=here",
    "alias": "mylink",
    "customAlias": true
  },
  "result": {
    "success": true,
    "originalUrl": "https://example.com/very/long/path/to/resource?with=many&parameters=here",
    "shortUrl": "https://hynt.us/mylink",
    "alias": "mylink",
    "id": "link_123456",
    "createdAt": "2025-05-27T08:30:00Z",
    "clicks": 0,
    "active": true,
    "qrCode": "https://hynt.us/qr/mylink",
    "analytics": "https://hynt.us/analytics/mylink",
    "metadata": {
      "title": "example.com - Resource",
      "domain": "example.com",
      "path": "/very/long/path/to/resource?with=many&parameters=here"
    }
  },
  "timestamp": "2025-05-27T08:30:00Z"
}
```

### HTTP Endpoints

#### POST /link-shortener/create

Create a new short link.

**Request Body (using default API key):**

```json
{
  "url": "https://example.com/long-url",
  "alias": "custom-alias"
}
```

**Request Body (using custom API key):**

```json
{
  "url": "https://example.com/long-url",
  "alias": "custom-alias",
  "apiKey": "apikeys:your_custom_key_here"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "originalUrl": "https://example.com/long-url",
    "shortUrl": "https://hynt.us/custom-alias",
    "alias": "custom-alias",
    "createdAt": "2025-05-27T08:30:00Z",
    "clicks": 0,
    "active": true
  },
  "message": "Short link created successfully"
}
```

#### GET /link-shortener/info/:alias

Get information about a short link.

**Headers:**

```
Authorization: Bearer apikeys:1t7nfaw9ra0nmznsbdni
```

**Response:**

```json
{
  "success": true,
  "data": {
    "alias": "custom-alias",
    "shortUrl": "https://hynt.us/custom-alias",
    "originalUrl": "https://example.com/long-url",
    "createdAt": "2025-05-27T08:30:00Z",
    "clicks": 42,
    "active": true
  }
}
```

#### POST /link-shortener/validate

Validate URL format and safety.

**Request Body:**

```json
{
  "url": "https://example.com",
  "checkAccess": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "url": "https://example.com",
    "safety": {
      "safe": true,
      "warnings": [],
      "errors": [],
      "score": 100
    },
    "accessibility": {
      "accessible": true,
      "status": 200,
      "redirected": false
    }
  }
}
```

#### POST /link-shortener/bulk

Create multiple short links at once.

**Request Body:**

```json
{
  "urls": ["https://example1.com", "https://example2.com", "https://example3.com"],
  "apiKey": "apikeys:1t7nfaw9ra0nmznsbdni",
  "prefix": "batch"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "success": true,
        "url": "https://example1.com",
        "result": {
          "shortUrl": "https://hynt.us/batch-1",
          "alias": "batch-1"
        }
      }
    ]
  }
}
```

#### POST /tools/link-shortener

Universal MCP tool endpoint.

## Examples

### Node.js/Express Integration

```javascript
app.post('/shorten', async (req, res) => {
  try {
    const { url, alias } = req.body;

    const response = await fetch('http://localhost:3000/tools/link-shortener', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        alias: alias,
        apiKey: process.env.HYNT_API_KEY,
      }),
    });

    const result = await response.json();

    if (result.result.success) {
      res.json({
        shortUrl: result.result.shortUrl,
        originalUrl: result.result.originalUrl,
        qrCode: result.result.qrCode,
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Python Integration

```python
import requests

def create_short_link(url, alias=None, api_key=None):
    response = requests.post('http://localhost:3000/tools/link-shortener',
                           json={
                               'url': url,
                               'alias': alias,
                               'apiKey': api_key
                           })

    if response.status_code == 200:
        result = response.json()
        return result['result']
    else:
        raise Exception(f"Failed to create short link: {response.text}")

# Usage
short_link = create_short_link(
    url='https://example.com/very/long/url',
    alias='mylink',
    api_key='apikeys:1t7nfaw9ra0nmznsbdni'
)

print(f"Short URL: {short_link['shortUrl']}")
print(f"QR Code: {short_link['qrCode']}")
```

### React/JavaScript Frontend

```javascript
import React, { useState } from 'react';

function LinkShortener() {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const shortenUrl = async () => {
    setLoading(true);
    try {
      const response = await fetch('/tools/link-shortener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          alias: alias || undefined,
          apiKey: 'apikeys:1t7nfaw9ra0nmznsbdni',
        }),
      });

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="link-shortener">
      <h2>URL Shortener</h2>
      <input
        type="url"
        placeholder="Enter long URL"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />
      <input
        type="text"
        placeholder="Custom alias (optional)"
        value={alias}
        onChange={e => setAlias(e.target.value)}
      />
      <button onClick={shortenUrl} disabled={loading || !url}>
        {loading ? 'Shortening...' : 'Shorten URL'}
      </button>

      {result && (
        <div className="result">
          <p>
            <strong>Short URL:</strong>
            <a href={result.shortUrl} target="_blank" rel="noopener noreferrer">
              {result.shortUrl}
            </a>
          </p>
          <p>
            <strong>Original:</strong> {result.originalUrl}
          </p>
          <img src={result.qrCode} alt="QR Code" />
        </div>
      )}
    </div>
  );
}
```

## Use Cases

### Marketing Campaigns

```javascript
// Create branded links for marketing campaigns
const campaignLinks = await bulkCreateShortLinks(
  [
    'https://example.com/summer-sale',
    'https://example.com/newsletter-signup',
    'https://example.com/product-launch',
  ],
  {
    apiKey: 'apikeys:1t7nfaw9ra0nmznsbdni',
    prefix: 'summer2025',
  }
);

// Results: summer2025-1, summer2025-2, summer2025-3
```

### Social Media Sharing

```javascript
// Create short links optimized for social media
const socialLink = await createShortLink('https://blog.example.com/10-tips-for-productivity', {
  alias: 'productivity-tips',
  apiKey: 'apikeys:1t7nfaw9ra0nmznsbdni',
});

// Share: https://hynt.us/productivity-tips
// Includes automatic QR code for mobile users
```

### Email Marketing

```javascript
// Create trackable links for email campaigns
const emailLinks = await Promise.all([
  createShortLink('https://shop.example.com/deals', { alias: 'email-deals' }),
  createShortLink('https://example.com/unsubscribe', { alias: 'email-unsub' }),
  createShortLink('https://example.com/feedback', { alias: 'email-feedback' }),
]);

// Track click-through rates via analytics
```

### Event Management

```javascript
// Create event-specific short links
const eventLinks = {
  registration: await createShortLink('https://events.example.com/register/conference2025', {
    alias: 'conf2025-reg',
  }),
  schedule: await createShortLink('https://events.example.com/schedule/conference2025', {
    alias: 'conf2025-schedule',
  }),
  livestream: await createShortLink('https://stream.example.com/conference2025', {
    alias: 'conf2025-live',
  }),
};
```

### QR Code Integration

```javascript
// Generate QR codes for print materials
const printLink = await createShortLink('https://example.com/product-info', {
  alias: 'product-qr',
});

// QR code URL: https://hynt.us/qr/product-qr
// Can be embedded in brochures, business cards, posters
```

## URL Validation and Safety

### Validation Features

- **Protocol Validation**: Only HTTP/HTTPS URLs accepted
- **Format Validation**: Proper URL structure required
- **Length Limits**: Maximum 2048 characters
- **Safety Checks**: Detect suspicious patterns and malicious URLs
- **Accessibility Testing**: Optional URL accessibility verification

### Safety Checks

```javascript
const safetyCheck = await validateUrl('https://suspicious-site.com');

// Response includes:
{
  "valid": true,
  "safety": {
    "safe": false,
    "warnings": [
      "URL uses a TLD commonly associated with spam",
      "URL appears to be already shortened"
    ],
    "score": 60
  }
}
```

### Blocked Patterns

- JavaScript URLs (`javascript:`)
- Data URLs (`data:`)
- File URLs (`file:`)
- VBScript URLs (`vbscript:`)
- Known malicious patterns

## Alias Management

### Custom Aliases

- **Length**: 3-20 characters
- **Characters**: Letters, numbers, hyphens, underscores
- **Case**: Case-insensitive (converted to lowercase)
- **Reserved Words**: Common terms are blocked (api, admin, www, etc.)

### Auto-Generated Aliases

- **Length**: 6 characters by default
- **Characters**: Alphanumeric (a-z, A-Z, 0-9)
- **Uniqueness**: Collision-resistant random generation

### Alias Sanitization

```javascript
// Input: "My@Awesome#Link!"
// Output: "myawesomelink"

// Input: "ab"  (too short)
// Output: "abc123" (auto-generated)
```

## Analytics and Tracking

### Basic Analytics

- **Click Count**: Total number of clicks
- **Creation Date**: When the link was created
- **Last Accessed**: Most recent click timestamp
- **Active Status**: Whether the link is active

### Advanced Analytics (via hynt.us)

- **Geographic Data**: Click locations by country/region
- **Referrer Information**: Traffic sources
- **Device Types**: Desktop vs mobile usage
- **Time-based Analytics**: Click patterns over time

## Error Handling

### Common Error Scenarios

```javascript
// Invalid URL format
{
  "error": "Invalid URL: Invalid URL format"
}

// Missing API key
{
  "error": "Missing or invalid required parameter: apiKey"
}

// Invalid alias
{
  "error": "Invalid alias format. Use 3-20 alphanumeric characters, hyphens, or underscores."
}

// URL safety failure
{
  "error": "URL failed safety check",
  "details": ["Invalid URL format"],
  "warnings": ["URL contains potentially suspicious keywords"]
}

// API rate limiting
{
  "error": "hynt.us API request failed: 429 Too Many Requests"
}
```

### Best Practices

1. **Validate URLs** before sending to the API
2. **Handle Rate Limits** with exponential backoff
3. **Cache Results** to reduce API calls
4. **Sanitize Aliases** to ensure compatibility
5. **Check Safety Scores** for suspicious URLs

## Performance and Caching

### Caching Strategy

- **Cache Duration**: 1 hour for link data
- **Cache Keys**: Include URL, alias, and options
- **Memory Usage**: Automatic cleanup of expired entries
- **Cache Statistics**: Monitor cache hit rates

### Performance Optimization

```javascript
// Cache statistics
const stats = linkService.getCacheStats();
console.log(`Cache size: ${stats.size} entries`);
console.log(`Cache timeout: ${stats.timeout}ms`);

// Clear cache when needed
linkService.clearCache();
```

### Rate Limiting

- **Bulk Operations**: Maximum 10 URLs per request
- **API Calls**: Respect hynt.us rate limits
- **Caching**: Reduces redundant API calls
- **Error Handling**: Graceful degradation on limits

## Security Considerations

### API Key Security

- **Environment Variables**: Store API keys securely
- **Key Rotation**: Regularly rotate API keys
- **Access Control**: Limit API key permissions
- **Logging**: Mask API keys in logs

### URL Safety

- **Malware Detection**: Basic pattern matching
- **Phishing Prevention**: Domain reputation checks
- **Content Filtering**: Block inappropriate content
- **Redirect Validation**: Prevent redirect loops

### Input Validation

- **URL Sanitization**: Clean and validate all URLs
- **Alias Validation**: Prevent injection attacks
- **Length Limits**: Prevent buffer overflow attacks
- **Character Filtering**: Remove dangerous characters

## Testing

The module includes comprehensive tests covering:

- **URL Validation**: Format and protocol validation
- **Alias Management**: Generation and validation
- **API Integration**: Mock API responses
- **Error Handling**: Various failure scenarios
- **Safety Checks**: Malicious URL detection
- **Caching**: Cache behavior and statistics

Run tests with:

```bash
cd mcp_modules/link-shortener
pnpm test
```

## Dependencies

- **Node.js**: >=18.0.0
- **hynt.us API**: External service dependency
- **No additional packages**: Uses only Node.js built-ins

## Configuration

### Environment Variables

```bash
# Optional: Default API key
HYNT_API_KEY=apikeys:your_key_here

# Optional: Custom base URL
HYNT_BASE_URL=https://hynt.us

# Optional: Cache timeout (milliseconds)
LINK_CACHE_TIMEOUT=3600000
```

### Module Configuration

```javascript
// Custom service configuration
const customService = new LinkService();
customService.baseUrl = 'https://custom-shortener.com';
customService.cacheTimeout = 30 * 60 * 1000; // 30 minutes
```

## API Reference

### Main Endpoint

- `POST /tools/link-shortener` - Universal tool interface

### HTTP Endpoints

- `POST /link-shortener/create` - Create short link
- `GET /link-shortener/info/:alias` - Get link information
- `POST /link-shortener/validate` - Validate URL
- `POST /link-shortener/bulk` - Bulk create links
- `GET /link-shortener/analytics/:alias` - Get analytics
- `POST /link-shortener/test` - Test API connection

### Parameters

- `url` (required): Long URL to shorten
- `alias` (optional): Custom alias for short link
- `apiKey` (optional): hynt.us API key (uses default if not provided)
- `checkAccess` (optional): Validate URL accessibility
- `prefix` (optional): Prefix for bulk operations

### Response Format

All responses include:

- `success`: Boolean indicating success/failure
- `data`: Response data or error details
- `message`: Human-readable status message
- `timestamp`: Response generation time

## Contributing

When contributing to this module:

1. Follow hynt.us API guidelines and rate limits
2. Test with various URL formats and edge cases
3. Validate against malicious and suspicious URLs
4. Include comprehensive error handling
5. Update tests for new functionality
6. Document any breaking changes

## Troubleshooting

### Common Issues

**"Invalid API key format"**

- Ensure API key follows format: `apikeys:xxxxxxxxxxxxx`
- Check for typos or extra spaces
- Verify key is active in hynt.us dashboard

**"URL failed safety check"**

- Review safety warnings and errors
- Check for suspicious patterns in URL
- Verify URL is not already shortened

**"Network timeout"**

- Check internet connectivity
- Verify hynt.us service status
- Increase timeout settings if needed

**"Cache issues"**

- Clear cache with `linkService.clearCache()`
- Check cache statistics for debugging
- Verify cache timeout settings

## License

MIT License - see the main project license for details.

## Support

For issues related to:

- **Module functionality**: Create an issue in the MCP server repository
- **hynt.us API**: Contact hynt.us support
- **Integration help**: Check the examples and documentation above

## Changelog

### v1.0.0

- Initial release with hynt.us integration
- URL validation and safety checks
- Custom alias support
- Bulk operations
- Comprehensive testing
- QR code generation
- Analytics integration
- Caching system
