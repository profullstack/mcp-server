/**
 * Template Module Controller
 *
 * This file contains the route handlers for the template module.
 */

import { templateService } from './service.js';

/**
 * Get all items
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getAllItems(c) {
  try {
    const items = templateService.getAllItems();
    return c.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Get item by ID
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getItemById(c) {
  try {
    const { id } = c.req.param();
    const item = templateService.getItemById(id);

    if (!item) {
      return c.json(
        {
          success: false,
          error: `Item with ID ${id} not found`,
        },
        404
      );
    }

    return c.json(templateService.formatItemResponse(item));
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Create a new item
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function createItem(c) {
  try {
    const data = await c.req.json();
    const item = templateService.createItem(data);

    return c.json(
      {
        success: true,
        message: 'Item created successfully',
        item,
      },
      201
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      400
    );
  }
}

/**
 * Update an existing item
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function updateItem(c) {
  try {
    const { id } = c.req.param();
    const data = await c.req.json();
    const item = templateService.updateItem(id, data);

    return c.json({
      success: true,
      message: 'Item updated successfully',
      item,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      error.message.includes('not found') ? 404 : 400
    );
  }
}

/**
 * Delete an item
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function deleteItem(c) {
  try {
    const { id } = c.req.param();
    const deleted = templateService.deleteItem(id);

    if (!deleted) {
      return c.json(
        {
          success: false,
          error: `Item with ID ${id} not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}

/**
 * Process an item
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function processItem(c) {
  try {
    const { id } = c.req.param();
    const processedItem = await templateService.processItem(id);

    return c.json({
      success: true,
      message: 'Item processed successfully',
      item: processedItem,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      error.message.includes('not found') ? 404 : 500
    );
  }
}
