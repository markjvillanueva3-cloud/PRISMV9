---
title: ALGO-SYNERGY ML batch — new prism_algorithm ml_* primitives (slot:tango)
date: 2026-05-29
agent: claude-2c3adfc7
slot: tango
milestone: ALGO-SYNERGY
tags: [algorithms, ml, deep-learning, lora, gnn, prism_algorithm, dispatcher, discovery]
boost_keywords: [heterophily, attention, low rank, svd, viterbi, dynamic time warping, pca, ml_ actions, algorithm generation, prism_algorithm]
links:
  - "[[reference_tango_heterophily_aggregator_2026_05_29]]"
  - "[[reference_tango_attention_algorithm_2026_05_29]]"
  - "[[reference_tango_lowrank_svd_2026_05_29]]"
  - "[[reference_tango_ml_dispatcher_wire_2026_05_29]]"
  - "[[architecture/duplication-guard-discipline]]"
---

# ALGO-SYNERGY ML batch — new `prism_algorithm` `ml_*` primitives

Operator algorithm-generation `/goal` (slot:tango, 2026-05-29): *"generate algorithms to improve efficiency, productivity and feature enhancements in priority order: ai, lora, nn, gnn, deep learning, deep reasoning, … | goal clear: wired, tested, validated and synergized to all compatible galaxies, PSN and SystemViz."*

This batch added **6 new pure algorithms** + **wired 8 built-but-unwired ML algorithms**, growing the `prism_algorithm` `ml_*` action group **2 → 15**. Every item is a pure `Algorithm<I,O>` (`validate`/`calculate`/`getMetadata`) in `mcp-server/src/algorithms/`, dispatcher-wired with a validate-then-calculate gate (`err()` not crash), and tested with hand-verified reference values (+ ≥3 failure + ≥2 adversarial each). The dispatcher round-trip tests assert `z.enum(ACTIONS)` membership — closing the MS1 mock-bypass false-green class.

## New algorithms (this batch)

| Algorithm | `prism_algorithm` action | Domain | Commit | Reference |
|-----------|--------------------------|--------|--------|-----------|
| `HeterophilyAwareAggregator` (H2GCN ego/neighbour-sep + k-hop) | `graph_heterophily_aggregate` | nn / gnn | `985e96ec37` | Zhu et al. 2020 |
| `ScaledDotProductAttention` (Transformer attention) | `ml_attention` | deep-learning | `2b0993e197` | Vaswani et al. 2017 |
| `LowRankApproximation` (truncated SVD, power iteration + deflation) | `ml_lowrank` | lora | `d17bae3ba4` | Eckart–Young 1936 |
| `ViterbiDecoder` (HMM MAP, log-space DP) | `ml_viterbi` | deep-reasoning | `df9ddeafa1` | Viterbi 1967 |
| `DynamicTimeWarping` (elastic alignment) | `ml_dtw` | cross-domain | `5bc14a98fd` | Sakoe–Chiba 1978 |
| `PrincipalComponentAnalysis` (composes `ml_lowrank`) | `ml_pca` | ml dim-reduction | (this batch) | Pearson 1901 |
| `KNearestNeighbors` (cosine/euclidean/manhattan; search/classify/regress) | `ml_knn` | rag retrieval | (this batch) | Cover–Hart 1967 |
| `SavitzkyGolayFilter` (polynomial smoothing + derivatives) | `signal_savgol` | signal | (this batch) | Savitzky–Golay 1964 |
| `GaussianMixtureModel` (EM soft clustering, diagonal cov, log-sum-exp) | `ml_gmm` | ml clustering | `e6407e7f45` | Dempster–Laird–Rubin 1977 |
| `LayerNormalization` (per-sample feature norm + affine; pairs w/ `ml_attention`) | `ml_layernorm` | deep-learning | `99b7b069b5` | Ba–Kiros–Hinton 2016 |
| `BeamSearchDecoder` (n-best top-K decoding; companion to `ml_viterbi`) | `ml_beam_search` | deep-reasoning | `28f9efdcb7` | Lowerre 1976 |
| `MultiHeadAttention` (composes `ml_attention` per head + Wo) | `ml_multihead_attention` | deep-learning | `57cb18ffc3` | Vaswani et al. 2017 |
| `TransformerBlock` (composes MHA + `ml_layernorm` + FFN + residual) | `ml_transformer_block` | deep-learning | `b384ed9ac0` | Vaswani 2017 / Xiong 2020 |
| `RANSACHyperplane` (robust line/plane fit + Jacobi-TLS refit) | `spatial_ransac_fit` | spatial / robust-estimation | `a5bc7ffaeb` | Fischler & Bolles 1981 |

_Batch total: **14 new primitives**; `prism_algorithm` ML group at **21 actions** + SPATIAL group at **3**._

**Transformer composition chain (the combinations doctrine, [[feedback_find_all_wiring_endpoints_and_combinations]]):**
`ml_attention` (single-head operator) → `ml_multihead_attention` (h heads) + `ml_layernorm` → `ml_transformer_block` (MHA+LN+FFN+residual). Each tier composes the one below it — no math re-derived. india owns the stateful inference-engine layer that stacks N blocks with learned weights; these are the substrate.

_(The 2026-05-29 cron was stopped at the algorithm-primitive diminishing-returns inflection; the transformer-stack additions were built attended under the explicit `/checkin-tango continue building high roi algos and engines` directive — see `reference_tango_algo_synergy_batch_2026_05_29`.)_

## Wired existing ML algorithms (coverage)

`ml_neural_infer`, `ml_regression`, `ml_decision_tree`, `ml_clustering`, `ml_ensemble_predict` (`8c750a2aca`); `ml_dbscan`, `ml_kmedoids` (`06de87c4cf`); `ml_activation` (`18003907ba`). These were `Algorithm<I,O>` / static-method classes on disk but unreachable via any dispatcher — 8 algorithm-orphans rescued via the WIRE verdict ([[lessons/orphan-rescue-class]]).

## Cross-galaxy + PSN synergy

- **india (ai-training)** — `graph_heterophily_aggregate` is the documented model-side lever for the deferred NN/GNN PSN leg #10 (link-pred AUROC 0.096 heterophily); feeds richer features into the GraphSAGE pipeline. `ml_lowrank` is the math core under india's ~95 LoRA engines. `ml_attention`/`ml_activation`/`ml_pca` are DL building blocks india composes.
- **sierra (system-viz)** — the heterophily aggregator operates on the SystemViz wiring graph (the heterophilous engine↔dispatcher topology).
- **oscar (sfc) / quoting / monitoring** — `ml_dtw` enables time-series similarity (machine-run / tool-wear signature matching, quoted-vs-actual cycle-time alignment); `ml_viterbi` decodes operation-phase / alarm-state sequences from telemetry.
- **PSN legs covered:** Engines/Algorithms (#8), PRISM AI (#11, via `prism_algorithm`), Obsidian/Memories (#1,#4 — `reference_tango_*` memories), Wiki (#3 — this entry).

### Fleet rollout — genuine-consumer set complete (papa 2026-06-09)

The original ALGO-SYNERGY ship wired the awareness block into india + oscar + sierra. The 2026-06-09 GALAXY-CONTEXT-FILL pass (commits `77e1546048`, `5265e09ae0`, `c5c4a66a9d`) extended per-galaxy `MEMORY.md` "Available algorithm primitives" blocks to **every galaxy that genuinely consumes these 11 ML/signal/vision primitives** — mapped per [[feedback_wire_algos_into_galaxies]] by what the primitive is *for*, NOT blanket-applied:

| Consumer class | Primitives | Galaxies (block present) |
|---|---|---|
| DL/NN/LoRA | attention/lowrank/pca/heterophily | india (pre-existing) |
| graph/topology | heterophily-aggregate | sierra (pre-existing) |
| signal / live-telemetry | savgol/dtw/viterbi/gmm/knn | oscar (pre-existing) · mill · lathe · wedm · cam · shop-floor · post-processor (narrow: dtw/knn only — text terminal) |
| vision / robust-fit | ransac/knn/gmm | cad (pre-existing) · blueprint-vision |
| SPC / quality | (pre-existing) | quality |
| estimation / retrieval | knn/gmm/dtw | quoting (narrow) |

**13/34 galaxies carry the block — this IS the complete genuine-consumer set.** The other 21 (business/CRM, academy, frontend-app, hermes-zulu, fleet-hygiene, discovery, database-expansion, etc.) do NOT consume these 11 primitives; appending a block to them would be R12 over-reach. A future *optimization/numerical* algo batch (LP/assignment/scheduling) would add **business** (capacity-planning) per the doctrine's line-21 mapping — none exists today.

## Discipline notes

- **MCP-down resilience:** built + tested entirely via filesystem + `npx vitest` while the port-3100 MCP server was down (see `reference_tango_mcp_down_fallbacks_2026_05_29`).
- **Composition over duplication:** `ml_pca` reuses `ml_lowrank` rather than re-deriving an eigensolver — tango's anti-duplication discipline ([[architecture/duplication-guard-discipline]]).
- **WIRE-EXEMPT note:** MonteCarloTreeSearch (deep-reasoning) was *not* built here — it takes `expand`/`simulate` callbacks that cannot cross the JSON dispatcher boundary; a callback-input algorithm fails the goal's "wired" bar, so `ViterbiDecoder` + `DynamicTimeWarping` were chosen as the wireable deep-reasoning/sequence primitives instead.

Plan + remaining queue: `state/shared/specs/ALGO-GEN-PRIORITY-PLAN-2026-05-29.md`.
