#!/usr/bin/env node
// HARNESS-CRITICAL restore: 4 session-continuity hooks reverted by the
// settings-wiring-drift class — the layer that makes /checkin slot-resume
// work across the 12-chat fleet after /compact:
//   session-start-auto-resume   SessionStart matcher:"compact" — injects the
//                                per-chat handoff RESUME post-/compact
//   session-start-terminal-pin  SessionStart all-events — slot<->PS-window
//                                binding (without it post-/compact chats
//                                STEAL a peer slot; this very session got
//                                terminalWindowId:null proving it was off)
//   handoff-memory-seed-stop    Stop T3 — appends MEMORY_SEED to handoff
//   stop-cross-tree-collision-advisory  Stop T3 — cross-tree commit warning
// All real-payload tested (correct output / fail-open). Single atomic
// per-file read-modify-write; idempotent; C:+H: byte-verify.
import fs from 'node:fs';

const FILES = ['C:/Users/wompu/.claude/settings.json', 'H:/.claude/settings.json'];
const NB = '"H:/.claude/bin/portable-node"';
const entry = (h, t) => ({ type: 'command', command: `${NB} H:/prism/.claude/hooks/${h}.mjs`, timeout: t });
const has = (arr, h) => arr.some(x => (x.command || '').includes(`/${h}.mjs`));
const idxOf = (arr, h) => arr.findIndex(x => (x.command || '').includes(`/${h}.mjs`));

function restore(path) {
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  const log = [];

  // ---- SessionStart ----
  json.hooks.SessionStart ??= [];
  const ssGroups = json.hooks.SessionStart;
  const allSS = JSON.stringify(ssGroups);

  // auto-resume: dedicated matcher:"compact" group (spec: compact-only).
  if (allSS.includes('/session-start-auto-resume.mjs')) log.push('auto-resume SKIP');
  else {
    ssGroups.push({ matcher: 'compact', hooks: [entry('session-start-auto-resume', 5000)] });
    log.push('auto-resume ADDED SessionStart{matcher:compact}');
  }
  // terminal-pin: all-events → into the matcher:"" group, near front (T1).
  const ss0 = ssGroups.find(g => (g.matcher || '') === '') || ssGroups[0];
  if (has(ss0.hooks, 'session-start-terminal-pin')) log.push('terminal-pin SKIP');
  else {
    const at = Math.min(2, ss0.hooks.length); // after stress-harness-emit/session-id-pin
    ss0.hooks.splice(at, 0, entry('session-start-terminal-pin', 5000));
    log.push(`terminal-pin ADDED SessionStart[""][${at}]`);
  }

  // ---- Stop (single group) ----
  const sh = json.hooks.Stop[0].hooks;
  // cross-tree advisory: right after session-end-peer-share (advisory cluster).
  if (has(sh, 'stop-cross-tree-collision-advisory')) log.push('cross-tree SKIP');
  else {
    const a = idxOf(sh, 'session-end-peer-share');
    const at = a >= 0 ? a + 1 : sh.length;
    sh.splice(at, 0, entry('stop-cross-tree-collision-advisory', 3000));
    log.push(`cross-tree ADDED Stop[0][${at}]`);
  }
  // handoff-memory-seed: after post-ship-distill (re-find — prior splice shifted indices).
  if (has(sh, 'handoff-memory-seed-stop')) log.push('handoff-seed SKIP');
  else {
    const a = idxOf(sh, 'post-ship-distill');
    const at = a >= 0 ? a + 1 : sh.length;
    sh.splice(at, 0, entry('handoff-memory-seed-stop', 3000));
    log.push(`handoff-seed ADDED Stop[0][${at}]`);
  }

  fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n', 'utf8');
  return log;
}

let prev;
for (const f of FILES) {
  const log = restore(f);
  console.log(`${f}: ${log.join(' | ')}`);
  const cur = fs.readFileSync(f, 'utf8');
  JSON.parse(cur);
  if (prev == null) prev = cur;
  else if (prev !== cur) { console.error('FATAL: C: and H: diverged'); process.exit(1); }
}
console.log(`both byte-identical, valid JSON (${Buffer.byteLength(prev)}B)`);
