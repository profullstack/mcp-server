/**
 * Template Module Service Tests
 *
 * This file contains tests for the template module service using Mocha and Chai.
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

import { TemplateService } from '../src/service.js';

describe('TemplateService', () => {
  let service;

  beforeEach(() => {
    // Create a fresh service instance before each test
    service = new TemplateService();
  });

  describe('getAllItems()', () => {
    it('should return an empty array initially', () => {
      const items = service.getAllItems();
      expect(items).to.be.an('array').that.is.empty;
    });

    it('should return all items after adding some', () => {
      // Add some test items
      service.createItem({ id: 'test1', name: 'Test 1' });
      service.createItem({ id: 'test2', name: 'Test 2' });

      const items = service.getAllItems();
      expect(items).to.be.an('array').with.lengthOf(2);
      expect(items[0].id).to.equal('test1');
      expect(items[1].id).to.equal('test2');
    });
  });

  describe('getItemById()', () => {
    it('should return null for non-existent item', () => {
      const item = service.getItemById('nonexistent');
      expect(item).to.be.null;
    });

    it('should return the correct item when it exists', () => {
      // Add a test item
      service.createItem({ id: 'test1', name: 'Test 1' });

      const item = service.getItemById('test1');
      expect(item).to.be.an('object');
      expect(item.id).to.equal('test1');
      expect(item.name).to.equal('Test 1');
    });
  });

  describe('createItem()', () => {
    it('should add a new item with createdAt timestamp', () => {
      const newItem = service.createItem({ id: 'test1', name: 'Test 1' });

      expect(newItem).to.be.an('object');
      expect(newItem.id).to.equal('test1');
      expect(newItem.name).to.equal('Test 1');
      expect(newItem.createdAt).to.be.a('string');

      // Verify it was added to the items map
      expect(service.getItemById('test1')).to.deep.equal(newItem);
    });

    it('should throw an error if item data is invalid', () => {
      expect(() => service.createItem(null)).to.throw('Invalid item data');
      expect(() => service.createItem({})).to.throw('Invalid item data');
      expect(() => service.createItem({ name: 'No ID' })).to.throw('Invalid item data');
    });

    it('should throw an error if item with same ID already exists', () => {
      service.createItem({ id: 'test1', name: 'Test 1' });
      expect(() => service.createItem({ id: 'test1', name: 'Duplicate' })).to.throw(
        'Item with ID test1 already exists'
      );
    });
  });

  describe('updateItem()', () => {
    it('should update an existing item', () => {
      // Add a test item
      service.createItem({ id: 'test1', name: 'Test 1', value: 42 });

      // Update the item
      const updatedItem = service.updateItem('test1', { name: 'Updated Name' });

      expect(updatedItem.id).to.equal('test1');
      expect(updatedItem.name).to.equal('Updated Name');
      expect(updatedItem.value).to.equal(42); // Unchanged property
      expect(updatedItem.updatedAt).to.be.a('string');

      // Verify it was updated in the items map
      expect(service.getItemById('test1')).to.deep.equal(updatedItem);
    });

    it('should throw an error if item does not exist', () => {
      expect(() => service.updateItem('nonexistent', { name: 'New Name' })).to.throw(
        'Item with ID nonexistent not found'
      );
    });
  });

  describe('deleteItem()', () => {
    it('should delete an existing item', () => {
      // Add a test item
      service.createItem({ id: 'test1', name: 'Test 1' });

      // Delete the item
      const result = service.deleteItem('test1');

      expect(result).to.be.true;
      expect(service.getItemById('test1')).to.be.null;
    });

    it('should return false if item does not exist', () => {
      const result = service.deleteItem('nonexistent');
      expect(result).to.be.false;
    });
  });

  describe('processItem()', () => {
    it('should process an existing item', async () => {
      // Add a test item
      service.createItem({ id: 'test1', name: 'Test 1' });

      // Process the item
      const processedItem = await service.processItem('test1');

      expect(processedItem.id).to.equal('test1');
      expect(processedItem.processed).to.be.true;
      expect(processedItem.processedAt).to.be.a('string');
      expect(processedItem.result).to.equal('Processed: test1');
    });

    it('should throw an error if item does not exist', async () => {
      try {
        await service.processItem('nonexistent');
        // If we get here, the test should fail
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Item with ID nonexistent not found');
      }
    });

    it('should use the delayedResponse utility', async () => {
      // Add a test item
      service.createItem({ id: 'test1', name: 'Test 1' });

      // Create a spy to track when the promise resolves
      const startTime = Date.now();
      await service.processItem('test1');
      const endTime = Date.now();

      // Should take at least some time to process (due to delayedResponse)
      // Note: In a real test, you would mock the delayedResponse function
      // to avoid actual delays, but this is just for demonstration
      expect(endTime - startTime).to.be.at.least(100);
    });
  });

  describe('formatItemResponse()', () => {
    it('should format the response correctly', () => {
      const item = { id: 'test1', name: 'Test 1' };
      const formattedResponse = service.formatItemResponse(item);

      expect(formattedResponse).to.be.an('object');
      expect(formattedResponse.success).to.be.true;
      expect(formattedResponse.timestamp).to.be.a('string');
      expect(formattedResponse.data).to.deep.equal(item);
    });
  });
});
