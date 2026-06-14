---
type: extracted-book
source_book: "Engineering Graphics with SOLIDWORKS 2021"
author: "David C. Planchard"
publisher: "SDC Publications"
year: 2021
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter33"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf"
pdf_size_mb: 120.0
extraction_focus: "Chapter 3 — Dimensioning Practices, Tolerancing & Fasteners (precision/tolerance + 3 tolerance types + 3 fit types + MMC/LMC + ANSI Y14.5)"
tribal_jsonl: "state/shared/extracted-pdfs/solidworks-eng-graphics-tolerance-tips.jsonl"
tip_count_this_pass: 10
audience_slots: ["alpha", "bravo", "delta", "kilo", "india", "hotel"]
---

# Engineering Graphics with SOLIDWORKS 2021 (Planchard) — Chapter 3 tolerance extraction

> Fourth extraction pass — delta's primary book, 120MB / ~750-page CAD textbook. This pass targets Chapter 3 (Dimensioning Practices, Tolerancing & Fasteners) which directly feeds PRISM's `GDTValidationEngine` + `ToleranceStackEngine` + `PdfBlueprintDimensionExtractorEngine`.

## Why this chapter

CAD geometry without tolerance + fit context is incomplete data. Chapter 3 is the canonical Planchard treatment of ANSI Y14.5 dimensioning — the same standard PRISM's GD&T engines validate against.

## The 10 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| swg-001 | Precision-cost tradeoff (loosest functional tolerance wins) | GDT + ToleranceStack + QuoteEstimator |
| swg-002 | Mating vs non-mating surfaces (don't over-machine castings) | GDT + SurfaceFinishPredictor + CAD |
| swg-003 | General (title block) vs local (on-dim) tolerance priority | GDT + BlueprintExtractor + CMM |
| swg-004 | 3 tolerance types: LIMIT / UNILATERAL / BILATERAL | GDT + ToleranceStack |
| swg-005 | MMC / LMC definitions + bonus-tolerance under MMC modifier | GDT + ToleranceStack + CMM |
| swg-006 | PIECE vs SYSTEM tolerance (stack-up = SUM, RSS for stats) | ToleranceStack + Safety |
| swg-007 | 3 fit types: CLEARANCE / INTERFERENCE / TRANSITION | GDT + ToleranceStack + CAD |
| swg-008 | ALLOWANCE vs TOLERANCE (between-parts vs within-part) | ToleranceStack + CMM + FAI |
| swg-009 | NOMINAL / BASIC / ACTUAL / LIMITS — 4 distinct meanings | GDT + BlueprintExtractor + CMM |
| swg-010 | Continuous (chain) vs baseline (single datum) dimensioning | ToleranceStack + GDT + CAD |

## High-leverage rules

### swg-005 (MMC bonus tolerance)
This is the rule that PRISM's `GDTValidationEngine` should APPLY: when a feature carries a positional tolerance with the (M) MMC modifier, the actual tolerance allowed = stated_tol + |actual_size − MMC|. Parts that depart from worst-case material get bonus tolerance. The current engine may not implement this.

### swg-006 (system tolerance = sum of piece tolerances)
PRISM's `ToleranceStackEngine` should DEFAULT to **worst-case sum** for safety-critical mating pairs, with **RSS** as an opt-in statistical mode. The current default behavior should be audited.

### swg-007 (3 fit types)
`CADGeometryEngine` + `GDTValidationEngine` should classify every mating-feature pair into clearance/interference/transition based on the published part tolerances. This becomes the foundation for automatic press-fit-detection and bearing-fit recommendation.

## Bridge engines fed by this pass

| Engine | Tip count |
|---|---|
| `engine.GDTValidationEngine` | 9 |
| `engine.ToleranceStackEngine` | 8 |
| `engine.PdfBlueprintDimensionExtractorEngine` | 6 |
| `engine.CADGeometryEngine` | 5 |
| `engine.CMMParseEngine` | 5 |
| `engine.QuoteEstimatorEngine` | 3 |
| `engine.SurfaceFinishPredictorEngine` | 1 |
| `engine.SafetyEngine` | 1 |
| `engine.FAIEngine` | 1 |
| `engine.JMDieCustomerEngine` | 1 (cost philosophy) |

## What's NOT extracted from this book (pending)

- Chapters 1-2: history + isometric / multi-view projection (lower training value, more conceptual)
- Chapters 4-9: SOLIDWORKS UI + part modeling + assembly + drawing (delta's primary CAD-training corpus — large)
- Chapter 10: CSWA exam prep (skill assessment, not engine training)
- Chapter 11: Additive Manufacturing / 3D printing (delta tangent, low-priority for current PRISM scope)

## Cross-references

- iter27: `fundamentals-cnc-machining.md` (NexGenCAM 2012)
- iter29: `fundamentals-cnc-machining-2014-workholding.md` (Autodesk 2014)
- iter30: `mech-eng-handbook-vibration.md` (Marghitu 2001)
- **iter33 (this)**: `solidworks-eng-graphics-tolerance.md` (Planchard 2021)

## Audit trail

- Extractor: `pdftotext -layout -f 140 -l 200` (poppler)
- Section anchors: `grep` on "Precision and Tolerance", "Tolerance Types", "Fit", "MMC", "LMC"
- Manual content review pages 140-180 (chapter 3 main body)
- All 10 tips cite chapter + section + specific page (3-22 to 3-33 range)
