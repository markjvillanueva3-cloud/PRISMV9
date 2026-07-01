---
title: Dormant-Data Open Source Atlas — the living-source curriculum for GC + storage-lifecycle (where to keep learning, free/legal)
galaxy: dormant-data
owner_slot: victor
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every source below was WebFetch-confirmed live, free, and legal on 2026-06-10: OSTEP free textbook (pages.cs.wisc.edu, 'free in PDF form'), CMU 15-445 Fall 2023 ARCHIVED schedule (15445.courses.cs.cmu.edu — publicly links slides+notes+video; the CURRENT-semester site gates videos to CMU students, so the archive is the free entry point), the CMU Database Group YouTube playlist for 15-445 Fall 2023 (title served by youtube.com), the Garbage Collection Handbook online bibliography (gchandbook.org, ~3,400 continually-updated entries), the Oracle Java SE 17 HotSpot GC Tuning Guide (docs.oracle.com), PostgreSQL routine-vacuuming + VACUUM command docs (postgresql.org), and the Linux kernel Memory-Management Concepts doc (docs.kernel.org). One candidate was DROPPED: the MIT OCW 6.172 lecture-slides subpage redirect-looped (>10 redirects) — not listed. This atlas is the KEEP-LEARNING DIRECTORY: distinct from dormant-data-foundations.md (theory) and dormant-data-applied-practice.md (gotchas) — it lists WHERE to keep the domain knowledge fresh, not the theory itself. Free/legal sources ONLY; no paywalled, no LibGen/SciHub. Cadence + curation are advisory (Owner-gate)."
tags: [dormant-data, open-source-atlas, living-source, keep-learning, garbage-collection, storage-lifecycle, ostep, cmu-15-445, andy-pavlo, gc-handbook, postgresql-vacuum, mvcc, java-gc-tuning, linux-mm-reclaim, free-courses, free-textbooks, official-docs, lecture-videos]
---

This is the LIVING-SOURCE curriculum for the dormant-data galaxy (owner: victor) — a curated, kept-fresh directory of WHERE TO KEEP LEARNING the garbage-collection + storage-lifecycle domain from reputable FREE/LEGAL sources, so the galaxy's knowledge never goes stagnant.

It is deliberately DISTINCT from its two siblings — read those first:
- `dormant-data-foundations.md` — the synthesized THEORY (reachability, mark-sweep, HSM tiering, working set, retention). This atlas does not re-derive it.
- `dormant-data-applied-practice.md` — the practitioner GOTCHAS (MVCC premature-reclaim, unlink-while-open, TOCTOU, cache pollution, crypto-shred key survival). This atlas does not re-list those.

What this entry adds: the **directory of sources you return to** — free college courses, free textbooks, reputable lecture-video playlists, official docs, and a continually-updated research bibliography — each mapped to the part of THIS galaxy it feeds (orphan/reachability detection, hot/cold tiering, safe reclamation, retention/disposal). Every link below was WebFetch-confirmed reachable + free on 2026-06-10.

---

## 1. Free college courses (recorded + materials)

### CMU 15-445/645 Intro to Database Systems — Andy Pavlo (archived Fall 2023, free slides + notes + video)
- URL (schedule, public): https://15445.courses.cs.cmu.edu/fall2023/schedule.html
- URL (lecture videos, public playlist): https://www.youtube.com/playlist?list=PLSE8ODhjZXjbj8BMuIrRcacnQh20hmY9g
- **Teaches:** database storage architecture, buffer-pool management, and — most relevant here — **transaction reclamation under MVCC**: why a deleted/updated row version is not immediately reclaimable, dead-tuple cleanup, and the cost of never reclaiming. Lectures explicitly cover "Database Storage" and "Concurrency Control Theory."
- **Feeds:** the galaxy's **safe-reclamation** core. The MVCC "don't free a version still visible to a live snapshot" rule is the exact analogue of the fleet's dangling-read failure class (foundations 9, applied-practice 2.1). This is the canonical, video-taught grounding for the reclaim gate.
- **Note on freshness:** the CURRENT-semester 15-445 site gates lecture videos to CMU students (verified 2026-06-10). The ARCHIVED Fall-2023 schedule above is the free, public entry point — it links slides, written notes, AND the public YouTube playlist per lecture. Re-point this row at a newer archived semester as Pavlo publishes one (see Keep-fresh cadence).

---

## 2. Free textbooks (full text, legal)

### OSTEP — Operating Systems: Three Easy Pieces (Arpaci-Dusseau, free PDF)
- URL: https://pages.cs.wisc.edu/~remzi/OSTEP/
- **Teaches:** the OS memory-management spine. Confirmed free ("This book is and will always be free in PDF form"). Directly relevant chapters: **Ch.17 Free Space Management** (allocators, fragmentation, coalescing), **Ch.21-22 Swapping: Mechanisms / Policies** (page eviction, the policy layer behind LRU/working-set), Ch.18-20 Paging/TLB/page-tables.
- **Feeds:** the galaxy's **hot/cold tiering + free-space reclamation** layer. Ch.17 is the worked-example authority for compacting/coalescing a fragmented store after a sweep (foundations 8 mark-compact applied to a real allocator); Ch.22 is the policy authority behind the eviction-ranking functions the ledger uses to choose which cold artifact to demote.

### The Garbage Collection Handbook — online bibliography (Jones, Hosking, Moss)
- URL: https://gchandbook.org/
- **Teaches:** the definitive GC reference. The book itself is a paid publication (NOT linked here — paywall), but the site hosts a **free, continually-updated online bibliography of ~3,400 GC-related publications** ("It contains abstracts for some entries and URLs or DOIs for most of the electronically available ones, and is continually being updated") — searchable and exportable (BibTeX/PS/PDF), with each entry pointing at the (often free) primary paper.
- **Feeds:** the galaxy's **reference-counting-vs-tracing literature** depth. When the orphan-detector needs the authoritative paper on cycle collection, incremental/concurrent collection, or generational GC, this living bibliography is the curated index to find the free primary source — rather than re-deriving from memory. This is the single best "keep-learning" anchor for the GC-theory half of the galaxy because it self-refreshes.

---

## 3. Lecture-video channels / playlists (reputable, free)

### CMU Database Group on YouTube — Andy Pavlo lectures
- URL (15-445 Fall 2023 playlist, confirmed): https://www.youtube.com/playlist?list=PLSE8ODhjZXjbj8BMuIrRcacnQh20hmY9g
- **Teaches:** full recorded database-systems lectures, free, no login. The storage + MVCC + reclamation lectures are the video form of section 1 above.
- **Feeds:** the same safe-reclamation core, in lecture-video form for the academy/NN video-corpus pipeline. Pair with the archived schedule's slides/notes for the readable form.
- **Note:** the channel publishes a new public playlist roughly per semester for both 15-445 (intro) and 15-721 (advanced). Use the archived-schedule page (section 1) to resolve the exact current public playlist URL rather than guessing one — playlist IDs change per offering.

---

## 4. Official docs and standards (the authoritative living references)

### PostgreSQL — Routine Vacuuming (official docs)
- URL: https://www.postgresql.org/docs/current/routine-vacuuming.html
- **Teaches:** production MVCC dead-tuple reclamation, verbatim: "an UPDATE or DELETE of a row does not immediately remove the old version of the row... the row version must not be deleted while it is still potentially visible to other transactions. But eventually... the space it occupies must then be reclaimed... to avoid unbounded growth of disk space requirements." Also the XID-wraparound deadline (reclamation has a schedule, not just a budget).
- **Feeds:** the galaxy's **safe-reclamation + "not-reclaiming-is-also-a-failure"** rules (applied-practice 2.1 and 4.1). The `/docs/current/` path always tracks the newest stable PostgreSQL release, so this URL self-freshens.

### PostgreSQL — VACUUM command reference (official docs)
- URL: https://www.postgresql.org/docs/current/sql-vacuum.html
- **Teaches:** the operator interface to reclamation — "VACUUM reclaims storage occupied by dead tuples," plain VACUUM (mark-space-reusable, concurrent) vs VACUUM FULL (compacting rewrite, exclusive lock), and autovacuum.
- **Feeds:** the galaxy's **compaction vs in-place-reclaim** design choice — the real-world distinction between "mark space reusable" (cheap, non-blocking) and "rewrite densely" (expensive, exclusive) that the ledger's demote/compact passes must respect (foundations 8; applied-practice 5.2 throttling).

### Oracle Java SE 17 — HotSpot Virtual Machine GC Tuning Guide (official docs)
- URL: https://docs.oracle.com/en/java/javase/17/gctuning/introduction-garbage-collection-tuning.html
- **Teaches:** how a production runtime actually tunes tracing GC — generational scavenging + aging, parallel vs concurrent collection, compaction for contiguous free space, and the trade-offs between collectors (Serial, G1, etc.). The living-vendor view of the theory in foundations 5-8.
- **Feeds:** the galaxy's **tracing/reachability + generational** design. The generational hypothesis (scan young/short-lived artifacts first — tmp/staging) and the throughput-vs-pause-time trade are stated here as engineering knobs, which is how the dormant-data sweep should be scheduled (incremental + throttled, applied-practice 5.2).

### Linux kernel — Memory Management Concepts overview (official kernel docs)
- URL: https://docs.kernel.org/admin-guide/mm/concepts.html
- **Teaches:** how the kernel itself reclaims memory: page cache, the `kswapd` async scanner, **asynchronous vs synchronous reclaim**, dirty-page writeback before reuse, and direct reclaim under pressure — "The process of freeing the reclaimable physical memory pages and repurposing them is called reclaim."
- **Feeds:** the galaxy's **pressure-driven reclamation under a live workload**. The async/throttled `kswapd` model (reclaim in the background, escalate to synchronous direct reclaim only at critical thresholds) is the exact pattern the dormant-data sweep should follow so it never starves the 26 live slots (applied-practice 5.2; fleet-reaper/memory-monitor coordination).

---

## 5. Keep-fresh cadence

This atlas is a LIVING directory — it rots if left alone. Suggested re-validation cadence (advisory; tune at Owner discretion):

- **Per quarter (or on a galaxy-buildout pass):** WebFetch every URL in the Sources list. Any 404 / redirect-loop / paywall-flip → DROP it (never guess a replacement) and note the drop. A short verified list beats a long stale one (R12).
- **Per semester:** re-resolve the CMU 15-445 row. The current-semester site gates videos; the ARCHIVED schedule for the most recent completed semester is the free entry point. Re-point the schedule URL + the YouTube playlist URL at the newest archived offering Pavlo has published, resolving the playlist ID FROM the archived schedule page (do not hardcode a guessed playlist ID).
- **On a fleet reclaim incident:** when the galaxy hits a new reclamation failure in the wild (a new clobber/leak/dangling-read class), check the GC Handbook bibliography (section 2) for the primary paper on that failure mode and add a mapped source row here rather than re-deriving.
- **`/docs/current/` URLs self-fresh:** the PostgreSQL and (major-version-pinned) Oracle/kernel docs URLs track upstream; bump the Java/kernel major version in the path when the galaxy's reference platform moves (e.g. Java 17 -> a newer LTS).
- **Drop discipline:** if a fetch fails, retry once, then DROP. Do NOT fabricate a substitute URL or a course number. Record the drop count in this entry's verification_method.

---

## Sources (distinct URLs WebFetch-confirmed for this entry, 2026-06-10)
- OSTEP, Operating Systems: Three Easy Pieces (free textbook; Ch.17 Free Space Management, Ch.22 Swapping Policies) — https://pages.cs.wisc.edu/~remzi/OSTEP/
- CMU 15-445/645 Intro to Database Systems, Fall 2023 archived schedule (free public slides + notes + video links) — https://15445.courses.cs.cmu.edu/fall2023/schedule.html
- CMU Database Group YouTube — 15-445 Fall 2023 lecture playlist (Andy Pavlo, free) — https://www.youtube.com/playlist?list=PLSE8ODhjZXjbj8BMuIrRcacnQh20hmY9g
- The Garbage Collection Handbook — free online GC bibliography (~3,400 continually-updated entries, links to free primary papers) — https://gchandbook.org/
- Oracle Java SE 17 HotSpot Virtual Machine GC Tuning Guide (generational/parallel/concurrent/compaction; collector trade-offs) — https://docs.oracle.com/en/java/javase/17/gctuning/introduction-garbage-collection-tuning.html
- PostgreSQL routine vacuuming (official docs; MVCC dead-tuple reclamation, premature-reclaim rule, XID-wraparound deadline) — https://www.postgresql.org/docs/current/routine-vacuuming.html
- PostgreSQL VACUUM command reference (official docs; reclaim-space vs VACUUM FULL compaction, autovacuum) — https://www.postgresql.org/docs/current/sql-vacuum.html
- Linux kernel Memory Management Concepts (official kernel docs; reclaim, kswapd async vs synchronous, page-cache writeback) — https://docs.kernel.org/admin-guide/mm/concepts.html

### Dropped (unreachable / not re-listed, 2026-06-10)
- MIT OCW 6.172 lecture-slides-and-readings subpage — redirect-looped (>10 redirects) on WebFetch; dropped per the retry-once-then-drop rule. (The 6.172 syllabus is reachable and is already cited in dormant-data-foundations.md, so it is not duplicated in this atlas.)

## Cross-refs
- Theory layer (read first): `knowledge/wiki/dormant-data/dormant-data-foundations.md`
- Practitioner layer (read first): `knowledge/wiki/dormant-data/dormant-data-applied-practice.md`
- Galaxy memory: `mcp-server/src/engines/dormant-data/MEMORY.md` (dormant/orphan-data ledger, victor)
- Fleet precedent the curriculum maps onto: tmp-orphan janitor `87454e9cf` (~19.24 GB reclaimed); fail-OPEN tribal-brain clobber `a3e6d3ca9`; tribal index V8 512 MiB string-cap `182788232a`.
