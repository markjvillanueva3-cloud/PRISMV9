#!/usr/bin/env node
// Parameterized single-hook wirer (P0.3 series). JSON-aware, idempotent,
// C:+H: byte-verify (node-writes don't trigger c-to-h-mirror).
// Usage: node _wire-hook.mjs <hookBasename> <Event> <matcher> [timeoutMs]
import fs from 'node:fs';

const [, , hook, event, matcher, timeoutArg] = process.argv;
if (!hook || !event || !matcher) {
  console.error('usage: _wire-hook.mjs <hookBasename> <Event> <matcher> [timeoutMs]');
  process.exit(2);
}
const timeout = Number(timeoutArg) || 5000;
const C = 'C:/Users/wompu/.claude/settings.json';
const H = 'H:/.claude/settings.json';
const cmd = `"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/${hook}.mjs`;

const json = JSON.parse(fs.readFileSync(C, 'utf8'));
json.hooks ??= {};
json.hooks[event] ??= [];

const already = json.hooks[event].some(g =>
  (g.hooks || []).some(h => (h.command || '').includes(`/${hook}.mjs`)));
if (already) { console.log(`SKIP: ${hook} already wired in ${event}`); process.exit(0); }

json.hooks[event].push({ matcher, hooks: [{ type: 'command', command: cmd, timeout }] });
const out = JSON.stringify(json, null, 2) + '\n';
fs.writeFileSync(C, out, 'utf8');
fs.writeFileSync(H, out, 'utf8');

const identical = Buffer.compare(fs.readFileSync(C), fs.readFileSync(H)) === 0;
JSON.parse(fs.readFileSync(C, 'utf8'));
JSON.parse(fs.readFileSync(H, 'utf8'));
console.log(`wired: ${hook} → ${event} (matcher ${matcher}, timeout ${timeout})`);
console.log(`C+H byte-identical: ${identical} (${fs.readFileSync(C).length}B)`);
process.exit(identical ? 0 : 1);
