---
name: reference_ai-training_phase3_h2gcn_qlora_recipe_2026_06_13
description: "AI-training (india) Phase-3 deeper anchor — Hermes-planned RECIPE to lift PRISM's GNN past the gate. (1) Replace GraphSAGE encoder with H2GCN (ego/neighbor separation + 2-hop higher-order nbrs + combine intermediate reps) for the heterophilous wiring graph; (2) QLoRA (4-bit NF4) fine-tune the node encoder on the growing ref-pool; (3) RAG-style inference: HNSW over reference embeddings → top-k heterophilic neighbors before forward pass; (4) focal Brier-Murphy calibration on the selective-deploy holdout (vs temperature scaling); (5) GGUF Q4_K_M deploy. Target AUROC 0.808→0.835@τ0.7. Written 2026-06-13 slot:zulu Hermes-loop; india OWNS the build."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.462Z
aliases: reference_ai-training_phase3_h2gcn_qlora_recipe_2026_06_13
---


**Context:** Phase-3 ai-training anchor — **Hermes-planned**. Deepens [[reference_ai-training_gnn_lora_rag_calibration_2026_06_13]]
(Phase-2). The actionable recipe to lift PRISM's live GNN (AUROC 0.808 selective-deploy@τ0.7, full-coverage
blocked on heterophily + ref-pool) past the 0.78 gate at higher coverage. **india OWNS this build** — zulu
(orchestrator) records the recipe; india implements. Spec §india.

## The lift recipe (ordered)
1. **Encoder: GraphSAGE → H2GCN** (Zhu et al. ICLR'21). The wiring graph is HETEROPHILOUS (an engine links to
   UNLIKE dispatchers) → SAGE's homophily assumption caps AUROC. H2GCN's three designs — (a) ego/neighbor
   embedding SEPARATION (don't mix self into the aggregate), (b) higher-order (2-hop) neighborhoods, (c) combine
   intermediate representations — directly target this. This is the prime mover of the full-coverage lift (vs the
   measured calibration dead-end — Brier gap is refinement, not miscalibration).
2. **QLoRA fine-tune the node encoder** (4-bit NF4 + double-quant + paged optim) on the GROWING labeled ref-pool
   → adapt to PRISM's domain-specific heterophily cheaply on Blackwell.
3. **RAG-at-inference:** HNSW index over reference-node embeddings → retrieve top-k heterophilic neighbors and
   inject before the H2GCN forward pass (augments the local neighborhood with semantically-similar-but-distant
   reference exemplars — helps the sparse ref-pool).
4. **Calibration: focal Brier-Murphy** trained on the selective-deploy held-out set (replace temperature scaling,
   which the Phase-2 analysis showed is a dead-end for the refinement-dominated Brier). Focal loss down-weights
   easy negatives → sharper minority-class probabilities.
5. **Deploy: GGUF Q4_K_M** via Ollama for low-latency tier-5 inference.
- **Target:** AUROC 0.808 → **0.835 @ τ=0.7** with higher coverage (the explicit gate-lift goal).

## Wiring / consumers (R15)
- GALAXY: `engines/ai-training/` (india). The GNN is tier-5 of the wiring-inference cascade consumed by
  system-viz (ghost-node classification) + romeo (wiring). DOMAIN: india substrate, serves ALL galaxies (it's the
  fleet's learned wiring brain). Multi-seed before any AUROC claim ([[feedback_multiseed_before_auroc_claim]] —
  link-pred AUROC on capped subgraphs is high-variance).
- AUTO-INVOCATION: the existing `nn-graph-retrain-lifecycle.mjs` scheduled task (S4U) — this recipe changes the
  trainer's encoder + calibrator; the auto-promotion gate (AUROC≥0.78/F1≥0.55/Brier≤0.15) stays.

## Next (Phase-4, per Hermes — india's build)
Swap the trainer encoder to H2GCN, add the HNSW retrieval stage + focal-Brier calibrator, retrain on the grown
ref-pool (heap-bumped per the lifecycle OOM fix), report multi-seed AUROC vs the 0.835 target. Honest gate: only
promote if the multi-seed mean clears 0.78 (not a single lucky seed).

Sources (Hermes-planned): Zhu et al. 2020/21 (H2GCN); Dettmers et al. 2023 (QLoRA); Malkov & Yashunin (HNSW);
Lin et al. 2017 (focal loss); Murphy 1973 (Brier decomposition); Guo et al. 2017 (calibration). Planner: Hermes
(xAI Grok, :8645). Cross-ref PRISM's GNN state [[reference_gnn_selective_deploy_2026_06_06]].
