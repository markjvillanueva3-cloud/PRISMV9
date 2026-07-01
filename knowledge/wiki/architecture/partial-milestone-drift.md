---
title: Partial-Milestone-Drift Detector (third silent-drift class)
type: architecture
domain: close-out / dev-tooling
status: live
created: 2026-05-23
authors: [charlie]
related:
  - close-out-audit
  - silent-close-out-drift
  - feedback_auto_close_out
  - feedback_roadmap_close_out
---

# Partial-Milestone Drift — third silent-drift class

A milestone envelope is `status: in_progress` and a unit inside it is `status: pending` (or `in_progress` / `wip` / `planned` / `active`), but the engine named in the unit's `title` already exists on disk at `mcp-server/src/engines/<XxxEngine>.ts` and is non-trivial (≥1024 B). The unit shipped; the envelope never flipped.

Neither pre-existing close-out detector caught this:
- **`audit-close-out-candidates.mjs`** needs explicit path strings in the unit's `deliverables` to match files. Many envelopes only carry `deliverables: [engine, dispatcher_action, tests]` with no concrete path — invisible to that resolver.
- **`silent-close-out-drift.mjs`** ([[silent-close-out-drift]]) needs `envelope.status: complete` AND `MILESTONE_PROGRESS.shipped == 0`. An *in-progress* envelope with partial work shipped is the wrong shape for it.

## How charlie found it (2026-05-23 /loop iter3)

Closing `WEDM-NEXT-MS0/U-WN06+U-WN08` (commit `bd6931867b`):
- envelope status `in_progress`, completed 6/16
- U-WN06 + U-WN08 status `pending`
- `WEDMRecastLayerMLEngine.ts` (21.5 KB) + `WEDMWireBreakPredictorEngine.ts` (17.6 KB) on disk for ~4 weeks
- both wired into `edmDispatcher.ts`
- titles named the engines verbatim (`WEDMRecastLayerMLEngine — ML prediction of recast layer thickness`)

Generalized the pattern with a regex on `unit.title` matching `([A-Z][A-Za-z0-9_]+Engine)\b`, then disk-probing each match. First run: 50 candidates across 8 milestones / 477 open milestones / 4737 pending units / 66 engine-name matches.

## Surface

| Layer | Where | Purpose |
|---|---|---|
| Lib (pure-core) | `scripts/lib/partial-milestone-drift.mjs` | `findPartialMilestoneDrift({envelopes, engineProbe, options})` — fs injected; 12/12 node:test pass |
| Standalone CLI | `scripts/audit-partial-milestone-drift.mjs` | `--json` or markdown report |
| Sidecar | `scripts/audit-close-out-candidates.mjs` (schemaVersion 1.2.0) | Auto-runs alongside the existing 2 detectors on every close-out audit |
| Hook | `.claude/hooks/close-out-audit-suggest.mjs` | UserPromptSubmit advisory surfaces all 3 drift class counts when close-out keywords match |
| Memory | [[reference_wedm_next_ms0_wn06_wn08_closeout_2026_05_23]] | Per-unit verification trail |

## False positives

`AI-TRAINING-FIRST-MS0` units titled "Train XxxDeepLearningEngine on full pre-revenue corpus" parse as engine references but the deliverable is *training*, not the engine source file. ~half of the first-run 50 candidates are this class. The hook flags this explicitly in the surfacing message; operator triage skips them.

## Verification protocol (per [[feedback_auto_close_out]])

Before flipping any envelope based on this detector:
1. Check engine size > stub threshold (1024 B; non-trivial)
2. Check sibling test exists in `mcp-server/src/__tests__/<XxxEngine>.test.ts`
3. Grep test for exit-criteria keywords from unit's `exit_criteria` list
4. Grep `mcp-server/src/` for engine consumers (wiring per "wire-to-all-sources" doctrine)
5. Only if all 4 pass → flip envelope `status: complete` + add `completed_at` + `closeout_note` naming the verification

Example clean flip: U-P1.5-OS-01 (WEDMDwgImportEngine), commit `27832ae6f9` — 8 exit-criteria keyword hits in test.

## Knobs (CLI)

- `--min-bytes N` — raise stub threshold (default 1024 B)
- `--json` — machine output

## Knobs (sidecar)

Runs unconditionally as part of `audit-close-out-candidates.mjs`. To skip: comment the `runPartialMilestoneDriftScan()` call in main().

## Cross-class summary table

| Class | Detector | Envelope | Unit | Disk |
|---|---|---|---|---|
| 1: file-presence | `audit-close-out-candidates.mjs` candidates | any | pending + has `deliverables` path strings | path exists |
| 2: silent close-out | `silent-close-out-drift.mjs` (sidecar) | complete | all complete | MILESTONE_PROGRESS.shipped = 0 |
| 3: partial-milestone | `partial-milestone-drift.mjs` (sidecar) | in_progress | pending/in_progress/wip/planned/active | engine matching title in src/engines/ exists |
