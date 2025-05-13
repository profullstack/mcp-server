/**
 * Mock Fetch Utility for Testing
 *
 * This file provides a mock implementation of the fetch function for testing Hono apps.
 */

/**
 * Creates a mock fetch function for testing Hono apps
 * @param {import('hono').Hono} app - The Hono app instance
 * @returns {Object} An object with methods for making requests
 */
export function createMockFetch(app) {
  return {
    /**
     * Make a GET request
     * @param {string} path - The path to request
     * @param {Object} headers - Optional headers
     * @returns {Promise<Object>} The response
     */
    async get(path, headers = {}) {
      const request = new Request(`http://localhost${path}`, {
        method: 'GET',
        headers,
      });

      const response = await app.fetch(request);
      const body = await response.json();

      return {
        status: response.status,
        body,
        headers: Object.fromEntries(response.headers.entries()),
      };
    },

    /**
     * Make a POST request
     * @param {string} path - The path to request
     * @param {Object} data - The data to send
     * @param {Object} headers - Optional headers
     * @returns {Promise<Object>} The response
     */
    async post(path, data = {}, headers = {}) {
      const request = new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
      });

      const response = await app.fetch(request);
      const responseHeaders = Object.fromEntries(response.headers.entries());

      // Check if this is a streaming response (SSE)
      if (responseHeaders['content-type']?.includes('text/event-stream')) {
        const text = await response.text();
        return {
          status: response.status,
          body: text, // Return the raw text for streaming responses
          headers: responseHeaders,
          isStreaming: true,
        };
      }

      // Regular JSON response
      const body = await response.json();

      return {
        status: response.status,
        body,
        headers: responseHeaders,
      };
    },

    /**
     * Make a PUT request
     * @param {string} path - The path to request
     * @param {Object} data - The data to send
     * @param {Object} headers - Optional headers
     * @returns {Promise<Object>} The response
     */
    async put(path, data = {}, headers = {}) {
      const request = new Request(`http://localhost${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
      });

      const response = await app.fetch(request);
      const body = await response.json();

      return {
        status: response.status,
        body,
        headers: Object.fromEntries(response.headers.entries()),
      };
    },

    /**
     * Make a DELETE request
     * @param {string} path - The path to request
     * @param {Object} headers - Optional headers
     * @returns {Promise<Object>} The response
     */
    async delete(path, headers = {}) {
      const request = new Request(`http://localhost${path}`, {
        method: 'DELETE',
        headers,
      });

      const response = await app.fetch(request);
      const body = await response.json();

      return {
        status: response.status,
        body,
        headers: Object.fromEntries(response.headers.entries()),
      };
    },
  };
}
