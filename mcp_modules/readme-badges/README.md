# README Badges Module

Generate shields.io badges and update your project's README.md with an idempotent, auto-managed badge block. This module provides:

- A simple API to generate badge markdown
- An idempotent README updater using HTML comment markers
- A minimal tech detection helper to suggest badges based on your codebase

Works with Node.js v20+ (ESM). No external dependencies.

## Features

- Shields.io badges with:
  - style: for-the-badge
  - white logo by default (logoColor=fff)
  - configurable logo and label color
- Idempotent README updates with `<!-- readme-badges:start --> ... <!-- readme-badges:end -->`
- Insert modes: top, bottom, or auto (below first `#` title if present)
- Heuristic tech detection from package.json to propose badges
- MCP tool + HTTP endpoints to integrate into your MCP server

## Endpoints

- GET `/readme-badges` — Module info
- POST `/readme-badges/generate` — Generate badge markdown
- POST `/readme-badges/update` — Update README.md with badges
- POST `/readme-badges/detect` — Detect likely tech stack keys
- GET `/tools/readme-badges/info` — Tool schema
- POST `/tools/readme-badges` — MCP tool endpoint

## MCP Tool API

Action payload:

```json
{
  "action": "generate | update | detect",
  "badges": ["react", "node", "postgres"],
  "githubUrl": "https://github.com/your-org/your-repo",
  "readmePath": "/path/to/README.md",
  "insertAt": "auto | top | bottom",
  "marker": "readme-badges",
  "linkMap": { "react": "https://react.dev/" },
  "rootDir": "/path/to/project"
}
```

Response:

- For `generate`: `{ result: { markdown, count, timestamp } }`
- For `update`: `{ result: { changed, position, marker, bytes, timestamp } }`
- For `detect`: `{ result: { badges, count, timestamp } }`

## Preset Keys

These badge keys are recognized out-of-the-box and render with curated label, color, and logo. Destination URLs are NOT hardcoded; provide them via `linkMap` or fallback to `githubUrl`.

- Frontends: `react`, `vue`, `svelte`, `angular`, `solid`, `marko`, `htmx`
- Runtimes: `node`, `deno`, `bun`
- Databases: `postgres`, `sqlite`, `mysql`, `mongodb`

You can also pass fully custom descriptors:

```js
{ key: 'custom', label: 'Custom', color: 'ff00aa', logo: 'sparkles', link: 'https://example.com' }
```

## Usage

Generate badge markdown:

```js
// Via MCP tool
await fetch('http://localhost:3000/tools/readme-badges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'generate',
    githubUrl: 'https://github.com/your-org/your-repo',
    badges: ['react', 'node', 'postgres'],
    linkMap: {
      react: 'https://react.dev/',
      node: 'https://nodejs.org/',
      postgres: 'https://www.postgresql.org/',
    },
  }),
});
```

Update README.md (idempotent):

```js
await fetch('http://localhost:3000/tools/readme-badges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    readmePath: `${process.cwd()}/README.md`,
    githubUrl: 'https://github.com/your-org/your-repo',
    insertAt: 'auto', // 'top' | 'bottom' | 'auto'
    marker: 'readme-badges',
    badges: ['react', 'node', 'postgres'],
  }),
});
```

Detect tech (heuristic):

```js
await fetch('http://localhost:3000/tools/readme-badges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'detect', rootDir: process.cwd() }),
});
```

## Examples

- [examples/basic-usage.js](examples/basic-usage.js)
- [examples/usage-example.js](examples/usage-example.js)

## Library API

Service methods are available within the module:

- generate({ badges, githubUrl, linkMap }) => markdown string
- updateReadme({ readmePath, badges, githubUrl, insertAt, marker, linkMap }) => Promise<{ changed, position, marker, bytes }>
- detectTech({ rootDir }) => Promise<string[]>

See:

- [src/service.js](src/service.js)
- [src/controller.js](src/controller.js)
- [src/utils.js](src/utils.js)
- [index.js](index.js)

## Idempotent Markers

The updater writes a single block, replacing it on subsequent runs:

```
<!-- readme-badges:start -->
[![React](...)](link) [![Node](...)](link) ...
<!-- readme-badges:end -->
```

Avoid manually editing inside the block. To change content, call the tool again.

## Badges Styling

- Shields.io URL pattern used:
  - `https://img.shields.io/badge/{label}-{color}.svg?logo={logo}&logoColor={logoColor}&style=for-the-badge`
- Defaults: `style=for-the-badge`, `logoColor=fff`

## Non-Goals

- This module does not hardcode destination URLs from other projects
- Detection is heuristic by design (simple and fast). Adjust `badges` explicitly when needed.

## Tests

Run tests (from module directory):

```sh
pnpm install
pnpm test
```

Tests cover:

- Generation (style and linking)
- README idempotent updates (markers, positioning)
- Tech detection heuristics

See:

- [test/readme-badges.test.js](test/readme-badges.test.js)

## License

MIT
