/**
 * Convert2Doc Module Usage Examples
 *
 * This file demonstrates how to use the convert2doc module
 * for various document conversion scenarios.
 */

import fs from 'fs';

// Example API key (replace with your actual convert2doc.com API key)
const API_KEY = 'your-convert2doc-api-key-here';
const API_BASE_URL = 'http://localhost:3000'; // MCP server URL

/**
 * Example 1: Convert PDF to Markdown
 */
async function convertPdfToMarkdown() {
  console.log('📄 Example 1: Converting PDF to Markdown');

  try {
    // Read a PDF file (you'll need to provide an actual PDF file)
    const pdfPath = './sample-document.pdf';

    if (fs.existsSync(pdfPath)) {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfBase64 = pdfBuffer.toString('base64');

      const response = await fetch(`${API_BASE_URL}/tools/convert2doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: API_KEY,
          fileBase64: pdfBase64,
          filename: 'sample-document.pdf',
          fromFormat: 'pdf',
          toFormat: 'markdown',
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ PDF conversion successful!');
        console.log('📝 Markdown preview:');
        console.log(result.convertedContent.substring(0, 500) + '...');

        // Save the markdown to a file
        fs.writeFileSync('converted-document.md', result.convertedContent);
        console.log('💾 Saved to: converted-document.md');
      } else {
        console.error('❌ Conversion failed:', result.error);
      }
    } else {
      console.log(
        '📁 Sample PDF file not found. Please add a PDF file named "sample-document.pdf"'
      );
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 2: Convert DOCX to Markdown
 */
async function convertDocxToMarkdown() {
  console.log('\n📄 Example 2: Converting DOCX to Markdown');

  try {
    const docxPath = './sample-document.docx';

    if (fs.existsSync(docxPath)) {
      const docxBuffer = fs.readFileSync(docxPath);
      const docxBase64 = docxBuffer.toString('base64');

      const response = await fetch(`${API_BASE_URL}/convert2doc/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: API_KEY,
          fileBase64: docxBase64,
          filename: 'sample-document.docx',
          fromFormat: 'docx',
          toFormat: 'markdown',
          store: true, // Store in Supabase
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ DOCX conversion successful!');
        console.log('📝 Markdown preview:');
        console.log(result.convertedContent.substring(0, 500) + '...');

        fs.writeFileSync('converted-docx.md', result.convertedContent);
        console.log('💾 Saved to: converted-docx.md');
      } else {
        console.error('❌ Conversion failed:', result.error);
      }
    } else {
      console.log(
        '📁 Sample DOCX file not found. Please add a DOCX file named "sample-document.docx"'
      );
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 3: Convert HTML to Markdown
 */
async function convertHtmlToMarkdown() {
  console.log('\n🌐 Example 3: Converting HTML to Markdown');

  try {
    // Sample HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sample Document</title>
      </head>
      <body>
        <h1>Welcome to Convert2Doc</h1>
        <p>This is a <strong>sample HTML document</strong> that will be converted to Markdown.</p>
        <h2>Features</h2>
        <ul>
          <li>Easy document conversion</li>
          <li>Multiple format support</li>
          <li>API integration</li>
        </ul>
        <p>Visit <a href="https://convert2doc.com">convert2doc.com</a> for more information.</p>
      </body>
      </html>
    `;

    const htmlBase64 = Buffer.from(htmlContent).toString('base64');

    const response = await fetch(`${API_BASE_URL}/tools/convert2doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: API_KEY,
        fileBase64: htmlBase64,
        filename: 'sample.html',
        fromFormat: 'html',
        toFormat: 'markdown',
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ HTML conversion successful!');
      console.log('📝 Converted Markdown:');
      console.log(result.convertedContent);

      fs.writeFileSync('converted-html.md', result.convertedContent);
      console.log('💾 Saved to: converted-html.md');
    } else {
      console.error('❌ Conversion failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 4: Get Supported Formats
 */
async function getSupportedFormats() {
  console.log('\n📋 Example 4: Getting Supported Formats');

  try {
    const response = await fetch(`${API_BASE_URL}/convert2doc/formats`);
    const formats = await response.json();

    console.log('✅ Supported formats:');
    console.log('📥 From formats:', formats.from.join(', '));
    console.log('📤 To formats:', formats.to.join(', '));
    console.log('\n🌟 Popular conversions:');
    formats.popular.forEach(conversion => {
      console.log(
        `  • ${conversion.from.toUpperCase()} → ${conversion.to.toUpperCase()}: ${conversion.description}`
      );
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 5: Batch Conversion
 */
async function batchConversion() {
  console.log('\n🔄 Example 5: Batch Document Conversion');

  const documents = [
    {
      content: '<h1>Document 1</h1><p>This is the first document.</p>',
      filename: 'doc1.html',
      format: 'html',
    },
    {
      content:
        '<h1>Document 2</h1><p>This is the second document with <strong>bold text</strong>.</p>',
      filename: 'doc2.html',
      format: 'html',
    },
  ];

  try {
    const conversions = documents.map(async (doc, index) => {
      const base64Content = Buffer.from(doc.content).toString('base64');

      const response = await fetch(`${API_BASE_URL}/tools/convert2doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: API_KEY,
          fileBase64: base64Content,
          filename: doc.filename,
          fromFormat: doc.format,
          toFormat: 'markdown',
        }),
      });

      const result = await response.json();

      if (result.success) {
        const outputFilename = `batch-converted-${index + 1}.md`;
        fs.writeFileSync(outputFilename, result.convertedContent);
        console.log(`✅ Converted ${doc.filename} → ${outputFilename}`);
        return { success: true, filename: outputFilename };
      } else {
        console.error(`❌ Failed to convert ${doc.filename}:`, result.error);
        return { success: false, filename: doc.filename, error: result.error };
      }
    });

    const results = await Promise.all(conversions);
    const successful = results.filter(r => r.success).length;

    console.log(`\n📊 Batch conversion complete: ${successful}/${documents.length} successful`);
  } catch (error) {
    console.error('❌ Batch conversion error:', error.message);
  }
}

/**
 * Example 6: Error Handling
 */
async function errorHandlingExample() {
  console.log('\n⚠️  Example 6: Error Handling');

  try {
    // Test with invalid API key
    const response = await fetch(`${API_BASE_URL}/tools/convert2doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: 'invalid-api-key',
        fileBase64: 'dGVzdCBjb250ZW50', // "test content" in base64
        filename: 'test.txt',
        fromFormat: 'txt',
        toFormat: 'markdown',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.log('✅ Error handling working correctly');
      console.log('📝 Error message:', result.error);
    }
  } catch (error) {
    console.log('✅ Network error handling working correctly');
    console.log('📝 Error:', error.message);
  }
}

/**
 * Main function to run all examples
 */
async function runExamples() {
  console.log('🚀 Convert2Doc Module Usage Examples\n');

  console.log('📋 Setup Instructions:');
  console.log('1. Replace API_KEY with your actual convert2doc.com API key');
  console.log('2. Ensure the MCP server is running on the correct port');
  console.log(
    '3. Add sample files (sample-document.pdf, sample-document.docx) for file-based examples'
  );
  console.log('4. Run: node examples/usage-example.js\n');

  // Run examples
  await getSupportedFormats();
  await convertHtmlToMarkdown();
  await batchConversion();
  await errorHandlingExample();

  // File-based examples (only if files exist)
  await convertPdfToMarkdown();
  await convertDocxToMarkdown();

  console.log('\n✨ All examples completed!');
  console.log('\n💡 Tips:');
  console.log('• Use PDF and DOCX formats for best conversion quality');
  console.log('• Markdown is the recommended target format for AI workflows');
  console.log('• Always implement error handling in production code');
  console.log('• Consider file size limits when converting large documents');
}

// Run examples if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export {
  convertPdfToMarkdown,
  convertDocxToMarkdown,
  convertHtmlToMarkdown,
  getSupportedFormats,
  batchConversion,
  errorHandlingExample,
};
