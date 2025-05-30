/**
 * Tests for the scanner module controller
 */

import { describe, it, afterEach } from 'mocha';
import { expect, sinon } from './setup.js';
import * as controller from '../src/controller.js';
import { scannerService } from '../src/service.js';

describe('Scanner Controller', () => {
  afterEach(() => {
    sinon.restore();
  });
  describe('getScanHistory', () => {
    it('should return scan history', async () => {
      // Mock data
      const mockScans = [
        { id: 'scan-1', target: 'https://example.com' },
        { id: 'scan-2', target: 'https://test.com' },
      ];

      // Stub the scannerService.getScanHistory method
      sinon.stub(scannerService, 'getScanHistory').returns(mockScans);

      // Mock Hono context
      const mockContext = {
        req: {
          query: sinon.stub().returns('10'),
        },
        json: sinon.spy(),
      };

      // Call the controller method
      await controller.getScanHistory(mockContext);

      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.include({
        success: true,
        count: 2,
      });
    });

    it('should handle errors', async () => {
      // Stub the scannerService.getScanHistory method to throw an error
      sinon.stub(scannerService, 'getScanHistory').throws(new Error('Test error'));

      // Mock Hono context
      const mockContext = {
        req: {
          query: sinon.stub().returns('10'),
        },
        json: sinon.spy(),
      };

      // Call the controller method
      await controller.getScanHistory(mockContext);

      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.include({
        success: false,
        error: 'Test error',
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(500);
    });
  });

  describe('getScanById', () => {
    it('should return a scan by ID', async () => {
      // Mock data
      const mockScan = { id: 'scan-1', target: 'https://example.com' };

      // Stub the scannerService.getScanById method
      sinon.stub(scannerService, 'getScanById').returns(mockScan);

      // Mock Hono context
      const mockContext = {
        req: {
          param: sinon.stub().returns({ id: 'scan-1' }),
        },
        json: sinon.spy(),
      };

      // Call the controller method
      await controller.getScanById(mockContext);

      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.include({
        success: true,
        scan: mockScan,
      });
    });

    it('should handle not found errors', async () => {
      // Stub the scannerService.getScanById method to return null
      sinon.stub(scannerService, 'getScanById').throws(new Error('Scan with ID scan-1 not found'));

      // Mock Hono context
      const mockContext = {
        req: {
          param: sinon.stub().returns({ id: 'scan-1' }),
        },
        json: sinon.spy(),
      };

      // Call the controller method
      await controller.getScanById(mockContext);

      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.include({
        success: false,
        error: 'Scan with ID scan-1 not found',
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(500);
    });
  });

  describe('scanTarget', () => {
    it('should perform a security scan', async () => {
      // Mock data
      const mockScanResult = {
        id: 'scan-1',
        target: 'https://example.com',
        summary: { total: 3 },
      };

      // Stub the scannerService.scanTarget method
      sinon.stub(scannerService, 'scanTarget').resolves(mockScanResult);

      // Mock Hono context
      const mockContext = {
        req: {
          json: sinon.stub().resolves({
            target: 'https://example.com',
            tools: ['nikto', 'nuclei'],
          }),
        },
        json: sinon.spy(),
      };

      // Call the controller method
      await controller.scanTarget(mockContext);

      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.include({
        success: true,
        message: 'Scan completed successfully',
        scanId: 'scan-1',
      });
    });

    it('should handle missing target', async () => {
      // Mock Hono context
      const mockContext = {
        req: {
          json: sinon.stub().resolves({
            // No target provided
            tools: ['nikto', 'nuclei'],
          }),
        },
        json: sinon.spy(),
      };

      // Call the controller method
      await controller.scanTarget(mockContext);

      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.include({
        success: false,
        error: 'Missing required parameter: target',
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(400);
    });
  });
});
