---
name: free-cad-book-acquisition-catalog-2026-05-26
description: "Curated catalog of 9 FREE/OER engineering-CAD-drawing books for CAD-AI training-corpus expansion — 6 P0 candidates yield ~780 tribal tips + ~320 wiki entries; closes the iso286-fit-values training gap from delta soul refuse_list"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.580Z
aliases: reference_free_cad_book_acquisition_catalog_2026_05_26
---


# FREE CAD-book acquisition catalog (slot:delta 2026-05-26 /loop continue-training)

User work order: *"try finding full engineering cad books that are free online to extract wiki and tribal knowledge to inject into the cad ai system for training and learning"*.

## Outcome

9-candidate discovery catalog landed at `mcp-server/data/ingestion_cache/FREE-CAD-BOOK-ACQUISITION-CATALOG-2026-05-26.json`. Six P0 candidates (CC-licensed or academically-free) — total estimated yield **~780 tribal tips + ~320 wiki entries** once acquired + ingested through the existing /pdf-learn pipeline.

## P0 candidates (acquire first)

| id | host | license | estimated yield | why |
|---|---|---|---|---|
| **libretexts-cad-skills-first-year** | eng.libretexts.org | CC-BY-SA | 60 tips / 25 wiki | Highest-leverage OER on the web for this domain; modular structure aligns with PRISM's emit decomposition |
| **nptel-engineering-drawing-iitg** | nptel.ac.in | NPTEL terms (free academic) | 80 / 30 | IIT Guwahati, first-/third-angle projection, sectional + auxiliary views |
| **nptel-engineering-drawing-computer-graphics-iitkgp** | onlinecourses.nptel.ac.in | NPTEL terms | 100 / 40 | IIT Kharagpur; NURBS / Bezier / B-spline — directly trains BRep parsers + Fusion adsk |
| **freecad-documentation-wiki** | wiki.freecad.org | CC-BY 3.0 | 300 / 150 | Part Workbench (BRep primitives + boolean), PartDesign (parametric), Sketcher constraints, TechDraw — directly parallel to PRISM's `cad-live-regen-emit` decomposition |
| **openscad-wikibook** | en.wikibooks.org | CC-BY-SA 3.0 | 90 / 40 | CSG primitives + transformations + boolean — trains the existing openscad.actions.json emitter (next platform extension) |
| **openlearn-iso286-fits** | open.edu/openlearn | CC-BY-NC-SA 4.0 | 40 / 15 | **Closes the iso286-fit-values training gap from delta soul refuse_list** — canonical fit-deviation tables under CC-BY-NC-SA (internal-only PRISM use OK per feedback_no_public_h_drive) |

## P1/P2 (defer or license-verify first)

- `archive-bogolyubov-engineering-drawing-mir-1986` (P1) — Soviet engineering canon; balances PRISM's primarily-Western corpus; Internet Archive lending model needs verification
- `archive-textbook-of-engineering-drawing-201802` (P2) — license-ambiguous; ingest to gitignored `personal-training-only/` namespace only
- `wikibooks-engineering-drawing` (needs-discovery) — confirm non-stub before queuing

## Acquisition + extraction pipeline (already exists)

```
[1] Playwright fetch HTML/PDF  →  H:/prism/resources/OER/<book-id>/
[2] scripts/build-cad-cam-resources-pdf-index.mjs  →  refresh index
[3] scripts/batch-pdf-extract.mjs  →  extract page-1-N tips → state/shared/extracted-pdfs/*.jsonl
[4] scripts/promote-tribal-to-wiki.mjs --apply (conf >= 90)  →  knowledge/wiki/code-tribal/tribal-*.md
[5] scripts/generate-pdf-course-bridge-features.mjs  →  PDF↔course graph edges
[6] scripts/embed-wiki-into-tribal-index.mjs  →  tribal-by-domain-inject surfaces on delta-slot prompts
```

Per `feedback_playwright_for_online_sources`, stage 1 uses Playwright not WebFetch. Per `feedback_no_public_h_drive`, all acquisitions stay internal-only.

## Next unit (queued for next-session delta or echo)

**`U-CAD-OER-BOOK-INGEST-P0`** — acquire + extract + wire the 6 P0 sources. Estimated 30-60 min real-time for acquisition, plus ~5 min for the existing pipeline run. Closes the iso286 + sketch-constraint + BRep-decomposition tribal gaps.

## Sources

- **LibreTexts CAD Skills**: [eng.libretexts.org/.../CAD_Skills_for_First-Year_Engineers](https://eng.libretexts.org/Bookshelves/Introductory_Engineering/CAD_Skills_for_First-Year_Engineers:_A_Hands-On_Guide_to_Sketching_Drafting_and_Prototyping)
- **NPTEL Engineering Drawing (IIT-G)**: [nptel.ac.in/courses/112103019](https://nptel.ac.in/courses/112103019)
- **NPTEL Eng Drawing + Computer Graphics (IIT-KGP)**: [onlinecourses.nptel.ac.in/noc20_me79/preview](https://onlinecourses.nptel.ac.in/noc20_me79/preview)
- **Internet Archive — Textbook of Engineering Drawing**: [archive.org/details/TextbookOfEngineeringDrawing_201802](https://archive.org/details/TextbookOfEngineeringDrawing_201802)
- **Internet Archive — Bogolyubov Engineering Drawing (Mir 1986)**: [archive.org/details/s.-bogolyubov-a.-voinov-engineering-drawing-mir-1986](https://archive.org/details/s.-bogolyubov-a.-voinov-engineering-drawing-mir-1986)
- **NPTEL Syllabus PDF**: [archive.nptel.ac.in/content/syllabus_pdf/112103019.pdf](https://archive.nptel.ac.in/content/syllabus_pdf/112103019.pdf)
- **FreeCAD Wiki**: [wiki.freecad.org](https://wiki.freecad.org/)
- **OpenSCAD Wikibook**: [en.wikibooks.org/wiki/OpenSCAD_User_Manual](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual)
- **OpenLearn Engineering**: [open.edu/openlearn/science-maths-technology/engineering-technology](https://www.open.edu/openlearn/science-maths-technology/engineering-technology)

## Related

- [[reference_cad_live_regen_ms0_2026_05_26]] — the emitter pipeline these books will train
- [[reference_pdf_node_wiki_tribal_pipeline_run_2026_05_26]] — the extraction pipeline that ingests them
- [[feedback_playwright_for_online_sources]] — fetch tool choice
- [[feedback_no_public_h_drive]] — keep acquisitions internal-only
