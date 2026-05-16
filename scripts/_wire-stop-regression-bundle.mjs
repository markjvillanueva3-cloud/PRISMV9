#!/usr/bin/env node
// P1-A wiring: atomically swap the 10 individual dev-tool stop_on_* Stop
// entries for the single stop-regression-bundle.mjs entry. Routed through
// safeSettingsEdit so the 10-remove + 1-add happen inside ONE lock + ONE
// atomic write — no window where the 10 gates are unguarded, and no
// lost-update race with peer chats (the settings-wiring-drift fix's first
// real adopter). Idempotent.
import { safeSettingsEdit } from '../.claude/helpers/safe-settings-edit.mjs';

// The 10 dev-tool gates folded into stop-regression-bundle.mjs SUB_HOOKS.
// The 2 machining gates (cutting_calculation_protocol, unsafe_gcode) are
// deliberately NOT here — they stay as individual Stop entries.
const FOLDED = [
  'stop_on_orphan_children', 'stop_on_c_drive_write', 'stop_on_unwired_assets',
  'stop_on_skill_unwired', 'stop_on_failing_tests', 'stop_on_build_error',
  'stop_on_duplicate_created', 'stop_on_svi_regression', 'stop_on_broken_imports',
  'stop_on_hook_unregistration',
];
const BUNDLE = 'stop-regression-bundle';
const BUNDLE_ENTRY = {
  type: 'command',
  command: '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/stop-regression-bundle.mjs',
  timeout: 30000, // 10 gates, bounded-pool concurrency 6; longest gate 10s
};

const r = safeSettingsEdit((obj) => {
  const sh = obj.hooks?.Stop?.[0]?.hooks;
  if (!Array.isArray(sh)) throw new Error('unexpected Stop chain shape');
  if (sh.some(h => (h.command || '').includes(`/${BUNDLE}.mjs`))) return; // idempotent

  const matchesFolded = h => FOLDED.some(n => (h.command || '').includes(`/${n}.mjs`));
  const firstIdx = sh.findIndex(matchesFolded);
  // Remove the 10 folded entries in place.
  for (let i = sh.length - 1; i >= 0; i--) if (matchesFolded(sh[i])) sh.splice(i, 1);
  // Insert the bundle where the first folded gate was (regression-gate
  // neighborhood); fall back to end if none were present.
  sh.splice(firstIdx >= 0 ? firstIdx : sh.length, 0, BUNDLE_ENTRY);
});

if (!r.ok) {
  console.error(`FAILED: ${r.error}${r.detail ? ' — ' + r.detail : ''}`);
  if (r.heldBy) console.error(`  lock held by pid ${r.heldBy.pid} (age ${r.heldBy.ageMs}ms) — retry shortly`);
  process.exit(1);
}
console.log(r.changed
  ? `WIRED: stop-regression-bundle swapped in for ${FOLDED.length} folded gates (${r.bytes}B, mirrors identical: ${r.mirrorsIdentical})`
  : 'SKIP: stop-regression-bundle already wired (idempotent no-op)');
