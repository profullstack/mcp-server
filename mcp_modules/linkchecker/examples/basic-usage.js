/**
 * Basic Usage Example for Linkchecker Module
 *
 * This example demonstrates how to use the linkchecker module
 * to check links on a website.
 */

// Example of using the linkchecker module via HTTP API
async function basicLinkCheck() {
  const baseUrl = 'http://localhost:3000';

  try {
    // Check links on a website
    const response = await fetch(`${baseUrl}/linkchecker/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com',
        options: {
          recurse: false,
          timeout: 5000,
          concurrency: 50,
        },
      }),
    });

    const result = await response.json();
    console.log('Link check result:', JSON.stringify(result, null, 2));

    // Get the check ID for later reference
    const checkId = result.data.id;
    console.log('Check ID:', checkId);

    // Retrieve the result by ID
    const getResponse = await fetch(`${baseUrl}/linkchecker/results/${checkId}`);
    const getResult = await getResponse.json();
    console.log('Retrieved result:', JSON.stringify(getResult, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example of quick link check using GET request
async function quickLinkCheck() {
  const baseUrl = 'http://localhost:3000';

  try {
    const url = encodeURIComponent('https://example.com');
    const response = await fetch(`${baseUrl}/linkchecker/check?url=${url}`);
    const result = await response.json();

    console.log('Quick check result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example of using the MCP tool directly
async function mcpToolExample() {
  const baseUrl = 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/tools/linkchecker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://github.com',
        recurse: true,
        timeout: 10000,
        concurrency: 25,
      }),
    });

    const result = await response.json();
    console.log('MCP tool result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example of checking multiple URLs
async function multipleUrlCheck() {
  const baseUrl = 'http://localhost:3000';
  const urls = ['https://example.com', 'https://github.com', 'https://stackoverflow.com'];

  try {
    const results = [];

    for (const url of urls) {
      console.log(`Checking ${url}...`);

      const response = await fetch(`${baseUrl}/linkchecker/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          options: {
            recurse: false,
            timeout: 5000,
          },
        }),
      });

      const result = await response.json();
      results.push(result);

      console.log(`✓ Checked ${url} - ${result.data.summary.total} links found`);
    }

    console.log('All checks completed:', results.length);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example of getting all results and cleaning up
async function manageResults() {
  const baseUrl = 'http://localhost:3000';

  try {
    // Get all results
    const allResponse = await fetch(`${baseUrl}/linkchecker/results`);
    const allResults = await allResponse.json();

    console.log(`Found ${allResults.data.length} stored results`);

    // Clear all results
    const clearResponse = await fetch(`${baseUrl}/linkchecker/results`, {
      method: 'DELETE',
    });
    const clearResult = await clearResponse.json();

    console.log('Cleared all results:', clearResult.data.cleared);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running linkchecker examples...\n');

  console.log('1. Basic link check:');
  await basicLinkCheck();

  console.log('\n2. Quick link check:');
  await quickLinkCheck();

  console.log('\n3. MCP tool example:');
  await mcpToolExample();

  console.log('\n4. Multiple URL check:');
  await multipleUrlCheck();

  console.log('\n5. Manage results:');
  await manageResults();

  console.log('\nAll examples completed!');
}

export { basicLinkCheck, quickLinkCheck, mcpToolExample, multipleUrlCheck, manageResults };
