---
name: gnn-refpool-123-groundtruth-ready-2026-06-13
description: 2026-06-13 (slot:bravo, dry-run evidence) — india's OWN ground-truth ref-pool grower (ghost-wire-outcomes-to-refpool.mjs) has 123 CONFIRMED wiring labels (conf 0.85, 0 conflicts) extractable NOW but was NEVER --apply'd (find-cache ghost.outcome-wired=[], candidate holdoutN still 13). This is the SAFE (ground-truth, non-poisoning) lever for the GNN full-coverage AUROC>=0.78 residual the goal-gate names. Blocked for bravo: --apply writes sierra's 548MB system-graph + needs india GPU retrain.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.592Z
aliases: reference_gnn_refpool_123_groundtruth_ready_2026_06_13
---


2026-06-13 (slot:bravo, session 17b9f42e) — while working the standing AI-synergy `/goal`, ran a **read-only dry-run** of india's `scripts/ghost-wire-outcomes-to-refpool.mjs` (authored slot:india 2026-06-11, U-GHOST-OUTCOME-REFPOOL). Concrete, actionable evidence on the GNN full-coverage residual.

## What the gate says vs what's actually pending
- `scripts/ai-systems-synergy-goal-gate.mjs` = **4/4 PASS** (synergy 34/34, LoRA 1366 rows/34, GNN selective AUROC 0.8084>=0.78, CAG 100%). Broad goal MET in code/structure/data.
- Gate's sole residual: *"GNN FULL-coverage gate not yet met (ref-pool growth, india-owned data/GPU)."* full-cov AUROC **0.4286** on a **holdoutN=13** (tiny → high variance).

## The finding (dry-run, `--json`, read-only)
- **123 CONFIRMED ground-truth wiring outcomes** ready to fold into the GNN ref-pool: confidence 0.85 (above the 0.8 ref gate), **0 label conflicts**.
- byDispatcher: prism_turning 49 · prism_cam 25 · prism_calc 14 · prism_dev 10 · prism_ai 10 · prism_orchestrate 5 · prism_5axis 4 · prism_safety 3 · prism_session 2 · prism_cad 1.
- **These were NEVER applied:** `system-viz-query find "ghost.outcome-wired" --json` → `[]`, and the candidate holdout is still 13. india built the grower but never ran `--apply`.
- **Ground truth, NOT poisoning:** only `validation.status==="confirmed"` rows with a valid dispatcher survive (R12) — same trust as a vault confirmation. This is the SAFE lever, distinct from the active-learning labeling worklist that WOULD poison india's training data (proven earlier by `DisasterRecoveryEngine→prism_cam` wrong guess). See [[reference_gnn_pipeline_livestate_2026_06_13]].

## Why bravo did NOT execute it (two hard ownership boundaries)
1. `--apply` calls `writeGraphStreamingAtomic` on `state/shared/system-viz/system-graph.json` — **sierra's 548MB single-writer graph** (bravo do-not-mutate constraint; collision risk with sierra's regen-viz).
2. Any AUROC lift requires a **GPU retrain afterward** (`nn-graph-retrain-lifecycle.mjs`) — india's GPU/ML domain.

## EXACT ready-to-run task (india, coordinate with sierra)
```
# 1. (sierra-coordinated, off regen-viz window) grow the pool from ground truth:
node scripts/ghost-wire-outcomes-to-refpool.mjs --apply      # +~123 ghost.outcome-wired.* ref nodes; reversible via --revert
# 2. (india GPU) retrain + grade with the grown pool:
node scripts/nn-graph-retrain-lifecycle.mjs --force          # eval-gates; promotes IFF AUROC>=0.78/macroF1>=0.55/Brier<=0.15
node scripts/nn-graph-eval.mjs                               # re-grade full-coverage holdout (was 13 nodes → larger)
```
Expectation (honest, R12): ~123 ground-truth labels ≈ 9.5× the 13-node holdout — materially larger eval set, but a full-cov AUROC≥0.78 lift is **not guaranteed** (link-pred AUROC on capped subgraphs is high-variance; multi-seed before any lift claim per [[feedback_multiseed_before_auroc_claim]]). It is, however, the single named in-scope lever and is safe to try.

## EXPERIMENT RUN — operator-authorized, HARD NEGATIVE RESULT (2026-06-13, slot:bravo)
The operator (via AskUserQuestion) authorized bravo to run the lever. Executed end-to-end with host clean (GPU 94.5GB free/1%, RAM 89GB free, no graph-writer running):
1. `--apply` → +123 ground-truth nodes/+123 edges (graph 341005, atomic write clean).
2. `nn-graph-retrain-lifecycle.mjs --force` (16GB heap) → trained exit 0, **eval AUROC 0.1396 · macroF1 0.0681 · Brier 0.1295 → gate NOT cleared (0.1396 < 0.78), NOT promoted.**
3. `--revert` → removed 123, graph back to 340882. Sierra's graph pristine.

**CONCLUSION (R12, disproves the hypothesis):** folding the 123 available CONFIRMED ground-truth labels + a vanilla single-seed retrain does **NOT** lift full-coverage AUROC — it landed at 0.1396 (below the prior 0.4286, below random 0.5). Single-seed link-pred AUROC is high-variance ([[feedback_multiseed_before_auroc_claim]]) so the exact number is noisy, BUT the gate (≥0.78) is clearly **not closeable by label-count alone**. The full-coverage residual is **model/feature-design-bound, not label-count-bound** → genuinely india's GPU/ML-design domain (multi-seed stability, feature/label-structure alignment, H2GCN/heterophily-aware arch — NOT "apply the pending labels," which is now PROVEN insufficient).

The production selective model (gate C, AUROC 0.8084 @ τ=0.7) was **never touched** — this research retrain didn't promote. Deterministic goal-gate stays 4/4 PASS.

## Status
Lever TRIED under operator authorization → hard negative → reverted clean. The broad AI-synergy goal is saturated (4/4 gate, 34/34 audit). The full-coverage residual is now PROVEN to be india's deeper ML-design problem, not a bravo-actionable label-fold. → [[reference_gnn_pipeline_livestate_2026_06_13]] · [[feedback_multiseed_before_auroc_claim]]
