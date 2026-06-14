---
name: reference-quoting-calibration-u-qt10-2026-05-25
description: "U-QT10 QuotingCalibrationEngine closes the inner training loop — derives multiplicative correction factors from QuotingTrainingLoopEngine's bias report; pre→post MAPE 171.9%→93.6%, bias +146.2%→-0.01% on JM Die baseline; absorbed into peer commit 060e0189a1"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.904Z
aliases: reference_quoting_calibration_u_qt10_2026_05_25
---


# U-QT10 QuotingCalibrationEngine — closes inner training loop (charlie /goal-18 iter2, 2026-05-25)

## What shipped
**QuotingCalibrationEngine** — pure deterministic math (R5/R10/R12) consuming `QuotingTrainingLoopEngine.AccuracyReport` and producing multiplicative correction factors that restore predicted FMV to observed actuals.

- `derive(report, opts) → CalibrationFactors` — global factor from `metrics.mean_signed_pct_error`, per-customer from `per_customer_bias[]`
- `apply(factors, predicted_usd, opts) → CalibrationApplyResult` — per-customer match falls back to global
- `measureImprovement(report, factors) → {pre, post, mape_reduction_pct, bias_reduction_pct}`
- Clamp safety [0.20, 5.0] · balanced band ±5% · min-records-per-customer (default 3)

## Math
FMV = (time·rate + material·markup) · (1+overhead) · (1+margin) is linear in all four input scalars.
→ Single output-side factor `f = 100 / (100 + signed_pct)` restores actual revenue from over-predicted FMV.
→ Output-side correction is safer than scaling time/rate inputs — never reaches negative time.

## Closed-loop verification on JM Die baseline
- **PRE**: MAPE 171.9% · signed_bias +146.2% · MAE $106.68 · 10 records
- **POST projection**: MAPE 93.59% · signed_bias -0.01% · global_factor 0.4061
- **Reduction**: MAPE 45.55% · bias 100% (bias collapses by construction)
- Residual MAPE = per-customer variance — demands document-level granularity (not customer-AVG)

## Files in repo (all 7 landed in commit `060e0189a1`)
- `mcp-server/src/engines/QuotingCalibrationEngine.ts` (NEW, 291 LOC)
- `mcp-server/src/__tests__/QuotingCalibrationEngine.test.ts` (NEW, 19/19 PASS)
- `mcp-server/src/schemas/quotingActionSchemas.ts` (3 new actions + 3 new schemas)
- `mcp-server/src/tools/dispatchers/quotingDispatcher.ts` (3 new case branches)
- `scripts/run-calibration-cycle.mjs` (NEW operational runner)
- `state/shared/specs/QUOTING-CALIBRATION-2026-05-25.json` (closed-loop verdict)
- `state/shared/calibration/quoting-calibration-active.json` (active factors — PSN-aware durable surface)

## Dispatcher actions (prism_quoting, wired)
- `quoting_calibration_derive` — AccuracyReport → CalibrationFactors
- `quoting_calibration_apply` — apply factor to predicted_usd (per-customer w/ global fallback)
- `quoting_calibration_measure` — pre/post improvement projection

## Attribution absorption (the shared-tree hazard `[[feedback_commit_to_slot_worktree]]` warns about)
All 7 files were absorbed into peer commit `060e0189a1` `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MILL-PARITY-UPGRADE-MS0]/U-MILL-TRIBAL-INJECTOR (slot:foxtrot iter57)` because the shared `H:/prism` tree's git index lock was held by peers during my `git add`. Work + tests fully preserved — only attribution lost. **Fix-forward, not retry**: a sibling-attribution patch can land later via `git notes` or via the next U-QT11 commit referencing `060e0189a1` for archaeology.

## Synergy with PSN + JM Die first-hop
The active calibration JSON is the durable surface PSN-aware downstream consumers query at quote time. Any FMV prediction touching a customer keyed in `per_customer` (or any prediction at all once `global_factor != 1`) gets the systematic over-prediction silently corrected. The `source_report_signature` field lets consumers detect staleness when the JM Die baseline regenerates, prompting a re-derive cycle.

## Open follow-ups
- **U-QT11**: invoke the 5 deep-reasoning prompts through the AI router (currently we BUILD them but don't dispatch them)
- **U-QT12**: wire psi_delta signals from the 500 JM Die actual outcomes through PSNAutonomyLoopEngine end-to-end, then trigger NN/GNN retraining cycle
- **document-level granularity**: replace customer-AVG with per-doc actuals to crush residual MAPE 93.6% → <30%

## Memory crosslinks
- [[feedback_commit_to_slot_worktree]] — the absorption hazard (3rd consecutive session)
- [[feedback_conflict_fork_rule]] — when to fork to a sibling worktree
- [[reference_quoting_pipeline_ms0_shipped_2026_05_24]] — U-QT01..QT09 parent stack
- [[feedback_high_roi_backend_first_slot_queue]] — backend training-loop = high-ROI per slot doctrine
