// Tests for README Badges module (Mocha + Chai, ESM)
import { expect } from 'chai';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readmeBadgesService } from '../src/service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(join(tmpdir(), 'readme-badges-'));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('readme-badges service', () => {
  describe('generate()', () => {
    it('creates markdown badges using shields.io with for-the-badge style and provided linkMap', () => {
      const badges = ['react', 'node', 'postgres'];
      const linkMap = {
        react: 'https://react.dev/',
        node: 'https://nodejs.org/',
        postgres: 'https://www.postgresql.org/',
      };
      const markdown = readmeBadgesService.generate({
        badges,
        githubUrl: 'https://github.com/acme/repo',
        linkMap,
      });

      expect(markdown).to.be.a('string');
      expect(markdown).to.include('img.shields.io');
      expect(markdown).to.include('style=for-the-badge');
      expect(markdown).to.include('(https://react.dev/)');
      expect(markdown).to.include('(https://nodejs.org/)');
      expect(markdown).to.include('(https://www.postgresql.org/)');
    });

    it('falls back to githubUrl when linkMap is not provided', () => {
      const badges = ['react', 'node'];
      const githubUrl = 'https://github.com/org/project';
      const markdown = readmeBadgesService.generate({ badges, githubUrl });
      expect(markdown).to.include(`(${githubUrl})`);
    });

    it('supports explicit badge descriptor objects', () => {
      const badges = [
        {
          key: 'custom',
          label: 'Custom',
          color: 'ff00aa',
          logo: 'sparkles',
          link: 'https://example.com',
        },
      ];
      const markdown = readmeBadgesService.generate({
        badges,
        githubUrl: 'https://github.com/x/y',
      });
      expect(markdown).to.include('[![');
      expect(markdown).to.include('Custom-ff00aa');
      expect(markdown).to.include('logo=sparkles');
      expect(markdown).to.include('(https://example.com)');
    });
  });

  describe('updateReadme()', () => {
    it('inserts badges at top with idempotent markers', async () => {
      await withTempDir(async dir => {
        const readmePath = join(dir, 'README.md');
        const initial = '# Project\n\nSome intro.\n';
        await fs.writeFile(readmePath, initial, 'utf8');

        const badges = ['react', 'node', 'postgres'];
        const githubUrl = 'https://github.com/acme/repo';

        // First insertion
        const result1 = await readmeBadgesService.updateReadme({
          readmePath,
          badges,
          githubUrl,
          insertAt: 'top',
          marker: 'readme-badges',
        });

        expect(result1.changed).to.equal(true);
        const after1 = await fs.readFile(readmePath, 'utf8');
        expect(after1).to.match(/<!-- readme-badges:start -->/);
        expect(after1).to.match(/<!-- readme-badges:end -->/);
        expect(after1.indexOf('# Project')).to.be.greaterThan(-1);

        // Second insertion should be idempotent (no change)
        const result2 = await readmeBadgesService.updateReadme({
          readmePath,
          badges,
          githubUrl,
          insertAt: 'top',
          marker: 'readme-badges',
        });
        expect(result2.changed).to.equal(false);

        const after2 = await fs.readFile(readmePath, 'utf8');
        const startMatches = after2.match(/<!-- readme-badges:start -->/g) || [];
        expect(startMatches.length).to.equal(1);
      });
    });

    it('appends to bottom when insertAt=bottom', async () => {
      await withTempDir(async dir => {
        const readmePath = join(dir, 'README.md');
        const initial = '# Project\n\nBody text.\n';
        await fs.writeFile(readmePath, initial, 'utf8');

        const badges = ['vue', 'sqlite'];
        const githubUrl = 'https://github.com/acme/repo';

        const result = await readmeBadgesService.updateReadme({
          readmePath,
          badges,
          githubUrl,
          insertAt: 'bottom',
          marker: 'rb',
        });

        expect(result.changed).to.equal(true);
        const after = await fs.readFile(readmePath, 'utf8');
        const lastChunk = after.trim().split('\n').slice(-8).join('\n');
        expect(lastChunk).to.match(/<!-- rb:start -->/);
        expect(lastChunk).to.match(/<!-- rb:end -->/);
      });
    });

    it('auto-inserts below top-level title if present', async () => {
      await withTempDir(async dir => {
        const readmePath = join(dir, 'README.md');
        const initial = '# Title\n\ndescription\n';
        await fs.writeFile(readmePath, initial, 'utf8');

        const result = await readmeBadgesService.updateReadme({
          readmePath,
          badges: ['svelte'],
          githubUrl: 'https://github.com/acme/repo',
          insertAt: 'auto',
          marker: 'readme-badges',
        });

        expect(result.changed).to.equal(true);
        const after = await fs.readFile(readmePath, 'utf8');
        const idxTitle = after.indexOf('# Title');
        const idxMarker = after.indexOf('<!-- readme-badges:start -->');
        expect(idxMarker).to.be.greaterThan(idxTitle);
      });
    });
  });

  describe('detectTech()', () => {
    it('detects common tech from package.json and files', async () => {
      await withTempDir(async dir => {
        const pkg = {
          name: 'tmp',
          type: 'module',
          dependencies: {
            react: '^18.2.0',
            express: '^4.19.2',
            pg: '^8.11.0',
          },
          devDependencies: {
            mocha: '^10.0.0',
          },
        };
        await fs.writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
        await fs.mkdir(join(dir, 'src'), { recursive: true });
        await fs.writeFile(join(dir, 'src', 'index.js'), 'console.log("hello")\n', 'utf8');

        const detected = await readmeBadgesService.detectTech({ rootDir: dir });
        expect(detected).to.include('react');
        expect(detected).to.include('node');
        expect(detected).to.include('postgres');
      });
    });
  });
});
