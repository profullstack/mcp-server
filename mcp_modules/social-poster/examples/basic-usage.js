/**
 * Basic Usage Example
 * Demonstrates how to use the Social Poster MCP module
 */

import { SocialPostingService } from '../src/service.js';

/**
 * Example: Basic social media posting
 */
async function basicPostingExample() {
  console.log('=== Basic Social Media Posting Example ===\n');

  // Initialize the service
  const service = new SocialPostingService({
    headless: false, // Show browser for demo
    timeout: 60000,
  });

  try {
    // 1. Check supported platforms
    console.log('1. Supported platforms:');
    const supportedPlatforms = service.getSupportedPlatforms();
    supportedPlatforms.forEach(platform => {
      console.log(`   - ${platform.name} (${platform.id}): ${platform.description}`);
    });
    console.log();

    // 2. Create sample content
    console.log('2. Creating sample content:');
    const textContent = service.createSampleContent('text');
    const linkContent = service.createSampleContent('link');

    console.log('   Text content:', textContent);
    console.log('   Link content:', linkContent);
    console.log();

    // 3. Validate content
    console.log('3. Validating content:');
    const validation = service.validateContent(textContent);
    console.log('   Validation result:', validation);
    console.log();

    // 4. Check platform status (before login)
    console.log('4. Platform status (before login):');
    const statusBefore = await service.getPlatformStatus();
    console.log('   Status:', JSON.stringify(statusBefore, null, 2));
    console.log();

    // 5. Login to a platform (example with X/Twitter)
    console.log('5. Attempting to login to X (Twitter)...');
    const loginResult = await service.loginToPlatform('x', { headless: false });
    console.log('   Login result:', loginResult);
    console.log();

    // 6. Check available platforms after login
    console.log('6. Available platforms after login:');
    const availablePlatforms = service.getAvailablePlatforms();
    console.log('   Available:', availablePlatforms);
    console.log();

    // 7. Post content (if login was successful)
    if (loginResult.success) {
      console.log('7. Posting content to available platforms...');
      const postResult = await service.postContent(textContent, availablePlatforms);
      console.log('   Post result:', JSON.stringify(postResult, null, 2));

      // 8. Get posting statistics
      if (postResult.success) {
        console.log('\n8. Posting statistics:');
        const stats = service.getPostingStats(postResult);
        console.log('   Stats:', stats);
      }
    } else {
      console.log('7. Skipping post due to login failure');
    }
  } catch (error) {
    console.error('Error in example:', error);
  } finally {
    // Clean up
    await service.close();
    console.log('\nService closed. Example complete.');
  }
}

/**
 * Example: Content validation
 */
async function contentValidationExample() {
  console.log('\n=== Content Validation Example ===\n');

  const service = new SocialPostingService();

  // Test various content types
  const testContents = [
    { text: 'Valid text content' },
    { text: 'Valid text', link: 'https://example.com' },
    { link: 'https://example.com' },
    {}, // Invalid - no text or link
    { text: 123 }, // Invalid - text not string
    { text: 'Valid text', link: 'invalid-url' }, // Invalid URL
    { text: 'a'.repeat(300) }, // Too long
  ];

  console.log('Testing content validation:');
  testContents.forEach((content, index) => {
    const validation = service.validateContent(content);
    console.log(`${index + 1}. Content:`, JSON.stringify(content));
    console.log(`   Valid: ${validation.valid}`);
    if (!validation.valid) {
      console.log(`   Errors: ${validation.errors.join(', ')}`);
    }
    console.log();
  });

  await service.close();
}

/**
 * Example: Platform information
 */
async function platformInfoExample() {
  console.log('\n=== Platform Information Example ===\n');

  const service = new SocialPostingService();

  try {
    // Get detailed platform information
    const platforms = service.getSupportedPlatforms();

    console.log('Detailed platform information:');
    platforms.forEach(platform => {
      console.log(`\n${platform.name} (${platform.id}):`);
      console.log(`  Description: ${platform.description}`);
      console.log(`  Max text length: ${platform.maxTextLength || 'No limit'}`);
      console.log(`  Supports images: ${platform.supportsImages}`);
      console.log(`  Supports links: ${platform.supportsLinks}`);
    });

    // Check current platform status
    console.log('\nCurrent platform status:');
    const status = await service.getPlatformStatus();
    Object.entries(status).forEach(([platformId, info]) => {
      console.log(`  ${platformId}: enabled=${info.enabled}, loggedIn=${info.loggedIn}`);
    });
  } catch (error) {
    console.error('Error getting platform info:', error);
  } finally {
    await service.close();
  }
}

/**
 * Example: Error handling
 */
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n');

  const service = new SocialPostingService();

  try {
    // Test posting with invalid content
    console.log('1. Testing invalid content:');
    const invalidResult = await service.postContent({});
    console.log('   Result:', invalidResult);
    console.log();

    // Test login to invalid platform
    console.log('2. Testing invalid platform login:');
    const invalidLogin = await service.loginToPlatform('invalid-platform');
    console.log('   Result:', invalidLogin);
    console.log();

    // Test posting to unavailable platforms
    console.log('3. Testing post to unavailable platforms:');
    const unavailableResult = await service.postContent({ text: 'Test post' }, [
      'unavailable-platform',
    ]);
    console.log('   Result:', unavailableResult);
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    await service.close();
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runExample = process.argv[2] || 'basic';

  switch (runExample) {
    case 'basic':
      await basicPostingExample();
      break;
    case 'validation':
      await contentValidationExample();
      break;
    case 'platforms':
      await platformInfoExample();
      break;
    case 'errors':
      await errorHandlingExample();
      break;
    case 'all':
      await basicPostingExample();
      await contentValidationExample();
      await platformInfoExample();
      await errorHandlingExample();
      break;
    default:
      console.log('Available examples: basic, validation, platforms, errors, all');
      console.log('Usage: node examples/basic-usage.js [example-name]');
  }
}

export { basicPostingExample, contentValidationExample, platformInfoExample, errorHandlingExample };
