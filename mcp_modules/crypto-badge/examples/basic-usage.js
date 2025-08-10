// Basic Usage Examples for Crypto Badge Module
import { cryptoBadgeService } from '../src/service.js';

/**
 * Example 1: Generate a simple Bitcoin badge URL
 */
function generateBitcoinBadgeUrl() {
  console.log('=== Example 1: Bitcoin Badge URL ===');

  const badgeUrl = cryptoBadgeService.generateBadgeUrl({
    baseUrl: 'https://paybadge.profullstack.com',
    rightText: 'bitcoin',
    rightColor: '#f7931a',
    ticker: 'btc',
  });

  console.log('Badge URL:', badgeUrl);
  console.log();
}

/**
 * Example 2: Generate Markdown badge code
 */
function generateMarkdownBadge() {
  console.log('=== Example 2: Markdown Badge ===');

  const markdown = cryptoBadgeService.generateMarkdownBadge({
    baseUrl: 'https://paybadge.profullstack.com',
    leftText: 'support',
    rightText: 'project',
    rightColor: '#28a745',
    linkUrl: 'https://github.com/user/repo',
    altText: 'Support this project with crypto',
  });

  console.log('Markdown code:');
  console.log(markdown);
  console.log();
}

/**
 * Example 3: Generate HTML badge code
 */
function generateHTMLBadge() {
  console.log('=== Example 3: HTML Badge ===');

  const html = cryptoBadgeService.generateHTMLBadge({
    baseUrl: 'https://paybadge.profullstack.com',
    leftText: 'donate',
    rightText: 'ethereum',
    rightColor: '#627eea',
    linkUrl: 'https://github.com/user/repo',
    altText: 'Donate Ethereum',
  });

  console.log('HTML code:');
  console.log(html);
  console.log();
}

/**
 * Example 4: Use preset configurations
 */
function generatePresetBadges() {
  console.log('=== Example 4: Preset Badges ===');

  const presets = ['bitcoin', 'ethereum', 'solana', 'usdc'];

  presets.forEach(preset => {
    const result = cryptoBadgeService.generatePresetBadge({
      baseUrl: 'https://paybadge.profullstack.com',
      preset,
      linkUrl: 'https://github.com/user/repo',
    });

    console.log(`${preset.toUpperCase()} preset:`);
    console.log('Markdown:', result.markdown);
    console.log('Badge URL:', result.badgeUrl);
    console.log();
  });
}

/**
 * Example 5: Generate multi-cryptocurrency badge
 */
function generateMultiCryptoBadge() {
  console.log('=== Example 5: Multi-Crypto Badge ===');

  const result = cryptoBadgeService.generateMultiCryptoBadge({
    baseUrl: 'https://paybadge.profullstack.com',
    cryptos: ['btc', 'eth', 'sol'],
    addresses: {
      btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      eth: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    },
    linkUrl: 'https://github.com/user/repo',
  });

  console.log('Multi-crypto badge:');
  console.log('Markdown:', result.markdown);
  console.log('Badge URL:', result.badgeUrl);
  console.log('Supported cryptos:', result.cryptos);
  console.log();
}

/**
 * Example 6: Custom styling with validation
 */
function generateCustomStyledBadge() {
  console.log('=== Example 6: Custom Styled Badge ===');

  try {
    const badgeUrl = cryptoBadgeService.generateBadgeUrl({
      baseUrl: 'https://paybadge.profullstack.com',
      leftText: 'tip',
      rightText: 'creator',
      leftColor: '#2c3e50',
      rightColor: '#e74c3c',
      style: 'enhanced',
    });

    console.log('Custom styled badge URL:', badgeUrl);
  } catch (error) {
    console.error('Error generating badge:', error.message);
  }

  console.log();
}

/**
 * Example 7: Input sanitization demonstration
 */
function demonstrateInputSanitization() {
  console.log('=== Example 7: Input Sanitization ===');

  // This will be sanitized automatically
  const badgeUrl = cryptoBadgeService.generateBadgeUrl({
    baseUrl: 'https://paybadge.profullstack.com',
    leftText: '<script>alert("xss")</script>donate',
    rightText: 'bitcoin & ethereum',
    rightColor: '#f7931a',
  });

  console.log('Sanitized badge URL:', badgeUrl);
  console.log('Notice: Dangerous content has been removed');
  console.log();
}

/**
 * Example 8: Error handling
 */
function demonstrateErrorHandling() {
  console.log('=== Example 8: Error Handling ===');

  try {
    // This will throw an error - missing baseUrl
    cryptoBadgeService.generateBadgeUrl({
      leftText: 'donate',
      rightText: 'bitcoin',
    });
  } catch (error) {
    console.log('Expected error:', error.message);
  }

  try {
    // This will throw an error - unknown preset
    cryptoBadgeService.generatePresetBadge({
      baseUrl: 'https://paybadge.profullstack.com',
      preset: 'unknown-crypto',
    });
  } catch (error) {
    console.log('Expected error:', error.message);
  }

  console.log();
}

/**
 * Run all examples
 */
function runAllExamples() {
  console.log('🚀 Crypto Badge Module - Basic Usage Examples\n');

  generateBitcoinBadgeUrl();
  generateMarkdownBadge();
  generateHTMLBadge();
  generatePresetBadges();
  generateMultiCryptoBadge();
  generateCustomStyledBadge();
  demonstrateInputSanitization();
  demonstrateErrorHandling();

  console.log('✅ All examples completed!');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  generateBitcoinBadgeUrl,
  generateMarkdownBadge,
  generateHTMLBadge,
  generatePresetBadges,
  generateMultiCryptoBadge,
  generateCustomStyledBadge,
  demonstrateInputSanitization,
  demonstrateErrorHandling,
  runAllExamples,
};
