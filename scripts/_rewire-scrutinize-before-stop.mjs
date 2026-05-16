#!/usr/bin/env node
// HARNESS-CRITICAL restore: scrutinize-before-stop (tier-0 3-of-3 scrutiny
// Stop gate, MINIMAL_ALLOWLIST) was reverted out of BOTH settings.json by
// the documented settings-wiring-drift class. Re-insert it at Stop[0].hooks
// index 1 — directly after goal-complete-gate, the sibling tier-0 gate —
// matching that proven entry's shape exactly (no continueOnError key: this
// CC version honors decision:block from the hook itself; 0/42 Stop hooks
// use the key). Idempotent. C:+H: byte-verify (node-write skips c-to-h).
import fs from 'node:fs';

const C = 'C:/Users/wompu/.claude/settings.json';
const H = 'H:/.claude/settings.json';
const HOOK = '/scrutinize-before-stop.mjs';
const ENTRY = {
  type: 'command',
  command: '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/scrutinize-before-stop.mjs',
  timeout: 10000,
};

const json = JSON.parse(fs.readFileSync(C, 'utf8'));
const stop = json.hooks?.Stop;
if (!Array.isArray(stop) || !stop[0] || !Array.isArray(stop[0].hooks)) {
  console.error('FATAL: unexpected Stop chain shape — aborting'); process.exit(2);
}
const hooks = stop[0].hooks;
if (hooks.some(h => (h.command || '').includes(HOOK))) {
  console.log('SKIP: scrutinize-before-stop already wired'); process.exit(0);
}
const gcgIdx = hooks.findIndex(h => (h.command || '').includes('/goal-complete-gate.mjs'));
const insertAt = gcgIdx >= 0 ? gcgIdx + 1 : 0; // after goal-complete-gate, else front
hooks.splice(insertAt, 0, ENTRY);

const out = JSON.stringify(json, null, 2) + '\n';
fs.writeFileSync(C, out, 'utf8');
fs.writeFileSync(H, out, 'utf8');
const identical = Buffer.compare(fs.readFileSync(C), fs.readFileSync(H)) === 0;
JSON.parse(fs.readFileSync(C, 'utf8'));
JSON.parse(fs.readFileSync(H, 'utf8'));
console.log(`RESTORED scrutinize-before-stop at Stop[0].hooks[${insertAt}] (after goal-complete-gate idx ${gcgIdx})`);
console.log(`C+H byte-identical: ${identical} (${fs.readFileSync(C).length}B), both valid JSON`);
process.exit(identical ? 0 : 1);
