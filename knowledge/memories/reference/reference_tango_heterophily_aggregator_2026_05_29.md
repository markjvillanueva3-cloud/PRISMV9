---
name: reference-tango-heterophily-aggregator-2026-05-29
description: tango shipped HeterophilyAwareAggregator (H2GCN) — model-side lever for the deferred NN/GNN PSN leg
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.967Z
aliases: reference_tango_heterophily_aggregator_2026_05_29
---


Commit `985e96ec37` (slot:tango, 2026-05-29, U-ALGO-HETEROPHILY) — first build of the operator algorithm-generation /goal (priority #3/#4 nn/gnn).

**What:** `mcp-server/src/algorithms/HeterophilyAwareAggregator.ts` — pure deterministic H2GCN-style feature transform (Zhu et al. 2020). Two ideas: (1) ego/neighbour-embedding **separation** (node's own features never blended into the neighbour aggregation — output is a concat); (2) **exactly-k-hop** higher-order neighbourhoods (disjoint by shortest-path distance). Output per node: `z = [ego ‖ agg(N1) ‖ … ‖ agg(NH)]`, agg = mean|sum. Handles isolated nodes / self-loops / dup edges (surfaced, never silent). `Algorithm<I,O>` (validate/calculate/getMetadata). 24 unit tests (hand-verified reference values on a path graph) + 3 dispatcher round-trip tests.

**Why:** the documented model-side lever (CLAUDE.md NN-1, [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]]) for the deferred GNN deploy gate — link-pred AUROC ≈ 0.096 is a heterophily anti-correlation under the SystemViz wiring graph (engine↔dispatcher = different types). Feeding `z` instead of plain features into GraphSAGE recovers signal vanilla blending destroys. See [[feedback_india_stratify_before_train]] (the distribution lever) — this is the complementary feature-richness lever.

**Wired:** `prism_algorithm:graph_heterophily_aggregate` (GRAPH_ACTIONS enum + lazy-import case, matches the graph_pagerank pattern). Enum membership is test-asserted (closes the MS1 mock-bypass false-green gap).

**Synergy / bridges (PSN):** Engines+Algorithms leg = shipped; **PSN leg #10 (NN/GNN)** = the unblock target; **SystemViz** (sierra) = the heterophilous graph it operates on; **india ai-training** = consumes it in the GraphSAGE pipeline. **Cross-slot handoff:** deep wiring into india's live `scripts/lib/graphsage-train-pipeline.mjs` (.mjs) is india's follow-up — tango generated+wired+tested+documented the primitive (R8/R12 boundary).

**Continuation plan:** `state/shared/specs/ALGO-GEN-PRIORITY-PLAN-2026-05-29.md` — deduped, leverage-ranked next algorithms (P2 ml_* dispatcher group, P3 LowRankDecomposition for lora, P4 AttentionMechanism, P5 MCTS). Related: [[reference_tango_galaxy_buildout_2026_05_29]] · [[feedback_tango_dedup_audit_tooling]].
