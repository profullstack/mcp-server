import { config } from '../core/config.js';

/**
 * Simple logger utility
 * In a production environment, consider using a more robust logging solution
 * like winston, pino, or bunyan
 */
export const logger = {
  /**
   * Log levels
   */
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },

  /**
   * Current log level
   */
  level: config?.logging?.level || 'info',

  /**
   * Formats a log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @returns {string} Formatted log message
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    
    if (config?.logging?.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
      });
    }
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  },

  /**
   * Checks if a log level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} Whether the level should be logged
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  },

  /**
   * Logs an error message
   * @param {string} message - Error message
   */
  error(message) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
    }
  },

  /**
   * Logs a warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
    }
  },

  /**
   * Logs an info message
   * @param {string} message - Info message
   */
  info(message) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message));
    }
  },

  /**
   * Logs a debug message
   * @param {string} message - Debug message
   */
  debug(message) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message));
    }
  },
};