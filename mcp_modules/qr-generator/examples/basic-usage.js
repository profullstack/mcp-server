/**
 * QR Code Generator Basic Usage Example
 *
 * This file demonstrates how to use the QR generator module in your application.
 *
 * To run this example:
 * 1. Start the MCP server
 * 2. Make requests to the QR generator module endpoints
 */

// Example using fetch API (for browser or Node.js with node-fetch)
async function qrGeneratorExample() {
  const BASE_URL = 'https://mcp.profullstack.com'; // Live MCP server

  try {
    console.log('QR Code Generator Example');
    console.log('=========================');

    // 1. Generate a basic QR code
    console.log('\n1. Generating a basic QR code...');
    const basicResponse = await fetch(`${BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello, World!',
      }),
    });

    const basicResult = await basicResponse.json();
    console.log('Basic QR code generated:', {
      success: basicResult.result ? true : false,
      size: basicResult.result?.qrCode.size.pixels,
      format: basicResult.result?.metadata.format,
      dataLength: basicResult.result?.qrCode.data.length,
    });

    // 2. Generate a URL QR code that opens in browser
    console.log('\n2. Generating a URL QR code...');
    const urlResponse = await fetch(`${BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'https://mcp.profullstack.com',
        size: 250,
        errorCorrectionLevel: 'M',
      }),
    });

    const urlResult = await urlResponse.json();
    console.log('URL QR code generated:', {
      success: urlResult.result ? true : false,
      url: urlResult.result?.input.text,
      size: urlResult.result?.qrCode.size.pixels,
      errorCorrection: urlResult.result?.metadata.errorCorrectionLevel,
    });

    // Show how to use the QR code data
    if (urlResult.result) {
      const qrCode = urlResult.result.qrCode;
      console.log('\n📱 Usage Instructions:');
      console.log('• Copy the base64 data and use in an <img> tag:');
      console.log(
        `  <img src="data:${qrCode.mimeType};base64,${qrCode.data.substring(0, 50)}..." />`
      );
      console.log('• Scan with any smartphone camera to open the URL');
    }

    // 3. Generate a high-quality SVG QR code
    console.log('\n3. Generating a high-quality SVG QR code...');
    const svgResponse = await fetch(`${BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'High-quality QR code for printing',
        size: 400,
        format: 'svg',
        errorCorrectionLevel: 'H',
        margin: 6,
      }),
    });

    const svgResult = await svgResponse.json();
    console.log('SVG QR code generated:', {
      success: svgResult.result ? true : false,
      format: svgResult.result?.metadata.format,
      size: svgResult.result?.qrCode.size.pixels,
      errorCorrection: svgResult.result?.metadata.errorCorrectionLevel,
      margin: svgResult.result?.metadata.margin,
    });

    // 4. Generate a contact vCard QR code
    console.log('\n4. Generating a contact vCard QR code...');
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Profullstack, Inc.
TEL:+1-555-123-4567
EMAIL:john.doe@profullstack.com
URL:https://profullstack.com
END:VCARD`;

    const vcardResponse = await fetch(`${BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: vcard,
        size: 300,
        errorCorrectionLevel: 'Q',
      }),
    });

    const vcardResult = await vcardResponse.json();
    console.log('vCard QR code generated:', {
      success: vcardResult.result ? true : false,
      textLength: vcardResult.result?.input.textLength,
      encoding: vcardResult.result?.statistics.input.encoding,
      utilization: vcardResult.result?.statistics.capacity.utilization,
    });

    // 5. Generate a WiFi QR code
    console.log('\n5. Generating a WiFi QR code...');
    const wifiConfig = 'WIFI:T:WPA;S:MyHomeNetwork;P:supersecurepassword123;H:false;;';

    const wifiResponse = await fetch(`${BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: wifiConfig,
        size: 250,
        errorCorrectionLevel: 'H',
      }),
    });

    const wifiResult = await wifiResponse.json();
    console.log('WiFi QR code generated:', {
      success: wifiResult.result ? true : false,
      errorCorrection: wifiResult.result?.metadata.errorCorrectionLevel,
      note: 'High error correction for critical password data',
    });

    // 6. Generate a Base64 data URL QR code (ready for HTML)
    console.log('\n6. Generating a Base64 data URL QR code...');
    const base64Response = await fetch(`${BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Ready-to-use data URL format',
        format: 'base64',
      }),
    });

    const base64Result = await base64Response.json();
    console.log('Base64 QR code generated:', {
      success: base64Result.result ? true : false,
      format: base64Result.result?.metadata.format,
      encoding: base64Result.result?.qrCode.encoding,
      readyForHTML: true,
    });

    if (base64Result.result) {
      console.log('📋 HTML Usage:');
      console.log(
        `  <img src="${base64Result.result.qrCode.data.substring(0, 50)}..." alt="QR Code" />`
      );
    }

    console.log('\n✨ Example completed successfully!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('• Basic text QR code generation');
    console.log('• URL QR codes that open in browsers when scanned');
    console.log('• High-quality SVG format for printing');
    console.log('• Contact vCard QR codes');
    console.log('• WiFi network sharing QR codes');
    console.log('• Base64 data URLs ready for HTML');
    console.log('• Multiple error correction levels');
    console.log('• Customizable sizes and margins');
  } catch (error) {
    console.error('❌ Error in example:', error.message);
  }
}

// Example using the MCP tool directly (for other modules)
async function qrGeneratorMcpToolExample() {
  console.log('\nQR Generator MCP Tool Example');
  console.log('=============================');

  // This would be used in another module or client that has access to the MCP tools
  const exampleUsage = `
  // Example of using the QR generator tool in another module
  const result = await useQrGeneratorTool({
    text: 'https://example.com',
    size: 200,
    errorCorrectionLevel: 'M'
  });
  
  if (result.success) {
    console.log('QR code generated successfully!');
    console.log('Data:', result.qrCode.data);
    console.log('MIME type:', result.qrCode.mimeType);
    console.log('Size:', result.qrCode.size.pixels + 'px');
    
    // Use in HTML
    const imgElement = document.createElement('img');
    imgElement.src = \`data:\${result.qrCode.mimeType};base64,\${result.qrCode.data}\`;
    document.body.appendChild(imgElement);
  }
  `;

  console.log(exampleUsage);
}

// Uncomment to run the examples
// qrGeneratorExample();
// qrGeneratorMcpToolExample();

export { qrGeneratorExample, qrGeneratorMcpToolExample };
