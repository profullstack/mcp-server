# QR Code Generator Module

A comprehensive QR code generator module for the MCP server that converts text input into QR codes with customizable options. Returns binary image data in multiple formats (PNG, SVG, Base64) that can be used anywhere.

## Features

- **Multiple Output Formats** - PNG, SVG, and Base64 data URL formats
- **Customizable Options** - Size, error correction level, margin, and format control
- **High Capacity** - Supports up to 4,296 characters of text input
- **Error Correction** - Four levels of error correction (L, M, Q, H)
- **No Data Storage** - Stateless operation, no data persistence
- **Binary Image Data** - Returns ready-to-use image data
- **Comprehensive Validation** - Input validation and sanitization
- **Multiple Use Cases** - Optimized presets for URLs, text, printing, mobile, etc.

## Supported Features

### Output Formats

- **PNG**: Binary image data encoded in base64
- **SVG**: Vector graphics encoded in base64
- **Base64**: Complete data URL ready for immediate use

### Error Correction Levels

- **L (Low)**: ~7% error correction - smallest QR codes
- **M (Medium)**: ~15% error correction - balanced (default)
- **Q (Quartile)**: ~25% error correction - good for printed materials
- **H (High)**: ~30% error correction - best for damaged/dirty environments

### Customization Options

- **Size**: 50-1000 pixels (default: 200)
- **Margin**: 0-10 modules around QR code (default: 4)
- **Format**: PNG, SVG, or Base64 output
- **Error Correction**: L, M, Q, H levels

## Usage

### As an MCP Tool

**Basic QR Code Generation:**

```json
{
  "text": "Hello, World!"
}
```

**Advanced Options:**

```json
{
  "text": "https://example.com",
  "size": 300,
  "format": "svg",
  "errorCorrectionLevel": "H",
  "margin": 6
}
```

### HTTP Endpoints

#### POST /qr-generator/generate

Generate a QR code from text input.

**Request Body:**

```json
{
  "text": "Hello, World!",
  "size": 200,
  "format": "png",
  "errorCorrectionLevel": "M",
  "margin": 4
}
```

**Response:**

```json
{
  "success": true,
  "qrCode": {
    "data": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png",
    "encoding": "base64",
    "size": {
      "pixels": 200,
      "modules": 25
    }
  },
  "input": {
    "text": "Hello, World!",
    "textLength": 13,
    "options": {
      "size": 200,
      "format": "png",
      "errorCorrectionLevel": "M",
      "margin": 4
    }
  },
  "metadata": {
    "errorCorrectionLevel": "M",
    "margin": 4,
    "format": "png",
    "estimatedSize": "Estimated 25x25 modules"
  },
  "usage": {
    "description": "PNG image data encoded in base64",
    "usage": "Decode base64 and save as .png file, or use in <img> tag with data URL",
    "example": "data:image/png;base64,[qrCode.data]"
  },
  "statistics": {
    "input": {
      "length": 13,
      "encoding": "binary",
      "efficiency": "standard"
    },
    "capacity": {
      "used": 13,
      "available": 2331,
      "utilization": 1
    }
  }
}
```

#### GET /qr-generator/info

Get information about QR code generation capabilities.

**Query Parameters:**

- `text` (optional): Analyze specific text
- `errorCorrectionLevel` (optional): Error correction level for analysis

#### POST /tools/qr-generator

MCP tool endpoint for QR code generation.

## Examples

### Generate Basic QR Code

```javascript
const response = await fetch('/tools/qr-generator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello, World!',
  }),
});

const result = await response.json();
console.log('QR Code generated:', result.result.qrCode.data);
```

### Generate URL QR Code

```javascript
const response = await fetch('/tools/qr-generator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'https://example.com',
    size: 250,
    errorCorrectionLevel: 'M',
  }),
});

const result = await response.json();
// Use the base64 data in an image tag
const imgSrc = `data:${result.result.qrCode.mimeType};base64,${result.result.qrCode.data}`;
```

### Generate High-Quality Print QR Code

```javascript
const response = await fetch('/tools/qr-generator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Print-quality QR code',
    size: 400,
    format: 'svg',
    errorCorrectionLevel: 'H',
    margin: 6,
  }),
});

const result = await response.json();
// Decode base64 to get SVG markup
const svgMarkup = Buffer.from(result.result.qrCode.data, 'base64').toString();
```

### Generate Contact vCard QR Code

```javascript
const vcard = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Example Corp
TEL:+1234567890
EMAIL:john@example.com
URL:https://johndoe.com
END:VCARD`;

const response = await fetch('/tools/qr-generator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: vcard,
    size: 300,
    errorCorrectionLevel: 'Q',
  }),
});
```

### Generate WiFi QR Code

```javascript
const wifiConfig = 'WIFI:T:WPA;S:MyNetwork;P:mypassword123;H:false;;';

const response = await fetch('/tools/qr-generator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: wifiConfig,
    size: 250,
    errorCorrectionLevel: 'H',
  }),
});
```

## Use Case Presets

The module includes optimized presets for common use cases:

### URL/Link QR Codes

```json
{
  "size": 200,
  "errorCorrectionLevel": "M",
  "margin": 4,
  "format": "png"
}
```

### Text Content QR Codes

```json
{
  "size": 250,
  "errorCorrectionLevel": "Q",
  "margin": 4,
  "format": "png"
}
```

### Print Quality QR Codes

```json
{
  "size": 400,
  "errorCorrectionLevel": "H",
  "margin": 6,
  "format": "svg"
}
```

### Mobile Optimized QR Codes

```json
{
  "size": 150,
  "errorCorrectionLevel": "M",
  "margin": 3,
  "format": "png"
}
```

## Data Formats and Usage

### PNG Format

- **Output**: Base64-encoded PNG image data
- **Usage**: Decode base64 and save as .png file
- **Best for**: Web display, mobile apps, general use

```javascript
// Convert to usable image
const imageData = `data:image/png;base64,${qrCode.data}`;
document.getElementById('qr-image').src = imageData;
```

### SVG Format

- **Output**: Base64-encoded SVG markup
- **Usage**: Decode base64 to get SVG markup
- **Best for**: Print materials, scalable graphics, web

```javascript
// Convert to SVG markup
const svgMarkup = Buffer.from(qrCode.data, 'base64').toString();
document.getElementById('qr-container').innerHTML = svgMarkup;
```

### Base64 Format

- **Output**: Complete data URL ready for immediate use
- **Usage**: Use directly in image src attributes
- **Best for**: Quick implementation, immediate display

```javascript
// Use directly
document.getElementById('qr-image').src = qrCode.data;
```

## Capacity and Limitations

### Text Capacity

- **Maximum Length**: 4,296 characters
- **Numeric Mode**: Up to 7,089 digits (most efficient)
- **Alphanumeric Mode**: Up to 4,296 characters (A-Z, 0-9, space, $%\*+-./:)
- **Binary Mode**: Up to 2,953 bytes (all characters, least efficient)

### Size Limitations

- **Minimum Size**: 50x50 pixels
- **Maximum Size**: 1000x1000 pixels
- **Recommended**: 150-400 pixels for most use cases

### Error Correction Trade-offs

- **Higher Error Correction**: Larger QR codes, better damage resistance
- **Lower Error Correction**: Smaller QR codes, less damage resistance

## Common Use Cases

### Website URLs

```javascript
const url = 'https://example.com/page?param=value';
// Recommended: Medium error correction, standard size
```

### Contact Information (vCard)

```javascript
const vcard = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
TEL:+1234567890
EMAIL:john@example.com
END:VCARD`;
// Recommended: Quartile error correction, larger size
```

### WiFi Network Sharing

```javascript
const wifi = 'WIFI:T:WPA;S:NetworkName;P:password123;H:false;;';
// Recommended: High error correction (passwords are critical)
```

### Plain Text Messages

```javascript
const message = 'Hello, this is a QR code message!';
// Recommended: Medium error correction, standard size
```

### App Store Links

```javascript
const appStore = 'https://apps.apple.com/app/id123456789';
const playStore = 'https://play.google.com/store/apps/details?id=com.example.app';
// Recommended: Medium error correction, mobile-optimized size
```

## Error Handling

The module provides comprehensive error handling:

### Input Validation Errors

```json
{
  "error": "Text too long. Maximum length is 4296 characters."
}
```

```json
{
  "error": "Size must be between 50 and 1000 pixels"
}
```

### Format Validation Errors

```json
{
  "error": "Format must be png, svg, or base64"
}
```

```json
{
  "error": "Error correction level must be L, M, Q, or H"
}
```

### Common Error Solutions

1. **Text Too Long**: Reduce text length or use more efficient encoding
2. **Invalid Size**: Use size between 50-1000 pixels
3. **Invalid Format**: Use 'png', 'svg', or 'base64'
4. **Invalid Error Correction**: Use 'L', 'M', 'Q', or 'H'

## Performance Considerations

### Generation Speed

- **PNG**: Fast generation, moderate file size
- **SVG**: Fast generation, small file size, scalable
- **Base64**: Fastest for immediate use

### File Size Optimization

- **Lower Error Correction**: Smaller QR codes
- **Numeric/Alphanumeric Text**: More efficient encoding
- **SVG Format**: Smallest file size for simple graphics

### Memory Usage

- No data persistence - stateless operation
- Temporary image generation only
- Automatic cleanup after response

## Integration Examples

### HTML/JavaScript

```html
<img id="qr-code" alt="QR Code" />

<script>
  async function generateQR(text) {
    const response = await fetch('/tools/qr-generator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, format: 'base64' }),
    });

    const result = await response.json();
    document.getElementById('qr-code').src = result.result.qrCode.data;
  }

  generateQR('Hello, World!');
</script>
```

### Node.js/Express

```javascript
app.post('/generate-qr', async (req, res) => {
  try {
    const response = await fetch('http://localhost:3000/tools/qr-generator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: req.body.text,
        size: req.body.size || 200,
      }),
    });

    const result = await response.json();

    if (result.result.qrCode.format === 'png') {
      const buffer = Buffer.from(result.result.qrCode.data, 'base64');
      res.set('Content-Type', 'image/png');
      res.send(buffer);
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Python Integration

```python
import requests
import base64
from PIL import Image
from io import BytesIO

def generate_qr_code(text, size=200):
    response = requests.post('http://localhost:3000/tools/qr-generator',
                           json={'text': text, 'size': size})

    if response.status_code == 200:
        result = response.json()
        qr_data = result['result']['qrCode']['data']

        # Convert base64 to image
        image_data = base64.b64decode(qr_data)
        image = Image.open(BytesIO(image_data))
        return image
    else:
        raise Exception(f"Failed to generate QR code: {response.text}")

# Usage
qr_image = generate_qr_code("Hello, World!")
qr_image.save("qrcode.png")
```

## Testing

The module includes comprehensive tests covering:

- **Input Validation**: Text length, format options, parameter validation
- **QR Code Generation**: All formats, error correction levels, sizes
- **Error Handling**: Invalid inputs, edge cases
- **Integration**: Real QR code generation and consistency
- **Utility Functions**: Encoding detection, capacity calculation, formatting

Run tests with:

```bash
cd mcp_modules/qr-generator
pnpm test
```

## Dependencies

- **qrcode**: QR code generation library
- **Node.js**: >=18.0.0
- **No external API dependencies**: Fully self-contained

## License

MIT License - see the main project license for details.

## Contributing

When contributing to this module:

1. Follow the established template structure
2. Add comprehensive error handling
3. Include input validation and sanitization
4. Test with various text inputs and options
5. Update documentation for new features
6. Ensure no data persistence (stateless operation)

## Troubleshooting

### Common Issues

1. **QR Code Not Scanning**

   - Increase error correction level
   - Ensure sufficient margin around QR code
   - Check if text encoding is appropriate

2. **File Size Too Large**

   - Use SVG format for scalable graphics
   - Reduce image size if appropriate
   - Consider lower error correction for smaller codes

3. **Text Not Fitting**
   - Check text length against capacity limits
   - Use numeric mode for numbers only
   - Consider splitting long text into multiple QR codes

### Best Practices

1. **For URLs**: Use medium error correction, standard size
2. **For Printing**: Use high error correction, SVG format, larger size
3. **For Mobile**: Use smaller size, medium error correction
4. **For Critical Data**: Use high error correction level
5. **For Large Text**: Check capacity limits, consider compression

## API Reference

### Main Endpoint

- `POST /tools/qr-generator` - Generate QR code with options

### Parameters

- `text` (required): Text to encode (max 4,296 characters)
- `size` (optional): Image size in pixels (50-1000, default: 200)
- `format` (optional): Output format - png, svg, base64 (default: png)
- `errorCorrectionLevel` (optional): L, M, Q, H (default: M)
- `margin` (optional): Margin in modules (0-10, default: 4)

### Response Format

- `success`: Boolean indicating success
- `qrCode`: Object containing image data and metadata
- `input`: Object containing input parameters and analysis
- `metadata`: Object containing generation metadata
- `usage`: Object containing usage instructions
- `statistics`: Object containing capacity and encoding statistics
