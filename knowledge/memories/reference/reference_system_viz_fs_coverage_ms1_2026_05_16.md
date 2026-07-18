---
name: system-viz-fs-coverage-ms1-2026-05-16
description: SYSTEM-VIZ-FS-COVERAGE-MS1 shipped — 3-phase milestone (truncation recovery + cron re-walks + drift detection) + spread-push bug fix in mergeIntoGraph
aliases: reference_system_viz_fs_coverage_ms1_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.216Z
---


2026-05-16 SYSTEM-VIZ-FS-COVERAGE-MS1 shipped end-to-end in commit `a0b7091266` (slot alpha, claude-b6c4b196 on DESKTOP-N7MI1VB).

**3 phases:**
- **Phase 0** — Truncation recovery: .claude (77,614 files / 100k cap), JM DIE (173,763 files / 250k cap), Docustrata (~215,950 files / 350k cap). All `truncated:false` post-fix. Final graph 372,731 nodes / 591,479 edges / 70 namespaces / 1,861,079 files / **stillTruncated=0** (post root-missing prune: 67 namespaces).
- **Phase 1** — Cron-driven daily re-walk: `scripts/lib/namespace-churn-ranker.mjs` (pure helper, 33 tests) + `scripts/cron-revwalk.mjs` (CLI, 12 tests, sequential walks, atomic lock file, 8 GB heap, per-walk timeout) + `.claude/helpers/install-system-viz-revwalk-task.ps1` (Windows scheduled task at 03:15 local, idempotent + `-Uninstall`).
- **Phase 2** — Drift detection: `scripts/detect-system-viz-drift.mjs` (6-category classifier: fresh/stale-time/stale-churn/truncated/root-missing/never-walked, 20 tests) + `.claude/commands/system-viz-drift.md` (`/system-viz-drift` skill) + `.claude/hooks/stop-system-viz-drift.mjs` (T3 advisory, throttled 60min/session, wired at Stop[7] in C: settings.json between `session-end-peer-share` and `duplication-guard-stop` — the advisory cluster per [[reference_stop_advisory_wiring_cluster_2026_05_15]]).

**Bug fix encoded:** `expand-system-viz-l12-files.mjs` line 455 `g.edges.push(...augment.edges)` blew the call stack on JM DIE's 130,719 edges (`RangeError: Maximum call stack size exceeded` — each spread arg is a `Function.apply` stack frame). Fixed with iterative push. Now safe at any walk size. The JM DIE walk that took 3 attempts pre-fix succeeds first try post-fix.

**Tests:** 89 `node:test` cases pass (33 + 12 + 20 + 24). Vitest harness still broken per [[reference_fleet_reaper_ms1]].

**Knobs added:** `PRISM_DRIFT_MAX_STALENESS_HOURS=N`, `PRISM_DRIFT_STOP_HOOK_DISABLE=1`, `PRISM_DRIFT_STOP_HOOK_THRESHOLD=N` (default 10), `PRISM_DRIFT_STOP_MAX_AGE_HOURS=N` (default 12), `PRISM_DRIFT_STOP_THROTTLE_MIN=N` (default 60), `PRISM_DRIFT_TOLERANCE_MS=N` (default 30000).

Wiki: [[system-viz-fs-coverage-ms1]] · Sister: [[system-viz-fs-coverage]] (MS0) · [[fleet-reaper]] (sibling cron pattern).
