/**
 * Backlinks Module Controller
 *
 * This file contains the route handlers for the backlinks module.
 */

import { backlinksService } from './service.js';
import { backlinksDb } from './database.js';
import { validateEmailConfig } from './utils.js';

/**
 * Get all campaigns
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getAllCampaigns(c) {
  try {
    const campaigns = await backlinksService.getAllCampaigns();
    return c.json({
      success: true,
      count: campaigns.length,
      campaigns,
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
 * Get campaign by ID
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getCampaignById(c) {
  try {
    const { id } = c.req.param();
    const campaign = await backlinksService.getCampaign(id);

    if (!campaign) {
      return c.json(
        {
          success: false,
          error: `Campaign with ID ${id} not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      campaign,
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
 * Create a new campaign
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function createCampaign(c) {
  try {
    const data = await c.req.json();
    const campaign = await backlinksService.createCampaign(data);

    return c.json(
      {
        success: true,
        message: 'Campaign created successfully',
        campaign,
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
 * Update an existing campaign
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function updateCampaign(c) {
  try {
    const { id } = c.req.param();
    const data = await c.req.json();

    const campaign = await backlinksService.getCampaign(id);
    if (!campaign) {
      return c.json(
        {
          success: false,
          error: `Campaign with ID ${id} not found`,
        },
        404
      );
    }

    // Update campaign properties
    Object.assign(campaign, data, {
      updatedAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign,
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
 * Delete a campaign
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function deleteCampaign(c) {
  try {
    const { id } = c.req.param();
    const campaign = await backlinksService.getCampaign(id);

    if (!campaign) {
      return c.json(
        {
          success: false,
          error: `Campaign with ID ${id} not found`,
        },
        404
      );
    }

    // Clean up browser if needed
    await backlinksService.closeBrowser();

    // Delete campaign from database
    await backlinksDb.deleteCampaign(id);

    return c.json({
      success: true,
      message: 'Campaign deleted successfully',
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
 * Discover sites for a campaign
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function discoverSites(c) {
  try {
    const { id } = c.req.param();
    const options = await c.req.json().catch(() => ({}));

    const sites = await backlinksService.discoverSites(id, options);

    return c.json({
      success: true,
      message: 'Sites discovered successfully',
      count: sites.length,
      sites,
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

/**
 * Submit to a specific site
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function submitToSite(c) {
  try {
    const { id } = c.req.param();
    const { site_url, ...options } = await c.req.json();

    if (!site_url) {
      return c.json(
        {
          success: false,
          error: 'Missing required parameter: site_url',
        },
        400
      );
    }

    const submission = await backlinksService.submitToSite(id, site_url, options);

    return c.json({
      success: true,
      message: 'Submission completed',
      submission,
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

/**
 * Get campaign submissions
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getCampaignSubmissions(c) {
  try {
    const { id } = c.req.param();
    const submissions = await backlinksService.getCampaignSubmissions(id);

    return c.json({
      success: true,
      count: submissions.length,
      submissions,
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
 * Get submission by ID
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getSubmissionById(c) {
  try {
    const { submissionId } = c.req.param();
    const submission = await backlinksService.getSubmission(submissionId);

    if (!submission) {
      return c.json(
        {
          success: false,
          error: `Submission with ID ${submissionId} not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      submission,
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
 * Send follow-up emails
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function sendFollowUps(c) {
  try {
    const { id } = c.req.param();
    const emailConfig = await c.req.json();

    const validation = validateEmailConfig(emailConfig);
    if (!validation.valid) {
      return c.json(
        {
          success: false,
          error: validation.error,
        },
        400
      );
    }

    const results = await backlinksService.sendFollowUps(id, emailConfig);

    return c.json({
      success: true,
      message: 'Follow-up emails processed',
      provider: validation.provider,
      results,
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

/**
 * Get campaign analytics
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getCampaignAnalytics(c) {
  try {
    const { id } = c.req.param();
    const analytics = await backlinksService.getCampaignAnalytics(id);

    return c.json({
      success: true,
      analytics,
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

/**
 * Generate content for a site
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function generateContent(c) {
  try {
    const { id } = c.req.param();
    const { site_url, ...options } = await c.req.json();

    if (!site_url) {
      return c.json(
        {
          success: false,
          error: 'Missing required parameter: site_url',
        },
        400
      );
    }

    const campaign = await backlinksService.getCampaign(id);
    if (!campaign) {
      return c.json(
        {
          success: false,
          error: `Campaign with ID ${id} not found`,
        },
        404
      );
    }

    const site = campaign.discoveredSites.find(s => s.url === site_url);
    if (!site) {
      return c.json(
        {
          success: false,
          error: `Site ${site_url} not found in campaign`,
        },
        404
      );
    }

    const content = await backlinksService.generateContent(site, campaign, options);

    return c.json({
      success: true,
      message: 'Content generated successfully',
      content,
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
 * Batch submit to multiple sites
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function batchSubmit(c) {
  try {
    const { id } = c.req.param();
    const { site_urls, ...options } = await c.req.json();

    if (!site_urls || !Array.isArray(site_urls)) {
      return c.json(
        {
          success: false,
          error: 'Missing required parameter: site_urls (array)',
        },
        400
      );
    }

    const results = [];

    for (const siteUrl of site_urls) {
      try {
        const submission = await backlinksService.submitToSite(id, siteUrl, options);
        results.push({
          site_url: siteUrl,
          success: true,
          submission,
        });
      } catch (error) {
        results.push({
          site_url: siteUrl,
          success: false,
          error: error.message,
        });
      }

      // Add delay between submissions to avoid overwhelming sites
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return c.json({
      success: true,
      message: 'Batch submission completed',
      results,
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
 * Get module health status
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function getHealthStatus(c) {
  try {
    const campaigns = await backlinksService.getAllCampaigns();
    const dbStats = await backlinksDb.getStats();

    const status = {
      module: 'backlinks',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        totalCampaigns: dbStats.campaigns,
        totalSubmissions: dbStats.submissions,
        activeCampaigns: campaigns.filter(c => c.status !== 'completed').length,
        discoveredSites: dbStats.discoveredSites,
      },
      browserStatus: backlinksService.browser ? 'active' : 'inactive',
    };

    return c.json(status);
  } catch (error) {
    return c.json(
      {
        module: 'backlinks',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}
