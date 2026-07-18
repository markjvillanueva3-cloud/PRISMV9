#!/usr/bin/env node
// tier: T4
// sessionstart-bundle.mjs — single SessionStart hook for the context-injector /
// non-critical SessionStart hooks.
//
// Why: SessionStart had ~32 hooks, each a fresh node.exe at session start
// (≈3-5 s of cold-start fan-out before the session is usable). This bundle
// absorbs only the ~19 pure context-injectors / convenience hooks. The
// ~13 critical ones stay individual: the env guards (portable-node-guard,
// portable-python-guard, dotclaude-junctions-guard, settings-mirror-guard),
// the settings/refs guard (verify-hook-refs), the resume/identity hooks
// (session-id-pin, settings-baseline-snapshot — the baseline
// stop_on_hook_unregistration reads —, session-handoff-load, roadmap-resume,
// chat-state-isolator), the git fetch (git-sync-fetch), git-health-guard,
// and session-start-zombie-reap (must run first). A crash here degrades the
// session (missing some injected context) but never breaks it.
//
// Concurrency knob: PRISM_SESSIONSTART_BUNDLE_CONCURRENCY (default 6, 0 = unbounded).
// Revert: restore the 19 originals as individual SessionStart entries.
//
// stop_on_hook_unregistration.mjs's bundleAbsorbedHookNames() scans bundles/*.mjs,
// so the 19 absorbed names count as "still registered" automatically.

import { runHook, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";

// MUST stay in sync with the SessionStart entries removed from settings.json.
// Timeouts mirror the original per-hook settings.json budgets.
const SUB_HOOKS = [
  { path: `${HOOK_BASE}/multi-computer-awareness.mjs`,    timeout: 3000 },
  { path: `${HOOK_BASE}/ollama-autostart.mjs`,            timeout: 5000 },
  { path: `${HOOK_BASE}/nim-autostart.mjs`,               timeout: 5000 },
  { path: `${HOOK_BASE}/plugin-path-fixer.mjs`,           timeout: 3000 },
  { path: `${HOOK_BASE}/session-start-goal-inject.mjs`,   timeout: 3000 },
  { path: `${HOOK_BASE}/inventory-check-guard.mjs`,       timeout: 5000 },
  { path: `${HOOK_BASE}/expert-role-inject.mjs`,          timeout: 2000 },
  { path: `${HOOK_BASE}/ai-command-awareness.mjs`,        timeout: 3000 },
  { path: `${HOOK_BASE}/ai-deep-intelligence.mjs`,        timeout: 3000 },
  { path: `${HOOK_BASE}/claude-brief-inject.mjs`,         timeout: 5000 },
  { path: `${HOOK_BASE}/build-state-inject.mjs`,          timeout: 8000 },
  { path: `${HOOK_BASE}/gsd-inject.mjs`,                  timeout: 2000 },
  { path: `${HOOK_BASE}/tier1-context-pack.mjs`,          timeout: 3000 },
  { path: `${HOOK_BASE}/output-cache-inject.mjs`,         timeout: 2000 },
  { path: `${HOOK_BASE}/cognitive-budget-allocator.mjs`,  timeout: 3000 },
  { path: `${HOOK_BASE}/curiosity-explorer.mjs`,          timeout: 3000 },
  { path: `${HOOK_BASE}/agent-worktree-stale-unlock.mjs`, timeout: 3000 },
  // U-DOCU-04/MS-DOCU-INGEST — cheap canary: warns if the v6 blueprint↔program
  // join JSONL is missing or >10d stale (single fs.statSync, no streaming).
  // Also registered as an individual SessionStart entry — the bundle's own
  // settings.json wiring is currently dormant (see the hook's docblock).
  { path: `${HOOK_BASE}/blueprint-join-index-stale-check.mjs`, timeout: 2000 },
];

function getConcurrency() {
  const raw = process.env.PRISM_SESSIONSTART_BUNDLE_CONCURRENCY;
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
  const results = await runPool(SUB_HOOKS, payload || "{}", getConcurrency());
  const ctx = [];
  for (const r of results) {
    if (!r || !r.parsed) continue;
    const p = r.parsed;
    const a = p.additionalContext;
    const b = p.hookSpecificOutput && p.hookSpecificOutput.additionalContext;
    if (a) ctx.push(String(a));
    if (b) ctx.push(String(b));
  }
  const resp = { continue: true };
  if (ctx.length) resp.hookSpecificOutput = { hookEventName: "SessionStart", additionalContext: ctx.join("\n\n") };
  emit(resp);
}

main().catch((err) => {
  try { process.stderr.write(`sessionstart-bundle error: ${err}\n`); } catch { /* */ }
  emit({ continue: true }); // fail open — never block session start on a bundle crash
});
