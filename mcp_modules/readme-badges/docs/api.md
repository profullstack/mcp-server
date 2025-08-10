# README Badges API Documentation

## Overview

The README Badges module provides tools for generating shields.io badges and updating README.md files with idempotent badge blocks. This module supports both HTTP endpoints and MCP tool integration.

## Service API

### `generate(params)`

Generate badge markdown from badge specifications.

**Parameters:**

- `badges` (Array<string|Object>): Array of badge keys or badge descriptor objects
- `githubUrl` (string, optional): Default GitHub URL for badge links
- `linkMap` (Record<string,string>, optional): Custom URL mappings for badge keys

**Returns:** `string` - Generated markdown with badges

**Example:**

```javascript
import { readmeBadgesService } from './src/service.js';

const markdown = readmeBadgesService.generate({
  badges: ['react', 'node', 'postgres'],
  githubUrl: 'https://github.com/user/repo',
  linkMap: {
    react: 'https://react.dev/',
    node: 'https://nodejs.org/',
  },
});
```

### `updateReadme(params)`

Update README.md file with idempotent badge block using HTML comment markers.

**Parameters:**

- `readmePath` (string, required): Path to README.md file
- `badges` (Array<string|Object>, required): Array of badge keys or descriptors
- `githubUrl` (string, optional): Default GitHub URL for badge links
- `insertAt` ('top'|'bottom'|'auto', optional): Where to insert badges (default: 'auto')
- `marker` (string, optional): HTML comment marker name (default: 'readme-badges')
- `linkMap` (Record<string,string>, optional): Custom URL mappings

**Returns:** `Promise<Object>` with properties:

- `changed` (boolean): Whether the file was modified
- `position` (string): Where badges were inserted
- `marker` (string): Marker name used
- `bytes` (number): File size after update (if changed)

**Example:**

```javascript
const result = await readmeBadgesService.updateReadme({
  readmePath: './README.md',
  badges: ['react', 'node'],
  githubUrl: 'https://github.com/user/repo',
  insertAt: 'auto',
  marker: 'readme-badges',
});
```

### `detectTech(params)`

Detect likely technology badges from project files using heuristics.

**Parameters:**

- `rootDir` (string, optional): Project root directory (default: `process.cwd()`)

**Returns:** `Promise<string[]>` - Array of detected badge keys

**Example:**

```javascript
const badges = await readmeBadgesService.detectTech({
  rootDir: '/path/to/project',
});
// Returns: ['node', 'react', 'postgres']
```

## HTTP Endpoints

### GET `/readme-badges`

Returns module information and status.

### POST `/readme-badges/generate`

Generate badge markdown.

**Request Body:**

```json
{
  "badges": ["react", "node", "postgres"],
  "githubUrl": "https://github.com/user/repo",
  "linkMap": {
    "react": "https://react.dev/"
  }
}
```

### POST `/readme-badges/update`

Update README.md with badges.

**Request Body:**

```json
{
  "readmePath": "/path/to/README.md",
  "badges": ["react", "node"],
  "githubUrl": "https://github.com/user/repo",
  "insertAt": "auto",
  "marker": "readme-badges"
}
```

### POST `/readme-badges/detect`

Detect technology stack from project files.

**Request Body:**

```json
{
  "rootDir": "/path/to/project"
}
```

## MCP Tool Integration

### GET `/tools/readme-badges/info`

Returns MCP tool schema information.

### POST `/tools/readme-badges`

Execute MCP tool actions.

**Request Body:**

```json
{
  "action": "generate|update|detect",
  "badges": ["react", "node", "postgres"],
  "githubUrl": "https://github.com/user/repo",
  "readmePath": "/path/to/README.md",
  "insertAt": "auto|top|bottom",
  "marker": "readme-badges",
  "linkMap": {
    "react": "https://react.dev/"
  },
  "rootDir": "/path/to/project"
}
```

**Response Format:**

- For `generate`: `{ result: { markdown, count, timestamp } }`
- For `update`: `{ result: { changed, position, marker, bytes, timestamp } }`
- For `detect`: `{ result: { badges, count, timestamp } }`

## Badge Specifications

### Preset Badge Keys

The following badge keys are recognized with predefined styling:

**Frontends:**

- `react` - React (color: #20232a, logo: react)
- `vue` - Vue.js (color: #4FC08D, logo: vuedotjs)
- `svelte` - Svelte (color: #f1413d, logo: svelte)
- `angular` - Angular (color: #DD0031, logo: angular)
- `solid` - Solid.js (color: #2C4F7C, logo: solid)
- `marko` - Marko (color: #2596BE, logo: marko)
- `htmx` - HTMX (color: #36C, logo: htmx)

**Runtimes:**

- `node` - Node.js (color: #6DA55F, logo: node.js)
- `deno` - Deno (color: #000000, logo: deno)
- `bun` - Bun (color: #000000, logo: bun)

**Databases:**

- `postgres` - PostgreSQL (color: #316192, logo: postgresql)
- `sqlite` - SQLite (color: #07405e, logo: sqlite)
- `mysql` - MySQL (color: #4479A1, logo: mysql)
- `mongodb` - MongoDB (color: #4ea94b, logo: mongodb)

### Custom Badge Descriptors

You can also provide custom badge objects:

```javascript
{
  key: 'custom',
  label: 'Custom Badge',
  color: 'ff00aa',
  logo: 'sparkles',
  logoColor: 'fff',
  link: 'https://example.com'
}
```

## Idempotent Updates

The module uses HTML comment markers to create idempotent updates:

```markdown
<!-- readme-badges:start -->

[![React](https://img.shields.io/badge/React-20232a.svg?logo=react&logoColor=61DAFB&style=for-the-badge)](https://react.dev/)

<!-- readme-badges:end -->
```

- Subsequent updates replace the content between markers
- Manual edits inside the block will be overwritten
- The marker name can be customized via the `marker` parameter

## Insert Positions

- `top` - Insert at the beginning of the file
- `bottom` - Insert at the end of the file
- `auto` - Insert below the first H1 heading if present, otherwise at the top

## Error Handling

All service methods include proper error handling:

- File not found errors for README operations
- Invalid badge specifications
- JSON parsing errors for package.json detection
- File system permission errors

## Dependencies

The module has zero external dependencies and uses only Node.js built-in modules:

- `node:fs/promises` - File system operations
- `node:path` - Path utilities
