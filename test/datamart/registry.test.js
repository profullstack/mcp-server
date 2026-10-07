import { validateManifest, headlineState, CAPABILITY_STATES } from '../../src/datamart/capabilities.js';
import { MANIFESTS, providerStatus } from '../../src/datamart/registry.js';
import { TOOLS } from '../../src/datamart/tools.js';

const throws = fn => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error('expected a throw');
};

const good = () => ({
  id: 'x',
  namespace: 'gov',
  country: 'US',
  name: 'X',
  officialUrl: 'https://example.gov/',
  officialAffiliation: false,
  capabilities: [{ operation: 'services.discover', state: 'directory_only' }],
});

describe('datamart capabilities and registry', () => {
  it('rejects unknown capability states', () => {
    const m = good();
    m.capabilities[0].state = 'fully_automated';
    expect(throws(() => validateManifest(m)).message).to.include('unknown capability state');
  });

  it('rejects a planned capability that claims to work', () => {
    const m = good();
    m.capabilities.push({ operation: 'filing.prepare', state: 'prepare', implementationState: 'planned' });
    expect(throws(() => validateManifest(m)).message).to.include('cannot claim working state');
  });

  it('requires a reason for unsupported operations and no official affiliation', () => {
    const m = good();
    m.capabilities.push({ operation: 'filing.submit', state: 'unsupported' });
    expect(throws(() => validateManifest(m)).message).to.include('needs a reason');
    const n = good();
    n.officialAffiliation = true;
    expect(throws(() => validateManifest(n)).message).to.include('officialAffiliation');
  });

  it('lists the six initial government providers plus LoC, honestly labeled', () => {
    const ids = MANIFESTS.map(m => m.id);
    for (const id of ['us.ca.sos.bizfile', 'us.gsa.datagov', 'us.irs', 'us.ca.ftb', 'us.ca.dmv', 'us.ca.edd', 'us.loc']) {
      expect(ids).to.include(id);
    }
    const bizfile = MANIFESTS.find(m => m.id === 'us.ca.sos.bizfile');
    expect(headlineState(bizfile)).to.equal('directory_only');
    expect(bizfile.capabilities.find(c => c.operation === 'filing.submit').state).to.equal('unsupported');
    expect(headlineState(MANIFESTS.find(m => m.id === 'us.loc'))).to.equal('public_read');
  });

  it('every public_read capability names a tool that exists', () => {
    const names = new Set(TOOLS.map(t => t.name));
    for (const m of MANIFESTS) {
      for (const c of m.capabilities) {
        expect(CAPABILITY_STATES).to.include(c.state);
        if (c.state === 'public_read') expect(names.has(c.tool), `${m.id}/${c.operation}`).to.equal(true);
      }
    }
  });

  it('finance has no working capability and no tool', () => {
    const fin = MANIFESTS.filter(m => m.namespace === 'finance');
    expect(fin).to.have.length(1);
    expect(fin[0].capabilities.every(c => c.state === 'unsupported')).to.equal(true);
    expect(TOOLS.some(t => t.namespaces.includes('finance') || /finance/.test(t.name))).to.equal(false);
  });

  it('separates configuration from capability (AT04)', () => {
    const saved = process.env.DATAGOV_API_KEY;
    delete process.env.DATAGOV_API_KEY;
    expect(providerStatus('us.gsa.datagov').configuration).to.equal('configuration_required');
    process.env.DATAGOV_API_KEY = 'k';
    expect(providerStatus('us.gsa.datagov').configuration).to.equal('configured');
    if (saved === undefined) delete process.env.DATAGOV_API_KEY;
    else process.env.DATAGOV_API_KEY = saved;
    expect(providerStatus('us.loc').configuration).to.equal('not_required');
  });
});
