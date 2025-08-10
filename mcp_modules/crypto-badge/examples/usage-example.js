// Advanced Usage Examples for Crypto Badge Module - MCP Tool Integration
import { cryptoBadgeService } from '../src/service.js';

/**
 * Example MCP Tool Requests and Responses
 * These examples show how to use the crypto-badge module through MCP tool calls
 */

/**
 * Example 1: Generate Bitcoin preset badge via MCP tool
 */
function mcpBitcoinPresetExample() {
  console.log('=== MCP Tool Example 1: Bitcoin Preset Badge ===');

  const mcpRequest = {
    action: 'generate-preset',
    baseUrl: 'https://paybadge.profullstack.com',
    preset: 'bitcoin',
    linkUrl: 'https://github.com/user/awesome-project',
    format: 'markdown',
  };

  console.log('MCP Request:');
  console.log(JSON.stringify(mcpRequest, null, 2));

  // Simulate MCP response
  const result = cryptoBadgeService.generatePresetBadge(mcpRequest);

  const mcpResponse = {
    tool: 'crypto-badge',
    action: 'generate-preset',
    result: {
      ...result,
      timestamp: new Date().toISOString(),
    },
  };

  console.log('\nMCP Response:');
  console.log(JSON.stringify(mcpResponse, null, 2));
  console.log('\nGenerated Badge:');
  console.log(result.markdown);
  console.log();
}

/**
 * Example 2: Generate custom multi-crypto badge
 */
function mcpMultiCryptoExample() {
  console.log('=== MCP Tool Example 2: Multi-Crypto Badge ===');

  const mcpRequest = {
    action: 'generate-multi-crypto',
    baseUrl: 'https://paybadge.profullstack.com',
    cryptos: ['btc', 'eth', 'sol', 'usdc'],
    addresses: {
      btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      eth: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      sol: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    },
    linkUrl: 'https://github.com/user/crypto-project',
    format: 'html',
  };

  console.log('MCP Request:');
  console.log(JSON.stringify(mcpRequest, null, 2));

  const result = cryptoBadgeService.generateMultiCryptoBadge(mcpRequest);

  const mcpResponse = {
    tool: 'crypto-badge',
    action: 'generate-multi-crypto',
    result: {
      ...result,
      timestamp: new Date().toISOString(),
    },
  };

  console.log('\nMCP Response:');
  console.log(JSON.stringify(mcpResponse, null, 2));
  console.log('\nGenerated HTML Badge:');
  console.log(result.html);
  console.log();
}

/**
 * Example 3: List available presets
 */
function mcpListPresetsExample() {
  console.log('=== MCP Tool Example 3: List Presets ===');

  const mcpRequest = {
    action: 'list-presets',
  };

  console.log('MCP Request:');
  console.log(JSON.stringify(mcpRequest, null, 2));

  const presets = Object.keys(cryptoBadgeService.BADGE_PRESETS).map(key => ({
    name: key,
    description: cryptoBadgeService.BADGE_PRESETS[key].altText,
    parameters: cryptoBadgeService.BADGE_PRESETS[key].badgeParams,
  }));

  const mcpResponse = {
    tool: 'crypto-badge',
    action: 'list-presets',
    result: {
      presets,
      count: presets.length,
      timestamp: new Date().toISOString(),
    },
  };

  console.log('\nMCP Response:');
  console.log(JSON.stringify(mcpResponse, null, 2));
  console.log();
}

/**
 * Example 4: Generate custom donation badge with overrides
 */
function mcpCustomDonationExample() {
  console.log('=== MCP Tool Example 4: Custom Donation Badge ===');

  const mcpRequest = {
    action: 'generate-preset',
    baseUrl: 'https://paybadge.profullstack.com',
    preset: 'donation',
    linkUrl: 'https://github.com/sponsors/username',
    overrides: {
      leftText: 'sponsor',
      rightText: 'developer',
      rightColor: '#ff6b6b',
    },
  };

  console.log('MCP Request:');
  console.log(JSON.stringify(mcpRequest, null, 2));

  const result = cryptoBadgeService.generatePresetBadge(mcpRequest);

  const mcpResponse = {
    tool: 'crypto-badge',
    action: 'generate-preset',
    result: {
      ...result,
      timestamp: new Date().toISOString(),
    },
  };

  console.log('\nMCP Response:');
  console.log(JSON.stringify(mcpResponse, null, 2));
  console.log('\nGenerated Badge:');
  console.log(result.markdown);
  console.log();
}

/**
 * Example 5: Generate enhanced style badge
 */
function mcpEnhancedStyleExample() {
  console.log('=== MCP Tool Example 5: Enhanced Style Badge ===');

  const mcpRequest = {
    action: 'generate-markdown',
    baseUrl: 'https://paybadge.profullstack.com',
    leftText: 'support',
    rightText: 'project',
    leftColor: '#2c3e50',
    rightColor: '#e74c3c',
    style: 'enhanced',
    linkUrl: 'https://github.com/user/project',
    altText: 'Support this project with crypto payments',
  };

  console.log('MCP Request:');
  console.log(JSON.stringify(mcpRequest, null, 2));

  const badgeUrl = cryptoBadgeService.generateBadgeUrl({
    baseUrl: mcpRequest.baseUrl,
    leftText: mcpRequest.leftText,
    rightText: mcpRequest.rightText,
    leftColor: mcpRequest.leftColor,
    rightColor: mcpRequest.rightColor,
    style: mcpRequest.style,
  });

  const markdown = cryptoBadgeService.generateMarkdownBadge({
    baseUrl: mcpRequest.baseUrl,
    leftText: mcpRequest.leftText,
    rightText: mcpRequest.rightText,
    leftColor: mcpRequest.leftColor,
    rightColor: mcpRequest.rightColor,
    style: mcpRequest.style,
    linkUrl: mcpRequest.linkUrl,
    altText: mcpRequest.altText,
  });

  const mcpResponse = {
    tool: 'crypto-badge',
    action: 'generate-markdown',
    result: {
      format: 'markdown',
      code: markdown,
      badgeUrl,
      linkUrl: mcpRequest.linkUrl,
      altText: mcpRequest.altText,
      timestamp: new Date().toISOString(),
    },
  };

  console.log('\nMCP Response:');
  console.log(JSON.stringify(mcpResponse, null, 2));
  console.log('\nGenerated Badge:');
  console.log(markdown);
  console.log();
}

/**
 * Example 6: Error handling in MCP context
 */
function mcpErrorHandlingExample() {
  console.log('=== MCP Tool Example 6: Error Handling ===');

  const invalidRequest = {
    action: 'generate-preset',
    // Missing required baseUrl
    preset: 'bitcoin',
    linkUrl: 'https://github.com/user/project',
  };

  console.log('Invalid MCP Request:');
  console.log(JSON.stringify(invalidRequest, null, 2));

  try {
    cryptoBadgeService.generatePresetBadge(invalidRequest);
  } catch (error) {
    const errorResponse = {
      tool: 'crypto-badge',
      action: 'generate-preset',
      error: error.message,
      timestamp: new Date().toISOString(),
    };

    console.log('\nMCP Error Response:');
    console.log(JSON.stringify(errorResponse, null, 2));
  }

  console.log();
}

/**
 * Example 7: Batch processing multiple badges
 */
function mcpBatchProcessingExample() {
  console.log('=== MCP Tool Example 7: Batch Processing ===');

  const batchRequests = [
    {
      action: 'generate-preset',
      baseUrl: 'https://paybadge.profullstack.com',
      preset: 'bitcoin',
      linkUrl: 'https://github.com/user/project',
    },
    {
      action: 'generate-preset',
      baseUrl: 'https://paybadge.profullstack.com',
      preset: 'ethereum',
      linkUrl: 'https://github.com/user/project',
    },
    {
      action: 'generate-preset',
      baseUrl: 'https://paybadge.profullstack.com',
      preset: 'solana',
      linkUrl: 'https://github.com/user/project',
    },
  ];

  console.log('Batch MCP Requests:');
  console.log(JSON.stringify(batchRequests, null, 2));

  const batchResults = batchRequests.map((request, index) => {
    try {
      const result = cryptoBadgeService.generatePresetBadge(request);
      return {
        index,
        success: true,
        tool: 'crypto-badge',
        action: request.action,
        result: {
          ...result,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        index,
        success: false,
        tool: 'crypto-badge',
        action: request.action,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  });

  console.log('\nBatch MCP Results:');
  console.log(JSON.stringify(batchResults, null, 2));

  console.log('\nGenerated Badges:');
  batchResults.forEach((result, index) => {
    if (result.success) {
      console.log(`${index + 1}. ${result.result.preset.toUpperCase()}:`);
      console.log(result.result.markdown);
    }
  });

  console.log();
}

/**
 * Example 8: Integration with GitHub Actions workflow
 */
function githubActionsIntegrationExample() {
  console.log('=== GitHub Actions Integration Example ===');

  const workflowExample = `
name: Generate Crypto Badges

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  generate-badges:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: pnpm install
      
    - name: Generate Bitcoin Badge
      run: |
        curl -X POST http://localhost:3000/tools/crypto-badge \\
          -H "Content-Type: application/json" \\
          -d '{
            "action": "generate-preset",
            "baseUrl": "https://paybadge.profullstack.com",
            "preset": "bitcoin",
            "linkUrl": "GITHUB_SERVER_URL/GITHUB_REPOSITORY"
          }' > bitcoin-badge.json
          
    - name: Generate Multi-Crypto Badge
      run: |
        curl -X POST http://localhost:3000/tools/crypto-badge \\
          -H "Content-Type: application/json" \\
          -d '{
            "action": "generate-multi-crypto",
            "baseUrl": "https://paybadge.profullstack.com",
            "cryptos": ["btc", "eth", "sol"],
            "linkUrl": "GITHUB_SERVER_URL/GITHUB_REPOSITORY"
          }' > multi-crypto-badge.json
          
    - name: Update README with badges
      run: |
        # Extract badge markdown from JSON responses
        BITCOIN_BADGE=\\$(jq -r '.result.markdown' bitcoin-badge.json)
        MULTI_BADGE=\\$(jq -r '.result.markdown' multi-crypto-badge.json)
        
        # Update README.md with generated badges
        sed -i "s|<!-- BITCOIN_BADGE -->.*<!-- /BITCOIN_BADGE -->|<!-- BITCOIN_BADGE -->\\$BITCOIN_BADGE<!-- /BITCOIN_BADGE -->|g" README.md
        sed -i "s|<!-- MULTI_BADGE -->.*<!-- /MULTI_BADGE -->|<!-- MULTI_BADGE -->\\$MULTI_BADGE<!-- /MULTI_BADGE -->|g" README.md
        
    - name: Commit changes
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add README.md
        git diff --staged --quiet || git commit -m "Update crypto payment badges"
        git push
`;

  console.log('GitHub Actions Workflow Example:');
  console.log(workflowExample);
  console.log();
}

/**
 * Run all advanced examples
 */
function runAdvancedExamples() {
  console.log('🚀 Crypto Badge Module - Advanced Usage Examples\n');

  mcpBitcoinPresetExample();
  mcpMultiCryptoExample();
  mcpListPresetsExample();
  mcpCustomDonationExample();
  mcpEnhancedStyleExample();
  mcpErrorHandlingExample();
  mcpBatchProcessingExample();
  githubActionsIntegrationExample();

  console.log('✅ All advanced examples completed!');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAdvancedExamples();
}

export {
  mcpBitcoinPresetExample,
  mcpMultiCryptoExample,
  mcpListPresetsExample,
  mcpCustomDonationExample,
  mcpEnhancedStyleExample,
  mcpErrorHandlingExample,
  mcpBatchProcessingExample,
  githubActionsIntegrationExample,
  runAdvancedExamples,
};
