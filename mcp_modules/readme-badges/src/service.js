// README Badges service implementation (ESM, Node 20+)
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { toMarkdownBadge } from './utils.js';

const DEFAULT_STYLE = 'for-the-badge';
const DEFAULT_LOGO_COLOR = 'fff';

// Minimal, opinionated badge presets to cover common stack keys.
// Note: No external destination URLs here; links are supplied via githubUrl or linkMap.
const KNOWN_BADGES = {
  // Frontends
  react: { key: 'react', label: 'React', color: '20232a', logo: 'react', logoColor: '61DAFB' },
  vue: { key: 'vue', label: 'Vue', color: '4FC08D', logo: 'vuedotjs' },
  svelte: { key: 'svelte', label: 'Svelte', color: 'f1413d', logo: 'svelte' },
  angular: { key: 'angular', label: 'Angular', color: 'DD0031', logo: 'angular' },
  solid: { key: 'solid', label: 'Solid', color: '2C4F7C', logo: 'solid' },
  marko: { key: 'marko', label: 'Marko', color: '2596BE', logo: 'marko' },
  htmx: { key: 'htmx', label: 'HTMX', color: '36C', logo: 'htmx' },

  // Runtimes
  node: { key: 'node', label: 'Node', color: '6DA55F', logo: 'node.js' },
  deno: { key: 'deno', label: 'Deno', color: '000000', logo: 'deno' },
  bun: { key: 'bun', label: 'Bun', color: '000000', logo: 'bun' },

  // Databases
  postgres: { key: 'postgres', label: 'PostgreSQL', color: '316192', logo: 'postgresql' },
  sqlite: { key: 'sqlite', label: 'SQLite', color: '07405e', logo: 'sqlite' },
  mysql: { key: 'mysql', label: 'MySQL', color: '4479A1', logo: 'mysql' },
  mongodb: { key: 'mongodb', label: 'MongoDB', color: '4ea94b', logo: 'mongodb' },
};

// Stable output order when auto-detecting
const ORDER = [
  'react',
  'vue',
  'svelte',
  'angular',
  'solid',
  'marko',
  'htmx',
  'node',
  'deno',
  'bun',
  'postgres',
  'sqlite',
  'mysql',
  'mongodb',
];

// Normalize a badge entry (string key or explicit descriptor)
function normalizeBadge(entry, { githubUrl, linkMap } = {}) {
  if (typeof entry === 'string') {
    const preset = KNOWN_BADGES[entry.toLowerCase()];
    const desc = preset
      ? { ...preset }
      : {
          key: entry,
          label: entry.charAt(0).toUpperCase() + entry.slice(1),
          color: '555555',
          logo: undefined,
        };
    const link = resolveLink(desc.key, desc, githubUrl, linkMap);
    return {
      ...desc,
      link,
      logoColor: desc.logoColor ?? DEFAULT_LOGO_COLOR,
      style: DEFAULT_STYLE,
    };
  }

  // Descriptor object
  const key = (entry.key || entry.label || '').toString().toLowerCase();
  const preset = key ? KNOWN_BADGES[key] : undefined;

  const label =
    entry.label ?? preset?.label ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Badge');
  const color = entry.color ?? preset?.color ?? '555555';
  const logo = entry.logo ?? preset?.logo;
  const logoColor = entry.logoColor ?? preset?.logoColor ?? DEFAULT_LOGO_COLOR;
  const style = entry.style ?? DEFAULT_STYLE;
  const link = entry.link ?? resolveLink(key, { key, label }, githubUrl, linkMap);

  return { key, label, color, logo, logoColor, style, link, labelColor: entry.labelColor };
}

function resolveLink(key, desc, githubUrl, linkMap) {
  if (desc?.link) return desc.link;
  if (linkMap && key && linkMap[key]) return linkMap[key];
  if (githubUrl) return githubUrl;
  return '#';
}

function renderBadgesMarkdown(normalizedBadges) {
  // Single line of badges separated by spaces for compactness
  return normalizedBadges.map(toMarkdownBadge).join(' ');
}

function buildMarkerBlock({ marker, content }) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  // Keep a blank line after start and before end for readability
  return `${start}\n${content}\n${end}\n`;
}

function ensureTrailingNewline(str) {
  return str.endsWith('\n') ? str : `${str}\n`;
}

async function safeRead(path) {
  try {
    return await fs.readFile(path, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      throw new Error(`README not found at ${path}`);
    }
    throw err;
  }
}

/**
 * Generate badge markdown.
 * @param {Object} params
 * @param {Array<string|Object>} params.badges
 * @param {string} [params.githubUrl]
 * @param {Record<string,string>} [params.linkMap]
 * @returns {string} markdown
 */
function generate({ badges, githubUrl, linkMap } = {}) {
  if (!Array.isArray(badges)) {
    throw new Error('badges must be an array');
  }
  const normalized = badges.map(b => normalizeBadge(b, { githubUrl, linkMap }));
  return renderBadgesMarkdown(normalized);
}

/**
 * Update README.md by inserting/updating idempotent marker block with badges.
 * @param {Object} params
 * @param {string} params.readmePath
 * @param {Array<string|Object>} params.badges
 * @param {string} [params.githubUrl]
 * @param {'top'|'bottom'|'auto'} [params.insertAt='auto']
 * @param {string} [params.marker='readme-badges']
 * @param {Record<string,string>} [params.linkMap]
 * @returns {Promise<{changed:boolean, position:string, marker:string, bytes:number}>}
 */
async function updateReadme({
  readmePath,
  badges,
  githubUrl,
  insertAt = 'auto',
  marker = 'readme-badges',
  linkMap,
} = {}) {
  if (!readmePath) throw new Error('readmePath is required');
  if (!Array.isArray(badges)) throw new Error('badges must be an array');

  const markdown = generate({ badges, githubUrl, linkMap });
  const block = buildMarkerBlock({ marker, content: markdown });
  const startToken = `<!-- ${marker}:start -->`;
  const endToken = `<!-- ${marker}:end -->`;

  const original = await safeRead(readmePath);

  // If markers already exist, replace content
  const startIdx = original.indexOf(startToken);
  const endIdx = original.indexOf(endToken);

  let updated;

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = original.slice(0, startIdx);
    // Consume at most one newline character following the end token so replacement remains idempotent.
    let endCut = endIdx + endToken.length;
    if (original[endCut] === '\n') {
      endCut += 1;
    }
    const after = original.slice(endCut);
    updated = `${before}${block}${after}`; // block already includes a trailing newline
  } else {
    // Insert new block
    if (insertAt === 'top') {
      updated = `${block}\n${original}`;
    } else if (insertAt === 'bottom') {
      updated = `${ensureTrailingNewline(original)}\n${block}`;
    } else {
      // auto: insert below first H1 if present, else prepend
      const lines = original.split('\n');
      const h1Index = lines.findIndex(l => l.trim().startsWith('# '));
      if (h1Index !== -1) {
        // Insert after the first blank line following the title, or directly after title
        let insertLine = h1Index + 1;
        while (insertLine < lines.length && lines[insertLine].trim() === '') {
          insertLine++;
          break; // keep one blank line after title
        }
        const before = lines.slice(0, insertLine).join('\n');
        const after = lines.slice(insertLine).join('\n');
        updated = `${ensureTrailingNewline(before)}\n${block}${after ? `\n${after}` : ''}`;
      } else {
        updated = `${block}\n${original}`;
      }
    }
  }

  const changed = updated !== original;
  if (changed) {
    await fs.writeFile(readmePath, updated, 'utf8');
  }

  return {
    changed,
    position: insertAt,
    marker,
    bytes: changed ? Buffer.byteLength(updated, 'utf8') : 0,
  };
}

/**
 * Detect likely tech badges from project files (simple heuristics).
 * @param {Object} params
 * @param {string} [params.rootDir=process.cwd()]
 * @returns {Promise<string[]>} list of badge keys
 */
async function detectTech({ rootDir = process.cwd() } = {}) {
  const detected = new Set();

  // If package.json exists, assume Node
  const pkgPath = join(rootDir, 'package.json');
  let pkg;
  try {
    const txt = await fs.readFile(pkgPath, 'utf8');
    pkg = JSON.parse(txt);
    detected.add('node');
  } catch {
    // ignore
  }

  const deps = {
    ...(pkg?.dependencies || {}),
    ...(pkg?.devDependencies || {}),
    ...(pkg?.peerDependencies || {}),
  };

  // Frontends
  if (deps.react) detected.add('react');
  if (deps.vue || deps['vue@next']) detected.add('vue');
  if (deps.svelte) detected.add('svelte');
  if (deps.angular || deps['@angular/core']) detected.add('angular');
  if (deps['solid-js']) detected.add('solid');
  if (deps.htmx) detected.add('htmx');
  if (deps.marko) detected.add('marko');

  // Databases
  if (deps.pg || deps['@neondatabase/serverless']) detected.add('postgres');
  if (deps.sqlite3 || deps['better-sqlite3']) detected.add('sqlite');
  if (deps.mysql || deps.mysql2) detected.add('mysql');
  if (deps.mongodb || deps.mongoose) detected.add('mongodb');

  // Runtimes (deno/bun markers are not from package.json typically; skip unless explicit)
  // Keep 'node' if package.json exists; add deno/bun only with project markers if desired in future.

  // Return ordered list for determinism
  const all = Array.from(detected);
  all.sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return all;
}

export const readmeBadgesService = {
  generate,
  updateReadme,
  detectTech,
};
