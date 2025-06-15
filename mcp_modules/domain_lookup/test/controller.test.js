import { expect } from 'chai';
import sinon from 'sinon';
import { domainLookupService } from '../src/service.js';
import {
  checkDomainAvailability,
  generateDomainSuggestions,
  getTldPresets,
  bulkDomainCheck,
} from '../src/controller.js';

describe('Domain Lookup Controller', () => {
  let serviceStub;
  let mockContext;

  beforeEach(() => {
    serviceStub = sinon.stub(domainLookupService);
    mockContext = {
      req: {
        json: sinon.stub(),
        query: sinon.stub(),
      },
      json: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('checkDomainAvailability', () => {
    it('should check domain availability successfully', async () => {
      const mockResult = {
        success: true,
        domains: [{ domain: 'example.com', available: true, status: 'available' }],
        format: 'text',
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      mockContext.req.json.resolves({
        domains: ['example.com'],
        format: 'text',
      });

      serviceStub.checkDomainAvailability.resolves(mockResult);

      await checkDomainAvailability(mockContext);

      expect(serviceStub.checkDomainAvailability.calledOnce).to.be.true;
      expect(mockContext.json.calledWith(mockResult)).to.be.true;
    });

    it('should handle missing domains parameter', async () => {
      mockContext.req.json.resolves({});

      await checkDomainAvailability(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Missing required parameter: domains (array of domain names)',
          },
          400
        )
      ).to.be.true;
    });

    it('should handle service errors', async () => {
      mockContext.req.json.resolves({
        domains: ['example.com'],
      });

      serviceStub.checkDomainAvailability.rejects(new Error('Service error'));

      await checkDomainAvailability(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Service error',
          },
          500
        )
      ).to.be.true;
    });

    it('should validate domains parameter is an array', async () => {
      mockContext.req.json.resolves({
        domains: 'not-an-array',
      });

      await checkDomainAvailability(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'domains parameter must be an array',
          },
          400
        )
      ).to.be.true;
    });
  });

  describe('generateDomainSuggestions', () => {
    it('should generate domain suggestions successfully', async () => {
      const mockResult = {
        success: true,
        keyword: 'example',
        domains: [{ domain: 'getexample.com', available: true, status: 'available' }],
        format: 'text',
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      mockContext.req.json.resolves({
        keyword: 'example',
        prefixes: ['get'],
        tlds: ['com'],
      });

      serviceStub.generateDomainSuggestions.resolves(mockResult);

      await generateDomainSuggestions(mockContext);

      expect(serviceStub.generateDomainSuggestions.calledOnce).to.be.true;
      expect(mockContext.json.calledWith(mockResult)).to.be.true;
    });

    it('should handle missing keyword parameter', async () => {
      mockContext.req.json.resolves({});

      await generateDomainSuggestions(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Missing required parameter: keyword',
          },
          400
        )
      ).to.be.true;
    });

    it('should validate array parameters', async () => {
      mockContext.req.json.resolves({
        keyword: 'example',
        prefixes: 'not-an-array',
      });

      await generateDomainSuggestions(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'prefixes parameter must be an array',
          },
          400
        )
      ).to.be.true;
    });
  });

  describe('getTldPresets', () => {
    it('should get TLD presets successfully', async () => {
      const mockResult = {
        success: true,
        presets: {
          popular: ['com', 'io', 'net'],
          business: ['com', 'biz', 'co'],
        },
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      serviceStub.getTldPresets.resolves(mockResult);

      await getTldPresets(mockContext);

      expect(serviceStub.getTldPresets.calledOnce).to.be.true;
      expect(mockContext.json.calledWith(mockResult)).to.be.true;
    });

    it('should handle service errors', async () => {
      serviceStub.getTldPresets.rejects(new Error('Failed to get presets'));

      await getTldPresets(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Failed to get presets',
          },
          500
        )
      ).to.be.true;
    });
  });

  describe('bulkDomainCheck', () => {
    it('should perform bulk domain check successfully', async () => {
      const mockResult = {
        success: true,
        keywords: ['example1', 'example2'],
        domains: [
          { domain: 'example1.com', available: true, status: 'available' },
          { domain: 'example2.com', available: false, status: 'not available' },
        ],
        format: 'json',
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      mockContext.req.json.resolves({
        keywords: ['example1', 'example2'],
        tlds: ['com'],
        format: 'json',
      });

      serviceStub.bulkDomainCheck.resolves(mockResult);

      await bulkDomainCheck(mockContext);

      expect(serviceStub.bulkDomainCheck.calledOnce).to.be.true;
      expect(mockContext.json.calledWith(mockResult)).to.be.true;
    });

    it('should handle missing keywords parameter', async () => {
      mockContext.req.json.resolves({});

      await bulkDomainCheck(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'Missing required parameter: keywords (array of keywords)',
          },
          400
        )
      ).to.be.true;
    });

    it('should validate keywords parameter is an array', async () => {
      mockContext.req.json.resolves({
        keywords: 'not-an-array',
      });

      await bulkDomainCheck(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            error: 'keywords parameter must be an array',
          },
          400
        )
      ).to.be.true;
    });
  });
});
