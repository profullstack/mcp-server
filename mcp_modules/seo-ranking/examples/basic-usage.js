/**
 * SEO Ranking Module - Basic Usage Examples
 *
 * This file demonstrates how to use the SEO ranking module
 * to check keyword rankings using the ValueSERP API.
 */

// Example 1: Check single keyword ranking
const singleKeywordExample = {
  api_key: 'your_valueserp_api_key_here',
  keyword: 'software agency san jose',
  domain: 'profullstack.com',
  location: '98146,Washington,United States',
  gl: 'us',
  hl: 'en',
  google_domain: 'google.com',
  num: '100',
};

// Example 2: Check multiple keywords ranking
const multipleKeywordsExample = {
  api_key: 'your_valueserp_api_key_here',
  keywords: [
    'software agency san jose',
    'web development san jose',
    'full stack development',
    'react development services',
    'node.js development',
  ],
  domain: 'profullstack.com',
  location: '98146,Washington,United States',
  batchSize: 3,
  delay: 1500,
};

// Example 3: Validate API key
const validateKeyExample = {
  api_key: 'your_valueserp_api_key_here',
};

/**
 * Example function to check single keyword ranking
 */
async function checkSingleKeyword() {
  try {
    const response = await fetch('https://mcp.profullstack.com/seo-ranking/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': singleKeywordExample.api_key,
      },
      body: JSON.stringify(singleKeywordExample),
    });

    const result = await response.json();

    if (result.success) {
      console.log('Single Keyword Ranking Result:');
      console.log(`Keyword: ${result.data.keyword}`);
      console.log(`Domain: ${result.data.domain}`);
      console.log(`Found: ${result.data.found}`);

      if (result.data.organic_rank) {
        console.log(`Organic Position: ${result.data.organic_rank.position}`);
        console.log(`Title: ${result.data.organic_rank.title}`);
        console.log(`Link: ${result.data.organic_rank.link}`);
      }

      if (result.data.local_rank) {
        console.log(`Local Position: ${result.data.local_rank.position}`);
        console.log(`Business: ${result.data.local_rank.title}`);
      }
    } else {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

/**
 * Example function to check multiple keywords ranking
 */
async function checkMultipleKeywords() {
  try {
    const response = await fetch('https://mcp.profullstack.com/seo-ranking/check-multiple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': multipleKeywordsExample.api_key,
      },
      body: JSON.stringify(multipleKeywordsExample),
    });

    const result = await response.json();

    if (result.success) {
      console.log('Multiple Keywords Ranking Results:');
      console.log(`Domain: ${result.data.domain}`);
      console.log(`Total Keywords: ${result.data.total_keywords}`);

      console.log('\nSummary:');
      console.log(`Successful Checks: ${result.data.summary.successful_checks}`);
      console.log(`Found in Results: ${result.data.summary.found_in_results}`);
      console.log(`Average Organic Rank: ${result.data.summary.average_organic_rank}`);
      console.log(`Best Organic Rank: ${result.data.summary.best_organic_rank}`);

      console.log('\nDetailed Results:');
      result.data.results.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.keyword}`);
        console.log(`   Found: ${item.found}`);
        if (item.organic_rank) {
          console.log(`   Organic Position: ${item.organic_rank.position}`);
        }
        if (item.local_rank) {
          console.log(`   Local Position: ${item.local_rank.position}`);
        }
        if (item.error) {
          console.log(`   Error: ${item.error}`);
        }
      });
    } else {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

/**
 * Example function to validate API key
 */
async function validateApiKey() {
  try {
    const response = await fetch('https://mcp.profullstack.com/seo-ranking/validate-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': validateKeyExample.api_key,
      },
      body: JSON.stringify(validateKeyExample),
    });

    const result = await response.json();

    if (result.success) {
      console.log('API Key Validation Result:');
      console.log(`Valid: ${result.data.api_key_valid}`);
      console.log(`Message: ${result.data.message}`);
    } else {
      console.error('API Key Invalid:', result.error);
    }
  } catch (error) {
    console.error('Validation failed:', error);
  }
}

/**
 * Example using MCP tool interface
 */
async function useMcpTool() {
  try {
    // Example 1: Single keyword check via MCP tool
    const mcpSingleRequest = {
      action: 'check',
      api_key: 'your_valueserp_api_key_here',
      keyword: 'software agency san jose',
      domain: 'profullstack.com',
      num: '100',
    };

    const response1 = await fetch('https://mcp.profullstack.com/tools/seo-ranking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': mcpSingleRequest.api_key,
      },
      body: JSON.stringify(mcpSingleRequest),
    });

    const result1 = await response1.json();
    console.log('MCP Tool - Single Keyword Result:', result1);

    // Example 2: Multiple keywords check via MCP tool
    const mcpMultipleRequest = {
      action: 'check-multiple',
      api_key: 'your_valueserp_api_key_here',
      keywords: ['software agency', 'web development'],
      domain: 'profullstack.com',
      batchSize: 2,
      delay: 1000,
    };

    const response2 = await fetch('https://mcp.profullstack.com/tools/seo-ranking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': mcpMultipleRequest.api_key,
      },
      body: JSON.stringify(mcpMultipleRequest),
    });

    const result2 = await response2.json();
    console.log('MCP Tool - Multiple Keywords Result:', result2);
  } catch (error) {
    console.error('MCP Tool request failed:', error);
  }
}

/**
 * Example with custom search parameters
 */
async function customSearchExample() {
  const customParams = {
    api_key: 'your_valueserp_api_key_here',
    keyword: 'restaurant near me',
    domain: 'yelp.com',
    location: 'San Francisco, California, United States',
    gl: 'us',
    hl: 'en',
    google_domain: 'google.com',
    num: '50', // Check top 50 results only
  };

  try {
    const response = await fetch('https://mcp.profullstack.com/seo-ranking/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': customParams.api_key,
      },
      body: JSON.stringify(customParams),
    });

    const result = await response.json();
    console.log('Custom Search Example Result:', result);
  } catch (error) {
    console.error('Custom search failed:', error);
  }
}

// Export examples for use in other files
export {
  singleKeywordExample,
  multipleKeywordsExample,
  validateKeyExample,
  checkSingleKeyword,
  checkMultipleKeywords,
  validateApiKey,
  useMcpTool,
  customSearchExample,
};

// If running this file directly, execute examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('SEO Ranking Module - Basic Usage Examples');
  console.log('==========================================\n');

  console.log('Note: Replace "your_valueserp_api_key_here" with your actual API key\n');

  // Uncomment the examples you want to run:
  // await validateApiKey();
  // await checkSingleKeyword();
  // await checkMultipleKeywords();
  // await useMcpTool();
  // await customSearchExample();
}
