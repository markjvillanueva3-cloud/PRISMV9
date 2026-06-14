---
name: reference_charlie_orch_psi_field_fix_2026_06_02
description: U-QP-ORCH-PSI-FIELD-FIX — orchestrator Stage-4 psi_delta feed read absent pred.predicted_usd (→predicted_fmv_usd), dead PSN-autonomy feed; + fixed non-exported ChainOfVerificationResult type import (→VerificationResult, file now tsc-clean)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.053Z
aliases: reference_charlie_orch_psi_field_fix_2026_06_02
---


QUOTING-SYNERGY-MS0/U-QP-ORCH-PSI-FIELD-FIX (slot:charlie, 2026-06-02, /loop /goal /yolo iter8, commit `1e67cfab93`). Two latent bugs fixed in `QuotingTrainingOrchestratorEngine.ts`, both found while verifying iter7's loop-closing train-cycle wire.

**BUG 1 — dead psi_delta feed (headline):** Stage 4 (`feedPsnAutonomy:true`) passed `predicted_usd: pred.predicted_usd` into `QuoteOutcomePSIDeltaBridgeEngine.scoreOutcome`, but `pred` is a `PerRecordPrediction` whose predicted field is `predicted_fmv_usd` — there is NO `predicted_usd`. The value was `undefined`; scoreOutcome validates `Number.isFinite(outcome.predicted_usd)` and returns an empty/rejected result, so EVERY worst-record was silently dropped → `psi_delta_fed_count` always 0 → the PSN-autonomy feed (the closed-loop signal back to NN/GNN retraining) was DEAD whenever enabled. Fix: `pred.predicted_fmv_usd`. The KEY `predicted_usd` is correct (it IS scoreOutcome's param name); only the VALUE was wrong. Grain honesty (reviewer-B P2, applied in-unit): predicted_fmv_usd vs actual_usd is the SAME per-record pairing the training report's `pct_error` uses (self-consistent; grain correctness inherits from the upstream baseline being per-part-job actuals — NOT a units bug introduced here).

**BUG 2 — file did not tsc-compile (sibling, same file):** line 27 imported `type ChainOfVerificationResult` from `ChainOfVerificationEngine.js`, which exports no such name (real export `VerificationResult`, carrying `posteriorConfidence` + `shouldEscalate` — the fields the orchestrator consumes at lines ~90/100). Fixed import + the `cov?:` annotation. `tsc --noEmit | grep QuotingTrainingOrchestrator` → empty (clean) post-fix.

**TEST (R9 fail-on-revert oracle):** new `mcp-server/src/__tests__/QuotingTrainingOrchestratorEngine.test.ts` — 3 vitest exercising the REAL Stage-4 call site (the only place the bug lives): (1) feedPsnAutonomy:true + 3 valid records → `psi_delta_fed_count===3` (FAILS on the bug = 0); (2) gate off → 0; (3) empty input → ok:false/0. Hermetic (`writeIfSafe:false` skips the Stage-3 fs write). 3/3 pass. 2-reviewer per-file scrutiny PASS, 0 P0/P1; P3 deferrals — per-record rejection tally for observability, quote_id dedup, scoreEvent side-effect hermeticity.

**LESSON (generalizable):** esbuild `build:fast` is TYPE-BLIND — a non-exported type import compiles fine in the bundle but breaks `tsc`/`npm run build`. That's why iter7's build:fast was green over a file that didn't actually compile. After editing an engine, the scoped `tsc --noEmit | grep <Engine>` is the cheap honest gate — it catches BOTH the value bug's would-be type error AND the import bug. Same family as the iter7 stale-fossil-dist finding: the build surface you trust (esbuild) hides type/wiring truth that only tsc / a live run reveals.

Wiki: [[quoting-outbound-price-prior]]. Sibling: [[reference_charlie_extprice_calib_2026_06_01]] · [[reference_charlie_outbound_price_calib_2026_06_01]].
