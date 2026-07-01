#!/usr/bin/env node
// P0.3-A: wire error-pattern-capture as a single dedicated PostToolUse group.
// JSON-aware (safe vs string-replace). Idempotent — refuses to add a 2nd copy.
// node-writes do NOT trigger c-to-h-mirror, so this writes C: then cp→H: and
// byte-verifies (the documented 2026-05-16 settings-wiring pattern).
import fs from 'node:fs';

const C = 'C:/Users/wompu/.claude/settings.json';
const H = 'H:/.claude/settings.json';
const CMD = '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/error-pattern-capture.mjs';
const GROUP = {
  matcher: 'Bash|Edit|MultiEdit|Grep|Glob',
  hooks: [{ type: 'command', command: CMD, timeout: 5000 }],
};

const json = JSON.parse(fs.readFileSync(C, 'utf8'));
json.hooks ??= {};
json.hooks.PostToolUse ??= [];

const already = json.hooks.PostToolUse.some(g =>
  (g.hooks || []).some(h => (h.command || '').includes('/error-pattern-capture.mjs')));
if (already) {
  console.log('SKIP: error-pattern-capture already wired in PostToolUse');
  process.exit(0);
}

json.hooks.PostToolUse.push(GROUP);
const out = JSON.stringify(json, null, 2) + '\n';
fs.writeFileSync(C, out, 'utf8');
fs.writeFileSync(H, out, 'utf8');

const cBytes = fs.readFileSync(C);
const hBytes = fs.readFileSync(H);
const identical = Buffer.compare(cBytes, hBytes) === 0;
console.log(`wired: PostToolUse group added (matcher ${GROUP.matcher})`);
console.log(`C: ${cBytes.length}B  H: ${hBytes.length}B  byte-identical: ${identical}`);
console.log(`C valid JSON: ${!!JSON.parse(fs.readFileSync(C, 'utf8'))}`);
console.log(`H valid JSON: ${!!JSON.parse(fs.readFileSync(H, 'utf8'))}`);
process.exit(identical ? 0 : 1);
