/**
 * Lighthouse Module Utilities
 *
 * This file contains utility functions for the Lighthouse module.
 */

/**
 * Validate if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract key performance metrics from Lighthouse report
 * @param {Object} lhr - Lighthouse report
 * @returns {Object} Extracted metrics
 */
export function extractMetrics(lhr) {
  const metrics = {};

  if (lhr.audits) {
    // Core Web Vitals and performance metrics
    const metricAudits = {
      'first-contentful-paint': 'firstContentfulPaint',
      'largest-contentful-paint': 'largestContentfulPaint',
      'first-meaningful-paint': 'firstMeaningfulPaint',
      'speed-index': 'speedIndex',
      interactive: 'timeToInteractive',
      'cumulative-layout-shift': 'cumulativeLayoutShift',
      'total-blocking-time': 'totalBlockingTime',
      'max-potential-fid': 'maxPotentialFirstInputDelay',
    };

    Object.keys(metricAudits).forEach(auditKey => {
      if (lhr.audits[auditKey]) {
        const audit = lhr.audits[auditKey];
        metrics[metricAudits[auditKey]] = {
          value: audit.numericValue,
          displayValue: audit.displayValue,
          score: audit.score,
          unit: audit.numericUnit || 'ms',
        };
      }
    });
  }

  return metrics;
}

/**
 * Format Lighthouse report for better readability
 * @param {Object} report - Raw Lighthouse report
 * @returns {Object} Formatted report
 */
export function formatLighthouseReport(report) {
  return {
    id: report.id,
    url: report.url,
    timestamp: report.timestamp,
    performance: {
      score: report.scores.performance?.displayValue || 0,
      metrics: report.metrics,
    },
    opportunities: report.opportunities.map(opp => ({
      title: opp.title,
      description: opp.description,
      potentialSavings: opp.displayValue,
      impact: categorizeImpact(opp.numericValue),
    })),
    diagnostics: report.diagnostics.map(diag => ({
      title: diag.title,
      description: diag.description,
      severity: categorizeSeverity(diag.score),
    })),
  };
}

/**
 * Categorize the impact of an opportunity based on potential savings
 * @param {number} numericValue - Numeric value of the opportunity
 * @returns {string} Impact category
 */
export function categorizeImpact(numericValue) {
  if (numericValue >= 1000) return 'high';
  if (numericValue >= 500) return 'medium';
  return 'low';
}

/**
 * Categorize the severity of a diagnostic based on score
 * @param {number} score - Score of the diagnostic
 * @returns {string} Severity category
 */
export function categorizeSeverity(score) {
  if (score === null) return 'info';
  if (score < 0.5) return 'high';
  if (score < 0.9) return 'medium';
  return 'low';
}

/**
 * Generate a performance grade based on score
 * @param {number} score - Performance score (0-1)
 * @returns {string} Performance grade
 */
export function getPerformanceGrade(score) {
  const percentage = Math.round(score * 100);
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Create a delayed response (for testing purposes)
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export function delayedResponse(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate audit options
 * @param {Object} options - Audit options to validate
 * @returns {boolean} Whether options are valid
 */
export function validateAuditOptions(options) {
  if (!options || typeof options !== 'object') {
    return true; // Empty options are valid
  }

  // Validate categories if provided
  if (options.categories) {
    const validCategories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'];
    if (!Array.isArray(options.categories)) {
      return false;
    }
    for (const category of options.categories) {
      if (!validCategories.includes(category)) {
        return false;
      }
    }
  }

  // Validate headless option
  if ('headless' in options && typeof options.headless !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * Format response for API endpoints
 * @param {*} data - Data to format
 * @param {string} status - Response status
 * @returns {Object} Formatted response
 */
export function formatResponse(data, status = 'success') {
  return {
    status,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a simple text summary of a Lighthouse report
 * @param {Object} report - Lighthouse report
 * @returns {string} Text summary
 */
export function generateTextSummary(report) {
  const performanceScore = report.scores.performance?.displayValue || 0;
  const grade = getPerformanceGrade(performanceScore / 100);

  let summary = `Lighthouse Performance Report for ${report.url}\n`;
  summary += `Performance Score: ${performanceScore}/100 (Grade: ${grade})\n`;
  summary += `Audit Date: ${new Date(report.timestamp).toLocaleString()}\n\n`;

  if (report.metrics.firstContentfulPaint) {
    summary += `First Contentful Paint: ${report.metrics.firstContentfulPaint.displayValue}\n`;
  }
  if (report.metrics.largestContentfulPaint) {
    summary += `Largest Contentful Paint: ${report.metrics.largestContentfulPaint.displayValue}\n`;
  }
  if (report.metrics.speedIndex) {
    summary += `Speed Index: ${report.metrics.speedIndex.displayValue}\n`;
  }
  if (report.metrics.timeToInteractive) {
    summary += `Time to Interactive: ${report.metrics.timeToInteractive.displayValue}\n`;
  }

  if (report.opportunities.length > 0) {
    summary += '\nTop Opportunities for Improvement:\n';
    report.opportunities.slice(0, 3).forEach((opp, index) => {
      summary += `${index + 1}. ${opp.title} - ${opp.displayValue}\n`;
    });
  }

  return summary;
}
