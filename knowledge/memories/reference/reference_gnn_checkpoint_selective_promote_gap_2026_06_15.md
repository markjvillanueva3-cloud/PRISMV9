---
name: reference_gnn_checkpoint_selective_promote_gap_2026_06_15
description: "GNN tier-5 checkpoint-consistency finding (slot:india 2026-06-15): LIVE inference serves the 8-dim AUROC-0.096 checkpoint while the validated 768d candidate (selective-deploy @ tau=0.7, AUROC 0.808) sits UNPROMOTED -- because PRISM_NN_SELECTIVE_PROMOTE is default-OFF. The unlock = run the retrain lifecycle with that flag (gate-protected) in the reaper-immune scheduled task."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.589Z
aliases: reference_gnn_checkpoint_selective_promote_gap_2026_06_15
---


# GNN checkpoint-consistency + selective-promote gap (slot:india 2026-06-15)

While compiling india's remaining work (TIER-1 #1 of `INDIA-REMAINING-WORK-LEDGER-2026-06-15.md`), verified the live GNN tier-5 checkpoint state. Real finding (R12, india metrics discipline):

## What is actually serving
- The classifier `scripts/seed-ghost-gnn-classify.mjs` loads `DEFAULT_CHECKPOINT = state/shared/nn-graph/graphsage-checkpoint.json` (so does `graphsage-predictor.mjs`).
- That file is **dim 8** (the old 2026-05-16 model, AUROC ~0.096). So LIVE inference uses the 8-dim checkpoint.
- `minConf=0.7` selective gate IS correctly wired (`GNN_DEFAULTS` in seed-ghost-gnn-classify.mjs:63-64; env override `PRISM_NNG_MIN_CONF`).

## The validated model is stranded
- `state/shared/nn-graph/graphsage-checkpoint.candidate.json` is **dim 768** (2026-06-14, 3 MB) — the high-dim candidate.
- `NN-EVAL.json`: `deferred:false, auroc 0.8084, brier 0.179, embeddingMode "direct"`. Full-coverage FAILS the gate (macro-F1 0.439 < 0.55, Brier 0.179 > 0.15) so it is **correctly NOT full-promoted** (the lifecycle's `promoteDecision()` safety invariant: a sub-gate candidate never replaces a good live checkpoint).
- BUT selective-deploy @ tau=0.7 PASSES (emitted-set Brier 0.041, macro-F1 1.0, 32% coverage) — the india-validated production path.

## The gap = an opt-in flag, default OFF
`nn-graph-retrain-lifecycle.mjs:50-51` exposes **`PRISM_NN_SELECTIVE_PROMOTE=1`** — "opt-in: promote a robustly deploy-ready-SELECTIVE candidate when the full-coverage gate cannot clear." It is default-OFF, so the lifecycle only promotes on the full-coverage gate (which the candidate fails) → the 768d selective-ready candidate is never promoted, and the 8-dim AUROC-0.096 model stays live.

## The unlock (gate-protected — NOT an india-refuse violation)
Run the retrain lifecycle with `PRISM_NN_SELECTIVE_PROMOTE=1`. It still gate-checks (only promotes a *robustly* deploy-ready-selective candidate), so this is the sanctioned selective path, not a gate bypass. The run is HEAVY (550MB graph load + eval + the recently-OOM-fixed reexec) and the host reaper kills long node procs under load (it reaped 2 mining agents this session) → it must run in the **reaper-immune scheduled task** (`PRISM Nn Graph Retrain`), not a session bash. india's own prior handoff (thread 4) reached the same conclusion ("full GPU retrain in a reaper-immune scheduled task"). My 2026-06-15 `nicifySelf()` self-throttle (commit 1a40c35a69) now also lets that run yield to interactive work.

## Action
Set `PRISM_NN_SELECTIVE_PROMOTE=1` for the retrain scheduled task (env on the task, or persistent user/system env if the task inherits it) so the next scheduled run selective-promotes the 768d candidate IF it clears the selective gate. Then re-verify: `--status` should report the 768d checkpoint live + the selective-deploy metrics matching `NN-EVAL.json`. Until then, tier-5 live = 8-dim/0.096 (the cascade defers to tiers 1-4, which is honest but under-uses the validated 768d selective model).

[[reference_gnn_selective_deploy_2026_06_06]] · [[feedback_multiseed_before_auroc_claim]] · ledger `INDIA-REMAINING-WORK-LEDGER-2026-06-15.md`
