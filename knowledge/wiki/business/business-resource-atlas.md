---
title: Business Resource Atlas — one-stop easy-access index of every LOCAL trove + curated video/seminar + reputable free-online resource for the business galaxy
galaxy: business
owner_slot: hotel
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: LOCAL store/corpus pointers reproduced verbatim from the canonical CLAUDE.md / vendor-catalog-db pointers and confirmed present on disk (paths stat-checked 2026-06-10). Every YouTube / seminar / online / data-report URL below was individually WebFetched on 2026-06-10 and confirmed to RESOLVE (HTTP 200) with on-topic content; URLs returning 403/404 or thin bot-blocked bodies after one retry were DROPPED, not listed. SPA/JS-rendered pages (YouTube channel bodies, OpenStax catalog shell) were confirmed via a correct server-side page title plus, for OpenStax, a deep content chapter page. This atlas verifies that each LINK is live + relevant; it asserts NO numeric/benchmark/constant value inside any linked source — those stay owner-gated to hotel + constants.ts.
tags: [business, resource-atlas, local-trove, youtube, seminars, free-online, open-data, erp, accounting, operations-management, theory-of-constraints, lean, keep-fresh, easy-access]
---

# Business Resource Atlas

**One-stop, easy-access index** for the **business** galaxy (ERP / accounting / operations management / quoting-business / capacity / TOC / lean). It links — in one hop — every resource a chat in this galaxy should reach for: the **LOCAL** stores and corpora on disk, the curated **video + free seminar** half, and the reputable **free-online + data-report** half. The point is *non-stagnant easy access*: jump straight to the trove or the live source, never re-derive from scratch.

**Scope distinction (R8 — do not duplicate the siblings):**
- This atlas is **DISTINCT from [[business-source-atlas]]** — that one is the curated free-college-course / open-textbook *curriculum*. This resource-atlas **fuses the LOCAL trove pointers** (the on-disk half, absent from the source-atlas) **with the video/seminar + data-report half** and a one-stop cross-link hub.
- [[business-foundations]] verifies page-level *method facts* (the OEE identity, predetermined-overhead, TOC five steps). This atlas points at *where to pull material*, not a single fact.
- [[business-applied-practice]] holds the gotchas; [[business-advanced-techniques]] holds world-leader strategy. This atlas is the access layer beneath all of them.

**Honesty boundary (R12):** every URL here was fetched and confirmed live + on-topic on 2026-06-10. A live link does NOT make any number inside it "verified" — derived dollar rates, control limits, OEE/Cpk targets, and worked-example numbers remain owner-gated to hotel (see `## Owner-gate (NOT promoted)`).

---

## Local stores + corpora (the on-disk trove — pathway = store + its index)

These are the pre-known LOCAL resources for this galaxy. Reproduced verbatim from the canonical pointers; each is a *store/corpus + its own index*, so a chat reads the index first, then the store — never re-OCR or re-enumerate.

- **JM Die business + financial records** — `JM DIE/` — the canonical test-shop archive root; business and financial records (orders, customers 100+, machine/program corpus, in-house procurement history). Pathway: the directory root + `mcp-server/src/data/jm-die-profile.ts` (the profile/index, source of truth for counts) + `prismSelfAwarenessEngine.getJMDieCustomerPath()` for direct customer-path resolution. Never hardcode counts — read the profile.
- **JM procurement / vendor catalog** — `mcp-server/data/vendor-catalog-db/` — the persisted vendor-catalog corpus (Charlie's VENDOR-NETWORK-MS0): vendors + catalog-vendors + SFC-maker pointers + JM procurement tool-spend. Pathway: `manifest.json` + `README.md` (the index — carries re-derived counts + schema version) + `tables/` (the store) + `EXTRACTION-ROUTING.json`. Metadata only; regenerate with `node scripts/build-vendor-catalog-db.mjs`. Counts live in the README/manifest — read them, do not copy here.
- **prism_business dispatcher domain data** — the `prism_business` MCP dispatcher is this galaxy's primary execution + domain-data surface (ERP / HR / accounting / CRM / quote-to-ship actions). Pathway: `DISPATCHER_DIGEST.md` (action-count index) or `prism_session:dispatcher_map_compact` → then invoke the specific `prism_business` action rather than inlining logic. Engine home: `mcp-server/src/engines/business/` (+ its `MEMORY.md` galaxy brain and `CLAUDE.md` sentinel).

> Cross-cutting resource roots (apply to every galaxy, business included): the 3 critical resource roots `H:/PRISM/{resources, JM DIE, Docustrata}` — see `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json`. Docustrata pricing/document corpus is searched via its `manifest.json` + `.index/` — never re-OCR.

---

## Curated YouTube + seminars (the video / free-seminar half)

All entries below were WebFetch-confirmed live + on-topic on 2026-06-10. YouTube channel bodies are SPA-rendered, so the resolve signal is a correct server-side channel title (per the documented convention in the sibling source-atlas).

- **MIT OpenCourseWare — YouTube channel** — https://www.youtube.com/@mitocw — full recorded MIT course lectures including Sloan operations / management content; the video companion to the OCW course homepages below. (Resolved: title "MIT OpenCourseWare - YouTube".)
- **Stanford Graduate School of Business — YouTube channel** — https://www.youtube.com/@stanfordgsb — recorded GSB talks and lectures on management, operations, finance, and entrepreneurship; a continuously-updated business-thought-leadership feed and the best free "open seminar" stream for world-leader strategy thinking. (Resolved: title "Stanford Graduate School of Business - YouTube".)
- **Lean Enterprise Institute — The Lean Post (free articles / podcasts / webinars)** — https://www.lean.org/the-lean-post/ — LEI's free content hub: lean-transformation articles, the WLEI podcast, recorded webinars (e.g. Lean AI webinar) and summit keynotes — the free seminar/webinar layer for lean + continuous-improvement practice. (LEI home https://www.lean.org/ also confirmed.) Most deep courses are paid; The Lean Post is the free seminar feed.
- **Goldratt Consulting (AGI Goldratt / Theory of Constraints)** — http://goldrattgroup.com/ — the organization continuing Dr. Eli Goldratt's TOC work; hosts TOC events, talks, and training (Goldratt House "living center for TOC", Goldratt Flow platform). The authoritative org-level home for TOC seminars/talks behind the five-focusing-steps method used in capacity/bottleneck reasoning. (Note: `goldratt.com` 301-redirects here — link the resolved host.)
- **NIST — Manufacturing Extension Partnership (MEP)** — https://www.nist.gov/mep — the U.S. Commerce/NIST free institutional program for small/medium manufacturers: value-stream-mapping + leadership-training resources, impact reports, and a center in every state — the gov-backed "free consulting/seminar" resource to cite when justifying an operational-improvement capex. (Doubles as a data-report source below.)

---

## Reputable free online + data reports (the open-curriculum / open-data half)

All entries below were WebFetch-confirmed live + on-topic on 2026-06-10. FREE + LEGAL only.

**Free open textbooks / courses (deeper curriculum lives in [[business-source-atlas]]; these are the high-value access points):**
- **OpenStax — Principles of Management (Rice University, CC BY-NC-SA)** — https://openstax.org/books/principles-management/pages/1-introduction — free, peer-reviewed management textbook (managerial roles, organizational performance, planning/organizing/leading/controlling) — the management-theory contract beneath an ERP/ops engine. (Catalog shell is SPA-rendered; confirmed via this deep chapter page, which states "Access for free".)
- **MIT OpenCourseWare — 15.760A Operations Management (Sloan)** — https://ocw.mit.edu/courses/15-760a-operations-management-spring-2002/ — the canonical operations-management topic spine (process flow, inventory, capacity, supply chain, TPS, constraint management) under CC BY-NC-SA; use as the coverage checklist for a world-leader ops engine. Prof. Charles H. Fine, graduate level.
- **MIT OpenCourseWare — 15.066J System Optimization and Analysis for Manufacturing** — https://ocw.mit.edu/courses/15-066j-system-optimization-and-analysis-for-manufacturing-summer-2003/ — the optimization + simulation methodology layer beneath capacity planning/scheduling (LP/IP/NLP, sensitivity analysis, Monte-Carlo / discrete-event simulation). Free lecture notes, assignments, exams.

**Small-business guides (free, gov-backed):**
- **U.S. Small Business Administration — Business Guide** — https://www.sba.gov/business-guide — free SBA guidance across plan / launch / manage / grow (market research, business plans, hiring, tax compliance, cybersecurity, federal contracting); no paywall. The authoritative free starting point for small-shop business operations.

**Open economic / data reports (the continuously-refreshed benchmarking layer):**
- **U.S. Census Bureau — Annual Survey of Manufactures / Annual Integrated Economic Survey (AIES)** — https://www.census.gov/programs-surveys/asm.html — official manufacturing establishment statistics (employment, value of shipments, value added) refreshed on benchmark cycles; downloadable tables + interactive visualizations at no cost. The authoritative free source for industry-level manufacturing economics. (ASM transitioned to AIES, collection from March 2024.)
- **NIST — Manufacturing Extension Partnership (MEP)** — https://www.nist.gov/mep — also a free source of small/medium-manufacturer impact reports + operational-improvement data (listed above under seminars).

---

## Cross-links

- Theory layer / page-level method facts: [[business-foundations]]
- Free college courses + open textbooks (curriculum): [[business-source-atlas]]
- Real-world gotchas / applied practice: [[business-applied-practice]]
- World-leader strategy / advanced techniques: [[business-advanced-techniques]]
- Cross-galaxy resource hub: [[primary-domain-resource-map]]
- Methodology foundations (how PRISM builds + verifies): [[prism-methodology-foundations]]
- Galaxy doctrine sentinel: `mcp-server/src/engines/business/CLAUDE.md`
- Galaxy brain: `mcp-server/src/engines/business/MEMORY.md`
- Flat non-curated free-source superset: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (business section)

---

## Keep-fresh cadence

Link directories rot and stores get regenerated — this atlas must NOT stay stagnant.
- **Online half (quarterly, or on any galaxy keep-learning pass):** re-WebFetch every YouTube/seminar/online/data URL. Drop any that no longer returns HTTP 200 + on-topic content; replace with the current canonical path; bump `verified_by` with the new date. For SPA/JS pages (YouTube, OpenStax catalog) treat a live HTTP 200 + correct page title as the resolve signal and confirm via a deep content page.
- **Local half (on regeneration):** when `build-vendor-catalog-db.mjs` re-runs (after Charlie regenerates) or the JM Die archive changes, re-stat the paths and re-read the index files (`README.md`/`manifest.json`, `jm-die-profile.ts`) — never copy their counts into this atlas; always point at the index.
- **Re-attempt next pass (dropped this pass for bot-blocking, not non-existence):** SCORE (`https://www.score.org/`, 403 ×2 — legitimate free small-business mentoring/webinars), BLS data root (`https://www.bls.gov/data/`, 403 — legitimate free labor/economic data). Both are real living sources a non-headless client can reach; re-fetch from an allowed network.

---

## Owner-gate (NOT promoted)

The following stay owner-gated to **hotel** + `mcp-server/src/physics/constants.ts` and are deliberately NOT surfaced as values here (R12):
- Any numeric **OEE** / **availability / performance / quality** target or world-class threshold.
- Any **Cpk / process-capability** control limit or SPC constant.
- Any specific **overhead rate**, **labor/burden $/hr**, **quote margin %**, or worked-example cost figure from JM Die records, the vendor-catalog procurement spend, or Docustrata pricing.
- Any safety threshold or compliance limit.

This atlas links the **method and the source**; the **number** lives only behind the owner gate. A live link does not promote a value.

---

## Sources

LOCAL (stat-confirmed on disk 2026-06-10): `JM DIE/`, `mcp-server/data/vendor-catalog-db/` (README.md + manifest.json + tables/ + EXTRACTION-ROUTING.json), `prism_business` dispatcher (DISPATCHER_DIGEST.md), `mcp-server/src/engines/business/`.

ONLINE (each WebFetched + confirmed live + on-topic 2026-06-10):
- https://www.youtube.com/@mitocw — MIT OpenCourseWare YouTube channel (title-confirmed)
- https://www.youtube.com/@stanfordgsb — Stanford GSB YouTube channel (title-confirmed)
- https://www.lean.org/ — Lean Enterprise Institute (org-confirmed)
- https://www.lean.org/the-lean-post/ — LEI The Lean Post (free articles/podcasts/webinars confirmed)
- http://goldrattgroup.com/ — Goldratt Consulting / TOC (org + TOC content confirmed; goldratt.com 301→ here)
- https://www.nist.gov/mep — NIST Manufacturing Extension Partnership (free SMM resources confirmed)
- https://openstax.org/books/principles-management/pages/1-introduction — OpenStax Principles of Management (free, deep-page confirmed)
- https://ocw.mit.edu/courses/15-760a-operations-management-spring-2002/ — MIT OCW 15.760A Operations Management (free confirmed)
- https://ocw.mit.edu/courses/15-066j-system-optimization-and-analysis-for-manufacturing-summer-2003/ — MIT OCW 15.066J System Optimization for Manufacturing (free confirmed)
- https://www.sba.gov/business-guide — SBA Business Guide (free, no paywall confirmed)
- https://www.census.gov/programs-surveys/asm.html — Census ASM/AIES manufacturing economic data (free confirmed)

DROPPED this pass (re-attempt next cadence): https://www.score.org/ (403 ×2), https://www.bls.gov/data/ (403), https://www.census.gov/topics/economy.html (404), OpenStax catalog root (SPA shell — used deep chapter page instead).
