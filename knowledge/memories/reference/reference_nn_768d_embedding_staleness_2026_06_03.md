---
name: reference_nn_768d_embedding_staleness_2026_06_03
description: 768d GNN feature coverage is 7/62 (11%) NOT from staleness (regen disproved) but because the node-embedding bridge requires a WIKI-BASENAME match and most unwired engines have no wiki page
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.663Z
aliases: reference_nn_768d_embedding_staleness_2026_06_03
---


# 768d GNN feature coverage root cause: wiki-basename gap, NOT staleness (slot:india, 2026-06-03)

Diagnostic for `U-NN-FEATURE-SEPARABILITY` (the real fix for the DEGENERATE constant-vote collapse,
[[reference_nn_graded_schema_read_fix_2026_06_03]]). **Supersedes my earlier "staleness" hypothesis
in this file — DISPROVEN by re-running the bridge.**

## Finding (decisive, regen-tested)

The GNN input features `state/shared/nn-graph/node-embeddings-768d.jsonl` cover only **7 of the 62
current reference ghosts (~11%)**. I first guessed temporal staleness (file was Jun-1) and re-ran the
bridge against TODAY's graph + index:

```
node scripts/lib/graph-node-embedding-bridge.mjs --graph <current 676MB graph> \
  --index state/shared/tribal-embed-index.json --out node-embeddings-768d.jsonl --json
→ nodeCount 302447 · matched 3788 · unmatched 298659 · basenameIndexSize 2579 · basenameMatched 907
→ ghost.unwired coverage AFTER regen: STILL 7/62 (11%) — identical.
```
(Regen reverted afterward — it added no value; coverage is structural.)

**Real root cause:** `graph-node-embedding-bridge.mjs` derives a node's 768d feature by matching the
node BASENAME to an entry in the wiki/tribal embedding index (`buildEngineWikiBasenameIndex`,
`candidateBasenames`, `nodeToEmbeddingRow`). An unwired engine with **no wiki page** (or no matching
basename) gets **no embedding → no feature vector**. The current reference ghosts
(LathePartFamilyPlanningEngine, FusionMaterialPhysicsBridge, BarFeedPitchOptimizerEngine, LatheDeep*,
LatheLoRA*…) are mostly engines that lack wiki coverage. So the GNN can't represent ~89% of its own
reference pool → falls back to defaults → collapses to the class prior (prism_turning) → DEGENERATE.
This is a **feature-coverage** bug (the bridge's wiki-basename dependency), not staleness and not
"do the features separate".

## DEFINITIVE CONCLUSION (2026-06-03 experiment) — the name-fallback DOES NOT WORK

I tested the proposed fix directly: embedded all 62 holdout ghost ENGINE NAMES via Ollama
`nomic-embed-text` (camelCase-split) → full 62/62 coverage → ran the separability audit:
```
majority baseline 0.5 (prism_turning 31/62)
LOO nearest-centroid accuracy 0.339  ← WORSE than baseline
intra cosine 0.9936 · inter cosine 0.992 · GAP 0.0017 (≈ zero)
VERDICT: NAME-FEATURES NON-SEPARABLE
```
(The earlier 7-point "separable, LOO 1.0" read was a small-sample artifact — disregard it.)

**Text embeddings — wiki OR name — carry essentially ZERO dispatcher signal.** Semantically
near-identical names wire to DIFFERENT dispatchers (`LatheDeepLearningEngine`→prism_turning vs
`LatheCAMIntelligenceEngine`→prism_cam); nomic-embed-text collapses them to ~0.99 cosine. This is why
AUROC is 0.5 across 8-dim, 768d, AND name-embeddings — not a coverage bug, not a vote bug.

**Root reason (cold-start):** the dispatcher signal is STRUCTURAL (import/call edges, code symbols),
and a node is a `ghost.unwired-engine` precisely BECAUSE it lacks those edges. The very feature that
would classify it is the missing thing that makes it a ghost. So tier-5 GNN wiring-inference for
UNKNOWN ghosts is fundamentally hard with available features.

**Honest recommendation (supersedes "add a fallback"):**
1. Do NOT build the name/wiki embedding fallback or retrain on text features — proven non-separable.
2. The realistic lever is STRUCTURAL node features (file-path tokens, partial import edges, sibling
   directory) — but ghosts are edge-sparse, so expect limited gain.
3. Accept tier-5 stays below-gate; the cascade correctly defers to tiers 1-4 (keyword/sibling), which
   use the name + file-proximity HEURISTICS directly — strictly more informative than a text embedding
   for this task. The degeneracy guard (c354432cf6) keeps tier-5 honestly dormant so no one wastes a
   retrain cycle. This thread is effectively CLOSED with a definitive negative result.
Related: [[reference_gnn_node_embedding_bridge_2026_05_23]] · [[reference_nn_graded_schema_read_fix_2026_06_03]].
