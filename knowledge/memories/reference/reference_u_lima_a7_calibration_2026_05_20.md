---
name: reference-u-lima-a7-calibration-2026-05-20
description: "U-LIMA-A7 — CAMConfidenceCalibrationEngine wired into the RGS tool-planner confidence path (rgs-calibration-adapter.mjs), commit 1e82525ee3"
aliases: reference_u_lima_a7_calibration_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.002Z
---


# U-LIMA-A7 U-CALIBRATION — RGS confidence calibration adapter

2026-05-20 lima `/loop` iter5, commit `1e82525ee3`. [[reference_rgs_tool_autoinvoke_ms1_2026_05_16|RGS-TOOL-AUTOINVOKE-MS1]]
punch-list P1 item #5. 7/8 LIMA-ROSTER units now done (A8 remains).

**What shipped:** `scripts/lib/rgs-calibration-adapter.mjs` — an async factory
`makeCalibrationFn()` that backs the planner's per-unit `ToolPlan.confidence`
with the compiled `CAMConfidenceCalibrationEngine`. Reads the RGS outcome
ledger (`roadmap-tool-plan-outcomes.jsonl`), joins each outcome against the
plans sidecar, feeds `(predictedConfidence, wasCorrect)` pairs to the engine,
returns a sync `(number)=>number` closure. Gated `>=50` joined samples →
identity pass-through below (the current "degenerate before" state — the
ledger does not exist yet). Mirrors the A6 `rgs-rie-adapter.mjs` pattern.

**Wiring:** `rgs-tool-planner.mjs runPlanner` gained an optional
`calibrateConfidence` param; CLI builds it via `makeCalibrationFn()`,
default-on, `PRISM_RGS_CALIBRATION=0` kill switch. Mirrors A6's `complexityFn`.

**Key design lesson — calibrate-on-calibrated feedback loop (scrutiny P1).**
A calibrated planner run rewrites the sidecar's `confidence` to a CALIBRATED
value. The adapter joins the outcome ledger against that sidecar — so the
next run would fit the mapping on calibrated inputs but apply it to raw
`fuseSignals` outputs (domain mismatch, systematic mis-correction). Fix: the
planner stamps `plan.rawConfidence` (the pre-calibration value) before
remapping; `joinConfidences` recovers `rawConfidence` in preference to
`confidence`. Fit-domain == apply-domain == raw, run over run. Standing
rule: **when a calibration/correction writes its output back to the same
store it later reads as training data, persist the raw pre-correction input
separately or the loop fits on its own output.**

**Scrutiny:** per-file 2-reviewer gate ×3 files. Adapter 2/2 PASS (one
reviewer raised a P0 "task string not in the `AGIDecisionTask` TS union" —
REFUTED empirically: the compiled engine's `Map` keys by the raw string at
runtime, no union check; a 55-outcome probe returned `calibrated:true`).
Test 2/2 PASS. Planner FAIL→fix(feedback-loop P1 + defensive try/catch
P3)→2/2 PASS. 32 adapter tests (3 real-data E2E vs the compiled engine),
27/27 planner regression, 9/9 signal-fusion regression.

See [[reference-rgs-tool-autoinvoke-ms1-2026-05-16]]. Sibling: A6
`rgs-rie-adapter.mjs`. Next: A8 U-TRANSFER (`prism_ai:xproc_transfer_*`).
