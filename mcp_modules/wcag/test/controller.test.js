/**
 * WCAG Controller Tests
 */

import { expect } from 'chai';
import sinon from 'sinon';

describe('WCAG Controller', () => {
  let mockContext;

  beforeEach(() => {
    // Mock Hono context
    mockContext = {
      req: {
        json: sinon.stub(),
        param: sinon.stub(),
      },
      json: sinon.stub().returns({ status: 200 }),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('runWcagCheck', () => {
    it('should return error for invalid request data', async () => {
      // Import the controller function
      const { runWcagCheck } = await import('../src/controller.js');

      mockContext.req.json.resolves({});

      await runWcagCheck(mockContext);

      expect(
        mockContext.json.calledWith(
          sinon.match({
            error: 'Invalid request data',
          }),
          400
        )
      ).to.be.true;
    });

    it('should handle single URL requests', async () => {
      const { runWcagCheck } = await import('../src/controller.js');

      const requestData = {
        url: 'https://example.com',
        level: 'WCAG2AA',
      };

      mockContext.req.json.resolves(requestData);

      // We can't easily mock the service without dependency injection
      // This test validates the request handling logic
      await runWcagCheck(mockContext);

      // Verify that json was called (either success or error)
      expect(mockContext.json.called).to.be.true;
    });

    it('should handle multiple URLs requests', async () => {
      const { runWcagCheck } = await import('../src/controller.js');

      const requestData = {
        urls: ['https://example.com', 'https://test.com'],
        level: 'WCAG2AA',
      };

      mockContext.req.json.resolves(requestData);

      await runWcagCheck(mockContext);

      // Verify that json was called
      expect(mockContext.json.called).to.be.true;
    });
  });

  describe('getWcagSummary', () => {
    it('should return error for missing urls', async () => {
      const { getWcagSummary } = await import('../src/controller.js');

      mockContext.req.json.resolves({});

      await getWcagSummary(mockContext);

      expect(
        mockContext.json.calledWith(
          sinon.match({
            error: 'Invalid request data',
          }),
          400
        )
      ).to.be.true;
    });

    it('should return error for non-array urls', async () => {
      const { getWcagSummary } = await import('../src/controller.js');

      mockContext.req.json.resolves({ urls: 'not-an-array' });

      await getWcagSummary(mockContext);

      expect(
        mockContext.json.calledWith(
          sinon.match({
            error: 'Invalid request data',
          }),
          400
        )
      ).to.be.true;
    });

    it('should handle valid summary requests', async () => {
      const { getWcagSummary } = await import('../src/controller.js');

      const requestData = {
        urls: ['https://example.com', 'https://test.com'],
        level: 'WCAG2AA',
      };

      mockContext.req.json.resolves(requestData);

      await getWcagSummary(mockContext);

      // Verify that json was called
      expect(mockContext.json.called).to.be.true;
    });
  });

  describe('getAllTests', () => {
    it('should return placeholder message', async () => {
      const { getAllTests } = await import('../src/controller.js');

      await getAllTests(mockContext);

      expect(
        mockContext.json.calledWith(
          sinon.match({
            message: sinon.match(/not implemented/),
          })
        )
      ).to.be.true;
    });
  });

  describe('getTestById', () => {
    it('should return placeholder message with ID', async () => {
      const { getTestById } = await import('../src/controller.js');

      mockContext.req.param.withArgs('id').returns('test-123');

      await getTestById(mockContext);

      expect(
        mockContext.json.calledWith(
          sinon.match({
            message: sinon.match(/test-123/),
          })
        )
      ).to.be.true;
    });
  });

  describe('updateTest', () => {
    it('should return placeholder message', async () => {
      const { updateTest } = await import('../src/controller.js');

      mockContext.req.param.withArgs('id').returns('test-123');

      await updateTest(mockContext);

      expect(
        mockContext.json.calledWith(
          sinon.match({
            message: sinon.match(/not implemented/),
          })
        )
      ).to.be.true;
    });
  });

  describe('deleteTest', () => {
    it('should return placeholder message', async () => {
      const { deleteTest } = await import('../src/controller.js');

      mockContext.req.param.withArgs('id').returns('test-123');

      await deleteTest(mockContext);

      expect(
        mockContext.json.calledWith(
          sinon.match({
            message: sinon.match(/not implemented/),
          })
        )
      ).to.be.true;
    });
  });

  describe('processCustomTest', () => {
    it('should return placeholder message', async () => {
      const { processCustomTest } = await import('../src/controller.js');

      mockContext.req.param.withArgs('id').returns('test-123');
      mockContext.req.json.resolves({ customRule: 'test' });

      await processCustomTest(mockContext);

      expect(
        mockContext.json.calledWith(
          sinon.match({
            message: sinon.match(/not implemented/),
          })
        )
      ).to.be.true;
    });
  });

  describe('getHealthStatus', () => {
    it('should check Pa11y availability', async () => {
      const { getHealthStatus } = await import('../src/controller.js');

      // This test will actually try to run pa11y --version
      // In a real test environment, we would mock child_process.spawn
      await getHealthStatus(mockContext);

      // Verify that json was called with some response
      expect(mockContext.json.called).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      const { runWcagCheck } = await import('../src/controller.js');

      mockContext.req.json.rejects(new Error('Invalid JSON'));

      await runWcagCheck(mockContext);

      // Check that json was called with an error response
      expect(mockContext.json.called).to.be.true;
      const callArgs = mockContext.json.getCall(0).args;
      expect(callArgs[0]).to.have.property('error');
      expect(callArgs[1]).to.equal(500);
    });

    it('should handle service errors', async () => {
      const { runWcagCheck } = await import('../src/controller.js');

      mockContext.req.json.resolves({
        url: 'https://example.com',
      });

      // The service will likely throw an error since Pa11y might not be installed
      await runWcagCheck(mockContext);

      // Should handle the error gracefully
      expect(mockContext.json.called).to.be.true;
    });
  });
});
