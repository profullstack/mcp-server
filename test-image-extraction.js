#!/usr/bin/env node

import { searchCity } from './mcp_modules/craigslist/api.js';
import { logger } from './src/utils/logger.js';

async function testImageExtraction() {
  try {
    logger.info('Testing image extraction improvements...');

    // Test with a single city and small limit to see results quickly
    const results = await searchCity('fresno', {
      category: 'bik',
      query: 'bike',
      fetchDetails: false, // Don't fetch details to focus on search result images
    });

    logger.info(`Found ${results.length} results`);

    // Analyze image results
    let withImages = 0;
    let withoutImages = 0;
    let invalidImages = 0;

    results.forEach((result, index) => {
      if (result.imageUrl) {
        if (
          result.imageUrl.includes('empty.png') ||
          result.imageUrl.includes('placeholder') ||
          result.imageUrl.includes('no_image') ||
          result.imageUrl.length < 10
        ) {
          invalidImages++;
          logger.warn(`Result ${index + 1}: Invalid image URL: ${result.imageUrl}`);
        } else {
          withImages++;
          logger.info(`Result ${index + 1}: Valid image URL: ${result.imageUrl}`);
        }
      } else {
        withoutImages++;
        logger.debug(`Result ${index + 1}: No image URL (title: ${result.title})`);
      }
    });

    logger.info('Image extraction summary:');
    logger.info(`- Results with valid images: ${withImages}`);
    logger.info(`- Results without images: ${withoutImages}`);
    logger.info(`- Results with invalid images: ${invalidImages}`);

    // Show a few sample results
    logger.info('\nSample results:');
    results.slice(0, 5).forEach((result, index) => {
      logger.info(`${index + 1}. ${result.title}`);
      logger.info(`   URL: ${result.url}`);
      logger.info(`   Price: ${result.price || 'N/A'}`);
      logger.info(`   Image: ${result.imageUrl || 'No image'}`);
      logger.info(`   Location: ${result.location || 'N/A'}`);
      logger.info('');
    });
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

testImageExtraction();
