---
name: reference_gnn_ghost_neighbor_index_2026_06_21
description: "Ghost-aware neighbor index SHIPPED (slot:india, 2026-06-21, U-GNN-GHOST-NEIGHBOR-INDEX commit df6aa71bf7) -- the first (graph-free) piece of the ghost-holdout head-to-head (U-GNN-GHOST-HOLDOUT-HEADTOHEAD). scripts/lib/ghost-neighbor-index.mjs: pure lib building Map<ghostStem, Map<wiredStem, weight>> from the leak-free homophilous edge augmentations (import+schema+test). SOLVES the gap discovered this session: the shipped buildNeighborIndex CANNOT serve the neighbor-vote arm of the deployed ghost task -- its link() requires BOTH endpoints in stemToClass (classifiable/wired), but an unwired GHOST is NOT in stemToClass, so its ghost->wired edges get dropped. The ghost-aware index makes the GHOST the queryable target (no label) and WIRED engines (in stemToClass) the voting references; the shipped neighborVote(ghostStem, ghostIndex, stemToClass) then works DROP-IN. Leak-free by construction: only ghost->wired links stored (ghost->ghost has no usable label, wired->wired is the other arm; both-ghost-and-wired collision resolves to wired). Live-validated GRAPH-FREE (throwaway probe, deleted; numbers not in a committed runner per R12): 161 deployed unwired ghosts, 106 get >=1 wired neighbor = 65.8pct coverage, avg 3.36 wired nbrs (consistent with the 62.5pct ghost-edge-coverage diagnostic). 15/15 reference-value tests, 2-arm scrutiny PASS (P2s fixed inline: defensive lowercase of the ghost roster, shared-mode collision test, lowercase regression tests). REMAINING (fresh window): the graph-dependent 3-arm eval (direct-embed vs neighbor-vote vs confidence-hybrid@tau=0.70) on the live ghost holdout via nn-graph-eval buildHoldout + computeAUROC/computeMacroF1/computeBrier + selectiveDeployPoint @ GNN_DEFAULTS.minConf -- needs the 542MB graph in a subprocess."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.591Z
aliases: reference_gnn_ghost_neighbor_index_2026_06_21
---


**CONTEXT:** slot:india /loop 2026-06-21. The graph-free FIRST piece of the final edges-arc unit (the deploy-decision ghost-holdout head-to-head), decomposed out so it ships complete + validated without the 542MB graph. Solves the integration gap surfaced by the live buildHoldout pre-check earlier this session.

**THE GAP (why a new lib, not a reuse):** the deployed tier-5 task classifies UNWIRED ghosts. The shipped `buildNeighborIndex` (`measure-neighbor-vote-loo.mjs`) links engines only where BOTH endpoints are in `stemToClass` (its `link()` guard) -- but an unwired ghost is NOT in `stemToClass`, so every ghost->wired edge is dropped. So the neighbor-vote arm of the ghost head-to-head needs an ASYMMETRIC index.

**THE LIB:** `scripts/lib/ghost-neighbor-index.mjs` (pure, no I/O, no graph):
- `buildGhostNeighborIndex(groups, ghostStems, stemToClass, weightPerEdge=1)` -> `Map<ghostStem, Map<wiredStem, weight>>`. Direct edges: link iff exactly one endpoint is a ghost and the other wired (either order). Shared-intermediate: cross-link each GHOST touching an intermediate to each WIRED engine also touching it. Weights accumulate. Defensive lowercase of the ghost roster (edge stems + stemToClass keys are lowercased).
- `ghostNeighborCoverage(index, ghostStems)` -> `{total, covered, coverage, avgNeighbors}` -- the graph-free validation.

**LEAK DISCIPLINE (india soul):** leak-free by construction -- ONLY ghost->wired links are stored. A wired engine's dispatcher label is a real codebase fact; the unwired ghost has no label of its own to leak. ghost->ghost (no usable label) and wired->wired (the wired-set arm) are never stored. A stem that is somehow both ghost and wired resolves to WIRED (it has a real label -> not a ghost target). The shipped `neighborVote` reads only the neighbors' classes from `stemToClass`; the ghost's own label never enters.

**LIVE VALIDATION (graph-free, R12 caveat -- via a throwaway probe, deleted; NOT a committed runner):**
- wired refs 3208 | deployed unwired ghost stems 161 | ghosts with >=1 wired neighbor 106 = **65.8% coverage**, avg **3.36** wired neighbors.
- Consistent with the prior 62.5% ghost-edge-coverage diagnostic ([[reference_gnn_confidence_hybrid_2026_06_21]] context). The slight difference is method (this uses the embedding `n`-field lowercased + excludes wired; the earlier diag used the `ghost.unwired.<Class>` id regex).
- The specific numbers are reproducible by re-running the probe pattern but are not in a committed script (the committed graph-dependent eval, next window, will produce repo-reproducible numbers).

**REMAINING (fresh window -- the graph-dependent piece):** `U-GNN-GHOST-HOLDOUT-HEADTOHEAD` proper -- run the 3 classifiers on the LIVE ghost holdout:
1. `buildHoldout(graph)` (live pool healthy ~84, verified this session) -> held-out ghosts + labels.
2. direct-embed arm: `runAssessment({graph, directEmbed:true, directEmbedPath:ghost-node-embeddings.jsonl})` -> per-ghost samples.
3. neighbor-vote + confidence-hybrid@tau=0.70 arm: `buildGhostNeighborIndex` (THIS lib) + `neighborVote` per held-out ghost; hybrid falls back to the direct-embed per-ghost prediction when neighbor purity < 0.70.
4. Score all 3 sample-sets via `computeAUROC`/`computeMacroF1`/`computeBrier` + `selectiveDeployPoint` @ `GNN_DEFAULTS.minConf`.
- Needs the 542MB graph in a SUBPROCESS (`--max-old-space-size=8192`; not a context cost). CAVEAT: the hybrid mixes two confidence scales (cosine vs purity) -> AUROC-ranking caveat. TARGET: beat direct-embed's selective 27% coverage / 2-of-13 classes. multi-seed before promote; accuracy is NOT the deploy gate.

**Artifacts:** `scripts/lib/ghost-neighbor-index.mjs` + `.test.mjs` (15/15), commit `df6aa71bf7` on cad-fusion-live-ms0.

**ARC:** [[reference_gnn_edge_class_homophily_2026_06_21]] -> [[reference_gnn_neighbor_vote_loo_2026_06_21]] -> [[reference_gnn_classify_headtohead_2026_06_21]] -> [[reference_gnn_confidence_hybrid_2026_06_21]] -> THIS -> (next) graph-dependent ghost-holdout eval. Wiki [[gnn-edges-lever]].
