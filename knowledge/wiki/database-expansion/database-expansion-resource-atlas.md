---
title: Database-Expansion Resource Atlas — one-stop hub linking the LOCAL persistence trove + curated video/seminar/data-report sources for the database-systems domain
galaxy: database-expansion
owner_slot: juliett
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL pointers reproduced verbatim from the pre-known store/corpus set and confirmed present on disk on 2026-06-10 (mcp-server/data/state/{BASELINE_INVENTORY,HEALTH_CHECK_REPORT}.json both stat-confirmed; mcp-server/data/vendor-catalog-db/ confirmed with manifest.json owner=juliett schemaVersion 1.0.0 + tables/{vendors,catalog-vendors,sfc-makers}.jsonl + jm-tool-purchases.json). ONLINE/VIDEO half: every source below was WebFetch-confirmed live, free, and legal on 2026-06-10 — CMU 15-445 (Spring 2026 homepage), CMU 15-721 (Fall 2025, via the 302 to www.cs.cmu.edu/~15721-f25/), MIT OCW 6.830 (CC BY-NC-SA 4.0), the CMU 15-445 Fall-2023 YouTube playlist (confirmed by page <title>), the CMU DB Group seminar series (ML⇄DB + linked Vaccination Database Talks), Use The Index Luke (Markus Winand), the Red Book 5th ed via Internet Archive, PostgreSQL 18 Indexes chapter, SQLite WAL doc, Qdrant docs, and the arXiv HNSW paper (Malkov & Yashunin, 1603.09320). No source was promoted unverified; YouTube playlist render returned chrome-only body, so identity was taken from the <title> string per the sibling source-atlas convention."
tags: [database-expansion, juliett, resource-atlas, keep-learning, local-trove, persistence-stores, qdrant, agentdb, sqlite-wal, jsonl, state-json, vendor-catalog-db, lecture-videos, seminars, data-reports, cmu-15445, cmu-15721, mit-6830, redbook, use-the-index-luke, postgresql-docs, sqlite-docs, qdrant-docs, hnsw, one-stop-hub]
---

# Database-Expansion Resource Atlas

The **one-stop resource hub** for the **database-expansion** galaxy (owner: **juliett**) — a single easy-access index that links **every** reputable resource for the persistence-layer domain so a chat jumps straight to what it needs instead of re-deriving or re-searching. Operator directive: *all reputable sources linked for easy access — do not stay stagnant.*

This entry **fuses two halves**:
1. the **LOCAL trove** — the actual stores/corpora this galaxy owns, each linked as *store/corpus + its index* (pathway = the data root plus how you query it); and
2. the **online/video half** — curated YouTube lectures, free seminars/webinars, official docs, and the data-report/primary-paper sources.

It is **distinct** from its sibling [[database-expansion-source-atlas]] (the free-college-course/textbook *curriculum*): the resource-atlas adds the **LOCAL store pointers** + the **video/seminar/data-report** half + the cross-link hub. Where the two overlap on a course (CMU/MIT), the source-atlas is the deep curriculum view and this file is the fast "open it now" pointer.

Every online source below was WebFetch-confirmed live on 2026-06-10 — the URL is the proof. A short verified list beats a long fabricated one (R12).

---

## 1. Local stores & corpora (the trove — store/corpus + its index)

This galaxy is PRISM's **persistence spine**. These are the live, owner-gated artifacts a database-expansion chat reads first. Pathway = the data root **and** the index/manifest that makes it queryable — never re-count, read the manifest.

| Store / corpus | Pathway (root + index) | Role |
|---|---|---|
| **Persistence-store family** — Qdrant (vector/HNSW) · AgentDB · SQLite-WAL · JSONL ledgers · state-JSON | `prism_memory` dispatcher (primary) + per-store engines under `mcp-server/src/engines/database-expansion/`; galaxy brain `mcp-server/src/engines/database-expansion/MEMORY.md` | The five backing stores juliett owns. Atomic-write + `schemaVersion` + migration discipline applies to all. Qdrant is the vector/HNSW substrate; SQLite-WAL is the coordination store; JSONL/state-JSON are the append-only + snapshot ledgers. |
| **State snapshots** — baseline inventory + health | `mcp-server/data/state/BASELINE_INVENTORY.json` (schema-versioned anti-regression baseline) · `mcp-server/data/state/HEALTH_CHECK_REPORT.json` (live store health) | The "is the persistence layer healthy and unregressed?" pair. BASELINE is the snapshot you diff against; HEALTH_CHECK is the current read. Both stat-confirmed present 2026-06-10. |
| **Vendor catalog DB** | `mcp-server/data/vendor-catalog-db/` — `manifest.json` (owner juliett, schemaVersion 1.0.0) + `tables/{vendors,catalog-vendors,sfc-makers}.jsonl` + `tables/jm-tool-purchases.json`; built by `scripts/build-vendor-catalog-db.mjs` | The persisted vendor/procurement corpus (Charlie's VENDOR-NETWORK-MS0, consolidated from gitignored `state/shared/quoting/`). Metadata-only — query via the manifest + tables, never re-OCR. Re-run the builder after Charlie regenerates. |

> **Index discipline:** for each store the *index* is the entry point, not a full scan — read `manifest.json` / `BASELINE_INVENTORY.json` head / the dispatcher action list before loading rows. This is the galaxy's own "search-first" rule.

---

## 2. Curated YouTube + seminars (free lecture video + recorded talks)

| Source | Verified URL | What it gives |
|---|---|---|
| **CMU 15-445/645 — Intro to Database Systems** (full lecture playlist, Fall 2023, Andy Pavlo) | https://www.youtube.com/playlist?list=PLSE8ODhjZXjbj8BMuIrRcacnQh20hmY9g | The canonical free video walkthrough of *how a DBMS is built* — storage, buffer pool, B+tree, concurrency control (2PL/MVCC), logging & recovery, query execution. The video form of the foundations file's index/WAL/isolation spine. |
| **CMU Database Group seminar series** (ML⇄DB + linked Vaccination / Quarantine Database Talks) | https://db.cs.cmu.edu/seminar/ | Free recorded research talks from DB practitioners and academics — the "what are the leaders shipping right now?" current-events feed for the galaxy. Links several past seminar seasons (Vaccination Database Talks 2021–2022) with public recordings. |

---

## 3. Reputable free online + data reports (docs, primary papers, curated readings)

| Source | Verified URL | What it gives |
|---|---|---|
| **CMU 15-445/645 — Intro to Database Systems** (course homepage, current) | https://15445.courses.cs.cmu.edu/ | The course homepage + syllabus that anchors the playlist above; freshest schedule of the DBMS-implementation curriculum. |
| **CMU 15-721 — Advanced Database Systems** (Jignesh Patel, Fall 2025) | https://www.cs.cmu.edu/~15721-f25/ | The *advanced* CMU course: in-memory/column-store/vectorized execution, MVCC internals, modern OLAP — the depth feeder above 15-445, directly relevant to PRISM's vector + WAL stores. |
| **MIT OpenCourseWare 6.830 — Database Systems (Fall 2010)** | https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/ | Freely downloadable (CC BY-NC-SA 4.0) lecture notes, assignments, exams — the archived, never-expiring MIT DB artifact set; relational model, normalization, query optimization, transactions, distributed/parallel/NoSQL. |
| **Readings in Database Systems, 5th Ed. ("the Red Book")** — Bailis, Hellerstein, Stonebraker (2015), Internet Archive mirror | https://archive.org/details/redbook-5th-edition | The "which DB papers matter and why" curated-readings map — free PDF/EPUB/MOBI (CC BY-NC-ND). The data-report/primary-paper backbone for the whole galaxy. |
| **Use The Index, Luke** — Markus Winand (free web edition of *SQL Performance Explained*) | https://use-the-index-luke.com/ | The definitive free, vendor-neutral SQL indexing & tuning guide (Oracle/MySQL/PostgreSQL/SQL Server). Grounds the applied-practice composite-index-order + index-only-scan gotchas. |
| **PostgreSQL official docs — Chapter 11: Indexes** | https://www.postgresql.org/docs/current/indexes.html | Authoritative reference on B-Tree/Hash/GiST/SP-GiST/GIN/BRIN, multicolumn/partial/covering indexes, index-only scans — the standards-grade index source. |
| **SQLite official docs — Write-Ahead Logging (WAL)** | https://www.sqlite.org/wal.html | The authoritative WAL reference (how WAL works, checkpointing, concurrency model, config) — the primary doc for PRISM's SQLite-WAL coordination store. |
| **Qdrant official documentation** | https://qdrant.tech/documentation/ | The vector-search engine docs (collections, payload, HNSW params, quantization, filtering) — the primary doc for PRISM's Qdrant vector store. |
| **HNSW paper** — *Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs*, Malkov & Yashunin (arXiv 1603.09320) | https://arxiv.org/abs/1603.09320 | The primary paper behind every vector index in the galaxy — the algorithm Qdrant implements; the source of truth for ANN recall/build-time trade-offs. |

---

## 4. Cross-links (the sibling wiki layers + galaxy hubs)

- [[database-expansion-foundations]] — the synthesized *theory* (relational model, ACID/isolation, B-tree/LSM/HNSW mechanics, WAL invariant, ARIES, CAP).
- [[database-expansion-source-atlas]] — the free-college-course/textbook *curriculum* (the deep "keep-learning" directory this file points fast into).
- [[database-expansion-applied-practice]] — the practitioner *gotchas* (N+1, pool-sizing, deadlock ordering, synchronous=OFF, composite-index order, HNSW recall tuning).
- [[database-expansion-advanced-techniques]] — the *world-leader strategy* layer.
- [[primary-domain-resource-map]] — the fleet-wide resource map this galaxy plugs into.
- [[prism-methodology-foundations]] — the cross-galaxy methodology base.

---

## 5. Keep-fresh cadence (do not stay stagnant)

- **Re-verify the online half quarterly.** Course homepages roll their year (15-445 Spring 2026, 15-721 Fall 2025, the CMU playlist's Fall-2023 instance); re-fetch each URL and bump the redirect/year if it has moved (15-721 already 302s to a per-year `~/15721-fNN/` host).
- **On any 404 after one retry, DROP the dead source and replace it** with the closest live reputable mirror — never leave a fabricated or dead URL (R12). The Red Book is already the Internet-Archive *mirror* because `redbook.io` was unreachable.
- **Re-sync the LOCAL trove pointers** whenever the store layout changes: re-read `manifest.json` / `BASELINE_INVENTORY.json` after a `schemaVersion` bump, and re-run `scripts/build-vendor-catalog-db.mjs` after Charlie regenerates the quoting corpus.
- **New reputable free source surfaces → add it here** (CMU/MIT instance refresh, a new Qdrant/PostgreSQL/SQLite doc chapter, a new primary ANN/transaction paper). This atlas is a living index, not a one-time dump.

---

## Owner-gate (NOT promoted)

No numeric cutting constant, Cpk, OEE, recall threshold, HNSW `ef`/`M` tuning value, isolation-level default, or any safety/quality threshold is promoted into this atlas. Those remain **owner-gated to juliett** and live only in their canonical homes (`mcp-server/src/physics/constants.ts`, the per-store engines, and the store manifests). This file links the **method and source**; the **number** stays gated (R12). Treat any number you need from a linked source as a starting reference to validate against PRISM's own constants — never inline it here.

---

## Sources

LOCAL (reproduced verbatim, confirmed on disk 2026-06-10):
- `mcp-server/data/state/BASELINE_INVENTORY.json` — schema-versioned anti-regression baseline (stat-confirmed)
- `mcp-server/data/state/HEALTH_CHECK_REPORT.json` — live store health (stat-confirmed)
- `mcp-server/data/vendor-catalog-db/` — `manifest.json` (owner juliett, schemaVersion 1.0.0) + `tables/{vendors,catalog-vendors,sfc-makers}.jsonl` + `tables/jm-tool-purchases.json` (confirmed)
- Persistence-store family (Qdrant/AgentDB/SQLite-WAL/JSONL/state-JSON) via `prism_memory` + `mcp-server/src/engines/database-expansion/` (galaxy brain MEMORY.md)

ONLINE / VIDEO (each WebFetch-confirmed live, free, legal on 2026-06-10):
- CMU 15-445/645 homepage — https://15445.courses.cs.cmu.edu/
- CMU 15-445/645 lecture playlist (Fall 2023) — https://www.youtube.com/playlist?list=PLSE8ODhjZXjbj8BMuIrRcacnQh20hmY9g
- CMU 15-721 Advanced Database Systems (Fall 2025) — https://www.cs.cmu.edu/~15721-f25/
- CMU Database Group seminar series — https://db.cs.cmu.edu/seminar/
- MIT OpenCourseWare 6.830 (Fall 2010, CC BY-NC-SA 4.0) — https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/
- Readings in Database Systems 5th ed. (Red Book, Internet Archive) — https://archive.org/details/redbook-5th-edition
- Use The Index, Luke (Markus Winand) — https://use-the-index-luke.com/
- PostgreSQL official docs, Ch. 11 Indexes — https://www.postgresql.org/docs/current/indexes.html
- SQLite official docs, Write-Ahead Logging — https://www.sqlite.org/wal.html
- Qdrant official documentation — https://qdrant.tech/documentation/
- HNSW paper, Malkov & Yashunin (arXiv 1603.09320) — https://arxiv.org/abs/1603.09320
