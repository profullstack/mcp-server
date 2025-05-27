/**
 * QR Code Generator Usage Examples
 *
 * This file demonstrates how to use the QR generator module
 * for various QR code generation scenarios.
 */

const API_BASE_URL = 'http://localhost:3000'; // MCP server URL

/**
 * Example 1: Basic QR Code Generation
 */
async function basicQRExample() {
  console.log('📱 Example 1: Basic QR Code Generation');

  try {
    const response = await fetch(`${API_BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello, World!',
      }),
    });

    const result = await response.json();

    if (result.result) {
      const qr = result.result;
      console.log('✅ QR code generated successfully!');
      console.log(`📝 Text: "${qr.input.text}"`);
      console.log(`📏 Size: ${qr.qrCode.size.pixels}x${qr.qrCode.size.pixels} pixels`);
      console.log(`🔧 Format: ${qr.metadata.format.toUpperCase()}`);
      console.log(`📊 Modules: ${qr.qrCode.size.modules}x${qr.qrCode.size.modules}`);
      console.log(`💾 Data length: ${qr.qrCode.data.length} characters`);
      console.log(`📈 Capacity utilization: ${qr.statistics.capacity.utilization}%`);
    } else {
      console.error('❌ Failed to generate QR code:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 2: URL QR Code
 */
async function urlQRExample() {
  console.log('\n🌐 Example 2: URL QR Code Generation');

  try {
    const response = await fetch(`${API_BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'https://github.com/profullstack/mcp-server',
        size: 250,
        errorCorrectionLevel: 'M',
      }),
    });

    const result = await response.json();

    if (result.result) {
      const qr = result.result;
      console.log('✅ URL QR code generated!');
      console.log(`🔗 URL: ${qr.input.text}`);
      console.log(`📏 Size: ${qr.qrCode.size.pixels}px`);
      console.log(`🛡️ Error Correction: ${qr.metadata.errorCorrectionLevel}`);
      console.log('📱 Usage: Scan with any QR code reader to open URL');
      console.log(`💡 Tip: ${qr.usage.description}`);
    } else {
      console.error('❌ Failed to generate URL QR code:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 3: High-Quality Print QR Code (SVG)
 */
async function printQRExample() {
  console.log('\n🖨️ Example 3: High-Quality Print QR Code (SVG)');

  try {
    const response = await fetch(`${API_BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Print-quality QR code for business cards and flyers',
        size: 400,
        format: 'svg',
        errorCorrectionLevel: 'H',
        margin: 6,
      }),
    });

    const result = await response.json();

    if (result.result) {
      const qr = result.result;
      console.log('✅ Print-quality QR code generated!');
      console.log(`📄 Format: ${qr.metadata.format.toUpperCase()} (vector graphics)`);
      console.log(`📏 Size: ${qr.qrCode.size.pixels}px (scalable)`);
      console.log(`🛡️ Error Correction: ${qr.metadata.errorCorrectionLevel} (High - 30%)`);
      console.log(`📐 Margin: ${qr.metadata.margin} modules`);
      console.log('🖨️ Perfect for: Business cards, flyers, posters');
      console.log(`💾 SVG data length: ${qr.qrCode.data.length} characters`);

      // Show how to decode SVG
      console.log('\n📋 To use SVG data:');
      console.log('   const svgMarkup = Buffer.from(qrCode.data, "base64").toString();');
    } else {
      console.error('❌ Failed to generate print QR code:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 4: Contact vCard QR Code
 */
async function contactQRExample() {
  console.log('\n👤 Example 4: Contact vCard QR Code');

  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Profullstack, Inc.
TITLE:Software Engineer
TEL:+1-555-123-4567
EMAIL:john.doe@profullstack.com
URL:https://profullstack.com
ADR:;;123 Tech Street;San Francisco;CA;94105;USA
NOTE:Scan to add contact information
END:VCARD`;

  try {
    const response = await fetch(`${API_BASE_URL}/tools/qr-generator`, {
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

    const result = await response.json();

    if (result.result) {
      const qr = result.result;
      console.log('✅ Contact vCard QR code generated!');
      console.log('👤 Contact: John Doe');
      console.log('🏢 Organization: Profullstack, Inc.');
      console.log(`📏 Size: ${qr.qrCode.size.pixels}px`);
      console.log(`📝 Text length: ${qr.input.textLength} characters`);
      console.log(`🛡️ Error Correction: ${qr.metadata.errorCorrectionLevel} (Quartile - 25%)`);
      console.log('📱 Usage: Scan to add contact to phone');
      console.log(`📊 Encoding: ${qr.statistics.input.encoding} mode`);
    } else {
      console.error('❌ Failed to generate contact QR code:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 5: WiFi Network QR Code
 */
async function wifiQRExample() {
  console.log('\n📶 Example 5: WiFi Network QR Code');

  const wifiConfig = 'WIFI:T:WPA;S:MyHomeNetwork;P:supersecurepassword123;H:false;;';

  try {
    const response = await fetch(`${API_BASE_URL}/tools/qr-generator`, {
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

    const result = await response.json();

    if (result.result) {
      const qr = result.result;
      console.log('✅ WiFi QR code generated!');
      console.log('📶 Network: MyHomeNetwork');
      console.log('🔒 Security: WPA');
      console.log(`📏 Size: ${qr.qrCode.size.pixels}px`);
      console.log(
        `🛡️ Error Correction: ${qr.metadata.errorCorrectionLevel} (High - passwords are critical)`
      );
      console.log('📱 Usage: Scan to connect to WiFi network');
      console.log('⚠️ Note: Contains sensitive password information');
    } else {
      console.error('❌ Failed to generate WiFi QR code:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 6: Base64 Data URL QR Code (Ready for HTML)
 */
async function base64QRExample() {
  console.log('\n🖼️ Example 6: Base64 Data URL QR Code');

  try {
    const response = await fetch(`${API_BASE_URL}/tools/qr-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Ready-to-use data URL format',
        format: 'base64',
      }),
    });

    const result = await response.json();

    if (result.result) {
      const qr = result.result;
      console.log('✅ Base64 data URL QR code generated!');
      console.log(`🔧 Format: ${qr.metadata.format.toUpperCase()}`);
      console.log(`📝 Encoding: ${qr.qrCode.encoding}`);
      console.log('🌐 Ready for HTML: Yes');
      console.log(`💾 Data URL length: ${qr.qrCode.data.length} characters`);
      console.log('📋 Usage example:');
      console.log(`   <img src="${qr.qrCode.data.substring(0, 50)}..." alt="QR Code" />`);
      console.log(`💡 Tip: ${qr.usage.description}`);
    } else {
      console.error('❌ Failed to generate base64 QR code:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 7: Different Error Correction Levels Comparison
 */
async function errorCorrectionComparisonExample() {
  console.log('\n🛡️ Example 7: Error Correction Levels Comparison');

  const testText = 'Error correction comparison test';
  const levels = ['L', 'M', 'Q', 'H'];
  const descriptions = {
    L: 'Low (~7% correction)',
    M: 'Medium (~15% correction)',
    Q: 'Quartile (~25% correction)',
    H: 'High (~30% correction)',
  };

  try {
    console.log('🔍 Generating QR codes with different error correction levels...\n');

    for (const level of levels) {
      const response = await fetch(`${API_BASE_URL}/tools/qr-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          errorCorrectionLevel: level,
          size: 200,
        }),
      });

      const result = await response.json();

      if (result.result) {
        const qr = result.result;
        console.log(`🛡️ Level ${level}: ${descriptions[level]}`);
        console.log(`   📊 Modules: ${qr.qrCode.size.modules}x${qr.qrCode.size.modules}`);
        console.log(`   💾 Data size: ${qr.qrCode.data.length} chars`);
        console.log(`   📈 Capacity used: ${qr.statistics.capacity.utilization}%`);
        console.log(`   🎯 Best for: ${getBestUseCase(level)}\n`);
      }
    }

    console.log('💡 Key takeaways:');
    console.log('   • Higher error correction = larger QR codes');
    console.log('   • Higher error correction = better damage resistance');
    console.log('   • Choose based on your use case and environment');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 8: Size Optimization Example
 */
async function sizeOptimizationExample() {
  console.log('\n📏 Example 8: Size Optimization');

  const testCases = [
    { text: '1234567890', description: 'Numeric (most efficient)' },
    { text: 'HELLO123', description: 'Alphanumeric (efficient)' },
    { text: 'Hello, World!', description: 'Mixed case (standard)' },
    { text: 'Hello, 世界! 🌍', description: 'Unicode (least efficient)' },
  ];

  try {
    console.log('🔍 Testing encoding efficiency with different text types...\n');

    for (const testCase of testCases) {
      const response = await fetch(`${API_BASE_URL}/tools/qr-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testCase.text,
          size: 200,
        }),
      });

      const result = await response.json();

      if (result.result) {
        const qr = result.result;
        console.log(`📝 ${testCase.description}:`);
        console.log(`   Text: "${testCase.text}"`);
        console.log(`   📊 Encoding: ${qr.statistics.input.encoding}`);
        console.log(`   📏 Modules: ${qr.qrCode.size.modules}x${qr.qrCode.size.modules}`);
        console.log(`   ⚡ Efficiency: ${qr.statistics.input.efficiency}`);
        console.log(`   📈 Utilization: ${qr.statistics.capacity.utilization}%\n`);
      }
    }

    console.log('💡 Optimization tips:');
    console.log('   • Use numbers only when possible (numeric mode)');
    console.log('   • Use uppercase letters for alphanumeric mode');
    console.log('   • Avoid special characters and Unicode when possible');
    console.log('   • Consider text length vs. QR code size trade-offs');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 9: Batch QR Code Generation
 */
async function batchQRExample() {
  console.log('\n📦 Example 9: Batch QR Code Generation');

  const batchData = [
    { id: 'product-001', text: 'https://store.example.com/product/001', type: 'Product URL' },
    { id: 'contact-john', text: 'mailto:john@example.com', type: 'Email' },
    { id: 'phone-support', text: 'tel:+1-555-123-4567', type: 'Phone' },
    { id: 'location-hq', text: 'geo:37.7749,-122.4194', type: 'Location' },
  ];

  try {
    console.log(`🔄 Generating ${batchData.length} QR codes...\n`);

    const results = [];

    for (const item of batchData) {
      const response = await fetch(`${API_BASE_URL}/tools/qr-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: item.text,
          size: 150,
        }),
      });

      const result = await response.json();

      if (result.result) {
        results.push({
          id: item.id,
          type: item.type,
          success: true,
          size: result.result.qrCode.size.modules,
          dataLength: result.result.qrCode.data.length,
        });

        console.log(`✅ ${item.id}: ${item.type}`);
        console.log(`   📝 Text: ${item.text}`);
        console.log(
          `   📊 Size: ${result.result.qrCode.size.modules}x${result.result.qrCode.size.modules} modules`
        );
      } else {
        results.push({
          id: item.id,
          type: item.type,
          success: false,
          error: result.error,
        });

        console.log(`❌ ${item.id}: Failed - ${result.error}`);
      }
    }

    console.log('\n📊 Batch Generation Summary:');
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Successful: ${successful}/${results.length}`);
    console.log(`❌ Failed: ${results.length - successful}/${results.length}`);

    if (successful > 0) {
      const avgSize =
        results.filter(r => r.success).reduce((sum, r) => sum + r.size, 0) / successful;
      console.log(`📏 Average size: ${Math.round(avgSize)}x${Math.round(avgSize)} modules`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 10: QR Code Information and Validation
 */
async function qrInfoExample() {
  console.log('\n📋 Example 10: QR Code Information and Validation');

  const testTexts = [
    'Short text',
    'This is a longer text that will require more space in the QR code',
    'a'.repeat(1000), // Long text
    'a'.repeat(5000), // Too long text
  ];

  try {
    for (let i = 0; i < testTexts.length; i++) {
      const text = testTexts[i];
      console.log(`\n🔍 Test ${i + 1}: ${text.length} characters`);

      try {
        const response = await fetch(
          `${API_BASE_URL}/qr-generator/info?text=${encodeURIComponent(text)}&errorCorrectionLevel=M`
        );
        const info = await response.json();

        if (info.canEncode) {
          console.log('✅ Can encode: Yes');
          console.log(`📏 Text length: ${info.info.textLength}/${info.info.maxLength}`);
          console.log(`📊 Estimated size: ${info.info.estimatedSize.description}`);
          console.log(`🛡️ Error correction: ${info.info.errorCorrectionLevel}`);
        } else {
          console.log('❌ Can encode: No');
          console.log(`📏 Text length: ${text.length} (too long)`);
        }
      } catch (error) {
        console.log(`❌ Validation failed: ${error.message}`);
      }
    }

    console.log('\n💡 Validation tips:');
    console.log('   • Check text length before generation');
    console.log('   • Use info endpoint to estimate QR code size');
    console.log('   • Consider error correction level impact on capacity');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Helper function to get best use case for error correction level
 */
function getBestUseCase(level) {
  const useCases = {
    L: 'Clean environments, digital displays',
    M: 'General use, web, mobile apps',
    Q: 'Print materials, business cards',
    H: 'Outdoor use, damaged surfaces',
  };
  return useCases[level] || 'General use';
}

/**
 * Main function to run all examples
 */
async function runExamples() {
  console.log('🚀 QR Code Generator Usage Examples\n');

  console.log('📋 Setup Instructions:');
  console.log('1. Ensure the MCP server is running on the correct port');
  console.log('2. The QR generator module uses the qrcode library');
  console.log('3. No external API dependencies - fully self-contained');
  console.log('4. Supports PNG, SVG, and Base64 output formats');
  console.log('5. Run: node examples/usage-example.js\n');

  // Run examples with delays to avoid overwhelming the console
  await basicQRExample();
  await new Promise(resolve => setTimeout(resolve, 500));

  await urlQRExample();
  await new Promise(resolve => setTimeout(resolve, 500));

  await printQRExample();
  await new Promise(resolve => setTimeout(resolve, 500));

  await contactQRExample();
  await new Promise(resolve => setTimeout(resolve, 500));

  await wifiQRExample();
  await new Promise(resolve => setTimeout(resolve, 500));

  await base64QRExample();
  await new Promise(resolve => setTimeout(resolve, 500));

  await errorCorrectionComparisonExample();
  await new Promise(resolve => setTimeout(resolve, 500));

  await sizeOptimizationExample();
  await new Promise(resolve => setTimeout(resolve, 500));

  await batchQRExample();
  await new Promise(resolve => setTimeout(resolve, 500));

  await qrInfoExample();

  console.log('\n✨ All QR generator examples completed!');
  console.log('\n💡 Key Features:');
  console.log('• Multiple output formats (PNG, SVG, Base64)');
  console.log('• Customizable size, error correction, and margin');
  console.log('• Support for up to 4,296 characters');
  console.log('• Optimized presets for different use cases');
  console.log('• Comprehensive validation and error handling');
  console.log('• No data storage - stateless operation');
  console.log('• Binary image data ready for immediate use');
}

// Run examples if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export {
  basicQRExample,
  urlQRExample,
  printQRExample,
  contactQRExample,
  wifiQRExample,
  base64QRExample,
  errorCorrectionComparisonExample,
  sizeOptimizationExample,
  batchQRExample,
  qrInfoExample,
};
