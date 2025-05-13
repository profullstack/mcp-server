/**
 * Template Module Controller Tests
 * 
 * This file contains tests for the template module controller using Mocha and Chai.
 */

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';

// Import the controller functions
import * as controller from '../src/controller.js';
import { templateService } from '../src/service.js';

describe('Template Controller', () => {
  // Mock Hono context
  let mockContext;
  
  // Sinon sandbox for managing stubs
  let sandbox;
  
  beforeEach(() => {
    // Create a new sandbox before each test
    sandbox = sinon.createSandbox();
    
    // Create a mock context object that mimics Hono's context
    mockContext = {
      json: sandbox.stub().returnsThis(),
      req: {
        param: sandbox.stub().returns({}),
        json: sandbox.stub().resolves({})
      }
    };
  });
  
  afterEach(() => {
    // Restore all stubs after each test
    sandbox.restore();
  });
  
  describe('getAllItems()', () => {
    it('should return all items with success status', async () => {
      // Stub the service method
      const items = [{ id: 'test1', name: 'Test 1' }, { id: 'test2', name: 'Test 2' }];
      sandbox.stub(templateService, 'getAllItems').returns(items);
      
      // Call the controller method
      await controller.getAllItems(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: true,
        count: 2,
        items
      });
    });
    
    it('should handle errors and return error response', async () => {
      // Stub the service method to throw an error
      const error = new Error('Test error');
      sandbox.stub(templateService, 'getAllItems').throws(error);
      
      // Call the controller method
      await controller.getAllItems(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: false,
        error: 'Test error'
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(500);
    });
  });
  
  describe('getItemById()', () => {
    it('should return the item when it exists', async () => {
      // Set up the request parameter
      mockContext.req.param.returns({ id: 'test1' });
      
      // Stub the service methods
      const item = { id: 'test1', name: 'Test 1' };
      const formattedResponse = { success: true, data: item, timestamp: '2025-05-12T14:30:00.000Z' };
      
      sandbox.stub(templateService, 'getItemById').returns(item);
      sandbox.stub(templateService, 'formatItemResponse').returns(formattedResponse);
      
      // Call the controller method
      await controller.getItemById(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal(formattedResponse);
    });
    
    it('should return 404 when item does not exist', async () => {
      // Set up the request parameter
      mockContext.req.param.returns({ id: 'nonexistent' });
      
      // Stub the service method to return null
      sandbox.stub(templateService, 'getItemById').returns(null);
      
      // Call the controller method
      await controller.getItemById(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: false,
        error: 'Item with ID nonexistent not found'
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(404);
    });
    
    it('should handle errors and return error response', async () => {
      // Set up the request parameter
      mockContext.req.param.returns({ id: 'test1' });
      
      // Stub the service method to throw an error
      const error = new Error('Test error');
      sandbox.stub(templateService, 'getItemById').throws(error);
      
      // Call the controller method
      await controller.getItemById(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: false,
        error: 'Test error'
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(500);
    });
  });
  
  describe('createItem()', () => {
    it('should create an item and return success response', async () => {
      // Set up the request body
      const requestBody = { id: 'test1', name: 'Test 1' };
      mockContext.req.json.resolves(requestBody);
      
      // Stub the service method
      const createdItem = { ...requestBody, createdAt: '2025-05-12T14:30:00.000Z' };
      sandbox.stub(templateService, 'createItem').returns(createdItem);
      
      // Call the controller method
      await controller.createItem(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: true,
        message: 'Item created successfully',
        item: createdItem
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(201);
    });
    
    it('should handle validation errors and return 400 response', async () => {
      // Set up the request body
      const requestBody = { name: 'Missing ID' };
      mockContext.req.json.resolves(requestBody);
      
      // Stub the service method to throw an error
      const error = new Error('Invalid item data');
      sandbox.stub(templateService, 'createItem').throws(error);
      
      // Call the controller method
      await controller.createItem(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: false,
        error: 'Invalid item data'
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(400);
    });
  });
  
  describe('updateItem()', () => {
    it('should update an item and return success response', async () => {
      // Set up the request parameter and body
      mockContext.req.param.returns({ id: 'test1' });
      const requestBody = { name: 'Updated Name' };
      mockContext.req.json.resolves(requestBody);
      
      // Stub the service method
      const updatedItem = { 
        id: 'test1', 
        name: 'Updated Name', 
        createdAt: '2025-05-12T14:30:00.000Z',
        updatedAt: '2025-05-12T14:35:00.000Z'
      };
      sandbox.stub(templateService, 'updateItem').returns(updatedItem);
      
      // Call the controller method
      await controller.updateItem(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: true,
        message: 'Item updated successfully',
        item: updatedItem
      });
    });
    
    it('should return 404 when item does not exist', async () => {
      // Set up the request parameter and body
      mockContext.req.param.returns({ id: 'nonexistent' });
      const requestBody = { name: 'Updated Name' };
      mockContext.req.json.resolves(requestBody);
      
      // Stub the service method to throw an error
      const error = new Error('Item with ID nonexistent not found');
      sandbox.stub(templateService, 'updateItem').throws(error);
      
      // Call the controller method
      await controller.updateItem(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: false,
        error: 'Item with ID nonexistent not found'
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(404);
    });
  });
  
  describe('deleteItem()', () => {
    it('should delete an item and return success response', async () => {
      // Set up the request parameter
      mockContext.req.param.returns({ id: 'test1' });
      
      // Stub the service method
      sandbox.stub(templateService, 'deleteItem').returns(true);
      
      // Call the controller method
      await controller.deleteItem(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: true,
        message: 'Item deleted successfully'
      });
    });
    
    it('should return 404 when item does not exist', async () => {
      // Set up the request parameter
      mockContext.req.param.returns({ id: 'nonexistent' });
      
      // Stub the service method to return false
      sandbox.stub(templateService, 'deleteItem').returns(false);
      
      // Call the controller method
      await controller.deleteItem(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: false,
        error: 'Item with ID nonexistent not found'
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(404);
    });
  });
  
  describe('processItem()', () => {
    it('should process an item and return success response', async () => {
      // Set up the request parameter
      mockContext.req.param.returns({ id: 'test1' });
      
      // Stub the service method
      const processedItem = { 
        id: 'test1', 
        name: 'Test 1',
        processed: true,
        processedAt: '2025-05-12T14:40:00.000Z',
        result: 'Processed: test1'
      };
      sandbox.stub(templateService, 'processItem').resolves(processedItem);
      
      // Call the controller method
      await controller.processItem(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: true,
        message: 'Item processed successfully',
        item: processedItem
      });
    });
    
    it('should return 404 when item does not exist', async () => {
      // Set up the request parameter
      mockContext.req.param.returns({ id: 'nonexistent' });
      
      // Stub the service method to throw an error
      const error = new Error('Item with ID nonexistent not found');
      sandbox.stub(templateService, 'processItem').rejects(error);
      
      // Call the controller method
      await controller.processItem(mockContext);
      
      // Verify the response
      expect(mockContext.json.calledOnce).to.be.true;
      expect(mockContext.json.firstCall.args[0]).to.deep.equal({
        success: false,
        error: 'Item with ID nonexistent not found'
      });
      expect(mockContext.json.firstCall.args[1]).to.equal(404);
    });
  });
});