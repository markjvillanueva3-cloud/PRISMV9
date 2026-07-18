---
title: CAD Open-Source Atlas — curated living free + legal resources for computer-aided design / solid modeling / geometry
galaxy: cad
owner_slot: delta
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas (2026-06-10)"
verification_method: "Every URL below was WebFetched and CONFIRMED to resolve to live, on-topic content (course homepage / textbook / gov portal / standards landing page) before listing. URLs that returned 404/403/TLS-error/connection-refused, or resolved to off-topic content, were DROPPED and not listed. This atlas verifies that each LINK is live and on-topic; it does NOT assert the technical claims inside those sources (those stay owner-gated to delta in cad-foundations.md / _staging)."
tags: [cad, source-atlas, free-courseware, open-textbook, gov-data, standards, living-resources, mit-ocw, nptel, nist, asme, gutenberg, opencascade, geometry-processing]
---

# CAD Open-Source Atlas

A curated, **verified** directory of the best FREE + LEGAL **living** resources for **computer-aided design / solid modeling / geometry** — chosen so the cad galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to **continuously-updated** sources (course homepages, textbook portals, gov program pages, standards landing pages) rather than a frozen snapshot.

**Distinct from [`cad-foundations.md`](cad-foundations.md):** the foundations file is the *domain-knowledge spine* (specific WebFetch-confirmed facts about MBD, PMI, B-rep/CSG, NURBS, GD&T, STEP). This atlas is the *living-source directory* — it curates BROADER continuously-updated resources (full course series, textbook homepages, gov data portals, standards landing pages) and does NOT repeat the foundations' per-fact Sources list. Where a foundations source is also the best living entry point (e.g. NIST MBE), it appears here in its **portal / data-download** capacity, not as a cited fact.

**Distinct from [`GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md`](../../../state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md):** that corpus is the bulk flat pointer index (29 cad pointers, not auto-invoked, not all re-verified). This atlas is the curated + re-verified + auto-invokable per-galaxy subset — ~15 strongest LIVING sources, each fetch-confirmed 2026-06-10, organized by type.

> **R12 honesty boundary:** every entry below was fetched and confirmed live + on-topic on 2026-06-10. A live, reputable link does NOT make any number inside it verified — numeric GD&T/tolerance constants stay owner-gated to delta (see `cad-foundations.md` Owner-gate).

---

## Free college courses

Full open-courseware course homepages — each carries a complete syllabus, lecture material, and (for NPTEL) recorded video lecture series. Continuously hosted by the institution.

- **MIT OpenCourseWare — 2.158J Computational Geometry** — https://ocw.mit.edu/courses/2-158j-computational-geometry-spring-2003/ — MIT graduate course (Patrikalakis & Maekawa) whose syllabus is the single best free curriculum for the cad galaxy's geometry spine: B-splines / NURBS, sweeps, offsets, blending & filleting surfaces, CSG + boundary-representation solid models, and feature representation/recognition — shape interrogation for design, analysis, and manufacturing.
- **NPTEL — Computer Aided Engineering Design (IIT Kanpur, Dr. Anupam Saxena)** — https://nptel.ac.in/courses/112104031 — full Indian-Institute-of-Technology open course on parametric curve/surface/solid modeling for CAD; syllabus + downloads + recorded video lectures, freely accessible.
- **NPTEL — Computer Aided Design and Manufacturing (IIT Delhi, Prof. Anoop Chawla & Prof. P.V. Madhusudan Rao)** — https://nptel.ac.in/courses/112102101 — full open course spanning CAD geometric modeling through to manufacturing; the CAD->CAM bridge framing that matches PRISM's print-to-program pipeline.
- **Stanford — CS468 Geometry Processing Algorithms** — https://graphics.stanford.edu/courses/cs468-12-spring/ — Stanford graphics-lab courseware on triangle-mesh surface modeling, mesh generation, parameterization and remeshing — the discrete-geometry / mesh side of CAD that B-rep/NURBS theory does not cover.
- **MIT OpenCourseWare — 6.837 Computer Graphics** — https://ocw.mit.edu/courses/6-837-computer-graphics-fall-2012/ — MIT course (CC BY-NC-SA) covering splines, transformations, the graphics pipeline, and sampling; the rendering/spline-math companion to 2.158J, with downloadable lecture notes and assignments.

## Free textbooks & references

Public-domain and open-license texts. The portal/search entries stay current as new public-domain scans are added.

- **Project Gutenberg — "Mechanical Drawing Self-Taught" (Joshua Rose)** — https://www.gutenberg.org/ebooks/23319 — public-domain self-teaching manual: drawing-instrument selection, practical mechanical drawing, simple geometry, screw threads, gear wheels — the historical drafting fundamentals a blueprint/feature parser is decoding.
- **Project Gutenberg — "mechanical drawing" search** — https://www.gutenberg.org/ebooks/search/?query=mechanical+drawing — live Gutenberg search returning the full set of public-domain technical-drawing / drafting titles; the continuously-growing free-textbook entry point.
- **Internet Archive — "Mechanical Drawing: A Text with Problem Layouts"** — https://archive.org/details/mechanicaldrawin00fren — free public-domain (1919/1948) engineering-drawing textbook with problem layouts; representative of the large archive.org public-domain drafting/CAD corpus.
- **LibreTexts — Mechanical Engineering bookshelf** — https://eng.libretexts.org/Bookshelves/Mechanical_Engineering — open-license (CC), continuously-curated collection of mechanical-engineering textbooks (statics, dynamics, materials) that ground the design intent a CAD model encodes; the living open-textbook library for the surrounding engineering discipline.

## Archives & open data / gov reports

U.S. government program portals and downloadable conformance-data sets — continuously updated (each fetch confirmed a 2025 "last updated" stamp), the "data reports" spine for model-based CAD.

- **NIST — MBE PMI Validation and Conformance Testing Project** — https://www.nist.gov/ctl/smart-connected-systems-division/smart-connected-manufacturing-systems-group/mbe-pmi-validation — the single highest-value living source for this galaxy: a free, downloadable government-grade data set of **CAD models + STEP files + validation/test reports** (11 GD&T/PMI test cases) — a ready conformance gate for delta's `CADAccuracyValidatorEngine` / STEP emitter, kept current (updated 2025).
- **NIST — Model-Based Enterprise (MBE) Program** — https://www.nist.gov/programs-projects/model-based-enterprise-program — the gov program portal for 3D model-based product definition + the digital thread (7 active research projects, annual MBE Summit); the policy/standards umbrella under which the PMI test-data above is produced.
- **NIST — Digital Thread for Manufacturing program** — https://www.nist.gov/programs-projects/digital-thread-manufacturing — gov program delivering methods/protocols/tools and conformance testing for product-definition standards (STEP, QIF, MTConnect); the continuously-maintained portal (started 2021, updated 2025) tracking the interoperability standards a CAD galaxy must emit against.

## Lecture series & video

Recorded lecture-series video, hosted on the same institutional pages confirmed above (no third-party channel re-hosting — these are the authoritative homes of the video).

- **NPTEL course video lectures (IIT, via the course pages above)** — https://nptel.ac.in/courses/112104031 and https://nptel.ac.in/courses/112102101 — each NPTEL course page carries the full **recorded IIT video lecture series** for CAD / geometric modeling / CAD-and-manufacturing; the reputable, free, complete video curriculum for the galaxy (verified the course pages resolve and host the lecture series — individual video IDs are not fabricated here).
- **MIT OpenCourseWare lecture material (via the OCW course pages above)** — https://ocw.mit.edu/courses/6-837-computer-graphics-fall-2012/ — MIT OCW course pages host downloadable lecture notes/material under CC BY-NC-SA; the authoritative MIT lecture corpus for graphics/geometry (point at the course page rather than an unverifiable re-upload).

## Standards & authoritative bodies

Official standards-body landing pages (the landing page is free to view; the normative text is purchased). These are the *interpretation authorities* a PMI extractor must conform to — and the pages stay current with revision/reaffirmation status.

- **ASME — Y14.5 Dimensioning and Tolerancing** — https://www.asme.org/codes-standards/find-codes-standards/y14-5-dimensioning-tolerancing — official ASME landing page for the authoritative GD&T standard (current: Y14.5-2018 (R2024)); the symbol/datum/Rule-1 authority every feature-control-frame parser conforms to.
- **ASME — Y14.41 Digital Product Definition Data Practices** — https://www.asme.org/codes-standards/find-codes-standards/y14-41-digital-product-definition-data-practices — official landing for the model-based-definition standard (current: Y14.41-2019); the standard that governs embedding PMI in the 3D model (the MBD basis for ISO 16792).
- **Open CASCADE Technology (OCCT) developer portal** — https://dev.opencascade.org/ — the open-source full-scale 3D geometry kernel (B-rep modeling, STEP/IGES exchange, visualization); a free, living **reference implementation** of CAD geometry/exchange (since 1999), authoritative for what a real CAD kernel must do — relevant because PRISM interoperates with files such kernels emit.

---

## Maintenance

This atlas is a **link directory**, so its single failure mode is **link-rot** — a course gets re-homed, a gov page is restructured, a standards landing URL changes. The freshness mechanism is therefore **periodic re-verification**: re-WebFetch every URL on a recurring cadence (suggested: quarterly, or whenever a cad chat touches this file) and DROP any entry that no longer resolves or has gone off-topic, replacing it with a fresh verified equivalent from `GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` or a new search. Update `verified_by` / the date in `verification_method` on each re-verification pass. Because every listed source is itself *continuously updated*, the curriculum stays current as long as the links stay live — re-verification is the only upkeep this atlas needs.

**Entries DROPPED during the 2026-06-10 verification pass (did not resolve or off-topic — do not re-add without a fresh confirming fetch):** ISO.org standard/committee pages (HTTP 403), FreeCAD wiki (Anubis access-deny), GrabCAD Library + SketchUp 3D Warehouse (403/inconclusive), data.gov CAD query (portal live but returned no CAD datasets), Wikibooks Engineering Drawing (404), several YouTube channel/playlist URLs (JS-rendered — content could not be confirmed on-topic, so not listed per R12). YouTube lecture content is instead surfaced via the verified NPTEL/MIT-OCW course pages that authoritatively host it.

## Cross-refs

- Domain-knowledge spine (per-fact confirmed): [`cad-foundations.md`](cad-foundations.md)
- Bulk flat free-source corpus (not re-verified): [`GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md`](../../../state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md)
- Galaxy doctrine: `mcp-server/src/engines/cad/CLAUDE.md`
- Galaxy memory: `mcp-server/src/engines/cad/MEMORY.md`
