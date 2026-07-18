#!/usr/bin/env node
// tier: T1
// read-bundle.mjs — single PreToolUse hook for Read. Replaces the 4-hook
// Read matcher in settings.json with one bundled invocation.

import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";
const HELPER_BASE = "H:/prism/.claude/helpers";

const READ_HOOKS = [
  { path: `${HELPER_BASE}/read-optimizer.mjs`,               timeout: 2000 },
  { path: `${HELPER_BASE}/read-once-cache.mjs`,              timeout: 2000 }, // soft warn on re-read
  { path: `${HOOK_BASE}/file-read-cache.mjs`,               timeout: 2000 }, // hard deny on identical re-read of unchanged file — HOOKS-AUTOMATION-V2 U-HKA01
  { path: `${HOOK_BASE}/read-auto-limit.mjs`,                timeout: 2000 },
  { path: `${HOOK_BASE}/ollama-route-pretooluse.mjs`,        timeout: 2500 }, // nudge bulk-data reads at local qwen (auto-substitute is opt-in) — HOOKS-AUTOMATION-V2 U-HKA04
  { path: `${HOOK_BASE}/read-already-have.mjs`,              timeout: 2000 },
  // PRISM-SEARCH-MS0/U-PSM01 (2026-05-18): inject master-index top-K hits for
  // the file being read so Claude understands callers/wiring before opening.
  // Knob: PRISM_PRE_READ_GRAPH_INJECT=0. Fail-open by construction.
  { path: `${HOOK_BASE}/pre-read-graph-inject.mjs`,          timeout: 2000 },
  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
  // FORK-STORM-CONSOLIDATION (2026-06-14, slot:tango): folded the 5 standalone
  // settings.json "Read" advisory hooks in here so they run as bundle node-children
  // (no per-hook portable-node bash.exe wrapper) -- cuts ~5 bash.exe per Read call
  // fleet-wide. big-data-read-enforce CAN deny; runBundle aggregates continue:false
  // / decision:deny across the pool, so its gate behavior is preserved (same as the
  // already-bundled file-read-cache hard-deny above).
  { path: `${HOOK_BASE}/wiki-read-offload-advisory.mjs`,     timeout: 1500 },
  { path: `${HOOK_BASE}/large-read-digest-advisory.mjs`,     timeout: 1500 },
  { path: `${HOOK_BASE}/big-data-read-enforce.mjs`,          timeout: 2000 },
  { path: `${HOOK_BASE}/recall-first-advisory.mjs`,          timeout: 1500 },
  { path: `${HOOK_BASE}/grep-index-taken-correlator.mjs`,    timeout: 1500 },
  // HS-15 (2026-05-12): PreToolUse stash for duration-derivation. Runs LAST so a
  // prior-hook deny short-circuits before any stash entry leaks into the cache.
  { path: `${HOOK_BASE}/tool-watchdog.mjs`,                  timeout: 1000 },
];

async function main() {
  const stdinPayload = await readStdin();
  if (!stdinPayload) {
    emit({ continue: true });
    return;
  }
  const result = await runBundle(READ_HOOKS, stdinPayload);
  emit(result);
}

main().catch((err) => {
  process.stderr.write(`read-bundle error: ${err}\n`);
  emit({ continue: true });
});
