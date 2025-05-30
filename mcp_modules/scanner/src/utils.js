/**
 * Scanner Module Utilities
 *
 * This file contains utility functions for the scanner module.
 */

/**
 * Validate a target URL or IP address
 * @param {string} target - Target URL or IP address
 * @returns {boolean} Whether the target is valid
 */
export function validateTarget(target) {
  if (!target) return false;

  // Check if it's a valid URL
  if (isValidUrl(target)) return true;

  // Check if it's a valid IP address
  if (isValidIpAddress(target)) return true;

  return false;
}

/**
 * Check if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (error) {
    return false;
  }
}

/**
 * Check if a string is a valid IP address
 * @param {string} ip - IP address to validate
 * @returns {boolean} Whether the IP address is valid
 */
export function isValidIpAddress(ip) {
  // IPv4 regex pattern
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

  if (!ipv4Pattern.test(ip)) return false;

  // Check if each octet is valid (0-255)
  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Parse a URL and extract its components
 * @param {string} url - URL to parse
 * @returns {Object} Parsed URL components
 */
export function parseUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80'),
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      hash: parsedUrl.hash,
      origin: parsedUrl.origin,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Format a timestamp as a human-readable date string
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    return timestamp;
  }
}

/**
 * Format a duration in seconds as a human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(seconds) {
  if (!seconds) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
}

/**
 * Get a color for a severity level
 * @param {string} severity - Severity level (critical, high, medium, low, info)
 * @returns {string} Color code
 */
export function getSeverityColor(severity) {
  if (!severity) return '#808080'; // gray for unknown

  const severityMap = {
    critical: '#FF0000', // red
    high: '#FF6600', // orange
    medium: '#FFCC00', // yellow
    low: '#00CC00', // green
    info: '#0099FF', // blue
  };

  return severityMap[severity.toLowerCase()] || '#808080';
}

/**
 * Sanitize HTML content
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (!html) return '';

  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
