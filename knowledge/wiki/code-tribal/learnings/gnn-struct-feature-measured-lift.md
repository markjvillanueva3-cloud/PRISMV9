---
title: GNN structural feature — measured partial lift (corrects the 2026-06-21 over-rejection)
tags: [gnn, nn-graph, leg-10, feature-engineering, india, measure-first, dedup]
created: 2026-06-25
by: claude-c82292de (slot:india)
unit: AI-SYSTEMS-GNN/U-GNN-STRUCT-FEATURES
---

# GNN structural feature — measured partial lift

## TL;DR
The leakage-safe **engine-import-neighbour** structural feature (an engine's import neighbours'
dispatcher classes) **DOES** raise GNN tier-5 class separability — **correcting** the 2026-06-21
probe that rejected it as "null/non-viable" from coverage alone without measuring. But it is bounded
by ~20% import coverage and is `classSeparability` (not the LOO classifier AUROC), so it is
**necessary-not-sufficient** → **no apply/retrain**. It is one more real-but-partial feature for the
GAP1 multi-feature stack, not a standalone deploy lever.

## Shipped
- `scripts/lib/node-structural-features.mjs` (26 tests) — leakage-safe feature core: engine→engine
  import adjacency (basename resolution, captures relative sibling imports), neighbour-dispatcher
  histogram (engine's **own** label never read → no self-leak), `concatWeighted` late fusion.
  Robust to both the single-label map and the raw `Set`-valued `buildEngineDispatcherMap` (else a
  shape mismatch silently yields all-zero features — a measurement-honesty hazard, R12).
- `scripts/measure-structural-augmentation-separability.mjs` (5 tests) — NON-DESTRUCTIVE
  baseline-vs-augmented `classSeparability` over an alpha×degree sweep.

## Measured (live, 3202 labeled engines, 43 classes, `.cwref-newemb.jsonl`)
| arm | meanMargin | separable |
|---|---|---|
| baseline (text-only) | 0.0526 | 23/43 |
| α=0.75 (best) | 0.094–0.099 | 27–30/43 (+4..+7 classes) |
| α=1 struct-only | 0.031 | 6/43 (collapses) |

Struct coverage = **19.6%**. α=1 collapsing proves the feature must be **fused** with text, not
replace it (80% of engines have a zero struct block).

## The lessons
1. **Measure, don't infer (india soul).** The 2026-06-21 probe inferred "null" from a 28% coverage
   histogram; the actual `classSeparability` measurement shows the connected ~20% carries real class
   signal (margin nearly doubles). The probe's *conclusion* (not a full-coverage lever) held; its
   *inference* (non-viable, don't build) was too strong.
2. **A scoping note's "NEXT UNIT" goes stale the moment a later memory probes that unit.** I started
   building from a stale "NEXT: build the structural feature" note, nearly re-deriving the probe a
   **3rd** time. Recall the whole sibling chain newest-first before building. See
   `reference_india_nn_rederivation_dedup_2026_06_25`.
3. **`classSeparability` ≠ the LOO deploy-gate AUROC.** A separability lift is the necessary
   precondition; the confirmatory step is a `runAssessment` LOO on augmented embeddings.

## Next (the genuine open lever)
The **GAP1 multi-feature stack** — this structural feature + the action-surface feature
(`reference_action_surface_separability_measure_2026_06_21`) + candidate AST call-graph / wiki text —
then an H2GCN/GPU retrain gated on AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15 multi-seed. Do **not**
re-probe structural features a 4th time. Spec: `state/shared/specs/GAP1-GNN-FEATURE-ENRICHMENT-SCOPE-2026-06-21.md`.
