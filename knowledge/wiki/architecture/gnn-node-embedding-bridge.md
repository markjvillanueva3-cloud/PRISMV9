---
title: GNN node-embedding bridge
type: architecture
parent: nn-graph-ms2
shipped: 2026-05-23
slot: golf
unit: RAG-UPGRADE-MS0/U-GNN-NODE-EMBED-BRIDGE
status: shipped
---

# GNN node-embedding bridge — closes the `embeddingHitCount=0` mapping gap

## Problem

The NN-GRAPH tier-5 wiring-inference cascade ([[nn-graph-ms0]] + [[nn-graph-ms1]] + [[nn-graph-ms2]]) is a GraphSAGE link-prediction trainer. Its U-NNG-768D-FEATURES swap ([[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]]) added an `embeddingSource` parameter so the trainer could attach pre-computed 768-d wiki embeddings instead of 8-d projected hand-features. The loader (`loadEmbeddingFeatures` in `scripts/lib/graphsage-train-pipeline.mjs`) reads a JSONL keyed by `n: <node.id>` and returns a feature map for the trainer.

The first empirical retrain attempt against the live wiki embeddings (RAG-UPGRADE-MS0 / U-RAG-4, 2026-05-22, slot juliett — checkpoint `state/shared/nn-graph/graphsage-checkpoint-768d-rag-upgrade.json`) measured `embeddingHitCount=0`. Cause: the wiki tribal-embed-index is keyed by `wiki:<rel-path>` (or `external:<abs>` for backend-dev memos) — never by graph node-ID. The trainer found zero matches, fell back to projected, and the promotion AUROC sat at 0.297 (vs gate ≥0.78). The RAG-UPGRADE spec § 102 flagged the missing mapping layer as a follow-up unit, out of MS0 scope.

This unit is that follow-up.

## Design

Each system-viz node already carries the bridge data inside itself:

```json
{
  "id": "p.operator",
  "knowledge": {
    "wikiEntries": [
      { "title": "...", "path": "H:/prism/knowledge/wiki/architecture/actions/guard/operator-audit-record.md", "tags": [...] },
      ...
    ]
  }
}
```

The bridge:

1. **Walks** `graph.nodes[*]`
2. **Translates** each `knowledge.wikiEntries[].path` via `wikiPathToIndexKey(p)` — strips the repo prefix at the `/knowledge/wiki/` anchor and prepends `wiki:`. Normalizes Windows backslashes.
3. **Looks up** the index entry for each key in a precomputed `Map<id, embedding>`
4. **Aggregates** multiple hits via L2-norm centroid (`L2 → mean → L2` keeps the result on the unit sphere so cosine downstream matches single-entry nodes)
5. **Quantizes** the unit centroid to int8 via `q[i] = round(v[i] * 127)` clamped to [-127, 127] — matches the loader's `q[i]/127` dequant convention exactly (loader test fixture line 776: `q:[127,0,-127]` ↔ `[1,0,-1]`)
6. **Emits** one JSONL row per matched node: `{"n":"<node.id>","q":<int8[]>}`. First line is META: `{"__meta":true,"model":"nomic-embed-text:latest","dim":768,"count":N,"source":"graph-node-bridge"}`

## Modules

| File | Role |
|---|---|
| `scripts/lib/graph-node-embedding-bridge.mjs` | 8 exports — `wikiPathToIndexKey`, `l2Normalize`, `aggregateEmbeddings`, `quantizeInt8`, `buildIndexLookup`, `nodeToEmbeddingRow`, `buildEmbeddingSource`, `parseArgs`. Pure decision functions; fail-soft imperative shell. CLI entry point. |
| `scripts/lib/graph-node-embedding-bridge.test.mjs` | 49 node:test cases — 8 suites covering happy/edge/failure/adversarial/variability per comprehensive-build-enforce floor. |
| `state/shared/nn-graph/node-embeddings-768d.jsonl` | First build artifact: 562 nodes matched, 768-d, 0 errors. The trainer's `--embedding-source` should point here. |

## Quantization protocol

```
forward:   q[i] = clamp(round(v[i] * 127), -127, 127)
reverse:   v[i] ≈ q[i] / 127                              (loader)
error:     ≤ 1/127 ≈ 0.008 per dim (below cosine-sim noise floor at 768-d)
file size: 768 dims × N nodes × 1 byte int + JSON framing
```

Int8 over float32 saves ~4× disk and eliminates a memory-mapping hazard the trainer doesn't have today. The loader (already shipped) does the cheap divide on read.

## Aggregation invariants (R9 — pinned in tests)

| Input | Output |
|---|---|
| Single vector `[3, 4]` | L2-normalize → `[0.6, 0.8]` (3-4-5 reference) |
| Two orthogonal vectors `[1,0]` + `[0,1]` | Bisector `[1/√2, 1/√2]` |
| Two anti-parallel vectors `[1,0]` + `[-1,0]` | `null` (mean = zero vector — degenerate, omitted) |
| Mix of zero + non-zero vectors | Skip the zeros, average the rest |
| Dim-mismatch inputs | Throw `RangeError` (corrupt index — fail loud per R12) |
| NaN / Infinity component | Throw `RangeError` (refuse to propagate into the trainer) |

## Live first-run

```
$ node scripts/lib/graph-node-embedding-bridge.mjs \
    --graph state/shared/system-viz/system-graph.json \
    --index state/shared/tribal-embed-index.json \
    --out   state/shared/nn-graph/node-embeddings-768d.jsonl --json
```

```json
{
  "ok": true,
  "written": 1,
  "outPath": "state/shared/nn-graph/node-embeddings-768d.jsonl",
  "nodeCount": 258914,
  "matched": 562,
  "unmatched": 258352,
  "dim": 768,
  "indexSkipped": 0,
  "errors": [],
  "schemaVersion": 1
}
```

The 562 matched are the **real wiki-attached engine/dispatcher/skill/concept nodes**. The 258K unmatched are dominated by the L12 filesystem-leaf ghost nodes that have no wiki entries by design — they correctly fall through to the trainer's zero-vector + miss-count path (PARTIAL-HIT case, loader test line 981).

## Wired

- **`prism_dev` dispatcher** — action `gnn_node_embeddings_build` (planned WAVE-2)
- **`scripts/nn-graph-retrain-lifecycle.mjs`** — pre-retrain stage emits a fresh JSONL (planned WAVE-2)
- **`/system-viz` ghost roost** — via `scripts/generate-gnn-bridge-features.mjs` (planned WAVE-2)
- **Obsidian memory** — [[reference_gnn_node_embedding_bridge_2026_05_23]]
- **CLAUDE.md §NN-GRAPH** — pointer addition (planned WAVE-2)

## Blocker for end-to-end retrain

The trainer-side import in `graphsage-train-pipeline.mjs` references two functions absent from `graphsage-trainer.mjs` (`positiveTypeMarginal`, `sampleStratifiedNegativeEdges`). This is a pre-existing P0 regression — see [[reference_trainer_export_regression_2026_05_23]]. The bridge ships independently; the trainer fix is a separate follow-up unit (`U-NN-TRAINER-EXPORT-RESTORE`).

## See also

- [[nn-graph-ms2]] · [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]] (the 768d feature swap)
- [[reference_rag_upgrade_ms0_2026_05_22]] (parent milestone — § 102 flagged this gap)
- [[reference_trainer_export_regression_2026_05_23]] (downstream blocker)
