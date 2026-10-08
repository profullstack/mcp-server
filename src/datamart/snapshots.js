/**
 * Versioned, source-backed directory snapshots under src/datamart/datasets/.
 *
 * Each file is { meta: { source, url, retrieved_at, version, ... }, data } and is
 * produced by scripts/datamart/build-snapshots.js from an official download.
 * Files are read once and kept in memory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'datasets');
const loaded = new Map();

/**
 * @param {string} name - file stem, e.g. 'libraries-ca-launch'
 * @returns {{ meta: Record<string, any>, data: any }}
 */
export function loadSnapshot(name) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`invalid snapshot name ${name}`);
  if (!loaded.has(name)) {
    const file = path.join(DATA_DIR, `${name}.json`);
    loaded.set(name, JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  return loaded.get(name);
}

export const SNAPSHOT_DIR = DATA_DIR;
