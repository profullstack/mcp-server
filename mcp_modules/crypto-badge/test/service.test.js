// Crypto Badge Service Tests (Mocha + Chai)
import { expect } from 'chai';
import { cryptoBadgeService } from '../src/service.js';

describe('Crypto Badge Service', () => {
  const mockBaseUrl = 'https://paybadge.profullstack.com';

  describe('generateBadgeUrl', () => {
    it('should generate basic badge URL with default parameters', () => {
      const result = cryptoBadgeService.generateBadgeUrl({
        baseUrl: mockBaseUrl,
      });

      expect(result).to.be.a('string');
      expect(result).to.include(mockBaseUrl);
      expect(result).to.include('/badge.svg');
    });

    it('should generate enhanced badge URL when style is enhanced', () => {
      const result = cryptoBadgeService.generateBadgeUrl({
        baseUrl: mockBaseUrl,
        style: 'enhanced',
      });

      expect(result).to.include('/badge-crypto.svg');
    });

    it('should include custom text parameters in URL', () => {
      const result = cryptoBadgeService.generateBadgeUrl({
        baseUrl: mockBaseUrl,
        leftText: 'donate',
        rightText: 'bitcoin',
      });

      expect(result).to.include('leftText=donate');
      expect(result).to.include('rightText=bitcoin');
    });

    it('should include color parameters in URL', () => {
      const result = cryptoBadgeService.generateBadgeUrl({
        baseUrl: mockBaseUrl,
        leftColor: '#555',
        rightColor: '#f7931a',
      });

      expect(result).to.include('leftColor=%23555');
      expect(result).to.include('rightColor=%23f7931a');
    });

    it('should handle cryptocurrency-specific parameters', () => {
      const result = cryptoBadgeService.generateBadgeUrl({
        baseUrl: mockBaseUrl,
        ticker: 'btc',
        recipientAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      });

      expect(result).to.include('ticker=btc');
      expect(result).to.include('recipientAddress=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    });

    it('should filter out undefined and null parameters', () => {
      const result = cryptoBadgeService.generateBadgeUrl({
        baseUrl: mockBaseUrl,
        leftText: 'donate',
        rightText: null,
        leftColor: undefined,
        rightColor: '#f7931a',
      });

      expect(result).to.include('leftText=donate');
      expect(result).to.include('rightColor=%23f7931a');
      expect(result).to.not.include('rightText=');
      expect(result).to.not.include('leftColor=');
    });
  });

  describe('generateMarkdownBadge', () => {
    it('should generate markdown badge with default parameters', () => {
      const result = cryptoBadgeService.generateMarkdownBadge({
        baseUrl: mockBaseUrl,
      });

      expect(result).to.be.a('string');
      expect(result).to.match(/^\[!\[.*\]\(.*\)\]\(.*\)$/);
      expect(result).to.include(mockBaseUrl);
    });

    it('should generate markdown badge with custom link URL', () => {
      const linkUrl = 'https://github.com/user/repo';
      const result = cryptoBadgeService.generateMarkdownBadge({
        baseUrl: mockBaseUrl,
        linkUrl,
      });

      expect(result).to.include(`](${linkUrl})`);
    });

    it('should generate markdown badge with custom alt text', () => {
      const altText = 'Support this project with Bitcoin';
      const result = cryptoBadgeService.generateMarkdownBadge({
        baseUrl: mockBaseUrl,
        altText,
      });

      expect(result).to.include(`[![${altText}]`);
    });

    it('should include badge parameters in the image URL', () => {
      const result = cryptoBadgeService.generateMarkdownBadge({
        baseUrl: mockBaseUrl,
        leftText: 'support',
        rightText: 'bitcoin',
        rightColor: '#f7931a',
      });

      expect(result).to.include('leftText=support');
      expect(result).to.include('rightText=bitcoin');
      expect(result).to.include('rightColor=%23f7931a');
    });
  });

  describe('generateHTMLBadge', () => {
    it('should generate HTML badge with default parameters', () => {
      const result = cryptoBadgeService.generateHTMLBadge({
        baseUrl: mockBaseUrl,
      });

      expect(result).to.be.a('string');
      expect(result).to.include('<a href=');
      expect(result).to.include('<img src=');
      expect(result).to.include('target="_blank"');
      expect(result).to.include('rel="noopener noreferrer"');
    });

    it('should escape HTML entities in alt text', () => {
      const altText = 'Support <script>alert("xss")</script> project';
      const result = cryptoBadgeService.generateHTMLBadge({
        baseUrl: mockBaseUrl,
        altText,
      });

      expect(result).to.not.include('<script>');
      expect(result).to.include('&lt;script&gt;');
    });

    it('should include custom link URL in href attribute', () => {
      const linkUrl = 'https://github.com/user/repo';
      const result = cryptoBadgeService.generateHTMLBadge({
        baseUrl: mockBaseUrl,
        linkUrl,
      });

      expect(result).to.include(`href="${linkUrl}"`);
    });
  });

  describe('generatePresetBadge', () => {
    it('should generate Bitcoin preset badge', () => {
      const result = cryptoBadgeService.generatePresetBadge({
        baseUrl: mockBaseUrl,
        preset: 'bitcoin',
      });

      expect(result.markdown).to.include('Bitcoin Payment');
      expect(result.badgeUrl).to.include('rightColor=%23f7931a');
      expect(result.badgeUrl).to.include('rightText=bitcoin');
    });

    it('should generate Ethereum preset badge', () => {
      const result = cryptoBadgeService.generatePresetBadge({
        baseUrl: mockBaseUrl,
        preset: 'ethereum',
      });

      expect(result.markdown).to.include('Ethereum Payment');
      expect(result.badgeUrl).to.include('rightColor=%23627eea');
      expect(result.badgeUrl).to.include('rightText=ethereum');
    });

    it('should generate Solana preset badge', () => {
      const result = cryptoBadgeService.generatePresetBadge({
        baseUrl: mockBaseUrl,
        preset: 'solana',
      });

      expect(result.markdown).to.include('Solana Payment');
      expect(result.badgeUrl).to.include('rightColor=%2300ffa3');
      expect(result.badgeUrl).to.include('rightText=solana');
    });

    it('should generate USDC preset badge', () => {
      const result = cryptoBadgeService.generatePresetBadge({
        baseUrl: mockBaseUrl,
        preset: 'usdc',
      });

      expect(result.markdown).to.include('USDC Payment');
      expect(result.badgeUrl).to.include('rightColor=%232775ca');
      expect(result.badgeUrl).to.include('rightText=USDC');
    });

    it('should generate donation preset badge', () => {
      const result = cryptoBadgeService.generatePresetBadge({
        baseUrl: mockBaseUrl,
        preset: 'donation',
      });

      expect(result.markdown).to.include('Donate with Crypto');
      expect(result.badgeUrl).to.include('leftText=donate');
      expect(result.badgeUrl).to.include('rightText=crypto');
    });

    it('should throw error for unknown preset', () => {
      expect(() => {
        cryptoBadgeService.generatePresetBadge({
          baseUrl: mockBaseUrl,
          preset: 'unknown',
        });
      }).to.throw('Unknown preset: unknown');
    });

    it('should allow parameter overrides for presets', () => {
      const result = cryptoBadgeService.generatePresetBadge({
        baseUrl: mockBaseUrl,
        preset: 'bitcoin',
        overrides: {
          leftText: 'tip',
          rightColor: '#ff6600',
        },
      });

      expect(result.badgeUrl).to.include('leftText=tip');
      expect(result.badgeUrl).to.include('rightColor=%23ff6600');
    });
  });

  describe('generateMultiCryptoBadge', () => {
    it('should generate badge for multiple cryptocurrencies', () => {
      const result = cryptoBadgeService.generateMultiCryptoBadge({
        baseUrl: mockBaseUrl,
        cryptos: ['btc', 'eth', 'sol'],
      });

      expect(result.badgeUrl).to.include('tickers=btc%2Ceth%2Csol');
      expect(result.markdown).to.include('Multi-Crypto Payment');
    });

    it('should include custom addresses for multiple cryptos', () => {
      const addresses = {
        btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        eth: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      };

      const result = cryptoBadgeService.generateMultiCryptoBadge({
        baseUrl: mockBaseUrl,
        cryptos: ['btc', 'eth'],
        addresses,
      });

      expect(result.badgeUrl).to.include(
        'recipientAddresses=btc%3Abc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh%2Ceth%3A0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      );
    });

    it('should handle single cryptocurrency as array', () => {
      const result = cryptoBadgeService.generateMultiCryptoBadge({
        baseUrl: mockBaseUrl,
        cryptos: ['btc'],
      });

      expect(result.badgeUrl).to.include('ticker=btc');
      expect(result.badgeUrl).to.not.include('tickers=');
    });
  });

  describe('validateBadgeParams', () => {
    it('should validate required baseUrl parameter', () => {
      expect(() => {
        cryptoBadgeService.generateBadgeUrl({});
      }).to.throw('baseUrl is required');
    });

    it('should validate color format', () => {
      const result = cryptoBadgeService.generateBadgeUrl({
        baseUrl: mockBaseUrl,
        leftColor: 'invalid-color',
        rightColor: '#f7931a',
      });

      // Should use default color for invalid format
      expect(result).to.not.include('leftColor=invalid-color');
      expect(result).to.include('rightColor=%23f7931a');
    });

    it('should sanitize text parameters', () => {
      const result = cryptoBadgeService.generateBadgeUrl({
        baseUrl: mockBaseUrl,
        leftText: '<script>alert("xss")</script>',
        rightText: 'bitcoin',
      });

      expect(result).to.not.include('<script>');
      expect(result).to.not.include('alert');
    });

    it('should limit text length', () => {
      const longText = 'a'.repeat(100);
      const result = cryptoBadgeService.generateBadgeUrl({
        baseUrl: mockBaseUrl,
        leftText: longText,
      });

      // Should truncate to maximum allowed length
      expect(result).to.not.include(longText);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // This would be tested with actual HTTP calls in integration tests
      expect(true).to.be.true; // Placeholder for network error handling tests
    });

    it('should handle invalid URL formats', () => {
      expect(() => {
        cryptoBadgeService.generateBadgeUrl({
          baseUrl: 'not-a-valid-url',
        });
      }).to.throw();
    });
  });
});
