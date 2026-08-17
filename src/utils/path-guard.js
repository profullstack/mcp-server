/**
 * Path guard — shared containment for modules that read or write caller-named
 * files.
 *
 * A path taken from an unauthenticated request body and passed to `fs.writeFile`
 * is an arbitrary-file-write primitive: absolute paths and `../` traversal both
 * escape whatever directory the module meant to operate in.
 *
 * Advisories addressed by this helper:
 *   - GHSA-5x56-587v-mv4r (readme-badges `readmePath`)
 *   - GHSA-42v3-pcpq-j7fq (readme-badges `readmePath`, same defect)
 *
 * Containment is done on the *resolved real* path where possible, so a symlink
 * inside the root cannot be used to reach outside it.
 */

import { realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

/** Error type thrown for every rejection, so callers can map it to a 400. */
export class UnsafePathError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafePathError';
    this.code = 'UNSAFE_PATH';
  }
}

/**
 * Resolve symlinks as far as the path exists, so containment is checked against
 * the real location rather than the symlink's own path. A path whose leaf does
 * not exist yet falls back to the real path of its nearest existing ancestor.
 * @param {string} target - an already-absolute path
 * @returns {string}
 */
function realpathBestEffort(target) {
  let current = target;
  const trailing = [];

  // Walk up until something exists, remembering the segments we removed.
  for (;;) {
    try {
      const real = realpathSync(current);
      return trailing.length > 0 ? resolve(real, ...trailing.reverse()) : real;
    } catch {
      const parent = dirname(current);
      if (parent === current) return target; // reached the filesystem root
      trailing.push(basename(current));
      current = parent;
    }
  }
}

/**
 * Resolve a caller-supplied path and prove it stays inside `root`.
 *
 * @param {string} input - caller-supplied path, absolute or relative to root
 * @param {Object} [options]
 * @param {string} [options.root=process.cwd()] - directory the path must stay within
 * @param {string[]|null} [options.allowedBasenames=null] - if set, the file name must be one of these
 * @param {string[]|null} [options.allowedExtensions=null] - if set, the extension must be one of these (with dot, lowercase)
 * @param {string} [options.fieldName='path'] - name used in error messages
 * @returns {string} the contained, absolute path
 * @throws {UnsafePathError}
 */
export function resolveWithinRoot(input, options = {}) {
  const {
    root = process.cwd(),
    allowedBasenames = null,
    allowedExtensions = null,
    fieldName = 'path',
  } = options;

  if (typeof input !== 'string' || input.trim() === '') {
    throw new UnsafePathError(`${fieldName} must be a non-empty string`);
  }
  // A NUL byte truncates the path at the syscall boundary in some runtimes,
  // which would defeat an extension check.
  if (input.includes('\0')) {
    throw new UnsafePathError(`${fieldName} must not contain null bytes`);
  }

  const realRoot = realpathBestEffort(resolve(root));
  const resolved = realpathBestEffort(resolve(realRoot, input));

  const rel = relative(realRoot, resolved);
  if (rel !== '' && (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel))) {
    throw new UnsafePathError(`${fieldName} must stay within ${realRoot}`);
  }

  const name = basename(resolved);
  if (Array.isArray(allowedBasenames) && allowedBasenames.length > 0) {
    const permitted = allowedBasenames.map(entry => entry.toLowerCase());
    if (!permitted.includes(name.toLowerCase())) {
      throw new UnsafePathError(
        `${fieldName} must point to one of: ${allowedBasenames.join(', ')}`
      );
    }
  }

  if (Array.isArray(allowedExtensions) && allowedExtensions.length > 0) {
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
    if (!allowedExtensions.map(entry => entry.toLowerCase()).includes(ext)) {
      throw new UnsafePathError(
        `${fieldName} must have one of these extensions: ${allowedExtensions.join(', ')}`
      );
    }
  }

  return resolved;
}

// Exposed for unit tests.
export const _internal = { realpathBestEffort };
