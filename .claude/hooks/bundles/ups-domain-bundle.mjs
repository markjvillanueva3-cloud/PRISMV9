#!/usr/bin/env node
// tier: T4
// ups-domain-bundle.mjs -- single UserPromptSubmit hook that runs the
// SLOT-SPECIFIC domain awareness + approach injectors (the SUB_HOOKS list below
// is the source of truth for the count) in ONE process.
//
// Why: each domain injector (delta-cad, echo-post, xray-blueprint, foxtrot-mill,
// sierra-graph, lima-academy, charlie-quoting x2, whiskey-lathe) is a GLOBAL
// UserPromptSubmit hook -- it spawns a portable-node bash.exe + node on EVERY
// prompt for ALL slots, but only EMITS for its own slot (or a domain-keyword
// match). For 25/26 slots each is a wasted bash.exe per prompt, feeding the
// fork-storm (FORK-STORM-CONSOLIDATION, slot:india 2026-06-14; live storm peaked
// 612 vs the 400 ceiling). This bundle runs all 9 as node-children in ONE process
// (no per-hook bash.exe wrapper), and is fast: 9 short advisory injectors, pooled.
//
// Each injector keeps its OWN slot/keyword gate + injection-dedup; the bundle only
// co-locates them. NON-BLOCKING (all 9 are advisory injectors); the bundle still
// PROPAGATES a block defensively if any member ever emits one (continue:false /
// decision:block|deny). Fail-OPEN on its own crash -- never wedge a prompt.
//
// Reuses the proven stop-bundle/stop-regression-bundle aggregator + the shared
// hook-runner. stop_on_hook_unregistration.bundleAbsorbedHookNames() scans
// bundles/*.mjs for .mjs refs, so the 9 absorbed names count as still-registered.
//
// Concurrency knob: PRISM_UPS_DOMAIN_CONCURRENCY (default 6, 0 = unbounded).
// Disable knob: PRISM_UPS_DOMAIN_DISABLE=1 -> the bundle emits nothing (all 9
//   domain injectors silenced in one switch). Closes the injection-surface audit's
//   sole "knobless context-injector" gap (audit-injection-surface.mjs, 2026-06-18
//   slot:golf): the WRAPPER previously had no off-switch even though each member
//   self-gates by slot + keeps its own disable knob + injection-dedup. This single
//   switch lets an operator kill all 9 at once under extreme API-pressure without
//   setting 9 separate env vars. Default-unset = byte-identical behavior.
// Full revert: restore the 9 originals as individual UserPromptSubmit entries.

import { runHook, readStdin, emit } from "./lib/hook-runner.mjs";
import { fileURLToPath } from "node:url";

const HOOK_BASE = "H:/prism/.claude/hooks";

// MUST stay in sync with the UserPromptSubmit entries removed from settings.json.
// Timeouts mirror the original per-hook settings.json budgets EXACTLY, and each
// `path` is the EXACT file the removed standalone wire ran (verified 2026-06-14)
// so behavior is byte-identical. NOTE THE THREE DISTINCT ROOTS -- the operator
// wired these from different trees; we preserve each rather than "normalize":
//   * 7 from the canonical repo tree H:/prism/.claude/hooks/
//   * whiskey-lathe from the GLOBAL mirror H:/.claude/hooks/ (the wired path)
//   * lima-academy from the LIMA SLOT WORKTREE (only copy on disk). runHook is
//     fail-soft, so if that worktree is ever removed lima-academy simply no-ops
//     -- which is correct, because the lima slot is then inactive anyway.
// FOLLOW-UP (hygiene, not this lane): canonicalize lima-academy into the repo
// tree so a global UserPromptSubmit hook does not depend on a slot worktree.
const SUB_HOOKS = [
  { path: `${HOOK_BASE}/delta-cad-awareness-inject.mjs`,                  timeout: 4000 },
  { path: `${HOOK_BASE}/echo-post-domain-inject.mjs`,                     timeout: 3000 },
  { path: `${HOOK_BASE}/xray-blueprint-domain-inject.mjs`,               timeout: 3000 },
  { path: `${HOOK_BASE}/foxtrot-mill-awareness-inject.mjs`,              timeout: 4000 },
  { path: `${HOOK_BASE}/mike-wedm-context-inject.mjs`,                    timeout: 4000 },
  { path: `${HOOK_BASE}/kilo-cam-context-inject.mjs`,                     timeout: 4000 },
  { path: `${HOOK_BASE}/sierra-graph-health-inject.mjs`,                 timeout: 3000 },
  { path: "H:/prism-slot-lima/.claude/hooks/lima-academy-awareness-inject.mjs", timeout: 4000 },
  { path: `${HOOK_BASE}/charlie-quoting-awareness-inject.mjs`,           timeout: 3000 },
  { path: `${HOOK_BASE}/charlie-quoting-knowledge-inject.mjs`,           timeout: 3000 },
  { path: "H:/.claude/hooks/whiskey-lathe-context-inject.mjs",           timeout: 5000 },
  // ---- 4 greenfield approach-firing hooks (slot:zulu 2026-07-01, DOMAIN-APPROACH-ENRICH) ----
  // Fire the new speed-feed/business/academy/quoting approach-knowledge libs (op-detect ->
  // fireForApproach). Each self-gates by slot + domain keyword and fail-soft-imports its lib.
  { path: `${HOOK_BASE}/oscar-speed-feed-approach-inject.mjs`,           timeout: 3000 },
  { path: `${HOOK_BASE}/hotel-business-approach-inject.mjs`,             timeout: 3000 },
  { path: `${HOOK_BASE}/lima-academy-approach-inject.mjs`,               timeout: 3000 },
  { path: `${HOOK_BASE}/charlie-quoting-approach-inject.mjs`,            timeout: 3000 },
];

function getConcurrency() {
  const raw = process.env.PRISM_UPS_DOMAIN_CONCURRENCY;
  if (raw == null || raw === "") return 6;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 6;
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

/**
 * Pure: is the whole bundle disabled by the operator kill-switch? Exported so the
 * revert-proof test can assert the knob without spawning the 9 real sub-hooks.
 * Only the exact string "1" disables (mirrors the fleet's PRISM_*_DISABLE convention);
 * unset / "0" / any other value runs normally.
 */
export function isBundleDisabled(env = process.env) {
  return env.PRISM_UPS_DOMAIN_DISABLE === "1";
}

async function main() {
  const payload = await readStdin();
  // Operator kill-switch: silence all 9 domain injectors in one switch (drain stdin
  // first so the harness pipe never blocks, THEN short-circuit before the pool runs).
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

// CLI-entry guard: run main() only when invoked directly as a hook, NOT when a test
// imports isBundleDisabled (an import would otherwise await stdin and hang the runner).
const __isCLI = process.argv[1] && (() => {
  try { return fileURLToPath(import.meta.url) === process.argv[1]; }
  catch { return false; }
})();
if (__isCLI) {
  main().catch((err) => {
    try { process.stderr.write(`ups-domain-bundle error: ${err}\n`); } catch { /* */ }
    emit({ continue: true }); // fail open -- never wedge a prompt on a bundle crash
  });
}
