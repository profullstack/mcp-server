/**
 * Domain Lookup Module - Basic Usage Examples
 *
 * This file demonstrates how to use the domain lookup module
 * for various domain checking and brainstorming tasks.
 */

// Example 1: Check specific domains
async function checkSpecificDomains() {
  console.log('=== Checking Specific Domains ===');

  const response = await fetch('http://localhost:3000/domain-lookup/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domains: ['myawesomesite.com', 'coolapp.io', 'newstartup.ai'],
      format: 'json',
    }),
  });

  const result = await response.json();
  console.log('Available domains:');
  result.domains.filter(d => d.available).forEach(d => console.log(`✅ ${d.domain}`));

  console.log('Unavailable domains:');
  result.domains.filter(d => !d.available).forEach(d => console.log(`❌ ${d.domain}`));
}

// Example 2: Generate domain suggestions for a startup
async function generateStartupDomains() {
  console.log('\n=== Generating Startup Domain Suggestions ===');

  const response = await fetch('http://localhost:3000/domain-lookup/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: 'fintech',
      prefixes: ['my', 'get', 'use', 'try'],
      suffixes: ['ly', 'hub', 'app', 'pro'],
      tlds: ['com', 'io', 'co', 'ai'],
      onlyAvailable: true,
      maxDomainLength: 15,
    }),
  });

  const result = await response.json();
  console.log(`Found ${result.domains.length} available domains:`);
  result.domains.slice(0, 10).forEach(d => {
    console.log(`✅ ${d.domain} (${d.domain.length} chars)`);
  });
}

// Example 3: Use TLD presets for tech companies
async function useTldPresets() {
  console.log('\n=== Using TLD Presets ===');

  // First, get available presets
  const presetsResponse = await fetch('http://localhost:3000/domain-lookup/presets');
  const presets = await presetsResponse.json();

  console.log('Available TLD presets:');
  Object.keys(presets.presets).forEach(preset => {
    console.log(`- ${preset}: ${presets.presets[preset].join(', ')}`);
  });

  // Use the 'tech' preset for domain suggestions
  const response = await fetch('http://localhost:3000/domain-lookup/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: 'cloudapp',
      tldPreset: 'tech',
      onlyAvailable: true,
    }),
  });

  const result = await response.json();
  console.log('\nTech domains for "cloudapp":');
  result.domains.forEach(d => {
    console.log(`${d.available ? '✅' : '❌'} ${d.domain}`);
  });
}

// Example 4: Bulk domain analysis for multiple business ideas
async function bulkDomainAnalysis() {
  console.log('\n=== Bulk Domain Analysis ===');

  const response = await fetch('http://localhost:3000/domain-lookup/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keywords: ['healthtech', 'edtech', 'proptech'],
      prefixes: ['get', 'my'],
      suffixes: ['ly', 'app'],
      tlds: ['com', 'io', 'co'],
      showStats: true,
      format: 'json',
    }),
  });

  const result = await response.json();

  console.log('Bulk analysis results:');
  console.log(`Total domains checked: ${result.domains.length}`);

  const available = result.domains.filter(d => d.available);
  console.log(`Available domains: ${available.length}`);

  // Group by keyword
  const byKeyword = {};
  result.domains.forEach(d => {
    const keyword = result.keywords.find(k => d.domain.includes(k));
    if (keyword) {
      if (!byKeyword[keyword]) byKeyword[keyword] = [];
      byKeyword[keyword].push(d);
    }
  });

  Object.keys(byKeyword).forEach(keyword => {
    const domains = byKeyword[keyword];
    const availableCount = domains.filter(d => d.available).length;
    console.log(`\n${keyword}: ${availableCount}/${domains.length} available`);

    domains
      .filter(d => d.available)
      .slice(0, 3)
      .forEach(d => {
        console.log(`  ✅ ${d.domain}`);
      });
  });
}

// Example 5: Domain brainstorming with creative combinations
async function creativeDomainBrainstorming() {
  console.log('\n=== Creative Domain Brainstorming ===');

  const response = await fetch('http://localhost:3000/domain-lookup/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: 'design',
      prefixes: ['super', 'ultra', 'mega', 'pro'],
      suffixes: ['studio', 'lab', 'works', 'forge'],
      tldPreset: 'creative',
      onlyAvailable: true,
      maxDomainLength: 20,
    }),
  });

  const result = await response.json();
  console.log('Creative design domains:');
  result.domains.forEach(d => {
    console.log(`✅ ${d.domain}`);
  });
}

// Example 6: Using MCP tools directly (if you have MCP client)
async function useMcpTools() {
  console.log('\n=== Using MCP Tools ===');

  // This would be used with an MCP client
  const mcpRequest = {
    tool: 'check_domain_availability',
    parameters: {
      domains: ['example.com', 'test.org'],
      format: 'json',
      onlyAvailable: true,
    },
  };

  console.log('MCP Request:', JSON.stringify(mcpRequest, null, 2));

  // In a real MCP client, you would send this request to the MCP server
  // const result = await mcpClient.callTool(mcpRequest);
}

// Run all examples
async function runAllExamples() {
  try {
    await checkSpecificDomains();
    await generateStartupDomains();
    await useTldPresets();
    await bulkDomainAnalysis();
    await creativeDomainBrainstorming();
    await useMcpTools();
  } catch (error) {
    console.error('Error running examples:', error.message);
    console.log('\nMake sure:');
    console.log('1. The MCP server is running on localhost:3000');
    console.log('2. The domain-lookup module is loaded');
    console.log('3. tldx CLI is installed and available');
  }
}

// Export for use in other files
export {
  checkSpecificDomains,
  generateStartupDomains,
  useTldPresets,
  bulkDomainAnalysis,
  creativeDomainBrainstorming,
  useMcpTools,
  runAllExamples,
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
