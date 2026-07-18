---
name: reference_conformal_audit_tool_2026_06_16
description: "India shipped a conformal coverage audit tool for the GNN tier-5 holdout (slot:india 2026-06-16): scripts/nn-graph-conformal-audit.mjs WIRES two EXISTING engines (R8 -- no reinvention of LAC math or the rolling-coverage counter) -- CrossProcessConformalClassificationEngine.calibrate/predictionSet + ConformalCalibrationMonitorEngine.configure/record/status. INDIA DISCIPLINE encoded IN CODE so it CANNOT emit a misleading metric: (a) REFUSE-GATE n_test < MIN_MEANINGFUL_N=20 -> {ok:false,refused:true}, CLI exit 2 (a coverage rate on <20 samples is binomially meaningless); (b) trustworthy:false + warning when >50% of predictions fall back to the full label set (tiny calibration -> qHat=1 -> trivial empirical=1.0); (c) --strict on an UNTRUSTWORTHY run exits 2 too (a silent CI green on a known false-green is the exact failure the audit was built to prevent). 13/13 tests (10 core + 3 regression: false-green CLI exit, out-of-range label refused, parseArgs non-finite-flag rejection). Tool is READY; the calibration-pipeline producing the {probs,label} holdout JSONL is the separate gated step (full-softmax GNN predictor pass over a grown ref-pool)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.529Z
aliases: reference_conformal_audit_tool_2026_06_16
---


# Conformal coverage audit tool shipped (slot:india 2026-06-16)

## What
`scripts/nn-graph-conformal-audit.mjs` (+ `.test.mjs` 13/13) -- a tested orchestrator of two existing engines that runs the GNN tier-5 conformal coverage audit:
1. `CrossProcessConformalClassificationEngine.calibrate({pairs, append:false})` -- split-conformal LAC scores from a calibration holdout.
2. `CrossProcessConformalClassificationEngine.predictionSet({probs, alpha})` -- per test point, S(X) = {y: probs[y] >= 1 - qHat} (Sadinle 2019 argmax-fallback guarantees a NON-EMPTY set on degenerate thresholds, verified by reading the engine).
3. `ConformalCalibrationMonitorEngine.configure({windowSize=test.length, alpha}) -> record({predictedSet, actualLabel})` -- rolling empirical coverage.
4. Report `empiricalCoverage` vs `targetCoverage=1-alpha`, `marginalGuaranteeMet`, `trustworthy`, `fullSetRate`, `calibrationStats`.

R8: zero reinvention of the math; the engines were complete + dist-built.

## India discipline ENCODED in code (the reason the tool exists)
- **REFUSE-GATE:** `n_test < MIN_MEANINGFUL_N = 20` (== `ConformalCalibrationMonitorEngine.MIN_WINDOW_SIZE`) -> `{ok:false, refused:true}` + CLI exit 2. A coverage rate on <20 samples has a binomial CI too wide to mean anything (at n=13, p=0.9 the 95% CI is ~+-0.16). Grow the ref-pool/holdout first; never report a coverage on this n. Defense-in-depth: the monitor's own zod `min(MIN_WINDOW_SIZE)` is a second wall the gate would have to be bypassed past.
- **Trustworthiness flag:** `fullSetRate > 0.5` -> `trustworthy:false` + warning. A tiny calibration -> `qHat=1` -> threshold 0 -> every class in the set -> empirical coverage is trivially 1.0 (NOT a real calibration signal).
- **`--strict` CI gating, FALSE-GREEN-HARDENED (reviewer-A P1 fix):** under `--strict`, an UNTRUSTWORTHY ok-run exits **2 (refused)**, not 0. The trivially-inflated full-set path is the exact false-green the audit exists to prevent; a silent CI pass on a known-untrustworthy result would defeat the whole point.

## Reviewer-A findings fixed inline (operator fix-inline doctrine)
- **P1 (false-green CI gate, fixed):** `--strict` now treats `!trustworthy` as refused -> exit 2. Regression test spawns the real CLI via `child_process.spawnSync` and asserts `r.status === 2` (otherwise this is a circular self-assertion).
- **P2 (silent miscount on out-of-range label, fixed):** the test split's labels are now bound-checked against `numClasses` BEFORE the loop; a mis-encoded label (e.g. 9999 in a 3-class run) is `{ok:false}` with a clear error, NOT a phantom inflated miss rate. The cal split was already engine-validated; this closes the test-side gap.
- **P3 (silent NaN on a bad CLI flag, fixed):** `parseArgs` now throws a clear `--<name> must be a finite number; got <raw>` rather than letting `Number("abc")=NaN` flow through and surface as a misleading "n_test=0 < MIN=20".

## What it does NOT solve (R12 -- honest scope)
The TOOL is shipped + tested. The AUDIT RESULT is still blocked behind producing a real `{probs, label}` holdout JSONL: that needs a full per-class softmax pass of `graphsage-predictor` over the live 62-ghost holdout -- and right now the holdout is collapsed to **n=13 < 20**, so even a full predictor pass would trigger the refuse-gate (correctly). **Same ref-pool-growth root cause as the tier-5 selective-deploy blocker.** The fix path: grow the ref-pool via `vault-to-gnn-refpool` ground-truth refs / the operator-label worklist -> full-softmax predictor pass -> run this audit -> coverage number.

## Verify
- `cd /h/prism && node --test scripts/nn-graph-conformal-audit.test.mjs` -> 13/13.
- CLI live: 80-pair fixture (n_test=40) -> exit 0 with coverage=1.0/target=0.9 ok; 30-pair fixture (n_test=15) -> "REFUSED: insufficient holdout: n_test=15 < MIN=20" + exit 2.

ledger: `INDIA-REMAINING-WORK-LEDGER-2026-06-15.md` #9 -- TOOL DONE; result remains pool-gated. [[reference_cmccl_ledger_reland_2026_06_15]] · [[reference_rslora_enabled_2026_06_15]]
