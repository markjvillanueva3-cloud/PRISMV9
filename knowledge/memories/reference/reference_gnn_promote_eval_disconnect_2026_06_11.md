---
name: reference_gnn_promote_eval_disconnect_2026_06_11
description: GNN tier-5 can't deploy its 0.808 selective model -- the lifecycle's --force retrain produces a noisy ~0.43 link-pred candidate, disconnected from the 0.808 deploy-gate holdout eval; the gate correctly refuses
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.592Z
aliases: reference_gnn_promote_eval_disconnect_2026_06_11
---


**Finding (slot:india, 2026-06-11, /goal "accelerate closed loop training for all primary domains", lever L4):** the acceleration workflow ranked "flip `PRISM_NN_SELECTIVE_PROMOTE=1` to deploy the 0.808 selective-ready GNN tier-5 model" as a quick india-doable win. ATTEMPTED it; the gate **correctly refused** -- a real R12 finding that corrects the premise.

**Verified state:** live tier-5 checkpoint = AUROC **0.096**, trained 2026-05-16 (8-dim, unstratified, ~26 days stale; `graphsage-checkpoint.json`). `NN-EVAL.json` `selective.deployGrade` = `{pass:true, verdict:"deploy-ready-selective", operatingPoint tau=0.7: Brier 0.0406/macroF1 1.0/coverage 0.32, robustAboveGate:true, globalAuroc 0.8084}`. `promoteDecision()` (lifecycle line 216) is rigorously gate-respecting: selective path requires `allowSelective && deployGrade.pass===true && deployPoint.robustAboveGate===true` (never bypasses).

**What happened:** `PRISM_NN_SELECTIVE_PROMOTE=1 node scripts/nn-graph-retrain-lifecycle.mjs --force` does NOT promote the existing 0.808-evaluated checkpoint -- it **RETRAINS a fresh candidate** (capped 6000-node subgraph, 768d embeds) which scored AUROC **0.4286 / macroF1 0.105 / Brier 0.256**, FAILING even the selective gate -> `promote:false`, live 0.096 unchanged (no regression; safety invariant held). There is NO "promote-the-existing-candidate" flag; `--force` is the only path to `promoteDecision`, and it regenerates+re-evals.

**The real disconnect (the actual blocker):** TWO eval methodologies that don't meet:
1. `nn-graph-eval.mjs` -> `NN-EVAL.json` = the **deploy-gate holdout** (62 reference ghosts, direct-embed) -> AUROC 0.808, selective-deploy-ready.
2. `nn-graph-retrain-lifecycle.mjs --force` = retrains via the **link-pred pretext** on a capped subgraph (high-variance; this run 0.43) + promotes off THAT assessment.
So the lifecycle's promote path cannot action the 0.808 deploy-gate assessment -- it gates on its own noisier retrain-eval. "Flip the flag" is a workflow over-simplification.

**Next unit (SCOPED, india, needs design rigor -- do NOT hasty-patch deploy semantics):** reconcile the two paths so a promote can certify on the deploy-gate holdout (`nn-graph-eval.mjs` 62-ghost selective grade) rather than only the link-pred-pretext retrain-eval -- e.g. a `--promote-from-eval` path that loads `NN-EVAL.json`'s `selective.deployGrade` for an EXISTING candidate + runs `promoteDecision` (still gated, still reversible via `prev.json`). Caveat: the `--force` run OVERWROTE the candidate with the 0.43 one, so the deploy-gate eval must be RE-RUN against whatever candidate is to be promoted. Link-pred AUROC on capped subgraphs is high-variance ([[feedback_multiseed_before_auroc_claim]]); full-coverage lift = ref-pool growth + sharper features, not calibration ([[reference_gnn_selective_deploy_2026_06_06]]). Related: [[reference_metasynth_threshold_collapse_2026_06_11]], [[reference_dream_cycle_galaxy_cascade_2026_06_11]] (this session's other acceleration levers).

**Lesson:** a model being "deploy-ready per an eval file" is NOT the same as "promotable via the lifecycle" -- verify WHICH eval the promote path consumes before claiming a flag-flip deploys it. The gate refusing a 0.43 retrain is the system working correctly, not a failure.
