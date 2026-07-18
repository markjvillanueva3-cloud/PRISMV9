---
title: Database-Expansion Foundations — relational model, ACID/isolation, indexing, WAL/recovery, consistency, vector search
galaxy: database-expansion
owner_slot: juliett
status: VERIFIED-PARTIAL
verified_by: "papa-create-workflow (2026-06-10)"
verification_method: software/CS facts WebFetch-confirmed against primary + free sources (CMU 15-445 course schedule by Andy Pavlo; PostgreSQL official docs x3 — transaction-iso, indexes-types, wal-intro; SQLite official WAL docs; Jepsen consistency-models reference; Wikipedia reference for CAP, normalization, HNSW, LSM-tree, ARIES). Each "## " section is grounded in a fetched source; algorithmic/historical claims carry the citing URL inline.
tags: [database-expansion, juliett, relational-model, normalization, ACID, isolation-levels, MVCC, b-tree, lsm-tree, hnsw, wal, aries, recovery, cap-theorem, linearizability, serializability, vector-search, postgresql, sqlite, cmu-15445]
---

# Database-Expansion Foundations

The domain-knowledge spine for the **database-expansion** galaxy (owner: **juliett**): the persistence-layer theory PRISM relies on across its stores (Qdrant vector DB, AgentDB, SQLite-WAL, JSONL, state-JSON). Every claim below is **WebFetch-confirmed** against a free/legal primary source (official vendor docs, free university courseware, or a reference encyclopedia entry) — the source URL is cited inline so juliett (and any reviewer) can re-verify. Items requiring juliett's domain/implementation judgment are gathered in **## Owner-gate**. These are papa-verifiable software/CS facts; no PRISM-internal store schema is asserted here.

## 1. The relational model + normalization (how to structure data without anomalies)

**CONFIRMED** against [Database normalization (Wikipedia)](https://en.wikipedia.org/wiki/Database_normalization):
- **Edgar F. Codd introduced normalization as part of his relational model** — he defined **1NF in 1970**, **2NF and 3NF in 1971**, and (with **Raymond F. Boyce**) **BCNF in 1974**.
- Normalization "structures relational databases to **reduce data redundancy and improve data integrity**" by organizing columns/tables so dependencies are enforced through integrity constraints.
- The normal forms:
  - **1NF** — each field contains a single value; columns cannot contain relations or composite values (no nested records or sets).
  - **2NF** — every non-prime attribute has a **full functional dependency** on each candidate key (non-key attributes depend on the *whole* key, not part of it).
  - **3NF** — every non-trivial functional dependency either begins with a superkey or ends with a prime attribute (**eliminates transitive dependencies**).
  - **BCNF** — stricter: every non-trivial functional dependency **begins with a superkey**.
- Normalization eliminates three anomalies: **insertion anomaly** (can't record data until other conditions are met), **update anomaly** (a change must be applied to multiple records, risking inconsistency), **deletion anomaly** (removing one fact deletes unrelated information).

**Design implication for database-expansion:** PRISM mixes normalized relational stores (SQLite) with denormalized document/vector stores (JSONL, Qdrant). The anomaly taxonomy above is the explicit cost of denormalization — wherever a store duplicates a fact for read speed, it inherits the *update anomaly* and must own a reconciliation path (the same "single source of truth" discipline R7/R8 already demand in PRISM code).

## 2. ACID + isolation levels (what a transaction actually guarantees)

**CONFIRMED** against [PostgreSQL: Transaction Isolation (current docs)](https://www.postgresql.org/docs/current/transaction-iso.html):
- The SQL standard defines four isolation levels by the **phenomena** they permit. PostgreSQL's **Table 13.1** maps level to phenomenon:

  | Isolation Level | Dirty Read | Nonrepeatable Read | Phantom Read | Serialization Anomaly |
  |---|---|---|---|---|
  | Read Uncommitted | allowed by standard (not in PG) | possible | possible | possible |
  | Read Committed | not possible | possible | possible | possible |
  | Repeatable Read | not possible | not possible | allowed by standard (not in PG) | possible |
  | Serializable | not possible | not possible | not possible | not possible |

- Phenomenon definitions (from the docs): **dirty read** = reading data written by a concurrent *uncommitted* transaction; **nonrepeatable read** = re-reading a row and finding it changed by another committed transaction; **phantom read** = re-running a query and finding the *result set* changed; **serialization anomaly** = a committed group of transactions produces a result inconsistent with *all* possible one-at-a-time orderings.
- PostgreSQL implements **three distinct internal levels** (Read Uncommitted behaves as Read Committed); its **default isolation level is Read Committed**, and it is **stricter than the standard** at Repeatable Read (it also forbids phantom reads).

**CONFIRMED** against [CMU 15-445 Database Systems schedule (Andy Pavlo)](https://15445.courses.cs.cmu.edu/fall2023/schedule.html): the course teaches concurrency control as a progression — **Lecture 15 "Concurrency Control Theory" (ACID principles)**, **Lecture 16 "Two-Phase Locking"**, **Lecture 17 "Timestamp Ordering"**, **Lecture 18 "Multi-Version Concurrency Control (MVCC)"** — i.e. four mechanically distinct ways to enforce the isolation table above (lock-based, timestamp-based, multi-version).

**Design implication:** isolation is a *property of the read*, not just the write. PRISM's SQLite-WAL stores get SQLite's snapshot semantics (see §4); any store doing read-modify-write on shared state must pick its anomaly tolerance explicitly rather than assume "serializable for free."

## 3. Indexing (B-tree, hash, inverted/GIN, LSM, HNSW)

### Relational index types — **CONFIRMED** against [PostgreSQL: Index Types (current docs)](https://www.postgresql.org/docs/current/indexes-types.html):
- PostgreSQL ships **seven index types** (B-tree, Hash, GiST, SP-GiST, GIN, BRIN, + bloom extension).
- **B-tree** (the default) serves **equality and range queries on sortable data** — operators `< <= = >= >`, plus `BETWEEN`, `IN`, `IS NULL`, anchored prefix `LIKE 'foo%'`, and **sorted retrieval**.
- **Hash** indexes support **only equality** (`=`).
- **GIN** (Generalized Inverted Index) is for values with **multiple components** (e.g. arrays) — tests presence of component values with `<@ @> = &&`. This is the relational analog of a full-text / multi-valued inverted index.
- **BRIN** summarizes **block ranges** (min/max per block) for columns correlated with physical row order — cheap on huge append-only tables.

### Write-optimized indexing — LSM-tree — **CONFIRMED** against [Log-structured merge-tree (Wikipedia)](https://en.wikipedia.org/wiki/Log-structured_merge-tree):
- An LSM-tree keeps data in **two or more components**: an in-memory sorted buffer (**C0 / memtable**, often a skip list) and larger **immutable disk-resident sorted runs (SSTables)**. When the memtable fills it is **flushed to disk as an immutable sorted component**; durability is via **write-ahead logging before** the in-memory insert.
- **Compaction** merges runs (merge-sort style); updates are new writes, deletes are **tombstones** removed during merge. Point lookups search memory first, then disk levels, using **Bloom filters** to skip runs.
- LSM-trees excel at **write-heavy** workloads because they convert random I/O into **sequential disk writes**. The cost is **write amplification** vs **read amplification** trade-off: *leveling* compaction (one component per level) lowers read cost but raises write overhead; *tiering* (multiple components per level) lowers writes but raises reads.
- Invented **1996 by Patrick O'Neil, Edward Cheng, Dieter Gawlick, Elizabeth O'Neil**; powers **Apache Cassandra, RocksDB, LevelDB**.

### Approximate nearest-neighbor indexing — HNSW — **CONFIRMED** against [Hierarchical navigable small world (Wikipedia)](https://en.wikipedia.org/wiki/Hierarchical_navigable_small_world):
- HNSW finds similar vectors **without comparing against every candidate**, using a **multi-layer graph**: the **bottom layer holds all vectors** with detailed connectivity; **upper layers hold progressively fewer nodes** acting as a "rough map" for long-range navigation. Each vector is a node; edges connect similar vectors.
- **Greedy search**: start at an entry point in the highest layer, hop toward closer neighbors, descend a layer when no closer neighbor exists, and explore a wider candidate set at the bottom. Tunables: connection count, search candidate-list size (`ef`), and construction candidate-list size — each trading speed vs accuracy vs memory.
- Proposed by **Malkov and Yashunin (2020)**, building on small-world/navigable-graph research (Kleinberg). HNSW is **approximate** — results are not always identical to exact search. Implemented in **Apache Lucene, DuckDB, Redis, Qdrant, and Milvus**.

**Design implication for database-expansion:** PRISM's three index families map to three workloads — **B-tree/SQLite** for sortable relational lookups, **LSM/RocksDB-style** when a store is write-dominated and append-heavy (JSONL ledgers are a degenerate LSM: append-only + periodic compaction), and **HNSW/Qdrant** for the 384-d embedding recall. The HNSW "approximate" caveat is load-bearing — a vector-recall miss is silent, so any consumer treating a top-k as exhaustive is an R12 fail-loud risk.

## 4. The Write-Ahead Log + crash recovery (durability, atomicity)

### The WAL invariant — **CONFIRMED** against [PostgreSQL: WAL Introduction (current docs)](https://www.postgresql.org/docs/current/wal-intro.html):
- WAL's **central concept**: *"changes to data files ... must be written only after those changes have been logged, that is, after WAL records describing the changes have been flushed to permanent storage."* (Log first, then mutate the data page.)
- Because of this, PostgreSQL **need not flush data pages on every commit** — a crash is recovered by **roll-forward (REDO)** of the WAL. This **significantly reduces disk writes**: only the WAL must be flushed to commit, the WAL is written **sequentially**, and **one fsync of the WAL can commit many concurrent transactions**. It also enables **on-line backup + point-in-time recovery (PITR)**.

### SQLite WAL mode (PRISM's actual SQLite-WAL stores) — **CONFIRMED** against [SQLite: Write-Ahead Logging](https://www.sqlite.org/wal.html):
- SQLite's WAL (added **3.7.0, 2010**) **inverts** the rollback journal: instead of writing the old page to a journal and the new page to the DB, WAL **leaves the original DB page unchanged and appends the new page to a `-wal` file**; **COMMIT = appending a commit record** to the WAL. This lets **readers operate on the unaltered DB while a write commits into the WAL**.
- **Checkpointing** transfers WAL pages back into the DB file (default auto-checkpoint at **~1000 pages / 4 MB**). Concurrency: **multiple readers concurrently**, but **only one writer at a time**; **readers don't block the writer and the writer doesn't block readers**.
- **Hazard (load-bearing for PRISM):** a **long-running read transaction blocks checkpoint progress and lets the `-wal` file grow unbounded** — checkpoint starvation. WAL is also **single-machine only** (needs shared memory via the `-shm` file; doesn't work over a network filesystem) and **performs poorly on very large transactions (>100 MB problematic, >1 GB may fail)**.

### ARIES — the canonical recovery algorithm — **CONFIRMED** against [ARIES (Wikipedia)](https://en.wikipedia.org/wiki/Algorithms_for_Recovery_and_Isolation_Exploiting_Semantics):
- ARIES recovers in **three phases**: **Analysis** (rebuild the Dirty Page Table + Transaction Table by scanning forward from the last checkpoint), **Redo** ("restores the database to the exact state at the crash, including all changes of uncommitted transactions"), then **Undo** (roll back uncommitted transactions backward, writing **compensation log records** so a crash *during* recovery doesn't re-undo).
- It rests on the same **WAL protocol**: *"Any change to an object is first recorded in the log, and the log must be written to stable storage before changes to the object are written to disk."* Key structures: **Dirty Page Table**, **Transaction Table**, and **log records carrying sequence numbers (LSN-style), txn IDs, page IDs, and redo/undo info**. Developed by **IBM Fellow C. Mohan (1992)**; the basis of recovery in Db2, SQL Server, and others.

**Design implication:** every durable PRISM store that does atomic-write (the temp-file + rename pattern across the fleet) is a *minimal* WAL — write the new state somewhere safe, then atomically swap. The SQLite-WAL checkpoint-starvation and ">1 GB transaction may fail" facts are concrete failure modes for any PRISM store that grows large (cf. the tribal-index >512 MiB and graph 644 MB I/O incidents already in CLAUDE.md "Recent regressions").

## 5. Distributed consistency (CAP, linearizability, serializability)

### CAP theorem — **CONFIRMED** against [CAP theorem (Wikipedia)](https://en.wikipedia.org/wiki/CAP_theorem):
- A distributed data store can provide **at most two of three** guarantees: **Consistency** ("every read receives the most recent write or an error"), **Availability** ("every request received by a non-failing node must result in a response"), **Partition tolerance** ("the system continues to operate despite an arbitrary number of dropped/delayed messages between nodes").
- **Eric Brewer** stated it as a conjecture (2000 PODC); **Seth Gilbert and Nancy Lynch (MIT, 2002)** published the formal proof, making it a theorem. Brewer clarified (**2012**) that "pick two of three" is misleading — you only sacrifice C or A **during an actual partition**.
- **PACELC** (2010) extends it: **if Partition → choose Availability or Consistency; Else (normal ops) → choose Latency or Consistency** — capturing the latency/consistency trade-off even with a healthy network.

### Consistency model hierarchy — **CONFIRMED** against [Jepsen: Consistency Models](https://jepsen.io/consistency/models):
- **Linearizability** — single-object model where operations appear instantaneous in a **real-time order**; the strongest *single-object* guarantee, and it **implies sequential consistency**.
- **Sequential consistency** — weaker: a consistent per-process order, but it **need not match real time**.
- **Serializability** — multi-object **transactional** model: concurrent transactions behave as if executed in *some* serial order; **does not require real-time ordering**. Stronger than snapshot isolation / repeatable read, weaker than strict serializability.
- **Strict serializability** — the strongest overall: combines **linearizability's real-time ordering with serializability's multi-object transactions**; per Jepsen it "unifies two disjoint families ... those over multi-object transactions, and those for single object operations."
- **Key distinction:** linearizability constrains **individual objects with real time**; serializability constrains **multi-object transactions without** a real-time requirement.

**Design implication for database-expansion:** PRISM is a multi-store, multi-chat (up to 26-slot) fleet — effectively a small distributed system. The CAP framing names the trade PRISM already makes: shared-file stores favor *availability* (any chat can append) and accept eventual reconciliation, so they are **not linearizable**. Treating an append-only ledger or a Qdrant recall as if it were strictly serializable is the precise mistake the hierarchy above forbids — the same root cause behind PRISM's lost-update and fail-open-clobber regressions.

## Owner-gate (NOT promoted — juliett must verify before any store relies on these)

These were intentionally left for juliett's domain/implementation check; they are **not** asserted as PRISM facts here:
- **Which PRISM stores are linearizable vs eventually-consistent** — the CAP/Jepsen vocabulary above is generic; mapping each concrete store (Qdrant / AgentDB / SQLite-WAL / JSONL / state-JSON) onto a specific consistency model requires reading PRISM's actual access patterns. Do not label a store "serializable" without verifying its lock/commit path.
- **SQLite checkpoint tuning for PRISM** — the ~1000-page / 4 MB auto-checkpoint default and the >100 MB / >1 GB transaction hazards are SQLite-general; the right `wal_autocheckpoint` / transaction-chunking for PRISM's specific SQLite-WAL stores is an empirical call juliett owns.
- **HNSW `ef`/M parameters for the 384-d Qdrant recall** — the speed/accuracy/memory trade-offs are real but the production values are PRISM-specific and must be measured, not copied from the encyclopedia.
- **Whether any PRISM JSONL ledger should migrate to a real LSM engine (RocksDB)** — the "JSONL is a degenerate LSM" framing in §3 is an analogy, not a recommendation; a migration is a juliett-scoped design decision with its own dedup/inventory check.

## Sources (distinct URLs WebFetch-confirmed 2026-06-10)

Free university courseware / free official vendor docs (high-authority, free):
1. CMU 15-445 Database Systems — course schedule (Andy Pavlo): https://15445.courses.cs.cmu.edu/fall2023/schedule.html
2. PostgreSQL official docs — Transaction Isolation: https://www.postgresql.org/docs/current/transaction-iso.html
3. PostgreSQL official docs — Index Types: https://www.postgresql.org/docs/current/indexes-types.html
4. PostgreSQL official docs — Write-Ahead Logging Introduction: https://www.postgresql.org/docs/current/wal-intro.html
5. SQLite official docs — Write-Ahead Logging: https://www.sqlite.org/wal.html

Reference / consistency analysis (free, legal):
6. Jepsen — Consistency Models: https://jepsen.io/consistency/models
7. Database normalization (Wikipedia): https://en.wikipedia.org/wiki/Database_normalization
8. CAP theorem (Wikipedia): https://en.wikipedia.org/wiki/CAP_theorem
9. Log-structured merge-tree (Wikipedia): https://en.wikipedia.org/wiki/Log-structured_merge-tree
10. Hierarchical navigable small world / HNSW (Wikipedia): https://en.wikipedia.org/wiki/Hierarchical_navigable_small_world
11. ARIES recovery (Wikipedia): https://en.wikipedia.org/wiki/Algorithms_for_Recovery_and_Isolation_Exploiting_Semantics

> Not promoted: `https://jepsen.io/consistency` (the top-level index page) returned insufficient detail on first fetch; the `/consistency/models` subpage (#6 above) was fetched instead and carries the confirmed definitions.
