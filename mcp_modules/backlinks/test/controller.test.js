/**
 * Backlinks Controller Tests
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { backlinksService } from '../src/service.js';
import { backlinksDb } from '../src/database.js';
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
} from '../src/controller.js';

describe('Backlinks Controller', () => {
  let sandbox;
  let mockContext;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockContext = {
      json: sandbox.stub().returnsThis(),
      req: {
        json: sandbox.stub(),
        param: sandbox.stub(),
      },
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getAllCampaigns', () => {
    it('should return all campaigns successfully', async () => {
      const mockCampaigns = [
        { id: '1', productUrl: 'https://example1.com' },
        { id: '2', productUrl: 'https://example2.com' },
      ];

      sandbox.stub(backlinksService, 'getAllCampaigns').resolves(mockCampaigns);

      await getAllCampaigns(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          count: 2,
          campaigns: mockCampaigns,
        })
      ).to.be.true;
    });

    it('should handle errors gracefully', async () => {
      sandbox.stub(backlinksService, 'getAllCampaigns').rejects(new Error('Database error'));

      await getAllCampaigns(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Database error',
          },
          500
        )
      ).to.be.true;
    });
  });

  describe('getCampaignById', () => {
    it('should return campaign when found', async () => {
      const mockCampaign = { id: 'test-id', productUrl: 'https://example.com' };

      mockContext.req.param.returns({ id: 'test-id' });
      sandbox.stub(backlinksService, 'getCampaign').resolves(mockCampaign);

      await getCampaignById(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          campaign: mockCampaign,
        })
      ).to.be.true;
    });

    it('should return 404 when campaign not found', async () => {
      mockContext.req.param.returns({ id: 'non-existent' });
      sandbox.stub(backlinksService, 'getCampaign').resolves(null);

      await getCampaignById(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Campaign with ID non-existent not found',
          },
          404
        )
      ).to.be.true;
    });
  });

  describe('createCampaign', () => {
    it('should create campaign successfully', async () => {
      const campaignData = {
        product_url: 'https://example.com',
        description: 'Test product',
      };
      const mockCampaign = { id: 'new-id', ...campaignData };

      mockContext.req.json.resolves(campaignData);
      sandbox.stub(backlinksService, 'createCampaign').resolves(mockCampaign);

      await createCampaign(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: true,
            message: 'Campaign created successfully',
            campaign: mockCampaign,
          },
          201
        )
      ).to.be.true;
    });

    it('should handle validation errors', async () => {
      const invalidData = { description: 'Missing URL' };

      mockContext.req.json.resolves(invalidData);
      sandbox.stub(backlinksService, 'createCampaign').rejects(new Error('Invalid campaign data'));

      await createCampaign(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Invalid campaign data',
          },
          400
        )
      ).to.be.true;
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign successfully', async () => {
      const updateData = { description: 'Updated description' };
      const existingCampaign = { id: 'test-id', productUrl: 'https://example.com' };

      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves(updateData);
      sandbox.stub(backlinksService, 'getCampaign').resolves(existingCampaign);
      sandbox.stub(backlinksDb, 'saveCampaign').resolves();

      await updateCampaign(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          message: 'Campaign updated successfully',
          campaign: sinon.match.object,
        })
      ).to.be.true;
    });

    it('should return 404 for non-existent campaign', async () => {
      mockContext.req.param.returns({ id: 'non-existent' });
      mockContext.req.json.resolves({});
      sandbox.stub(backlinksService, 'getCampaign').resolves(null);

      await updateCampaign(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Campaign with ID non-existent not found',
          },
          404
        )
      ).to.be.true;
    });
  });

  describe('deleteCampaign', () => {
    it('should delete campaign successfully', async () => {
      const mockCampaign = { id: 'test-id' };

      mockContext.req.param.returns({ id: 'test-id' });
      sandbox.stub(backlinksService, 'getCampaign').resolves(mockCampaign);
      sandbox.stub(backlinksService, 'closeBrowser').resolves();
      sandbox.stub(backlinksDb, 'deleteCampaign').resolves();

      await deleteCampaign(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          message: 'Campaign deleted successfully',
        })
      ).to.be.true;
    });

    it('should return 404 for non-existent campaign', async () => {
      mockContext.req.param.returns({ id: 'non-existent' });
      sandbox.stub(backlinksService, 'getCampaign').resolves(null);

      await deleteCampaign(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Campaign with ID non-existent not found',
          },
          404
        )
      ).to.be.true;
    });
  });

  describe('discoverSites', () => {
    it('should discover sites successfully', async () => {
      const mockSites = [
        { url: 'https://site1.com', score: 80 },
        { url: 'https://site2.com', score: 60 },
      ];

      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves({});
      sandbox.stub(backlinksService, 'discoverSites').resolves(mockSites);

      await discoverSites(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          message: 'Sites discovered successfully',
          count: 2,
          sites: mockSites,
        })
      ).to.be.true;
    });

    it('should handle discovery errors', async () => {
      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves({});
      sandbox.stub(backlinksService, 'discoverSites').rejects(new Error('Discovery failed'));

      await discoverSites(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Discovery failed',
          },
          500
        )
      ).to.be.true;
    });
  });

  describe('submitToSite', () => {
    it('should submit to site successfully', async () => {
      const mockSubmission = { id: 'sub-id', status: 'submitted' };

      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves({ site_url: 'https://example.com' });
      sandbox.stub(backlinksService, 'submitToSite').resolves(mockSubmission);

      await submitToSite(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          message: 'Submission completed',
          submission: mockSubmission,
        })
      ).to.be.true;
    });

    it('should return 400 for missing site_url', async () => {
      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves({});

      await submitToSite(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Missing required parameter: site_url',
          },
          400
        )
      ).to.be.true;
    });
  });

  describe('getCampaignSubmissions', () => {
    it('should return campaign submissions', async () => {
      const mockSubmissions = [
        { id: 'sub1', status: 'submitted' },
        { id: 'sub2', status: 'pending' },
      ];

      mockContext.req.param.returns({ id: 'test-id' });
      sandbox.stub(backlinksService, 'getCampaignSubmissions').resolves(mockSubmissions);

      await getCampaignSubmissions(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          count: 2,
          submissions: mockSubmissions,
        })
      ).to.be.true;
    });
  });

  describe('getSubmissionById', () => {
    it('should return submission when found', async () => {
      const mockSubmission = { id: 'sub-id', status: 'submitted' };

      mockContext.req.param.returns({ submissionId: 'sub-id' });
      sandbox.stub(backlinksService, 'getSubmission').resolves(mockSubmission);

      await getSubmissionById(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          submission: mockSubmission,
        })
      ).to.be.true;
    });

    it('should return 404 when submission not found', async () => {
      mockContext.req.param.returns({ submissionId: 'non-existent' });
      sandbox.stub(backlinksService, 'getSubmission').resolves(null);

      await getSubmissionById(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Submission with ID non-existent not found',
          },
          404
        )
      ).to.be.true;
    });
  });

  describe('sendFollowUps', () => {
    it('should send follow-ups successfully', async () => {
      const emailConfig = {
        smtp_host: 'smtp.gmail.com',
        smtp_user: 'test@gmail.com',
        smtp_pass: 'password',
        from_email: 'test@gmail.com',
      };
      const mockResults = [{ submissionId: 'sub1', success: true }];

      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves(emailConfig);
      sandbox.stub(backlinksService, 'sendFollowUps').resolves(mockResults);

      await sendFollowUps(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          message: 'Follow-up emails processed',
          provider: 'smtp',
          results: mockResults,
        })
      ).to.be.true;
    });

    it('should return 400 for invalid email config', async () => {
      const invalidConfig = { smtp_host: 'smtp.gmail.com' }; // Missing required fields

      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves(invalidConfig);

      await sendFollowUps(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error:
              'Invalid email configuration. Required: either Mailgun (mailgun_api_key, mailgun_domain) or SMTP (smtp_host, smtp_user, smtp_pass)',
          },
          400
        )
      ).to.be.true;
    });
  });

  describe('getCampaignAnalytics', () => {
    it('should return campaign analytics', async () => {
      const mockAnalytics = {
        campaignId: 'test-id',
        totalSitesDiscovered: 10,
        successfulSubmissions: 5,
      };

      mockContext.req.param.returns({ id: 'test-id' });
      sandbox.stub(backlinksService, 'getCampaignAnalytics').resolves(mockAnalytics);

      await getCampaignAnalytics(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          analytics: mockAnalytics,
        })
      ).to.be.true;
    });
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const mockCampaign = {
        id: 'test-id',
        discoveredSites: [{ url: 'https://example.com' }],
      };
      const mockContent = {
        title: 'Generated Title',
        description: 'Generated Description',
      };

      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves({ site_url: 'https://example.com' });
      sandbox.stub(backlinksService, 'getCampaign').resolves(mockCampaign);
      sandbox.stub(backlinksService, 'generateContent').resolves(mockContent);

      await generateContent(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          message: 'Content generated successfully',
          content: mockContent,
        })
      ).to.be.true;
    });

    it('should return 400 for missing site_url', async () => {
      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves({});

      await generateContent(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Missing required parameter: site_url',
          },
          400
        )
      ).to.be.true;
    });
  });

  describe('batchSubmit', () => {
    it('should process batch submission successfully', async () => {
      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves({ site_urls: ['https://site1.com', 'https://site2.com'] });

      const submitStub = sandbox.stub(backlinksService, 'submitToSite');
      submitStub.onFirstCall().resolves({ id: 'sub1' });
      submitStub.onSecondCall().rejects(new Error('Failed'));

      // Mock setTimeout to avoid actual delays in tests
      sandbox.stub(global, 'setTimeout').callsFake(fn => fn());

      await batchSubmit(mockContext);

      expect(
        mockContext.json.calledWith({
          success: true,
          message: 'Batch submission completed',
          results: sinon.match.array,
        })
      ).to.be.true;
    });

    it('should return 400 for missing site_urls', async () => {
      mockContext.req.param.returns({ id: 'test-id' });
      mockContext.req.json.resolves({});

      await batchSubmit(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            success: false,
            error: 'Missing required parameter: site_urls (array)',
          },
          400
        )
      ).to.be.true;
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      sandbox.stub(backlinksService, 'getAllCampaigns').resolves([{ id: '1' }, { id: '2' }]);
      sandbox.stub(backlinksDb, 'getStats').resolves({
        campaigns: 2,
        submissions: 1,
        discoveredSites: 5,
      });

      await getHealthStatus(mockContext);

      expect(
        mockContext.json.calledWith(
          sinon.match({
            module: 'backlinks',
            status: 'healthy',
            stats: sinon.match.object,
            browserStatus: sinon.match.string,
          })
        )
      ).to.be.true;
    });

    it('should return unhealthy status on error', async () => {
      sandbox.stub(backlinksService, 'getAllCampaigns').rejects(new Error('Service error'));

      await getHealthStatus(mockContext);

      expect(
        mockContext.json.calledWith(
          {
            module: 'backlinks',
            status: 'unhealthy',
            error: 'Service error',
            timestamp: sinon.match.string,
          },
          500
        )
      ).to.be.true;
    });
  });
});
