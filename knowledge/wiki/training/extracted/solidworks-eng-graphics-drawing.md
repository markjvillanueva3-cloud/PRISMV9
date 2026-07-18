---
type: extracted-book
source_book: "Engineering Graphics with SOLIDWORKS 2021"
author: "David C. Planchard"
publisher: "SDC Publications"
year: 2021
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter51"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf"
pdf_size_mb: 120.0
extraction_focus: "Chapter 9 — Fundamentals of Drawing (4 orthographic + isometric views, Detail View, display modes, Insert Model Items vs Smart Dimension, exploded views, BOM table + 3 BOM types, Auto Balloon)"
tribal_jsonl: "state/shared/extracted-pdfs/solidworks-eng-graphics-drawing-tips.jsonl"
tip_count_this_pass: 7
chapter_progress: "5/11 chapters extracted from Planchard (Ch 3 tol + Ch 7 features + Ch 8 assembly + Ch 9 drawing + earlier)"
cumulative_iter27_51_tips: 50
audience_slots: ["delta", "kilo", "alpha", "hotel", "india"]
---

# Engineering Graphics with SOLIDWORKS 2021 (Planchard) — Chapter 9 drawing extraction

> Fifth Planchard pass (5/11 chapters). Chapter 9 is the canonical Planchard treatment of CAD-to-drawing handoff — the same workflow PRISM's `CADGeometryEngine` → `PdfBlueprintDimensionExtractorEngine` → `CADFromBlueprintEngine` round-trip targets. Drawing-side tribal feeds the **operator-readable artifact** side of the print-to-program pipeline.

## Why this chapter

CAD model without a properly-laid-out drawing is unusable on the shop floor. Chapter 9 covers the four pillars that turn a SOLIDWORKS part/assembly into a fabricator-ready drawing:

1. **View layout** — which orthographic projections + when to add Detail / Isometric
2. **Dimension source** — Insert Model Items (parametric link) vs Smart Dimension (driven)
3. **Assembly documentation** — Exploded View + BOM + Auto Balloon
4. **View display fidelity** — Wireframe / Hidden Lines / Shaded modes per-view

These feed directly into PRISM's PDF-blueprint extraction (`PdfBlueprintDimensionExtractorEngine` consumes the very output drawings this chapter teaches you to produce) and JM Die's quoting+ERP handoff (BOM column conventions match what `QuoteEstimatorEngine` + `ERPSyncEngine` ingest).

## The 7 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| swg-401 | 4 standard orthographic views (Front + Top + Right + Isometric) | CADGeometry + PdfBlueprintExtractor + GDT + CADFromBlueprint |
| swg-402 | Detail View — zoomed crop of a region (scale CAN differ from parent) | CADGeometry + PdfBlueprintExtractor + GDT |
| swg-403 | 5 view display modes — Wireframe / Hidden Lines (Visible / Removed) / Shaded (with edges / solid) | CADGeometry + PdfBlueprintExtractor + CADFromBlueprint |
| swg-404 | Insert Model Items (parametric) vs Smart Dimension (driven only) | CADGeometry + GDT + PdfBlueprintExtractor + CADFromBlueprint |
| swg-405 | Exploded View for assembly drawings (combined with auto-balloon + BOM = self-documenting iso) | CADGeometry + PdfBlueprintExtractor |
| swg-406 | BOM table default columns + 3 BOM types (Top-level-only / Parts-only / Indented) — Parts Only is standard ERP handoff | CADGeometry + QuoteEstimator + JMDieCustomer + ERPSync |
| swg-407 | Auto Balloon component labeling (magnetic-line alignment; insert AFTER BOM since balloons reference item numbers) | CADGeometry + PdfBlueprintExtractor |

## High-leverage rules

- **View choice rule:** Front view = the most-characterful (typically the longest dimension horizontal). Top projects DOWN from Front (ANSI third-angle); Right projects to the RIGHT. The View Layout tool inserts all 4 simultaneously. Detail views come AFTER orthographic baselines.
- **Dimension priority:** ALWAYS prefer Insert Model Items for primary dimensions (preserves parametric link — change the part, drawing updates). Smart Dimension is for reference dims that aren't on the part model. Mixing them silently is the source of "drawing/model mismatch" failures on JM Die's CMM-in-FAI loop.
- **BOM ordering:** Item numbers are auto-determined by INSERTION ORDER in the assembly — Auto Balloon must run AFTER the BOM is inserted (balloons reference item numbers). Re-balloon after adding/removing components since item numbers shift.
- **Display mode per view:** Hidden Lines Removed for orthographic main views; Shaded With Edges for the isometric; Wireframe in details when geometry is complex. Mix on the same sheet.

## Bridges into PRISM pipelines

- `engine.CADGeometryEngine` → tip swg-401..407 (all 7 — covers view layout, dimensions, exploded, BOM, balloons)
- `engine.PdfBlueprintDimensionExtractorEngine` → swg-401..407 (consumes the drawings Planchard teaches you to produce; understanding the source layout improves extraction accuracy)
- `engine.GDTValidationEngine` → swg-401, swg-402, swg-404 (view + dimension layout choices determine where GD&T frames land)
- `engine.CADFromBlueprintEngine` → swg-401, swg-403, swg-404 (reverse path — generates a part from a drawing; needs to understand display modes + dimension source)
- `engine.QuoteEstimatorEngine` → swg-406 (BOM Parts-only column set is the quoter's input format)
- `engine.JMDieCustomerEngine` → swg-406 (JM Die's per-customer BOM column requirements — ITW/Alcoa/Optimas all want different sub-assembly flattening)
- `engine.ERPSyncEngine` → swg-406 (Parts-only BOM → ERP part-master sync)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `state/shared/extracted-pdfs/solidworks-eng-graphics-drawing-tips.jsonl` (gitignored — consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`).

## Pipeline status after iter51

- Roost: `ghost.extracted_pdf_tips` — 92 book pivots, **278 tribal tips** (was 271), 371 total nodes
- Planchard progress: **5/11 chapters** (Ch 3 tolerance · Ch 7 shell/rib/draft · Ch 8 assembly · Ch 9 drawing · prior)
- Remaining Planchard: Ch 1, Ch 2, Ch 4, Ch 6, Ch 10, Ch 11 (6 chapters)
- Engine consumer wired: `AIResourceLearningEngine.getTribalGuidanceForEngine(engineName)` returns typed `Tip[]` filtered to a specific engine — 13/13 tests passing
- CLI surface: `node scripts/query-extracted-tips.mjs --engine CADGeometryEngine --topic drawing` (22/22 tests passing)

## See also

- [[solidworks-eng-graphics-tolerance]] — Ch 3 (10 tips)
- `state/shared/extracted-pdfs/solidworks-eng-graphics-shell-rib-draft-tips.jsonl` — Ch 7 (7 tips)
- `state/shared/extracted-pdfs/solidworks-eng-graphics-assembly-tips.jsonl` — Ch 8 (7 tips)
- `state/shared/extracted-pdfs/autodesk-2014-shop-safety-tips.jsonl` — Autodesk 2014 Ch 2 (7 safety tips, audience=alpha+bravo+kilo+india)
- `state/shared/extracted-pdfs/autodesk-2014-toolpath-tips.jsonl` — Autodesk 2014 Ch 7 (7 toolpath tips, audience=delta+kilo+alpha+bravo)
