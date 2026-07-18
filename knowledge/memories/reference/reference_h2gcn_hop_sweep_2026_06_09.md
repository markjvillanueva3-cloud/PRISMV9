---
name: reference_h2gcn_hop_sweep_2026_06_09
description: "H2GCN hop-sweep validated on the live wiring graph: hops=3 is the optimum (robust +0.138 multi-seed AUROC lift) but the hop lever ceilings ~0.64 < 0.78 gate. Gate-clearance needs H2GCN in the production trainer + ref-pool growth."
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.602Z
aliases: reference_h2gcn_hop_sweep_2026_06_09
---


# H2GCN hop-sweep -- validated; hops=3 optimal but ceilings below the gate (slot:india 2026-06-09)

Operator authorized the #9 gate-clearance compute. Ran the `scripts/validate-heterophily-auroc.mjs` A/B harness (pure-JS GraphSAGE link-pred, `--max-nodes 3000 --epochs 40`, base features = the 768d node embeddings `state/shared/nn-graph/node-embeddings-768d.jsonl`, 563 nodes embedded) on the LIVE ~676MB wiring graph. base arm = `heterophilyHops:0`, enriched arm = N, all else identical so the AUROC delta is attributable to the H2GCN lever.

**Multi-seed result (the [[feedback_multiseed_before_auroc_claim]] discipline -- single-seed was a known false-positive trap):**

| hops | seed 5 | seed 7 | seed 11 | mean lift | enriched AUROC | feat dim |
|------|--------|--------|---------|-----------|----------------|----------|
| 2 (prior) | -- | -- | -- | +0.067 | ~0.50 | 2304 (768x3) |
| **3** | +0.187 | +0.089 | +0.139 | **+0.138** | 0.55-0.64 | 3072 (768x4) |
| 4 | +0.119 | +0.181 | (reaped) | ~+0.15 | 0.57-0.64 | 3840 (768x5) |

- baseline (hops0) AUROC ~0.44 -- SUB-RANDOM (the heterophily anti-correlation: engine<->dispatcher edges link DIFFERENT node types, so vanilla neighbour-aggregation hurts).
- **hops=3 is the optimum**: robust +0.138 mean (all 3 seeds positive, well above the LIFT_EPS=0.02 noise floor), best cost/lift. hops=4 plateaus at no better lift for 5x feature dim -> not worth it.
- **the hop lever CEILINGS ~0.64 enriched, < the 0.78 deploy gate.** From a 0.44 baseline, clearing 0.78 needs ~+0.34 -- more than hops alone delivers.

**Conclusion -- #9 advanced, NOT cleared (R12 honest):** the hop-sweep is settled (hops=3 best). Gate-clearance needs the OTHER levers, now correctly prioritized:
1. **Integrate H2GCN into the PRODUCTION trainer** -- `scripts/lib/graphsage-trainer.mjs` has **0 heterophily refs** (verified); the lift lives only in `runTrainingPipeline` (harness/CLI path). The deploy GNN (`nn-graph-retrain-lifecycle` -> graphsage-trainer) does NOT yet use heterophily features, so the +0.138 is not realized in deploy.
2. **Grow the base-feature coverage** -- only 563 of 301K+ graph nodes have a 768d embedding; a denser embedded set + ref-pool growth ([[reference_gnn_selective_deploy_2026_06_06]] poolSize was the binding blocker) likely lifts more than any hop tuning.
3. Each requires a full GPU retrain to validate (reaper-immune scheduled task, like the OCR loop / india mine) -- not safe to launch mid-compacted-context.

**WIRED this session:** `validate-heterophily-auroc.mjs` default `--hops` 2 -> 3 (the proven optimum for the experiment tool). PIPELINE_DEFAULTS.heterophilyHops stays 0 (flipping it breaks the 183 cluster-graph tests that call runTrainingPipeline without hops + the byte-identical legacy path [[reference_u_nng_pipeline_stratified_wire_2026_05_17]] preserves).

Related: [[reference_gnn_edge_predict_foundation_2026_06_08]], [[reference_gnn_selective_deploy_2026_06_06]], [[feedback_multiseed_before_auroc_claim]], [[feedback_build_for_blackwell_hardware]].
