/**
 * README Badges Controller
 *
 * HTTP route handlers for the readme-badges module endpoints.
 */

import { UnsafePathError } from '../../../src/utils/path-guard.js';
import { readmeBadgesService } from './service.js';

/**
 * Map a thrown error to an HTTP status. Rejected paths are caller errors, not
 * server faults, and must not be reported as 500.
 * @param {Error} error
 * @returns {400|500}
 */
export function statusForError(error) {
  return error instanceof UnsafePathError || /^Invalid marker/.test(error?.message ?? '')
    ? 400
    : 500;
}

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
    return c.json({ error: error.message }, statusForError(error));
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
    return c.json({ error: error.message }, statusForError(error));
  }
}

async function safeJson(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}
