---
title: PSN Hybrid Retrieval Substrate
type: architecture
status: live
last_updated: 2026-05-25
slot: sierra
milestone: PSN-ENHANCE-MS0
related:
  - [[hybrid]]
  - [[graphiti]]
  - [[qdrant-revive]]
  - [[observability]]
  - [[feedback_psn_definition]]
---

# PSN Hybrid Retrieval Substrate

One query → all four PSN retrieval surfaces → RRF (k=60) fusion → ranked list with per-source provenance.

## The four substrates

| substrate | leg | source | retriever |
|---|---|---|---|
| memory | #4 Memories | `H:/prism/knowledge/memories/<ns>/*.md` (~9,328 files) | `memory-index-search-lib.mjs` BM25 |
| master | #6 System Viz | `state/shared/system-viz/system-graph.json` (~547 MB) | `master-index-search-lib.mjs` BM25 |
| episode | #12 Graphiti (de-facto) | `state/shared/episodes.jsonl` (~2,004 episodes) | `episode-store.mjs` predicate keyword |
| vector | #10 NN/GNN (de-facto) | Qdrant `prism_engines` (3,866 vectors, `nomic-embed-text` 768d) | curl `/points/search` cosine |

## Entry points

| surface | path | what |
|---|---|---|
| skill | `/hybrid` | operator-facing query verb |
| CLI | `scripts/prism-hybrid.mjs --query "..."` | direct invocation |
| lib | `scripts/lib/hybrid-retrieval.mjs::hybridSearch(query, opts)` | pure-core, DI-driven |
| viz | `ghost.hybrid_retrieval` L8 roost in `/system-viz` | 4-substrate health overview |

## Fusion math

Reciprocal Rank Fusion — Cormack et al. 2009. For each substrate's ranked list, each doc at rank `r` contributes `weight / (k + r)` to the fused score (k=60 default, dampens top-of-list dominance).

```
fused(doc) = Σ_substrate  w_substrate / (60 + rank_substrate(doc))
```

Docs that appear in multiple substrates rise; docs appearing in only one stay below them at the same per-substrate rank. Score-scale drift across BM25 raw weights vs cosine vs token-overlap counts gets normalized to a unitless rank-based scalar.

## Per-result provenance

Every fused result carries:

```
{
  id: "engine:EmbeddingGuardEngine",   // stable doc identifier
  score: 0.0164,                        // fused RRF score
  surfaces: { memory: 1, vector: 1 },   // which substrates returned it + rank
  hits: {                               // raw per-source hit objects
    memory: { name, file, score, ... },
    vector: { id, score, payload }
  }
}
```

`surfaces` is the trust signal — a doc found by 3 substrates is more reliable than one found by 1.

## Build chain — how it was wired (sierra slot, 2026-05-25)

| iter | unit | layer |
|---|---|---|
| 17 | `U-PSN-QDRANT-POPULATE` | data — 1,669 new vectors into `prism_engines` (3,866 total, status GREEN) |
| 18 | `U-PSN-HYBRID-RETRIEVAL-WIRE` | runtime — `hybridSearch()` lib + `prism-hybrid` CLI + `/hybrid` skill (44/44 tests) |
| 19 | `U-PSN-QDRANT-PAYLOAD-DEBUG` | quality — `pickQdrantPayloadId()` resolves canonical `engine:Foo` ids across the two ingest-pass payload shapes (50/50 tests) |
| 21 | `U-PSN-HYBRID-VIZ-ROOST` | observability — `generate-hybrid-retrieval-features.mjs` emits `ghost.hybrid_retrieval` L8 roost + 4 substrate child nodes with live counts |
| 22 | `U-PSN-HYBRID-VIZ-ROOST-WIRE` | render-pipeline — `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` loader/versions/merger splices (33 LOC) |
| 23 | `U-PSN-GRAPHITI-SEED-EXPANDED` | data — `--all` + `--no-files` + RECSEP parser; episode store 7 → 2,004 (286x) |
| 24 | `U-PSN-GRAPHITI-SEED-TESTS` | quality — 17/17 seed tests, 2 silent regressions caught + fixed |

Each iter strictly compounded the prior: data → runtime → quality → observability → render-pipeline → data-densification → tests.

## Knobs

| flag | default | purpose |
|---|---|---|
| `--top-k N` | 10 | final result count |
| `--per-source N` | 20 | cap per substrate before fusion |
| `--no-memory` / `--no-master` / `--no-episode` / `--no-vector` | all on | disable a leg cleanly |
| `--collection NAME` | `prism_engines` | target Qdrant collection |
| `--qdrant URL` | `http://localhost:6333` | Qdrant base URL |
| `--ollama URL` | `http://localhost:11434/api/embeddings` | Ollama embeddings endpoint |
| `--model NAME` | `nomic-embed-text` | embedding model (must match collection vector dim) |

Lib-level (not CLI-exposed):
- `opts.rrfK` — RRF k constant (default 60)
- `opts.weights` — per-substrate weight overrides (default 1.0 each)
- `opts.tokenize` — override tokenizer for episode-store keyword scan

## Live example

```
$ node scripts/prism-hybrid.mjs --query "qdrant populate vector embedding" --top-k 6
substrates queried: 4 (memory=20, master=20, episode=19, vector=20)
top 6 of fused results (elapsed: 2865ms):
   1. [0.0164] node_formula_..._part_library_populate              (memory@1)
   2. [0.0164] vault.wiki...qdrant-vector-store-engine             (master@1)
   3. [0.0164] engine:EmbeddingGuardEngine                         (vector@1)
   4. [0.0161] feedback_obsidian_low_token_2nd_brain_protocol      (memory@2)
   5. [0.0161] wiki...actions_memory_qdrant-vector-search          (master@2)
   6. [0.0161] ep-mpkr52g9-ec619577                                (episode@2)
```

Four substrates contributing to the top-6; semantic and lexical signals interleave.

## Known limitations

- **`prism_formulas` + `prism_skills` Qdrant collections are still empty.** Vector substrate currently only covers engines. Fix: `U-PSN-QDRANT-INGEST-OTHER-COLLECTIONS`.
- **2,000 new episodes (iter 23) lack file-entity extraction.** Corrupt tree object `e36809bbd2` in `cad-fusion-live-ms0` history blocks `git log --name-only`. Fix: `U-PSN-GIT-TREE-REPAIR`.
- **No `prism_psn:hybrid_search` MCP dispatcher yet.** External agents (Cline/Continue.dev/Aider/etc.) can't invoke hybrid search via MCP. Fix: `U-PSN-HYBRID-MCP-WIRE` (needs mcp-server build).
- **`ghost.hybrid_retrieval` viz roost doesn't render until regen-viz V8 OOM fix.** Augmentation file lands on disk; merged-graph materialization is gated by the pre-existing 547MB graph OOM ([[regen-viz-string-length-2026-05-23]]).

## Cross-references

- [[hybrid]] — skill body
- [[graphiti]] — episode-store skill
- [[qdrant-revive]] — Qdrant health probe + revive
- [[observability]] — companion 13th-leg observability surface (iter 13)
- [[feedback_psn_definition]] — canonical PSN leg taxonomy
- [[regen-viz-string-length-2026-05-23]] — the OOM gating final visual render
- Source memos: [[reference_psn_hybrid_retrieval_wire_2026_05_25]] · [[reference_psn_qdrant_payload_debug_2026_05_25]] · [[reference_psn_hybrid_viz_roost_2026_05_25]] · [[reference_psn_hybrid_viz_roost_wire_2026_05_25]] · [[reference_psn_graphiti_seed_expanded_2026_05_25]] · [[reference_psn_graphiti_seed_tests_2026_05_25]]
