/**
 * Backlinks Module
 *
 * Automated backlink discovery and submission tool for SEO optimization.
 * This module provides comprehensive functionality for discovering potential
 * backlink sites, generating tailored submission content, and automating
 * the submission process using web crawling and browser automation.
 */

import { logger } from '../../src/utils/logger.js';
import {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  discoverSites,
  submitToSite,
  getCampaignSubmissions,
  getSubmissionById,
  sendFollowUps,
  getCampaignAnalytics,
  generateContent,
  batchSubmit,
  getHealthStatus,
} from './src/controller.js';
import { backlinksService } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering backlinks module');

  // Basic module info endpoint
  app.get('/backlinks', c => {
    return c.json({
      module: 'backlinks',
      status: 'active',
      message: 'Automated backlink discovery and submission tool',
      version: metadata.version,
      features: [
        'Site discovery and validation',
        'AI-powered content generation',
        'Automated form submission',
        'Follow-up email automation',
        'Campaign analytics and reporting',
      ],
    });
  });

  // Campaign management routes
  app.get('/backlinks/campaigns', getAllCampaigns);
  app.get('/backlinks/campaigns/:id', getCampaignById);
  app.post('/backlinks/campaigns', createCampaign);
  app.put('/backlinks/campaigns/:id', updateCampaign);
  app.delete('/backlinks/campaigns/:id', deleteCampaign);

  // Site discovery and submission routes
  app.post('/backlinks/campaigns/:id/discover', discoverSites);
  app.post('/backlinks/campaigns/:id/submit', submitToSite);
  app.post('/backlinks/campaigns/:id/batch-submit', batchSubmit);
  app.post('/backlinks/campaigns/:id/generate-content', generateContent);

  // Submission management routes
  app.get('/backlinks/campaigns/:id/submissions', getCampaignSubmissions);
  app.get('/backlinks/submissions/:submissionId', getSubmissionById);
  app.post('/backlinks/campaigns/:id/follow-ups', sendFollowUps);

  // Analytics and reporting routes
  app.get('/backlinks/campaigns/:id/analytics', getCampaignAnalytics);
  app.get('/backlinks/health', getHealthStatus);

  // Register MCP tool info
  app.get('/tools/backlinks/info', c => {
    return c.json({
      name: 'backlinks',
      description: 'Automated backlink discovery and submission for SEO optimization',
      parameters: {
        action: {
          type: 'string',
          description: 'The action to perform',
          required: true,
          enum: [
            'create_campaign',
            'discover_sites',
            'submit_to_site',
            'batch_submit',
            'generate_content',
            'send_follow_ups',
            'get_analytics',
            'get_campaign',
            'list_campaigns',
          ],
        },
        campaign_id: {
          type: 'string',
          description: 'Campaign ID for campaign-specific actions',
          required: false,
        },
        product_url: {
          type: 'string',
          description: 'Product URL for new campaigns',
          required: false,
        },
        description: {
          type: 'string',
          description: 'Product description for new campaigns',
          required: false,
        },
        keywords: {
          type: 'array',
          description: 'SEO keywords for the campaign',
          required: false,
        },
        site_url: {
          type: 'string',
          description: 'Target site URL for submissions',
          required: false,
        },
        site_urls: {
          type: 'array',
          description: 'Array of target site URLs for batch submissions',
          required: false,
        },
        email_config: {
          type: 'object',
          description: 'Email configuration for follow-ups',
          required: false,
        },
        options: {
          type: 'object',
          description: 'Additional options for various actions',
          required: false,
        },
      },
    });
  });

  // Register MCP tool endpoint
  app.post('/tools/backlinks', async c => {
    try {
      const params = await c.req.json();

      // Validate required parameters
      if (!params.action) {
        return c.json({ error: 'Missing required parameter: action' }, 400);
      }

      let result;

      switch (params.action) {
        case 'create_campaign':
          if (!params.product_url || !params.description) {
            return c.json(
              {
                error: 'Missing required parameters: product_url, description',
              },
              400
            );
          }
          result = backlinksService.createCampaign({
            product_url: params.product_url,
            description: params.description,
            keywords: params.keywords || [],
            ...params.options,
          });
          break;

        case 'discover_sites':
          if (!params.campaign_id) {
            return c.json({ error: 'Missing required parameter: campaign_id' }, 400);
          }
          result = await backlinksService.discoverSites(params.campaign_id, params.options || {});
          break;

        case 'submit_to_site':
          if (!params.campaign_id || !params.site_url) {
            return c.json(
              {
                error: 'Missing required parameters: campaign_id, site_url',
              },
              400
            );
          }
          result = await backlinksService.submitToSite(
            params.campaign_id,
            params.site_url,
            params.options || {}
          );
          break;

        case 'batch_submit': {
          if (!params.campaign_id || !params.site_urls) {
            return c.json(
              {
                error: 'Missing required parameters: campaign_id, site_urls',
              },
              400
            );
          }
          const batchResults = [];
          for (const siteUrl of params.site_urls) {
            try {
              const submission = await backlinksService.submitToSite(
                params.campaign_id,
                siteUrl,
                params.options || {}
              );
              batchResults.push({ site_url: siteUrl, success: true, submission });
            } catch (error) {
              batchResults.push({ site_url: siteUrl, success: false, error: error.message });
            }
            // Add delay between submissions
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          result = batchResults;
          break;
        }

        case 'generate_content': {
          if (!params.campaign_id || !params.site_url) {
            return c.json(
              {
                error: 'Missing required parameters: campaign_id, site_url',
              },
              400
            );
          }
          const campaign = await backlinksService.getCampaign(params.campaign_id);
          if (!campaign) {
            return c.json({ error: `Campaign ${params.campaign_id} not found` }, 404);
          }
          const site = campaign.discoveredSites.find(s => s.url === params.site_url);
          if (!site) {
            return c.json({ error: `Site ${params.site_url} not found in campaign` }, 404);
          }
          result = await backlinksService.generateContent(site, campaign, params.options || {});
          break;
        }

        case 'send_follow_ups':
          if (!params.campaign_id || !params.email_config) {
            return c.json(
              {
                error: 'Missing required parameters: campaign_id, email_config',
              },
              400
            );
          }
          result = await backlinksService.sendFollowUps(params.campaign_id, params.email_config);
          break;

        case 'get_analytics':
          if (!params.campaign_id) {
            return c.json({ error: 'Missing required parameter: campaign_id' }, 400);
          }
          result = backlinksService.getCampaignAnalytics(params.campaign_id);
          break;

        case 'get_campaign':
          if (!params.campaign_id) {
            return c.json({ error: 'Missing required parameter: campaign_id' }, 400);
          }
          result = backlinksService.getCampaign(params.campaign_id);
          if (!result) {
            return c.json({ error: `Campaign ${params.campaign_id} not found` }, 404);
          }
          break;

        case 'list_campaigns':
          result = backlinksService.getAllCampaigns();
          break;

        default:
          return c.json({ error: `Unknown action: ${params.action}` }, 400);
      }

      return c.json({
        tool: 'backlinks',
        action: params.action,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Backlinks tool error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Register the module info endpoint
  app.get('/modules/backlinks', c => {
    return c.json(metadata);
  });

  logger.info('Backlinks module registered successfully');
}

/**
 * Unregister this module (cleanup)
 * This is optional and would be called when the module is being unloaded
 */
export async function unregister() {
  logger.info('Unregistering backlinks module');

  // Close browser instance if active
  try {
    await backlinksService.cleanup();
  } catch (error) {
    logger.error('Error closing browser during unregister:', error);
  }

  // Clear any intervals or timeouts
  // Perform any other cleanup here

  logger.info('Backlinks module unregistered successfully');
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Backlinks Automation Module',
  version: '1.0.0',
  description: 'Automated backlink discovery and submission tool for SEO optimization',
  author: 'MCP Server',
  tools: ['backlinks'],
  dependencies: ['puppeteer', 'crawlee', 'axios', 'cheerio', 'nodemailer', 'uuid'],
  endpoints: [
    { path: '/backlinks', method: 'GET', description: 'Get module information' },
    { path: '/backlinks/campaigns', method: 'GET', description: 'Get all campaigns' },
    { path: '/backlinks/campaigns/:id', method: 'GET', description: 'Get campaign by ID' },
    { path: '/backlinks/campaigns', method: 'POST', description: 'Create a new campaign' },
    { path: '/backlinks/campaigns/:id', method: 'PUT', description: 'Update a campaign' },
    { path: '/backlinks/campaigns/:id', method: 'DELETE', description: 'Delete a campaign' },
    {
      path: '/backlinks/campaigns/:id/discover',
      method: 'POST',
      description: 'Discover sites for campaign',
    },
    {
      path: '/backlinks/campaigns/:id/submit',
      method: 'POST',
      description: 'Submit to a specific site',
    },
    {
      path: '/backlinks/campaigns/:id/batch-submit',
      method: 'POST',
      description: 'Batch submit to multiple sites',
    },
    {
      path: '/backlinks/campaigns/:id/generate-content',
      method: 'POST',
      description: 'Generate content for a site',
    },
    {
      path: '/backlinks/campaigns/:id/submissions',
      method: 'GET',
      description: 'Get campaign submissions',
    },
    {
      path: '/backlinks/submissions/:submissionId',
      method: 'GET',
      description: 'Get submission by ID',
    },
    {
      path: '/backlinks/campaigns/:id/follow-ups',
      method: 'POST',
      description: 'Send follow-up emails',
    },
    {
      path: '/backlinks/campaigns/:id/analytics',
      method: 'GET',
      description: 'Get campaign analytics',
    },
    { path: '/backlinks/health', method: 'GET', description: 'Get module health status' },
    { path: '/tools/backlinks', method: 'POST', description: 'Backlinks tool endpoint' },
  ],
  features: [
    'Automated site discovery using web crawling',
    'Site validation and scoring based on SEO metrics',
    'AI-powered content generation tailored to each site',
    'Automated form submission using Puppeteer',
    'Follow-up email automation',
    'Campaign analytics and reporting',
    'Batch processing capabilities',
    'Rate limiting and respectful crawling',
  ],
  configuration: {
    required_apis: [
      'Optional: Moz API for domain authority',
      'Optional: Ahrefs API for SEO metrics',
      'Optional: 2Captcha API for CAPTCHA solving',
    ],
    environment_variables: [
      'SMTP_HOST - SMTP server for email follow-ups',
      'SMTP_USER - SMTP username',
      'SMTP_PASS - SMTP password',
      'MOZ_API_KEY - Moz API key (optional)',
      'AHREFS_API_KEY - Ahrefs API key (optional)',
      'CAPTCHA_API_KEY - 2Captcha API key (optional)',
    ],
  },
};
