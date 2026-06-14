---
title: Blueprint-Vision Resource Atlas
galaxy: blueprint-vision
owner_slot: xray
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "Local subdir paths stat-verified on disk 2026-06-10 (root+subdir per CRITICAL-RESOURCE-ROOTS.json); every YouTube/online source confirmed to resolve via WebFetch + WebSearch before listing; dead URLs (404) dropped after one retry."
tags: [blueprint-vision, resource-atlas, ocr, blueprint-reading, gdt, document-ai, drawings, xray]
---

# Blueprint-Vision Resource Atlas

One easy-access index that links **every** resource for the blueprint-vision domain — the local on-disk trove (drawings, prints, CAD test artifacts, reference PDFs), curated YouTube, and reputable online education — so a chat in this galaxy jumps straight to what it needs instead of re-searching.

Domain scope: OCR + blueprint/drawing reading + multi-print-PDF split + CAD-file extraction + GD&T interpretation (the print-in side of PRISM's print-to-program pipeline). Pathway convention = **root + subdir + index** (per `CRITICAL-RESOURCE-ROOTS.json`); for drawings, search the Docustrata manifest/index — **never re-OCR** an already-indexed corpus.

---

## Local trove (drawings / prints / CAD test artifacts / reference PDFs)

> Paths stat-verified on disk 2026-06-10. Counts reproduced verbatim from the pre-verified manifest — do **not** re-count or fabricate. These are the primary corpora for OCR/blueprint-reading work.

### Drawings + prints (the core OCR/blueprint-reading corpus)
- **`H:/PRISM/JM DIE/Prism JM Die/`** — 152,960 customer drawings/prints. The deepest real-print corpus for OCR training, dimension extraction, and print-to-program ingestion. Multi-page PDFs are the norm (≈96% multi-page per the 2026-06-08 corpus audit) — render **all** pages, not page 0.
- **`H:/PRISM/JM DIE/QUEUE/`** — 354 items. Active intake / work-queue prints.
- **`H:/PRISM/JM DIE/PRISM CAD TESTING/`** — CAD test artifacts for the blueprint→CAD round-trip and feature-recognition validation.

### Reference PDFs (theory / standards / how-to)
- **`H:/PRISM/resources/RESOURCE PDFS/`** — 2,929 reference PDFs (standards, handbooks, GD&T references, extraction-method papers).
- **`H:/PRISM/resources/PDF/`** — 13 PDFs (curated subset).

### Root indexes (start here, don't re-walk the trees)
- **`H:/PRISM/resources/RESOURCES-INDEX.md`** — the master local resource index for the `resources` root.
- **`H:/PRISM/Docustrata/manifest.json`** + **`H:/PRISM/Docustrata/.index/`** — the already-OCR'd / already-indexed drawing corpus. Query the manifest + `.index` to find a drawing; **never re-OCR Docustrata** (operator directive 2026-05-30).

> CAM/posts/programs note: blueprint-vision is the **print-in** galaxy — it consumes drawings and emits structured dimensions, not CAM toolpaths or NC posts. For CAM corpus, posts, and generated programs, see the mill/cam/post-processor galaxy atlases; this atlas links only the drawing + reference-PDF side of the pipeline.

---

## Curated YouTube (free; each confirmed to resolve 2026-06-10)

GD&T, blueprint-reading, and document-AI/OCR — official/reputable educators only, all free to view.

| Channel / video | URL | Why for blueprint-vision |
|---|---|---|
| **GD&T Basics (Engineer Essentials)** | https://www.youtube.com/@GDandTBasics | ASME-certified GD&T tutorials in "Question Line" format — composite profile, position vs concentricity, datum interpretation. Ground truth for what the OCR/extraction layer must *understand* on a print. |
| **Tec-Ease — Where GD&T Rules** | https://www.youtube.com/user/tecease | Free GD&T webinars + short "GD&T Tip" videos, plus *Print Reading for Today* material, all tied to ASME Y14.5. Strong on feature-control-frame reading. |
| **ASME (American Society of Mechanical Engineers)** | https://www.youtube.com/c/ASMEAmericanSocietyofMechanicalEngineers | The standards body behind Y14.5 / Y14.41. Authoritative source for the drawing conventions a blueprint reader must parse. |
| **Marc L'Ecuyer — Blueprint Reading (free machine-shop course)** | https://www.youtube.com/watch?v=dw3CrHMtzMk | Part 1 of a free novice-machinist program: title block, projections, dimensions/tolerances — the exact fields the extraction layer targets. |

---

## Reputable online (free reference / courses / articles)

| Resource | URL | Why for blueprint-vision |
|---|---|---|
| **GD&T Basics — free resources** (symbol chart PDF, position-conversion chart, orthographic-projection guide, True-Position calculator) | https://www.gdandtbasics.com/ | Downloadable GD&T symbol/position charts — the canonical legend for interpreting feature-control frames pulled off a print. |
| **Machinist Guides — Beginner's Guide to Blueprint Reading** | https://www.machinistguides.com/blueprint-reading-guide/ | Structured reference: title blocks, 1st-vs-3rd-angle projection, limit/unilateral/bilateral tolerances, symbols (Ø, holes, datums, chamfers, threads, surface finish). Maps print fields → meaning. |
| **DeepLearning.AI — "Document AI: From OCR to Agentic Doc Extraction"** | https://learn.deeplearning.ai/courses/document-ai-from-ocr-to-agentic-doc-extraction/ | Free course on traditional OCR → layout detection + reading order → agentic page-as-image extraction → LLM-ready markdown. Directly relevant to the multi-page drawing-extraction pipeline. |
| **Unite.AI — Using OCR for Complex Engineering Drawings** | https://www.unite.ai/using-ocr-for-complex-engineering-drawings/ | Why generic OCR fails on technical drawings (rotated text, graphical noise, no semantic understanding) and why model-based / template approaches + OpenCV preprocessing are needed. |

---

## Cross-links (sibling wiki layers)

- [[blueprint-vision-foundations]] — domain theory (drawing conventions, projection systems, GD&T fundamentals, OCR/layout-extraction theory).
- [[blueprint-vision-source-atlas]] — free courses, books, and primary references for the domain.
- [[blueprint-vision-applied-practice]] — gotchas + lessons (e.g. page-0-only OCR loss, leading-dot/`+`-sign parse failures, truncation discards — see the `## Recent regressions` xray entries).
- [[primary-domain-resource-map]] — the master local resource map across all galaxies (`knowledge/wiki/architecture/primary-domain-resource-map.md`).

> No `blueprint-vision-advanced-techniques` page exists on disk as of 2026-06-10 — intentionally not cross-linked. Add the link here if/when that layer ships.

---

## Keep-fresh cadence

- **Local trove**: re-stat the subdir paths + Docustrata manifest whenever the JM Die intake or `resources` root is reorganized; refresh counts from the pre-verified manifest, do not re-count by hand.
- **YouTube/online**: re-verify each URL resolves (WebFetch/WebSearch) on a ~quarterly pass or whenever a chat reports a 404; drop dead links after one retry, never leave a fabricated URL.
- **Status**: `VERIFIED-PARTIAL` — local paths are disk-verified; external links are resolve-verified but their *content depth* is owner-judged. Promote to `VERIFIED` only after xray confirms each listed resource is materially useful in a real blueprint-vision build.

---

## Owner-gate (NOT promoted)

This atlas **links** resources; it promotes **no** numeric constant into the wiki. Any dimension-tolerance default, OCR confidence threshold, GD&T datum-precedence rule, or extraction calibration value stays **owner-gated to xray** and lives only in the galaxy's code + (for any physics constant) `mcp-server/src/physics/constants.ts`. A reader who needs a number reads the source/catalog linked above — the number does not travel into this page (R12).

## Sources

Local trove (stat-verified on disk 2026-06-10):
- `H:/PRISM/JM DIE/Prism JM Die/`, `H:/PRISM/JM DIE/QUEUE/`, `H:/PRISM/JM DIE/PRISM CAD TESTING/`
- `H:/PRISM/resources/RESOURCE PDFS/`, `H:/PRISM/resources/PDF/`
- `H:/PRISM/resources/RESOURCES-INDEX.md`
- `H:/PRISM/Docustrata/manifest.json`, `H:/PRISM/Docustrata/.index/`
- `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (root+subdir+index pathway convention)

External (resolve-verified via WebFetch + WebSearch 2026-06-10):
- GD&T Basics — https://www.youtube.com/@GDandTBasics · https://www.gdandtbasics.com/
- Tec-Ease — https://www.youtube.com/user/tecease
- ASME — https://www.youtube.com/c/ASMEAmericanSocietyofMechanicalEngineers
- Marc L'Ecuyer Blueprint Reading — https://www.youtube.com/watch?v=dw3CrHMtzMk
- Machinist Guides Blueprint Reading Guide — https://www.machinistguides.com/blueprint-reading-guide/
- DeepLearning.AI Document AI — https://learn.deeplearning.ai/courses/document-ai-from-ocr-to-agentic-doc-extraction/
- Unite.AI Engineering-Drawing OCR — https://www.unite.ai/using-ocr-for-complex-engineering-drawings/

Dropped (404 on attempted handle, not listed): `youtube.com/@Tec-Ease`, `youtube.com/@asmedotorg`, `youtube.com/@ASMEdotorg/videos`, `youtube.com/@LarsLiveMachining`.
