/**
 * Controller Layer Tests
 * Tests for MCP endpoints and request handling
 */

import { expect } from 'chai';
import sinon from 'sinon';
import {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  processItem,
} from '../src/controller.js';

describe('Controller Functions', () => {
  let mockService;
  let mockContext;

  beforeEach(() => {
    // Mock the service layer
    mockService = createMockService();

    // Mock Hono context
    mockContext = createMockContext();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getAllItems', () => {
    it('should return all items', async () => {
      const mockItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      mockService.getAllItems.returns(mockItems);

      const controller = getAllItems(mockService);
      await controller(mockContext);

      expect(mockService.getAllItems).to.have.been.called;
      expect(mockContext.json).to.have.been.calledWith({
        items: mockItems,
        count: mockItems.length,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockService.getAllItems.throws(error);

      const controller = getAllItems(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Service error' }, 500);
    });
  });

  describe('getItemById', () => {
    it('should return item when found', async () => {
      const mockItem = { id: '1', name: 'Test Item' };
      mockContext.req.param = sinon.stub().returns('1');
      mockService.getItemById.returns(mockItem);

      const controller = getItemById(mockService);
      await controller(mockContext);

      expect(mockService.getItemById).to.have.been.calledWith('1');
      expect(mockContext.json).to.have.been.calledWith(mockItem);
    });

    it('should return 404 when item not found', async () => {
      mockContext.req.param = sinon.stub().returns('999');
      mockService.getItemById.returns(null);

      const controller = getItemById(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Item not found' }, 404);
    });
  });

  describe('createItem', () => {
    it('should create item with valid data', async () => {
      const requestData = { name: 'New Item', description: 'A new item' };
      const createdItem = { id: '1', ...requestData, createdAt: new Date() };

      mockContext.req.json.resolves(requestData);
      mockService.createItem.returns(createdItem);

      const controller = createItem(mockService);
      await controller(mockContext);

      expect(mockService.createItem).to.have.been.calledWith(requestData);
      expect(mockContext.json).to.have.been.calledWith(createdItem, 201);
    });

    it('should handle missing request body', async () => {
      mockContext.req.json.resolves(null);

      const controller = createItem(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Request body is required' }, 400);
    });

    it('should handle JSON parsing errors', async () => {
      const error = new Error('Invalid JSON');
      mockContext.req.json.rejects(error);

      const controller = createItem(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Invalid JSON' }, 500);
    });
  });

  describe('updateItem', () => {
    it('should update existing item', async () => {
      const requestData = { name: 'Updated Item' };
      const updatedItem = { id: '1', ...requestData, updatedAt: new Date() };

      mockContext.req.param = sinon.stub().returns('1');
      mockContext.req.json.resolves(requestData);
      mockService.updateItem.returns(updatedItem);

      const controller = updateItem(mockService);
      await controller(mockContext);

      expect(mockService.updateItem).to.have.been.calledWith('1', requestData);
      expect(mockContext.json).to.have.been.calledWith(updatedItem);
    });

    it('should return 404 for non-existent item', async () => {
      const requestData = { name: 'Updated Item' };

      mockContext.req.param = sinon.stub().returns('999');
      mockContext.req.json.resolves(requestData);
      mockService.updateItem.returns(null);

      const controller = updateItem(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Item not found' }, 404);
    });
  });

  describe('deleteItem', () => {
    it('should delete existing item', async () => {
      mockContext.req.param = sinon.stub().returns('1');
      mockService.deleteItem.returns(true);

      const controller = deleteItem(mockService);
      await controller(mockContext);

      expect(mockService.deleteItem).to.have.been.calledWith('1');
      expect(mockContext.json).to.have.been.calledWith({ message: 'Item deleted successfully' });
    });

    it('should return 404 for non-existent item', async () => {
      mockContext.req.param = sinon.stub().returns('999');
      mockService.deleteItem.returns(false);

      const controller = deleteItem(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Item not found' }, 404);
    });
  });

  describe('processItem', () => {
    it('should process existing item', async () => {
      const processedItem = { id: '1', processed: true, processedAt: new Date() };

      mockContext.req.param = sinon.stub().returns('1');
      mockService.processItem.resolves(processedItem);

      const controller = processItem(mockService);
      await controller(mockContext);

      expect(mockService.processItem).to.have.been.calledWith('1');
      expect(mockContext.json).to.have.been.calledWith(processedItem);
    });

    it('should return 404 for non-existent item', async () => {
      mockContext.req.param = sinon.stub().returns('999');
      mockService.processItem.resolves(null);

      const controller = processItem(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Item not found' }, 404);
    });

    it('should handle processing errors', async () => {
      const error = new Error('Processing failed');

      mockContext.req.param = sinon.stub().returns('1');
      mockService.processItem.rejects(error);

      const controller = processItem(mockService);
      await controller(mockContext);

      expect(mockContext.json).to.have.been.calledWith({ error: 'Processing failed' }, 500);
    });
  });
});

describe('Controller Error Handling', () => {
  let mockService;
  let mockContext;

  beforeEach(() => {
    mockService = createMockService();
    mockContext = createMockContext();
  });

  it('should handle unexpected errors gracefully', async () => {
    const error = new Error('Unexpected error');
    mockService.getAllItems.throws(error);

    const controller = getAllItems(mockService);
    await controller(mockContext);

    expect(mockContext.json).to.have.been.calledWith({ error: 'Unexpected error' }, 500);
  });

  it('should handle missing parameters', async () => {
    mockContext.req.param = sinon.stub().returns(undefined);

    const controller = getItemById(mockService);
    await controller(mockContext);

    expect(mockContext.json).to.have.been.calledWith({ error: 'Item ID is required' }, 400);
  });
});
