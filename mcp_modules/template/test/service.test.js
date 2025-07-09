/**
 * Service Layer Tests
 * Tests for the template service functionality
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { templateService } from '../src/service.js';

describe('Template Service', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getAllItems', () => {
    it('should return all items', () => {
      const result = templateService.getAllItems();

      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(0); // Initially empty
    });
  });

  describe('getItemById', () => {
    it('should return null for non-existent item', () => {
      const result = templateService.getItemById('non-existent');

      expect(result).to.be.null;
    });

    it('should return item when it exists', () => {
      // First create an item
      const newItem = templateService.createItem({ name: 'Test Item' });

      // Then retrieve it
      const result = templateService.getItemById(newItem.id);

      expect(result).to.deep.equal(newItem);
    });
  });

  describe('createItem', () => {
    it('should create a new item with generated ID', () => {
      const itemData = { name: 'Test Item', description: 'A test item' };

      const result = templateService.createItem(itemData);

      expect(result).to.have.property('id');
      expect(result).to.have.property('name', itemData.name);
      expect(result).to.have.property('description', itemData.description);
      expect(result).to.have.property('createdAt');
    });

    it('should add item to the collection', () => {
      const itemData = { name: 'Test Item' };

      const initialCount = templateService.getAllItems().length;
      templateService.createItem(itemData);
      const finalCount = templateService.getAllItems().length;

      expect(finalCount).to.equal(initialCount + 1);
    });
  });

  describe('updateItem', () => {
    it('should return null for non-existent item', () => {
      const result = templateService.updateItem('non-existent', { name: 'Updated' });

      expect(result).to.be.null;
    });

    it('should update existing item', () => {
      // Create an item first
      const item = templateService.createItem({ name: 'Original' });

      // Update it
      const updateData = { name: 'Updated Name' };
      const result = templateService.updateItem(item.id, updateData);

      expect(result).to.have.property('id', item.id);
      expect(result).to.have.property('name', updateData.name);
      expect(result).to.have.property('updatedAt');
    });
  });

  describe('deleteItem', () => {
    it('should return false for non-existent item', () => {
      const result = templateService.deleteItem('non-existent');

      expect(result).to.be.false;
    });

    it('should delete existing item', () => {
      // Create an item first
      const item = templateService.createItem({ name: 'To Delete' });

      // Delete it
      const result = templateService.deleteItem(item.id);

      expect(result).to.be.true;

      // Verify it's gone
      const retrieved = templateService.getItemById(item.id);
      expect(retrieved).to.be.null;
    });
  });

  describe('processItem', () => {
    it('should return null for non-existent item', async () => {
      const result = await templateService.processItem('non-existent');

      expect(result).to.be.null;
    });

    it('should process existing item', async () => {
      // Create an item first
      const item = templateService.createItem({ name: 'To Process' });

      // Process it
      const result = await templateService.processItem(item.id);

      expect(result).to.have.property('id', item.id);
      expect(result).to.have.property('processed', true);
      expect(result).to.have.property('processedAt');
    });
  });

  describe('error handling', () => {
    it('should handle invalid input gracefully', () => {
      expect(() => templateService.createItem(null)).to.not.throw();
      expect(() => templateService.createItem(undefined)).to.not.throw();
      expect(() => templateService.updateItem('id', null)).to.not.throw();
    });
  });
});
