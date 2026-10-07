import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'datamart.js');
const cli = args => run(process.execPath, [CLI, ...args], { env: { ...process.env, DATAGOV_API_KEY: '' } });

describe('datamart CLI', function () {
  this.timeout(20000);

  it('--json writes only the result to stdout', async () => {
    const { stdout } = await cli(['lib', 'search', '--zip', '95030', '--radius-miles', '3', '--json']);
    const out = JSON.parse(stdout);
    expect(out.data[0].name).to.equal('Los Gatos Public Library');
    expect(out.meta.radius_miles).to.equal(3);
  });

  it('exits 1 with a typed error, and 2 for features that are not built yet', async () => {
    try {
      await cli(['lib', 'search', '--zip', '10001']);
      throw new Error('should fail');
    } catch (err) {
      expect(err.code).to.equal(1);
      expect(err.stderr).to.include('insufficient_geospatial_coverage');
    }
    try {
      await cli(['finance', 'accounts']);
      throw new Error('should fail');
    } catch (err) {
      expect(err.code).to.equal(2);
      expect(err.stderr).to.include('Phase C');
    }
  });

  it('reports a flag without a value as a normal error', async () => {
    try {
      await cli(['lib', 'search', '--zip']);
      throw new Error('should fail');
    } catch (err) {
      expect(err.code).to.equal(1);
      expect(err.stderr).to.match(/^datamart: --zip needs a value/);
    }
  });

  it('passes array arguments (keyword) through to tools', async () => {
    try {
      await cli(['data', 'search', 'health', '--keyword', 'x']);
      throw new Error('should fail');
    } catch (err) {
      // Reaches the Data.gov adapter (unkeyed here) instead of failing schema validation.
      expect(err.stderr).to.include('configuration_required');
    }
  });

  it('serves MCP over stdio', async () => {
    const child = spawn(process.execPath, [CLI, 'mcp', 'serve', '--namespace', 'edu']);
    const lines = [];
    let buf = '';
    const done = new Promise(resolve => {
      child.stdout.on('data', d => {
        buf += d;
        let i;
        while ((i = buf.indexOf('\n')) !== -1) {
          lines.push(JSON.parse(buf.slice(0, i)));
          buf = buf.slice(i + 1);
          if (lines.some(l => l.id === 2)) resolve();
        }
      });
    });
    const send = m => child.stdin.write(JSON.stringify(m) + '\n');
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 't', version: '0' } } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'education_get', arguments: { id: 'us.ca.edu.nces-060720000674' } } });
    await done;
    child.kill();
    const call = lines.find(l => l.id === 2);
    expect(call.result.structuredContent.data[0].name).to.equal('Rolling Hills Middle');
    expect(call.result.structuredContent.data[0].district.name).to.equal('Campbell Union');
  });
});
