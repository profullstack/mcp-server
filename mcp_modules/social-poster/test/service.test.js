/**
 * Service Layer Tests
 * Tests for the social posting service wrapper
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { SocialPostingService } from '../src/service.js';

describe('SocialPostingService', () => {
  let service;
  let mockSocialPoster;

  beforeEach(() => {
    // Mock the SocialPoster class
    mockSocialPoster = {
      post: sinon.stub(),
      login: sinon.stub(),
      getAuthStatus: sinon.stub(),
      getAvailablePlatforms: sinon.stub(),
      close: sinon.stub(),
    };

    service = new SocialPostingService({
      socialPoster: mockSocialPoster,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultService = new SocialPostingService();
      expect(defaultService).to.be.instanceOf(SocialPostingService);
    });

    it('should accept custom options', () => {
      const customService = new SocialPostingService({
        headless: false,
        timeout: 60000,
      });
      expect(customService.options.headless).to.equal(false);
      expect(customService.options.timeout).to.equal(60000);
    });
  });

  describe('validateContent', () => {
    it('should validate valid text content', () => {
      const content = { text: 'Hello world!' };
      const result = service.validateContent(content);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should validate valid link content', () => {
      const content = {
        text: 'Check this out!',
        link: 'https://example.com',
      };
      const result = service.validateContent(content);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should reject content without text or link', () => {
      const content = {};
      const result = service.validateContent(content);

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Content must have either text or link');
    });

    it('should reject invalid URL in link', () => {
      const content = {
        text: 'Check this out!',
        link: 'not-a-valid-url',
      };
      const result = service.validateContent(content);

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Link must be a valid URL');
    });

    it('should reject non-string text', () => {
      const content = { text: 123 };
      const result = service.validateContent(content);

      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Text must be a string');
    });

    it('should warn about long text', () => {
      const longText = 'a'.repeat(300);
      const content = { text: longText };
      const result = service.validateContent(content);

      expect(result.valid).to.be.false;
      expect(result.errors).to.include(
        'Text is too long for some platforms (maximum 280 characters recommended)'
      );
    });
  });

  describe('postContent', () => {
    it('should post content successfully', async () => {
      const content = { text: 'Hello world!' };
      const platforms = ['x', 'linkedin'];
      const expectedResult = {
        success: true,
        results: {
          x: { success: true, postId: '123' },
          linkedin: { success: true, postId: '456' },
        },
        successCount: 2,
        failureCount: 0,
      };

      mockSocialPoster.post.resolves(expectedResult);

      const result = await service.postContent(content, platforms);

      expect(mockSocialPoster.post).to.have.been.calledWith(content, platforms);
      expect(result.success).to.be.true;
      expect(result.successCount).to.equal(2);
    });

    it('should handle posting errors gracefully', async () => {
      const content = { text: 'Hello world!' };
      const error = new Error('Network error');

      mockSocialPoster.post.rejects(error);

      const result = await service.postContent(content);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Network error');
    });

    it('should validate content before posting', async () => {
      const invalidContent = {};

      const result = await service.postContent(invalidContent);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid content');
      expect(mockSocialPoster.post).not.to.have.been.called;
    });
  });

  describe('loginToPlatform', () => {
    it('should login to platform successfully', async () => {
      const platform = 'x';
      const options = { headless: false };

      mockSocialPoster.login.resolves(true);

      const result = await service.loginToPlatform(platform, options);

      expect(mockSocialPoster.login).to.have.been.calledWith(platform, options);
      expect(result.success).to.be.true;
    });

    it('should handle login failures', async () => {
      const platform = 'x';

      mockSocialPoster.login.resolves(false);

      const result = await service.loginToPlatform(platform);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Login failed');
    });

    it('should handle login errors', async () => {
      const platform = 'x';
      const error = new Error('Authentication error');

      mockSocialPoster.login.rejects(error);

      const result = await service.loginToPlatform(platform);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Authentication error');
    });
  });

  describe('getPlatformStatus', () => {
    it('should return platform status', async () => {
      const expectedStatus = {
        x: { enabled: true, loggedIn: true, displayName: 'X (Twitter)' },
        linkedin: { enabled: true, loggedIn: false, displayName: 'LinkedIn' },
      };

      mockSocialPoster.getAuthStatus.returns(expectedStatus);

      const result = await service.getPlatformStatus();

      expect(result).to.deep.equal(expectedStatus);
    });
  });

  describe('getAvailablePlatforms', () => {
    it('should return available platforms', () => {
      const expectedPlatforms = ['x', 'linkedin', 'reddit'];

      mockSocialPoster.getAvailablePlatforms.returns(expectedPlatforms);

      const result = service.getAvailablePlatforms();

      expect(result).to.deep.equal(expectedPlatforms);
    });
  });

  describe('close', () => {
    it('should close the social poster instance', async () => {
      await service.close();

      expect(mockSocialPoster.close).to.have.been.called;
    });
  });

  describe('createSampleContent', () => {
    it('should create sample text content', () => {
      const result = service.createSampleContent('text');

      expect(result).to.have.property('text');
      expect(result).to.have.property('type', 'text');
    });

    it('should create sample link content', () => {
      const result = service.createSampleContent('link');

      expect(result).to.have.property('text');
      expect(result).to.have.property('link');
      expect(result).to.have.property('type', 'link');
    });

    it('should default to text content for unknown types', () => {
      const result = service.createSampleContent('unknown');

      expect(result).to.have.property('type', 'text');
    });
  });
});
