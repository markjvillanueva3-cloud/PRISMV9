---
title: stop-close-own-bg-tasks false-positive fix (process-snapshot vs tracked registry)
type: lessons
domain: fleet-hygiene
slot: charlie
created: 2026-06-14
tags: [hooks, stop-hook, fleet-reaper, R12, R14, false-positive, bash-orphan]
---

# stop-close-own-bg-tasks false-positive fix

## Symptom
A chat's Stop was blocked by `stop-close-own-bg-tasks.mjs`: *"Close your background tasks (R14). You left 62 run_in_background Bash task(s) running"* — but the chat never used `run_in_background: true`, and `TaskList` showed 0 tasks. The log (`state/shared/close-bg-tasks.log`) held **253 such false-blocks**, with counts up to **370 and 292** bash processes — implausible as genuine background tasks.

## Root cause
The hook detects un-closed background tasks via a **raw process snapshot**, not the harness's tracked-task registry. `selectUnclosedBgTasks` flagged ANY `bash.exe` that (a) is a descendant of the chat's `claude.exe` and (b) is older than `AGE_FLOOR_SEC` (default **10s**). That heuristic cannot distinguish a real `run_in_background` Bash task from the transient `bash.exe` the fleet routinely produces:
- pipeline subshells (`|`), command substitution (`$(...)`), RTK wrappers;
- the **detached helpers the 63-hook Stop chain spawns on every Stop** (fleet-reaper, consolidate-graph, wiki-watchdog, fleet-task-health) and their bash-invoking subcommands.

Worse, the block **re-fired** the 63-hook Stop chain, spawning more detached helpers → more `bash.exe` → a self-amplifying cascade. The processes were transient (gone within seconds; a live check showed `bash.exe count total: 0`).

## Fix
1. **Raised `AGE_FLOOR_SEC` default 10 → 45s** — transient/hook bursts live seconds; a genuine un-closed task lives minutes.
2. **Added a stability re-check** (`STABILITY_RECHECK_MS`, default 1500ms) — re-snapshot ONCE (only when the cheap first pass found candidates) and keep only bash still alive (`intersectAlive`). A transient burst vanishes; a real task persists. Extracted to `selectStableBgTasks({procs,chatPid,ageFloorSec,now,stabilityMs,enumerate,sleep})` so `main()`'s wiring is integration-tested with injected fake enumerate/sleep — not just the pure helper (the recurring "pure-core tested, wiring untested" gap).
3. **R12-honest message** — no longer asserts the processes *are* `run_in_background` tasks; the stability clause is conditional (honest when `STABILITY_MS=0`).
4. **Breaks the amplification loop** — not false-blocking lets Stop complete, so the 63-hook chain doesn't re-fire repeatedly.

16 `node:test` cases (11 original + 5 new); per-file 2-reviewer scrutiny PASS (one reviewer FAILed on 2 P1s — message over-claim on the disabled-knob path + untested `main()` wiring — both fixed, re-reviewed PASS).

## Lessons
- **A process snapshot is not a task registry.** Any detector that infers "the user left X running" from raw OS processes will false-positive on the fleet's normal transient process churn. Prefer the authoritative registry; if unavailable, require **persistence** (a real leak survives a stability window) before acting.
- **A blocking Stop hook can amplify the very condition it detects** when the block re-fires a large hook chain. Fail-open + persistence-gating is safer than aggressive blocking.
- **Gitignored harness hooks deploy on save.** `.claude/hooks/*.mjs` are local (absolute-path-referenced in settings.json), not git-tracked — the edit is the deployment, and the cross-worktree firewall hard-blocks slot edits to them (override `PRISM_CROSS_WORKTREE_BYPASS=1`).

Memory: [[reference_charlie_bgtask_hook_falsepositive_fix_2026_06_14]].
