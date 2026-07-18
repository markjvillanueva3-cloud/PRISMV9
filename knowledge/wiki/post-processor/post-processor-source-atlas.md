---
title: Post-Processor Open Source Atlas — living free + legal resources for CNC G-code / RS-274 / controller post-processing
galaxy: post-processor
owner_slot: echo
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas (2026-06-10)"
verification_method: "Each URL below was individually WebFetched and confirmed to resolve to live, on-topic content (course homepage / textbook library / data portal / standards landing). URLs that 404'd, looped on redirect, returned 403, or rendered as an un-inspectable SPA shell were DROPPED — not listed. No physics/numeric claim is asserted; this is a link directory only (R12 honesty). Distinct from post-processor-foundations.md (single-page method/standards Sources) — this atlas curates BROADER continuously-updated living homepages/portals."
tags: [post-processor, g-code, rs-274, iso-6983, source-atlas, free-courses, open-textbooks, gov-data, standards, mit-ocw, nptel, edx, libretexts, nist, nasa-ntrs, archive-org, data-gov, asme, osha, mtconnect, linuxcnc, living-resources]
---

# Post-Processor Open Source Atlas

A curated, **link-verified** directory of the best **free + legal LIVING** resources for the
**post-processor** galaxy (CNC G-code / RS-274 / ISO 6983 controller post-processing). The point is a
**non-stagnant keep-learning curriculum**: these are continuously-updated homepages, course catalogs,
textbook libraries, and standards/data portals — not one-off article links — so the domain's knowledge
stays current by pointing at sources that themselves keep current.

**How this differs from the foundations file:** `knowledge/wiki/post-processor/post-processor-foundations.md`
is the domain-knowledge *spine* — it cites specific single pages (a Wikipedia article, individual LinuxCNC
doc pages, named NIST reports) for specific verified *facts*. This atlas instead curates the **broader
living roots** (full course series, textbook *libraries*, gov *data portals*, standards-body *landing
pages*) you draw fresh material from. Where a root necessarily overlaps a foundations citation, the atlas
points at the **living index/landing** form (e.g. the LinuxCNC docs *index*, not one coordinate page).

**Verification rule (R12):** every URL below was WebFetched this pass and confirmed to resolve to live,
on-topic content. Anything that failed (404 / redirect-loop / 403 / un-inspectable SPA shell) was dropped,
not listed — see `## Maintenance` for the dropped set and the re-verify cadence.

## Free college courses

- **MIT OpenCourseWare** — https://ocw.mit.edu/ — MIT's free lecture notes, exams, and video, no
  registration. The home for MIT manufacturing/mechanical courses (2.008 Design & Manufacturing II,
  2.810 Manufacturing Processes & Systems) whose machining/process material is the upstream theory a post
  emitter renders into controller dialect. (Browse from the live home; deep course slugs rotate by term.)
- **NPTEL — Manufacturing Processes II (IIT Kharagpur)** — https://nptel.ac.in/courses/112105127 —
  free full video-lecture course on machining/metal-cutting processes; the process-physics layer that sits
  upstream of toolpath → post-processor G-code generation.
- **NPTEL course catalog** — https://nptel.ac.in/courses — free SWAYAM-hosted university courses across
  mechanical / manufacturing / production engineering; the living catalog to pull additional CNC and
  manufacturing-process courses from as new terms publish.
- **edX — Manufacturing** — https://www.edx.org/learn/manufacturing — university manufacturing courses
  (many auditable free) on automation, process, and quality; a continuously-refreshed listing to source
  controller/automation context for the post-processor domain.
- **GcodeTutor — CNC G-code Programming Courses** — https://gcodetutor.com/ — free + paid CNC programming
  lessons (mill / lathe / router) with a free intro course covering drilling cycles and shop math; the
  most directly on-topic living course site for the actual G/M-code constructs a post must emit.

## Free textbooks & references

- **Engineering LibreTexts** — https://eng.libretexts.org/ — open-access, continuously-updated
  ("Living Library") engineering textbook collection (UC Davis / CSU / NSF backed); the open-textbook root
  for manufacturing-process and controls theory underlying CNC programming.
- **Project Gutenberg** — https://www.gutenberg.org/ — 75,000+ free public-domain ebooks; the source for
  out-of-copyright machine-shop / mechanical-engineering reference texts (historical machining and
  shop-practice works) that ground the RS-274 lineage.
- **NIST/SEMATECH e-Handbook of Statistical Methods** — https://www.itl.nist.gov/div898/handbook/ —
  free government online reference for SPC / process-capability / measurement statistics; the verification
  half of the post → part loop (the program a post emits is graded at inspection).

## Archives & open data / gov reports

- **NIST Publications portal** — https://www.nist.gov/publications — searchable free government technical
  publications; the living source for the RS274NGC interpreter, STEP-NC / ISO 14649 roadmap, MTConnect,
  and dimensional-metrology reports that frame the post-processor architecture.
- **NIST Engineering Laboratory** — https://www.nist.gov/el — the NIST lab driving manufacturing-data
  infrastructure, smart manufacturing, and standards work (STEP-NC / MTConnect lineage); the program
  landing to track the gov research feeding the AP238 long-horizon target for posts.
- **NASA Technical Reports Server (NTRS)** — https://ntrs.nasa.gov/ — free searchable archive of NASA
  technical reports, papers, and patents; a gov data source for precision-machining, metrology, and
  manufacturing-process reports.
- **Internet Archive — Texts** — https://archive.org/details/texts — free / borrowable digital library of
  books and documents; a living archive for historical machine-tool manuals, EIA/RS-274 era references,
  and public-domain shop-practice texts.
- **Data.gov dataset catalog** — https://catalog.data.gov/dataset — the US government open-data portal
  (500k+ datasets, agencies incl. NIST/NASA/Census); the "data reports" root for manufacturing,
  industrial, and standards datasets that keep domain context current.

## Standards & authoritative bodies

- **ASME Codes & Standards** — https://www.asme.org/codes-standards — landing page for ASME's evolving
  standards portfolio, incl. Y14.5 (GD&T — the tolerance intent a post's output is graded against) and
  the B5 machine-tool series; the authoritative-body root for the drawing/dimensioning standards layer.
- **OSHA — Machine Guarding Standards** — https://www.osha.gov/machine-guarding/standards — live index of
  29 CFR machine-safeguarding regulations (1910 Subpart O et al.); the safety-envelope authority for why
  a CNC program (mechanical motion = the hazard) and its controller numerics are safety-critical.
- **MTConnect Institute** — https://www.mtconnect.org/ — the official open-standard body for machine-tool
  data interoperability (ANSI/MTC1.4); the read-back counterpart to a post's write-out — the live standard
  the machine's monitoring data conforms to, closing the post → machine → verify loop.
- **LinuxCNC Documentation (index)** — https://www.linuxcnc.org/docs/ — the continuously-updated
  open-source CNC control documentation set (current + future + archived versions, HTML/PDF); the living
  reference for G-code semantics, work offsets, canned cycles, and modal-group/order-of-execution rules a
  post must honor. (Foundations cites individual pages; this is the maintained index root.)

## Maintenance

This atlas is a **link directory** and is subject to **link-rot** — the freshness mechanism is **periodic
re-verification**: re-WebFetch every URL on a recurring cadence (suggest quarterly, or whenever a galaxy
build touches this file), drop any that no longer resolve or drift off-topic, and add newly-discovered
living roots in the same verify-first discipline. Owner: **echo** (galaxy owner) re-verifies; a hygiene
slot may batch-check links. The atlas deliberately lists only **living homepages/portals/catalogs** (not
deep article URLs) precisely because those are the most rot-resistant and self-updating.

**Dropped this pass (not listed — failed verification 2026-06-10):** deep MIT OCW course slugs (2.008 /
2.810 — 404 / redirect-loop; use the live ocw.mit.edu home instead), ISO Online Browsing Platform standard
pages (403 to WebFetch), the eCFR deep CFR path (302 → anti-bot host) and the govinfo CFR collection
(un-inspectable shell — OSHA standards page covers the regulation need), OpenStax (SPA shell did not
render inspectable content — Engineering LibreTexts covers the open-textbook need), and **all YouTube
lecture channels/playlists** (channel/playlist pages returned truncated, un-inspectable bodies via
WebFetch — per the no-fabrication rule, no video entry is listed rather than assert an unverified channel).
The **Lecture series & video** section is therefore omitted this pass and is the target for a future pass
with a verifiable video-source URL.

## Cross-refs
- Foundations (domain-knowledge spine): `knowledge/wiki/post-processor/post-processor-foundations.md`
- Bulk free-source corpus (flat, not auto-invoked): `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md`
- Galaxy brain: `mcp-server/src/engines/post-processor/MEMORY.md`
- [[feedback_psn_definition]] · [[feedback_check_units_first]]
