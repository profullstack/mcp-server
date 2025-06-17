/**
 * Email Checker Module - Basic Usage Examples
 *
 * This file demonstrates how to use the email checker module
 * in various scenarios.
 */

import { EmailCheckerService } from '../src/service.js';

// Example 1: Basic email checking
async function basicEmailCheck() {
  console.log('=== Basic Email Check ===');

  const emailChecker = new EmailCheckerService('your-api-key-here');

  try {
    const result = await emailChecker.checkEmail('test@example.com');
    console.log('✅ Email check result:', result);
  } catch (error) {
    console.error('❌ Email check failed:', error.message);
  }
}

// Example 2: Batch email checking
async function batchEmailCheck() {
  console.log('\n=== Batch Email Check ===');

  const emailChecker = new EmailCheckerService('your-api-key-here');

  const emails = [
    'valid@example.com',
    'another@test.org',
    'invalid-email',
    'user@domain.co.uk',
    'test+tag@example.com',
  ];

  try {
    const results = await emailChecker.checkMultipleEmails(emails);
    console.log('✅ Batch check results:');
    results.forEach((result, index) => {
      const status = result.isValid ? '✅' : '❌';
      console.log(`  ${status} ${result.email}: ${result.isValid ? 'Valid' : result.error}`);
    });
  } catch (error) {
    console.error('❌ Batch check failed:', error.message);
  }
}

// Example 3: Working with check history
async function historyManagement() {
  console.log('\n=== History Management ===');

  const emailChecker = new EmailCheckerService('your-api-key-here');

  // Perform some checks first
  try {
    await emailChecker.checkEmail('history1@example.com');
    await emailChecker.checkEmail('history2@example.com');
    await emailChecker.checkEmail('invalid-history');
  } catch (error) {
    // Some checks might fail, that's okay for this example
  }

  // Get all history
  const history = emailChecker.getCheckHistory();
  console.log(`📊 Total checks in history: ${history.length}`);

  // Get statistics
  const stats = emailChecker.getStats();
  console.log('📈 Statistics:', stats);

  // Get recent checks (last 24 hours)
  const recentChecks = emailChecker.getRecentChecks(24);
  console.log(`🕐 Recent checks (24h): ${recentChecks.length}`);

  // Get checks for specific email
  if (history.length > 0) {
    const firstEmail = history[0].email;
    const emailChecks = emailChecker.getChecksByEmail(firstEmail);
    console.log(`📧 Checks for ${firstEmail}: ${emailChecks.length}`);
  }
}

// Example 4: Error handling patterns
async function errorHandlingExamples() {
  console.log('\n=== Error Handling Examples ===');

  const emailChecker = new EmailCheckerService(''); // No API key

  // Handle missing API key
  try {
    await emailChecker.checkEmail('test@example.com');
  } catch (error) {
    console.log('🔑 API key error handled:', error.message);
  }

  // Handle invalid email format
  const validEmailChecker = new EmailCheckerService('valid-key');
  try {
    await validEmailChecker.checkEmail('invalid-email-format');
  } catch (error) {
    console.log('📧 Email format error handled:', error.message);
  }

  // Handle empty email
  try {
    await validEmailChecker.checkEmail('');
  } catch (error) {
    console.log('🚫 Empty email error handled:', error.message);
  }
}

// Example 5: Configuration management
async function configurationExamples() {
  console.log('\n=== Configuration Management ===');

  const emailChecker = new EmailCheckerService();

  // Check service status
  const status = emailChecker.getServiceStatus();
  console.log('⚙️ Service status:', status);

  // Update API key
  const keyUpdated = emailChecker.updateApiKey('new-api-key');
  console.log('🔄 API key updated:', keyUpdated);

  // Check status after update
  const newStatus = emailChecker.getServiceStatus();
  console.log('⚙️ Updated service status:', newStatus);
}

// Example 6: Advanced usage with custom processing
async function advancedUsage() {
  console.log('\n=== Advanced Usage ===');

  const emailChecker = new EmailCheckerService('your-api-key-here');

  // Custom email validation with additional processing
  const customEmails = ['user1@company.com', 'user2@company.com', 'external@partner.org'];

  console.log('🔍 Processing emails with custom logic...');

  for (const email of customEmails) {
    try {
      const result = await emailChecker.checkEmail(email);

      // Custom processing based on domain
      const domain = email.split('@')[1];
      const isInternal = domain === 'company.com';

      console.log(`📧 ${email}:`);
      console.log(`   Valid: ${result.isValid}`);
      console.log(`   Domain: ${domain} (${isInternal ? 'Internal' : 'External'})`);
      console.log(`   Check ID: ${result.id}`);

      // Add delay between checks to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`❌ ${email}: ${error.message}`);
    }
  }
}

// Example 7: Cleanup and maintenance
async function cleanupExamples() {
  console.log('\n=== Cleanup and Maintenance ===');

  const emailChecker = new EmailCheckerService('your-api-key-here');

  // Add some test data
  try {
    await emailChecker.checkEmail('cleanup1@example.com');
    await emailChecker.checkEmail('cleanup2@example.com');
  } catch (error) {
    // Ignore errors for this example
  }

  console.log(`📊 Checks before cleanup: ${emailChecker.getCheckHistory().length}`);

  // Clear all history
  const cleared = emailChecker.clearHistory();
  console.log(`🧹 History cleared: ${cleared}`);
  console.log(`📊 Checks after cleanup: ${emailChecker.getCheckHistory().length}`);
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 Email Checker Module - Usage Examples\n');

  try {
    await basicEmailCheck();
    await batchEmailCheck();
    await historyManagement();
    await errorHandlingExamples();
    await configurationExamples();
    await advancedUsage();
    await cleanupExamples();

    console.log('\n✅ All examples completed successfully!');
    console.log('\n💡 Tips:');
    console.log('   - Set EMAIL_CHECKER_API_KEY environment variable');
    console.log('   - Use batch checking for multiple emails');
    console.log('   - Monitor statistics for usage insights');
    console.log('   - Implement proper error handling in production');
  } catch (error) {
    console.error('\n❌ Example execution failed:', error.message);
  }
}

// Export for use in other modules
export {
  basicEmailCheck,
  batchEmailCheck,
  historyManagement,
  errorHandlingExamples,
  configurationExamples,
  advancedUsage,
  cleanupExamples,
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
