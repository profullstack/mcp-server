# Convert2Doc Module

A powerful document conversion module for the MCP server that integrates with the convert2doc.com API to convert documents between various formats. This module is particularly useful for AI workflows where Markdown is the preferred format.

## Features

- **Multiple Format Support**: Convert between PDF, DOCX, DOC, EPUB, TXT, PPTX, XLSX, and HTML
- **Markdown-First**: Optimized for converting documents to Markdown for AI processing
- **Secure API Integration**: Uses convert2doc.com's robust conversion API
- **Flexible Configuration**: Supports custom API endpoints and storage options
- **Comprehensive Error Handling**: Detailed error messages and validation

## Supported Conversions

### From Formats

- **PDF** - Portable Document Format
- **DOCX** - Microsoft Word (modern format)
- **DOC** - Microsoft Word (legacy format)
- **EPUB** - Electronic Publication (e-books)
- **TXT** - Plain text files
- **PPTX** - Microsoft PowerPoint presentations
- **XLSX** - Microsoft Excel spreadsheets
- **HTML** - HyperText Markup Language

### To Formats

- **Markdown** - Primary target format for AI workflows
- **HTML** - Web-ready format
- **PDF** - Document format

### Popular Conversion Paths

- **PDF → Markdown** - Extract text from PDFs for AI processing
- **DOCX → Markdown** - Convert Word documents to Markdown
- **HTML → Markdown** - Clean web content for documentation
- **EPUB → Markdown** - Convert e-books to readable text format

## Usage

### As an MCP Tool

The convert2doc module can be used as an MCP tool with the following parameters:

```json
{
  "apiKey": "your-convert2doc-api-key",
  "fileBase64": "base64-encoded-file-content",
  "filename": "document.pdf",
  "fromFormat": "pdf",
  "toFormat": "markdown",
  "baseUrl": "https://convert2doc.com",
  "store": false
}
```

### HTTP Endpoints

#### GET /convert2doc

Get module information and supported formats.

**Response:**

```json
{
  "module": "convert2doc",
  "status": "active",
  "version": "1.0.0",
  "supportedFormats": {
    "from": ["pdf", "docx", "doc", "epub", "txt", "pptx", "xlsx", "html"],
    "to": ["markdown", "html", "pdf"]
  }
}
```

#### POST /convert2doc/convert

Convert a document between formats.

**Request Body:**

```json
{
  "apiKey": "your-api-key",
  "fileBase64": "base64-encoded-content",
  "filename": "document.pdf",
  "fromFormat": "pdf",
  "toFormat": "markdown",
  "baseUrl": "https://convert2doc.com",
  "store": false
}
```

**Response:**

```json
{
  "success": true,
  "originalFilename": "document.pdf",
  "fromFormat": "pdf",
  "toFormat": "markdown",
  "convertedContent": "# Document Title\n\nConverted markdown content...",
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

#### GET /convert2doc/formats

Get detailed information about supported conversion formats.

#### POST /tools/convert2doc

MCP tool endpoint for document conversion.

## API Key Setup

To use this module, you need a convert2doc.com API key:

1. Visit [convert2doc.com](https://convert2doc.com)
2. Sign up for an account
3. Generate an API key from your dashboard
4. Use the API key in your conversion requests

## Configuration

### Environment Variables (Optional)

```bash
CONVERT2DOC_API_KEY=your-default-api-key
CONVERT2DOC_BASE_URL=https://convert2doc.com
```

### Custom API Endpoint

You can specify a custom API endpoint if you're running your own convert2doc instance:

```json
{
  "baseUrl": "https://your-custom-convert2doc-instance.com"
}
```

## Examples

### Convert PDF to Markdown

```javascript
const fs = require('fs');

// Read PDF file
const pdfBuffer = fs.readFileSync('document.pdf');
const pdfBase64 = pdfBuffer.toString('base64');

// Convert using MCP tool
const response = await fetch('/tools/convert2doc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: 'your-api-key',
    fileBase64: pdfBase64,
    filename: 'document.pdf',
    fromFormat: 'pdf',
    toFormat: 'markdown',
  }),
});

const result = await response.json();
console.log(result.convertedContent);
```

### Convert DOCX to Markdown

```javascript
const response = await fetch('/convert2doc/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: 'your-api-key',
    fileBase64: docxBase64Content,
    filename: 'report.docx',
    fromFormat: 'docx',
    toFormat: 'markdown',
    store: true, // Store in Supabase
  }),
});
```

### Batch Conversion

```javascript
const documents = [
  { file: pdfBase64, filename: 'doc1.pdf', format: 'pdf' },
  { file: docxBase64, filename: 'doc2.docx', format: 'docx' },
  { file: htmlContent, filename: 'doc3.html', format: 'html' },
];

const convertedDocs = await Promise.all(
  documents.map(doc => convertDocument(apiKey, doc.file, doc.filename, doc.format, 'markdown'))
);
```

## Format-Specific Notes

### PDF Conversion

- **Quality**: Good text extraction, layout may be lost
- **Best For**: Text-heavy documents, reports, articles
- **Limitations**: Complex layouts, images, and tables may not convert perfectly

### DOCX/DOC Conversion

- **Quality**: Excellent formatting preservation
- **Best For**: Word documents, reports, manuscripts
- **Features**: Maintains headings, lists, and basic formatting

### EPUB Conversion

- **Quality**: Excellent for e-books
- **Best For**: Digital books, long-form content
- **Features**: Preserves chapter structure and metadata

### HTML Conversion

- **Quality**: Very good, maintains structure
- **Best For**: Web content, documentation
- **Features**: Converts semantic HTML to proper Markdown

### PowerPoint (PPTX) Conversion

- **Quality**: Text-only extraction
- **Best For**: Extracting presentation content
- **Limitations**: No layout, images, or animations

### Excel (XLSX) Conversion

- **Quality**: Limited, experimental
- **Best For**: Simple spreadsheets with text
- **Limitations**: Complex formulas and formatting not supported
- **Recommendation**: Convert to CSV first for better results

## Error Handling

The module provides comprehensive error handling for:

- **Authentication Errors**: Invalid API keys
- **Format Errors**: Unsupported format combinations
- **Network Errors**: API connectivity issues
- **Conversion Errors**: Document processing failures
- **Validation Errors**: Missing or invalid parameters

### Common Error Messages

```json
{
  "error": "API key is required"
}
```

```json
{
  "error": "Unsupported source format: xyz. Supported formats: pdf, docx, doc, epub, txt, pptx, xlsx, html"
}
```

```json
{
  "error": "Conversion failed: 401 Unauthorized - Invalid API key"
}
```

## Security

- **API Key Protection**: API keys are not logged or exposed
- **Secure Transmission**: All API calls use HTTPS
- **No Local Storage**: Files are not stored locally
- **Temporary Processing**: Files are processed and cleaned up immediately

## Performance Tips

1. **File Size**: Smaller files convert faster
2. **Format Choice**: DOCX and HTML convert most reliably
3. **Batch Processing**: Use Promise.all for multiple conversions
4. **Error Handling**: Always implement retry logic for network issues

## Troubleshooting

### Common Issues

1. **Invalid API Key**

   - Verify your convert2doc.com API key
   - Check if your subscription is active

2. **Conversion Failures**

   - Ensure the file is not corrupted
   - Try a different source format
   - Check file size limits

3. **Network Timeouts**

   - Increase timeout for large files
   - Implement retry logic
   - Check network connectivity

4. **Format Not Supported**
   - Verify the format combination is supported
   - Check the supported formats list

### Getting Help

- Review the [convert2doc.com documentation](https://convert2doc.com/docs)
- Check the API status page
- Contact convert2doc.com support for API issues

## Contributing

When contributing to this module:

1. Follow the established code patterns
2. Add comprehensive error handling
3. Update documentation for new features
4. Include format-specific limitations and tips
5. Test with various document types

## License

MIT License - see the main project license for details.
