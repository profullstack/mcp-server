/**
 * Social Posting Service
 * Wrapper service for the @profullstack/social-poster library
 * Provides a clean interface for MCP integration
 */

/* SocialPoster will be dynamically imported at runtime to avoid init-side effects */

/**
 * Social Posting Service class
 * Wraps the SocialPoster functionality for MCP integration
 */
export class SocialPostingService {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      configPath: null,
      sessionsPath: null,
      ...options,
    };

    // Defer SocialPoster import/instantiation to runtime to avoid env coupling
    this.socialPoster = options.socialPoster || null;
  }

  /**
   * Ensure SocialPoster instance exists (lazy dynamic import)
   * @returns {Promise<any>} SocialPoster instance
   */
  async ensurePoster() {
    if (!this.socialPoster) {
      try {
        const mod = await import('@profullstack/social-poster');
        const SocialPoster = mod.SocialPoster ?? mod.default?.SocialPoster ?? mod.default;
        this.socialPoster = this.options.socialPoster || new SocialPoster(this.options);
      } catch (error) {
        const msg = error?.message || String(error);
        if (msg.includes('loadConfig is not defined')) {
          throw new Error(
            'social-poster dependency initialization failed: loadConfig is not defined. ' +
              'Ensure @profullstack/social-poster is up to date and SOCIAL_POSTER_* environment variables are configured.'
          );
        }
        throw error;
      }
    }
    return this.socialPoster;
  }

  /**
   * Validate post content
   * @param {object} content - Content to validate
   * @returns {object} Validation result with valid flag and errors array
   */
  validateContent(content) {
    const errors = [];

    if (!content || typeof content !== 'object') {
      errors.push('Content must be an object');
      return { valid: false, errors };
    }

    if (!content.text && !content.link) {
      errors.push('Content must have either text or link');
    }

    if (content.text && typeof content.text !== 'string') {
      errors.push('Text must be a string');
    }

    if (content.link) {
      try {
        new URL(content.link);
      } catch {
        errors.push('Link must be a valid URL');
      }
    }

    if (content.text && content.text.length > 280) {
      errors.push('Text is too long for some platforms (maximum 280 characters recommended)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Post content to social media platforms
   * @param {object} content - Content to post
   * @param {string[]} [platforms] - Target platforms (optional)
   * @returns {Promise<object>} Post result
   */
  async postContent(content, platforms = null) {
    try {
      // Validate content first
      const validation = this.validateContent(content);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid content: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString(),
        };
      }

      // Post using the social poster
      const poster = await this.ensurePoster();
      const result = await poster.post(content, platforms);

      return {
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Login to a specific platform
   * @param {string} platform - Platform name
   * @param {object} [options] - Login options
   * @returns {Promise<object>} Login result
   */
  async loginToPlatform(platform, options = {}) {
    try {
      const poster = await this.ensurePoster();
      const success = await poster.login(platform, options);

      return {
        success,
        platform,
        error: success ? null : 'Login failed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get authentication status for all platforms
   * @returns {Promise<object>} Platform status object
   */
  async getPlatformStatus() {
    try {
      const poster = await this.ensurePoster();
      return poster.getAuthStatus();
    } catch (error) {
      throw new Error(`Failed to get platform status: ${error.message}`);
    }
  }

  /**
   * Get available platforms for posting
   * @returns {string[]} Array of available platform names
   */
  async getAvailablePlatforms() {
    try {
      const poster = await this.ensurePoster();
      return poster.getAvailablePlatforms();
    } catch (error) {
      throw new Error(`Failed to get available platforms: ${error.message}`);
    }
  }

  /**
   * Create sample content for testing
   * @param {string} type - Type of sample content ('text' or 'link')
   * @returns {object} Sample content object
   */
  createSampleContent(type = 'text') {
    const samples = {
      text: {
        text: 'Hello from Social Poster MCP! 🚀 This is a test post to demonstrate multi-platform posting capabilities.',
        type: 'text',
      },
      link: {
        text: 'Check out this amazing MCP tool for social media automation! 🔥',
        link: 'https://github.com/profullstack/social-poster',
        type: 'link',
      },
    };

    return samples[type] || samples.text;
  }

  /**
   * Get posting statistics from a result object
   * @param {object} result - Post result object
   * @returns {object} Statistics summary
   */
  getPostingStats(result) {
    if (!result.results) {
      return {
        totalPlatforms: 0,
        successfulPosts: 0,
        failedPosts: 0,
        successRate: 0,
      };
    }

    const totalPlatforms = Object.keys(result.results).length;
    const successfulPosts = Object.values(result.results).filter(r => r.success).length;
    const failedPosts = totalPlatforms - successfulPosts;
    const successRate =
      totalPlatforms > 0 ? Math.round((successfulPosts / totalPlatforms) * 100) : 0;

    return {
      totalPlatforms,
      successfulPosts,
      failedPosts,
      successRate,
    };
  }

  /**
   * Close the social poster instance and clean up resources
   * @returns {Promise<void>}
   */
  async close() {
    try {
      await this.socialPoster.close();
    } catch (error) {
      console.error('Error closing social poster:', error.message);
    }
  }

  /**
   * Get supported platforms list
   * @returns {object[]} Array of platform objects with metadata
   */
  getSupportedPlatforms() {
    return [
      {
        id: 'x',
        name: 'X (Twitter)',
        description: 'Post to X (formerly Twitter)',
        maxTextLength: 280,
        supportsImages: true,
        supportsLinks: true,
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Post to LinkedIn professional network',
        maxTextLength: 3000,
        supportsImages: true,
        supportsLinks: true,
      },
      {
        id: 'reddit',
        name: 'Reddit',
        description: 'Post to Reddit communities',
        maxTextLength: 40000,
        supportsImages: true,
        supportsLinks: true,
      },
      {
        id: 'facebook',
        name: 'Facebook',
        description: 'Post to Facebook',
        maxTextLength: 63206,
        supportsImages: true,
        supportsLinks: true,
      },
      {
        id: 'hacker-news',
        name: 'Hacker News',
        description: 'Submit to Hacker News',
        maxTextLength: null,
        supportsImages: false,
        supportsLinks: true,
      },
      {
        id: 'stacker-news',
        name: 'Stacker News',
        description: 'Post to Stacker News',
        maxTextLength: null,
        supportsImages: false,
        supportsLinks: true,
      },
      {
        id: 'primal',
        name: 'Primal',
        description: 'Post to Primal (Nostr)',
        maxTextLength: null,
        supportsImages: true,
        supportsLinks: true,
      },
    ];
  }
}

// Export default instance for convenience
export const socialPostingService = new SocialPostingService();
