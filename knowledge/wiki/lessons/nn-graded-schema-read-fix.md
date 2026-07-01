---
title: NN/GNN GRADED-shape schema-read fix
type: lesson
domain: ai-training
slot: india
created: 2026-06-03
commit: 93f85ec067
supersedes_context: nn-leg-schema-read-fix
tags: [nn-graph, gnn, schema-read-blindness, psn-leg-10, fail-loud, tier-5]
---

# NN/GNN GRADED-shape schema-read fix

## What happened

`U-NN-REFPOOL-REEVAL` re-ran `scripts/lib/nn-graph-eval.mjs` against today's live 676 MB
system-viz graph. The GNN tier-5 deploy-gate eval had been perma-`DEFERRED` for weeks
(`insufficient-reference-pool`, poolSize 0, last graded May-16). Today's graph yields a real
**62-ghost reference holdout**, so the gate is no longer data-blocked. NN/GNN leg #10 moved to a
**measured** verdict: `SHIPPED-RESEARCH-ONLY`, AUROC 0.5 / macro-F1 0.133 / Brier 0.26.

Diagnosis from the holdout samples: the 8-dim GraphSAGE checkpoint **collapsed to a constant
`prism_turning` predictor** — all 62 holdout ghosts predicted `prism_turning` @ conf 0.4.
Accuracy 0.5 is an artifact of class imbalance (about half the high-confidence reference ghosts
are Lathe*/Swiss*/LiveTooling* engines that genuinely wire to `prism_turning`), not learning.

## The regression class (one shape deeper than f436b2c614)

`nn-graph-eval.runAssessment` emits **two** JSON shapes into `state/shared/nn-graph/NN-EVAL.json`:

| Shape | Trigger | AUROC location | Semantics |
|---|---|---|---|
| DEFERRED | holdout can't be built (empty pool) | `checkpointMeta.auroc` | link-prediction **pretext** diagnostic — NOT the deploy gate |
| GRADED | holdout scored | `metrics.auroc` | **real deploy-gate** holdout metric |

The prior `f436b2c614` fix made `classifyGnn` (in `nn-graph-health-inject.mjs`) the single source
of truth and routed both consumer hooks through it — but `classifyGnn` read AUROC *only* from
`checkpointMeta.auroc`. The GRADED shape has no `checkpointMeta` and no `checkpointPresent`, so a
graded report classified `{dormant:true, auroc:null}`. Result: the moment the eval produced its
first real grade, **both** fleet hooks (`psn-leg-state-inject`, fires every prompt across 26 slots,
+ `nn-graph-health-inject` SessionStart) mis-reported it as "DORMANT poolSize 0 / AUROC n/a".

**Why latent:** the producer's GRADED output path was never exercised while the eval was
data-blocked at poolSize 0. A single-source-of-truth reader is only as correct as the set of
producer shapes its tests actually cover.

## Fix

In `classifyGnn`:
- read `metrics.auroc` / `metrics.brier` (deploy gate) **first**, fall back to
  `checkpointMeta` (pretext) — R7: surface the more-authoritative signal, never blend.
- `graded = !deferred && metricAuroc !== null`; `deferred` is authoritative (a stray metrics
  block can't flip a deferred report live).
- `checkpointPresent ||= graded` — you cannot score a holdout without a loaded checkpoint, so a
  graded report implies presence → it is **never dormant**, only below-gate or healthy.
- fail-closed `healthy` (unknown AUROC/Brier → not certified), named `PROMOTE_AUROC_MIN` /
  `PROMOTE_BRIER_MAX` (no re-inlined 0.78/0.15).

+9 tests (87 total green) incl real-data E2E against the live `NN-EVAL.json` and a negative
assertion that a graded doc can never render `AUROC **n/a**`. Per-file scrutiny: 2 reviewers PASS,
0 P0/P1.

## Lesson

When one reader serves N producer shapes, **every shape needs a fixture+test**. A "single source of
truth" consumer silently mis-reads any producer shape its tests never exercise — and the failure
only surfaces when production data finally takes the untested branch. Pair every new producer output
shape with a consumer fixture in the same change.

## Follow-on (2026-06-03)

Evaluated the **768d candidate** against the same holdout: byte-identical AUROC 0.5, all 62 →
`prism_turning` @ conf 0.4. Two different-dimension checkpoints producing an identical constant
proves the `0.4` is **structural** — the k-NN vote (`min(cap, voteShare)`) collapses to the
reference-pool class prior (Lathe-dominant) because the GraphSAGE link scores don't separate
dispatcher classes on this heterophilous graph. Constant confidence ⇒ arbitrary ranking ⇒ AUROC 0.5
by tie-break. **Checkpoint-swapping cannot move the gate; the problem is upstream (features +
class imbalance).**

Shipped `U-NN-EVAL-DEGENERATE-GUARD` (c354432cf6): `detectDegeneracy` makes the eval **fail loud** on
this — the report now says `DEGENERATE(constant-vote)` / "below-gate by degeneracy, not a small
margin", so a collapsed model is never mistaken for a near-miss. **Lesson:** an at-chance metric has
two very different causes (collapsed model vs genuinely-close model); a closed-loop that can't tell
them apart will waste cycles tuning a model that needs rearchitecting. Make degeneracy a first-class,
fail-loud signal.

`U-NN-DEGENERACY-HOOK-SURFACE` (fleet-wide `[DEGENERATE]` per-prompt signal) shipped (f844af7eb3).

## Definitive close (2026-06-03) — tier-5 GNN can't learn dispatcher wiring from text features

`U-NN-FEATURE-SEPARABILITY` resolved with a **proven negative**. Tested every feature angle on the
62-ghost holdout:
- 768d wiki-embedding bridge: only 7/62 (11%) coverage; regen against the current graph did NOT
  improve it (the bridge needs a wiki-basename match; most unwired engines have no wiki page).
- Ollama `nomic-embed-text` on engine NAMES (full 62/62 coverage): **LOO nearest-centroid accuracy
  0.339 < 0.5 baseline; intra/inter cosine gap 0.0017 ≈ 0 → NON-SEPARABLE.**

**Lesson:** you cannot learn a STRUCTURAL label (which dispatcher an engine wires to) from a SEMANTIC
text embedding of its name or wiki. Near-identical names wire to different dispatchers
(`LatheDeepLearningEngine`→prism_turning vs `LatheCAMIntelligenceEngine`→prism_cam); the embedding
can't tell them apart. And the structural signal (import/call edges) is absent **by definition** — a
node is a "ghost" precisely because it lacks the dispatcher edges that would classify it (cold-start).
So tier-5 GNN wiring-inference for unknown ghosts is fundamentally hard with available features.

**Outcome:** don't retrain on text features (dead end). The cascade correctly defers to tiers 1-4
(keyword/sibling heuristics use name + file-proximity directly — strictly more informative here than a
text embedding). The degeneracy guard (c354432cf6) keeps tier-5 honestly dormant so no retrain cycle
is wasted. Thread CLOSED with a definitive result. Memory:
[[reference_nn_768d_embedding_staleness_2026_06_03]]. See `[[nn-graph-ms0]]`, `[[gnn-node-embedding-bridge]]`.
