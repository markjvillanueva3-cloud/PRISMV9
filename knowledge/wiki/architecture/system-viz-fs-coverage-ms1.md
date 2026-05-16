---
title: SYSTEM-VIZ-FS-COVERAGE-MS1 — truncation recovery, cron re-walks, drift detection
type: architecture
milestone: SYSTEM-VIZ-FS-COVERAGE-MS1
status: complete
shipped_at: 2026-05-16
shipped_by: claude-b6c4b196 (slot alpha)
shipped_commit: a0b7091266
depends_on:
  - SYSTEM-VIZ-FS-COVERAGE-MS0
  - SYSTEM-VIZ-BRAIN-MS0
---

# SYSTEM-VIZ-FS-COVERAGE-MS1

Follow-up to [[system-viz-fs-coverage]] (MS0 — 1.57 M files, 70 namespaces). MS0 froze a snapshot;
MS1 keeps the graph honest with **three phases**:

- **Phase 0** — truncation recovery for the 3 namespaces flagged `truncated:true` in MS0
- **Phase 1** — cron-driven daily re-walk for top-churn namespaces
- **Phase 2** — drift detection (graph state vs disk reality)

All three shipped end-to-end in commit `a0b7091266` (2026-05-16).

## Phase 0 — truncation recovery

| namespace | before MS1 (cap) | after MS1 | bug fixed |
|-----------|------------------|-----------|-----------|
| `.claude` | 20 k cap (truncated) | 77,614 files / 100 k cap / **truncated=false** | — |
| `JM DIE` | 80 k cap (truncated) | 173,763 files / 250 k cap / **truncated=false** | spread→push call-stack overflow |
| `Docustrata` | 80 k cap (truncated) | ~215,950 files / 350 k cap / **truncated=false** | — |

**Spread→push bug fix in `expand-system-viz-l12-files.mjs` line 455:**
`g.edges.push(...augment.edges)` blew the JS call stack on JM DIE's 130,719 edges
(`RangeError: Maximum call stack size exceeded` — each spread arg is a stack frame on
`Array.push`). Replaced spread with iterative push. Now safe for any walk size.

**Final graph state after Phase 0:** 372,731 nodes / 591,479 edges / 70 namespaces / **1,861,079 files**
represented / **stillTruncated=0**.

## Phase 1 — cron-driven daily re-walk

Three artifacts:

| File | Role |
|---|---|
| `scripts/lib/namespace-churn-ranker.mjs` | Pure helper — ranks namespaces by churn score (`(dirMtime − lastWalkedAt) / lastWalkAgeMs + truncationBoost + cappedBoost + stalenessBoost`). 33 `node:test` cases. |
| `scripts/cron-revwalk.mjs` | CLI wrapper. Sequential walks (concurrent-writer trample is FATAL on 250 MB graph). Atomic lock file `state/shared/.cron-revwalk.lock` (90 min stale threshold). Per-walk timeout (default 30 min). 8 GB heap default (`--max-old-space-size=8192`). 12 `node:test` cases. |
| `.claude/helpers/install-system-viz-revwalk-task.ps1` | Windows scheduled task installer. Registers `PRISM System-Viz Re-walk Daily` at 03:15 local (off-set from the 03:00 cleanup + 03:30 reaper tasks). Idempotent; `-Uninstall` reverses. |

**Score components (pure function, exhaustively tested):**
- `deltaMs / lastWalkAgeMs` — base rate (activity per age)
- `+ 0.5` if `truncated === true` (overdue retry)
- `+ 0.3` if `coverageRatio < 1.0` (incomplete walk)
- `+ 1.0` if `lastWalkAgeMs > 24h` (staleness boost)

Determinism: same input → same output. Tied scores break by namespace ASC for stable ordering.

## Phase 2 — drift detection

Three artifacts:

| File | Role |
|---|---|
| `scripts/detect-system-viz-drift.mjs` | 6-category classifier: `fresh / stale-time / stale-churn / truncated / root-missing / never-walked`. Severity rank for sort. Atomic `DRIFT_REPORT.json` writer. 20 `node:test` cases. |
| `.claude/commands/system-viz-drift.md` | `/system-viz-drift` skill. Auto-trigger on keywords `drift / stale graph / fscoverage / what's drifted / re-walk what`. Refresh flag, top-N filter, category filter, JSON output. |
| `.claude/hooks/stop-system-viz-drift.mjs` | Stop-time T3 advisory hook. Throttled (60 min per session). Fires when drift report > 12 h OR drift count > 10 OR any truncated/root-missing. Strictly non-blocking. Kill switch `PRISM_DRIFT_STOP_HOOK_DISABLE=1`. Wired at Stop[7] in `C:/Users/wompu/.claude/settings.json` between `session-end-peer-share` and `duplication-guard-stop` (the advisory cluster — see [[reference_stop_advisory_wiring_cluster_2026_05_15]]). |

**Live report at session ship:** 4/67 drifted (4 stale-churn entries — `scripts/`, `state/`, `data/`, `prism-cadc34-rescue/` — all expected from active development).

## Tests

Total **89 `node:test` cases pass** (33 + 12 + 20 + 24) — `vitest` harness still broken per the known [[reference_fleet_reaper_ms1]] regression. Run any one:

```bash
node --test H:/prism/scripts/lib/namespace-churn-ranker.test.mjs
node --test H:/prism/scripts/cron-revwalk.test.mjs
node --test H:/prism/scripts/detect-system-viz-drift.test.mjs
```

## Knobs (env, alphabetical)

| knob | scope | effect |
|------|-------|--------|
| `PRISM_DRIFT_MAX_STALENESS_HOURS=N` | detector | default 24 — staleness threshold |
| `PRISM_DRIFT_STOP_HOOK_DISABLE=1` | Stop hook | off entirely (kill switch) |
| `PRISM_DRIFT_STOP_HOOK_THRESHOLD=N` | Stop hook | drift-count nudge threshold (default 10) |
| `PRISM_DRIFT_STOP_MAX_AGE_HOURS=N` | Stop hook | report-age threshold (default 12) |
| `PRISM_DRIFT_STOP_THROTTLE_MIN=N` | Stop hook | per-session throttle (default 60) |
| `PRISM_DRIFT_TOLERANCE_MS=N` | detector | default 30000 — debounces FS mtime jitter |

## Companion surfaces

- [[system-viz]] — the live 3D graph viewer
- [[system-viz-fs-coverage]] — MS0 (the snapshot this milestone keeps honest)
- [[fleet-reaper]] — sibling cron pattern (scheduled task + Stop hook + Monitor)
- `state/shared/system-viz/DRIFT_REPORT.json` — the report
- `state/shared/system-viz/system-graph.json` — the graph itself
- `mcp-server/data/milestones/SYSTEM-VIZ-FS-COVERAGE-MS1.json` — milestone envelope

## Related regressions

The Phase 0 spread-push bug is logged in `H:/prism/CLAUDE.md` §Recent regressions. The
`mergeIntoGraph` augment-edges path is now safe at any scale; the JM DIE walk that took
3 attempts pre-fix succeeds on the first try post-fix.
