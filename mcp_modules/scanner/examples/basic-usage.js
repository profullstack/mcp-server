/**
 * Scanner Module Basic Usage Example
 *
 * This example demonstrates how to use the scanner module to perform
 * security scans on web applications.
 */

// Import the scanner module
import { scanTarget, getScanHistory, getScanStats, generateReport } from '../src/controller.js';

// Mock Hono context for testing
const createMockContext = (params = {}, query = {}, body = {}) => {
  return {
    req: {
      param: () => params,
      query: name => query[name],
      json: async () => body,
    },
    json: (data, status = 200) => {
      console.log('Response:', status, JSON.stringify(data, null, 2));
      return { status, data };
    },
    html: html => {
      console.log('HTML Response:', html.substring(0, 100) + '...');
      return { status: 200, html };
    },
  };
};

// Example 1: Perform a security scan
// eslint-disable-next-line no-unused-vars
async function exampleScan() {
  console.log('\n=== Example 1: Perform a security scan ===\n');

  const mockContext = createMockContext(
    {},
    {},
    {
      target: 'https://example.com',
      tools: ['nikto', 'nuclei'],
      verbose: true,
      timeout: 120,
    }
  );

  try {
    await scanTarget(mockContext);
    console.log('Scan completed successfully!');
  } catch (error) {
    console.error('Scan failed:', error.message);
  }
}

// Example 2: Get scan history
async function exampleGetScanHistory() {
  console.log('\n=== Example 2: Get scan history ===\n');

  const mockContext = createMockContext({}, { limit: '5' });

  try {
    await getScanHistory(mockContext);
    console.log('Retrieved scan history successfully!');
  } catch (error) {
    console.error('Failed to get scan history:', error.message);
  }
}

// Example 3: Get scan statistics
async function exampleGetScanStats() {
  console.log('\n=== Example 3: Get scan statistics ===\n');

  const mockContext = createMockContext();

  try {
    await getScanStats(mockContext);
    console.log('Retrieved scan statistics successfully!');
  } catch (error) {
    console.error('Failed to get scan statistics:', error.message);
  }
}

// Example 4: Generate a report
// eslint-disable-next-line no-unused-vars
async function exampleGenerateReport() {
  console.log('\n=== Example 4: Generate a report ===\n');

  // Assuming we have a scan ID from a previous scan
  const scanId = 'scan-1234567890';
  const mockContext = createMockContext({ id: scanId }, { format: 'json' });

  try {
    await generateReport(mockContext);
    console.log('Generated report successfully!');
  } catch (error) {
    console.error('Failed to generate report:', error.message);
  }
}

// Run the examples
async function runExamples() {
  try {
    console.log('Running Scanner Module Examples...\n');

    // Uncomment the examples you want to run
    // await exampleScan();
    await exampleGetScanHistory();
    await exampleGetScanStats();
    // await exampleGenerateReport();

    console.log('\nExamples completed!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

runExamples();
