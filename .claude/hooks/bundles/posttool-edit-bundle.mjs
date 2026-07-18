#!/usr/bin/env node
// tier: T3
// posttool-edit-bundle.mjs — single PostToolUse hook (matcher: Edit|Write|MultiEdit).
//
// Replaces 19 individual PostToolUse entries (the Edit|Write|MultiEdit matcher
// group + the lone recall-counter-track Write|Edit|MultiEdit entry) with ONE
// concurrency-bounded invocation. Each sub-hook is still spawned (they're
// standalone scripts that process.exit), but at most N at a time — instead of
// all 19 cold-starting `node` simultaneously × 6 concurrent chats, which
// saturates the Windows process table and balloons every cold-start (the
// "chats stalling" symptom). The 19 original settings.json entries are switched
// to `exit 0` no-ops (≈20ms shell each) so they don't double-run — this bundle
// is the one that runs them.
//
// PostToolUse hooks cannot block a tool call (it already ran), so aggregation
// is simply: concatenate every sub-hook's additionalContext. A sub-hook that
// times out / crashes is dropped silently (hook-runner's runHook is fail-safe
// and bounded). If the bundle itself fails, it emits {continue:true} — the only
// loss is post-edit advisory context for one tool call (none of these 19 are
// gates; all PostToolUse hooks here are trackers / lint / suggesters / mirrors).
//
// Concurrency knob: PRISM_POSTTOOL_BUNDLE_CONCURRENCY (default 6, 0 → unbounded).
// Disable the bundle and fall back: keep the 19 originals real in settings.json.

import { runHook, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";

// MUST stay in sync with the Edit|Write|MultiEdit + Write|Edit|MultiEdit
// PostToolUse entries in settings.json. Order ≈ original settings order.
// Timeouts mirror the original per-hook settings.json budgets.
const SUB_HOOKS = [
  // HS-12 (2026-05-12): tool-call runtime log; same hook as in the
  // bash/read bundle. Cheap (~2-5ms); appends to .tool-runtimes.jsonl.
  { path: `${HOOK_BASE}/tool-watchdog.mjs`,                     timeout: 1000 },
  // DEV-VELOCITY-AUTOTRIGGER-MS0 Phase A.3 (2026-05-12): PostEdit BOM-restoration
  // arm. Pairs with the PreEdit stash in edit-bundle.mjs SAFETY_HOOKS. If Edit
  // stripped a UTF-8 BOM from .ps1/.psm1/.bat/.cmd/.reg, this auto-restores it
  // via temp+rename. Prevents HS-14-class regression (PS5.1 em-dash mis-decode).
  { path: `${HOOK_BASE}/encoding-guard.mjs`,                    timeout: 2000 },
  { path: `${HOOK_BASE}/directive-summary-refresh-iooms.mjs`,   timeout: 3000 },
  { path: `${HOOK_BASE}/inventory-on-write.mjs`,                timeout: 2000 },
  { path: `${HOOK_BASE}/c-to-h-mirror.mjs`,                     timeout: 3000 },
  { path: `${HOOK_BASE}/edit-multiedit-suggest.mjs`,            timeout: 2000 },
  { path: `${HOOK_BASE}/auto-lint-post-edit.mjs`,               timeout: 1500 }, // detached eslint --fix; returns ~10ms (set PRISM_LINT_INLINE=1 for the old blocking behavior + bump this)
  // build-cache-manager.mjs + build-tracker.mjs intentionally NOT bundled here:
  // both live in .claude/helpers/ (not hooks/) and already fire correctly via
  // settings.json's literal helpers/ path (lines ~999/1004). The prior
  // ${HOOK_BASE}/ refs resolved to .claude/hooks/ → ENOENT (dead) AND were
  // redundant double-wires. Removed 2026-05-16 (AAM04 scope-mismatch audit).
  { path: `${HOOK_BASE}/dispatcher-import-validator.mjs`,       timeout: 3000 },
  { path: `${HOOK_BASE}/jm-die-provenance-guard.mjs`,           timeout: 3000 },
  { path: `${HOOK_BASE}/ingestion-cache-root-guard.mjs`,        timeout: 3000 },
  { path: `${HOOK_BASE}/physics-canonical-constants-guard.mjs`, timeout: 3000 },
  { path: `${HOOK_BASE}/write-tracker.mjs`,                     timeout: 2000 },
  { path: `${HOOK_BASE}/write-import-check.mjs`,                timeout: 3000 },
  { path: `${HOOK_BASE}/edit-batch-detector.mjs`,               timeout: 2000 },
  { path: `${HOOK_BASE}/memory-mirror-to-vault.mjs`,            timeout: 5000 },
  { path: `${HOOK_BASE}/tribal-autowire.mjs`,                   timeout: 3000 },
  { path: `${HOOK_BASE}/unified-edit-tap.mjs`,                  timeout: 2000 },
  // Awareness #5 (slot:bravo 2026-06-11): post-edit blast-radius advisory —
  // surfaces REAL git-grep importers of an edited src file (throttled, advisory).
  { path: `${HOOK_BASE}/edit-consumer-advisory.mjs`,            timeout: 3000 },
  { path: `${HOOK_BASE}/recall-counter-track.mjs`,              timeout: 2500 },
];

function getConcurrency() {
  const raw = process.env.PRISM_POSTTOOL_BUNDLE_CONCURRENCY;
  if (raw == null || raw === "") return 6;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 6;
  return n; // 0 = unbounded
}

/** Bounded async pool: at most `n` runHook()s in flight; results keep spec order. */
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

async function main() {
  const payload = await readStdin();
  if (!payload || !payload.trim()) { emit({ continue: true }); return; }
  const results = await runPool(SUB_HOOKS, payload, getConcurrency());
  const ctx = [];
  let blocked = false, blockReason = null;
  for (const r of results) {
    if (!r || !r.parsed) continue;
    const p = r.parsed;
    // Propagate a "stop" signal — a few of these guards (physics-canonical-
    // constants, jm-die-provenance, ingestion-cache-root) emit continue:false /
    // decision:block on a violation; PostToolUse continue:false halts the agent.
    const dec = p.decision || (p.hookSpecificOutput && p.hookSpecificOutput.permissionDecision);
    if (p.continue === false || dec === "block" || dec === "deny") {
      blocked = true;
      blockReason = blockReason || p.reason || p.stopReason || p.systemMessage ||
        (p.hookSpecificOutput && p.hookSpecificOutput.permissionDecisionReason) || `Stopped by ${r.hook}`;
    }
    const a = p.additionalContext;
    const b = p.hookSpecificOutput && p.hookSpecificOutput.additionalContext;
    if (a) ctx.push(String(a));
    if (b) ctx.push(String(b));
  }
  if (blocked) { emit({ continue: false, stopReason: blockReason, systemMessage: blockReason }); return; }
  const resp = { continue: true };
  if (ctx.length) resp.hookSpecificOutput = { hookEventName: "PostToolUse", additionalContext: ctx.join("\n\n") };
  emit(resp);
}

main().catch((err) => {
  try { process.stderr.write(`posttool-edit-bundle error: ${err}\n`); } catch { /* */ }
  emit({ continue: true });
});
