# CAD + CAM Consolidated Corpus — handoff to delta + kilo

Generated 2026-05-25T03:46:11.902Z by `scripts/consolidate-cadcam-corpus.mjs` (slot:india).

## Summary

| Metric | Count |
|---|---|
| Total evaluated | 2294 |
| CAD corpus | 21 |
| CAM corpus | 598 |
| CAD ∩ CAM | 5 |
| CAD only | 16 |
| CAM only | 593 |
| Neither (general) | 1680 |

## Handoff targets

- **delta** (CAD slot) — consumes `cad[]` (21 entries) via `prism_cad` + CAD/Blender pipelines
- **kilo** (CAM slot) — consumes `cam[]` (598 entries) via `prism_cam` + CAM/post pipelines

## YouTube watchlist (8 CAD + 7 CAM channels)

### CAD channels
- **Lars Christensen** — Fusion 360 + SolidWorks mastery — https://youtube.com/@LarsChristensen
- **Paul Munford (CADSetterOut)** — Inventor production workflows — https://youtube.com/@CADSetterOut
- **sliptonic** — FreeCAD Path workbench — https://youtube.com/@sliptonic
- **Product Design Online** — Fusion 360 product design — https://youtube.com/@ProductDesignOnline
- **Blender Guru** — Blender photoreal pipeline — https://youtube.com/@blenderguru
- **CG Cookie** — Blender character pipeline — https://youtube.com/@cg_cookie
- **Grant Abbitt** — Blender game-ready characters — https://youtube.com/@grantabbitt
- **FlippedNormals** — ZBrush + Marvelous Designer pro pipeline — https://youtube.com/@FlippedNormals

### CAM channels
- **Titans of CNC Academy** — Mastercam + Fusion CAM strategies — https://youtube.com/@TITANSofCNC
- **NYC CNC** — Fusion 360 CAM + Tormach workflows — https://youtube.com/@NYCCNC
- **John Saunders / NYCCNC** — shop-floor CAM lessons — https://youtube.com/@NYCCNC
- **Edge Precision** — Mazak multi-axis + Mastercam — https://youtube.com/@EdgePrecision
- **Cutting Tool Engineering** — Industry CAM techniques (articles + video) — https://ctemag.com
- **Sandvik Coromant** — Cutting data + chip-control reference — https://youtube.com/@SandvikCoromant
- **Haas Automation** — Haas controller + macro programming — https://youtube.com/@HaasAutomationInc

## Book references

### CAD
- Farin — Curves and Surfaces for CAGD
- Shigley's Mechanical Engineering Design (10th ed)
- Boothroyd & Dewhurst — Product Design for Manufacture and Assembly
- ASME Y14.5-2018 — Dimensioning and Tolerancing
- Anatomy for Sculptors (Ulric & Ostroski) — for organic Blender work

### CAM
- Machinery's Handbook (Industrial Press, latest)
- Sandvik Modern Metal Cutting (textbook)
- Smid — CNC Programming Handbook
- Lynch — Machining Tools and Operations
- Boothroyd, Knight, Dewhurst — Fundamentals of Machining and Machine Tools

## Top-10 CAD entries (sample)

- `1- Basic Training Day 1/2D_Drawing.pdf` (blueprint-pdf · pdf)
- `PRISM CAD-CAM TRAINING/BASIC SINGLE HOLE CASING/BSHC 1C v0.pdf` (other-pdf · pdf)
- `PRISM CAD-CAM TRAINING/BASIC SINGLE HOLE CASING/BSHC 2C.pdf` (other-pdf · pdf)
- `PRISM FOLDER FROM HOME/CAD MODELS FOR TESTING/CASING WITH SINGLE SIDE BORE Drawing v2.pdf` (blueprint-pdf · pdf)
- `RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf` (other-pdf · pdf)
- `RESOURCE PDFS/FUSION CAD.pdf` (other-pdf · pdf)
- `SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotes.pdf` (other-pdf · pdf)
- `SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenoteschs.pdf` (other-pdf · pdf)
- `SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesdeu.pdf` (other-pdf · pdf)
- `SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesfra.pdf` (other-pdf · pdf)

## Top-10 CAM entries (sample)

- `MANUFACTURER_CATALOGS/uploaded/01-Global-CNC-Full-Catalog-2023.pdf` (resource-catalog · pdf)
- `MANUFACTURER_CATALOGS/uploaded/2018 Rapidkut Catalog.pdf` (resource-catalog · pdf)
- `MANUFACTURER_CATALOGS/uploaded/543f80b8_2016_orange_vise_catalog.pdf` (resource-catalog · pdf)
- `MANUFACTURER_CATALOGS/uploaded/Accupro 2013.pdf` (resource-catalog · pdf)
- `MANUFACTURER_CATALOGS/uploaded/AMPC_US-EN.pdf` (resource-catalog · pdf)
- `MANUFACTURER_CATALOGS/uploaded/BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf` (resource-catalog · pdf)
- `MANUFACTURER_CATALOGS/uploaded/CAMFIX_Catalog.pdf` (resource-catalog · pdf)
- `MANUFACTURER_CATALOGS/uploaded/catalog_c010b_full.pdf` (resource-catalog · pdf)
- `MANUFACTURER_CATALOGS/uploaded/Flash_Solid_catalog_INCH.pdf` (resource-catalog · pdf)
- `MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_G_Drilling.pdf` (resource-catalog · pdf)

## Consume API

- **JSON handoff:** `state/shared/cadcam-consolidated-corpus.json`
- **delta pipeline:** reads `cad[]` → `/cad-extract`, `/cad-train`, `prism_cad` consumers
- **kilo pipeline:** reads `cam[]` → `/cam-strategy`, `/mastercam-setup`, `/hypermill-*`, `prism_cam` consumers
- **Bridge edges:** `system-graph` edges with `type IN ('enriches-engine', 'feeds-dispatcher')` from `pdf-extract.*` / `college.course.*` sources
- **Per-source extraction:** `/pdf-learn <pdf>` or `/college-extract <slug>` (already wired)
- **YouTube:** `/video-learn` — drop watchlist URLs into `state/shared/video-watchlist.json`

Related: [[reference_college_course_autogen_specs_2026_05_24]] · [[reference_pdf_course_bridge_iter20_2026_05_24]]
