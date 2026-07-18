---
title: GNN macroF1 gate — the two honest NO-GPU levers (both retrain-gated)
tags: [gnn, nn-graph, macrof1, ai-hardening, honesty, tier-5]
created: 2026-07-02
by: claude-d0d0b195 (slot:india)
kind: lesson
---

# GNN macroF1 gate — the two honest NO-GPU levers (both retrain-gated)

**Synthesis** of two shipped analysis units (this supersedes the mechanical auto-distilled per-commit
dumps, which each cover only one lever and carry a distiller-artifact `arms A✗ B✗ C✗` line — both units
in fact passed a direct-Agent 2-arm scrutiny, zero P0/P1). Tool for both: `scripts/lib/nn-graph-confusion-analysis.mjs`.

## The problem
The tier-5 GNN is below-gate on the LIVE `state/shared/nn-graph/NN-EVAL.json` (holdoutN=200): AUROC 0.7525
(<0.78, close), **macroF1 0.4104 (<0.55, the BINDING failure)**, Brier 0.22 (>0.15). Two structural drivers
were decomposed ([[reference_gnn_confusion_analysis_2026_06_30]]): tail-class starvation (18-20 of 29 truth
classes have <5 held examples) and phantom labels (13 predicted-but-true-count-0 classes absorb 16% of mass).

## The two levers — quantified as HONEST BOUNDS (never post-hoc gains)
| Lever | Function (commit) | Floor | Ceiling | Clears 0.55? |
|-------|-------------------|-------|---------|--------------|
| **Reference-example GROWTH** (FINDING 1, the #1 lever) | `growthCeiling` (`14b2773bf6`) | 0.4104 | **0.5778** | yes |
| **Phantom-label PRUNE** (FINDING 2/4) | `prunePhantomCeiling` (`2d4a01b0af`) | 0.4104 | **0.5782** | yes |

- **`growthCeiling`** projects macroF1 if each of the 20 starved classes, grown to n≥5, reaches AT LEAST the
  mean F1 the 9 already-well-sampled classes achieve (live meanWell **0.521**), via `Math.max(f1, meanWell)`
  (a true upper bound). Anchored to REAL observed performance — never an invented 1.0; the `wellSampled==0`
  branch REFUSES to project rather than fabricate a target. Distinct from `macroF1Sensitivity` (which *excludes*
  tail classes). Detail [[reference_gnn_growth_ceiling_2026_07_02]].
- **`prunePhantomCeiling`** projects macroF1 if the 32 predictions absorbed by the 13 phantom labels re-infer
  onto their true class after a retrain that cannot emit phantoms. Key subtlety: `macroF1()` already excludes
  phantoms (n=0) from its denominator, so **pruning ALONE moves macroF1 by 0** — the ceiling is realized only by
  re-inference. Detail [[reference_gnn_phantom_prune_ceiling_2026_07_02]].

## The honest bottom line (R12 / no-fabrication)
Both ceilings are **UPPER BOUNDS that require a RETRAIN to realize** — neither moves macroF1 post-hoc, and
neither is a claimed gain. The realized macroF1 ∈ **[0.4104, ~0.578]**, set by how well the india GPU session
(a) sources real held examples for the 20 starved truth classes and (b) prunes the 13 phantom labels from the
output space so the 32 freed predictions land on real classes. Either lever alone projects past the gate; pursued
together they compound. **Do NOT promote the model past the deploy gate without a real re-measured AUROC/macroF1/Brier**
— re-run `node scripts/lib/nn-graph-confusion-analysis.mjs` (or `--manifest`) after any retrain to measure the realized value.

Related: [[reference_gnn_retrain_target_manifest_2026_06_30]] · [[gnn-selective-deploy]] · [[feedback_multiseed_before_auroc_claim]].
