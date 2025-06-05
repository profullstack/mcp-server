#!/usr/bin/env node

/**
 * Test script to verify nuclei integration
 */

import { ScannerService } from './src/service.js';

async function testNucleiScan() {
  console.log('Testing nuclei integration...');

  const scanner = new ScannerService();

  try {
    const result = await scanner.scanTarget('https://httpbin.org', {
      tools: ['nuclei'],
      verbose: true,
      timeout: 30,
    });

    console.log('\n=== Scan Result ===');
    console.log(`Scan ID: ${result.id}`);
    console.log(`Target: ${result.target}`);
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Start Time: ${result.startTime}`);
    console.log(`End Time: ${result.endTime}`);

    console.log('\n=== Summary ===');
    console.log(`Total findings: ${result.summary.total}`);
    console.log(`Critical: ${result.summary.critical}`);
    console.log(`High: ${result.summary.high}`);
    console.log(`Medium: ${result.summary.medium}`);
    console.log(`Low: ${result.summary.low}`);
    console.log(`Info: ${result.summary.info}`);

    if (result.findings && result.findings.length > 0) {
      console.log('\n=== Findings ===');
      result.findings.forEach((finding, index) => {
        console.log(`\n${index + 1}. ${finding.info?.name || 'Unknown'}`);
        console.log(`   Severity: ${finding.info?.severity || 'Unknown'}`);
        console.log(`   URL: ${finding.matched_at || finding.host || 'Unknown'}`);
        if (finding.info?.description) {
          console.log(`   Description: ${finding.info.description}`);
        }
      });
    } else {
      console.log('\n=== No findings detected ===');
    }

    if (result.error) {
      console.log(`\nError: ${result.error}`);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testNucleiScan();
