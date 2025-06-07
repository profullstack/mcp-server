/**
 * Backlinks Module Service
 *
 * This file contains the main business logic for automated backlink discovery and submission.
 */

import puppeteer from 'puppeteer';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { backlinksDb } from './database.js';
import {
  validateSubmissionData,
  generateSubmissionContent,
  scoreSite,
  extractSiteInfo,
  delay,
} from './utils.js';

/**
 * Backlinks automation service class
 */
export class BacklinksService {
  constructor() {
    this.browser = null;
    this.dbInitialized = false;
  }

  /**
   * Initialize database connection
   */
  async initDatabase() {
    if (!this.dbInitialized) {
      await backlinksDb.init();
      this.dbInitialized = true;
    }
  }

  /**
   * Initialize browser instance
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Create a new backlink campaign
   * @param {Object} data - Campaign data
   * @returns {Object} Created campaign
   */
  async createCampaign(data) {
    await this.initDatabase();

    if (!validateSubmissionData(data)) {
      throw new Error('Invalid campaign data');
    }

    const campaignId = uuidv4();
    const campaign = {
      id: campaignId,
      productUrl: data.product_url,
      keywords: data.keywords || [],
      description: data.description,
      targetSites: data.target_sites || [],
      status: 'created',
      createdAt: new Date().toISOString(),
      submissions: [],
      discoveredSites: [],
      settings: {
        maxSites: data.max_sites || 50,
        minDomainAuthority: data.min_domain_authority || 20,
        autoSubmit: data.auto_submit || false,
        followUp: data.follow_up || false,
        ...data.settings,
      },
    };

    await backlinksDb.saveCampaign(campaign);
    return campaign;
  }

  /**
   * Get campaign by ID
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object|null>} Campaign or null if not found
   */
  async getCampaign(campaignId) {
    await this.initDatabase();
    const campaign = await backlinksDb.getCampaign(campaignId);

    if (campaign) {
      // Load submissions for this campaign
      campaign.submissions = await this.getCampaignSubmissionIds(campaignId);
    }

    return campaign;
  }

  /**
   * Get all campaigns
   * @returns {Promise<Array>} Array of campaigns
   */
  async getAllCampaigns() {
    await this.initDatabase();
    return await backlinksDb.getAllCampaigns();
  }

  /**
   * Get submission IDs for a campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Array>} Array of submission IDs
   */
  async getCampaignSubmissionIds(campaignId) {
    const submissions = await backlinksDb.getCampaignSubmissions(campaignId);
    return submissions.map(s => s.id);
  }

  /**
   * Discover potential backlink sites
   * @param {string} campaignId - Campaign ID
   * @param {Object} options - Discovery options (should include valueserp_api_key)
   * @returns {Promise<Array>} Discovered sites
   */
  async discoverSites(campaignId, options = {}) {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (!options.valueserp_api_key) {
      throw new Error(
        'ValueSERP API key is required for site discovery. Please provide valueserp_api_key in options.'
      );
    }

    const searchQueries = [
      'submit startup',
      'directory listing',
      'product hunt alternatives',
      'startup showcase',
      'business directory',
      'link building opportunities',
      ...campaign.keywords.map(k => `${k} directory`),
      ...campaign.keywords.map(k => `submit ${k}`),
    ];

    const discoveredSites = [];

    for (const query of searchQueries.slice(0, options.maxQueries || 5)) {
      try {
        const sites = await this.searchForSites(query, options);
        discoveredSites.push(...sites);

        // Add delay between searches to avoid rate limiting
        await delay(2000);
      } catch (error) {
        console.error(`Error searching for "${query}":`, error.message);
      }
    }

    // Remove duplicates and score sites
    const uniqueSites = this.deduplicateSites(discoveredSites);
    const scoredSites = await this.scoreSites(uniqueSites, campaign);

    // Save discovered sites to database
    for (const site of scoredSites) {
      await backlinksDb.saveDiscoveredSite(site);
    }

    // Update campaign with discovered sites
    campaign.discoveredSites = scoredSites;
    campaign.status = 'sites_discovered';
    campaign.updatedAt = new Date().toISOString();
    await backlinksDb.saveCampaign(campaign);

    return scoredSites;
  }

  /**
   * Search for potential backlink sites using ValueSERP API
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Found sites
   */
  async searchForSites(query, options = {}) {
    const sites = [];

    if (!options.valueserp_api_key) {
      console.warn('ValueSERP API key not provided, skipping search for:', query);
      return sites;
    }

    const searchParams = new URLSearchParams({
      api_key: options.valueserp_api_key,
      q: query,
      location: options.location || '98146,Washington,United States',
      gl: options.gl || 'us',
      hl: options.hl || 'en',
      google_domain: options.google_domain || 'google.com',
      num: options.num || '20',
    });

    try {
      const response = await fetch(`https://api.valueserp.com/search?${searchParams}`);

      if (!response.ok) {
        throw new Error(`ValueSERP API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Process organic results
      if (data.organic_results) {
        data.organic_results.forEach((result, index) => {
          if (result.link && result.title && this.isValidBacklinkSite(result.link)) {
            sites.push({
              url: result.link,
              title: result.title,
              description: result.snippet || '',
              discoveredAt: new Date().toISOString(),
              source: 'valueserp_search',
              query,
              position: result.position || index + 1,
            });
          }
        });
      }
    } catch (error) {
      console.error('Error searching sites with ValueSERP:', error.message);
    }

    return sites.slice(0, options.maxResults || 10);
  }

  /**
   * Check if a URL is a valid backlink opportunity
   * @param {string} url - URL to check
   * @returns {boolean} Whether the URL is valid
   */
  isValidBacklinkSite(url) {
    const invalidDomains = [
      'google.com',
      'youtube.com',
      'facebook.com',
      'twitter.com',
      'linkedin.com',
    ];
    const validPatterns = [
      /submit/i,
      /directory/i,
      /listing/i,
      /startup/i,
      /showcase/i,
      /gallery/i,
      /collection/i,
    ];

    try {
      const domain = new URL(url).hostname.toLowerCase();

      // Skip invalid domains
      if (invalidDomains.some(invalid => domain.includes(invalid))) {
        return false;
      }

      // Check for valid patterns in URL or domain
      return validPatterns.some(pattern => pattern.test(url) || pattern.test(domain));
    } catch {
      return false;
    }
  }

  /**
   * Remove duplicate sites from discovered list
   * @param {Array} sites - Array of sites
   * @returns {Array} Deduplicated sites
   */
  deduplicateSites(sites) {
    const seen = new Set();
    return sites.filter(site => {
      try {
        const domain = new URL(site.url).hostname;
        if (seen.has(domain)) {
          return false;
        }
        seen.add(domain);
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Score and validate discovered sites
   * @param {Array} sites - Sites to score
   * @param {Object} campaign - Campaign data
   * @returns {Promise<Array>} Scored sites
   */
  async scoreSites(sites, campaign) {
    const scoredSites = [];

    for (const site of sites) {
      try {
        const siteInfo = await extractSiteInfo(site.url);
        const score = scoreSite(siteInfo, campaign);

        if (score >= campaign.settings.minDomainAuthority) {
          scoredSites.push({
            ...site,
            ...siteInfo,
            score,
            eligible: true,
          });
        }

        // Add delay to avoid overwhelming target sites
        await delay(1000);
      } catch (error) {
        console.error(`Error scoring site ${site.url}:`, error.message);
        scoredSites.push({
          ...site,
          score: 0,
          eligible: false,
          error: error.message,
        });
      }
    }

    return scoredSites.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate submission content for a site
   * @param {Object} site - Target site
   * @param {Object} campaign - Campaign data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated content
   */
  async generateContent(site, campaign, options = {}) {
    const content = await generateSubmissionContent({
      targetSite: site,
      productUrl: campaign.productUrl,
      description: campaign.description,
      keywords: campaign.keywords,
      ...options,
    });

    return content;
  }

  /**
   * Submit to a specific site
   * @param {string} campaignId - Campaign ID
   * @param {string} siteUrl - Site URL to submit to
   * @param {Object} options - Submission options
   * @returns {Promise<Object>} Submission result
   */
  async submitToSite(campaignId, siteUrl, options = {}) {
    const campaign = this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const site = campaign.discoveredSites.find(s => s.url === siteUrl);
    if (!site) {
      throw new Error(`Site ${siteUrl} not found in campaign`);
    }

    const submissionId = uuidv4();
    const submission = {
      id: submissionId,
      campaignId,
      siteUrl,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
    };

    try {
      // Generate content for this specific site
      const content = await this.generateContent(site, campaign, options);
      submission.content = content;

      // Attempt automated submission
      if (options.autoSubmit !== false) {
        const result = await this.automateSubmission(site, content, options);
        submission.result = result;
        submission.status = result.success ? 'submitted' : 'failed';
        submission.submittedAt = new Date().toISOString();
      }

      // Store submission
      await backlinksDb.saveSubmission(submission);
      campaign.submissions.push(submissionId);
      campaign.updatedAt = new Date().toISOString();
      await backlinksDb.saveCampaign(campaign);

      return submission;
    } catch (error) {
      submission.status = 'failed';
      submission.error = error.message;
      await backlinksDb.saveSubmission(submission);
      throw error;
    }
  }

  /**
   * Automate form submission using Puppeteer
   * @param {Object} site - Target site
   * @param {Object} content - Generated content
   * @param {Object} options - Automation options
   * @returns {Promise<Object>} Submission result
   */
  async automateSubmission(site, content, options = {}) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Set user agent and viewport
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );
      await page.setViewport({ width: 1366, height: 768 });

      // Navigate to submission page
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Look for submission forms
      const forms = await page.$$('form');
      if (forms.length === 0) {
        throw new Error('No forms found on the page');
      }

      // Try to fill out the most likely submission form
      const result = await this.fillSubmissionForm(page, content, options);

      return {
        success: true,
        message: 'Form submitted successfully',
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Fill out submission form on the page
   * @param {Object} page - Puppeteer page
   * @param {Object} content - Content to submit
   * @param {Object} options - Fill options
   * @returns {Promise<Object>} Fill result
   */
  async fillSubmissionForm(page, content, options = {}) {
    // Common field selectors
    const fieldSelectors = {
      title: [
        'input[name*="title"]',
        'input[name*="name"]',
        'input[id*="title"]',
        'input[id*="name"]',
      ],
      description: [
        'textarea[name*="description"]',
        'textarea[name*="desc"]',
        'textarea[id*="description"]',
      ],
      url: [
        'input[name*="url"]',
        'input[name*="website"]',
        'input[name*="link"]',
        'input[type="url"]',
      ],
      email: ['input[name*="email"]', 'input[type="email"]'],
      category: ['select[name*="category"]', 'select[name*="cat"]'],
    };

    const results = {};

    // Fill title field
    for (const selector of fieldSelectors.title) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.type(content.title);
          results.title = 'filled';
          break;
        }
      } catch {
        continue;
      }
    }

    // Fill description field
    for (const selector of fieldSelectors.description) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.type(content.description);
          results.description = 'filled';
          break;
        }
      } catch {
        continue;
      }
    }

    // Fill URL field
    for (const selector of fieldSelectors.url) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.type(content.url);
          results.url = 'filled';
          break;
        }
      } catch {
        continue;
      }
    }

    // Fill email field if provided
    if (content.email) {
      for (const selector of fieldSelectors.email) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.type(content.email);
            results.email = 'filled';
            break;
          }
        } catch {
          continue;
        }
      }
    }

    // Submit form if not in dry-run mode
    if (!options.dryRun) {
      const submitButton = await page.$(
        'input[type="submit"], button[type="submit"], button:contains("Submit")'
      );
      if (submitButton) {
        await submitButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        results.submitted = true;
      }
    }

    return results;
  }

  /**
   * Get submission status
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Object|null>} Submission or null if not found
   */
  async getSubmission(submissionId) {
    await this.initDatabase();
    return await backlinksDb.getSubmission(submissionId);
  }

  /**
   * Get all submissions for a campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Array>} Array of submissions
   */
  async getCampaignSubmissions(campaignId) {
    await this.initDatabase();
    return await backlinksDb.getCampaignSubmissions(campaignId);
  }

  /**
   * Send follow-up emails for pending submissions
   * @param {string} campaignId - Campaign ID
   * @param {Object} emailConfig - Email configuration
   * @returns {Promise<Array>} Follow-up results
   */
  async sendFollowUps(campaignId, emailConfig) {
    const campaign = this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const pendingSubmissions = this.getCampaignSubmissions(campaignId).filter(
      s => s.status === 'submitted' && !s.followUpSent
    );

    const results = [];

    for (const submission of pendingSubmissions) {
      try {
        const result = await this.sendFollowUpEmail(submission, campaign, emailConfig);
        submission.followUpSent = true;
        submission.followUpAt = new Date().toISOString();
        await backlinksDb.saveSubmission(submission);
        results.push({ submissionId: submission.id, success: true, result });
      } catch (error) {
        results.push({ submissionId: submission.id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Send follow-up email for a specific submission
   * @param {Object} submission - Submission data
   * @param {Object} campaign - Campaign data
   * @param {Object} emailConfig - Email configuration
   * @returns {Promise<Object>} Email result
   */
  async sendFollowUpEmail(submission, campaign, emailConfig) {
    // Support both Mailgun API and traditional SMTP
    if (emailConfig.mailgun_api_key && emailConfig.mailgun_domain) {
      return await this.sendMailgunEmail(submission, campaign, emailConfig);
    } else if (emailConfig.smtp_host) {
      return await this.sendSmtpEmail(submission, campaign, emailConfig);
    } else {
      throw new Error(
        'Email configuration required: either Mailgun (mailgun_api_key, mailgun_domain) or SMTP (smtp_host, smtp_user, smtp_pass)'
      );
    }
  }

  /**
   * Send email via Mailgun API
   * @param {Object} submission - Submission data
   * @param {Object} campaign - Campaign data
   * @param {Object} emailConfig - Mailgun configuration
   * @returns {Promise<Object>} Email result
   */
  async sendMailgunEmail(submission, campaign, emailConfig) {
    const formData = new FormData();
    formData.append(
      'from',
      emailConfig.from_email || `Backlinks <noreply@${emailConfig.mailgun_domain}>`
    );
    formData.append('to', emailConfig.to_email || 'admin@example.com');
    formData.append('subject', `Follow-up: ${submission.content.title} Submission`);
    formData.append(
      'html',
      `
      <h3>Follow-up on Submission</h3>
      <p>We recently submitted our product "${submission.content.title}" to your platform.</p>
      <p><strong>Product URL:</strong> ${campaign.productUrl}</p>
      <p><strong>Description:</strong> ${submission.content.description}</p>
      <p>Could you please provide an update on the status of our submission?</p>
      <p>Thank you for your time.</p>
    `
    );

    const response = await fetch(
      `https://api.mailgun.net/v3/${emailConfig.mailgun_domain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${emailConfig.mailgun_api_key}`).toString('base64')}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Mailgun API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return {
      provider: 'mailgun',
      messageId: result.id,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send email via SMTP (fallback)
   * @param {Object} submission - Submission data
   * @param {Object} campaign - Campaign data
   * @param {Object} emailConfig - SMTP configuration
   * @returns {Promise<Object>} Email result
   */
  async sendSmtpEmail(submission, campaign, emailConfig) {
    const transporter = nodemailer.createTransporter({
      host: emailConfig.smtp_host,
      port: emailConfig.smtp_port || 587,
      secure: emailConfig.smtp_secure || false,
      auth: {
        user: emailConfig.smtp_user,
        pass: emailConfig.smtp_pass,
      },
    });

    const emailContent = {
      from: emailConfig.from_email,
      to: emailConfig.to_email || 'admin@example.com',
      subject: `Follow-up: ${submission.content.title} Submission`,
      html: `
        <h3>Follow-up on Submission</h3>
        <p>We recently submitted our product "${submission.content.title}" to your platform.</p>
        <p><strong>Product URL:</strong> ${campaign.productUrl}</p>
        <p><strong>Description:</strong> ${submission.content.description}</p>
        <p>Could you please provide an update on the status of our submission?</p>
        <p>Thank you for your time.</p>
      `,
    };

    const result = await transporter.sendMail(emailContent);
    return {
      provider: 'smtp',
      messageId: result.messageId,
      response: result.response,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get campaign analytics and reporting
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign analytics
   */
  async getCampaignAnalytics(campaignId) {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const submissions = await this.getCampaignSubmissions(campaignId);

    const discoveredSites = campaign.discoveredSites || [];
    const analytics = {
      campaignId,
      totalSitesDiscovered: discoveredSites.length,
      eligibleSites: discoveredSites.filter(s => s.eligible).length,
      totalSubmissions: submissions.length,
      successfulSubmissions: submissions.filter(s => s.status === 'submitted').length,
      failedSubmissions: submissions.filter(s => s.status === 'failed').length,
      pendingSubmissions: submissions.filter(s => s.status === 'pending').length,
      averageSiteScore:
        discoveredSites.length > 0
          ? discoveredSites.reduce((sum, site) => sum + (site.score || 0), 0) /
            discoveredSites.length
          : 0,
      topSites: discoveredSites.filter(s => s.eligible).slice(0, 10),
      recentSubmissions: submissions.slice(-5),
      createdAt: campaign.createdAt,
      lastUpdated: new Date().toISOString(),
    };

    return analytics;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    if (this.dbInitialized) {
      await backlinksDb.close();
      this.dbInitialized = false;
    }
  }
}

// Export a singleton instance
export const backlinksService = new BacklinksService();
