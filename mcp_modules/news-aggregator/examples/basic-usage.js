/**
 * News Aggregator Module - Basic Usage Examples
 *
 * This file demonstrates how to use the news aggregator module
 * both through direct API calls and the MCP tool interface.
 */

import fetch from 'node-fetch';

// Base URL for the MCP server (adjust as needed)
const BASE_URL = 'http://localhost:3000';

/**
 * Example 1: Get RSS news from a specific source
 */
async function getRSSNewsExample() {
  console.log('\n=== RSS News Example ===');

  try {
    const response = await fetch(`${BASE_URL}/news-aggregator/rss/hackernews`);
    const data = await response.json();

    console.log(`Source: ${data.source}`);
    console.log(`Category: ${data.category}`);
    console.log(`Articles found: ${data.articles.length}`);

    // Show first article
    if (data.articles.length > 0) {
      const article = data.articles[0];
      console.log('\nFirst article:');
      console.log(`Title: ${article.title}`);
      console.log(`Link: ${article.link}`);
      console.log(`Published: ${article.publishedAt}`);
    }
  } catch (error) {
    console.error('Error fetching RSS news:', error.message);
  }
}

/**
 * Example 2: Get scraped news from TechCrunch
 */
async function getScrapedNewsExample() {
  console.log('\n=== Scraped News Example ===');

  try {
    const response = await fetch(`${BASE_URL}/news-aggregator/scrape/techcrunch`);
    const data = await response.json();

    console.log(`Source: ${data.source}`);
    console.log(`Category: ${data.category}`);
    console.log(`Articles found: ${data.articles.length}`);

    // Show titles of first 3 articles
    data.articles.slice(0, 3).forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
    });
  } catch (error) {
    console.error('Error fetching scraped news:', error.message);
  }
}

/**
 * Example 3: Get aggregated news from multiple sources
 */
async function getAggregatedNewsExample() {
  console.log('\n=== Aggregated News Example ===');

  try {
    const sources = 'google,hackernews,bbc';
    const category = 'technology';
    const response = await fetch(
      `${BASE_URL}/news-aggregator/aggregate?sources=${sources}&category=${category}`
    );
    const data = await response.json();

    console.log(`Total articles: ${data.totalArticles}`);
    console.log(`Sources: ${data.sources.length}`);

    data.sources.forEach(source => {
      console.log(`\n${source.source}: ${source.articles.length} articles`);
    });

    if (data.errors.length > 0) {
      console.log(`\nErrors: ${data.errors.join(', ')}`);
    }
  } catch (error) {
    console.error('Error fetching aggregated news:', error.message);
  }
}

/**
 * Example 4: Search for news with keywords
 */
async function searchNewsExample() {
  console.log('\n=== Search News Example ===');

  try {
    const keywords = 'artificial intelligence,machine learning';
    const sources = 'google,hackernews';
    const limit = 5;

    const response = await fetch(
      `${BASE_URL}/news-aggregator/search?keywords=${encodeURIComponent(keywords)}&sources=${sources}&limit=${limit}`
    );
    const data = await response.json();

    console.log(`Search keywords: ${data.keywords.join(', ')}`);
    console.log(`Total results: ${data.totalResults}`);

    data.articles.forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title}`);
      console.log(`   Source: ${article.source}`);
      console.log(`   Link: ${article.link}`);
    });
  } catch (error) {
    console.error('Error searching news:', error.message);
  }
}

/**
 * Example 5: Get available sources
 */
async function getAvailableSourcesExample() {
  console.log('\n=== Available Sources Example ===');

  try {
    const response = await fetch(`${BASE_URL}/news-aggregator/sources`);
    const data = await response.json();

    console.log(`Total sources: ${data.total}`);

    data.sources.forEach(source => {
      console.log(`\n${source.name} (${source.id})`);
      console.log(`  Type: ${source.type}`);
      console.log(`  Categories: ${source.categories.join(', ')}`);
    });
  } catch (error) {
    console.error('Error fetching sources:', error.message);
  }
}

/**
 * Example 6: Using the MCP Tool interface
 */
async function mcpToolExample() {
  console.log('\n=== MCP Tool Example ===');

  try {
    // Get tool info
    const infoResponse = await fetch(`${BASE_URL}/tools/news-aggregator/info`);
    const toolInfo = await infoResponse.json();

    console.log(`Tool: ${toolInfo.name}`);
    console.log(`Description: ${toolInfo.description}`);

    // Use the tool to search for news
    const toolRequest = {
      action: 'search',
      keywords: 'climate change,environment',
      sources: 'bbc,npr',
      limit: 3,
    };

    const toolResponse = await fetch(`${BASE_URL}/tools/news-aggregator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toolRequest),
    });

    const toolResult = await toolResponse.json();

    console.log(`\nTool action: ${toolResult.action}`);
    console.log(`Results: ${toolResult.result.totalResults} articles found`);

    toolResult.result.articles.forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title}`);
      console.log(`   Source: ${article.source}`);
    });
  } catch (error) {
    console.error('Error using MCP tool:', error.message);
  }
}

/**
 * Example 7: Health check
 */
async function healthCheckExample() {
  console.log('\n=== Health Check Example ===');

  try {
    const response = await fetch(`${BASE_URL}/news-aggregator/health`);
    const data = await response.json();

    console.log(`Status: ${data.status}`);
    console.log(`Message: ${data.message}`);

    if (data.testArticles !== undefined) {
      console.log(`Test articles fetched: ${data.testArticles}`);
    }
  } catch (error) {
    console.error('Error checking health:', error.message);
  }
}

/**
 * Example 8: Cache management
 */
async function cacheManagementExample() {
  console.log('\n=== Cache Management Example ===');

  try {
    // First, get some news to populate cache
    console.log('Fetching news to populate cache...');
    await fetch(`${BASE_URL}/news-aggregator/rss/hackernews`);

    // Clear the cache
    console.log('Clearing cache...');
    const response = await fetch(`${BASE_URL}/news-aggregator/cache`, {
      method: 'DELETE',
    });

    const data = await response.json();
    console.log(`Result: ${data.message}`);
  } catch (error) {
    console.error('Error managing cache:', error.message);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('News Aggregator Module - Usage Examples');
  console.log('=====================================');

  await getRSSNewsExample();
  await getScrapedNewsExample();
  await getAggregatedNewsExample();
  await searchNewsExample();
  await getAvailableSourcesExample();
  await mcpToolExample();
  await healthCheckExample();
  await cacheManagementExample();

  console.log('\n=== All examples completed ===');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
  getRSSNewsExample,
  getScrapedNewsExample,
  getAggregatedNewsExample,
  searchNewsExample,
  getAvailableSourcesExample,
  mcpToolExample,
  healthCheckExample,
  cacheManagementExample,
  runAllExamples,
};
