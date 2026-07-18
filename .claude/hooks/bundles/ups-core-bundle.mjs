#!/usr/bin/env node
// tier: T4
// ups-core-bundle.mjs -- single UserPromptSubmit hook that runs the CORE advisory
// injectors (non-domain; sibling of ups-domain-bundle.mjs which owns the slot-domain
// injectors) in ONE process. (HARNESS-EFFICIENCY-MS0 Phase 2, 2026-07-02)
//
// Why: before this bundle every prompt spawned ~81 standalone portable-node processes
// for UserPromptSubmit alone (x8 concurrent slots = fork-storm pressure; the same class
// of storm that produced FORK-STORM-CONSOLIDATION 2026-06-14). This bundle runs the 75
// advisory injectors as node-children of ONE process, pooled at concurrency 6.
// UserPromptSubmit harness spawns drop ~81 -> 7 (rename-window-intercept,
// stress-harness-emit, session-id-pin, slot-bind-enforce, ups-domain-bundle,
// ups-core-bundle, forge-queue-inject stay standalone -- identity/ordering/side-effect
// or already-bundle entries).
//
// Each member keeps its OWN keyword/slot/throttle gate + disable knob; the bundle only
// co-locates them. The bundle PROPAGATES a block if any member emits one
// (continue:false / decision:block|deny) -- comprehensive-build-enforce and
// token-budget-gate are block-capable and their semantics are preserved. Fail-OPEN on
// its own crash -- never wedge a prompt.
//
// SUB_HOOKS timeouts are MILLISECONDS (runHook setTimeout), mirroring each hook's
// ORIGINAL settings budget before the 2026-07-02 ms->s recalibration. The bundle's own
// settings.json timeout is 45 (SECONDS -- the settings field is seconds per docs).
//
// 7 of the C:-layer members also had identical project-layer wires (harness-deduped);
// the fold transform removes those in the same pass so nothing double-runs.
// stop_on_hook_unregistration.bundleAbsorbedHookNames() scans bundles/*.mjs for .mjs
// refs, so all 75 absorbed names count as still-registered automatically.
//
// Concurrency knob: PRISM_UPS_CORE_CONCURRENCY (default 16, 0 = unbounded). Default is
// 16 (not the 6 used by smaller bundles): 75 members / 6 workers = ~13 serial waves
// (measured 13.6s); at 16 the waves overlap the slow poles (measured 11.3s under heavy
// box load, better when quiet). Full-parallel is WORSE: a 75-spawn stampede drove 40/75
// members past their budgets in profiling (scripts/time-ups-core-members.mjs).
// Disable knob:     PRISM_UPS_CORE_DISABLE=1 -> bundle emits nothing (one switch for
//                   all 75 under extreme pressure). Default-unset = normal behavior.
// Full revert: restore the originals as individual UserPromptSubmit entries from
// settings.json.checkpoint-2026-07-02-pre-ups-core.json.

import { runHook, readStdin, emit } from "./lib/hook-runner.mjs";
import { fileURLToPath } from "node:url";

const HOOK_BASE = "H:/prism/.claude/hooks";

// MUST stay in sync with the UserPromptSubmit entries removed from settings.json.
// Timeouts mirror the original per-hook ms budgets EXACTLY (pre-recalibration values).
export const SUB_HOOKS = [
  // ---- fast surface/reorient injectors ----
  { path: `${HOOK_BASE}/checkin-args-surface.mjs`,            timeout: 1500 },
  { path: `${HOOK_BASE}/skill-auto-trigger.mjs`,              timeout: 1500 },
  { path: `${HOOK_BASE}/close-out-audit-suggest.mjs`,         timeout: 1500 },
  { path: `${HOOK_BASE}/obsidian-vault-precheck-inject.mjs`,  timeout: 1500 },
  { path: `${HOOK_BASE}/prompt-context-inject.mjs`,           timeout: 1500 },
  { path: `${HOOK_BASE}/fleet-work-digest-inject.mjs`,        timeout: 2000 },
  { path: `${HOOK_BASE}/cag-router-inject.mjs`,               timeout: 1500 },
  { path: `${HOOK_BASE}/master-index-precheck-inject.mjs`,    timeout: 3000 },
  { path: `${HOOK_BASE}/synergy-definition-inject.mjs`,       timeout: 3000 },
  { path: `${HOOK_BASE}/task-start-substrate-inject.mjs`,     timeout: 3000 },
  { path: `${HOOK_BASE}/auto-fix-blackwell-doctrine-inject.mjs`, timeout: 2000 },
  { path: `${HOOK_BASE}/ollama-nav-enforce-inject.mjs`,       timeout: 2000 },
  { path: `${HOOK_BASE}/ollama-pipeline-injector.mjs`,        timeout: 8000 },
  { path: `${HOOK_BASE}/model-tier-advisor.mjs`,              timeout: 5000 },
  { path: `${HOOK_BASE}/ollama-prewarm-on-pipeline.mjs`,      timeout: 8000 },
  { path: `${HOOK_BASE}/node-card-prefetch-inject.mjs`,       timeout: 3000 },
  { path: `${HOOK_BASE}/agent-handoff-canonicalize.mjs`,      timeout: 3000 },
  { path: `${HOOK_BASE}/memory-rag-inject.mjs`,               timeout: 4000 },
  { path: "H:/.claude/hooks/search-thoroughness-inject.mjs",  timeout: 2000 },
  { path: `${HOOK_BASE}/tribal-by-domain-inject.mjs`,         timeout: 5000 },
  { path: `${HOOK_BASE}/path-replay-advise.mjs`,              timeout: 3000 },
  { path: `${HOOK_BASE}/mcp-connectivity-check.mjs`,          timeout: 2000 },
  { path: `${HOOK_BASE}/node-capability-inject.mjs`,          timeout: 2500 },
  { path: `${HOOK_BASE}/memory-index-precheck-inject.mjs`,    timeout: 5000 },
  { path: `${HOOK_BASE}/token-awareness-sidecar.mjs`,         timeout: 3000 },
  { path: `${HOOK_BASE}/token-awareness-inject.mjs`,          timeout: 2000 },
  { path: `${HOOK_BASE}/audit-viz-first-inject.mjs`,          timeout: 3000 },
  { path: `${HOOK_BASE}/ensure-index-daemon-guardian.mjs`,    timeout: 2000 },
  // ---- slot/soul/galaxy awareness ----
  { path: `${HOOK_BASE}/slot-domain-awareness-inject.mjs`,    timeout: 3000 },
  { path: `${HOOK_BASE}/domain-soul-agent-suggest.mjs`,       timeout: 3000 },
  { path: `${HOOK_BASE}/slot-soul-inject.mjs`,                timeout: 2000 },
  { path: `${HOOK_BASE}/galaxy-claudemd-inject.mjs`,          timeout: 3000 },
  { path: `${HOOK_BASE}/slot-brief-inject.mjs`,               timeout: 2000 },
  { path: `${HOOK_BASE}/slot-context-bundle-inject.mjs`,      timeout: 3000 },
  { path: `${HOOK_BASE}/ai-synergy-awareness-inject.mjs`,     timeout: 3000 },
  { path: `${HOOK_BASE}/zulu-advisory-inject.mjs`,            timeout: 3000 },
  { path: `${HOOK_BASE}/zulu-build-pointer-inject.mjs`,       timeout: 2000 },
  { path: `${HOOK_BASE}/psn-tag-parser-inject.mjs`,           timeout: 2000 },
  { path: `${HOOK_BASE}/session-reorient-inject.mjs`,         timeout: 3000 },
  { path: `${HOOK_BASE}/stale-state-warn.mjs`,                timeout: 2000 },
  { path: `${HOOK_BASE}/rtk-savings-headline-inject.mjs`,     timeout: 2000 },
  // ---- discipline/routing/budget (block-capable members preserved via propagation) ----
  { path: `${HOOK_BASE}/local-compute-intent.mjs`,            timeout: 5000 },
  { path: `${HOOK_BASE}/comprehensive-build-enforce.mjs`,     timeout: 2000 },
  { path: `${HOOK_BASE}/all-means-all-inject.mjs`,            timeout: 1500 },
  { path: `${HOOK_BASE}/token-budget-gate.mjs`,               timeout: 2000 },
  { path: `${HOOK_BASE}/critical-memory-compact-nudge.mjs`,   timeout: 3000 },
  { path: `${HOOK_BASE}/fleet-survival-advisory.mjs`,         timeout: 3000 },
  { path: `${HOOK_BASE}/auto-consensus-userprompt.mjs`,       timeout: 5000 },
  { path: `${HOOK_BASE}/auto-fanout-advisory.mjs`,            timeout: 3000 },
  { path: `${HOOK_BASE}/loop-iteration-inject.mjs`,           timeout: 5000 },
  { path: `${HOOK_BASE}/pick-prefresh-inject.mjs`,            timeout: 5000 },
  { path: `${HOOK_BASE}/goal-prereq-inject.mjs`,              timeout: 5000 },
  { path: `${HOOK_BASE}/heartbeat-keepalive.mjs`,             timeout: 8000 },
  { path: `${HOOK_BASE}/slot-session-sidecar-heartbeat.mjs`,  timeout: 3000 },
  { path: `${HOOK_BASE}/golf-slot-reaper-guardian.mjs`,       timeout: 10000 },
  { path: `${HOOK_BASE}/active-chat-priority-boost.mjs`,      timeout: 3000 },
  { path: `${HOOK_BASE}/psn-leg-state-inject.mjs`,            timeout: 2000 },
  { path: `${HOOK_BASE}/psn-prompt-checklist-inject.mjs`,     timeout: 2000 },
  { path: `${HOOK_BASE}/mcp-broadcast-reconnect-inject.mjs`,  timeout: 3000 },
  { path: `${HOOK_BASE}/prompt-route-inject.mjs`,             timeout: 3000 },
  // ---- former project-layer uniques (folded here so the project UPS section empties) ----
  { path: `${HOOK_BASE}/ollama-auto-router.mjs`,              timeout: 5000 },
  { path: `${HOOK_BASE}/prompt-rewriter-ollama.mjs`,          timeout: 4000 },
  { path: `${HOOK_BASE}/ollama-task-offloader.mjs`,           timeout: 3000 },
  { path: `${HOOK_BASE}/archived-skill-suggest.mjs`,          timeout: 1500 },
  { path: `${HOOK_BASE}/wiki-precheck-inject.mjs`,            timeout: 5000 },
  { path: `${HOOK_BASE}/chat-bus-inject.mjs`,                 timeout: 3000 },
  { path: `${HOOK_BASE}/ai-feature-recommend.mjs`,            timeout: 2000 },
  { path: `${HOOK_BASE}/discipline-expert-inject.mjs`,        timeout: 5000 },
  { path: `${HOOK_BASE}/auto-precompact-watchdog.mjs`,        timeout: 3000 },
  { path: `${HOOK_BASE}/claudemd-ollama-enforcer.mjs`,        timeout: 5000 },
  { path: `${HOOK_BASE}/prompt-rules-inject.mjs`,             timeout: 3000 },
  { path: `${HOOK_BASE}/optimal-context-inject.mjs`,          timeout: 5000 },
  { path: `${HOOK_BASE}/quality-dashboard-inject.mjs`,        timeout: 2000 },
  { path: `${HOOK_BASE}/self-awareness-enforce.mjs`,          timeout: 3000 },
  { path: `${HOOK_BASE}/goal-stack-inject.mjs`,               timeout: 3000 },
];

function getConcurrency() {
  const raw = process.env.PRISM_UPS_CORE_CONCURRENCY;
  if (raw == null || raw === "") return 16;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 16;
  return n; // 0 = unbounded
}

/** Bounded async pool -- at most `n` runHook()s in flight; results keep order. */
async function runPool(specs, payload, n) {
  if (n === 0) return Promise.all(specs.map((s) => runHook(s.path, payload, s.timeout || 3000)));
  const results = new Array(specs.length);
  let next = 0;
  async function worker() {
    while (next < specs.length) {
      const my = next++;
      const s = specs[my];
      results[my] = await runHook(s.path, payload, s.timeout || 3000);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, specs.length) }, worker));
  return results;
}

/** Pure: operator kill-switch (exported for tests; only exact "1" disables). */
export function isBundleDisabled(env = process.env) {
  return env.PRISM_UPS_CORE_DISABLE === "1";
}

async function main() {
  const payload = await readStdin();
  if (isBundleDisabled()) { emit({ continue: true }); return; }
  // UserPromptSubmit always has a prompt payload; if empty, emit nothing.
  if (!payload) { emit({ continue: true }); return; }
  const results = await runPool(SUB_HOOKS, payload, getConcurrency());

  const ctx = [];
  let blocked = false, blockReason = null;
  for (const r of results) {
    if (!r || !r.parsed) continue;
    const p = r.parsed;
    const dec = p.decision || (p.hookSpecificOutput && p.hookSpecificOutput.permissionDecision);
    if (p.continue === false || dec === "block" || dec === "deny") {
      blocked = true;
      blockReason = blockReason || p.reason || p.stopReason || p.systemMessage ||
        (p.hookSpecificOutput && p.hookSpecificOutput.permissionDecisionReason) || `blocked by ${r.hook}`;
    }
    const a = p.additionalContext;
    const b = p.hookSpecificOutput && p.hookSpecificOutput.additionalContext;
    if (a) ctx.push(String(a));
    if (b) ctx.push(String(b));
  }

  if (blocked) { emit({ continue: false, stopReason: blockReason, systemMessage: blockReason }); return; }
  const resp = { continue: true };
  if (ctx.length) resp.hookSpecificOutput = { hookEventName: "UserPromptSubmit", additionalContext: ctx.join("\n\n") };
  emit(resp);
}

// CLI-entry guard: run main() only when invoked directly as a hook, NOT on test import.
const __isCLI = process.argv[1] && (() => {
  try { return fileURLToPath(import.meta.url) === process.argv[1]; }
  catch { return false; }
})();
if (__isCLI) {
  main().catch((err) => {
    try { process.stderr.write(`ups-core-bundle error: ${err}\n`); } catch { /* */ }
    emit({ continue: true }); // fail open -- never wedge a prompt on a bundle crash
  });
}
