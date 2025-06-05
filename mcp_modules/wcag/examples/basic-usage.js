/**
 * WCAG Module Basic Usage Example
 *
 * This example demonstrates how to use the WCAG module for accessibility testing.
 */

// Using the production MCP server
const BASE_URL = 'https://mcp.profullstack.com';

/**
 * Example 1: Single URL WCAG Test
 */
async function singleUrlTest() {
  console.log('=== Single URL WCAG Test ===');

  try {
    const response = await fetch(`${BASE_URL}/wcag/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com',
        level: 'WCAG2AA',
        includeWarnings: true,
        viewport: '1280x1024',
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Test completed successfully');
      console.log(`URL: ${result.data.url}`);
      console.log(`Issues found: ${result.data.issueCount}`);
      console.log(`Errors: ${result.data.summary.errors}`);
      console.log(`Warnings: ${result.data.summary.warnings}`);
      console.log(`Notices: ${result.data.summary.notices}`);
    } else {
      console.error('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

/**
 * Example 2: Multiple URLs Test
 */
async function multipleUrlsTest() {
  console.log('\n=== Multiple URLs WCAG Test ===');

  try {
    const response = await fetch(`${BASE_URL}/wcag/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: ['https://example.com', 'https://example.com/about', 'https://httpbin.org/html'],
        level: 'WCAG2AA',
        timeout: 30000,
        includeWarnings: true,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Tests completed successfully');
      console.log(`Total URLs tested: ${result.data.summary.totalUrls}`);
      console.log(`Successful tests: ${result.data.summary.successfulTests}`);
      console.log(`Failed tests: ${result.data.summary.failedTests}`);

      // Show results for each URL
      result.data.results.forEach((urlResult, index) => {
        console.log(`\n  URL ${index + 1}: ${urlResult.url}`);
        console.log(`    Issues: ${urlResult.issueCount}`);
        console.log(`    Errors: ${urlResult.summary.errors}`);
        console.log(`    Warnings: ${urlResult.summary.warnings}`);
      });
    } else {
      console.error('❌ Tests failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

/**
 * Example 3: Accessibility Summary
 */
async function accessibilitySummary() {
  console.log('\n=== Accessibility Summary ===');

  try {
    const response = await fetch(`${BASE_URL}/wcag/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: ['https://example.com', 'https://httpbin.org/html', 'https://httpbin.org/forms/post'],
        level: 'WCAG2AA',
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Summary generated successfully');
      const summary = result.data.summary;

      console.log(`Total URLs: ${summary.totalUrls}`);
      console.log(`Successful tests: ${summary.successfulTests}`);
      console.log(`Failed tests: ${summary.failedTests}`);
      console.log(`Total issues: ${summary.totalIssues}`);
      console.log(`Average issues per URL: ${summary.averageIssuesPerUrl}`);

      // Show most common issues
      if (result.data.mostCommonIssues && result.data.mostCommonIssues.length > 0) {
        console.log('\nMost common issues:');
        result.data.mostCommonIssues.slice(0, 5).forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.issue} (${issue.count} occurrences)`);
        });
      }
    } else {
      console.error('❌ Summary failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

/**
 * Example 4: Using MCP Tool Interface
 */
async function mcpToolExample() {
  console.log('\n=== MCP Tool Interface Example ===');

  try {
    const response = await fetch(`${BASE_URL}/tools/wcag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'check',
        url: 'https://example.com',
        level: 'WCAG2AA',
        includeWarnings: true,
        ignore: ['WCAG2AA.Principle1.Guideline1_1.1_1_1.H37'],
      }),
    });

    const result = await response.json();

    if (result.result) {
      console.log('✅ MCP Tool test completed');
      console.log(`Tool: ${result.tool}`);
      console.log(`Action: ${result.action}`);
      console.log(`URL: ${result.result.url}`);
      console.log(`Issues: ${result.result.issueCount}`);
    } else {
      console.error('❌ MCP Tool test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

/**
 * Example 5: Health Check
 */
async function healthCheck() {
  console.log('\n=== Health Check ===');

  try {
    const response = await fetch(`${BASE_URL}/wcag/health`);
    const result = await response.json();

    if (result.status === 'healthy') {
      console.log('✅ WCAG module is healthy');
      console.log(`Pa11y version: ${result.pa11yVersion}`);
    } else {
      console.log('⚠️ WCAG module is unhealthy');
      console.log(`Error: ${result.error}`);
      console.log(`Suggestion: ${result.suggestion}`);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

/**
 * Example 6: Custom Test with Ignore Rules
 */
async function customTestWithIgnoreRules() {
  console.log('\n=== Custom Test with Ignore Rules ===');

  try {
    const response = await fetch(`${BASE_URL}/wcag/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com',
        level: 'WCAG2AAA',
        ignore: [
          'WCAG2AAA.Principle2.Guideline2_4.2_4_9.H30.NoLinkText',
          'WCAG2AAA.Principle1.Guideline1_4.1_4_6.G18.Fail',
        ],
        includeNotices: true,
        includeWarnings: true,
        viewport: '1920x1080',
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Custom test completed');
      console.log(`URL: ${result.data.url}`);
      console.log(`Standard: ${result.data.standard}`);
      console.log(`Issues found: ${result.data.issueCount}`);

      // Show breakdown by issue type
      console.log('\nIssue breakdown:');
      console.log(`  Errors: ${result.data.summary.errors}`);
      console.log(`  Warnings: ${result.data.summary.warnings}`);
      console.log(`  Notices: ${result.data.summary.notices}`);
    } else {
      console.error('❌ Custom test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Starting WCAG Module Examples\n');

  // First check if the module is healthy
  await healthCheck();

  // Run examples
  await singleUrlTest();
  await multipleUrlsTest();
  await accessibilitySummary();
  await mcpToolExample();
  await customTestWithIgnoreRules();

  console.log('\n✨ All examples completed!');
  console.log('\nNext steps:');
  console.log('1. Try testing your own websites');
  console.log('2. Experiment with different WCAG levels (WCAG2A, WCAG2AA, WCAG2AAA)');
  console.log('3. Use ignore rules to focus on specific accessibility issues');
  console.log('4. Integrate into your CI/CD pipeline for automated accessibility testing');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
  singleUrlTest,
  multipleUrlsTest,
  accessibilitySummary,
  mcpToolExample,
  healthCheck,
  customTestWithIgnoreRules,
  runAllExamples,
};
