/**
 * Controller Layer Tests
 * Tests for MCP endpoints and request handling
 */

import { expect } from 'chai';
import sinon from 'sinon';
import {
  postContent,
  loginToPlatform,
  getPlatformStatus,
  getAvailablePlatforms,
} from '../src/controller.js';

describe('Controller Functions', () => {
  let mockService;
  let mockContext;

  beforeEach(() => {
    // Mock the service layer
    mockService = {
      postContent: sinon.stub(),
      loginToPlatform: sinon.stub(),
      getPlatformStatus: sinon.stub(),
      getAvailablePlatforms: sinon.stub(),
    };

    // Mock Hono context
    mockContext = {
      req: {
        json: sinon.stub(),
      },
      json: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('postContent', () => {
    it('should handle valid post request', async () => {
      const requestData = {
        content: { text: 'Hello world!' },
        platforms: ['x', 'linkedin'],
      };
      const serviceResult = {
        success: true,
        results: { x: { success: true }, linkedin: { success: true } },
        successCount: 2,
      };

      mockContext.req.json.resolves(requestData);
      mockService.postContent.resolves(serviceResult);

      const controller = postContent(mockService);
      await controller(mockContext);

      expect(mockService.postContent).to.have.been.calledWith(
        requestData.content,
        requestData.platforms
      );
      expect(mockContext.json).to.have.been.calledWith({
        tool: 'social-post',
        success: true,
        result: serviceResult,
        timestamp: sinon.match.string,
      });
    });

    it('should handle missing content parameter', async () => {
      const requestData = { platforms: ['x'] };

      mockContext.req.json.resolves(requestData);

      const controller = postContent(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith(
        { error: 'Missing required parameter: content' },
        400
      );
      expect(mockService.postContent).not.to.have.been.called;
    });

    it('should handle service errors', async () => {
      const requestData = {
        content: { text: 'Hello world!' },
      };
      const error = new Error('Service error');

      mockContext.req.json.resolves(requestData);
      mockService.postContent.rejects(error);

      const controller = postContent(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Service error' }, 500);
    });

    it('should handle JSON parsing errors', async () => {
      const error = new Error('Invalid JSON');
      mockContext.req.json.rejects(error);

      const controller = postContent(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Invalid JSON' }, 500);
    });
  });

  describe('loginToPlatform', () => {
    it('should handle valid login request', async () => {
      const requestData = {
        platform: 'x',
        options: { headless: false },
      };
      const serviceResult = {
        success: true,
        platform: 'x',
      };

      mockContext.req.json.resolves(requestData);
      mockService.loginToPlatform.resolves(serviceResult);

      const controller = loginToPlatform(mockService);
      await controller(mockContext);

      expect(mockService.loginToPlatform).to.have.been.calledWith(
        requestData.platform,
        requestData.options
      );
      expect(mockContext.json).to.have.been.calledWith({
        tool: 'social-login',
        success: true,
        result: serviceResult,
        timestamp: sinon.match.string,
      });
    });

    it('should handle missing platform parameter', async () => {
      const requestData = { options: {} };

      mockContext.req.json.resolves(requestData);

      const controller = loginToPlatform(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith(
        { error: 'Missing required parameter: platform' },
        400
      );
      expect(mockService.loginToPlatform).not.to.have.been.called;
    });

    it('should handle login failures', async () => {
      const requestData = { platform: 'x' };
      const serviceResult = {
        success: false,
        error: 'Login failed',
      };

      mockContext.req.json.resolves(requestData);
      mockService.loginToPlatform.resolves(serviceResult);

      const controller = loginToPlatform(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({
        tool: 'social-login',
        success: false,
        result: serviceResult,
        timestamp: sinon.match.string,
      });
    });
  });

  describe('getPlatformStatus', () => {
    it('should return platform status', async () => {
      const serviceResult = {
        x: { enabled: true, loggedIn: true },
        linkedin: { enabled: true, loggedIn: false },
      };

      mockService.getPlatformStatus.resolves(serviceResult);

      const controller = getPlatformStatus(mockService);
      await controller(mockContext);

      expect(mockService.getPlatformStatus).to.have.been.called;
      expect(mockContext.json).to.have.been.calledWith({
        tool: 'social-status',
        success: true,
        result: serviceResult,
        timestamp: sinon.match.string,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Status check failed');

      mockService.getPlatformStatus.rejects(error);

      const controller = getPlatformStatus(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Status check failed' }, 500);
    });
  });

  describe('getAvailablePlatforms', () => {
    it('should return available platforms', async () => {
      const serviceResult = ['x', 'linkedin', 'reddit'];

      mockService.getAvailablePlatforms.returns(serviceResult);

      const controller = getAvailablePlatforms(mockService);
      await controller(mockContext);

      expect(mockService.getAvailablePlatforms).to.have.been.called;
      expect(mockContext.json).to.have.been.calledWith({
        tool: 'social-platforms',
        success: true,
        result: {
          platforms: serviceResult,
          count: serviceResult.length,
        },
        timestamp: sinon.match.string,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Failed to get platforms');

      mockService.getAvailablePlatforms.throws(error);

      const controller = getAvailablePlatforms(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Failed to get platforms' }, 500);
    });
  });
});

describe('Controller Parameter Validation', () => {
  let mockService;
  let mockContext;

  beforeEach(() => {
    mockService = {
      postContent: sinon.stub(),
      loginToPlatform: sinon.stub(),
    };

    mockContext = {
      req: { json: sinon.stub() },
      json: sinon.stub(),
    };
  });

  describe('postContent parameter validation', () => {
    it('should validate content object structure', async () => {
      const requestData = {
        content: 'invalid-content-type',
      };

      mockContext.req.json.resolves(requestData);

      const controller = postContent(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Content must be an object' }, 400);
    });

    it('should validate platforms array', async () => {
      const requestData = {
        content: { text: 'Hello' },
        platforms: 'invalid-platforms-type',
      };

      mockContext.req.json.resolves(requestData);

      const controller = postContent(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith(
        { error: 'Platforms must be an array' },
        400
      );
    });
  });

  describe('loginToPlatform parameter validation', () => {
    it('should validate platform string', async () => {
      const requestData = {
        platform: 123,
      };

      mockContext.req.json.resolves(requestData);

      const controller = loginToPlatform(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Platform must be a string' }, 400);
    });

    it('should validate options object', async () => {
      const requestData = {
        platform: 'x',
        options: 'invalid-options-type',
      };

      mockContext.req.json.resolves(requestData);

      const controller = loginToPlatform(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Options must be an object' }, 400);
    });
  });
});
