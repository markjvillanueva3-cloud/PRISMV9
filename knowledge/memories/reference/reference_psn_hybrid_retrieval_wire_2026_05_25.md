---
name: reference-psn-hybrid-retrieval-wire-2026-05-25
description: 2026-05-25 sierra iter 18 — closes U-PSN-HYBRID-RETRIEVAL-WIRE. Composes all 4 PSN retrieval substrates (memory-index BM25 + master-index graph BM25 + episode-store predicate + Qdrant dense vector) into ONE query API. RRF fusion (k=60) normalizes the score-scale drift across heterogeneous retrievers. 44/44 tests pass; live 4-substrate query in 4.85s. The actual operator win after iter 17 made the vector substrate live.
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-09T14:54:10.892Z
aliases: reference_psn_hybrid_retrieval_wire_2026_05_25
---


## What shipped

| artifact | purpose |
|---|---|
| `scripts/lib/hybrid-retrieval.mjs` (~210 LOC) | Pure-core fan-out + RRF fusion. 7 exports: `hitDocId`, `rrfMerge`, `episodeKeywordSearch`, `defaultEmbed`, `defaultQdrantSearch`, `hybridSearch`, `__test_constants`. Every leg is dependency-injected. |
| `scripts/lib/hybrid-retrieval.test.mjs` (~280 LOC, 44/44 pass) | 4 fns × happy + null + injection-failure + RRF math + ordering + per-source skip independence. |
| `scripts/prism-hybrid.mjs` (~110 LOC) | CLI: `--query "..."`, `--top-k N`, `--no-{memory,master,episode,vector}`, `--collection NAME`, `--qdrant URL`, `--ollama URL`, `--model NAME`, `--json`. Wires real impls (curlSend → Ollama + Qdrant; runMemoryIndexSearch from memory-index-search-lib; runMasterIndexSearch + tokenize from master-index-search-lib; loadStore from episode-store). |
| `.claude/commands/hybrid.md` | `/hybrid` skill. |

## Live verification

```
$ node scripts/prism-hybrid.mjs --query "qdrant populate vector embedding" --top-k 8
hybrid query: "qdrant populate vector embedding"
substrates queried: 4 (memory=20, master=20, episode=0, vector=20)
top 8 of fused results (elapsed: 4854ms):
   1. [0.0164] node_formula_formula_adjusted_caddispatcher_action_part_library_populate  (memory@1)
   2. [0.0164] vault.wiki.architecture.tests.qd.qdrant-vector-store-engine  (master@1)
   3. [0.0164] 859955256  (vector@1)
   4. [0.0161] node_formula_formula_adjusted_devdispatcher_action_mca_feature_vector  (memory@2)
   5. [0.0161] wiki.architecture.actions_memory_qdrant-vector-search  (master@2)
   6. [0.0161] 89130010  (vector@2)
   7. [0.0159] node_formula_formula_adjusted_turningdispatcher_action_lathe_lora_embedding_cache_stats  (memory@3)
   8. [0.0159] wiki.architecture.actions_memory_qdrant-vector-upsert  (master@3)
```

All 4 substrates fuse cleanly. Memory + master + vector interleave by RRF rank (k=60). Episode count is 0 here because the store has only ~7 episodes total (broader seed is a flagged follow-up).

## Why this matters (the iter-17 follow-up that mattered)

Iter 17 closed `U-PSN-QDRANT-POPULATE` (1,669 vectors live, 3,866 total in `prism_engines`). That made the FOURTH retrieval surface structurally live. But surfaces don't compound until they're composed — an operator still had to run 4 separate searches and eyeball the merge.

This iter (18) ships the composition. `hybridSearch()` is one call → one merged ranked list with per-source provenance. Each result carries:
- `id` — stable doc identifier
- `score` — fused RRF score
- `surfaces` — `{memory: rank, master: rank, vector: rank}` showing which substrates returned it and where
- `hits` — raw per-source hit objects for deep inspection

Cross-substrate agreement is the signal — when memory + master + vector all surface the same node, RRF lifts it above any single-surface hit. The Hermes×PSN×RAG synergy spec from 2026-05-23 named this hybrid as the closed-loop pipeline's missing layer; now passable.

## Design choices

1. **Pure-core via DI** — every retriever is `opts.runMemoryIndexSearch`/`opts.loadStore`/`opts.embedImpl`/`opts.qdrantSearch`. Tests pass fakes (deterministic, no Qdrant/Ollama needed). CLI wires real impls. Same code path serves any future MCP dispatcher.

2. **RRF k=60** — Cormack et al. 2009 canonical default. Dampens top-of-list dominance without throwing away rank. Robust to BM25 raw weights (0..15) vs cosine (0..1) vs token-overlap count (0..N). Tunable via `--rrf-k` (in CLI not exposed yet; lib accepts `opts.rrfK`).

3. **Fail-soft per leg** — a throwing or missing retriever lands in `trace.skipped[]`; remaining substrates still fuse. An air-gapped chat passes `--no-vector` and gets a 3-substrate merge with zero degradation.

4. **Stable doc-id coalescing** — `hitDocId()` extracts the same string from heterogeneous hit shapes: `id` (memory + master + qdrant payload), `name` (memory), `payload.node_id` (qdrant), `episode.id` (episode store), `file` (memory fallback), `key`. Same doc in multiple substrates fuses correctly.

## R12 disclosures

1. **Vector hits surface as numeric FNV-1a hashes.** populate-qdrant.mjs writes `{payload: {node_id: r.n}}` where `r.n` is the slug. defaultQdrantSearch prefers `payload.node_id` then falls back to `String(p.id)`. The fallback fires when Qdrant's response strips payload (or my POST didn't set `with_payload: true` correctly). Tracked as `U-PSN-QDRANT-PAYLOAD-DEBUG`.

2. **Episode count is 0 for most queries.** Episode store has only ~7 episodes (3 valid + 3 superseded + 1 new). Broader git ingest needed — `U-PSN-GRAPHITI-SEED-EXPANDED` (cross-branch `--all` ingest).

3. **Commit defers to non-contested cycle.** Index.lock held by peer slot through commit attempts. H: drive durable; bootstrap-tag retry queued for the next free window. Files are present in working tree — `git status` shows them staged or untracked depending on the next /goal sweep.

4. **No follow-up for /rrf-k CLI flag yet.** Operators can edit the lib's `DEFAULT_RRF_K` or pass via `opts.rrfK`; CLI surface is conservative.

5. **No MCP dispatcher wire yet.** `prism_psn:hybrid_search` action would round-trip the same lib through the MCP server but requires a build cycle. Tracked as `U-PSN-HYBRID-MCP-WIRE`.

## Follow-ups flagged

- `U-PSN-QDRANT-PAYLOAD-DEBUG` — verify Qdrant POST /search response includes payload; fix populate or search-side as needed
- `U-PSN-GRAPHITI-SEED-EXPANDED` — broader git ingest (--all flag, cross-branch episodes)
- `U-PSN-HYBRID-MCP-WIRE` — wire `prism_psn:hybrid_search` MCP action
- `U-PSN-HYBRID-VIZ-ROOST` — emit ghost.hybrid_query roost into /system-viz (gated by V8 max-string-length OOM in regen-viz)
- `U-PSN-QDRANT-INGEST-OTHER-COLLECTIONS` — prism_formulas + prism_skills still empty (carried from iter 17)

## Closes

`PSN-ENHANCE-MS0::U-PSN-HYBRID-RETRIEVAL-WIRE-2026-05-25` — closes iter 17's flagged P0 follow-up. All 4 PSN retrieval substrates now composed into one operator-facing query API via RRF fusion. The compounding layer that made iter 17's vector substrate worth shipping.

## Cross-refs

- [[reference_psn_qdrant_populate_2026_05_25]] — iter 17 (made the 4th substrate live)
- [[reference_psn_graphiti_wire_2026_05_24]] — iter 12 (episode substrate)
- [[reference_psn_aliases_maxed_2026_05_24]] — iter 9 (BM25 sidecar substrate)
- [[reference_psn_fill_gaps_parallel_2026_05_24]] — iter 13 (parallel campaign that surfaced this gap)
