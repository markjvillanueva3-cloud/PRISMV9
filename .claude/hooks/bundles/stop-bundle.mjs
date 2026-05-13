#!/usr/bin/env node
// tier: T4
// stop-bundle.mjs — single Stop hook that runs the NON-BLOCKING Stop trackers.
//
// Why: the Stop event has ~30 `*`-matched hooks; each fires a fresh node.exe at
// every turn-end (≈30-spawn burst, ×N concurrent chats). This bundle absorbs
// only the ~14 trackers / sync / cleanup hooks that never block a Stop — the
// ~16 HARD-BLOCK gates (`stop_on_*`, `commit-pressure-stop-gate`,
// `always-build-guard`, `quality-dashboard-alert`) AND the slow supervised
// `git-sync-stop` stay as individual settings.json entries so their
// fail-closed / supervised-push semantics are exactly preserved. Net: Stop
// 30 → 17 hook invocations per turn-end.
//
// The bundle still PROPAGATES a block if any member ever emits one
// (`continue:false` / `decision:block`) — defensive; today none of the 14 do.
// On its own crash it fails OPEN (`{continue:true}`) — a crashed bundle must
// not wedge every Stop forever; the 16 individual gates are still in effect.
//
// Concurrency knob: PRISM_STOP_BUNDLE_CONCURRENCY (default 6, 0 = unbounded).
// Disable + revert: restore the 14 originals as individual Stop entries.
//
// stop_on_hook_unregistration.mjs's bundleAbsorbedHookNames() scans
// bundles/*.mjs for `.mjs` refs, so the 14 absorbed names count as "still
// registered" automatically — no allowlist edit needed.

import { runHook, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";

// MUST stay in sync with the Stop entries removed from settings.json.
// Timeouts mirror the original per-hook settings.json budgets.
const SUB_HOOKS = [
  { path: `${HOOK_BASE}/stop-auto-wire.mjs`,            timeout: 8000 },
  { path: `${HOOK_BASE}/stop-consensus-drain.mjs`,      timeout: 3000 },
  { path: `${HOOK_BASE}/output-cache-capture.mjs`,      timeout: 3000 },
  { path: `${HOOK_BASE}/roadmap-checkpoint.mjs`,        timeout: 5000 },
  { path: `${HOOK_BASE}/session-end-peer-share.mjs`,    timeout: 5000 },
  { path: `${HOOK_BASE}/duplication-guard-stop.mjs`,    timeout: 3000 },
  { path: `${HOOK_BASE}/stop-mark-completed-tasks.mjs`, timeout: 5000 },
  { path: `${HOOK_BASE}/claim-registry-release.mjs`,    timeout: 3000 },
  { path: `${HOOK_BASE}/linear-roadmap-sync.mjs`,       timeout: 5000 },
  { path: `${HOOK_BASE}/supabase-state-sync.mjs`,       timeout: 5000 },
  { path: `${HOOK_BASE}/stop-obsidian-memory-extract.mjs`, timeout: 5000 },
  { path: `${HOOK_BASE}/session-consolidate-graph.mjs`, timeout: 5000 },
  { path: `${HOOK_BASE}/stop_close_prism_nodes.mjs`,    timeout: 1000 },
  { path: `${HOOK_BASE}/stop_close_prism_nodes_v2.mjs`, timeout: 5000 },
  // HS-02 (2026-05-12): mid-session stale-lock cleanup. git-health-guard
  // ran this only on SessionStart, so locks accumulated mid-session.
  { path: `${HOOK_BASE}/git-lock-sweeper.mjs`,          timeout: 800 },
];

function getConcurrency() {
  const raw = process.env.PRISM_STOP_BUNDLE_CONCURRENCY;
  if (raw == null || raw === "") return 6;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 6;
  return n; // 0 = unbounded
}

/** Bounded async pool — at most `n` runHook()s in flight; results keep order. */
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
  // Stop hooks may legitimately get an empty payload; still run the trackers.
  const results = await runPool(SUB_HOOKS, payload || "{}", getConcurrency());

  const ctx = [];
  let blocked = false, blockReason = null;
  for (const r of results) {
    if (!r || !r.parsed) continue;
    const p = r.parsed;
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
  if (ctx.length) resp.hookSpecificOutput = { hookEventName: "Stop", additionalContext: ctx.join("\n\n") };
  emit(resp);
}

main().catch((err) => {
  try { process.stderr.write(`stop-bundle error: ${err}\n`); } catch { /* */ }
  emit({ continue: true }); // fail open — never wedge Stop on a bundle crash
});
