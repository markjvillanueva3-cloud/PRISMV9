---
title: Database-Expansion Open Source Atlas — the living "keep-learning" directory for database-systems theory & practice
galaxy: database-expansion
owner_slot: juliett
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every source below was WebFetch-confirmed live, free, and legal on 2026-06-10. Course homepages (CMU 15-445 fall + fall2024, MIT 6.5830, MIT OCW 6.830), the Red Book via its Internet Archive mirror, Use The Index Luke, official docs (PostgreSQL ToC + Indexes chapter, SQLite docs index, Qdrant docs), the RocksDB wiki, the arXiv HNSW paper, and Jepsen analyses were each fetched and their identity/free-access verified. YouTube playlist pages render only footer chrome to WebFetch, so the playlist was confirmed by the page <title> string ('CMU Intro to Database Systems 15-445/645 - Fall 2023') and via the official course page that links it. DROPPED: redbook.io homepage (socket-close then ECONNREFUSED across 2 attempts; replaced by the confirmed Internet Archive mirror) and the bailis.org direct PDF (downloaded but compressed-stream, unparseable to confirm front-matter -> not promoted as primary)."
tags: [database-expansion, juliett, source-atlas, keep-learning, free-courses, free-textbooks, lecture-videos, official-docs, cmu-15445, mit-6830, mit-6-5830, redbook, use-the-index-luke, postgresql-docs, sqlite-docs, qdrant-docs, rocksdb, hnsw, jepsen, living-curriculum]
---

# Database-Expansion Open Source Atlas

The **living-source curriculum** for the **database-expansion** galaxy (owner: **juliett**) — a curated directory of WHERE TO KEEP LEARNING the persistence-layer domain from reputable **free/legal** sources, so PRISM's database knowledge never goes stagnant.

This entry is deliberately **distinct** from its two siblings, which it does not repeat:
- [database-expansion-foundations](database-expansion-foundations.md) — the synthesized *theory* (relational model, ACID/isolation table, B-tree/LSM/HNSW mechanics, WAL invariant, ARIES, CAP, consistency hierarchy).
- [database-expansion-applied-practice](database-expansion-applied-practice.md) — the practitioner *gotchas* (N+1, pool-sizing, deadlock ordering, synchronous=OFF, composite-index order, blocking DDL, HNSW recall tuning).

Here the question is only: **"when juliett (or any chat) needs to go deeper or stay current, which free, reputable, reachable source do they open next?"** Each source below was WebFetch-confirmed live on 2026-06-10; the URL is the proof. A short verified list beats a long fabricated one (R12).

This galaxy is PRISM's persistence spine — **Qdrant (vector/HNSW), AgentDB, SQLite-WAL, JSONL ledgers, state-JSON** — so the directory is biased toward the systems that actually back those stores.

---

## 1. Free college courses (full, reputable, free)

| Source | Verified URL | Teaches | Feeds this galaxy |
|---|---|---|---|
| **CMU 15-445/645 — Intro to Database Systems** (Andy Pavlo, Jignesh Patel) | https://15445.courses.cs.cmu.edu/ | The canonical free DBMS-implementation course: storage, buffer pool, B+tree, concurrency control (2PL / timestamp / MVCC), logging & recovery, query execution & optimization, distributed DBs. | The single best end-to-end map of *how a database is built* — directly grounds the foundations file's isolation/index/WAL spine and tells juliett what each PRISM store is approximating. |
| **CMU 15-445/645 — Fall 2024 instance** (current syllabus + linked lecture playlist) | https://15445.courses.cs.cmu.edu/fall2024/ | Same course, freshest schedule; the page links the public YouTube lecture playlist. | The "is my mental model current?" anchor — re-read the schedule when revisiting concurrency/recovery to catch syllabus evolution. |
| **MIT 6.5830/6.5831 — Database Systems** (formerly 6.830 / 6.814; Michael Cafarella et al.) | https://dsg.csail.mit.edu/6.5830/ | Research-readings-driven graduate DB course: relational algebra, query optimization, transactions, distributed/parallel DBs, NoSQL — primary-paper-based rather than textbook. | The "read the primary papers" complement to CMU's implementation focus; its reading list is a natural feeder into the Red Book (section 2). |
| **MIT OpenCourseWare 6.830 — Database Systems (Fall 2010)** (Madden, Morris, Stonebraker, Curino) | https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/ | Freely downloadable lecture notes, programming assignments, and exams covering the relational model, normalization, query optimization, transactions, distributed transactions, parallel DBs, NoSQL. | The *downloadable archived* version of the MIT course — usable offline/forever; lecture notes + assignments are the deepest free MIT DB artifacts that won't move or expire. |

---

## 2. Free textbooks & curated readings (full text online, free/legal)

| Source | Verified URL | Teaches | Feeds this galaxy |
|---|---|---|---|
| **Readings in Database Systems, 5th Edition ("the Red Book")** — eds. Bailis, Hellerstein, Stonebraker (2015), via Internet Archive | https://archive.org/details/redbook-5th-edition | Opinionated editorial tour of the classic + modern DB research canon (transactions, query optimization, distributed/column/NewSQL, large-scale data). CC BY-NC-ND; free PDF/EPUB/MOBI download. | The "which papers matter and why" map for the whole galaxy; pairs with the MIT 6.5830 reading list. (Note: the redbook.io homepage was unreachable on 2026-06-10 — this Internet Archive mirror is the confirmed-live free copy.) |
| **Use The Index, Luke!** — Markus Winand (free web edition of *SQL Performance Explained*) | https://use-the-index-luke.com/ | Vendor-agnostic SQL indexing from first principles: index anatomy, WHERE-clause/leftmost-prefix rules, joins, clustering, sorting/grouping, pagination — with per-database notes. | The deepest free *indexing* text; directly extends the applied-practice file's composite-index-order and EXPLAIN-the-plan gotchas (G5). The #1 living source for query-performance literacy. |

---

## 3. Lecture-video channels & playlists (free, reputable)

| Source | Verified URL | Teaches | Feeds this galaxy |
|---|---|---|---|
| **CMU Intro to Database Systems (15-445/645) — full lecture playlist, Fall 2023** (CMU Database Group / Andy Pavlo) | https://www.youtube.com/playlist?list=PLSE8ODhjZXjbj8BMuIrRcacnQh20hmY9g | The complete free video lectures matching the CMU 15-445 syllabus — storage through distributed DBs, MVCC, logging/recovery, optimization. | The watch-along companion to source 1; the most reputable free DB-systems video course in existence. (Playlist identity confirmed via page title; the Fall 2024 course page in section 1 also links the current public playlist.) |

> Re-fetch note: YouTube renders to JavaScript, so a WebFetch of a channel/playlist returns only footer chrome. Confirm a playlist by its page `<title>` or, preferably, by following the "Youtube" link from the live CMU course page (which is itself WebFetch-confirmable).

---

## 4. Official docs & standards (free, authoritative, kept current by the vendor)

| Source | Verified URL | Teaches | Feeds this galaxy |
|---|---|---|---|
| **PostgreSQL official documentation (current)** | https://www.postgresql.org/docs/current/ | The full, version-tracked manual: SQL, data types, indexes, full-text, concurrency control, WAL, replication, internals. | The authoritative reference behind the foundations isolation table & WAL invariant and the applied-practice locking/MVCC/DDL gotchas; the gold standard for "how a mature RDBMS actually behaves." |
| **PostgreSQL — Chapter 11: Indexes** | https://www.postgresql.org/docs/current/indexes.html | B-tree/Hash/GiST/SP-GiST/GIN/BRIN, multicolumn & partial & expression indexes, index-only scans, `ORDER BY`, examining index usage. | The deep-dive when choosing/diagnosing an index type for a relational PRISM store; the per-type detail behind foundations §3. |
| **SQLite official documentation index** | https://www.sqlite.org/docs.html | Public-domain docs: file format, WAL mode, query-planner/optimizer overview, PRAGMA reference, datatypes. | PRISM's SQLite-WAL stores live here — WAL semantics, `PRAGMA synchronous` durability, checkpointing, the >1 GB-transaction hazard. The source of truth for the actual embedded engine PRISM runs. |
| **Qdrant official documentation** | https://qdrant.tech/documentation/ | Vector-DB concepts: collections, payloads, indexing, HNSW, quantization, multitenancy, filtering. | PRISM's 384-d embedding recall runs on Qdrant — this is the live reference for HNSW `m`/`ef_construct`/`ef` tuning (applied-practice G9) and quantization trade-offs. |
| **RocksDB wiki (official)** | https://github.com/facebook/rocksdb/wiki | LSM-tree internals, MemTable/WAL, leveled vs universal vs FIFO compaction, SST format, tuning guide, write-stall handling. | The canonical free LSM reference; the deepening path for foundations §3's write-optimized-index material and the "JSONL ledger as degenerate LSM" framing — read before any LSM-engine migration decision. |

---

## 5. Data, archives & primary papers (free, legal)

| Source | Verified URL | Teaches | Feeds this galaxy |
|---|---|---|---|
| **HNSW paper — "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs"** — Malkov & Yashunin (arXiv 1603.09320) | https://arxiv.org/abs/1603.09320 | The original algorithm behind Qdrant/Lucene/Milvus vector indexes: multi-layer navigable-graph construction, greedy search, the `M`/`ef`/`ef_construct` knobs. | The primary source for PRISM's vector-recall layer — read it (free PDF) before tuning or trusting Qdrant HNSW recall; the "approximate = silent miss" caveat in foundations §3 originates here. |
| **Jepsen — analyses** (Kyle Kingsbury) | https://jepsen.io/analyses | Free, rigorous public reports testing real databases/coordination services for consistency & safety violations (replica divergence, data loss, stale reads, read skew, lock conflicts) under partition/failure. | The empirical reality-check on the CAP/consistency hierarchy (foundations §5): how real systems actually break under partitions — the antidote to "we assume it's serializable." |

---

## Keep-fresh cadence

This atlas is **living** — stagnation is the failure mode it exists to prevent. Recommended refresh discipline:

- **Per-semester (≈ twice a year): re-check the moving courses.** CMU 15-445 and MIT 6.5830 publish a new instance each term — re-fetch sections 1 & 3 homepages, bump the `fall20XX` path and the YouTube playlist `list=` id when a newer full term is posted. The course *homepage* (no year) is the stable anchor that always points at the latest.
- **On a database touch / regression: re-verify the relevant official doc.** Before relying on a WAL/isolation/index/HNSW behavior for a PRISM store, open the live vendor doc (PostgreSQL / SQLite / Qdrant / RocksDB) rather than this cached summary — vendors patch behavior between versions (PostgreSQL was at 18.x and SQLite/Qdrant track their own releases on 2026-06-10).
- **Annually: dead-link sweep.** WebFetch every URL in `## Sources`; any that fails twice gets retried once then dropped or replaced with a confirmed mirror (the redbook.io -> Internet Archive swap on 2026-06-10 is the template). A dropped link must never be silently left as a guess.
- **On a new store type entering the galaxy:** if PRISM adds a persistence engine not covered here (e.g. a real LSM engine, a graph DB, a time-series store), add its official-docs row to section 4 and its primary paper (if any) to section 5 — same verify-before-listing rule.
- **Owner gate:** juliett owns promotion of anything *PRISM-specific* learned from these sources into the foundations/applied-practice files; this atlas only points at the public source, it does not assert PRISM internals.

## Sources (distinct URLs WebFetch-confirmed live & free on 2026-06-10)

Free college courses:
1. CMU 15-445/645 Intro to Database Systems (homepage): https://15445.courses.cs.cmu.edu/
2. CMU 15-445/645 Fall 2024 instance: https://15445.courses.cs.cmu.edu/fall2024/
3. MIT 6.5830/6.5831 Database Systems: https://dsg.csail.mit.edu/6.5830/
4. MIT OpenCourseWare 6.830 Database Systems (Fall 2010): https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/

Free textbooks & curated readings:
5. Readings in Database Systems, 5th Edition (Red Book) — Internet Archive: https://archive.org/details/redbook-5th-edition
6. Use The Index, Luke! (Markus Winand): https://use-the-index-luke.com/

Lecture-video playlist:
7. CMU 15-445/645 full lecture playlist (Fall 2023): https://www.youtube.com/playlist?list=PLSE8ODhjZXjbj8BMuIrRcacnQh20hmY9g

Official docs & standards:
8. PostgreSQL documentation (current): https://www.postgresql.org/docs/current/
9. PostgreSQL Chapter 11 — Indexes: https://www.postgresql.org/docs/current/indexes.html
10. SQLite documentation index: https://www.sqlite.org/docs.html
11. Qdrant documentation: https://qdrant.tech/documentation/
12. RocksDB wiki (official): https://github.com/facebook/rocksdb/wiki

Data, archives & primary papers:
13. HNSW paper (arXiv 1603.09320, Malkov & Yashunin): https://arxiv.org/abs/1603.09320
14. Jepsen analyses: https://jepsen.io/analyses

> Dropped / not promoted (2026-06-10): `https://redbook.io/` — unreachable (socket-close, then ECONNREFUSED on retry); replaced by the confirmed Internet Archive mirror (#5). `https://www.bailis.org/papers/redbook-5th-edition.pdf` — downloaded as a valid 356 KB PDF but its compressed streams could not be parsed to confirm front-matter, so it is not promoted as the primary Red Book link; the Internet Archive page (#5) is the verifiable free copy.
