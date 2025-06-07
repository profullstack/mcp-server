/**
 * Basic Usage Example for Backlinks Module
 *
 * This example demonstrates how to use the backlinks module
 * to create a campaign, discover sites, and submit to them.
 */

// Using native fetch API

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust to your MCP server URL
const API_ENDPOINT = `${BASE_URL}/tools/backlinks`;

/**
 * Example: Complete backlinks workflow
 */
async function runBacklinksWorkflow() {
  try {
    console.log('🚀 Starting Backlinks Automation Workflow\n');

    // Step 1: Create a new campaign
    console.log('📝 Creating new campaign...');
    const campaignResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_campaign',
        product_url: 'https://myawesomeapp.com',
        description:
          'Revolutionary AI-powered productivity tool that helps teams collaborate more effectively and streamline their workflow processes.',
        keywords: ['productivity', 'AI tool', 'team collaboration', 'workflow automation'],
        options: {
          max_sites: 25,
          min_domain_authority: 25,
          auto_submit: false, // We'll review before submitting
        },
      }),
    });

    const campaignData = await campaignResponse.json();
    const campaign = campaignData.result;
    console.log(`✅ Campaign created with ID: ${campaign.id}\n`);

    // Step 2: Discover potential backlink sites
    console.log('🔍 Discovering potential backlink sites...');
    const discoveryResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'discover_sites',
        campaign_id: campaign.id,
        options: {
          maxQueries: 3,
          maxResults: 10,
        },
      }),
    });

    const discoveryData = await discoveryResponse.json();
    const sites = discoveryData.result;
    console.log(`✅ Discovered ${sites.length} potential sites`);

    // Show top 5 sites
    const topSites = sites.slice(0, 5);
    console.log('\n🏆 Top 5 Sites:');
    topSites.forEach((site, index) => {
      console.log(`${index + 1}. ${site.url} (Score: ${site.score})`);
    });
    console.log();

    // Step 3: Generate content for the best site
    if (topSites.length > 0) {
      const bestSite = topSites[0];
      console.log(`📝 Generating content for: ${bestSite.url}`);

      const contentResponse = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_content',
          campaign_id: campaign.id,
          site_url: bestSite.url,
        }),
      });

      const contentData = await contentResponse.json();
      const content = contentData.result;
      console.log('✅ Generated content:');
      console.log(`   Title: ${content.title}`);
      console.log(`   Description: ${content.description.substring(0, 100)}...`);
      console.log(`   Category: ${content.category}\n`);

      // Step 4: Submit to the best site (dry run first)
      console.log('🎯 Performing dry run submission...');
      const submissionResponse = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_to_site',
          campaign_id: campaign.id,
          site_url: bestSite.url,
          options: {
            dry_run: true, // Don't actually submit
            auto_submit: true,
          },
        }),
      });

      const submissionData = await submissionResponse.json();
      const submission = submissionData.result;
      console.log(`✅ Dry run completed. Status: ${submission.status}`);
      console.log(`   Submission ID: ${submission.id}\n`);
    }

    // Step 5: Get campaign analytics
    console.log('📊 Getting campaign analytics...');
    const analyticsResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_analytics',
        campaign_id: campaign.id,
      }),
    });

    const analyticsData = await analyticsResponse.json();
    const analytics = analyticsData.result;
    console.log('✅ Campaign Analytics:');
    console.log(`   Total Sites Discovered: ${analytics.totalSitesDiscovered}`);
    console.log(`   Eligible Sites: ${analytics.eligibleSites}`);
    console.log(`   Average Site Score: ${analytics.averageSiteScore.toFixed(1)}`);
    console.log(`   Total Submissions: ${analytics.totalSubmissions}`);
    console.log(`   Successful Submissions: ${analytics.successfulSubmissions}\n`);

    console.log('🎉 Workflow completed successfully!');
  } catch (error) {
    console.error('❌ Error in workflow:', error.message);
  }
}

/**
 * Example: Batch submission to multiple sites
 */
async function runBatchSubmission() {
  try {
    console.log('🚀 Starting Batch Submission Example\n');

    // First, get an existing campaign or create one
    const campaignsResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'list_campaigns',
      }),
    });

    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.result;
    if (campaigns.length === 0) {
      console.log('No campaigns found. Please run the main workflow first.');
      return;
    }

    const campaign = campaigns[0];
    console.log(`📋 Using campaign: ${campaign.id}\n`);

    // Get eligible sites
    const eligibleSites = campaign.discoveredSites
      .filter(site => site.eligible && site.score > 50)
      .slice(0, 3) // Limit to 3 for demo
      .map(site => site.url);

    if (eligibleSites.length === 0) {
      console.log('No eligible sites found for batch submission.');
      return;
    }

    console.log(`🎯 Batch submitting to ${eligibleSites.length} sites...`);

    const batchResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'batch_submit',
        campaign_id: campaign.id,
        site_urls: eligibleSites,
        options: {
          dry_run: true, // Safe mode for demo
          auto_submit: true,
        },
      }),
    });

    const batchData = await batchResponse.json();
    const results = batchData.result;
    console.log('✅ Batch submission results:');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(
        `${index + 1}. ${status} ${result.site_url} - ${result.success ? 'Success' : result.error}`
      );
    });
  } catch (error) {
    console.error('❌ Error in batch submission:', error.message);
  }
}

/**
 * Example: Email follow-up workflow
 */
async function runFollowUpExample() {
  try {
    console.log('📧 Starting Follow-up Email Example\n');

    // Get campaigns with submissions
    const campaignsResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'list_campaigns',
      }),
    });

    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.result;
    const campaignWithSubmissions = campaigns.find(c => c.submissions && c.submissions.length > 0);

    if (!campaignWithSubmissions) {
      console.log('No campaigns with submissions found for follow-up.');
      return;
    }

    console.log(`📋 Sending follow-ups for campaign: ${campaignWithSubmissions.id}`);

    // Email configuration (use environment variables in production)
    // const emailConfig = {
    //   smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
    //   smtp_port: 587,
    //   smtp_user: process.env.SMTP_USER || 'your-email@gmail.com',
    //   smtp_pass: process.env.SMTP_PASS || 'your-app-password',
    //   from_email: process.env.FROM_EMAIL || 'your-email@gmail.com',
    //   to_email: 'admin@targetsite.com' // This would be dynamic in real usage
    // };

    // Note: This is just an example - in production you'd have real SMTP credentials
    console.log('⚠️  Note: This is a demo. Configure real SMTP credentials for actual follow-ups.');
    console.log('📧 Follow-up email configuration ready.');
    console.log('✅ Follow-up workflow example completed.\n');
  } catch (error) {
    console.error('❌ Error in follow-up example:', error.message);
  }
}

/**
 * Example: Real-time monitoring
 */
async function runMonitoringExample() {
  try {
    console.log('📊 Starting Monitoring Example\n');

    // Get all campaigns
    const campaignsResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'list_campaigns',
      }),
    });

    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.result;
    console.log(`📋 Monitoring ${campaigns.length} campaigns:\n`);

    for (const campaign of campaigns) {
      console.log(`Campaign: ${campaign.id}`);
      console.log(`  Product: ${campaign.productUrl}`);
      console.log(`  Status: ${campaign.status}`);
      console.log(`  Created: ${new Date(campaign.createdAt).toLocaleDateString()}`);

      // Get analytics for each campaign
      try {
        const analyticsResponse = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_analytics',
            campaign_id: campaign.id,
          }),
        });

        const analyticsData = await analyticsResponse.json();
        const analytics = analyticsData.result;
        console.log(`  Sites Discovered: ${analytics.totalSitesDiscovered}`);
        console.log(`  Submissions: ${analytics.totalSubmissions}`);
        console.log(
          `  Success Rate: ${
            analytics.totalSubmissions > 0
              ? ((analytics.successfulSubmissions / analytics.totalSubmissions) * 100).toFixed(1)
              : 0
          }%`
        );
      } catch (error) {
        console.log('  Analytics: Error loading');
      }

      console.log();
    }

    console.log('✅ Monitoring example completed.');
  } catch (error) {
    console.error('❌ Error in monitoring example:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'workflow';

  switch (command) {
    case 'workflow':
      await runBacklinksWorkflow();
      break;
    case 'batch':
      await runBatchSubmission();
      break;
    case 'followup':
      await runFollowUpExample();
      break;
    case 'monitor':
      await runMonitoringExample();
      break;
    default:
      console.log('Usage: node basic-usage.js [workflow|batch|followup|monitor]');
      console.log('');
      console.log('Commands:');
      console.log('  workflow  - Run complete backlinks workflow (default)');
      console.log('  batch     - Run batch submission example');
      console.log('  followup  - Run follow-up email example');
      console.log('  monitor   - Run monitoring example');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runBacklinksWorkflow, runBatchSubmission, runFollowUpExample, runMonitoringExample };
