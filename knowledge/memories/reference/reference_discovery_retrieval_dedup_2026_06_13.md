---
name: reference_discovery_retrieval_dedup_2026_06_13
description: "Discovery (tango) Phase-2 deep-research anchor — code search + embedding retrieval (CodeBERT/GraphCodeBERT, dense+BM25 hybrid), near-duplicate detection (MinHash/SimHash/LSH) beyond name-heuristic, knowledge-graph construction + entity resolution, capability taxonomy/ontology, program analysis (def-use, slicing). The CS upgrade path for DuplicationGuard + master-index + dormant-engine surfacing. Written 2026-06-13 slot:zulu Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.553Z
aliases: reference_discovery_retrieval_dedup_2026_06_13
---


**Context:** Phase-2 anchor for the discovery galaxy (tango — algorithm/engine/pipeline discovery + anti-
duplication + dormant activation), per the 2026-06-13 knowledge-max `/goal`. Spec:
`FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §tango.

## Discovery / search (the master-index substrate)
- **Hybrid retrieval:** sparse **BM25** (lexical) + **dense** embeddings (semantic) fused (RRF / weighted) beats
  either alone — PRISM's master-index + tribal-rerank should run hybrid (dense via nomic-embed-text, BM25 over
  names/docs). Rerank top-k with a cross-encoder for precision.
- **Code-aware embeddings:** CodeBERT, GraphCodeBERT (uses data-flow), UniXcoder — embed code by *behavior* not
  just tokens → find functionally-similar engines even when names differ (the gap name-heuristic misses).

## Anti-duplication (DuplicationGuard's CS upgrade)
- **Near-duplicate detection beyond exact-name:** **MinHash + LSH** (Jaccard similarity of shingled tokens/AST
  n-grams) and **SimHash** (Hamming distance of feature hashes) → scalable "is there already an engine that does
  this?" before creating. PRISM's DuplicationGuard THROWS on exact dup; MinHash/LSH would catch *semantic* dups
  (the higher-value class — two engines computing the same thing under different names).

## Knowledge-graph + capability surfacing
- **KG construction + entity resolution:** the 110K-node master graph IS a knowledge graph (engines/dispatchers/
  wiki/memory/ghost nodes + typed cross-substrate edges). Entity resolution merges aliases. **Capability taxonomy/
  ontology:** classify each asset into a capability tree so "what can PRISM do in domain X" is queryable (vs
  per-asset grep).
- **Program analysis** (def-use chains, program slicing) to trace a capability's real implementation + blast
  radius (the /impact surface).

## Integration (tango)
- Produces the "what exists / is it built / wired / blast-radius" answers ALL slots query before grep (search-
  first discipline). Feeds romeo (wire the discovered orphans) + dormant-data (victor). Next deep-research
  (roadmap §tango): MinHash/LSH semantic-dedup layer on DuplicationGuard; CodeBERT-style behavioral embeddings to
  upgrade master-index recall beyond name-heuristic.

Sources (canonical): Robertson & Zaragoza (BM25); Feng et al. CodeBERT / Guo et al. GraphCodeBERT; Broder
(MinHash) + Indyk-Motwani (LSH) + Charikar (SimHash); knowledge-graph + entity-resolution literature; program-
slicing (Weiser). Cross-referenced to PRISM master-index + DuplicationGuard + system-graph (110K nodes).
