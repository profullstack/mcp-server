// Crypto Badge Controller Tests (Mocha + Chai)
import { expect } from 'chai';
import {
  generateBadgeHandler,
  generateMarkdownHandler,
  generateHTMLHandler,
  generatePresetHandler,
} from '../src/controller.js';

describe('Crypto Badge Controller', () => {
  describe('generateBadgeHandler', () => {
    it('should handle valid badge generation request', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
          leftText: 'donate',
          rightText: 'bitcoin',
          rightColor: '#f7931a',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generateBadgeHandler(mockContext);

      expect(result.json).to.be.an('object');
      expect(result.json.tool).to.equal('crypto-badge');
      expect(result.json.action).to.equal('generate');
      expect(result.json.result).to.have.property('badgeUrl');
      expect(result.json.result).to.have.property('timestamp');
    });

    it('should return error for missing baseUrl', async () => {
      const mockRequest = {
        json: async () => ({
          leftText: 'donate',
          rightText: 'bitcoin',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: (data, status) => ({ json: data, status }),
      };

      const result = await generateBadgeHandler(mockContext);

      expect(result.status).to.equal(400);
      expect(result.json.error).to.include('Missing required parameter: baseUrl');
    });

    it('should handle invalid parameters gracefully', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
          leftColor: 'invalid-color',
          rightText: '<script>alert("xss")</script>',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generateBadgeHandler(mockContext);

      expect(result.json.result.badgeUrl).to.not.include('<script>');
      expect(result.json.result.badgeUrl).to.not.include('invalid-color');
    });
  });

  describe('generateMarkdownHandler', () => {
    it('should generate markdown badge code', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
          linkUrl: 'https://github.com/user/repo',
          altText: 'Support this project',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generateMarkdownHandler(mockContext);

      expect(result.json.result.format).to.equal('markdown');
      expect(result.json.result.code).to.match(/^\[!\[.*\]\(.*\)\]\(.*\)$/);
      expect(result.json.result.code).to.include('Support this project');
      expect(result.json.result.code).to.include('https://github.com/user/repo');
    });

    it('should use default values for optional parameters', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generateMarkdownHandler(mockContext);

      expect(result.json.result.code).to.be.a('string');
      expect(result.json.result.altText).to.equal('Crypto Payment');
    });
  });

  describe('generateHTMLHandler', () => {
    it('should generate HTML badge code', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
          linkUrl: 'https://github.com/user/repo',
          altText: 'Support this project',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generateHTMLHandler(mockContext);

      expect(result.json.result.format).to.equal('html');
      expect(result.json.result.code).to.include('<a href=');
      expect(result.json.result.code).to.include('<img src=');
      expect(result.json.result.code).to.include('target="_blank"');
      expect(result.json.result.code).to.include('Support this project');
    });

    it('should escape HTML entities in alt text', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
          altText: 'Support <script>alert("xss")</script> project',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generateHTMLHandler(mockContext);

      expect(result.json.result.code).to.not.include('<script>');
      expect(result.json.result.code).to.include('&lt;script&gt;');
    });
  });

  describe('generatePresetHandler', () => {
    it('should generate Bitcoin preset badge', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
          preset: 'bitcoin',
          linkUrl: 'https://github.com/user/repo',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generatePresetHandler(mockContext);

      expect(result.json.result.preset).to.equal('bitcoin');
      expect(result.json.result.markdown).to.include('Bitcoin Payment');
      expect(result.json.result.badgeUrl).to.include('rightColor=%23f7931a');
    });

    it('should generate Ethereum preset badge', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
          preset: 'ethereum',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generatePresetHandler(mockContext);

      expect(result.json.result.preset).to.equal('ethereum');
      expect(result.json.result.markdown).to.include('Ethereum Payment');
      expect(result.json.result.badgeUrl).to.include('rightColor=%23627eea');
    });

    it('should return error for unknown preset', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
          preset: 'unknown',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: (data, status) => ({ json: data, status }),
      };

      const result = await generatePresetHandler(mockContext);

      expect(result.status).to.equal(500);
      expect(result.json.error).to.include('Unknown preset: unknown');
    });

    it('should allow parameter overrides for presets', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
          preset: 'bitcoin',
          overrides: {
            leftText: 'tip',
            rightColor: '#ff6600',
          },
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generatePresetHandler(mockContext);

      expect(result.json.result.badgeUrl).to.include('leftText=tip');
      expect(result.json.result.badgeUrl).to.include('rightColor=%23ff6600');
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      const mockRequest = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      };

      const mockContext = {
        req: mockRequest,
        json: (data, status) => ({ json: data, status }),
      };

      const result = await generateBadgeHandler(mockContext);

      expect(result.status).to.equal(500);
      expect(result.json.error).to.include('Invalid JSON');
    });

    it('should handle service layer errors', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'invalid-url',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: (data, status) => ({ json: data, status }),
      };

      const result = await generateBadgeHandler(mockContext);

      expect(result.status).to.equal(500);
      expect(result.json.error).to.be.a('string');
    });

    it('should validate required parameters', async () => {
      const mockRequest = {
        json: async () => ({}),
      };

      const mockContext = {
        req: mockRequest,
        json: (data, status) => ({ json: data, status }),
      };

      const result = await generateBadgeHandler(mockContext);

      expect(result.status).to.equal(400);
      expect(result.json.error).to.include('Missing required parameter: baseUrl');
    });
  });

  describe('response format', () => {
    it('should include timestamp in all responses', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generateBadgeHandler(mockContext);

      expect(result.json.result.timestamp).to.be.a('string');
      expect(new Date(result.json.result.timestamp)).to.be.a('date');
    });

    it('should include tool and action metadata', async () => {
      const mockRequest = {
        json: async () => ({
          baseUrl: 'https://paybadge.profullstack.com',
        }),
      };

      const mockContext = {
        req: mockRequest,
        json: data => ({ json: data }),
      };

      const result = await generateBadgeHandler(mockContext);

      expect(result.json.tool).to.equal('crypto-badge');
      expect(result.json.action).to.equal('generate');
    });
  });
});
