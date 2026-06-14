---
title: Blueprint-Vision Open Source Atlas
galaxy: blueprint-vision
owner_slot: xray
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas (2026-06-10)"
verification_method: "Each URL below was fetched (WebFetch) and confirmed to resolve to live, on-topic, free/legal content for engineering drawings / GD&T / machine vision / metrology. URLs that returned 404/403/ECONNREFUSED or rendered only a generic shell (could not positively confirm) were dropped, not listed."
tags: [blueprint-vision, atlas, source-directory, gdt, machine-vision, metrology, engineering-drawing, free-sources, living-curriculum]
---

# Blueprint-Vision Open Source Atlas

A curated directory of the best **free + legal LIVING** resources for the blueprint-vision domain (engineering drawings, GD&T, machine vision, metrology). Unlike a static reading list, these point at **continuously-updated** homepages, full course series, standards landing pages, and open archives so the galaxy's "keep-learning" curriculum stays current by construction.

**Scope note (R8 — not a duplicate):** this atlas is DISTINCT from two sibling assets and must not repeat them.
- `blueprint-vision-foundations.md` — the domain primer with a per-claim Sources list (individual article pages). The atlas curates BROADER living sources instead.
- `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` — the flat, bulk, fleet-wide pointer dump (19 blueprint-vision rows, mostly TIER-3 article-aggregators, not auto-invoked). The atlas is the CURATED + VERIFIED + per-galaxy form: ~15-20 of the strongest living sources, each link-checked, organized by type.

Every entry was link-verified on the date in the frontmatter. This is a link directory only — no physics/numeric/cost claims are asserted here.

## Free college courses

Full course homepages / lecture series. Audit-free, open-license, or public courseware.

- **MIT OpenCourseWare 6.801 — Machine Vision (Berthold Horn)** — https://ocw.mit.edu/courses/6-801-machine-vision-fall-2020/ — The canonical machine-vision course: image formation physics, image analysis, binary image processing, filtering. Directly on-topic for the galaxy's machine-vision leg; CC BY-NC-SA, full lecture/assignment materials.
- **MIT OpenCourseWare 2.007 — Design and Manufacturing I** — https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/ — First-course engineering design + manufacturing fundamentals; useful grounding for how a drawing maps to a manufactured part. CC BY-NC-SA, lecture notes + problem sets + exams.
- **NPTEL — Engineering Drawing (IIT Guwahati, Prof. P.S. Robi)** — https://nptel.ac.in/courses/112103019 — A full free Indian-institute course dedicated to engineering drawing / drafting conventions, projections, and views — the literal subject of "reading a blueprint." Free video-lecture course.

## Free textbooks & references

Open-license / public-domain books and continuously-maintained reference documentation.

- **Szeliski — Computer Vision: Algorithms and Applications (book homepage)** — https://szeliski.org/Book/ — The standard graduate computer-vision text, freely downloadable from the author's homepage (free personal-use PDF). Core reference for the machine-vision / image-analysis side of blueprint reading and OCR.
- **OpenCV — official tutorials documentation** — https://docs.opencv.org/4.x/d9/df8/tutorial_root.html — Living docs for the open-source computer-vision library that underpins most blueprint/OCR/feature-detection pipelines (imgproc, calib3d, contour/edge ops, DNN). Versioned and continuously updated.
- **PyImageSearch — Start Here** — https://pyimagesearch.com/start-here/ — A large, regularly-updated hub of free OpenCV / OCR (Tesseract) / object-detection tutorials. Practical machine-vision learning directly applicable to dimension-from-drawing extraction.
- **LibreTexts — Mechanical Engineering bookshelf** — https://eng.libretexts.org/Bookshelves/Mechanical_Engineering — Open-access mechanical-engineering textbooks (statics, mechanics of materials, etc.) supporting the engineering context a drawing encodes. Open Textbook Pilot funded, continuously curated.
- **Project Gutenberg — "Mechanical Drawing Self-Taught" (Joshua Rose)** — https://www.gutenberg.org/ebooks/23319 — Public-domain primer on drawing-instrument use and practical mechanical drafting/geometry. A free historical foundation for drafting conventions still legible in modern prints.
- **GD&T Basics** — https://www.gdandtbasics.com/ — Continuously-updated, ASME-Y14.5-aligned hub of free GD&T explainers, symbol charts, and calculators. Strong living reference for the GD&T leg (datums, MMC/LMC, true position).
- **NIST/SEMATECH e-Handbook of Statistical Methods** — https://www.itl.nist.gov/div898/handbook/ — Free authoritative handbook for measurement / process / metrology statistics (control charts, capability, gauge studies) — the statistical backbone of metrology and inspection.

## Archives & open data / gov reports

Government / national-lab archives and open data portals — the continuously-published "data reports" sources.

- **NIST — Digital Thread for Manufacturing (program page)** — https://www.nist.gov/programs-projects/digital-thread-manufacturing — Living NIST program on model-based definition (MBD) and digital product definition standards (STEP / QIF) — the authoritative source for where engineering-drawing data is heading. Updated through 2025, ongoing.
- **NIST — Dimensional Metrology Group (PML / Sensor Science)** — https://www.nist.gov/pml/sensor-science/dimensional-metrology — The U.S. primary source for length/dimensional metrology: calibration services, traceability, and documentary-standards leadership (ASME/ASTM/ISO). Core authority for the metrology leg.
- **NASA Technical Reports Server (NTRS)** — https://ntrs.nasa.gov/search?q=engineering%20drawing — Free, searchable archive of NASA technical reports — a deep, continuously-growing well of engineering-drawing, inspection, and metrology documentation across aerospace programs.
- **U.S. Bureau of Labor Statistics — QCEW Data Viewer** — https://data.bls.gov/cew/apps/data_views/data_views.htm — Live open-data portal (employment/wages by NAICS industry) for grounding manufacturing-labor and shop-economics context behind drawing-to-part workflows.

## Standards & authoritative bodies

Standards landing pages and authoritative-body pages relevant to engineering drawings / GD&T / metrology. (Landing/overview pages — the standards bodies update these; the standards themselves remain paywalled to purchase, but the landing pages are free and current.)

- **ASME Y14.5 — Dimensioning and Tolerancing (landing page)** — https://www.asme.org/codes-standards/find-codes-standards/y14-5-dimensioning-tolerancing — The authoritative GD&T standard's landing page (2018, reaffirmed 2024): symbols, rules, defaults for engineering drawings and digital design files. The reference point for every GD&T callout.
- **ASME Y14.41 — Digital Product Definition Data Practices (landing page)** — https://www.asme.org/codes-standards/find-codes-standards/y14-41-digital-product-definition-data-practices — The standard governing model-based / digital product-definition data (PMI on 3D models) — the modern successor surface to the 2D print.
- **OSHA — Machine Guarding** — https://www.osha.gov/machine-guarding — Authoritative U.S. government machinery-safety landing page (standards, hazard recognition, NEP on amputations), the safety envelope around the shop equipment a drawing's part is made on. Government-maintained, current.

## Maintenance

This atlas is a **link directory and link-rot is its primary decay mode** — homepages move, courses are renumbered, standards pages are restructured. The freshness mechanism is **periodic re-verification**: re-fetch every URL here on a recurring cadence (suggest quarterly, or whenever an entry is found dead in use), drop any that 404/403/redirect off-topic, and promote replacements from `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` or fresh discovery. The `status: VERIFIED-PARTIAL` frontmatter flag and the dated `verified_by` field mark the last verification pass; bump them on each re-check. Owner slot **xray** owns the cadence. Several candidate sources were dropped on the 2026-06-10 pass for failing to resolve or for rendering only a JS shell that could not be positively confirmed (e.g. some ISO landing pages return 403 to automated fetches, and YouTube channel pages do not render statically) — re-attempt those with an interactive check before adding.
