---
name: gnn-node-embedding-bridge-2026-05-23
description: "Bridge that translates graph node-IDs to 768-d wiki embeddings, closing the GNN tier-5 wiring-cascade promotion gate's `embeddingHitCount=0` blind spot."
aliases: reference_gnn_node_embedding_bridge_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.130Z
---


# Graph-node embedding bridge — [[reference_rag_upgrade_ms0_2026_05_22|RAG-UPGRADE-MS0]] / U-GNN-NODE-EMBED-BRIDGE (2026-05-23, slot golf)

Closes the missing mapping layer the empirical NN-GRAPH retrain (2026-05-22, `graphsage-checkpoint-768d-rag-upgrade.json`) exposed: trainer's `loadEmbeddingFeatures` loader is keyed by `n: <node.id>`, but the wiki tribal-embed-index is keyed by `wiki:<rel-path>` or `external:<...>`. Until something joined them, the pipeline fell back to 8-d projected hand-features (`featureSource:"projected"`) and AUROC stuck at 0.297 vs 0.78 promotion gate.

## What ships

- **`scripts/lib/graph-node-embedding-bridge.mjs`** — 8 exported functions. Pure decision functions: `wikiPathToIndexKey`, `l2Normalize`, `aggregateEmbeddings` (L2-norm centroid), `quantizeInt8` (loader-protocol-matching `q[i] = round(v*127)` clamp), `buildIndexLookup`, `nodeToEmbeddingRow`. Imperative shell: `buildEmbeddingSource()` (fail-soft, never throws — errors land in `result.errors[]`). CLI entry point.
- **`scripts/lib/graph-node-embedding-bridge.test.mjs`** — 49 node:test cases. Reference-value tests (3-4-5 triangle l2norm, orthogonal-vector centroid bisector, loader-fixture exact match `[1,0,-1]→[127,0,-127]`). 3 failure modes (missing graph file, malformed JSON, missing entries[]). 2 adversarial (NaN/Infinity components, zero-vector aggregation, oversize clamp). 3 variability configs (dim=3 micro, dim=8 default-input, dim=768 nomic-real).
- **`state/shared/nn-graph/node-embeddings-768d.jsonl`** — first build artifact: 562 nodes matched, 768-d, 0 errors. Cumulative-node-graph: 258,914 nodes; wiki-attached subset: 562. Was `embeddingHitCount=0` → now 562 (improvement is ∞× since `0`).

**Why:** each system-viz node already carries `knowledge.wikiEntries[].path` pointing at wiki files. The bridge translates each abs path → `wiki:<rel-path>` index key → looks up the 768-d embedding → L2-normalizes a centroid across all hits → int8-quantizes for the loader's `q[i]/127` dequant convention. Nodes with no wiki coverage are omitted (trainer treats them as miss + zero-vector — already proven path in `graphsage-train-pipeline.test.mjs:981` PARTIAL-HIT case).

**How to apply:** when the NN-GRAPH retrain cycle needs a fresh embedding source, run:
```
node scripts/lib/graph-node-embedding-bridge.mjs \
  --graph state/shared/system-viz/system-graph.json \
  --index state/shared/tribal-embed-index.json \
  --out   state/shared/nn-graph/node-embeddings-768d.jsonl --json
```
Then forward `--embedding-source state/shared/nn-graph/node-embeddings-768d.jsonl` into the next retrain. The lifecycle script ([[reference_nn_graph_ms2_u2_2026_05_17]]) is the right wiring point — see [[reference_trainer_export_regression_2026_05_23]] for a P0 blocker on the lifecycle side that must be cleared before the retrain runs end-to-end.

## Failure-mode coverage

| Class | Test |
|---|---|
| Missing graph file | FAIL-LOUD landed in `errors[]` |
| Malformed JSON in graph | FAIL-LOUD landed in `errors[]` |
| Index missing entries[] | FAIL-LOUD landed in `errors[]` |
| Missing required option | BOUNDARY (no read attempted) |
| Empty graph | VARIABILITY 2 → 0 matched + valid META + `dim:null` |
| NaN / Infinity vector | l2Normalize throws (R12 fail-loud) |
| Zero vector aggregation | returns null (degenerate, omitted) |
| Oversize input to quantize | clamp to [-127, 127] |
| Dim mismatch in index | counted as `indexSkipped` (tolerated — transient model-swap state) |
| Duplicate wiki paths within a node | de-duplicated (no double-weight) |

## Wired to

- `scripts/nn-graph-retrain-lifecycle.mjs` — emits the source before each retrain run (planned WAVE-2)
- `prism_dev:gnn_node_embeddings_build` — dispatcher action (planned WAVE-2)
- `knowledge/wiki/architecture/gnn-node-embedding-bridge.md` — wiki entry
- `state/shared/system-viz/` — ghost roost in `/system-viz` via `scripts/generate-gnn-bridge-features.mjs` (planned WAVE-2)
- CLAUDE.md §NN-GRAPH — pointer addition (planned WAVE-2)

## Forward gap

Coverage is 562/258,914 (~0.22%) — the unmatched 258K are dominated by the L12 filesystem-leaf ghost nodes (added by [[reference_system_viz_fs_coverage_ms0|SYSTEM-VIZ-FS-COVERAGE-MS0]] expansion) that have no wiki entries by design. The 562 reflect the REAL wiki-attached engine/dispatcher/skill/concept nodes — those are exactly the ones whose embeddings carry retrieval signal. As more wiki entries are written (or as Contextual Retrieval coverage expands via the in-flight Ollama re-embed batch), the matched count grows monotonically.

## Linked memory

- [[reference_trainer_export_regression_2026_05_23]] — pre-existing trainer-side import bug surfaced during round-trip verification (blocks end-to-end retrain, NOT bridge-side)
- [[reference_nn_graph_ms2_u2_2026_05_17]] — retrain lifecycle (the integration point)
- [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]] — original 768-d feature swap
- [[reference_rag_upgrade_ms0_2026_05_22]] — the parent milestone
