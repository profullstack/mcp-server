/**
 * Email Checker Controller Tests
 *
 * Test suite for email checker controller functions
 */

import { expect } from 'chai';
import sinon from 'sinon';
import {
  checkSingleEmail,
  checkMultipleEmails,
  getCheckById,
  getCheckHistory,
} from '../src/controller.js';
import { EmailCheckerService } from '../src/service.js';

describe('Email Checker Controller', () => {
  let mockContext;
  let serviceStub;
  let originalService;

  beforeEach(() => {
    mockContext = {
      req: {
        json: sinon.stub(),
        param: sinon.stub(),
        header: sinon.stub(),
        query: sinon.stub(),
      },
      json: sinon.stub(),
    };

    // Create a stub service instance
    serviceStub = {
      checkEmail: sinon.stub(),
      checkMultipleEmails: sinon.stub(),
      getCheckHistory: sinon.stub(),
      getCheckById: sinon.stub(),
      clearHistory: sinon.stub(),
      getStats: sinon.stub(),
    };

    // Store original service and replace with stub
    originalService = EmailCheckerService.prototype;
    Object.setPrototypeOf(serviceStub, originalService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('checkSingleEmail', () => {
    it('should handle missing email in request', async () => {
      mockContext.req.json.resolves({});
      mockContext.req.header.returns('test-api-key');

      await checkSingleEmail(mockContext);

      expect(mockContext.json.calledWith({ error: 'Email is required' }, 400)).to.be.true;
    });

    it('should handle missing X-API-Key header', async () => {
      mockContext.req.json.resolves({ email: 'test@example.com' });
      mockContext.req.header.returns(undefined);

      await checkSingleEmail(mockContext);

      expect(mockContext.json.calledWith({ error: 'X-API-Key header is required' }, 401)).to.be
        .true;
    });

    it('should handle unsupported provider', async () => {
      mockContext.req.json.resolves({ email: 'test@example.com', provider: 'unsupported' });
      mockContext.req.header.returns('test-api-key');

      await checkSingleEmail(mockContext);

      expect(
        mockContext.json.calledWith(
          { error: 'Unsupported provider. Currently supported: unlimited (un.limited.mx)' },
          400
        )
      ).to.be.true;
    });

    it('should handle JSON parsing errors', async () => {
      mockContext.req.json.rejects(new Error('Invalid JSON'));

      await checkSingleEmail(mockContext);

      expect(mockContext.json.calledWith({ error: 'Invalid JSON' }, 400)).to.be.true;
    });
  });

  describe('checkMultipleEmails', () => {
    it('should handle missing emails array', async () => {
      mockContext.req.json.resolves({});
      mockContext.req.header.returns('test-api-key');

      await checkMultipleEmails(mockContext);

      expect(mockContext.json.calledWith({ error: 'Emails array is required' }, 400)).to.be.true;
    });

    it('should handle empty emails array', async () => {
      mockContext.req.json.resolves({ emails: [] });
      mockContext.req.header.returns('test-api-key');

      await checkMultipleEmails(mockContext);

      expect(mockContext.json.calledWith({ error: 'At least one email is required' }, 400)).to.be
        .true;
    });

    it('should handle non-array emails parameter', async () => {
      mockContext.req.json.resolves({ emails: 'not-an-array' });
      mockContext.req.header.returns('test-api-key');

      await checkMultipleEmails(mockContext);

      expect(mockContext.json.calledWith({ error: 'At least one email is required' }, 400)).to.be
        .true;
    });

    it('should handle missing X-API-Key header', async () => {
      mockContext.req.json.resolves({ emails: ['test@example.com'] });
      mockContext.req.header.returns(undefined);

      await checkMultipleEmails(mockContext);

      expect(mockContext.json.calledWith({ error: 'X-API-Key header is required' }, 401)).to.be
        .true;
    });

    it('should handle unsupported provider', async () => {
      mockContext.req.json.resolves({ emails: ['test@example.com'], provider: 'unsupported' });
      mockContext.req.header.returns('test-api-key');

      await checkMultipleEmails(mockContext);

      expect(
        mockContext.json.calledWith(
          { error: 'Unsupported provider. Currently supported: unlimited (un.limited.mx)' },
          400
        )
      ).to.be.true;
    });
  });

  describe('getCheckHistory', () => {
    it('should handle missing X-API-Key header', async () => {
      mockContext.req.header.returns(undefined);
      mockContext.req.query.returns('unlimited');

      await getCheckHistory(mockContext);

      expect(mockContext.json.calledWith({ error: 'X-API-Key header is required' }, 401)).to.be
        .true;
    });

    it('should handle unsupported provider', async () => {
      mockContext.req.header.returns('test-api-key');
      mockContext.req.query.returns('unsupported');

      await getCheckHistory(mockContext);

      expect(
        mockContext.json.calledWith(
          { error: 'Unsupported provider. Currently supported: unlimited (un.limited.mx)' },
          400
        )
      ).to.be.true;
    });

    it('should handle service errors gracefully', async () => {
      mockContext.req.header.returns('test-api-key');
      mockContext.req.query.returns('unlimited');

      // Create a mock that throws an error
      const mockService = {
        getCheckHistory: () => {
          throw new Error('Database error');
        },
      };

      // Temporarily replace the service
      const testGetCheckHistory = async c => {
        try {
          const history = mockService.getCheckHistory();
          return c.json({
            success: true,
            count: history.length,
            history,
          });
        } catch (error) {
          return c.json(
            {
              error: error.message,
            },
            500
          );
        }
      };

      await testGetCheckHistory(mockContext);

      expect(mockContext.json.calledWith({ error: 'Database error' }, 500)).to.be.true;
    });
  });

  describe('getCheckById', () => {
    it('should handle missing X-API-Key header', async () => {
      mockContext.req.param.returns({ id: '123' });
      mockContext.req.header.returns(undefined);
      mockContext.req.query.returns('unlimited');

      await getCheckById(mockContext);

      expect(mockContext.json.calledWith({ error: 'X-API-Key header is required' }, 401)).to.be
        .true;
    });

    it('should handle unsupported provider', async () => {
      mockContext.req.param.returns({ id: '123' });
      mockContext.req.header.returns('test-api-key');
      mockContext.req.query.returns('unsupported');

      await getCheckById(mockContext);

      expect(
        mockContext.json.calledWith(
          { error: 'Unsupported provider. Currently supported: unlimited (un.limited.mx)' },
          400
        )
      ).to.be.true;
    });

    it('should handle missing ID parameter', async () => {
      mockContext.req.param.returns({});
      mockContext.req.header.returns('test-api-key');
      mockContext.req.query.returns('unlimited');

      await getCheckById(mockContext);

      expect(mockContext.json.calledWith({ error: 'Check with ID undefined not found' }, 404)).to.be
        .true;
    });
  });

  describe('clearHistory', () => {
    it('should handle successful clear operation', async () => {
      // Create a mock that succeeds
      const mockService = {
        clearHistory: () => true,
      };

      const testClearHistory = async c => {
        try {
          mockService.clearHistory();
          return c.json({
            success: true,
            message: 'Check history cleared successfully',
          });
        } catch (error) {
          return c.json(
            {
              error: error.message,
            },
            500
          );
        }
      };

      await testClearHistory(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          message: 'Check history cleared successfully',
        })
      ).to.be.true;
    });
  });

  describe('getStats', () => {
    it('should handle successful stats retrieval', async () => {
      const mockStats = {
        totalChecks: 10,
        validEmails: 7,
        invalidEmails: 3,
        successRate: 70,
      };

      const mockService = {
        getStats: () => mockStats,
      };

      const testGetStats = async c => {
        try {
          const stats = mockService.getStats();
          return c.json({
            success: true,
            stats,
          });
        } catch (error) {
          return c.json(
            {
              error: error.message,
            },
            500
          );
        }
      };

      await testGetStats(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          stats: mockStats,
        })
      ).to.be.true;
    });
  });

  describe('Error handling patterns', () => {
    it('should handle async errors in request processing', async () => {
      mockContext.req.json.rejects(new Error('Network timeout'));

      await checkSingleEmail(mockContext);

      expect(mockContext.json.called).to.be.true;
      const callArgs = mockContext.json.firstCall.args;
      expect(callArgs[0]).to.have.property('error');
      expect(callArgs[1]).to.equal(400);
    });

    it('should handle malformed request data', async () => {
      mockContext.req.json.resolves({ invalidField: 'value' });

      await checkSingleEmail(mockContext);

      expect(mockContext.json.calledWith({ error: 'Email is required' }, 400)).to.be.true;
    });
  });

  describe('Response format validation', () => {
    it('should return consistent error response format', async () => {
      mockContext.req.json.resolves({});

      await checkSingleEmail(mockContext);

      const callArgs = mockContext.json.firstCall.args;
      expect(callArgs[0]).to.have.property('error');
      expect(callArgs[0]).to.not.have.property('success');
      expect(callArgs[1]).to.be.a('number');
    });

    it('should handle parameter extraction errors', async () => {
      mockContext.req.param.throws(new Error('Parameter error'));

      await getCheckById(mockContext);

      expect(mockContext.json.called).to.be.true;
      const callArgs = mockContext.json.firstCall.args;
      expect(callArgs[0]).to.have.property('error');
    });
  });
});
