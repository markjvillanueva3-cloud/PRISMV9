---
name: reference-pdf-extract-solidworks-tolerance-2026_05_25
description: "india iter33 — 10 tolerance/GD&T/fits tips from Planchard's Engineering Graphics with SOLIDWORKS 2021 (120MB CAD textbook, Ch 3). Delta's primary book, finally extracted."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.727Z
aliases: reference_pdf_extract_solidworks_tolerance_2026_05_25
---


iter33 (slot:india, 2026-05-25) extracted 10 tips from the 4th book — David C. Planchard's "Engineering Graphics with SOLIDWORKS 2021" (SDC Publications, 120MB, ~750 pages). This was delta's primary book, deferred since iter27.

**Target**: Chapter 3 — "Dimensioning Practices, Tolerancing & Fasteners" (ANSI Y14.5 + fits + GD&T). Highest leverage for `GDTValidationEngine` + `ToleranceStackEngine` + `PdfBlueprintDimensionExtractorEngine`.

**Output**: `state/shared/extracted-pdfs/solidworks-eng-graphics-tolerance-tips.jsonl` + `knowledge/wiki/training/extracted/solidworks-eng-graphics-tolerance.md`.

**3 rules that should change PRISM behavior**:
1. **swg-005** — MMC bonus tolerance: when a feature carries positional tol with (M) modifier, actual_tol = stated + |actual_size − MMC|. `GDTValidationEngine` should APPLY this; audit whether current implementation does.
2. **swg-006** — System tolerance default: `ToleranceStackEngine` should default to worst-case sum for safety-critical mating pairs, RSS only as opt-in statistical mode.
3. **swg-007** — 3 fit types (clearance / interference / transition): `CADGeometryEngine` + `GDTValidationEngine` should auto-classify every mating-feature pair, enabling press-fit detection and bearing-fit recommendation.

**Bridge engines fed**: GDTValidationEngine (9) · ToleranceStackEngine (8) · PdfBlueprintDimensionExtractorEngine (6) · CADGeometryEngine (5) · CMMParseEngine (5) · QuoteEstimatorEngine (3).

**Audience**: delta (primary CAD slot) · kilo (CAM uses tolerances for strategy choice) · alpha/bravo (operators) · india (post-validation) · hotel (cost-tradeoff).

**Pending from same book**: Chapters 4-9 (SOLIDWORKS UI + part modeling + assembly + drawing — large delta training corpus), Ch 11 (additive manufacturing).

**Cumulative state across iter27-33**:
- 4 books extracted (NexGenCAM 2012, Autodesk 2014, Mech Eng Handbook 2001, Planchard SOLIDWORKS 2021)
- 43 page-cited tribal tips
- 6 PSN legs operationally synergized
- In-process engine consumer (`AIResourceLearningEngine.getTribalGuidanceForEngine`) closed iter32's gap

**Cross-refs**: [[reference_pdf_extract_fundamentals_cnc_2026_05_25]] · [[reference_pdf_extract_foc2014_workholding_2026_05_25]] · [[reference_pdf_extract_meh_vibration_2026_05_25]] (iter27/29/30 sister extractions).
