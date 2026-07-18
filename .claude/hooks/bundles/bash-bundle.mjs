#!/usr/bin/env node
// tier: T1
// bash-bundle.mjs — single PreToolUse hook for Bash. Replaces the 6-hook
// Bash matcher in settings.json with one bundled invocation.

import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";
const HELPER_BASE = "H:/prism/.claude/helpers";

const BASH_HOOKS = [
  // 2026-05-18 (slot kilo): swapped older `helpers/rtk-reminder.mjs` for the
  // newer `hooks/rtk-prefix-reminder.mjs` (T1 from INTEL-OLLAMA-OBSIDIAN-MS0/
  // P6-U02). The new hook exports pure helpers (normalizeCommand/shouldRemind/
  // buildReminder), has a PRISM_RTK_REMINDER_OFF=1 env off-switch, and skips
  // already-rtk + `command <x>` bypass + sub-5-char trivial commands. The old
  // helper is kept on disk per feedback_never_delete_only_disable — re-enable
  // by swapping back if a regression surfaces.
  { path: `${HOOK_BASE}/rtk-prefix-reminder.mjs`,            timeout: 2000 },
  { path: `${HELPER_BASE}/test-run-gate.mjs`,                timeout: 5000 },
  { path: `${HOOK_BASE}/commit-ownership-guard.mjs`,         timeout: 5000 },
  // TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18): doctrine R13 — intercepts
  // `slot-task-claim.mjs claim --unit <X>` and BLOCKS when the unit's source
  // is stale vs fleet activity (already-shipped / rescoped / git-down-unprovable).
  // Fast-path IO-free on non-claim Bash; fail-open on any internal error;
  // clears via --ack-stale token or PRISM_TASK_FRESHNESS_BYPASS=1 (audited).
  // Kill switch: PRISM_TASK_FRESHNESS_GATE_DISABLE=1.
  { path: `${HOOK_BASE}/task-freshness-gate.mjs`,            timeout: 5000 },
  // FORK-STORM-CONSOLIDATION (2026-06-14, slot:india): folded git-index-lock-sweep +
  // slot-commit-worktree-enforce in from their standalone settings.json Bash wires so
  // they run as bundle node-children (no per-hook portable-node bash.exe wrapper) --
  // directly cutting the bash.exe fork-storm (was 429 live vs 400 ceiling). The
  // commit-routing pair (worktree-commit-route + git-add-lane-guard) was DOUBLE-WIRED
  // (standalone AND here); the standalone copies are removed, timeouts bumped 2000->4000
  // to keep the budget the standalone wires had.
  { path: `${HOOK_BASE}/git-index-lock-sweep.mjs`,           timeout: 5000 },
  { path: `${HOOK_BASE}/slot-commit-worktree-enforce.mjs`,   timeout: 5000 },
  { path: `${HOOK_BASE}/worktree-commit-route.mjs`,          timeout: 4000 },
  // SLOT-WORKTREE-MS0/U-P1-ADD-LANE-GUARD (2026-05-15): default-OFF, env-opt-in
  // (PRISM_GIT_ADD_LANE_ENABLE=1) `git add` SLOT-LANE gate. Blocks staging files
  // outside the chat's slot worktree root once the per-slot cutover is done.
  // Pure no-op until armed; activation gate lives inside main(), not top-level,
  // so the module remains importable by the test/smoke harness.
  { path: `${HOOK_BASE}/git-add-lane-guard.mjs`,             timeout: 4000 },
  { path: `${HOOK_BASE}/html-companion-guard.mjs`,           timeout: 3000 },
  // 2026-05-18 (slot kilo): rtk-auto-suggest DISABLED — its rate-limit logic was
  // ported into rtk-prefix-reminder.mjs (line 19's hook) which now covers the same
  // ground with broader command normalization. Both running simultaneously double-
  // nagged on every git/gh/npm call. File preserved on disk per
  // [[feedback_never_delete_only_disable]] — re-enable by un-commenting this line
  // if a regression surfaces in rtk-prefix-reminder.
  // { path: `${HOOK_BASE}/rtk-auto-suggest.mjs`,               timeout: 2000 },
  { path: `${HOOK_BASE}/bash-destructive-guard.mjs`,         timeout: 2000 },
  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
  // FORK-STORM-CONSOLIDATION (2026-06-14, slot:india): pure-advisory inject hooks
  // (no deny/ask/block) folded in from their standalone settings.json Bash wires so
  // they run as bundle node-children -- no per-hook bash.exe wrapper.
  { path: `${HOOK_BASE}/pre-bash-graph-inject.mjs`,          timeout: 4000 },
  { path: `${HOOK_BASE}/pre-tool-savings-multi.mjs`,         timeout: 2000 },
  // DEV-VELOCITY-AUTOTRIGGER-MS0/U-C2 (2026-05-12): PreToolUse arm of the
  // git-lock-sweeper. When the bash command starts with git/gh the hook applies
  // a tight 30s top-lock threshold (vs the legacy 5-min sweep at Stop). Non-git
  // bash commands run a no-op pass (5-min threshold; usually no removals).
  { path: `${HOOK_BASE}/git-lock-sweeper.mjs`,               timeout: 1500 },
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
  const result = await runBundle(BASH_HOOKS, stdinPayload);
  emit(result);
}

main().catch((err) => {
  process.stderr.write(`bash-bundle error: ${err}\n`);
  emit({ continue: true });
});
