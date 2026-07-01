---
title: Database-Expansion Applied Practice — practitioner gotchas, failure modes, and technique decisions (indexing, locks, isolation, migrations, pools, HNSW, durability)
galaxy: database-expansion
owner_slot: juliett
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice (2026-06-10)"
verification_method: "Each gotcha WebFetch-confirmed against a free/legal primary source: PostgreSQL official docs (explicit-locking, mvcc-caveats, sql-altertable), SQLite official docs (pragma synchronous), Use The Index Luke (Markus Winand, free online), HikariCP wiki (Brett Wooldridge, About Pool Sizing), SQLAlchemy 2.0 official ORM docs (relationship loading), Qdrant official docs (indexing/HNSW). Source URL cited inline per claim; benchmark-specific numbers left owner-gated."
tags: [database-expansion, juliett, applied-practice, tribal-knowledge, n-plus-one, indexing-gotchas, deadlock, lock-contention, isolation-anomalies, mvcc, blocking-ddl, migration-pitfalls, connection-pool, hikaricp, hnsw, qdrant, wal, fsync, durability, sqlite, postgresql]
---

# Database-Expansion Applied Practice

The **practitioner-knowledge** layer for the **database-expansion** galaxy (owner: **juliett**) — the hard-won gotchas, failure modes, and technique decisions that pure theory does not teach. The companion [database-expansion-foundations](database-expansion-foundations.md) covers the *theory* (isolation table, index types, the WAL invariant, ARIES, CAP, HNSW mechanics); this file deliberately does NOT repeat it. Here the question is always: *where does a database bite a competent engineer in production, why, and what does the expert do instead?*

Every gotcha below is **WebFetch-confirmed** against a free/legal primary source (official vendor/framework docs, a free practitioner reference, or free courseware) with the URL cited inline. These are papa-verifiable CS/software claims; PRISM-store-specific numbers and per-store decisions are gathered in **## Owner-gate**.

## Common failure modes (silent or surprising in production)

### G1 — The N+1 query: lazy loading turns one logical read into N+1 round-trips
An ORM relationship configured for **lazy loading** fires a separate `SELECT` *each time* you touch the related attribute, so iterating N parent objects and reading a child collection per object emits **N+1** statements. SQLAlchemy names this explicitly: *"for any N objects loaded, accessing their lazy-loaded attributes means there will be N+1 SELECT statements emitted"* ([SQLAlchemy 2.0 ORM — Relationship Loading](https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html)).
**Why it hides:** each query is individually fast and correct; the cost is the *count* of network round-trips, invisible in a unit test with one parent row and catastrophic at scale.
**Expert avoidance:** eager-load up front — SQLAlchemy recommends `selectinload()` as *"generally the best loading strategy"* for collections (one extra SELECT over few tables) and `joinedload()` as *"the most general purpose strategy"* for many-to-one. The discipline: know your access pattern and pre-fetch, don't let attribute access drive I/O. (Same source.)

### G2 — Connection-pool exhaustion is usually a too-BIG pool, not a too-small one
The intuitive fix for "we ran out of connections" is to raise the pool size, but HikariCP's guidance is the opposite: past the point where in-flight work exceeds CPU/disk capacity, *"executing A and B sequentially will always be faster than executing A and B 'simultaneously' through time-slicing"* — more connections add context-switching and lock contention, not throughput ([HikariCP — About Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)).
**Why it hides:** a bloated pool *looks* healthy until the DB thrashes; the symptom (latency spikes, timeouts) is then misread as "need even more connections," a doom loop.
**Expert avoidance:** size the pool to the database's real concurrency capacity using the PostgreSQL-derived starting formula `connections = ((core_count * 2) + effective_spindle_count)` (~9-10 for a 4-core/1-disk box), and accept that the *desired* state for 10,000 front-end users is a small pool (10-100) **saturated with threads waiting** — blocked app threads waiting on a connection is correct, not a problem. (Same source.)

### G3 — Deadlock from inconsistent lock ordering across transactions
Two transactions that lock the same objects in *opposite* order can wedge: PG's example is T1 locking A then wanting B while T2 holds B and wants A — *"neither one can proceed"* — and it happens at row level too (two `UPDATE`s touching the same two account rows in opposite order) ([PostgreSQL — Explicit Locking, §Deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html)).
**Why it hides:** PostgreSQL auto-detects and aborts one victim, *"Exactly which transaction will be aborted is difficult to predict and should not be relied upon"* — so the failure surfaces intermittently as a random transaction error under concurrency, not deterministically.
**Expert avoidance:** the documented best defense is *"being certain that all applications ... acquire locks on multiple objects in a consistent order"* (had both transactions updated the rows in the same order, no deadlock), plus acquiring the *most restrictive* lock mode first, and — where ordering can't be guaranteed — *"retrying transactions that abort due to deadlocks."* (Same source.)

### G4 — synchronous=OFF trades durability for a corruption risk you can't undo
SQLite's `PRAGMA synchronous=OFF` returns from commit *"as soon as it has handed data off to the operating system"* — so an app crash is survivable, but *"the database might become corrupted if the operating system crashes or the computer loses power before that data has been written to non-volatile storage"* ([SQLite — PRAGMA synchronous](https://www.sqlite.org/pragma.html)).
**Why it hides:** OFF is dramatically faster, so it gets adopted in a benchmark or a "throwaway" store and then quietly kept; the corruption only manifests on a real power-loss event, long after the decision.
**Expert avoidance:** for a write store you care about, `synchronous=FULL` *"ensures that an operating system crash or power failure will not corrupt the database."* In **WAL mode**, `synchronous=NORMAL` is the documented sweet spot — *"WAL mode is safe from corruption with synchronous=NORMAL"* — but note the precise residual: you can still **lose the last transaction(s)** across power loss (*"Maybe not durable"*), while atomicity/consistency/isolation hold. Durability vs corruption are separate guarantees; pick consciously. (Same source.)

## Technique decisions (what the expert chooses, and why)

### G5 — Composite index column order: lead with the column you filter by, not the "primary" one
A concatenated index is sorted by its leftmost column first, so the database *"can use a concatenated index when searching with the leading (leftmost) columns"* — a 3-column index serves queries on col1, on col1+col2, and on col1+col2+col3, but **not col2 or col3 alone** (*"it cannot use single columns from a concatenated index arbitrarily"*) ([Use The Index, Luke! — Concatenated Keys](https://use-the-index-luke.com/sql/where-clause/the-equals-operator/concatenated-keys)).
**Why it hides:** an index on `(employee_id, subsidiary_id)` *exists* and looks like coverage, so a query filtering only on `subsidiary_id` silently falls back to a full scan — the EXPLAIN, not the schema, tells the truth.
**Expert decision:** order index columns to match the **actual access pattern** — if queries lead with `subsidiary_id`, put it first even at the cost of standalone `employee_id` lookups. The reference's pointed lesson: *"developers must understand application access patterns to define optimal index column order, since external consultants typically lack visibility into how applications actually query."* (Same source.)

### G6 — Adding a column: a constant default is metadata-only; a volatile default rewrites the whole table
On PostgreSQL, `ADD COLUMN` with a **non-volatile** `DEFAULT` evaluates once and stores the value *"in the table's metadata ... making the ALTER TABLE very fast even on large tables."* But a **volatile** default (`clock_timestamp()`), a stored generated column, an identity column, or a constrained domain type *"will cause the entire table and its indexes to be rewritten"* ([PostgreSQL — ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)).
**Why it hides:** the two statements look nearly identical; the volatile one is a multi-minute, fully-blocking rewrite on a big table while the constant one is instant — a trap that only springs at production data volume.
**Expert decision:** prefer a constant default at add-time and backfill volatile/computed values in a separate, batched, non-blocking pass.

## Migration / DDL pitfalls (the blocking-lock class)

### G7 — Most ALTER TABLE forms take an ACCESS EXCLUSIVE lock that blocks ALL reads and writes
*"An ACCESS EXCLUSIVE lock is acquired unless explicitly noted"* for `ALTER TABLE`, and with multiple subcommands *"the lock acquired will be the strictest one required by any subcommand"* — i.e. by default a migration blocks every concurrent reader and writer of that table ([PostgreSQL — ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)).
**Why it hides:** on an empty dev table the lock is held for microseconds; on a hot production table the same statement (especially one forcing a rewrite — see G6) holds the exclusive lock for the whole rewrite, stalling the application.
**Expert avoidance:** know the documented cheaper exceptions and route through them — `ADD FOREIGN KEY` needs only `SHARE ROW EXCLUSIVE`, and `VALIDATE CONSTRAINT` / `SET STATISTICS` / `CLUSTER ON` take only `SHARE UPDATE EXCLUSIVE` (which does not block normal DML). The two-step pattern this enables (add a constraint `NOT VALID`, then `VALIDATE CONSTRAINT` separately) splits the expensive check out of the exclusive-lock window. (Same source.)

### G8 — TRUNCATE and table-rewriting ALTER TABLE are NOT MVCC-safe
PostgreSQL warns that *"Some DDL commands, currently only TRUNCATE and the table-rewriting forms of ALTER TABLE, are not MVCC-safe"* — after such a command commits, a concurrent transaction using an **older snapshot** can see an empty table, producing visible inconsistencies between that table and others ([PostgreSQL — Caveats (MVCC)](https://www.postgresql.org/docs/current/mvcc-caveats.html)).
**Why it hides:** MVCC otherwise gives a transaction a stable snapshot, so engineers assume *all* DDL is snapshot-isolated; this exception breaks that assumption only under concurrent long-running readers.
**Expert avoidance:** do not run `TRUNCATE` / rewriting `ALTER TABLE` while long-lived snapshot transactions (reports, dumps) span the same tables; coordinate the window. Two related catalog caveats from the same page: **Serializable isolation is not supported on hot-standby replicas** (max there is Repeatable Read), and **system-catalog access bypasses the transaction's isolation level**, so a newly created table is visible to concurrent Repeatable Read / Serializable transactions even though its rows are not. (Same source.)

## Vector-index (HNSW) tuning gotchas

### G9 — HNSW recall, build time, and memory are a three-way trade — raising one knob costs another
In Qdrant, the HNSW graph is governed by **`m`** — *"Number of edges per node in the index graph. Larger the value - more accurate the search, more space required"* — and **`ef_construct`** — *"Number of neighbours to consider during the index building. Larger the value - more accurate the search, more time required to build index"* ([Qdrant — Indexing](https://qdrant.tech/documentation/concepts/indexing/)).
**Why it hides:** HNSW is *approximate* (established in foundations), so under-tuned `m`/`ef_construct` does not error — it silently returns lower-recall results, and a top-k that misses the true nearest neighbor looks like a normal answer.
**Expert decision:** treat recall as a tunable you measure, not a given. Raise `m` for accuracy when memory allows; raise `ef_construct` for accuracy when you can afford slower index builds. At query time the search `ef` *"is configured during the search and by default is equal to ef_construct"* — so search-time recall/latency is separately tunable per query. Also consider `full_scan_threshold_kb`: for highly selective filters Qdrant can prefer an exact full scan over HNSW traversal, so filter selectivity is part of the tuning picture. (Same source.) The concrete `m`/`ef`/`ef_construct` values for PRISM's 384-d recall are owner-gated below.

## Verification / how the expert proves it (not "looks fine")

A practitioner does not trust any of the above by reading the schema or the code — they prove it:
- **Index usage (G1, G5):** read the query plan (`EXPLAIN [ANALYZE]`) and confirm an *Index Scan* (not *Seq Scan*) and the expected row counts — the schema having an index proves nothing about whether a given query *uses* it.
- **N+1 (G1):** count emitted statements under a realistic multi-row fixture (SQL echo / statement log), not a single-row test — the bug is in the *count*.
- **Lock/migration cost (G6, G7):** test the DDL against production-scale row counts and watch for a full table rewrite and lock-wait, since the dev-table timing is meaningless.
- **HNSW recall (G9):** measure recall against an exact-search ground truth on a sample, because an approximate index degrades silently.
- **Durability (G4):** decide consciously between corruption-safety and last-transaction-durability; "WAL + NORMAL" is safe from corruption but **can still lose the last commit** on power loss.

This is the database-specific form of PRISM's R12 (fail loud) and R9 (tests verify intent): a database failure mode that does not raise an error — N+1, a missed index, low HNSW recall, a lost-but-not-corrupt last commit — is exactly the silent class that must be *measured*, never assumed.

## Owner-gate (NOT promoted — juliett must verify before any PRISM store relies on these)

The gotchas above are generic CS/software facts confirmed against public docs. The following are deliberately left for juliett's domain/implementation judgment and are **not** asserted as PRISM facts:
- **HNSW `m` / `ef` / `ef_construct` for PRISM's 384-d Qdrant recall** — the speed/accuracy/memory trade is real (G9), but the production values must be **measured on PRISM data**, not copied from the docs; pair with a recall-vs-exact benchmark.
- **Per-store connection-pool sizes** — the HikariCP formula (G2) is a *starting point* for a CPU/disk profile; PRISM's actual core/spindle counts and per-store concurrency are an empirical call. (Note: several PRISM stores are file/JSONL/state-JSON, not pooled-connection RDBMS — the pool gotcha applies only where a real connection pool exists.)
- **Which PRISM migrations risk the blocking-DDL window (G6/G7/G8)** — whether any live PRISM SQLite/Postgres-style migration takes a long exclusive lock, forces a rewrite, or collides with a long snapshot reader is a migration-by-migration audit juliett owns.
- **`synchronous` setting per PRISM SQLite-WAL store (G4)** — the corruption-vs-durability trade is store-specific; whether a given PRISM store can tolerate losing its last commit on power loss is a juliett decision, not a default.
- **Whether PRISM's ORM/query layers can even hit N+1 (G1)** — PRISM's stores are largely direct/embedded, not classic ORM-over-RDBMS; the N+1 pattern applies only where a lazy-loading relationship abstraction is in play. Verify before assuming the gotcha is live.

## Sources (distinct URLs WebFetch-confirmed 2026-06-10)

Official vendor / framework docs (free, high-authority):
1. PostgreSQL — Explicit Locking (Deadlocks): https://www.postgresql.org/docs/current/explicit-locking.html
2. PostgreSQL — Caveats (MVCC: TRUNCATE/ALTER not MVCC-safe, hot-standby, catalog): https://www.postgresql.org/docs/current/mvcc-caveats.html
3. PostgreSQL — ALTER TABLE (ACCESS EXCLUSIVE lock, column-default rewrite): https://www.postgresql.org/docs/current/sql-altertable.html
4. SQLite — PRAGMA synchronous (durability: OFF/NORMAL/FULL, WAL): https://www.sqlite.org/pragma.html
5. SQLAlchemy 2.0 — ORM Relationship Loading (N+1, selectinload/joinedload): https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html
6. Qdrant — Indexing (HNSW m / ef_construct / ef trade-offs): https://qdrant.tech/documentation/concepts/indexing/

Free practitioner reference / community wiki (free, legal):
7. Use The Index, Luke! (Markus Winand) — Concatenated Keys: https://use-the-index-luke.com/sql/where-clause/the-equals-operator/concatenated-keys
8. HikariCP wiki (Brett Wooldridge) — About Pool Sizing: https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing
