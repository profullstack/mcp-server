/**
 * Template Module Service
 *
 * This file contains the main business logic for the template module.
 */

import { processString, delayedResponse, validateData, formatResponse } from './utils.js';

/**
 * Example service class for the template module
 */
export class TemplateService {
  constructor() {
    this.items = new Map();
  }

  /**
   * Get all items
   * @returns {Array} Array of items
   */
  getAllItems() {
    return Array.from(this.items.values());
  }

  /**
   * Get item by ID
   * @param {string} id - Item ID
   * @returns {Object|null} Item or null if not found
   */
  getItemById(id) {
    return this.items.has(id) ? this.items.get(id) : null;
  }

  /**
   * Create a new item
   * @param {Object} data - Item data
   * @returns {Object} Created item
   */
  createItem(data) {
    if (!validateData(data)) {
      throw new Error('Invalid item data');
    }

    const id = data.id;
    if (this.items.has(id)) {
      throw new Error(`Item with ID ${id} already exists`);
    }

    const item = {
      ...data,
      createdAt: new Date().toISOString(),
    };

    this.items.set(id, item);
    return item;
  }

  /**
   * Update an existing item
   * @param {string} id - Item ID
   * @param {Object} data - Updated item data
   * @returns {Object} Updated item
   */
  updateItem(id, data) {
    if (!this.items.has(id)) {
      throw new Error(`Item with ID ${id} not found`);
    }

    const existingItem = this.items.get(id);
    const updatedItem = {
      ...existingItem,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.items.set(id, updatedItem);
    return updatedItem;
  }

  /**
   * Delete an item
   * @param {string} id - Item ID
   * @returns {boolean} Whether the item was deleted
   */
  deleteItem(id) {
    if (!this.items.has(id)) {
      return false;
    }

    return this.items.delete(id);
  }

  /**
   * Process an item
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Processed item
   */
  async processItem(id) {
    const item = this.getItemById(id);
    if (!item) {
      throw new Error(`Item with ID ${id} not found`);
    }

    // Simulate processing delay
    await delayedResponse(500);

    const processedItem = {
      ...item,
      processed: true,
      processedAt: new Date().toISOString(),
      result: processString(item.id),
    };

    this.items.set(id, processedItem);
    return processedItem;
  }

  /**
   * Format the response for an item
   * @param {Object} item - Item to format
   * @returns {Object} Formatted response
   */
  formatItemResponse(item) {
    return formatResponse(item);
  }
}

// Export a singleton instance
export const templateService = new TemplateService();
