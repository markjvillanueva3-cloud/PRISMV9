---
title: RGS Calibration Adapter (U-LIMA-A7)
type: architecture
created: 2026-05-20
tags: [rgs, calibration, confidence, tool-planner, ms1]
status: shipped
commit: 1e82525ee3
---

# RGS Calibration Adapter

`scripts/lib/rgs-calibration-adapter.mjs` — composes the compiled
`CAMConfidenceCalibrationEngine` into the RGS tool-planner so the per-unit
`ToolPlan.confidence` becomes an empirically-calibrated probability instead of
a raw heuristic / model self-report. RGS-TOOL-AUTOINVOKE-MS1 punch-list P1
item #5. Sibling of the A6 [[rgs-tool-autoinvoke-ms1]] complexity adapter.

## Mechanism

`makeCalibrationFn()` is an async factory → sync `(rawConfidence:number) =>
number` closure:

1. Reads the RGS outcome ledger `state/shared/roadmap-tool-plan-outcomes.jsonl`
   (`{unitKey, outcome}` records produced by `rgs-plan-outcome.mjs`).
2. Joins each outcome against the plans sidecar `roadmap-tool-plans.json` to
   recover the predicted confidence → `(predictedConfidence, wasCorrect)`
   pairs (one per unit; `wasCorrect` = any record shipped).
3. Feeds the pairs to `CAMConfidenceCalibrationEngine` (histogram / Platt /
   isotonic, auto-selected by data volume).
4. Returns a closure that calls `engine.calibrate(raw)`.

`rgs-tool-planner.mjs runPlanner` applies the closure to every plan's
confidence (skipping missing-milestone hard-zeros). CLI default-on;
`PRISM_RGS_CALIBRATION=0` disables.

## The >=50 gate

A unit contributes a calibration sample only with a terminal outcome AND a
joinable predicted confidence. Below 50 joined samples the factory returns
identity pass-through — the planner's confidence is unchanged. 50 is the
engine's `MIN_ISOTONIC_OUTCOMES`. The outcome ledger does not exist on a fresh
checkout, so the adapter is a no-op by construction ("degenerate before").

## Calibrate-on-calibrated feedback loop (key design point)

A calibrated planner run rewrites the sidecar's `confidence` to a CALIBRATED
value. If the next run's join recovered that, the mapping would be fit on
calibrated inputs but applied to raw `fuseSignals` outputs — a domain
mismatch. Fix: the planner stamps `plan.rawConfidence` (the pre-calibration
value) before remapping; `joinConfidences` recovers `rawConfidence` in
preference to `confidence`. Fit-domain == apply-domain == raw, run over run.

General rule: when a correction writes its output back to the same store it
later reads as training data, persist the raw pre-correction input separately.

## Graceful degradation

ANY failure — engine absent / import error / wrong shape, ledger or sidecar
unreadable / malformed, `recordOutcome` or `calibrate` throwing, a non-finite
result — falls back to identity pass-through. The returned closure never
throws.

## Verification

32 adapter tests (`rgs-calibration-adapter.test.mjs`) including 3 real-data
E2E against the compiled engine; 27/27 planner regression; 9/9 signal-fusion
regression. Per-file 2-reviewer scrutiny: adapter PASS, test PASS, planner
FAIL → fix (feedback-loop P1 + defensive try/catch P3) → PASS.
