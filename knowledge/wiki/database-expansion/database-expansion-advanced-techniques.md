---
title: Database-Expansion Advanced Techniques — query-plan reading, index-driven access paths, partitioning/sharding, materialized views + incremental refresh, CDC, SSI, vector quantization
galaxy: database-expansion
owner_slot: juliett
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "Each advanced technique WebFetch-confirmed against a free/legal primary source (PostgreSQL official docs x7: using-explain, ddl-partitioning, rules-materializedviews, sql-refreshmaterializedview, logical-replication, transaction-iso SSI section, indexes-partial; Use The Index Luke / Markus Winand free reference; Qdrant official quantization docs; Wikipedia shard-architecture reference). Source URL cited inline per technique. Promotes only the qualitative strategy + trade-off DIRECTION; every numeric tuning constant/threshold is left owner-gated for juliett."
tags: [database-expansion, juliett, advanced-techniques, query-plan, explain-analyze, access-path, covering-index, index-only-scan, partial-index, partitioning, partition-pruning, sharding, materialized-view, incremental-refresh, concurrent-refresh, change-data-capture, logical-replication, serializable-snapshot-isolation, ssi, predicate-lock, vector-quantization, hnsw, postgresql, qdrant, use-the-index-luke]
---

# Database-Expansion Advanced Techniques

The **world-leader-depth** layer for the **database-expansion** galaxy (owner: **juliett**): the state-of-the-art *strategies* a database expert reaches for once the theory and the common gotchas are mastered. This file is deliberately DISTINCT from its two siblings:

- [database-expansion-foundations](database-expansion-foundations.md) — intro theory (the isolation table, index *types*, the WAL invariant, ARIES, CAP/Jepsen, HNSW *mechanics*). Not repeated here.
- [database-expansion-applied-practice](database-expansion-applied-practice.md) — the common practitioner gotchas (N+1, pool sizing, deadlock ordering, `synchronous=OFF`, *composite-index column order*, `ADD COLUMN` rewrite, blocking DDL, TRUNCATE MVCC-safety, the HNSW `m`/`ef` *knob trade*). Not repeated here.

This entry is the **advanced strategy that makes the difference at the top of the field** — reading the optimizer instead of guessing, designing the *access path* not just "an index," scaling out with partitioning/sharding, serving derived data with materialized views + incremental refresh, streaming changes with CDC, picking serializability via SSI, and shrinking vector indexes with quantization. Every technique below is **WebFetch-confirmed** against a free/legal source with the URL cited inline. Per the SAFETY rule, only the qualitative **method + trade-off DIRECTION** is promoted — every numeric cutting/tuning constant or threshold is left for juliett in **## Owner-gate**.

---

## 1. Read the optimizer — access-path design from the query plan

### T1 — Read `EXPLAIN ANALYZE`: compare *estimated* rows to *actual* rows, not cost to time
The expert never assumes which access path runs — they read the plan tree. `EXPLAIN` prints each node's *estimated* start-up cost, total cost, output rows, and row width; `EXPLAIN ANALYZE` actually executes and prints *actual* time and *actual* rows alongside the estimates ([PostgreSQL — Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)). The cost units are "arbitrary ... measured in units of disk page fetches" while `actual time` is in milliseconds, so **the two are not directly comparable** — the diagnostic that matters is *"whether the estimated row counts are reasonably close to reality."*
**When an expert uses it:** any time a query is slow or an index "should" be used but isn't — the plan, not the schema, is ground truth.
**Trade-off direction:** a large gap between estimated and actual rows means the planner is working from **stale statistics** and likely chose the wrong path (a seq scan where an index scan was right, or vice-versa); the fix direction is to refresh statistics (`VACUUM ANALYZE`) so estimates re-converge. **Caution:** `EXPLAIN ANALYZE` *runs* the query, so *"any side-effects will happen as usual"* — never run it bare on a mutating statement.
**PRISM application:** database-expansion's SQLite-WAL / state stores are queried by many fleet consumers; when a store read is slow, the discipline is to capture the actual plan and check the estimate-vs-actual gap rather than blindly adding an index — the same R12 "measure, don't assume" already in applied-practice's verification section, applied to the *planner*.

### T2 — The covering index / index-only scan: answer the query from the index, skip the table
When an index contains *every column a query needs*, the database can satisfy the query "directly from an index without accessing the underlying table" — the index-only scan, which the reference calls *"one of the most powerful tuning methods of all"* because it *"prevents [tens of thousands of] table fetches"* on a wide-row, few-column query ([Use The Index, Luke! — Index-Only Scan](https://use-the-index-luke.com/sql/clustering/index-only-scan-covering-index)).
**When an expert uses it:** read-heavy aggregation/lookup queries that select **few columns over many rows** — the classic index-only-scan candidate.
**Trade-off direction:** adding columns to "cover" widens the index, which *"unnecessarily uses memory and increases the maintenance effort needed for update statements"* — so a covering index trades faster reads for slower writes and more space. The expert's rule is **reactive, not preemptive**: *"first index without considering the select clause and only extend the index if needed."*
**PRISM application:** for a hot read path over a database-expansion store, covering the projected columns is the lever that removes the table fetch — but only where the store is write-light enough to absorb the wider index; juliett sizes that per store.

### T3 — Partial indexes: index only the rows that matter
A partial index is *"an index built over a subset of a table ... defined by a conditional expression"* — the index *"contains entries only for those table rows that satisfy the predicate"* ([PostgreSQL — Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)). Three expert uses: **exclude common values** (*"a query searching for a common value ... will not use the index anyway, so there is no point in keeping those rows in the index"*), **index only the active/interesting subset** (e.g., unbilled orders), and **enforce uniqueness on a subset** (a unique index with a `WHERE` clause).
**When an expert uses it:** when a large fraction of rows is uninteresting to the query (already-processed, soft-deleted, a dominant default value), or a uniqueness rule applies only to a subset.
**Trade-off direction:** the index is **smaller and cheaper to maintain** (*"speed up many table update operations because the index does not need to be updated in all cases"*) — the cost is reduced applicability: it is usable *"only if the system can recognize that the WHERE condition of the query mathematically implies the predicate of the index."* A query whose filter doesn't imply the predicate silently can't use it.
**PRISM application:** database-expansion ledgers/state stores often have a small "active/pending" working set inside a large append-only history — a partial index over only the active subset is the strategy that keeps the index small as history grows (the inverse of letting an index bloat with cold rows).

---

## 2. Scale-out — partitioning and sharding

### T4 — Declarative partitioning + partition pruning: turn a giant table into a scanned sub-table
Declarative partitioning splits "a logically large table into smaller physical pieces" by RANGE, LIST, or HASH of a partition key; **partition pruning** is the optimizer technique that *"improves performance for declaratively partitioned tables"* by eliminating partitions that cannot match the `WHERE` clause so only relevant partitions appear in the plan ([PostgreSQL — Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)). Pruning happens both at **plan time** and at **execution time** (for runtime parameter values).
**When an expert uses it:** when a table *"would otherwise be very large"* AND queries concentrate on a key range — *"query performance can be improved dramatically ... when most of the heavily accessed rows ... are in a single partition or a small number of partitions"*; also for cheap **bulk delete/archival** since `DROP TABLE` / `DETACH PARTITION` is *"far faster than a bulk [DELETE]"* and avoids the VACUUM overhead.
**Trade-off direction:** more partitions is **not** strictly better — the docs warn *"never just assume that more partitions are better than fewer ... nor vice-versa"*: too many partitions raises planning time and memory; partition-key constraints are stricter (a unique key must include all partition-key columns); and a regular table can't be converted in place. Benefit appears only above a size threshold (rule of thumb: table exceeds server physical memory — that exact threshold is owner-gated).
**PRISM application:** a time/domain-keyed database-expansion store that has grown large (the CLAUDE.md "Recent regressions" show several stores crossing hundreds of MB / GB) is the natural candidate — RANGE-by-date or LIST-by-galaxy partitioning makes archival a metadata `DETACH` instead of a giant blocking `DELETE`. The *number* of partitions is the juliett tuning call.

### T5 — Sharding: horizontal partitioning across separate servers (the next tier above partitioning)
Sharding is *"a horizontal partition of data"* where each shard can reside on a **separate server instance** — the distinction from single-server partitioning is that *"the search load for the large partitioned table can be distributed across multiple servers ... rather than only across multiple indexes on a same logical server"* ([Shard (database architecture) — Wikipedia](https://en.wikipedia.org/wiki/Shard_(database_architecture))). It works best *"if the database shard is based on some real-world segmentation of the data (e.g., European customers v. American customers)"* so shard membership is inferable.
**When an expert uses it:** when a single server's capacity (CPU/RAM/disk/IOPS) is the ceiling and the workload partitions cleanly by a shard key — i.e., the problem is *scale-out*, not just a too-big single table.
**Trade-off direction:** sharding buys parallelism and smaller per-shard indexes at the cost of **operational + query complexity**: cross-shard joins/queries *"require querying multiple instances, reducing efficiency gains"*, and schema changes / resharding become *"more difficult in a sharded environment."* The strategic rule: shard only when partitioning on one node is exhausted, and choose a shard key that avoids cross-shard fan-out and hotspots.
**PRISM application:** PRISM's stores are predominantly single-host today, so sharding is the *deferred* scale-tier for database-expansion — the strategy to reach for only after T4 partitioning is exhausted on one box; promoted here as the directional next step, with the shard-key choice owner-gated.

---

## 3. Derived data — materialized views and incremental refresh

### T6 — Materialized views: precompute and persist an expensive query
A materialized view *"persist[s] the results in a table-like form"* (unlike a regular view, which only stores the query and recomputes every time), so repeated reads of an expensive aggregation are *"often much faster than accessing the underlying tables directly"* — the explicit trade being that *"the data is not always current; yet sometimes current data is not needed"* ([PostgreSQL — Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)).
**When an expert uses it:** a costly, repeatedly-read derived result (rollups, dashboards, denormalized read models) where **bounded staleness is acceptable**.
**Trade-off direction:** you trade *freshness for read speed* — the view is fast but stale until refreshed; the expert chooses a refresh cadence matched to how stale the consumer can tolerate.
**PRISM application:** database-expansion produces many cross-store digests/snapshots that fleet consumers read often but that are expensive to recompute — the materialized-view pattern (precompute, persist, refresh on a cadence) is exactly the "snapshot/sidecar" shape PRISM already uses (e.g., compact sidecars over a huge graph); this names the trade and the refresh discipline behind it.

### T7 — Incremental / concurrent refresh: refresh without blocking readers
A plain `REFRESH MATERIALIZED VIEW` *"could block other connections which are trying to read from the materialized view"*; `REFRESH MATERIALIZED VIEW CONCURRENTLY` instead refreshes *"without locking out concurrent selects"* — but it **requires at least one UNIQUE index** on the view *"which uses only column names and includes all rows"* (no expression index, no `WHERE`), the view must already be populated, and only one refresh may run at a time ([PostgreSQL — REFRESH MATERIALIZED VIEW](https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html)).
**When an expert uses it:** a high-read materialized view that must stay continuously available during refresh — the concurrent path keeps readers unblocked.
**Trade-off direction:** `CONCURRENTLY` trades *availability-during-refresh* for *speed and resources* — it is *"faster in cases where a small number of rows are affected"* but **slower and heavier when many rows change** than a plain (blocking) refresh. So a mostly-stable view that changes a little each cycle favors `CONCURRENTLY`; a view that turns over almost entirely each cycle favors a fast blocking refresh in a quiet window. The unique-index requirement is the structural cost of admission.
**PRISM application:** for a database-expansion derived store that fleet chats read continuously, the concurrent-refresh trade (keep readers alive, accept a slower heavier refresh when churn is small) is the right strategy; a full-rebuild store is better refreshed atomically in a quiet window — mirroring PRISM's atomic temp-file-and-rename swap for full rebuilds. Refresh-frequency thresholds are owner-gated.

---

## 4. Change data capture — stream the changes instead of re-scanning

### T8 — Logical replication as CDC: a publish/subscribe stream of row-level changes
Logical replication replicates *"data objects and their changes, based upon their replication identity (usually a primary key)"* — PostgreSQL's native **change-data-capture** mechanism. It uses a *"publish and subscribe model"*: a **publication** names the tables, a **subscription** pulls them; after an initial snapshot, *"changes on the publisher since the initial copy are sent continually to the subscriber"* and applied *"in the same order as the publisher so that transactional consistency is guaranteed"* ([PostgreSQL — Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)).
**When an expert uses it:** to **avoid re-scanning** a source for a derived/downstream store — replicate *"a subset of a database to subscribers as they occur"*, consolidate multiple databases for analytics, give different user groups filtered access, or *"fir[e] triggers for individual changes as they arrive."*
**Trade-off direction:** CDC trades a one-time setup + a durable change-stream dependency for **incremental, real-time propagation** instead of expensive periodic full re-reads — the strategic inverse of polling/re-scanning. It depends on a stable **replication identity** (a key), so tables without a clean identity are the limitation direction.
**PRISM application:** database-expansion stores feed many downstream consumers (embeddings, the GNN ref-pool, galaxy mirrors). The CDC *direction* — propagate deltas as they happen rather than re-derive the whole store — is the scalable pattern for those feeds; PRISM's "rebuild-the-whole-sidecar" steps are the polling alternative this technique improves on where a stable key exists.

---

## 5. Concurrency strategy and vector-index compression

### T9 — Serializable Snapshot Isolation (SSI): true serializability without hand-rolled locks
PostgreSQL's Serializable level implements **Serializable Snapshot Isolation** — it runs *"exactly the same as Repeatable Read except that it also monitors for conditions which could make execution ... behave in a manner inconsistent with all possible serial ... executions."* It uses **predicate locks** (`SIReadLock`) that *"do not cause any blocking"* and merely flag dangerous read/write dependencies; a detected anomaly aborts a transaction with a serialization failure (SQLSTATE `40001`) that the application **must retry** ([PostgreSQL — Transaction Isolation, Serializable](https://www.postgresql.org/docs/current/transaction-iso.html)).
**When an expert uses it:** when correctness under concurrency matters and you'd otherwise sprinkle `SELECT FOR UPDATE` / explicit locks everywhere — SSI lets you *"eliminate explicit locks ... where no longer needed,"* and the guarantee is that if a transaction *"will do the right thing when run by itself,"* it will do the right thing in any serializable mix or fail to commit.
**Trade-off direction:** SSI trades a **mandatory retry loop + monitoring overhead** for the elimination of manual lock reasoning. It *"does not introduce any blocking beyond ... repeatable read,"* and the docs note that *"balanced against the cost and blocking ... of explicit locks ... Serializable transactions are the best performance choice for some environments"* — i.e., it wins when retries are *infrequent* and loses when contention is high enough that retries thrash. **Hard requirement:** the app needs *"a generalized way of handling serialization failures."*
**PRISM application:** database-expansion's read-modify-write paths on shared state are exactly where PRISM has hit lost-update / fail-open-clobber regressions (CLAUDE.md "Recent regressions"). SSI is the strategy that replaces ad-hoc locking with "write it correctly single-threaded + retry on 40001" — but it presupposes a real serializable engine and a retry harness, which juliett confirms per store.

### T10 — Vector quantization with rescoring: shrink the HNSW index, recover recall on a second pass
Quantization *"compresses data while preserving close to original relative distances between vectors"* — **scalar** (32-bit float to 8-bit int, ~4x, *"error ... usually less than 1%"*), **product** (chunked, up to higher compression but *"slower than scalar quantization"* because it isn't SIMD-friendly), and **binary** (one bit per component, ~32x, the fastest but needing *"high-dimensional vectors and a centered distribution"*). The accuracy loss is recovered by **oversampling + rescoring**: pre-select extra candidates with the quantized index, then *"re-evaluate top-k search results using the original vectors"* ([Qdrant — Quantization](https://qdrant.tech/documentation/guides/quantization/)).
**When an expert uses it:** when the vector index's **memory footprint** is the binding constraint (the foundations file's HNSW memory trade made concrete) — quantization keeps the fast quantized vectors resident and the originals on disk for rescoring.
**Trade-off direction:** quantization trades **accuracy for memory + speed**; the more aggressive the method (scalar to product to binary), the larger the compression and the larger the approximation error — and **oversampling/rescoring buys accuracy back at a latency cost** (retrieve more candidates, re-score against originals). The expert chooses the method to the data shape (binary needs high-dim, centered data) and tunes oversampling to the recall target.
**PRISM application:** database-expansion owns the Qdrant vector store; when the 384-d recall index outgrows RAM (the tribal-index / large-store memory incidents in CLAUDE.md are the warning shape), quantization-plus-rescoring is the strategy that keeps recall acceptable while cutting memory — distinct from the applied-practice `m`/`ef_construct` knob trade, which tunes the *graph*, not the *vector representation*. The quantization method choice and oversampling factor are owner-gated.

---

## How an expert proves these (not "looks fine")

Consistent with applied-practice's verification discipline and PRISM R12/R9, each advanced technique is *measured*, never assumed:
- **Access path (T1, T2, T3):** read `EXPLAIN ANALYZE`; confirm the intended scan (index-only / partial-index usage) and that **estimated rows track actual rows** — an index existing proves nothing about whether the query uses it.
- **Partition pruning (T4):** confirm pruned partitions are absent from the plan ("Subplans Removed" / execution-time pruning) — pruning that didn't fire means every partition was scanned.
- **Materialized-view freshness (T6, T7):** decide the staleness budget explicitly; verify `CONCURRENTLY` actually kept readers unblocked and didn't regress refresh time under real churn.
- **CDC (T8):** verify the subscriber stays caught up and ordered — replication lag is the silent failure.
- **SSI (T9):** load-test the **retry rate** under real concurrency — SSI is only the right choice while serialization failures are rare.
- **Quantization (T10):** measure recall against an **exact-search ground truth** on a sample, with and without rescoring — the recall loss is silent (an approximate index never errors), exactly the class that must be measured.

## Owner-gate (NOT promoted — juliett must verify before any PRISM store relies on these)

The strategies above are generic, source-confirmed CS/software methods. Every **numeric constant, threshold, or production value** is deliberately left for juliett's domain/implementation judgment and is **not** asserted as a PRISM fact:
- **Partitioning size threshold + partition count (T4)** — the "table exceeds server physical memory" rule of thumb and the optimal *number* of partitions are workload-specific; juliett measures them on real store sizes, not the rule of thumb.
- **Shard key + shard count (T5)** — which real-world segmentation keys a PRISM store (galaxy? date? customer?) and how many shards is an owner design decision gated behind a dedup/inventory check; do not pick a shard key without verifying the access pattern.
- **Materialized-view refresh cadence + CONCURRENTLY vs blocking choice (T6, T7)** — the acceptable staleness window and the per-view churn fraction that flips the `CONCURRENTLY`-vs-blocking decision are empirical per derived store.
- **CDC replication-identity + lag budget (T8)** — which PRISM stores have a clean replication identity, and the tolerable replication lag, are store-specific.
- **Isolation level per store + retry budget (T9)** — whether a given PRISM store runs on a real serializable engine, and the retry rate at which SSI stops being the right choice, is juliett's call; do not label a file/JSONL/state-JSON store "serializable."
- **Quantization method + oversampling factor for the 384-d Qdrant recall (T10)** — scalar vs product vs binary, and the oversampling multiplier needed to hit the recall target, must be **measured on PRISM data** against an exact-search ground truth, not copied from the docs. (The HNSW `m`/`ef`/`ef_construct` values remain owner-gated in applied-practice.)
- **Statistics / `VACUUM ANALYZE` cadence (T1)** — how often a PRISM store's planner statistics need refreshing to keep estimate-vs-actual converged is an empirical operations call.

## Sources (distinct URLs WebFetch-confirmed 2026-06-10)

Free official vendor docs (high-authority, free):
1. PostgreSQL — Using EXPLAIN (query-plan reading, cost units, estimate-vs-actual): https://www.postgresql.org/docs/current/using-explain.html
2. PostgreSQL — Table Partitioning (range/list/hash, partition pruning, DETACH archival): https://www.postgresql.org/docs/current/ddl-partitioning.html
3. PostgreSQL — Materialized Views (persist results, staleness trade): https://www.postgresql.org/docs/current/rules-materializedviews.html
4. PostgreSQL — REFRESH MATERIALIZED VIEW (CONCURRENTLY, unique-index requirement, lock trade): https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
5. PostgreSQL — Logical Replication (CDC, publish/subscribe, replication identity): https://www.postgresql.org/docs/current/logical-replication.html
6. PostgreSQL — Transaction Isolation / Serializable (SSI, SIReadLock, 40001 retry): https://www.postgresql.org/docs/current/transaction-iso.html
7. PostgreSQL — Partial Indexes (subset index, predicate-implication limit): https://www.postgresql.org/docs/current/indexes-partial.html
8. Qdrant — Quantization (scalar/product/binary, oversampling + rescoring): https://qdrant.tech/documentation/guides/quantization/

Free practitioner reference / encyclopedia (free, legal):
9. Use The Index, Luke! (Markus Winand) — Index-Only Scan / covering index: https://use-the-index-luke.com/sql/clustering/index-only-scan-covering-index
10. Shard (database architecture) — Wikipedia: https://en.wikipedia.org/wiki/Shard_(database_architecture)

> Note: source #6 (transaction-iso) is also cited in the foundations file, but for a different section — foundations uses the isolation-level *table*; this entry uses the **Serializable / SSI** subsection (predicate locks, mandatory retry, lock-elimination strategy), which foundations does not cover.
