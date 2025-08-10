/**
 * README Badges - Basic Usage Example
 *
 * This example demonstrates how to:
 * 1) Generate shields.io badge markdown for a tech stack
 * 2) Update a README.md file with idempotent markers
 *
 * Requires Node.js v20+ (fetch is globally available).
 */

const BASE_URL = 'http://localhost:3000'; // Adjust if your MCP server runs elsewhere

async function generateBadges() {
  const payload = {
    action: 'generate',
    githubUrl: 'https://github.com/your-org/your-repo',
    badges: [
      // strings resolve via preset map
      'react',
      'node',
      'postgres',
      // or descriptor objects (fully custom)
      {
        key: 'custom',
        label: 'Custom',
        color: 'ff00aa',
        logo: 'sparkles',
        link: 'https://example.com',
      },
    ],
    // Optional custom link target overrides per badge key
    linkMap: {
      react: 'https://react.dev/',
      node: 'https://nodejs.org/',
      postgres: 'https://www.postgresql.org/',
    },
  };

  const res = await fetch(`${BASE_URL}/tools/readme-badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('Failed to generate badges:', await safeText(res));
    return;
  }

  const data = await res.json();
  console.log('Generated markdown:\n', data.result?.markdown || data.markdown);
}

async function updateReadme() {
  const payload = {
    action: 'update',
    readmePath: process.env.README_PATH || `${process.cwd()}/README.md`,
    githubUrl: 'https://github.com/your-org/your-repo',
    insertAt: 'auto', // 'top' | 'bottom' | 'auto'
    marker: 'readme-badges',
    badges: ['react', 'node', 'postgres'],
    linkMap: {
      react: 'https://react.dev/',
      node: 'https://nodejs.org/',
      postgres: 'https://www.postgresql.org/',
    },
  };

  const res = await fetch(`${BASE_URL}/tools/readme-badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('Failed to update README:', await safeText(res));
    return;
  }

  const data = await res.json();
  console.log('Update result:', data.result || data);
}

async function detectTech() {
  const payload = { action: 'detect', rootDir: process.cwd() };

  const res = await fetch(`${BASE_URL}/tools/readme-badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('Failed to detect tech:', await safeText(res));
    return;
  }

  const data = await res.json();
  console.log('Detected badges:', data.result?.badges || data.badges);
}

async function main() {
  console.log('--- Generate Badge Markdown ---');
  await generateBadges();

  console.log('\n--- Detect Tech (heuristic) ---');
  await detectTech();

  console.log('\n--- Update README.md ---');
  await updateReadme();

  console.log('\nDone.');
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '<no-body>';
  }
}

// Uncomment to run when executing this file directly
// main();

export { generateBadges, updateReadme, detectTech, main };
