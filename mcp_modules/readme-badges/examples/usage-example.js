/**
 * README Badges - Usage Examples
 *
 * Demonstrates:
 * - Generate shields.io badge markdown for a tech stack
 * - Detect likely tech from a repo (heuristic)
 * - Update README.md with idempotent markers
 *
 * Node.js v20+ required.
 */

const API_BASE_URL = 'http://localhost:3000'; // Adjust to your MCP server base URL

async function generateExample() {
  console.log('=== Generate Badges Example ===');
  const payload = {
    action: 'generate',
    githubUrl: 'https://github.com/your-org/your-repo',
    badges: [
      'react',
      'node',
      'postgres',
      {
        key: 'custom',
        label: 'Custom',
        color: '000000',
        logo: 'sparkles',
        link: 'https://example.com',
      },
    ],
    linkMap: {
      react: 'https://react.dev/',
      node: 'https://nodejs.org/',
      postgres: 'https://www.postgresql.org/',
    },
  };

  const res = await fetch(`${API_BASE_URL}/tools/readme-badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('Failed to generate badges:', await safeText(res));
    return;
  }
  const data = await res.json();
  const markdown = data.result?.markdown || data.markdown || '';
  console.log(markdown);
}

async function detectExample() {
  console.log('=== Detect Tech Example ===');
  const payload = { action: 'detect', rootDir: process.cwd() };

  const res = await fetch(`${API_BASE_URL}/tools/readme-badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('Failed to detect tech:', await safeText(res));
    return;
  }
  const data = await res.json();
  const badges = data.result?.badges || data.badges || [];
  console.log('Detected:', badges);
}

async function updateExample() {
  console.log('=== Update README Example ===');
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

  const res = await fetch(`${API_BASE_URL}/tools/readme-badges`, {
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

async function main() {
  await generateExample();
  await detectExample();
  await updateExample();
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '<no-body>';
  }
}

// Uncomment to run directly
// main();

export { generateExample, detectExample, updateExample, main };
