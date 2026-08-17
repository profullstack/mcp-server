/**
 * Tests for the shared path-containment guard
 * (GHSA-5x56-587v-mv4r, GHSA-42v3-pcpq-j7fq).
 */

import { expect } from 'chai';

import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveWithinRoot, UnsafePathError } from '../../src/utils/path-guard.js';

describe('path-guard', () => {
  let root;
  let outside;

  beforeEach(() => {
    const base = mkdtempSync(join(tmpdir(), 'path-guard-'));
    root = join(base, 'project');
    outside = join(base, 'outside');
    mkdirSync(root, { recursive: true });
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(root, 'README.md'), '# hi\n');
    writeFileSync(join(outside, 'secret.md'), 'secret\n');
  });

  afterEach(() => {
    rmSync(resolve(root, '..'), { recursive: true, force: true });
  });

  it('accepts a path inside the root', () => {
    expect(resolveWithinRoot('README.md', { root })).to.equal(join(root, 'README.md'));
  });

  it('accepts a nested path inside the root', () => {
    mkdirSync(join(root, 'docs'));
    expect(resolveWithinRoot('docs/GUIDE.md', { root })).to.equal(join(root, 'docs', 'GUIDE.md'));
  });

  it('rejects absolute paths outside the root', () => {
    expect(() => resolveWithinRoot('/etc/passwd', { root })).to.throw(UnsafePathError);
    expect(() => resolveWithinRoot(join(outside, 'secret.md'), { root })).to.throw(UnsafePathError);
  });

  it('rejects traversal out of the root', () => {
    expect(() => resolveWithinRoot('../outside/secret.md', { root })).to.throw(UnsafePathError);
    expect(() => resolveWithinRoot('../../../../tmp/pwned.md', { root })).to.throw(UnsafePathError);
  });

  it('rejects a symlink inside the root that points outside it', () => {
    symlinkSync(join(outside, 'secret.md'), join(root, 'link.md'));
    expect(() => resolveWithinRoot('link.md', { root })).to.throw(UnsafePathError);
  });

  it('rejects null bytes', () => {
    expect(() => resolveWithinRoot('README.md\0.png', { root })).to.throw(UnsafePathError);
  });

  it('rejects empty and non-string input', () => {
    for (const value of ['', '   ', null, undefined, 7]) {
      expect(() => resolveWithinRoot(value, { root })).to.throw(UnsafePathError);
    }
  });

  it('enforces an extension allowlist', () => {
    writeFileSync(join(root, 'app.js'), '');
    expect(() => resolveWithinRoot('app.js', { root, allowedExtensions: ['.md'] })).to.throw(
      UnsafePathError
    );
    expect(resolveWithinRoot('README.md', { root, allowedExtensions: ['.md'] })).to.equal(
      join(root, 'README.md')
    );
  });

  it('enforces a basename allowlist', () => {
    writeFileSync(join(root, 'OTHER.md'), '');
    expect(() => resolveWithinRoot('OTHER.md', { root, allowedBasenames: ['README.md'] })).to.throw(
      UnsafePathError
    );
    expect(resolveWithinRoot('README.md', { root, allowedBasenames: ['README.md'] })).to.equal(
      join(root, 'README.md')
    );
  });
});
