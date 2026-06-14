---
title: Dormant-Data Foundations — data lifecycle, storage tiering, garbage collection, orphan detection, retention + reclamation
galaxy: dormant-data
owner_slot: victor
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: CS/storage foundations WebFetch-confirmed against free/legal primary sources (MIT OpenCourseWare 6.172 CC-BY-NC-SA, NIST SP 800-88 csrc.nist.gov gov-report, and well-referenced encyclopedic articles on tracing GC, mark-compact, reference counting, memory hierarchy, cache-replacement, hierarchical storage management, working set, dangling pointers, memory leaks, data retention). Each theory claim is mapped to how the dormant-data galaxy uses it; storage/GC theory is established CS literature asserted with citation. Safety/security disposal thresholds are NOT promoted to operational policy here (Owner-gate).
tags: [dormant-data, data-lifecycle, garbage-collection, mark-sweep, mark-compact, reference-counting, hot-cold-tiering, hierarchical-storage-management, working-set, locality, cache-replacement, orphan-detection, dangling-pointer, memory-leak, data-retention, media-sanitization, reclamation, NIST, MIT-OCW]
---

The dormant-data galaxy (owner: victor) is PRISM's data-lifecycle and reclamation brain: it tracks which fleet artifacts are HOT (actively read/written), which have gone COLD (untouched), which are ORPHANED (allocated but unreachable from any live consumer), and which are DEAD (safe to reclaim). The fleet already lives this problem in practice — the tmp-orphan janitor reclaimed ~19.24 GB of dead atomic-write tmp files (commit `87454e9cf`), and a fail-OPEN read once clobbered the 33,639-entry tribal brain (`a3e6d3ca9`). The classical CS that grounds this work is the operating-systems / memory-management / garbage-collection literature: the same algorithms that decide which memory page to evict, which heap object is dead, and which file tier to demote are the algorithms a dormant-data ledger should reason with. This entry establishes that grounding from free/legal sources.

## 1. The memory/storage hierarchy + locality (why "hot" and "cold" exist at all)
The storage hierarchy is ordered fastest/smallest → slowest/largest: processor registers + CPU cache (internal) → main memory (RAM) → on-line mass storage (SSD/HDD) → off-line bulk/archive storage, with an inverse relationship between speed and capacity at each level ("each member is typically smaller and faster than the next highest member"). Its effectiveness rests on **locality of reference**: *temporal* (recently accessed data is likely needed again soon) and *spatial* (data near a recent access is likely needed next) [Memory hierarchy, Wikipedia — WebFetch-confirmed].
**Galaxy use:** "hot vs cold" is not a metaphor — it is the hierarchy's tiering axis. The dormant-data ledger classifies an artifact's temperature from its access-recency (temporal locality), exactly as the OS classifies a page.

## 2. Hot/cold tiering: Hierarchical Storage Management (the production pattern)
HSM is "a data storage and data management technique that automatically moves data between high-cost and low-cost storage media." Frequently accessed (hot) files stay on warm/fast tiers; rarely used (cold) files migrate to cold/slow tiers, and accessing cold data returns it to faster storage. The motivation is economics — fast storage costs far more per byte, so the bulk of enterprise data lives on slower devices and is copied up only when needed. Migration decisions use policies such as **Least Recently Used (LRU)**, Size-Temperature Replacement, and heuristic thresholds [Hierarchical storage management, Wikipedia — WebFetch-confirmed].
**Galaxy use:** the dormant-data demote/recall loop IS HSM applied to fleet artifacts (graph sidecars, embed indexes, transcripts). An age- or LRU-based migration rule is the canonical, literature-backed policy — not an ad-hoc invention.

## 3. The eviction policies (which cold thing to demote first)
Cache-replacement policies keep "recent or often-used data items in memory locations which are faster... to access." A **cache hit** finds the item in the fast tier; a **cache miss** must fall back to slower storage. **LRU** discards the least-recently-used (coldest by recency) item first; **LFU** counts access frequency and discards the least-frequently-used item first. Items not accessed recently/frequently are "cold" eviction candidates; hot items are retained — the central principle of both policies. There is a trade-off between high hit ratio (detailed tracking) and low latency (simpler, faster bookkeeping) [Cache replacement policies, Wikipedia — WebFetch-confirmed].
**Galaxy use:** when the ledger must pick WHICH cold artifact to demote/reclaim under pressure, LRU (recency) and LFU (frequency) are the two grounded ranking functions — and the hit/miss model quantifies the cost of demoting something that gets recalled.

## 4. The working set (the formal hot-set boundary)
Peter Denning's working set **W(t, τ)** is "the collection of information referenced by the process during the process time interval (t−τ, t)" — i.e. the pages touched in the last τ window. Pages inside W are hot and should stay resident; pages outside W are cold candidates for eviction. Keeping only the working set resident prevents **thrashing** (excessive paging that degrades performance) [Working set, Wikipedia — WebFetch-confirmed].
**Galaxy use:** W(t, τ) gives the ledger a *principled, tunable* hot/cold cutoff — choose a window τ (e.g. 7 days of fleet activity), and anything not referenced within it is dormant by definition, rather than a hard-coded magic age.

## 5. Reachability + tracing GC (the orphan/dead-data core)
Tracing garbage collection classifies objects by **reachability**: an object is *reachable* (live) if referenced directly or indirectly through a chain from root objects (stack/globals); otherwise it is *dead* (unreachable) and eligible for reclamation. **Mark-and-sweep** is two-phase: the *mark* phase traverses from the root set marking all reachable objects "in-use"; the *sweep* phase scans memory deallocating unmarked objects. The **tri-color** abstraction (white = collection candidate, grey = reachable-but-unscanned, black = reachable-with-no-white-references) maintains the invariant that no black object points to a white one, making collection safe. **Stop-the-world** collection halts execution during collection (simpler); **incremental** collection runs in phases between execution (shorter pauses, lower throughput) [Tracing garbage collection, Wikipedia — WebFetch-confirmed].
**Galaxy use:** "orphan data" is precisely an *unreachable* artifact — one with no live consumer/edge. A dormant-data orphan audit is a mark phase over the fleet graph (roots = dispatchers/skills/active engines); anything unmarked is an orphan candidate. The tri-color invariant is the correctness condition that stops the audit from reaping something still in use mid-write.

## 6. The generational hypothesis (where to look for dead data first)
Generational GC is based on the **generational hypothesis**: "most recently created objects are also those most likely to become unreachable quickly" (most objects die young). Young-generation objects are therefore collected frequently and cheaply; older objects are collected rarely, reducing overhead [Tracing garbage collection, Wikipedia — WebFetch-confirmed].
**Galaxy use:** a dormant-data sweep should weight scanning toward *recently created* short-lived artifacts (tmp files, staging dirs, one-shot ledgers) — that is where dead data concentrates, matching the tmp-orphan janitor's age-based sweep — and avoid burning cycles re-scanning long-lived stable corpora every pass.

## 7. Reference counting + its cycle blind spot (the cheap-but-incomplete detector)
Reference counting has each object track "the number of references referring to it"; when the count reaches zero the object is *immediately* and incrementally reclaimed — no long collection pause. Its critical limitation: the naive algorithm "can't handle reference cycles" — objects that refer to each other keep nonzero counts forever and are never reclaimed even though the whole cycle is garbage [Reference counting, Wikipedia — WebFetch-confirmed].
**Galaxy use:** counting inbound edges to an artifact is the cheapest orphan signal (0 inbound = orphan), but the cycle blind spot is the warning: two mutually-referencing artifacts (e.g. A indexes B, B back-points A) can both be dead yet show count > 0. The ledger needs a tracing/reachability pass (§5) — not just edge counts — to catch dead cycles.

## 8. Compaction (reclaiming without fragmenting)
The **mark-compact** algorithm reclaims unreachable memory by marking live objects (mark-sweep style) then *compacting* — shifting live objects together to eliminate the fragmentation left by dead objects and create contiguous free space. The central difficulty is pointer fix-up: relocating an object requires updating all pointers to it [Mark–compact algorithm, Wikipedia — WebFetch-confirmed].
**Galaxy use:** after a sweep removes dead artifacts, the surviving live set is fragmented (holes in an index/jsonl). Mark-compact is the model for *rewriting a corpus densely* — and its pointer-fixup hazard is the exact reason a compaction of, say, an offset-indexed jsonl must update the offsets atomically or torn references result.

## 9. Orphan vs dangling vs leak (the failure-mode taxonomy)
Two failure modes are distinct and both relevant. A **dangling pointer** points to memory already freed/deallocated — an *active hazard* (use causes corruption, info leaks, or faults). A **memory leak** is allocated memory the program no longer needs but never releases; the memory is orphaned/unreachable yet not reclaimed — *passive waste* that causes gradual resource exhaustion (thrashing, out-of-memory, system-wide degradation) [Dangling pointer + Memory leak, Wikipedia — WebFetch-confirmed].
**Galaxy use:** these name two real dormant-data bug classes the fleet has hit. *Leak* = the tmp-orphan accumulation (allocated, unreachable, never freed → ~19 GB wasted). *Dangling* = a consumer reading an artifact after it was reclaimed/clobbered (the fail-OPEN tribal-brain clobber class). A safe reclaimer must guarantee no live reference dangles before it frees — the same ordering discipline GC enforces.

## 10. Data retention (lifecycle policy: how long before "dead")
A data retention policy is "a recognized and proven protocol within an organization for retaining information for operational use" whose objectives are to preserve information for future use, organize it for retrieval, and **dispose of information no longer needed**. Retention periods are explicit timeframes after which data is deleted; an effective policy includes permanent deletion (including the crypto-erase pattern: encrypt at rest, then delete the key after the retention period) [Data retention, Wikipedia — WebFetch-confirmed].
**Galaxy use:** the temperature/reachability signals (§1–§9) decide if data is *dormant*; a retention policy decides if dormant data is *due for disposal*. The dormant-data ledger should carry a per-class retention period so "cold for N days" becomes an auditable disposal trigger, not a judgment call.

## 11. Reclamation done safely: media sanitization (gov spine)
NIST SP 800-88 Rev. 1 defines **media sanitization** as "a process that renders access to target data on the media infeasible for a given level of effort," letting organizations decide how to sanitize based on the data's confidentiality so media can be safely reused or disposed of [NIST SP 800-88 Rev. 1, csrc.nist.gov — WebFetch-confirmed; the Clear/Purge/Destroy category detail lives in the full PDF and is NOT asserted here — see Owner-gate].
**Galaxy use:** reclamation is not just "unlink the file." For any artifact carrying customer/quote/PII data (JM Die financials, intake), disposal must be sanitization-grade. This source is the authority the galaxy points at — but the specific method per data class is operator policy (Owner-gate).

## 12. Free / legal course + corpus anchor
MIT OpenCourseWare **6.172 Performance Engineering of Software Systems** (Leiserson & Shun, Fall 2018) is freely shared under a Creative Commons license (CC BY-NC-SA 4.0) and its syllabus explicitly covers **caching optimizations** alongside performance analysis, algorithmic techniques, instruction-level optimizations, parallel programming, and scalable systems [MIT OCW 6.172 syllabus — WebFetch-confirmed].
**Galaxy use:** a free, legally reusable deep-dive corpus for the cache/locality/tiering theory in §1–§4 — appropriate for feeding the academy/NN corpora when the dormant-data tiering modules need worked examples.

## Owner-gate (NOT promoted)
These are deliberately left for victor (owner) + operator, NOT asserted as live policy by this foundations entry:
- **Concrete disposal methods per data class.** NIST SP 800-88's Clear/Purge/Destroy decision matrix is in the full PDF (not confirmed on the landing page here) and the right method for JM Die customer/quote/PII artifacts vs disposable tmp data is an operator policy call. Do not auto-reap PII-bearing artifacts on a temperature signal alone.
- **Retention periods.** The numeric retention windows in §10 are jurisdiction/sector examples, not PRISM's. The per-artifact-class retention period (how many cold days = due-for-disposal) must be set by the operator, then the ledger can enforce it.
- **Working-set window τ and eviction policy choice.** Whether the hot/cold cutoff is LRU, LFU, or working-set-by-window, and the τ value, are tuning decisions to validate against live fleet access traces before any auto-demote/auto-reap fires.
- **Reap autonomy.** A safe reclaimer must prove no live reference dangles (§9) before freeing — the fail-OPEN clobber and dangling-read classes show this is load-bearing. Auto-reap stays advisory until a reachability (tracing, not just ref-count) gate is wired.

## Sources (distinct URLs WebFetch-confirmed for this entry, 2026-06-10)
- Memory hierarchy — https://en.wikipedia.org/wiki/Memory_hierarchy
- Hierarchical storage management — https://en.wikipedia.org/wiki/Hierarchical_storage_management
- Cache replacement policies — https://en.wikipedia.org/wiki/Cache_replacement_policies
- Working set — https://en.wikipedia.org/wiki/Working_set
- Tracing garbage collection — https://en.wikipedia.org/wiki/Tracing_garbage_collection
- Reference counting — https://en.wikipedia.org/wiki/Reference_counting
- Mark–compact algorithm — https://en.wikipedia.org/wiki/Mark%E2%80%93compact_algorithm
- Dangling pointer — https://en.wikipedia.org/wiki/Dangling_pointer
- Memory leak — https://en.wikipedia.org/wiki/Memory_leak
- Data retention — https://en.wikipedia.org/wiki/Data_retention
- NIST SP 800-88 Rev. 1, Guidelines for Media Sanitization (gov-report) — https://csrc.nist.gov/pubs/sp/800/88/r1/final
- MIT OpenCourseWare 6.172 Performance Engineering of Software Systems, Fall 2018 (free course, CC BY-NC-SA) — https://ocw.mit.edu/courses/6-172-performance-engineering-of-software-systems-fall-2018/pages/syllabus/

## Cross-refs
- Galaxy memory: `mcp-server/src/engines/dormant-data/MEMORY.md` (dormant/orphan-data ledger, victor)
- Fleet precedent: tmp-orphan janitor (commit `87454e9cf`, ~19.24 GB reclaimed); fail-OPEN tribal-brain clobber (commit `a3e6d3ca9`) — the dangling/leak failure modes in §9, observed live.
