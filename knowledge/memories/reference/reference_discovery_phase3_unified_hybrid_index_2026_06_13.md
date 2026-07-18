---
name: reference_discovery_phase3_unified_hybrid_index_2026_06_13
description: "Discovery (tango) Phase-3 deeper anchor — Hermes-planned (tempered). A unified retrieval index that fuses BM25 (lexical) + dense embeddings (semantic) + MinHash/LSH signatures (near-dup) in ONE structure: hybrid search (RRF fusion) AND dedup in a single pass over the master-index/asset corpus; adaptive LSH banding (tune bands per embedding cluster for recall) rather than static. Upgrades DuplicationGuard from exact-name to SEMANTIC dup detection + master-index recall beyond name-heuristic. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.553Z
aliases: reference_discovery_phase3_unified_hybrid_index_2026_06_13
---


**Context:** Phase-3 discovery anchor — **Hermes-planned**, tempered (R12: Hermes' "billions of chunks /
sub-millisecond / neural-optimized forest" is hype for PRISM's ~300K-node scale; the honest increment is a
real unified hybrid+dedup index). Deepens [[reference_discovery_retrieval_dedup_2026_06_13]] (Phase-2). Spec §tango.

## The realistic deeper increment
- **Unified hybrid + dedup index:** today master-index search + DuplicationGuard are separate. Build ONE index
  carrying per-node {BM25 postings, dense embedding (nomic-embed-text), MinHash signature} so a single query does
  **hybrid retrieval** (RRF / weighted fusion of BM25 + dense) AND **near-dup detection** (MinHash/LSH Jaccard)
  in one pass. Scale = ~300K master-graph nodes (NOT "billions" — honest).
- **Semantic DuplicationGuard:** today it THROWS on exact-name dup; add MinHash/LSH over shingled name+desc+AST
  n-grams so it catches SEMANTIC duplicates (two engines computing the same thing under different names — the
  higher-value class the name-heuristic misses). Pairs with romeo's shape-reachability (find orphans) + the
  CodeBERT/GraphCodeBERT behavioral-embedding idea (Phase-2) for functional similarity.
- **Adaptive LSH banding:** tune LSH bands/rows per embedding-cluster density (denser clusters need finer bands)
  for better recall — a measured improvement over static banding, not a "neural forest".

## Wiring / consumers (R15)
- GALAXY: `engines/discovery/` (tango). CONSUMERS: master-index (search-first), DuplicationGuard (pre-create
  gate, THROWS), romeo (wiring), every slot (search before grep). DOMAIN: fleet-wide search/dedup substrate.
- AUTO-INVOCATION: DuplicationGuard pre-create hook; master-index query.

## Next (Phase-4, per Hermes — tango's build)
Build the unified index (BM25+dense+MinHash) + the semantic-dup layer on DuplicationGuard; measure dup-recall
vs the exact-name baseline + hybrid retrieval nDCG vs current. Pairs with romeo + india (embeddings).

Sources: Robertson & Zaragoza (BM25); Broder (MinHash) + Indyk-Motwani (LSH); reciprocal-rank-fusion (Cormack);
Malkov-Yashunin (HNSW); CodeBERT/GraphCodeBERT. Planner: Hermes (xAI Grok, :8645), tempered per R12.
