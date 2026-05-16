#!/usr/bin/env node
// Parameterized single-hook wirer (P0.3 series). Routes the C:+H:
// read-modify-write through safeSettingsEdit so the edit is lock-guarded
// and atomically dual-mirrored — no lost-update race with peer chats (the
// settings-wiring-drift fix; safeSettingsEdit is the canonical settings
// writer). Idempotent.
// Usage: node _wire-hook.mjs <hookBasename> <Event> <matcher> [timeoutMs]
import { safeSettingsEdit } from '../.claude/helpers/safe-settings-edit.mjs';

const [, , hook, event, matcher, timeoutArg] = process.argv;
if (!hook || !event || !matcher) {
  console.error('usage: _wire-hook.mjs <hookBasename> <Event> <matcher> [timeoutMs]');
  process.exit(2);
}
const timeout = Number(timeoutArg) || 5000;
const cmd = `"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/${hook}.mjs`;

let alreadyWired = false;
const r = safeSettingsEdit((json) => {
  json.hooks ??= {};
  json.hooks[event] ??= [];
  alreadyWired = json.hooks[event].some(g =>
    (g.hooks || []).some(h => (h.command || '').includes(`/${hook}.mjs`)));
  if (alreadyWired) return; // idempotent — leave the object untouched (no-op write)
  json.hooks[event].push({ matcher, hooks: [{ type: 'command', command: cmd, timeout }] });
});

if (!r.ok) {
  console.error(`FAILED: ${r.error}${r.detail ? ' — ' + r.detail : ''}`);
  if (r.heldBy) console.error(`  lock held by pid ${r.heldBy.pid} (age ${r.heldBy.ageMs}ms) — retry shortly`);
  process.exit(1);
}
if (alreadyWired) {
  console.log(`SKIP: ${hook} already wired in ${event}`);
  process.exit(0);
}
console.log(`wired: ${hook} → ${event} (matcher ${matcher}, timeout ${timeout}) — ${r.bytes}B, mirrors identical: ${r.mirrorsIdentical}`);
process.exit(0);
