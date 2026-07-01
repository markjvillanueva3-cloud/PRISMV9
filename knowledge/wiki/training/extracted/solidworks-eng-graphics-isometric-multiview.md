---
type: extracted-book
source_book: "Engineering Graphics with SOLIDWORKS 2021"
author: "David C. Planchard"
publisher: "SDC Publications"
year: 2021
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter59"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf"
pdf_size_mb: 120.0
extraction_focus: "Chapter 2 — Isometric Projection & Multi-View Drawings (1st/3rd angle, Cavalier/Cabinet oblique, isometric axis rule, 1/2/3-pt perspective, view-count rules, section conventions, hatch material codes, detail-view scale)"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/solidworks-eng-graphics-isometric-multiview-tips.jsonl"
tip_count_this_pass: 8
chapter_progress: "9/11 Planchard chapters (Ch 2 + 3 + 5 + 6 + 7 + 8 + 9 + 11 + earlier)"
cumulative_iter27_59_tips: 113
audience_slots: ["delta", "kilo", "alpha", "hotel", "india", "bravo"]
---

# Engineering Graphics with SOLIDWORKS 2021 (Planchard) — Chapter 2 isometric+multiview extraction

> Ninth Planchard pass (iter59). Chapter 2 is the **engineering-graphics-theory complement to Ch 9** (which was operator-side SOLIDWORKS drawing tools). Ch 2 teaches the projection conventions + view-count rules + section/hatch conventions that the operator must understand BEFORE applying the SOLIDWORKS tools in Ch 9. ID range chosen swg-911..918 (continuing the 9xx series after iter58's swg-901..908 to avoid peer collision).

## Why this chapter

PRISM's blueprint pipeline (`PdfBlueprintDimensionExtractorEngine` + `CADFromBlueprintEngine`) ingests engineering drawings produced by external customers — and those drawings follow standard conventions that must be correctly identified before extraction. The 8 tips formalize:

- **First-angle vs Third-angle projection** — the fundamental convention split; misidentifying = entire drawing mirror-imaged → wrong-handed parts
- **Cavalier vs Cabinet oblique** — Cabinet is the default for realism
- **Isometric Rule #1** — measurements only on/parallel to isometric axes (inclined-line dims are ambiguous in iso)
- **1/2/3-point perspective** — NOT used in mechanical drawings (dimensionally unreliable); reserved for marketing/exploded-asm
- **View-count rules** — 3 (default), 2 (symmetric flat/cylindrical), 1 (uniform/sheet metal with note)
- **Section view + rib convention** — ribs/webs/spokes NOT sectioned (false-thickness avoidance)
- **Section hatch material identification** — ANSI Y14.2 / ISO 128-50 standardized patterns per material
- **Detail view scale annotation** — REQUIRED when detail scale differs from sheet

These tips dramatically improve blueprint-extraction accuracy: the extractor now knows to (1) check projection symbol before mirroring, (2) skip inclined-line measurements in iso views, (3) classify section hatch to recover material info, (4) parse detail-view scale annotations rather than assuming sheet scale.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| swg-911 | 1st-angle vs 3rd-angle projection — US/EU split, symbol REQUIRED to disambiguate | CADGeometry + CADFromBlueprint + PdfBlueprintExtractor + GDT + JMDieCustomer |
| swg-912 | Cavalier (1:1 receding) vs Cabinet (1:2 receding, more used) oblique | CADGeometry + CADFromBlueprint + PdfBlueprintExtractor |
| swg-913 | Isometric Rule #1 — measurements only on/parallel to iso axes; inclined dims ambiguous | CADGeometry + PdfBlueprintExtractor + GDT + CADFromBlueprint |
| swg-914 | Perspective 1/2/3-pt — NOT for mechanical (dimensionally unreliable); reserved for marketing | CADGeometry + CADFromBlueprint + PdfBlueprintExtractor |
| swg-915 | View count rules — 3-view default, 2-view symmetric/cylindrical, 1-view uniform/sheet-metal-with-note | CADGeometry + CADFromBlueprint + PdfBlueprintExtractor + GDT |
| swg-916 | Section view conventions — cutting-plane arrows = direction of sight; ribs NOT sectioned | CADGeometry + CADFromBlueprint + PdfBlueprintExtractor + GDT + CADFeatureRecognize |
| swg-917 | Section hatch ANSI Y14.2 material identification — 12+ standardized patterns | CADGeometry + PdfBlueprintExtractor + CADFromBlueprint + MaterialSelection + GDT |
| swg-918 | Detail view scale annotation REQUIRED when detail scale ≠ sheet scale | CADGeometry + PdfBlueprintExtractor + GDT + CADFromBlueprint |

## High-leverage rules

- **Projection symbol check is NON-NEGOTIABLE:** Before extracting dims, identify the projection symbol. 3rd-angle = small circle at WIDE end of truncated cone pointing right; 1st-angle = small circle at NARROW end. Missing symbol → reject as ambiguous, request clarification.
- **Iso views are reference-only for dimensions:** Inclined-line measurements in iso views are ambiguous (could be true-length, axis-projection, or arrow-position artifact). Rely on orthographic views for definitive dimensions.
- **Section hatch = backup material spec:** When title-block material is missing/illegible, the section hatch pattern (ANSI Y14.2) recovers the spec. Steel/CI/Al/brass have distinct visual signatures.
- **Ribs/webs/spokes UNSECTIONED:** Lengthwise cut through a rib leaves the rib UNHATCHED to avoid the false-thickness impression. Exception: revolved section through a rib for clarity.
- **Detail-scale annotation = data:** Always parse the SCALE annotation on detail labels. Don't apply sheet scale to detail dims.

## Bridges into PRISM pipelines

- `engine.CADGeometryEngine` → all 8 tips (the CAD primitive layer)
- `engine.CADFromBlueprintEngine` → all 8 (reverse path — these conventions drive extraction logic)
- `engine.PdfBlueprintDimensionExtractorEngine` → all 8 (the extractor's accuracy depends on convention recognition)
- `engine.GDTValidationEngine` → swg-911, 913, 915, 916, 917, 918 (projection + view-count + section + detail-scale all affect GD&T frame placement)
- `engine.CADFeatureRecognizeEngine` → swg-916 (section-view + rib-no-section convention drives feature recognition)
- `engine.MaterialSelectionEngine` → swg-917 (section hatch is the secondary material-spec channel)
- `engine.JMDieCustomerEngine` → swg-911 (per-customer projection convention; ITW US = 3rd-angle, EU customers = 1st-angle)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `mcp-server/data/ingestion_cache/extracted-pdfs/solidworks-eng-graphics-isometric-multiview-tips.jsonl` (canonical path). Consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`.

## Pipeline status after iter59

- Roost: `ghost.extracted_pdf_tips` — 92 book pivots, **341 tribal tips** (was 333), 434 total nodes
- Planchard progress: **9/11 chapters** (Ch 2 isometric · Ch 3 tolerance · Ch 5 part modeling · Ch 6 revolved · Ch 7 shell/rib/draft · Ch 8 assembly · Ch 9 drawing · Ch 11 additive · earlier)
- Cumulative iter27-59: **113 page-cited tips**
- **KEY UNLOCK**: PdfBlueprintDimensionExtractorEngine + CADFromBlueprintEngine now have first-class projection-convention tribal (1st vs 3rd angle disambiguation, iso-view dim ambiguity, section hatch material recovery, detail-scale parsing) — these were the largest known accuracy gaps in the blueprint extractor

## See also

- [[solidworks-eng-graphics-drawing]] — Ch 9 (7 tips, swg-401..407 — operator-side SOLIDWORKS drawing layout, the Ch 2 complement)
- [[solidworks-eng-graphics-part-modeling-deep]] — Ch 5 (8 tips, swg-901..908 — sketch + Extruded foundations)
- [[solidworks-eng-graphics-tolerance]] — Ch 3 (10 tips, swg-001..010 — GD&T)
- [[solidworks-eng-graphics-revolved]] — Ch 6 (7 tips, swg-501..507)
- [[solidworks-eng-graphics-additive]] — Ch 11 (8 tips, swg-801..808)
