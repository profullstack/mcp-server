/**
 * Template Module Utilities
 * 
 * This file contains utility functions for the template module.
 */

/**
 * Example utility function
 * @param {string} input - Input string
 * @returns {string} Processed string
 */
export function processString(input) {
  return `Processed: ${input}`;
}

/**
 * Example async utility function
 * @param {number} delay - Delay in milliseconds
 * @returns {Promise<string>} Result after delay
 */
export async function delayedResponse(delay = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`Response after ${delay}ms`);
    }, delay);
  });
}

/**
 * Example data validation function
 * @param {Object} data - Data to validate
 * @returns {boolean} Whether the data is valid
 */
export function validateData(data) {
  if (!data) return false;
  if (typeof data !== 'object') return false;
  if (!data.id) return false;
  
  return true;
}

/**
 * Format response object
 * @param {Object} data - Data to format
 * @returns {Object} Formatted response
 */
export function formatResponse(data) {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    data
  };
}