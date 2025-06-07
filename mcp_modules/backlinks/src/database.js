/**
 * Better-SQLite3 Database Layer for Backlinks Module
 *
 * Provides persistent storage for campaigns, submissions, and discovered sites.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Database wrapper class with better-sqlite3
 */
export class BacklinksDatabase {
  constructor(dbPath = './data/backlinks.db') {
    this.dbPath = dbPath;
    this.db = null;

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Initialize database connection and create tables
   */
  async init() {
    this.db = new Database(this.dbPath);
    console.log(`Connected to SQLite database: ${this.dbPath}`);
    await this.createTables();
  }

  /**
   * Create database tables if they don't exist
   */
  async createTables() {
    const tables = [
      // Campaigns table
      `CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        product_url TEXT NOT NULL,
        description TEXT NOT NULL,
        keywords TEXT, -- JSON array
        target_sites TEXT, -- JSON array
        status TEXT DEFAULT 'created',
        created_at TEXT NOT NULL,
        updated_at TEXT,
        discovered_sites TEXT, -- JSON array
        settings TEXT -- JSON object
      )`,

      // Submissions table
      `CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        site_url TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        submitted_at TEXT,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        content TEXT, -- JSON object
        result TEXT, -- JSON object
        error TEXT,
        follow_up_sent INTEGER DEFAULT 0,
        follow_up_at TEXT,
        FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
      )`,

      // Discovered sites cache table
      `CREATE TABLE IF NOT EXISTS discovered_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        title TEXT,
        description TEXT,
        score INTEGER DEFAULT 0,
        eligible INTEGER DEFAULT 0,
        site_type TEXT,
        discovered_at TEXT NOT NULL,
        source TEXT,
        query TEXT,
        site_info TEXT -- JSON object
      )`,
    ];

    for (const tableSQL of tables) {
      this.db.exec(tableSQL);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)',
      'CREATE INDEX IF NOT EXISTS idx_submissions_campaign_id ON submissions(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status)',
      'CREATE INDEX IF NOT EXISTS idx_discovered_sites_url ON discovered_sites(url)',
      'CREATE INDEX IF NOT EXISTS idx_discovered_sites_score ON discovered_sites(score)',
    ];

    for (const indexSQL of indexes) {
      this.db.exec(indexSQL);
    }
  }

  /**
   * Database run method (synchronous with better-sqlite3)
   */
  run(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(params);
    return { lastID: result.lastInsertRowid, changes: result.changes };
  }

  /**
   * Database get method (synchronous with better-sqlite3)
   */
  get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.get(params);
  }

  /**
   * Database all method (synchronous with better-sqlite3)
   */
  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(params);
  }

  // Campaign operations

  /**
   * Save campaign to database
   */
  async saveCampaign(campaign) {
    const sql = `INSERT OR REPLACE INTO campaigns 
      (id, product_url, description, keywords, target_sites, status, created_at, updated_at, discovered_sites, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      campaign.id,
      campaign.productUrl,
      campaign.description,
      JSON.stringify(campaign.keywords || []),
      JSON.stringify(campaign.targetSites || []),
      campaign.status,
      campaign.createdAt,
      campaign.updatedAt || new Date().toISOString(),
      JSON.stringify(campaign.discoveredSites || []),
      JSON.stringify(campaign.settings || {}),
    ];

    return this.run(sql, params);
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId) {
    const sql = 'SELECT * FROM campaigns WHERE id = ?';
    const row = this.get(sql, [campaignId]);

    if (!row) return null;

    return this.parseCampaignRow(row);
  }

  /**
   * Get all campaigns
   */
  async getAllCampaigns() {
    const sql = 'SELECT * FROM campaigns ORDER BY created_at DESC';
    const rows = this.all(sql);

    return rows.map(row => this.parseCampaignRow(row));
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId) {
    const sql = 'DELETE FROM campaigns WHERE id = ?';
    return this.run(sql, [campaignId]);
  }

  /**
   * Parse campaign row from database
   */
  parseCampaignRow(row) {
    return {
      id: row.id,
      productUrl: row.product_url,
      description: row.description,
      keywords: JSON.parse(row.keywords || '[]'),
      targetSites: JSON.parse(row.target_sites || '[]'),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      discoveredSites: JSON.parse(row.discovered_sites || '[]'),
      settings: JSON.parse(row.settings || '{}'),
      submissions: [], // Will be loaded separately if needed
    };
  }

  // Submission operations

  /**
   * Save submission to database
   */
  async saveSubmission(submission) {
    const sql = `INSERT OR REPLACE INTO submissions 
      (id, campaign_id, site_url, status, created_at, submitted_at, attempts, max_attempts, content, result, error, follow_up_sent, follow_up_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      submission.id,
      submission.campaignId,
      submission.siteUrl,
      submission.status,
      submission.createdAt,
      submission.submittedAt || null,
      submission.attempts || 0,
      submission.maxAttempts || 3,
      JSON.stringify(submission.content || {}),
      JSON.stringify(submission.result || {}),
      submission.error || null,
      submission.followUpSent ? 1 : 0,
      submission.followUpAt || null,
    ];

    return this.run(sql, params);
  }

  /**
   * Get submission by ID
   */
  async getSubmission(submissionId) {
    const sql = 'SELECT * FROM submissions WHERE id = ?';
    const row = this.get(sql, [submissionId]);

    if (!row) return null;

    return this.parseSubmissionRow(row);
  }

  /**
   * Get all submissions for a campaign
   */
  async getCampaignSubmissions(campaignId) {
    const sql = 'SELECT * FROM submissions WHERE campaign_id = ? ORDER BY created_at DESC';
    const rows = this.all(sql, [campaignId]);

    return rows.map(row => this.parseSubmissionRow(row));
  }

  /**
   * Get all submissions
   */
  async getAllSubmissions() {
    const sql = 'SELECT * FROM submissions ORDER BY created_at DESC';
    const rows = this.all(sql);

    return rows.map(row => this.parseSubmissionRow(row));
  }

  /**
   * Parse submission row from database
   */
  parseSubmissionRow(row) {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      siteUrl: row.site_url,
      status: row.status,
      createdAt: row.created_at,
      submittedAt: row.submitted_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      content: JSON.parse(row.content || '{}'),
      result: JSON.parse(row.result || '{}'),
      error: row.error,
      followUpSent: row.follow_up_sent === 1,
      followUpAt: row.follow_up_at,
    };
  }

  // Discovered sites operations

  /**
   * Save discovered site
   */
  async saveDiscoveredSite(site) {
    const sql = `INSERT OR REPLACE INTO discovered_sites 
      (url, title, description, score, eligible, site_type, discovered_at, source, query, site_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      site.url,
      site.title || '',
      site.description || '',
      site.score || 0,
      site.eligible ? 1 : 0,
      site.siteType || '',
      site.discoveredAt || new Date().toISOString(),
      site.source || '',
      site.query || '',
      JSON.stringify(site.siteInfo || {}),
    ];

    return this.run(sql, params);
  }

  /**
   * Get discovered site by URL
   */
  async getDiscoveredSite(url) {
    const sql = 'SELECT * FROM discovered_sites WHERE url = ?';
    const row = this.get(sql, [url]);

    if (!row) return null;

    return this.parseDiscoveredSiteRow(row);
  }

  /**
   * Get top discovered sites by score
   */
  async getTopDiscoveredSites(limit = 50) {
    const sql = 'SELECT * FROM discovered_sites WHERE eligible = 1 ORDER BY score DESC LIMIT ?';
    const rows = this.all(sql, [limit]);

    return rows.map(row => this.parseDiscoveredSiteRow(row));
  }

  /**
   * Parse discovered site row from database
   */
  parseDiscoveredSiteRow(row) {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      description: row.description,
      score: row.score,
      eligible: row.eligible === 1,
      siteType: row.site_type,
      discoveredAt: row.discovered_at,
      source: row.source,
      query: row.query,
      siteInfo: JSON.parse(row.site_info || '{}'),
    };
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const campaignCount = this.get('SELECT COUNT(*) as count FROM campaigns');
    const submissionCount = this.get('SELECT COUNT(*) as count FROM submissions');
    const siteCount = this.get('SELECT COUNT(*) as count FROM discovered_sites');

    return {
      campaigns: campaignCount.count,
      submissions: submissionCount.count,
      discoveredSites: siteCount.count,
    };
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db && this.db.open) {
      this.db.close();
      console.log('Database connection closed');
      this.db = null;
    }
  }
}

// Export singleton instance
export const backlinksDb = new BacklinksDatabase();
