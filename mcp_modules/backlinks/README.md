# Backlinks Automation Module

An advanced MCP (Model Context Protocol) module that automates the discovery and submission process for backlink generation to improve SEO and website visibility.

## Overview

This module provides a comprehensive solution for automating backlink acquisition through:

- **Intelligent Site Discovery**: Automatically finds relevant submission opportunities
- **Site Validation & Scoring**: Evaluates potential sites based on SEO metrics
- **AI-Powered Content Generation**: Creates tailored submission content for each site
- **Automated Form Submission**: Uses Puppeteer for hands-free submissions
- **Follow-up Automation**: Sends automated follow-up emails to increase acceptance rates
- **Analytics & Reporting**: Provides detailed insights on campaign performance

## Features

### 🔍 Site Discovery

- Web crawling to locate suitable submission sites
- Targets directories, startup showcases, product submission sites
- Maintains evolving database of backlink opportunities
- Intelligent filtering based on relevance and quality

### 📊 Site Validation & Scoring

- **Real Data Only**: Uses only extractable site information (no simulated metrics)
- Relevance scoring based on keyword matching with site content
- Site type classification (directories, showcases, submission sites)
- Content quality assessment (titles, descriptions, forms)
- Automated quality filtering based on real site characteristics

### 🤖 AI-Powered Content Generation

- Generates unique, SEO-optimized titles and descriptions
- Tailors content to each site's submission format
- Keyword optimization for maximum impact
- Context-aware content adaptation

### 🚀 Automated Submission

- Puppeteer-based form automation
- Intelligent form field detection and filling
- CAPTCHA handling support (with 2Captcha integration)
- Respectful rate limiting and error handling

### 📧 Follow-up Automation

- Automated email outreach for pending submissions
- Customizable follow-up templates
- Status tracking and response monitoring
- Indexing assurance with ping services

### 📈 Analytics & Reporting

- Real-time campaign progress tracking
- Submission status monitoring
- SEO performance insights
- Detailed reporting dashboard

## Installation

1. The module is automatically available when the MCP server starts
2. Install additional dependencies:

```bash
cd mcp_modules/backlinks
npm install
```

## API Endpoints

All API keys are passed in request bodies - no environment variables needed.

### Campaign Management

#### Create Campaign

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "product_url": "https://yourproduct.com",
    "description": "AI-driven tool to improve SEO through automated backlink submissions",
    "keywords": ["SEO tool", "backlink automation", "AI"],
    "settings": {
      "max_sites": 50,
      "auto_submit": true,
      "follow_up": true
    }
  }'
```

#### Get Campaign

```bash
curl https://mcp.profullstack.com/backlinks/campaigns/{campaign_id}
```

#### List All Campaigns

```bash
curl https://mcp.profullstack.com/backlinks/campaigns
```

### Site Discovery & Submission

#### Discover Sites

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns/{campaign_id}/discover \
  -H "Content-Type: application/json" \
  -d '{
    "valueserp_api_key": "your-valueserp-api-key",
    "maxQueries": 5,
    "maxResults": 10,
    "location": "98146,Washington,United States",
    "gl": "us",
    "hl": "en"
  }'
```

#### Submit to Site

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns/{campaign_id}/submit \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://example-directory.com",
    "auto_submit": true,
    "dry_run": false
  }'
```

#### Batch Submit

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns/{campaign_id}/batch-submit \
  -H "Content-Type: application/json" \
  -d '{
    "site_urls": [
      "https://site1.com",
      "https://site2.com"
    ],
    "auto_submit": true
  }'
```

### Analytics & Reporting

#### Get Campaign Analytics

```bash
curl https://mcp.profullstack.com/backlinks/campaigns/{campaign_id}/analytics
```

#### Send Follow-ups

**Option 1: Mailgun API (Recommended)**

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns/{campaign_id}/follow-ups \
  -H "Content-Type: application/json" \
  -d '{
    "mailgun_api_key": "your-mailgun-api-key",
    "mailgun_domain": "your-domain.com",
    "from_email": "noreply@your-domain.com",
    "to_email": "admin@targetsite.com"
  }'
```

**Option 2: SMTP**

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns/{campaign_id}/follow-ups \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "your-email@gmail.com",
    "smtp_pass": "your-app-password",
    "from_email": "your-email@gmail.com",
    "to_email": "admin@targetsite.com"
  }'
```

## MCP Tool Usage

The module provides a unified MCP tool interface with API keys passed in requests:

```json
{
  "tool": "backlinks",
  "action": "discover_sites",
  "campaign_id": "your-campaign-id",
  "valueserp_api_key": "your-valueserp-api-key",
  "options": {
    "maxQueries": 5,
    "maxResults": 10,
    "location": "98146,Washington,United States"
  }
}
```

### Available Actions

- `create_campaign` - Create a new backlink campaign
- `discover_sites` - Discover potential backlink sites (requires `valueserp_api_key`)
- `submit_to_site` - Submit to a specific site
- `batch_submit` - Submit to multiple sites
- `generate_content` - Generate content for a site
- `send_follow_ups` - Send follow-up emails (requires email provider credentials)
- `get_analytics` - Get campaign analytics
- `get_campaign` - Get campaign details
- `list_campaigns` - List all campaigns

## Configuration

### API Key Requirements

**No environment variables needed** - all API keys are passed directly in request bodies:

- **ValueSERP API Key**: Required for site discovery (passed in `/discover` requests)
- **Email Provider**: Required for follow-ups (Mailgun or SMTP credentials in `/follow-ups` requests)
- **Optional**: Moz, Ahrefs, or other SEO APIs can be integrated as needed

### Campaign Settings

```json
{
  "max_sites": 50, // Maximum sites to discover
  "auto_submit": true, // Enable automatic submission
  "follow_up": true, // Enable follow-up emails
  "max_attempts": 3, // Maximum submission attempts
  "delay_between_submissions": 2000 // Delay in milliseconds
}
```

**Note**: The `min_domain_authority` setting has been removed as this module now uses only real, extractable data without simulated SEO metrics.

## Usage Examples

### Complete Workflow Example

**1. Create a Campaign**

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "product_url": "https://myaiapp.com",
    "description": "Revolutionary AI productivity tool that automates workflows",
    "keywords": ["AI", "productivity", "automation", "workflow"]
  }'
```

**2. Discover Submission Sites**

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns/CAMPAIGN_ID/discover \
  -H "Content-Type: application/json" \
  -d '{
    "valueserp_api_key": "your-valueserp-api-key",
    "maxQueries": 5,
    "maxResults": 10
  }'
```

**3. Submit to High-Scoring Sites**

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns/CAMPAIGN_ID/submit \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://betalist.com",
    "auto_submit": true
  }'
```

**4. Send Follow-up Emails**

```bash
curl -X POST https://mcp.profullstack.com/backlinks/campaigns/CAMPAIGN_ID/follow-ups \
  -H "Content-Type: application/json" \
  -d '{
    "mailgun_api_key": "your-mailgun-api-key",
    "mailgun_domain": "your-domain.com",
    "from_email": "outreach@your-domain.com",
    "to_email": "admin@betalist.com"
  }'
```

**5. Check Analytics**

```bash
curl https://mcp.profullstack.com/backlinks/campaigns/CAMPAIGN_ID/analytics
```

### JavaScript Example

```javascript
// Create a new campaign
const campaign = await fetch('https://mcp.profullstack.com/backlinks/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create_campaign',
    product_url: 'https://myawesomeapp.com',
    description:
      'Revolutionary AI-powered productivity tool that helps teams collaborate more effectively',
    keywords: ['productivity', 'AI tool', 'team collaboration'],
    options: {
      max_sites: 30,
      auto_submit: false, // Manual review before submission
    },
  }),
});

const result = await campaign.json();
console.log('Campaign created:', result.result.id);
```

### Discover and Submit

```javascript
// Discover sites
const discovery = await fetch('/tools/backlinks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'discover_sites',
    campaign_id: 'your-campaign-id',
    options: { maxQueries: 3 },
  }),
});

// Submit to best sites
const sites = await discovery.json();
const topSites = sites.result.slice(0, 5);

for (const site of topSites) {
  await fetch('/tools/backlinks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submit_to_site',
      campaign_id: 'your-campaign-id',
      site_url: site.url,
      options: { auto_submit: true },
    }),
  });
}
```

### Analytics and Monitoring

```javascript
// Get campaign analytics
const analytics = await fetch('/tools/backlinks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'get_analytics',
    campaign_id: 'your-campaign-id',
  }),
});

const stats = await analytics.json();
console.log('Campaign Performance:', {
  totalSites: stats.result.totalSitesDiscovered,
  submissions: stats.result.totalSubmissions,
  successRate: stats.result.successfulSubmissions / stats.result.totalSubmissions,
});
```

## Best Practices

### 1. Respectful Crawling

- Built-in delays between requests
- Respects robots.txt when possible
- Rate limiting to avoid overwhelming target sites

### 2. Content Quality

- Always review generated content before submission
- Customize descriptions for better relevance
- Use specific, relevant keywords

### 3. Follow-up Strategy

- Wait at least 1-2 weeks before sending follow-ups
- Keep follow-up emails professional and brief
- Track response rates and adjust strategy

### 4. Monitoring & Optimization

- Regularly check campaign analytics
- Focus on high-scoring sites for better results
- Adjust keyword strategy based on performance

## Troubleshooting

### Common Issues

1. **Browser Launch Failures**

   - Ensure system has sufficient resources
   - Check Puppeteer installation
   - Verify no conflicting browser processes

2. **Site Discovery Returns Few Results**

   - Broaden keyword selection
   - Increase maxQueries parameter
   - Check internet connectivity

3. **Form Submission Failures**

   - Sites may have changed their form structure
   - CAPTCHA protection may be enabled
   - Consider manual submission for high-value sites

4. **Email Follow-ups Not Sending**
   - Verify SMTP configuration
   - Check email credentials
   - Ensure firewall allows SMTP connections

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=backlinks:*
```

## Security Considerations

- API keys and credentials are never logged
- Browser instances are properly cleaned up
- Rate limiting prevents abuse
- Respects site terms of service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Production Readiness

This module is production-ready with the following characteristics:

### ✅ **Real Data Only**

- No simulated or fake metrics (Domain Authority, traffic estimates)
- Uses only extractable site information (titles, descriptions, forms)
- Transparent and reliable scoring based on real site characteristics

### ✅ **Robust Architecture**

- SQLite persistent storage with proper schema
- Native fetch API (no external HTTP dependencies)
- Comprehensive error handling and validation
- Rate limiting and respectful crawling practices

### ✅ **Quality Assurance**

- 42 passing tests covering all functionality
- Automated testing for database operations
- Mock-based testing for external dependencies
- Continuous integration ready

### ✅ **Security & Compliance**

- Input validation and sanitization
- URL safety checks and validation
- Secure credential handling
- Browser security configurations

### 🔧 **Optional Enhancements for Enterprise Use**

For enterprise deployments, consider adding:

1. **Real SEO Metrics Integration**:

   ```javascript
   // Example: Moz API integration
   const mozData = await getMozMetrics(url, apiKey);
   siteInfo.domainAuthority = mozData.domainAuthority;
   ```

2. **Advanced Analytics APIs**:

   - Ahrefs API for backlink analysis
   - SEMrush API for traffic data
   - Google Search Console integration

3. **Enhanced Monitoring**:
   - Application performance monitoring
   - Error tracking and alerting
   - Campaign success rate monitoring

## License

This module is part of the MCP Server project and follows the same licensing terms.

## Support

For issues and questions:

- Check the troubleshooting section
- Review the API documentation
- Submit issues through the project repository

---

**Note**: This module is designed for legitimate SEO and marketing purposes. Always respect website terms of service and follow ethical link-building practices.
