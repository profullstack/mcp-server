/**
 * Fake JSON Module Utilities
 *
 * This file contains utility functions for the fake_json module.
 */

import { logger } from '../../../src/utils/logger.js';

/**
 * Create a system prompt for the AI to generate JSON
 * @param {string} endpoint - The endpoint path
 * @param {string} fields - Optional comma-separated list of fields to include
 * @returns {string} System prompt
 */
export function createSystemPrompt(endpoint, fields) {
  let prompt = `You are a creative AI assistant that generates JSON responses for any endpoint. Your responses must be in well-structured JSON format with the least fields possible. The user is requesting information for the endpoint: ${endpoint}.`;

  if (fields) {
    prompt += ` Please include only the following fields in your response: ${fields}.`;
  }

  prompt += ` Generate a creative JSON response for the endpoint: ${endpoint}`;

  return prompt;
}

/**
 * Parse the AI response to ensure it's valid JSON
 * @param {string} response - The AI response
 * @returns {Object} Parsed JSON object
 */
export function parseJsonResponse(response) {
  try {
    // Try to parse the response as JSON
    return JSON.parse(response);
  } catch (error) {
    logger.error(`Error parsing AI JSON response: ${error.message}`);

    // Try to extract JSON from the response if it contains markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (innerError) {
        logger.error(`Error parsing extracted JSON: ${innerError.message}`);
      }
    }

    // Fallback if AI response is not valid JSON
    return {
      error: 'AI response was not valid JSON.',
      originalResponse: response,
      details: 'The AI failed to generate a correctly formatted JSON object.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Format error response
 * @param {Error} error - Error object
 * @param {string} endpoint - The endpoint path
 * @returns {Object} Formatted error response
 */
export function formatErrorResponse(error, endpoint) {
  return {
    error: error.message || 'An unexpected error occurred.',
    endpoint,
    timestamp: new Date().toISOString(),
  };
}
