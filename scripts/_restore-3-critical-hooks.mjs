#!/usr/bin/env node
// HARNESS-CRITICAL restore: 3 MINIMAL_ALLOWLIST gates reverted by the
// settings-wiring-drift class (same root cause as scrutinize-before-stop):
//   file-claim-guard      T0 PreToolUse Edit|Write|MultiEdit — multi-chat
//                          clobber prevention (THE peer-claim enforcer)
//   macro-bulk-emit-guard  T0 Stop — blocks bulk-macro session-end
//   enforce-handoff-topic  T4 Stop — renames topicless handoffs
//                          (silent-overwrite precursor in multi-chat)
// All real-payload tested (correct-pass / fail-open). Single atomic
// read-modify-write of each settings.json so the fleet never observes a
// half-restored state. Idempotent per-hook. C:+H: byte-verify.
import fs from 'node:fs';

const FILES = ['C:/Users/wompu/.claude/settings.json', 'H:/.claude/settings.json'];
const NB = '"H:/.claude/bin/portable-node"';
const entry = (h, t) => ({ type: 'command', command: `${NB} H:/prism/.claude/hooks/${h}.mjs`, timeout: t });
const has = (arr, h) => arr.some(x => (x.command || '').includes(`/${h}.mjs`));

function restore(path) {
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  json.hooks ??= {};
  const log = [];

  // 1. file-claim-guard → dedicated PreToolUse group (Edit|Write|MultiEdit).
  json.hooks.PreToolUse ??= [];
  const fcgWired = json.hooks.PreToolUse.some(g => has(g.hooks || [], 'file-claim-guard'));
  if (fcgWired) log.push('file-claim-guard SKIP(already)');
  else {
    json.hooks.PreToolUse.push({ matcher: 'Edit|Write|MultiEdit', hooks: [entry('file-claim-guard', 5000)] });
    log.push('file-claim-guard ADDED PreToolUse');
  }

  // 2+3. Stop hooks → insert into the single Stop[0] group.
  const stop = json.hooks.Stop;
  if (!Array.isArray(stop) || !stop[0] || !Array.isArray(stop[0].hooks)) {
    throw new Error('unexpected Stop chain shape');
  }
  const sh = stop[0].hooks;

  // macro-bulk-emit-guard: T0 → just after the tier-0 front cluster
  // (goal-complete-gate / scrutinize-before-stop).
  if (has(sh, 'macro-bulk-emit-guard')) log.push('macro-bulk-emit-guard SKIP(already)');
  else {
    const scrutIdx = sh.findIndex(h => (h.command || '').includes('/scrutinize-before-stop.mjs'));
    const at = scrutIdx >= 0 ? scrutIdx + 1 : 0;
    sh.splice(at, 0, entry('macro-bulk-emit-guard', 5000));
    log.push(`macro-bulk-emit-guard ADDED Stop[0][${at}]`);
  }
  // enforce-handoff-topic: T4 → append to end of Stop[0].
  if (has(sh, 'enforce-handoff-topic')) log.push('enforce-handoff-topic SKIP(already)');
  else { sh.push(entry('enforce-handoff-topic', 5000)); log.push(`enforce-handoff-topic ADDED Stop[0][${sh.length - 1}]`); }

  fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n', 'utf8');
  return log;
}

let out0;
for (const f of FILES) {
  const log = restore(f);
  console.log(`${f}: ${log.join(' | ')}`);
  const cur = fs.readFileSync(f, 'utf8');
  JSON.parse(cur); // valid-JSON assert
  if (out0 == null) out0 = cur;
  else if (out0 !== cur) { console.error('FATAL: C: and H: diverged'); process.exit(1); }
}
console.log(`both byte-identical: ${out0 != null} (${Buffer.byteLength(out0)}B), both valid JSON`);
