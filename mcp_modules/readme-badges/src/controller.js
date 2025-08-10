/**
 * README Badges Controller
 *
 * HTTP route handlers for the readme-badges module endpoints.
 */

import { readmeBadgesService } from './service.js';

/**
 * Generate markdown badges
 * @param {import('hono').Context} c
 */
export async function generateBadgesHandler(c) {
  try {
    const body = await c.req.json();

    if (!Array.isArray(body.badges)) {
      return c.json({ error: 'Missing or invalid parameter: badges (array required)' }, 400);
    }

    const markdown = readmeBadgesService.generate({
      badges: body.badges,
      githubUrl: body.githubUrl,
      linkMap: body.linkMap,
    });

    return c.json({
      markdown,
      count: body.badges.length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Update README.md with badges using idempotent markers
 * @param {import('hono').Context} c
 */
export async function updateReadmeHandler(c) {
  try {
    const body = await c.req.json();

    if (!body.readmePath || typeof body.readmePath !== 'string') {
      return c.json({ error: 'Missing or invalid parameter: readmePath (string required)' }, 400);
    }
    if (!Array.isArray(body.badges)) {
      return c.json({ error: 'Missing or invalid parameter: badges (array required)' }, 400);
    }
    const insertAt = body.insertAt ?? 'auto';
    if (!['top', 'bottom', 'auto'].includes(insertAt)) {
      return c.json({ error: "insertAt must be one of: 'top' | 'bottom' | 'auto'" }, 400);
    }

    const outcome = await readmeBadgesService.updateReadme({
      readmePath: body.readmePath,
      badges: body.badges,
      githubUrl: body.githubUrl,
      insertAt,
      marker: body.marker ?? 'readme-badges',
      linkMap: body.linkMap,
    });

    return c.json(outcome);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Detect likely technology badges from the project
 * @param {import('hono').Context} c
 */
export async function detectTechHandler(c) {
  try {
    const body = await safeJson(c);
    const detected = await readmeBadgesService.detectTech({
      rootDir: body?.rootDir,
    });

    return c.json({
      badges: detected,
      count: detected.length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

async function safeJson(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}
