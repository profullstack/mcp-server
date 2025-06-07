/**
 * Backlinks Service Tests
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { BacklinksService } from '../src/service.js';
import { backlinksDb } from '../src/database.js';

describe('BacklinksService', () => {
  let service;
  let sandbox;

  beforeEach(async () => {
    service = new BacklinksService();
    sandbox = sinon.createSandbox();

    // Initialize database for tests
    await service.initDatabase();
  });

  afterEach(async () => {
    sandbox.restore();

    // Clean up database after each test
    if (service.dbInitialized) {
      await backlinksDb.close();
      service.dbInitialized = false;
    }
  });

  describe('Campaign Management', () => {
    it('should create a new campaign', async () => {
      const campaignData = {
        product_url: 'https://example.com',
        description: 'Test product description',
        keywords: ['test', 'product'],
      };

      const campaign = await service.createCampaign(campaignData);

      expect(campaign).to.have.property('id');
      expect(campaign.productUrl).to.equal(campaignData.product_url);
      expect(campaign.description).to.equal(campaignData.description);
      expect(campaign.keywords).to.deep.equal(campaignData.keywords);
      expect(campaign.status).to.equal('created');
    });

    it('should throw error for invalid campaign data', async () => {
      const invalidData = {
        description: 'Missing URL',
      };

      try {
        await service.createCampaign(invalidData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Invalid campaign data');
      }
    });

    it('should get campaign by ID', async () => {
      const campaignData = {
        product_url: 'https://example.com',
        description: 'Test product description',
      };

      const campaign = await service.createCampaign(campaignData);
      const retrieved = await service.getCampaign(campaign.id);

      expect(retrieved.id).to.equal(campaign.id);
      expect(retrieved.productUrl).to.equal(campaign.productUrl);
      expect(retrieved.description).to.equal(campaign.description);
    });

    it('should return null for non-existent campaign', async () => {
      const result = await service.getCampaign('non-existent-id');
      expect(result).to.be.null;
    });

    it('should get all campaigns', async () => {
      const campaign1 = await service.createCampaign({
        product_url: 'https://example1.com',
        description: 'Test 1',
      });
      const campaign2 = await service.createCampaign({
        product_url: 'https://example2.com',
        description: 'Test 2',
      });

      const campaigns = await service.getAllCampaigns();
      expect(campaigns).to.have.length.at.least(2);

      const campaignIds = campaigns.map(c => c.id);
      expect(campaignIds).to.include(campaign1.id);
      expect(campaignIds).to.include(campaign2.id);
    });
  });

  describe('Site Discovery', () => {
    it('should validate backlink site URLs', () => {
      expect(service.isValidBacklinkSite('https://startup-directory.com')).to.be.true;
      expect(service.isValidBacklinkSite('https://product-showcase.com')).to.be.true;
      expect(service.isValidBacklinkSite('https://submit-your-app.com')).to.be.true;
      expect(service.isValidBacklinkSite('https://google.com')).to.be.false;
      expect(service.isValidBacklinkSite('https://facebook.com')).to.be.false;
    });

    it('should deduplicate sites by domain', () => {
      const sites = [
        { url: 'https://example.com/page1' },
        { url: 'https://example.com/page2' },
        { url: 'https://other.com/page1' },
      ];

      const deduplicated = service.deduplicateSites(sites);
      expect(deduplicated).to.have.length(2);
      expect(deduplicated.map(s => new URL(s.url).hostname)).to.deep.equal([
        'example.com',
        'other.com',
      ]);
    });

    it('should handle invalid URLs in deduplication', () => {
      const sites = [
        { url: 'https://example.com' },
        { url: 'invalid-url' },
        { url: 'https://other.com' },
      ];

      const deduplicated = service.deduplicateSites(sites);
      expect(deduplicated).to.have.length(2);
    });
  });

  describe('Submission Management', () => {
    let campaign;

    beforeEach(async () => {
      campaign = await service.createCampaign({
        product_url: 'https://example.com',
        description: 'Test product',
      });
      campaign.discoveredSites = [{ url: 'https://test-site.com', eligible: true }];
      await backlinksDb.saveCampaign(campaign);
    });

    it('should get submission by ID', async () => {
      const submissionData = {
        id: 'test-submission-id',
        campaignId: campaign.id,
        siteUrl: 'https://test-site.com',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await backlinksDb.saveSubmission(submissionData);
      const retrieved = await service.getSubmission(submissionData.id);

      expect(retrieved.id).to.equal(submissionData.id);
      expect(retrieved.campaignId).to.equal(submissionData.campaignId);
      expect(retrieved.status).to.equal(submissionData.status);
    });

    it('should return null for non-existent submission', async () => {
      const result = await service.getSubmission('non-existent-id');
      expect(result).to.be.null;
    });

    it('should get campaign submissions', async () => {
      const submission1 = {
        id: 'sub1',
        campaignId: campaign.id,
        siteUrl: 'https://site1.com',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const submission2 = {
        id: 'sub2',
        campaignId: campaign.id,
        siteUrl: 'https://site2.com',
        status: 'submitted',
        createdAt: new Date().toISOString(),
      };

      await backlinksDb.saveSubmission(submission1);
      await backlinksDb.saveSubmission(submission2);

      const submissions = await service.getCampaignSubmissions(campaign.id);
      expect(submissions).to.have.length(2);

      const submissionIds = submissions.map(s => s.id);
      expect(submissionIds).to.include('sub1');
      expect(submissionIds).to.include('sub2');
    });

    it('should return empty array for campaign with no submissions', async () => {
      const submissions = await service.getCampaignSubmissions(campaign.id);
      expect(submissions).to.be.an('array').that.is.empty;
    });
  });

  describe('Analytics', () => {
    let campaign;

    beforeEach(async () => {
      campaign = await service.createCampaign({
        product_url: 'https://example.com',
        description: 'Test product',
      });

      campaign.discoveredSites = [
        { url: 'https://site1.com', eligible: true, score: 80 },
        { url: 'https://site2.com', eligible: true, score: 60 },
        { url: 'https://site3.com', eligible: false, score: 10 },
      ];
      await backlinksDb.saveCampaign(campaign);

      const submissions = [
        {
          id: 'sub1',
          campaignId: campaign.id,
          siteUrl: 'https://site1.com',
          status: 'submitted',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sub2',
          campaignId: campaign.id,
          siteUrl: 'https://site2.com',
          status: 'failed',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sub3',
          campaignId: campaign.id,
          siteUrl: 'https://site3.com',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ];

      for (const sub of submissions) {
        await backlinksDb.saveSubmission(sub);
      }
    });

    it('should generate campaign analytics', async () => {
      const analytics = await service.getCampaignAnalytics(campaign.id);

      expect(analytics).to.have.property('campaignId', campaign.id);
      expect(analytics.totalSitesDiscovered).to.equal(3);
      expect(analytics.eligibleSites).to.equal(2);
      expect(analytics.totalSubmissions).to.equal(3);
      expect(analytics.successfulSubmissions).to.equal(1);
      expect(analytics.failedSubmissions).to.equal(1);
      expect(analytics.pendingSubmissions).to.equal(1);
      expect(analytics.averageSiteScore).to.equal(50); // (80 + 60 + 10) / 3
    });

    it('should throw error for non-existent campaign analytics', async () => {
      try {
        await service.getCampaignAnalytics('non-existent');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Campaign non-existent not found');
      }
    });
  });

  describe('Database Management', () => {
    it('should initialize database when needed', async () => {
      const newService = new BacklinksService();
      expect(newService.dbInitialized).to.be.false;

      await newService.initDatabase();
      expect(newService.dbInitialized).to.be.true;

      // Cleanup
      await newService.cleanup();
    });

    it('should cleanup resources properly', async () => {
      await service.initDatabase();
      expect(service.dbInitialized).to.be.true;

      await service.cleanup();
      expect(service.dbInitialized).to.be.false;
    });
  });
});
