/**
 * Basic Usage Example for Lighthouse Module
 *
 * This example demonstrates how to use the Lighthouse module
 * to run performance audits on websites.
 */

import { lighthouseService } from '../src/service.js';

async function runBasicExample() {
  console.log('🚀 Starting Lighthouse Module Basic Usage Example\n');

  try {
    // Example 1: Run a single audit
    console.log('📊 Running single audit on https://example.com...');
    const singleAudit = await lighthouseService.runAudit('https://example.com', {
      categories: ['performance'],
      headless: true,
    });

    console.log(`✅ Audit completed! Report ID: ${singleAudit.id}`);
    console.log(
      `📈 Performance Score: ${singleAudit.scores.performance?.displayValue || 'N/A'}/100`
    );
    console.log(
      `⚡ First Contentful Paint: ${singleAudit.metrics.firstContentfulPaint?.displayValue || 'N/A'}`
    );
    console.log(
      `🎯 Largest Contentful Paint: ${singleAudit.metrics.largestContentfulPaint?.displayValue || 'N/A'}\n`
    );

    // Example 2: Get report summary
    console.log('📋 Generating report summary...');
    const summary = lighthouseService.generateSummary(singleAudit.id);
    console.log(`📊 Summary for ${summary.url}:`);
    console.log(`   Performance: ${summary.scores.performance?.displayValue || 'N/A'}/100`);
    console.log(`   Opportunities found: ${summary.opportunitiesCount}`);
    console.log(`   Diagnostics found: ${summary.diagnosticsCount}\n`);

    // Example 3: Show top opportunities
    if (summary.topOpportunities.length > 0) {
      console.log('🔧 Top optimization opportunities:');
      summary.topOpportunities.forEach((opp, index) => {
        console.log(`   ${index + 1}. ${opp.title}`);
        if (opp.displayValue) {
          console.log(`      ${opp.displayValue}`);
        }
      });
      console.log('');
    }

    // Example 4: Run batch audit (commented out to avoid long execution time)
    /*
    console.log('🔄 Running batch audit on multiple URLs...');
    const batchResults = await lighthouseService.runBatchAudit([
      'https://example.com',
      'https://google.com'
    ], {
      categories: ['performance'],
      headless: true
    });
    
    console.log(`✅ Batch audit completed!`);
    console.log(`   Total URLs: ${batchResults.summary.total}`);
    console.log(`   Successful: ${batchResults.summary.successful}`);
    console.log(`   Failed: ${batchResults.summary.failed}\n`);
    */

    // Example 5: List all reports
    console.log('📁 Listing all stored reports...');
    const allReports = lighthouseService.getAllReports();
    console.log(`📊 Total reports stored: ${allReports.length}`);
    allReports.forEach(report => {
      console.log(
        `   - ${report.id}: ${report.url} (${new Date(report.timestamp).toLocaleString()})`
      );
    });
    console.log('');

    // Example 6: Clean up
    console.log('🧹 Cleaning up reports...');
    lighthouseService.clearReports();
    console.log('✅ All reports cleared!');
  } catch (error) {
    console.error('❌ Error running example:', error.message);
  }
}

// Example of using the module through MCP tool interface
function mcpToolExample() {
  console.log('\n🔧 MCP Tool Interface Examples:\n');

  // Single audit example
  const singleAuditParams = {
    action: 'audit',
    url: 'https://example.com',
    options: {
      categories: ['performance'],
      headless: true,
    },
  };
  console.log('Single Audit MCP Tool Call:');
  console.log(JSON.stringify(singleAuditParams, null, 2));

  // Batch audit example
  const batchAuditParams = {
    action: 'batch-audit',
    urls: ['https://example.com', 'https://google.com', 'https://github.com'],
    options: {
      categories: ['performance', 'accessibility'],
      headless: true,
    },
  };
  console.log('\nBatch Audit MCP Tool Call:');
  console.log(JSON.stringify(batchAuditParams, null, 2));

  // Get report example
  const getReportParams = {
    action: 'get-report',
    id: 'audit_1234567890_abc123',
  };
  console.log('\nGet Report MCP Tool Call:');
  console.log(JSON.stringify(getReportParams, null, 2));

  // List reports example
  const listReportsParams = {
    action: 'list-reports',
  };
  console.log('\nList Reports MCP Tool Call:');
  console.log(JSON.stringify(listReportsParams, null, 2));
}

// Run the examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    'Note: This example requires Chrome/Chromium to be installed and may take some time to complete.\n'
  );

  // Show MCP tool examples first (these don't require actual execution)
  mcpToolExample();

  // Uncomment the line below to run the actual Lighthouse audit example
  // await runBasicExample();

  console.log('\n💡 To run actual audits, uncomment the runBasicExample() call in this file.');
  console.log('⚠️  Make sure you have Chrome/Chromium installed and a stable internet connection.');
}

// Export the function to avoid unused variable warning
export { runBasicExample };
