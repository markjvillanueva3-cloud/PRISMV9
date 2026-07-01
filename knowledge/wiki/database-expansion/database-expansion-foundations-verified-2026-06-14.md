---
name: database-expansion-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the database-expansion galaxy (persistence — HNSW/DiskANN ANN, SQLite WAL, Qdrant, schema migration, ARIES). 6 fetched + 1 unfetched source. FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: database-expansion
  tier: VERIFIED
  verifiedBy: WebFetch
---

# database-expansion galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Sources WebFetched + excerpted; VLDB survey honestly marked **fetched:false** (Springer wall). Directly grounds PRISM's Qdrant/HNSW + SQLite-WAL stack.

## Synthesis
**HNSW** (Malkov & Yashunin, IEEE TPAMI 2020) — multi-layer proximity graph with exponential-decay probabilistic layer assignment → O(log N) ANN; the exclusive dense-vector index in Qdrant, extended with payload-aware edges (filterable HNSW) for efficient pre-filtered search. **DiskANN** (NeurIPS 2019, MSR) generalizes to billion-scale via tiered storage — compressed PQ candidates in RAM, full-precision Vamana graph on SSD (5000 QPS @ 95% recall on SIFT1B, single node) — the precedent for Qdrant's memmap/on-disk quantization. **SQLite WAL** — append-only WAL + shared-memory wal-index + checkpoint durability; concurrent readers+writers (one writer at a time); the canonical persistence pattern vector-segment stores mirror. **CMU 15-445** grounds ARIES recovery (WAL/LSN/redo-undo), FD-based normalization (1NF-BCNF), B-tree/hash/vector indexing, MVCC, cost-based optimization. **Zero-downtime migration** (SLSM) — lazy dual-schema coexistence with identical data distribution; migration merges into user transactions, not a blocking phase (for live Qdrant collection + SQLite WAL store evolution).

## Verified sources
### [Efficient and robust approximate nearest neighbor search using HNSW graphs (arXiv 1603.09320)](https://arxiv.org/abs/1603.09320) — paper
> "a multi-layer structure consisting from hierarchical set of proximity graphs with randomly assigned layers following exponential decay enabling logarithmic complexity scaling"

**Knowledge:** Foundational ANN (IEEE TPAMI 2020): multi-layer proximity graph, probabilistic exponential-decay layer assignment, heuristic neighbor selection, O(log N). Params M / ef_construction / ef. Greedy descent top→query layer, then beam search at layer 0.

### [Write-Ahead Logging (SQLite official docs)](https://sqlite.org/wal.html) — article
> "WAL is significantly faster in most scenarios; readers do not block writers and a writer does not block readers; reading and writing can proceed concurrently"

**Knowledge:** Append-only WAL file + shared-memory wal-index + checkpoint back to main DB. `PRAGMA journal_mode=WAL`; not over network FS; one writer at a time; page size immutable after enable.

### [Indexing — Qdrant](https://qdrant.tech/documentation/manage-data/indexing/) — article
> "extends HNSW with additional edges based on indexed payload values"

**Knowledge:** Production HNSW — m / ef_construct (build), ef (search recall/speed). Filterable HNSW adds payload-aware edges so filtered queries skip post-filtering scan. 8 payload index types; sparse-vector exact dot-product; on-disk payload index trades RAM for slight latency.

### [Intro to Database Systems 15-445/645 (CMU)](https://15445.courses.cs.cmu.edu/fall2025/syllabus.html) — course
> "Implement database recovery algorithms and verify their correctness"

**Knowledge:** ARIES recovery (WAL, LSNs, redo/undo), normalization via FDs (1NF-BCNF), B-tree/hash/vector indexing, ACID, MVCC, cost-based query optimization. Students implement BusTub in C++17.

### [DiskANN: Billion-point NN Search on a Single Node (NeurIPS 2019, Microsoft Research)](https://www.microsoft.com/en-us/research/publication/diskann-fast-accurate-billion-point-nearest-neighbor-search-on-a-single-node/) — paper
> "SSD-based indices built by DiskANN can meet all three desiderata for large-scale ANNS: high-recall, low query latency and high density"

**Knowledge:** Vamana graph on SSD + PQ-compressed candidates cached in RAM for scoring + full-precision SSD rerank. 5000 QPS @ 95%+ recall@1 on SIFT1B with 64GB RAM + commodity SSD. Informs tiered storage. Key: RAM holds compressed candidates, SSD holds truth.

### [SLSM: Lazy Schema Migration on Shared-Nothing Databases (arXiv 2404.03929)](https://arxiv.org/abs/2404.03929) — paper
> "zero-downtime schema migration... keeping old and new schemas with identical data distribution, minimizing inter-node communication costs"

**Knowledge:** Old + new schema coexist with identical data distribution (no redistribution); migration merges into user transaction plans (lazy), not a blocking phase. For PRISM's live Qdrant + SQLite WAL migrations.

### [Survey of Vector Database Management Systems (VLDB Journal 2024)](https://link.springer.com/article/10.1007/s00778-024-00864-x) — paper · NOT fetched (Springer wall)
> _(no excerpt — paywalled; confirmed real via multiple search results, Pan/Wang/Li VLDB J. 33(5):1591-1615, no fabricated quote)_

**Knowledge:** 5 core vector-DB obstacles: ambiguous semantic similarity, high dimensionality, pairwise comparison cost, no structural index ordering (unlike B-tree), hard hybrid structured+vector queries.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_74b87263-acb). Ledger: state/shared/galaxy-knowledge-iterations.json._
