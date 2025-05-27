import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Link Shortener Module', () => {
  describe('Module Structure', () => {
    it('should export the required functions', async () => {
      const module = await import('../index.js');
      expect(module.register).to.be.a('function');
      expect(module.unregister).to.be.a('function');
      expect(module.metadata).to.be.an('object');
    });

    it('should have correct metadata', async () => {
      const { metadata } = await import('../index.js');
      expect(metadata.name).to.equal('Link Shortener Module');
      expect(metadata.version).to.equal('1.0.0');
      expect(metadata.description).to.include('hynt.us');
      expect(metadata.author).to.equal('Profullstack, Inc.');
      expect(metadata.tools).to.include('link-shortener');
      expect(metadata.endpoints).to.be.an('array');
      expect(metadata.endpoints.length).to.be.greaterThan(0);
    });
  });

  describe('Utility Functions', () => {
    let utils;

    before(async () => {
      utils = await import('../src/utils.js');
    });

    describe('validateUrl', () => {
      it('should accept valid HTTP URLs', () => {
        expect(() => utils.validateUrl('http://example.com')).to.not.throw();
        expect(() => utils.validateUrl('https://www.google.com')).to.not.throw();
        expect(() =>
          utils.validateUrl('https://subdomain.example.com/path?query=1')
        ).to.not.throw();
      });

      it('should accept valid HTTPS URLs', () => {
        expect(() => utils.validateUrl('https://example.com')).to.not.throw();
        expect(() => utils.validateUrl('https://api.example.com/v1/endpoint')).to.not.throw();
        expect(() => utils.validateUrl('https://example.com:8080/path')).to.not.throw();
      });

      it('should reject invalid URLs', () => {
        expect(() => utils.validateUrl('')).to.throw('URL must be a non-empty string');
        expect(() => utils.validateUrl('not-a-url')).to.throw('Invalid URL format');
        expect(() => utils.validateUrl('ftp://example.com')).to.throw(
          'URL must use HTTP or HTTPS protocol'
        );
        expect(() => utils.validateUrl('javascript:alert(1)')).to.throw(
          'URL must use HTTP or HTTPS protocol'
        );
      });

      it('should reject null or undefined URLs', () => {
        expect(() => utils.validateUrl(null)).to.throw('URL must be a non-empty string');
        expect(() => utils.validateUrl(undefined)).to.throw('URL must be a non-empty string');
        expect(() => utils.validateUrl(123)).to.throw('URL must be a non-empty string');
      });

      it('should reject URLs that are too long', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(2048);
        expect(() => utils.validateUrl(longUrl)).to.throw('URL is too long');
      });
    });

    describe('generateRandomAlias', () => {
      it('should generate alias of default length', () => {
        const alias = utils.generateRandomAlias();
        expect(alias).to.be.a('string');
        expect(alias.length).to.equal(6);
        expect(/^[a-zA-Z0-9]+$/.test(alias)).to.be.true;
      });

      it('should generate alias of specified length', () => {
        const alias = utils.generateRandomAlias(10);
        expect(alias).to.be.a('string');
        expect(alias.length).to.equal(10);
        expect(/^[a-zA-Z0-9]+$/.test(alias)).to.be.true;
      });

      it('should generate different aliases on multiple calls', () => {
        const alias1 = utils.generateRandomAlias();
        const alias2 = utils.generateRandomAlias();
        expect(alias1).to.not.equal(alias2);
      });
    });

    describe('validateAlias', () => {
      it('should accept valid aliases', () => {
        expect(utils.validateAlias('abc123')).to.be.true;
        expect(utils.validateAlias('my-link')).to.be.true;
        expect(utils.validateAlias('test_alias')).to.be.true;
        expect(utils.validateAlias('ABC123')).to.be.true;
      });

      it('should reject invalid aliases', () => {
        expect(utils.validateAlias('')).to.be.false;
        expect(utils.validateAlias('ab')).to.be.false; // Too short
        expect(utils.validateAlias('a'.repeat(21))).to.be.false; // Too long
        expect(utils.validateAlias('alias with spaces')).to.be.false;
        expect(utils.validateAlias('alias@domain')).to.be.false;
      });

      it('should reject reserved words', () => {
        expect(utils.validateAlias('api')).to.be.false;
        expect(utils.validateAlias('admin')).to.be.false;
        expect(utils.validateAlias('www')).to.be.false;
        expect(utils.validateAlias('login')).to.be.false;
      });
    });

    describe('validateApiKey', () => {
      it('should validate correct API key format', () => {
        expect(utils.validateApiKey('apikeys:1t7nfaw9ra0nmznsbdni')).to.be.true;
        expect(utils.validateApiKey('apikeys:abcdefghij1234567890')).to.be.true;
      });

      it('should reject invalid API key formats', () => {
        expect(utils.validateApiKey('invalid-key')).to.be.false;
        expect(utils.validateApiKey('apikeys:')).to.be.false;
        expect(utils.validateApiKey('apikeys:short')).to.be.false;
        expect(utils.validateApiKey('')).to.be.false;
        expect(utils.validateApiKey(null)).to.be.false;
      });
    });

    describe('checkUrlSafety', () => {
      it('should pass safe URLs', () => {
        const result = utils.checkUrlSafety('https://example.com');
        expect(result.safe).to.be.true;
        expect(result.errors).to.be.an('array').with.length(0);
        expect(result.score).to.be.a('number').greaterThan(0);
      });

      it('should warn about suspicious URLs', () => {
        const result = utils.checkUrlSafety('https://bit.ly/something');
        expect(result.warnings).to.be.an('array');
        expect(result.warnings.some(w => w.includes('shortened'))).to.be.true;
      });

      it('should handle invalid URLs', () => {
        const result = utils.checkUrlSafety('not-a-url');
        expect(result.safe).to.be.false;
        expect(result.errors).to.be.an('array').with.length.greaterThan(0);
        expect(result.score).to.equal(0);
      });
    });
  });

  describe('Service Class', () => {
    let LinkService;
    let service;
    let fetchStub;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      LinkService = serviceModule.LinkService;
      service = serviceModule.linkService;
    });

    beforeEach(() => {
      fetchStub = sinon.stub(global, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
      service.clearCache();
    });

    it('should create a service instance', () => {
      expect(service).to.be.an.instanceof(LinkService);
      expect(service.baseUrl).to.equal('https://hynt.us');
      expect(service.apiEndpoint).to.equal('https://hynt.us/links');
      expect(service.userAgent).to.include('MCP-Link-Shortener-Module');
    });

    it('should have cache functionality', () => {
      expect(service.cache).to.be.an.instanceof(Map);
      expect(service.cacheTimeout).to.be.a('number');
      expect(service.clearCache).to.be.a('function');
      expect(service.getCacheStats).to.be.a('function');
    });

    describe('createShortLink', () => {
      it('should create short links successfully', async () => {
        const mockResponse = {
          id: 'test123',
          url: 'https://example.com',
          alias: 'abc123',
          createdAt: '2023-12-07T15:30:00Z',
          clicks: 0,
          active: true,
        };

        fetchStub.resolves({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await service.createShortLink('https://example.com', {
          alias: 'abc123',
          apiKey: 'apikeys:1t7nfaw9ra0nmznsbdni',
        });

        expect(result).to.have.property('success', true);
        expect(result).to.have.property('originalUrl', 'https://example.com');
        expect(result).to.have.property('shortUrl', 'https://hynt.us/abc123');
        expect(result).to.have.property('alias', 'abc123');
      });

      it('should handle API errors', async () => {
        fetchStub.resolves({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('{"error": "Invalid URL"}'),
        });

        try {
          await service.createShortLink('https://example.com', {
            apiKey: 'apikeys:1t7nfaw9ra0nmznsbdni',
          });
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Invalid URL');
        }
      });

      it('should validate URLs before creating links', async () => {
        try {
          await service.createShortLink('invalid-url', {
            apiKey: 'apikeys:1t7nfaw9ra0nmznsbdni',
          });
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Invalid URL format');
        }
      });
    });

    describe('generatePreview', () => {
      it('should generate link previews', () => {
        const preview = service.generatePreview('https://example.com/path', 'myalias');

        expect(preview).to.have.property('originalUrl', 'https://example.com/path');
        expect(preview).to.have.property('shortUrl', 'https://hynt.us/myalias');
        expect(preview).to.have.property('alias', 'myalias');
        expect(preview).to.have.property('customAlias', true);
        expect(preview).to.have.property('domain', 'example.com');
        expect(preview).to.have.property('savings');
      });

      it('should generate random alias when none provided', () => {
        const preview = service.generatePreview('https://example.com');

        expect(preview).to.have.property('alias');
        expect(preview).to.have.property('customAlias', false);
        expect(preview.alias).to.be.a('string').with.length.greaterThan(0);
      });
    });

    describe('testConnection', () => {
      it('should test API connection successfully', async () => {
        const mockResponse = {
          id: 'test123',
          createdAt: '2023-12-07T15:30:00Z',
        };

        fetchStub.resolves({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await service.testConnection('apikeys:1t7nfaw9ra0nmznsbdni');

        expect(result).to.have.property('success', true);
        expect(result).to.have.property('message', 'API connection successful');
        expect(result).to.have.property('testLink');
      });

      it('should handle connection failures', async () => {
        fetchStub.rejects(new Error('Network error'));

        const result = await service.testConnection('apikeys:1t7nfaw9ra0nmznsbdni');

        expect(result).to.have.property('success', false);
        expect(result).to.have.property('message', 'API connection failed');
        expect(result).to.have.property('error');
      });
    });
  });

  describe('Controller Functions', () => {
    let controller;

    before(async () => {
      controller = await import('../src/controller.js');
    });

    it('should export all required controller functions', () => {
      expect(controller.createShortLink).to.be.a('function');
      expect(controller.getLinkInfo).to.be.a('function');
      expect(controller.validateUrl).to.be.a('function');
      expect(controller.generatePreview).to.be.a('function');
      expect(controller.bulkCreateShortLinks).to.be.a('function');
      expect(controller.getLinkAnalytics).to.be.a('function');
      expect(controller.testConnection).to.be.a('function');
      expect(controller.getModuleStats).to.be.a('function');
      expect(controller.clearCache).to.be.a('function');
    });
  });

  describe('Error Handling', () => {
    let service;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      service = serviceModule.linkService;
    });

    afterEach(() => {
      service.clearCache();
    });

    it('should handle invalid URLs gracefully', async () => {
      try {
        await service.createShortLink('not-a-url', {
          apiKey: 'apikeys:1t7nfaw9ra0nmznsbdni',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid URL format');
      }
    });

    it('should handle missing API key', async () => {
      try {
        await service.createShortLink('https://example.com', {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to create short link');
      }
    });
  });

  describe('Integration Tests', () => {
    let service;
    let utils;

    before(async () => {
      const serviceModule = await import('../src/service.js');
      service = serviceModule.linkService;
      utils = await import('../src/utils.js');
    });

    afterEach(() => {
      service.clearCache();
    });

    it('should handle complete workflow', () => {
      const url = 'https://example.com/very/long/path/to/resource';
      const alias = 'mylink';

      // Validate URL
      expect(() => utils.validateUrl(url)).to.not.throw();

      // Validate alias
      expect(utils.validateAlias(alias)).to.be.true;

      // Generate preview
      const preview = service.generatePreview(url, alias);
      expect(preview.originalUrl).to.equal(url);
      expect(preview.alias).to.equal(alias);
      expect(preview.customAlias).to.be.true;

      // Check compression stats
      expect(preview.savings.savedCharacters).to.be.greaterThan(0);
    });

    it('should handle URL safety checks', () => {
      const safeUrl = 'https://example.com';
      const suspiciousUrl = 'https://bit.ly/suspicious';

      const safeCheck = utils.checkUrlSafety(safeUrl);
      expect(safeCheck.safe).to.be.true;
      expect(safeCheck.score).to.be.greaterThan(80);

      const suspiciousCheck = utils.checkUrlSafety(suspiciousUrl);
      expect(suspiciousCheck.warnings.length).to.be.greaterThan(0);
    });

    it('should handle alias sanitization', () => {
      const dirtyAlias = 'My@Alias!';
      const cleanAlias = utils.sanitizeAlias(dirtyAlias);

      expect(cleanAlias).to.not.include('@');
      expect(cleanAlias).to.not.include('!');
      expect(cleanAlias).to.be.a('string').with.length.greaterThan(2);
    });
  });
});
