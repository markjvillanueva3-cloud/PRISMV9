# CAD + CAM Consolidated Corpus — handoff to delta + kilo

Generated 2026-06-26T13:41:42.592Z by `scripts/consolidate-cadcam-corpus.mjs` (slot:india).

## Summary

| Metric | Count |
|---|---|
| Total evaluated | 2611 |
| CAD corpus | 22 |
| CAM corpus | 867 |
| CAD ∩ CAM | 6 |
| CAD only | 16 |
| CAM only | 861 |
| Neither (general) | 1728 |

## Handoff targets

- **delta** (CAD slot) — consumes `cad[]` (22 entries) via `prism_cad` + CAD/Blender pipelines
- **kilo** (CAM slot) — consumes `cam[]` (867 entries) via `prism_cam` + CAM/post pipelines

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
- `MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29/fraisa-nx-face-finishing.pdf` (resource-catalog · pdf)
- `PRISM CAD-CAM TRAINING/BASIC SINGLE HOLE CASING/BSHC 1C v0.pdf` (other-pdf · pdf)
- `PRISM CAD-CAM TRAINING/BASIC SINGLE HOLE CASING/BSHC 2C.pdf` (other-pdf · pdf)
- `PRISM FOLDER FROM HOME/CAD MODELS FOR TESTING/CASING WITH SINGLE SIDE BORE Drawing v2.pdf` (blueprint-pdf · pdf)
- `RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf` (other-pdf · pdf)
- `RESOURCE PDFS/FUSION CAD.pdf` (other-pdf · pdf)
- `SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotes.pdf` (other-pdf · pdf)
- `SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenoteschs.pdf` (other-pdf · pdf)
- `SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesdeu.pdf` (other-pdf · pdf)

## Top-10 CAM entries (sample)

- `cimco-2025/CIMCOEdit/Posts/CNC-Calc Post Processor_Basic configuration.pdf` (other-pdf · pdf)
- `cimco-2025/CIMCOEdit/Posts/Post Processor Manual.pdf` (manual-pdf · pdf)
- `cimco-2025/CIMCOEdit/Samples/Formulas/Formulas.pdf` (machining-handbook · pdf)
- `cimco-2025/CIMCOEdit/Templates/Attachments/G76 THREADING CYCLE HAAS.pdf` (other-pdf · pdf)
- `cimco-2025/CIMCOEdit/Templates/Attachments/Siemens_Milling_CYCLE72_Profile Mill.pdf` (other-pdf · pdf)
- `cimco-2025/CIMCOEdit/Templates/Attachments/Siemens_Milling_CYCLE76_Spigot Mill.pdf` (other-pdf · pdf)
- `cimco-2025/CIMCOEdit/Tutorials/cimco-edit-mill-turn-tutorial-de.pdf` (other-pdf · pdf)
- `cimco-2025/CIMCOEdit/Tutorials/cimco-edit-mill-turn-tutorial-en.pdf` (other-pdf · pdf)
- `cimco-2026/CIMCOEdit/Posts/CNC-Calc Post Processor_Basic configuration.pdf` (other-pdf · pdf)
- `cimco-2026/CIMCOEdit/Posts/Post Processor Manual.pdf` (manual-pdf · pdf)

## Consume API

- **JSON handoff:** `state/shared/cadcam-consolidated-corpus.json`
- **delta pipeline:** reads `cad[]` → `/cad-extract`, `/cad-train`, `prism_cad` consumers
- **kilo pipeline:** reads `cam[]` → `/cam-strategy`, `/mastercam-setup`, `/hypermill-*`, `prism_cam` consumers
- **Bridge edges:** `system-graph` edges with `type IN ('enriches-engine', 'feeds-dispatcher')` from `pdf-extract.*` / `college.course.*` sources
- **Per-source extraction:** `/pdf-learn <pdf>` or `/college-extract <slug>` (already wired)
- **YouTube:** `/video-learn` — drop watchlist URLs into `state/shared/video-watchlist.json`

Related: [[reference_college_course_autogen_specs_2026_05_24]] · [[reference_pdf_course_bridge_iter20_2026_05_24]]
