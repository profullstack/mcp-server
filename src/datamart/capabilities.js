/**
 * Capability model (PRD §7.2, §7.3).
 *
 * `state` is what works at runtime; `implementationState` is development
 * progress. A planned capability is always `unsupported` until it is built and
 * verified — a published catalog must never show it as available.
 */

export const CAPABILITY_STATES = [
  'directory_only',
  'public_read',
  'authenticated_read',
  'prepare',
  'assisted_action',
  'verified_action',
  'unavailable',
  'unsupported',
];

export const IMPLEMENTATION_STATES = ['implemented', 'planned', 'not_planned'];

/** States that claim something can actually be done right now. */
const WORKING_STATES = new Set([
  'directory_only',
  'public_read',
  'authenticated_read',
  'prepare',
  'assisted_action',
  'verified_action',
]);

/**
 * Validate a provider manifest. Throws on the first violation so a bad
 * manifest fails at load time rather than being published.
 * @param {Record<string, any>} manifest
 * @returns {Record<string, any>} the same manifest
 */
export function validateManifest(manifest) {
  const where = manifest?.id || '(manifest without id)';
  for (const key of ['id', 'namespace', 'country', 'name', 'officialUrl', 'capabilities']) {
    if (manifest?.[key] === undefined) throw new Error(`${where}: missing ${key}`);
  }
  if (manifest.officialAffiliation !== false) {
    throw new Error(`${where}: officialAffiliation must be false (Datamart is an independent operator)`);
  }
  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    throw new Error(`${where}: capabilities must be a non-empty array`);
  }
  for (const cap of manifest.capabilities) {
    if (!cap.operation) throw new Error(`${where}: capability without operation`);
    if (!CAPABILITY_STATES.includes(cap.state)) {
      throw new Error(`${where}/${cap.operation}: unknown capability state "${cap.state}"`);
    }
    const impl = cap.implementationState || 'implemented';
    if (!IMPLEMENTATION_STATES.includes(impl)) {
      throw new Error(`${where}/${cap.operation}: unknown implementationState "${impl}"`);
    }
    if (impl !== 'implemented' && WORKING_STATES.has(cap.state)) {
      throw new Error(
        `${where}/${cap.operation}: a ${impl} capability cannot claim working state "${cap.state}"`
      );
    }
    if (cap.state === 'unsupported' && !cap.reason) {
      throw new Error(`${where}/${cap.operation}: unsupported capability needs a reason`);
    }
  }
  return manifest;
}

/**
 * The highest working level a provider offers right now, for badges.
 * @param {Record<string, any>} manifest
 * @returns {string}
 */
export function headlineState(manifest) {
  const order = CAPABILITY_STATES.slice(0, 6);
  let best = -1;
  for (const cap of manifest.capabilities) {
    const i = order.indexOf(cap.state);
    if (i > best) best = i;
  }
  return best === -1 ? 'unsupported' : order[best];
}
