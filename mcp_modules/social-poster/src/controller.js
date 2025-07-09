/**
 * Controller Layer
 * Handles MCP endpoint requests and coordinates with the service layer
 */

import {
  validateParameters,
  createErrorResponse,
  createSuccessResponse,
  createToolErrorResponse,
  validateContentStructure,
  validatePlatformsArray,
  sanitizeContent,
} from './utils.js';

/**
 * Create a controller function for posting content
 * @param {SocialPostingService} service - Service instance
 * @returns {Function} Controller function
 */
export function postContent(service) {
  return async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.content) {
        return c.json(createErrorResponse('Missing required parameter: content'), 400);
      }

      // Validate content structure
      if (typeof params.content !== 'object') {
        return c.json(createErrorResponse('Content must be an object'), 400);
      }

      const contentValidation = validateContentStructure(params.content);
      if (!contentValidation.valid) {
        return c.json(createErrorResponse(contentValidation.errors.join(', ')), 400);
      }

      // Validate platforms if provided
      if (params.platforms !== undefined) {
        const platformsValidation = validatePlatformsArray(params.platforms);
        if (!platformsValidation.valid) {
          return c.json(createErrorResponse(platformsValidation.errors.join(', ')), 400);
        }
      }

      // Sanitize content
      const sanitizedContent = sanitizeContent(params.content);

      // Call service to post content
      const result = await service.postContent(sanitizedContent, params.platforms);

      return c.json(createSuccessResponse(result, 'social-post'));
    } catch (error) {
      return c.json(createErrorResponse(error.message), 500);
    }
  };
}

/**
 * Create a controller function for platform login
 * @param {SocialPostingService} service - Service instance
 * @returns {Function} Controller function
 */
export function loginToPlatform(service) {
  return async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.platform) {
        return c.json(createErrorResponse('Missing required parameter: platform'), 400);
      }

      if (typeof params.platform !== 'string') {
        return c.json(createErrorResponse('Platform must be a string'), 400);
      }

      // Validate options if provided
      if (params.options !== undefined && typeof params.options !== 'object') {
        return c.json(createErrorResponse('Options must be an object'), 400);
      }

      // Call service to login
      const result = await service.loginToPlatform(params.platform, params.options || {});

      return c.json(createSuccessResponse(result, 'social-login'));
    } catch (error) {
      return c.json(createErrorResponse(error.message), 500);
    }
  };
}

/**
 * Create a controller function for getting platform status
 * @param {SocialPostingService} service - Service instance
 * @returns {Function} Controller function
 */
export function getPlatformStatus(service) {
  return async c => {
    try {
      const result = await service.getPlatformStatus();
      return c.json(createSuccessResponse(result, 'social-status'));
    } catch (error) {
      return c.json(createErrorResponse(error.message), 500);
    }
  };
}

/**
 * Create a controller function for getting available platforms
 * @param {SocialPostingService} service - Service instance
 * @returns {Function} Controller function
 */
export function getAvailablePlatforms(service) {
  return async c => {
    try {
      const platforms = service.getAvailablePlatforms();
      const result = {
        platforms,
        count: platforms.length,
      };
      return c.json(createSuccessResponse(result, 'social-platforms'));
    } catch (error) {
      return c.json(createErrorResponse(error.message), 500);
    }
  };
}

/**
 * Create a controller function for getting supported platforms info
 * @param {SocialPostingService} service - Service instance
 * @returns {Function} Controller function
 */
export function getSupportedPlatforms(service) {
  return async c => {
    try {
      const platforms = service.getSupportedPlatforms();
      const result = {
        platforms,
        count: platforms.length,
      };
      return c.json(createSuccessResponse(result, 'social-supported-platforms'));
    } catch (error) {
      return c.json(createErrorResponse(error.message), 500);
    }
  };
}

/**
 * Create a controller function for creating sample content
 * @param {SocialPostingService} service - Service instance
 * @returns {Function} Controller function
 */
export function createSampleContent(service) {
  return async c => {
    try {
      const params = await c.req.json();
      const type = params.type || 'text';

      if (typeof type !== 'string') {
        return c.json(createErrorResponse('Type must be a string'), 400);
      }

      const sampleContent = service.createSampleContent(type);
      return c.json(createSuccessResponse(sampleContent, 'social-sample-content'));
    } catch (error) {
      return c.json(createErrorResponse(error.message), 500);
    }
  };
}

/**
 * Create a controller function for getting posting statistics
 * @param {SocialPostingService} service - Service instance
 * @returns {Function} Controller function
 */
export function getPostingStats(service) {
  return async c => {
    try {
      const params = await c.req.json();

      if (!params.result) {
        return c.json(createErrorResponse('Missing required parameter: result'), 400);
      }

      if (typeof params.result !== 'object') {
        return c.json(createErrorResponse('Result must be an object'), 400);
      }

      const stats = service.getPostingStats(params.result);
      return c.json(createSuccessResponse(stats, 'social-posting-stats'));
    } catch (error) {
      return c.json(createErrorResponse(error.message), 500);
    }
  };
}

/**
 * Create a controller function for validating content
 * @param {SocialPostingService} service - Service instance
 * @returns {Function} Controller function
 */
export function validateContent(service) {
  return async c => {
    try {
      const params = await c.req.json();

      if (!params.content) {
        return c.json(createErrorResponse('Missing required parameter: content'), 400);
      }

      const validation = service.validateContent(params.content);
      return c.json(createSuccessResponse(validation, 'social-validate-content'));
    } catch (error) {
      return c.json(createErrorResponse(error.message), 500);
    }
  };
}

/**
 * Create a controller function for getting module info
 * @param {SocialPostingService} service - Service instance
 * @returns {Function} Controller function
 */
export function getModuleInfo(service) {
  return async c => {
    try {
      const moduleInfo = {
        name: 'Social Poster MCP Module',
        version: '1.0.0',
        description: 'MCP module for social media posting using @profullstack/social-poster',
        author: 'Profullstack, Inc.',
        supportedPlatforms: service.getSupportedPlatforms().map(p => p.id),
        tools: [
          'social-post',
          'social-login',
          'social-status',
          'social-platforms',
          'social-supported-platforms',
          'social-sample-content',
          'social-posting-stats',
          'social-validate-content',
        ],
      };

      return c.json(createSuccessResponse(moduleInfo, 'social-module-info'));
    } catch (error) {
      return c.json(createErrorResponse(error.message), 500);
    }
  };
}

/**
 * Create all controller functions for a service instance
 * @param {SocialPostingService} service - Service instance
 * @returns {object} Object containing all controller functions
 */
export function createControllers(service) {
  return {
    postContent: postContent(service),
    loginToPlatform: loginToPlatform(service),
    getPlatformStatus: getPlatformStatus(service),
    getAvailablePlatforms: getAvailablePlatforms(service),
    getSupportedPlatforms: getSupportedPlatforms(service),
    createSampleContent: createSampleContent(service),
    getPostingStats: getPostingStats(service),
    validateContent: validateContent(service),
    getModuleInfo: getModuleInfo(service),
  };
}

/**
 * Create parameter validation middleware
 * @param {string[]} required - Required parameters
 * @param {object} [types] - Parameter types
 * @returns {Function} Middleware function
 */
export function createValidationMiddleware(required = [], types = {}) {
  return async (c, next) => {
    try {
      const params = await c.req.json();
      const validation = validateParameters(params, required, types);

      if (!validation.valid) {
        return c.json(createErrorResponse(validation.errors.join(', ')), 400);
      }

      // Store validated params in context for use by controller
      c.set('validatedParams', params);
      await next();
    } catch (error) {
      return c.json(createErrorResponse(`Parameter validation failed: ${error.message}`), 400);
    }
  };
}

/**
 * Create error handling middleware
 * @returns {Function} Error handling middleware
 */
export function createErrorHandler() {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Controller error:', error);
      return c.json(createErrorResponse(`Internal server error: ${error.message}`), 500);
    }
  };
}
