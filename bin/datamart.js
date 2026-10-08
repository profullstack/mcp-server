#!/usr/bin/env node
/**
 * datamart CLI — the same tools as the HTTP API and MCP endpoints.
 *
 *   datamart search --zip 95032 --radius-miles 20 [--namespace lib|edu|gov] [--json]
 *   datamart lib search --zip 95032 [--type branch,central] [--json]
 *   datamart lib loc search "California history" [--format maps] [--json]
 *   datamart lib loc item 2021668470 [--json]
 *   datamart edu search --zip 95032 --type high,college [--json]
 *   datamart gov providers [--namespace gov] [--json]
 *   datamart gov search "business filing" [--json]
 *   datamart data search "public libraries" [--json]      (needs DATAGOV_API_KEY)
 *   datamart resource us.ca.sos.bizfile [--json]
 *   datamart tools [--json]
 *   datamart call <tool> --key value ... [--json]
 *   datamart mcp serve [--namespace gov|lib|edu|contracts|search]   (stdio MCP)
 *
 * Add --api https://mcp.profullstack.com to call a running server instead of
 * running tools in-process. --json writes only the result to stdout;
 * diagnostics go to stderr.
 */
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { runTool, TOOLS, toolsFor, getTool } from '../src/datamart/tools.js';
import { usePersistentCooldowns } from '../src/datamart/http.js';
import { toErrorResponse } from '../src/datamart/errors.js';

const NOT_YET = {
  contracts: 'Contract opportunity search, profiles and applications arrive in Phase B. Run `datamart call contracts_sources` for official sources.',
  profiles: 'Applicant profiles arrive in Phase B.',
  applications: 'Applications arrive in Phase B.',
  finance: 'Private finance through CoinPay arrives in Phase C and will require your own authorized connection.',
  tui: 'The TUI is not built yet.',
};

const BOOLEAN_FLAGS = new Set(['json', 'help', 'strict', 'include-unresolved']);

/** `--key value`, `--key=value` and boolean flags; everything else is positional. */
export function parseCli(argv) {
  const values = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positionals.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const key = a.slice(2, eq === -1 ? undefined : eq);
    let value;
    if (eq !== -1) value = a.slice(eq + 1);
    else if (BOOLEAN_FLAGS.has(key)) value = true;
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) value = argv[++i];
    else throw new Error(`--${key} needs a value`);
    // Repeated flags (--keyword a --keyword b) collect into a list.
    values[key] = key in values ? [].concat(values[key], value) : value;
  }
  return { values, positionals };
}

let values = {};
let positionals = [];
let json = process.argv.includes('--json');
let api = null;

/** --radius-miles 20 -> { radius_miles: '20' }; drops CLI-only flags. */
function toolArgs(extra = {}) {
  const out = {};
  for (const [k, v] of Object.entries(values)) {
    if (['json', 'api', 'help'].includes(k)) continue;
    out[k.replace(/-/g, '_')] = v;
  }
  return { ...out, ...extra };
}

/** Wrap single values for array-typed arguments (e.g. datagov_search keyword). */
function fitArgs(name, args) {
  const tool = getTool(name);
  if (!tool) return args;
  const out = { ...args };
  for (const [k, v] of Object.entries(out)) {
    const def = tool.shape[k];
    const inner = def?.unwrap ? def.unwrap() : def;
    if (inner instanceof z.ZodArray && !Array.isArray(v)) out[k] = [v];
  }
  return out;
}

async function call(name, rawArgs) {
  const args = fitArgs(name, rawArgs);
  if (!api) return runTool(name, args);
  const res = await fetch(`${api}/api/v1/tools/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body?.error?.message || `HTTP ${res.status}`), { body });
  return body;
}

function print(result) {
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }
  const rows = result.data || [];
  const m = result.meta || {};
  if (m.origin) {
    const o = m.origin;
    console.log(`Within ${m.radius_miles} mi of ${o.label}${o.defaulted ? ' (default)' : ''} — ${m.total_matches} match(es), straight-line distance`);
  }
  for (const r of rows) {
    const dist = r.distance_miles !== undefined ? `${r.distance_miles.toFixed(1).padStart(5)} mi  ` : '';
    const name = r.name || r.title || r.id;
    const where = r.address ? `  ${r.address.street}, ${r.address.city}` : r.publisher ? `  — ${r.publisher}` : '';
    const state = r.headline_state ? `  [${r.headline_state}]` : '';
    console.log(`${dist}${name}${where}${state}`);
  }
  if (result.services?.length) {
    console.log('\nGovernment services:');
    for (const s of result.services) console.log(`  ${s.name}  [${s.headline_state}]  ${s.official_url}`);
  }
  for (const w of result.warnings || []) console.error(`note: ${w}`);
  if (m.next_cursor) console.error(`more: --cursor ${m.next_cursor}`);
}

async function serveMcp(namespace) {
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const defs = namespace ? toolsFor({ namespace }) : TOOLS;
  const server = new McpServer({ name: `datamart${namespace ? `-${namespace}` : ''}`, version: '0.1.0' });
  for (const t of defs) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: z.object(t.shape).strict(), annotations: { readOnlyHint: true, openWorldHint: true } },
      async args => {
        try {
          const out = await runTool(t.name, args);
          return { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out };
        } catch (err) {
          return { isError: true, content: [{ type: 'text', text: JSON.stringify(toErrorResponse(err).body) }] };
        }
      }
    );
  }
  await server.connect(new StdioServerTransport());
  console.error(`datamart MCP (stdio): ${defs.length} tools`);
}

async function main() {
  ({ values, positionals } = parseCli(process.argv.slice(2)));
  json = values.json === true;
  api = typeof values.api === 'string' ? values.api.replace(/\/+$/, '') : null;
  const cacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  usePersistentCooldowns(path.join(cacheHome, 'datamart', 'cooldowns.json'));
  const [cmd, sub, ...rest] = positionals;
  if (!cmd || values.help) {
    console.log((await import('node:fs')).readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n/, '').replace(/^ \* ?/gm, ''));
    return;
  }
  if (NOT_YET[cmd]) {
    console.error(NOT_YET[cmd]);
    process.exitCode = 2;
    return;
  }
  const q = rest.length ? rest.join(' ') : undefined;
  const withQ = (o = {}) => toolArgs(q ? { q, ...o } : o);
  switch (`${cmd} ${sub ?? ''}`.trim()) {
  case 'search':
    return print(await call('datamart_search', toolArgs(sub ? { q: [sub, ...rest].join(' ') } : {})));
  case 'lib search':
    return print(await call('libraries_search', withQ()));
  case 'lib loc': {
    const [action, ...words] = rest;
    if (action === 'search') return print(await call('loc_search', toolArgs(words.length ? { q: words.join(' ') } : {})));
    if (action === 'collections') return print(await call('loc_list_collections', toolArgs()));
    if (action === 'item') return print(await call('loc_get_item', toolArgs({ id: words[0] })));
    if (action === 'files') return print(await call('loc_get_resource_links', toolArgs({ id: words[0] })));
    throw new Error('usage: datamart lib loc search|collections|item|files');
  }
  case 'edu search':
    return print(await call('education_search', withQ()));
  case 'gov providers':
  case 'providers': {
    const { listProviders } = await import('../src/datamart/registry.js');
    const data = listProviders({ namespace: values.namespace || (cmd === 'gov' ? 'gov' : undefined) });
    return print({ data, meta: {} });
  }
  case 'gov search':
    return print(await call('gov_services_search', withQ()));
  case 'data search':
    return print(await call('datagov_search', withQ()));
  case 'data orgs':
    return print(await call('datagov_list_organizations', withQ()));
  case 'mcp serve':
    if (api) throw new Error('mcp serve runs tools in-process; drop --api');
    return serveMcp(values.namespace);
  case 'tools':
    return print({ data: TOOLS.map(t => ({ name: t.name, description: t.description })), meta: {} });
  default:
    if (cmd === 'resource' && sub) return print(await call('resource_get', { id: sub }));
    if (cmd === 'call' && sub) return print(await call(sub, toolArgs()));
    throw new Error(`unknown command: ${positionals.join(' ')} (try --help)`);
  }
}

main().catch(err => {
  const body = err.body || toErrorResponse(err).body;
  const message = body?.error?.code === 'internal_error' ? err.message : `${body.error.code}: ${body.error.message}`;
  if (json) process.stdout.write(JSON.stringify(body, null, 2) + '\n');
  console.error(`datamart: ${message}`);
  process.exitCode = 1;
});
