---
name: reference_wedm_next_ms0_wn06_wn08_closeout_2026_05_23
description: "WEDM-NEXT-MS0/U-WN06+U-WN08 envelope close-out — silent drift, engines+tests+wiring shipped 2026-04-27, envelope flipped 2026-05-23 by charlie /loop iter2."
aliases: reference_wedm_next_ms0_wn06_wn08_closeout_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.037Z
---


# WEDM-NEXT-MS0/U-WN06+U-WN08 — silent close-out drift correction

**2026-05-23 charlie /loop iter2** (commit `bd6931867b`). User typed `/checkin-charlie /loop [5m] /goal`; the /goal Stop-gate blocker was a 14.7h-stale CLOSE-OUT-CANDIDATES audit. After refreshing the audit + verifying drift via direct disk check, flipped two pending → complete in `mcp-server/data/milestones/WEDM-NEXT-MS0.json`.

## What was drifted

Both engines + tests + dispatcher wiring had been shipped on 2026-04-27, but the envelope status was never flipped from `pending` → `complete`:

| Unit | Engine | Engine size | Test size | edmDispatcher refs |
|------|--------|------------:|----------:|-------------------:|
| U-WN06 | `WEDMRecastLayerMLEngine` | 21,549 B | 14,239 B | 1 |
| U-WN08 | `WEDMWireBreakPredictorEngine` | 17,569 B | 10,995 B | 1 |

`completed_units` bumped 6 → 8.

## Why the close-out-audit missed it

`scripts/audit-close-out-candidates.mjs` finds two drift classes:
1. **File-presence drift** — envelope unit has `path/file` reference + file exists. (Missed these — units didn't carry path refs, only `deliverables: [engine, dispatcher_action, tests]`.)
2. **Silent close-out debt** — `envelope.status=complete` + all units complete + `MILESTONE_PROGRESS.shipped=0`. (WEDM-NEXT-MS0 is `in_progress` — wrong drift class.)

This is a THIRD drift class: **partial-milestone drift** — `envelope.status=in_progress` + a subset of pending units have on-disk engines matching `unit.title` naming convention. The current auditor doesn't title-pattern-match engine names. Future audit enhancement.

## How charlie found them

Direct title-parser: scan WEDM milestones for pending units, regex `([A-Z][A-Za-z0-9]+Engine)` over `unit.title`, check `fs.existsSync('src/engines/'+match+'.ts')`. Found in 8/10 WEDM-NEXT-MS0 pending units after iter2. Same approach across all in-progress milestones returned only CAD-COMPLETE-MS0 (5 hits, delta's domain — already addressed per [[reference_u_cadc_lp01_durable_fix_2026_05_20]]).

## Files changed (commit bd6931867b)

- `mcp-server/data/milestones/WEDM-NEXT-MS0.json` — 2 unit-status flips + 1 `completed_units` increment
- `state/shared/MILESTONE_PROGRESS.{json,md}` — regenerated via `scripts/build-milestone-progress.mjs` (totals 2599 → 2600 shipped)
- `state/shared/CLOSE-OUT-CANDIDATES.{json,md}` — refreshed via `scripts/audit-close-out-candidates.mjs` (0 candidates above 0.75 confidence)

## Why: doctrine + Stop-gate clearance

`/goal` Stop-gate blocked on `CLOSE-OUT-CANDIDATES.json` being 14.7h stale (≥2h threshold per `goal-complete-gate.mjs`). Refresh cleared the freshness gate; envelope flips during the same /loop iter cleared real shipped-but-pending state.

## How to apply

When a /loop `/goal` lands on a stale `CLOSE-OUT-CANDIDATES.json`, refresh FIRST, then while you're there do a partial-milestone-drift scan in your slot's domain — title-pattern-match engine names against `src/engines/`. Often produces ≥1 envelope flip per refresh cycle without writing any new code. See [[feedback_auto_close_out]] + [[reference_silent_close_out_drift_2026_05_17]] + CLAUDE.md §CLOSE-OUT AUTOMATION + §GOAL-COMPLETE GATE.
