---
name: reference_gnn_ghost_holdout_headtohead_2026_06_22
description: "GNN tier-5 edges-lever FINAL arc step — the deploy decision on the LIVE unwired-ghost holdout (slot:india, 2026-06-22, U-GNN-GHOST-HOLDOUT-HEADTOHEAD). Ran the 3 arms (direct-embed / neighbor-vote / confidence-hybrid @ tau=0.70) via measure-ghost-holdout-headtohead.mjs on the 745MB graph, --max-old-space-size=8192, multi-seed [1337,7,42], holdoutN=84 all seeds (pool healthy). VERDICT: KEEP direct-embed — the homophilous-edge hybrid does NOT robustly clear the deploy gate. Hybrid emitted-set clears Brier (0.079) + macroF1 (0.619) and spans 2/13 classes vs direct-embed's 1/13, BUT global AUROC gate (>=0.78) fails NON-ROBUSTLY: seed1337 0.7073 keep / seed7 0.8342 WIRE / seed42 0.7618 keep -> mean ~0.768<0.78, spread 0.707-0.834 straddles gate. A single seed (7) would have falsely said WIRE; multi-seed correctly rejects. Textbook feedback_multiseed_before_auroc_claim save. Edges lever = wired-set CEILING win that does not transfer to edge-sparser deployed ghosts. Deployed direct-embed tier-5 UNCHANGED, no production wiring. Arc CLOSED."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.591Z
aliases: reference_gnn_ghost_holdout_headtohead_2026_06_22
---


# GNN tier-5 edges-lever — deploy decision (FINAL arc step)

**Unit:** `U-GNN-GHOST-HOLDOUT-HEADTOHEAD` (slot:india, 2026-06-22). Closes the 5-unit
edges-lever arc ([[gnn-edges-lever]]). Finished the in-flight WIP the prior india session
(`claude-905b2dd4`, evicted) had built-but-not-run-or-committed.

## What ran

`scripts/measure-ghost-holdout-headtohead.mjs` — the 3 classifier arms on the **LIVE deployed
unwired-ghost holdout** (not the wired-set LOO proxy):
1. **direct-embed** — the deployed classifier (768d-nomic cosine k-NN, no edges).
2. **neighbor-vote** — count vote over leak-free homophilous edges (import+schema+test) via
   `buildGhostNeighborIndex` ([[reference_gnn_ghost_neighbor_index_2026_06_21]]).
3. **confidence-hybrid @ τ=0.70** — trust neighbor vote iff purity ≥ τ, else direct-embed.

`nn-graph-eval.mjs` `buildHoldout` + `computeAUROC/MacroF1/Brier` + `gradeSelectiveDeploy`
@ `GNN_DEFAULTS.minConf=0.7`. 745MB graph, `--max-old-space-size=8192`, multi-seed
`[1337, 7, 42]`. **holdoutN=84 all seeds** (pool healthy — not the collapsed 62→13 state, so
trustworthy). Report: `state/shared/nn-graph/ghost-h2h-2026-06-22.json`.

## Verdict: KEEP direct-embed (no production change)

The hybrid emitted-set at the production gate is *good* — Brier **0.079** ≤ 0.15, macro-F1
**0.619** ≥ 0.55, accuracy 0.957, coverage 27%, and it spans **2/13** classes vs
direct-embed's **1/13**. But the binding **global AUROC gate (≥0.78) FAILS, non-robustly**:

| seed | hybrid AUROC | decision |
|---|---|---|
| 1337 | 0.7073 | keep |
| 7 | **0.8342** | WIRE |
| 42 | 0.7618 | keep |

mean ≈ **0.768 < 0.78**; spread **0.707–0.834** straddles the gate. `decideHeadToHead`'s
robustness requirement → KEEP. **A single seed (7) would have falsely concluded WIRE** —
multi-seed caught it. This is the [[feedback_multiseed_before_auroc_claim]] lesson realized:
AUROC on an 84-sample / 13-class holdout is high-variance.

## Why (the honest takeaway, R12)

The edges lever is a real **wired-set CEILING win** (+0.0309 LOO accuracy,
[[reference_gnn_confidence_hybrid_2026_06_21]]) that **does NOT transfer** to the edge-sparser
deployed ghosts (only 62.5% have ≥1 leak-free edge). The deployed **direct-embed tier-5 stands
unchanged**. The remaining lever for tier-5 full-coverage is orthogonal to edges:
reference-pool growth + sharper features (H2GCN / GPU retrain) — [[gnn-selective-deploy]].

## Artifacts (committed this unit)

- `scripts/measure-ghost-holdout-headtohead.mjs` (was untracked WIP) + `.test.mjs` (25/25,
  pure-export, graph-free — `neighborArmSamples`/`hybridArmSamples`/`scoreArm`/`decideHeadToHead`).
- `state/shared/nn-graph/ghost-h2h-2026-06-22.json` (the multi-seed report).
- Re-run: `node --max-old-space-size=8192 scripts/measure-ghost-holdout-headtohead.mjs --json --seeds 1337,7,42 --out <path>`.

**ARC:** [[reference_gnn_edge_class_homophily_2026_06_21]] → [[reference_gnn_neighbor_vote_loo_2026_06_21]]
→ [[reference_gnn_classify_headtohead_2026_06_21]] → [[reference_gnn_confidence_hybrid_2026_06_21]]
→ [[reference_gnn_ghost_neighbor_index_2026_06_21]] → **THIS (closed)**.
