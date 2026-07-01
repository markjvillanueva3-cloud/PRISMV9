---
name: reference_india_struct_feature_measured_lift_2026_06_25
description: "MEASURED (slot:india 2026-06-25, U-GNN-STRUCT-FEATURES): the leakage-safe engine-import-neighbour structural feature DOES lift GNN tier-5 class separability -- CORRECTING the 2026-06-21 probe's over-rejection. Live (3202 labeled engines, 43 classes, .cwref-newemb.jsonl): baseline text-only meanMargin 0.0526 (23/43 separable) -> best alpha=0.75 meanMargin 0.094-0.099 (27-30/43 separable, dMargin +0.041..+0.046, +4..+7 classes). BUT bounded by only 19.6% struct coverage (silent for 80%) and it is classSeparability (NOT the LOO classifier AUROC) -> NECESSARY-not-SUFFICIENT -> NO apply/retrain. alpha=1 struct-only COLLAPSES (6/43) -> must FUSE not replace text. Shipped: scripts/lib/node-structural-features.mjs (26 tests) + scripts/measure-structural-augmentation-separability.mjs (5 tests). DEDUP: nearly re-derived reference_gnn_structural_feature_probe_2026_06_21 a 3rd time -- recall-first caught it. The probe REJECTED this feature as null/non-viable from 28% COVERAGE alone WITHOUT measuring; the measurement shows the connected subset carries REAL signal. NEXT = GAP1 multi-feature STACK (this + action-surface), NOT a 4th structural-feature probe."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.621Z
aliases: reference_india_struct_feature_measured_lift_2026_06_25
---


# Structural feature: MEASURED lift, corrects the 2026-06-21 over-rejection (india 2026-06-25)

## What shipped (the reusable primitive + the measurement)
- `scripts/lib/node-structural-features.mjs` (26 R9 tests, 2-arm scrutiny PASS): the LEAKAGE-SAFE
  structural feature -- engine->engine import adjacency (basename-resolution, captures relative
  sibling imports the `/engines/<Name>` regex misses), per-engine neighbour-dispatcher histogram
  (the engine's OWN label is NEVER read, only neighbours' -> no self-leak), late-fusion
  `concatWeighted(textVec, structVec, alpha)`. Robust to BOTH the single-label map AND the raw
  Set-valued `buildEngineDispatcherMap` (a P1 the reviewer caught: passing the wrong shape would
  SILENTLY yield all-zero features = a measurement-honesty hazard).
- `scripts/measure-structural-augmentation-separability.mjs` (5 R9 tests, 2-arm scrutiny PASS):
  NON-DESTRUCTIVE (no graph write, no GPU) -- baseline-vs-augmented `classSeparability` over an
  alpha x degree sweep.

## The measured result (R12 -- real numbers, the thing the probe never measured)
| arm | meanMargin | separable | note |
|---|---|---|---|
| BASELINE (text-only) | 0.0526 | 23/43 | the deployed nomic embeddings |
| alpha=0.75 deg=off | 0.094 | 27/43 | +0.0414 margin, +4 classes |
| alpha=0.75 deg=on | 0.099 | 30/43 | +0.0462 margin, +7 classes (BEST) |
| alpha=1 (struct-only) | 0.031 | 6/43 | COLLAPSES -- 80% are zero vectors |
- struct coverage = **19.6%** of labeled engines have any engine->engine import edge.

## CORRECTION to the record (R12 honest -- this is the value over the prior probe)
[[reference_gnn_structural_feature_probe_2026_06_21]] REJECTED this exact feature ("null/flat /
too sparse to be a coverage lever -- do NOT build a 1-hop-import feature") -- but it inferred that
from the 28% COVERAGE histogram ALONE, never running `classSeparability` on augmented vectors. The
actual MEASUREMENT shows the connected ~20% subset carries REAL class signal: the aggregate margin
nearly DOUBLES (+4..+7 separable classes). The probe's CONCLUSION ("cannot be a FULL-coverage lever
at this coverage") STANDS; its INFERENCE ("null/non-viable, don't build it") was TOO STRONG. This is
"gate on REAL numbers, never infer" (india soul) doing its job. The feature is a REAL-but-PARTIAL
additive signal -- the same shape as the action-surface feature
([[reference_action_surface_separability_measure_2026_06_21]]: real but modest, 57% coverage).

## Why this is NOT yet a deploy lever (the honest bound)
- 19.6% coverage -> silent for 80% of engines; cannot broaden FULL coverage alone.
- classSeparability is the NECESSARY precondition, NOT the LOO classifier AUROC the deploy gate
  uses. The confirmatory step (a full `runAssessment` LOO on augmented embeddings) was NOT run.
- => NO apply, NO retrain on this evidence (measure-before-promote).

## The dedup lesson (compounding -- this almost happened a 3RD time)
The pre-write graph hook surfaced the action-surface sibling; reading it led to the structural-probe
sibling, which I had ALREADY shipped 2026-06-21. I started building from the STALE scoping note in
[[reference_gnn_embed_separability_diagnostic_2026_06_21]] ("NEXT: build the structural feature")
WITHOUT noticing a LATER same-day memory superseded it. **A scoping note's "NEXT UNIT" is stale the
moment a later memory probes that unit -- recall the WHOLE sibling chain, newest-first, before
building.** Sibling of [[reference_india_nn_rederivation_dedup_2026_06_25]].

## NEXT (the genuine open lever -- do NOT re-probe structural features a 4th time)
The GAP1 multi-feature STACK: combine this structural feature + the action-surface feature
(+ candidate wiki-section text / AST call-graph) as multiple dense leak-free signals, THEN the
H2GCN/GPU retrain gated on AUROC>=0.78 / macroF1>=0.55 / Brier<=0.15 multi-seed
([[feedback_multiseed_before_auroc_claim]]). Spec: `state/shared/specs/GAP1-GNN-FEATURE-ENRICHMENT-SCOPE-2026-06-21.md`.
Siblings: [[reference_gnn_structural_feature_probe_2026_06_21]] ·
[[reference_action_surface_separability_measure_2026_06_21]] ·
[[reference_gnn_embed_separability_diagnostic_2026_06_21]] · [[reference_india_refpool_apply_disproven_2026_06_25]].
