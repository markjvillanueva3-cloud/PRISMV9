---
name: reference_cmccl_ledger_reland_2026_06_15
description: "India wired 18 DATA-only prism_ai actions across 6 AI-training engines (slot:india 2026-06-15) + relanded the never-wired CAM-ML-CLOSEDLOOP U-CMCCL09/10 ledger surface + fixed a real LoRADriftCoordinator.setConfig pollution bug. (a) INDIA_AI_ORPHAN units 4-7: policy_experience_stats/query, temporal_snapshots/project/forecast, detect_cutting_anomalies, knowledge_ingestion_stats/pending. (b) NEW CAM_ML_LEDGER group (10): ledger_ingest/query/replay/compare/slo/status + ledger_drift_record/active/check/config -- MasterAITrainingLedgerEngine + LoRADriftCoordinatorEngine were COMPLETE but never dispatcher-wired on cad-fusion-live-ms0 (the ai-dispatcher-ledger-wire.test.ts contract was RED: 17 unknown-action failures, NOT a r.data wrapper bug as a prior session mis-diagnosed). (c) setConfig was mutate-then-validate -> a rejected patch left the singleton partially-applied (coordinatedThreshold:0 -> shouldTriggerMasterRetrain fires on EVERY drift); fixed to validate-before-assign. 88/88 tests green, 0 tsc errors in the 4 changed files."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.519Z
aliases: reference_cmccl_ledger_reland_2026_06_15
---


# CMCCL ledger reland + 18 india DATA-action wire + setConfig fix (slot:india 2026-06-15)

## What shipped (aiReasoningDispatcher.ts, prism_ai, cad-fusion-live-ms0)
18 new DATA-only actions (R12: stats/provenance/compute ONLY -- never NN inference, never an unguarded write), across 6 india AI-training engines, each wired through ACTIONS+SCHEMAS+case+union, round-tripped through the dispatcher:

- **INDIA_AI_ORPHAN units 4-7 (8 actions)** -- continued bravo's orphan-wire queue (`INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md`; unit 3 IntentClassifier was mine earlier, unit 5 TransferLearning is papa's separate XFER group):
  - PolicyExperienceLedgerEngine: `policy_experience_stats` (stats), `policy_experience_query` (query; safeParse-guarded). `append` (write) NOT wired.
  - TemporalReasoningEngine: `temporal_snapshots`, `temporal_project` (OLS), `temporal_forecast` (ETA; threads nowIso). In-memory singleton. `record` (write) NOT wired.
  - RealTimeAnomalyDetectionEngine: `detect_cutting_anomalies` (5 deterministic detectors CUSUM/EWMA/Mahalanobis/FFT/Wavelet -- no trained model). Case guards non-empty finite samples + positive rate (detect() does NOT self-guard) + a 250000-sample DoS cap.
  - KnowledgeIngestionOrchestratorEngine: `knowledge_ingestion_stats` (sync), `knowledge_ingestion_pending` (read-only disk scan via discoverResources). `runPipeline`/`ingestResource` (writes) NOT wired.
- **NEW CAM_ML_LEDGER group (10 actions)** -- RELAND of CAM-ML-CLOSEDLOOP-MS0 U-CMCCL09/10:
  - MasterAITrainingLedgerEngine: `ledger_ingest/query/replay/compare/slo/status`.
  - LoRADriftCoordinatorEngine: `ledger_drift_record/active/check/config`.

## Finding #1 -- CMCCL ledger was NEVER dispatcher-wired on this branch (gap, not a wrapper bug)
`ai-dispatcher-ledger-wire.test.ts` (the U-CMCCL09/10 contract) was RED with 17 failures. A prior india session mis-diagnosed it as "14 tests assert r.X but the dispatcher wraps r.data.X." The REAL root cause (R12-corrected): all 10 `ledger_*`/`ledger_drift_*` actions had **ZERO refs** in any dispatcher -- the engines (MasterAITrainingLedger, LoRADriftCoordinator) shipped complete under U-CMCCL09/10 but the dispatcher wiring never landed on cad-fusion-live-ms0 (no revert in history; the test was @ts-nocheck'd until U-EFF16 `6ec393cf41` stripped it, then went red against the now-wrapping dispatcher). Fix: wire all 10 + update the ~13 SUCCESS assertions to `r.data.*` (error assertions stay `r.error` -- dispatcherError is top-level via the outer catch). 39->41 tests green.

## Finding #2 -- LoRADriftCoordinatorEngine.setConfig mutate-then-validate pollution (FIXED)
`setConfig` did `this.config = {...this.config, ...patch}` BEFORE validating, then threw on a bad value -> the singleton kept the partially-applied bad config. Reachable+harmful via the new `ledger_drift_config{set}` wire: a rejected `{coordinatedThreshold:0}` left threshold=0, making `shouldTriggerMasterRetrain()` (`activePipelines().length >= 0`) fire a MASTER RETRAIN on EVERY single-pipeline drift. Fixed to validate-a-candidate-before-assign (this.config untouched on reject). +1 engine regression test (`does NOT partially apply a rejected patch`) + 1 dispatcher test. Also changed the error message non-ASCII `>=`->ASCII (ascii-guard) and aligned the engine test's `toThrow(/... >= 2/)`.

## Verify
- `cd mcp-server && npx vitest run src/__tests__/ai-dispatcher-ledger-wire.test.ts src/__tests__/LoRADriftCoordinatorEngine.test.ts` -> 41 + 47 (88/88 across the 3 affected files).
- `npx tsc --noEmit` -> 615 pre-existing baseline, **0 in the 4 changed files** (the earlier "0 total" was an incremental-cache artifact).
- Scrutiny: 3 independent arms, 0 P0/P1. Reviewer D empirically proved the regression test fails on revert (non-circular, R9-valid).

## Lessons
- "Test red" != "wrapper-path bug." Grep the action names for dispatcher refs FIRST -- 0 refs means UNWIRED, a different (bigger) fix than a `r.` -> `r.data.` sweep. [[feedback_read_full_content_not_titles]]
- An engine that mutates-then-validates is a latent pollution bug the moment it's dispatcher-reachable; validate-before-assign is the canonical form. Wiring an engine to the dispatcher can EXPOSE a pre-existing engine bug -- fix it at the source when you hit it (operator: fix-inline). [[feedback_auto_fix_and_blackwell_fleet_enforced]]
- detect()/getPending() do unbounded compute/IO over caller input -> the WIRE owns the guard (sample cap, finite-check), not the pure engine.

ledger: `INDIA-REMAINING-WORK-LEDGER-2026-06-15.md` #6 (engines 2-5) DONE + the ledger reland (new). queue: `INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md`. [[reference_rslora_enabled_2026_06_15]]
