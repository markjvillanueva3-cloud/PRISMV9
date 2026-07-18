---
title: GNN tier-5 edges lever — homophilous edges are a wired-set ceiling-win that does NOT transfer to the deployed ghost holdout
type: architecture
tags: [gnn, tier-5, wiring-inference, edges, homophily, neighbor-vote, direct-embed, ai-training, slot-india]
created: 2026-06-21
by: claude-905b2dd4 (slot:india)
updated: 2026-06-22
status: arc-closed-not-deployed
---

# GNN tier-5 edges lever

> One synthesized entry for the 4-unit edges-lever arc (slot:india, 2026-06-21). Query
> this before re-deriving. Per-unit detail lives in the linked memories.

## TL;DR

The deployed GNN tier-5 wiring classifier is **direct-embed cosine k-NN** over the node
embeddings — it uses **NO graph edges**. This arc proved, with deterministic leave-one-out
measurements, that the leak-free engine↔engine edge subgraph carries strong
dispatcher-class signal the deployed classifier throws away, and that a **purity-gated
hybrid beats direct-embed by ~3 points** at full coverage on the codebase-wired set.
Status: **measured, not deployed** — the deploy decision is a separate ghost-holdout gate.

## The arc (4 committed units + 2 diagnostics)

| step | finding | commit |
|---|---|---|
| 1. homophily measure | leak-free engine↔engine edges are homophilous vs the random-pair null: `engine_import` lift **4.63×** (ratio 0.686 vs 0.148), `shared_test` 5.07×, `shared_schema` 2.09×; `shared_physics` 1.01× (negative control — constants span domains) | `1580c44d98` |
| 2. neighbor-vote LOO | a count-based neighbor vote over those edges classifies dispatcher at **0.767 / 2.88× base-rate**; τ=0.7 → 47% coverage @ 86% accuracy | `0a2c081f04` |
| 3. classify head-to-head | direct-embed 0.722 vs neighbor-vote 0.767-on-subset vs naive hybrid 0.732; they agree only 71% where both fire (complementary) | `cd3f64fe26` |
| 4. confidence-aware hybrid | purity-gate at τ → **best τ=0.70 → 0.753 = +0.0309 over direct-embed** (3× the naive lift); τ=0.70 coincides with `GNN_DEFAULTS.minConf` | `fb496ed0ab` |
| diag A | 62.5% of deployed unwired ghosts have ≥1 leak-free edge (avg 2.02 nbrs) → hybrid is the right design (37.5% edgeless need direct-embed fallback) | — |
| diag B | cached `NN-EVAL.json` (2026-06-17) shows ghost holdout **healthy at 84** (not the transient 62→13 collapse) → the final gate is not data-blocked | — |

## Why this reconciles with the "heterophily" notes

Prior NN-GRAPH work found the **full** training graph heterophilous (the AUROC-0.096 era,
the H2GCN `heterophilyHops` machinery shipped default-off). No contradiction: the full graph
is dominated *by count* by hub edges — `action-engine` wiring (dispatcher → many
different-class engines) and `parent-contains` (galaxy → many) — which are heterophilous.
The **isolated** leak-free engine↔engine subgraph (import + test + schema) is homophilous.
The lever is "the **right** edges," not edges-vs-none.

## Leak discipline (the fake-0.98 trap)

Every edge type used is computable without a ghost's own dispatcher label:
- `engine_import` / `shared_schema` / `shared_test` are structural properties of the `.ts`
  file / its schema / its test — written independent of which dispatcher routes to it.
- `action-engine` edges are **EXCLUDED**: the `disp.<dispatcher>.action.*` endpoint **is**
  the class label, and an unwired ghost has no such edge → trivially 1.0 homophilous = leak.

All measurements are leave-one-out (the target's own label/vector never enters its own vote).

## Tools (all non-destructive, no 542MB graph; reuse the `.cwref-newemb.jsonl` cache)

- `scripts/measure-edge-class-homophily.mjs` — per-edge-type homophily vs the null
- `scripts/measure-neighbor-vote-loo.mjs` — LOO neighbor-vote accuracy/coverage
- `scripts/measure-classify-headtohead.mjs` — direct-embed vs neighbor-vote vs hybrid
- `scripts/measure-confidence-hybrid.mjs` — purity-threshold (τ) sweep

## Honest scope (R12)

All numbers are deterministic full-LOO on the **codebase-wired set** (real single-dispatcher
labels) — a CEILING/proxy for the deployed task, which classifies edge-sparser **unwired**
ghosts. Accuracy is **not** the deploy gate (the gate is AUROC≥0.78 / macro-F1≥0.55 /
Brier≤0.15 on the ghost holdout). The lifts are k-sensitive.

## Deploy decision — FINAL arc step DONE (2026-06-22, slot:india) → KEEP direct-embed

Ran `scripts/measure-ghost-holdout-headtohead.mjs` (the 3 arms — direct-embed / neighbor-vote /
confidence-hybrid @ τ=0.70) on the **live deployed unwired-ghost holdout** via
`nn-graph-eval.mjs` `buildHoldout` + `computeAUROC`/`computeMacroF1`/`computeBrier` +
`selectiveDeployPoint`/`gradeSelectiveDeploy` @ `GNN_DEFAULTS.minConf`, the 745MB graph at
`--max-old-space-size=8192`, **multi-seed `[1337, 7, 42]`**. holdoutN **84** all seeds (pool
healthy — NOT the collapsed 62→13 state, so the result is trustworthy). Report:
`state/shared/nn-graph/ghost-h2h-2026-06-22.json`.

**Verdict: KEEP direct-embed — the edges lever does NOT robustly clear the deploy gate on the
real ghost holdout.** The hybrid's emitted set at the production gate clears Brier (0.079≤0.15)
and macro-F1 (0.619≥0.55), and it spans 2/13 classes vs direct-embed's 1/13 — but the binding
**global AUROC gate (≥0.78) fails**, and it fails *non-robustly*:

| seed | hybrid AUROC | per-seed |
|---|---|---|
| 1337 | 0.7073 | keep |
| 7 | **0.8342** | wire |
| 42 | 0.7618 | keep |

mean ≈ **0.768 < 0.78**; the spread (0.707–0.834) straddles the gate. **A single seed (seed 7,
0.834) would have falsely concluded WIRE** — multi-seed (`decideHeadToHead` robustness gate)
correctly rejects it. This is a textbook [[feedback_multiseed_before_auroc_claim]] save: AUROC
on an 84-sample / 13-class holdout is high-variance; the lever is a **wired-set CEILING win that
does not transfer** to the edge-sparser deployed ghosts (62.5% edge-coverage). **The deployed
direct-embed tier-5 stands unchanged; no production wiring.** The remaining lever for tier-5
full-coverage is unchanged and orthogonal to edges: reference-pool growth + sharper features
(H2GCN / GPU retrain) — see [[gnn-selective-deploy]]. Arc closed.

Artifacts: `scripts/measure-ghost-holdout-headtohead.mjs` (+ `.test.mjs` 25/25, pure-export,
graph-free) · result JSON above · memory [[reference_gnn_ghost_holdout_headtohead_2026_06_22]].

## Memories (per-unit detail)

[[reference_gnn_edge_class_homophily_2026_06_21]] · [[reference_gnn_neighbor_vote_loo_2026_06_21]] ·
[[reference_gnn_classify_headtohead_2026_06_21]] · [[reference_gnn_confidence_hybrid_2026_06_21]] ·
[[reference_gnn_selective_deploy_2026_06_06]] · [[feedback_multiseed_before_auroc_claim]]
