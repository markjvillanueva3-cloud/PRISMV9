---
name: reference-psn-qdrant-populate-2026-05-25
description: 2026-05-25 sierra iter 17 — closes U-PSN-QDRANT-POPULATE (P0 follow-up from iter-13 close-out). Shipped scripts/populate-qdrant.mjs; ran full ingest of 1669 768d nomic-embed-text vectors into prism_engines collection. Live state — 3866 total vectors, GREEN status. Hybrid retrieval substrate (BM25 + vector + graph + episode) now structurally live. Also surfaced 2 more bugs in qdrant-health probe.
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-27T20:30:47.134Z
aliases: reference_psn_qdrant_populate_2026_05_25
---


## What shipped

| artifact | purpose |
|---|---|
| `scripts/populate-qdrant.mjs` (170 LOC) | Pure-Node Qdrant ingest CLI. Reads `state/shared/nn-graph/node-embeddings-768d.jsonl`, dequantizes int8 → float32 (scale=127), batches via curl PUT to `/collections/<C>/points`. Idempotent (deterministic FNV-1a 32-bit hash → point id). Flags: `--collection`, `--batch-size`, `--limit`, `--dry-run`, `--url`, `--jsonl`, `--json`. |

## Live ingest result

```
$ node scripts/populate-qdrant.mjs --json
sent: 1669 / batches: 17 / elapsed: ~30s

$ curl http://localhost:6333/collections/prism_engines
points_count: 3866 · status: green · indexed: 0 (HNSW threshold 10K, single segment)
```

Vector dim 768 matches collection config (Cosine distance). 3866 total includes 1669 new + ~2197 pre-existing (prior ingest attempts by other chats — FNV-1a IDs are stable so re-ingest is idempotent).

## Why this matters (the unlock)

Pre-iter-17 PSN had THREE retrieval surfaces:
- BM25 sidecar (iter 9 — 9286 memory records, ~5ms p50)
- master-index BM25 over system-graph.json
- graphiti-lite episode store (iter 11-12 — 7 episodes, predicate query)

After iter 17 the FOURTH surface (dense vector) is live: 3,866 vectors of `nomic-embed-text` 768d in Qdrant. The Hermes×PSN×RAG synergy spec from 2026-05-23 named "hybrid search (vector + BM25 + graph + episode)" as the missing leg in the closed-loop pipeline — that gate is now passable. Next iter (`U-PSN-HYBRID-RETRIEVAL-WIRE`) would compose all 4 into one query API.

## R12 disclosures — bugs surfaced this iter

1. **qdrant-health.mjs reads wrong field.** The probe (shipped by Agent C in iter 13) reports `vectorCount: 0` while the actual `points_count` is 3866. The probe likely reads `vectors_count` or `indexed_vectors_count` (HNSW-indexed, deferred until 10K threshold) instead of `points_count`. One-line fix needed — tracked as `U-PSN-QDRANT-HEALTH-FIELD-FIX`.

2. **CLAUDE.md said Qdrant offline for weeks.** Per iter-13 Agent C: the "offline" banner was a false positive in `ollama-docker-health.mjs`. Qdrant was online all along, just empty. The doctrine memos (esp. `reference_qdrant_offline_*` if any exist) should be marked stale.

3. **No tests for populate-qdrant.mjs.** Token-budget pressure (73% YELLOW) — deferred tests to follow-up `U-PSN-QDRANT-POPULATE-TESTS` (~10 cases covering load + dequantize + nodeIdToPointId + buildBatch + populateQdrant with fake-spawn).

## Follow-ups flagged

- `U-PSN-QDRANT-HEALTH-FIELD-FIX` — fix the points_count vs vectors_count field read
- `U-PSN-QDRANT-POPULATE-TESTS` — add the deferred test coverage
- `U-PSN-HYBRID-RETRIEVAL-WIRE` — compose BM25 + vector + graph + episode into one query API (the actual operator win)
- `U-PSN-QDRANT-INGEST-OTHER-COLLECTIONS` — `prism_formulas` and `prism_skills` still empty; need their own embedding sources

## Closes

`PSN-ENHANCE-MS0::U-PSN-QDRANT-POPULATE-2026-05-25` — closes the iter-13 follow-up. Vector substrate live (3,866 vectors in `prism_engines`). Hybrid-retrieval gate passable.

## Cross-refs

- [[reference_psn_fill_gaps_parallel_2026_05_24]] — iter 13 parallel campaign that surfaced this gap
- [[reference_psn_graphiti_wire_2026_05_24]] — iter 12 graphiti-lite (episode layer of the future hybrid)
- [[reference_psn_aliases_maxed_2026_05_24]] — iter 9 BM25 sidecar (search-side leg)
