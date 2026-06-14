---
type: extracted-book
source_book: "Fundamentals of CNC Machining (Autodesk 2014 edition)"
author: "Autodesk, Inc."
year: 2014
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter55"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Fundamentals_of_CNC_Machining.pdf"
extraction_focus: "Lesson 8 — CNC Turning (CNMG insert designation, tolerance grades, hole/chipbreaker codes, 5 lathe tool types, boring bar geometry, thread touch-off, Constant Surface Speed G96/G97, G50 RPM clamp)"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-turning-tips.jsonl"
tip_count_this_pass: 8
chapter_progress: "Autodesk 8/10 lessons extracted (Ch 2 safety + Ch 5 G-code + Ch 7 toolpaths + Ch 8 turning + earlier)"
cumulative_iter27_55_tips: 81
audience_slots: ["delta", "kilo", "alpha", "india", "bravo", "hotel"]
---

# Fundamentals of CNC Machining (Autodesk 2014) — Lesson 8 CNC Turning extraction

> Ninth pass overall (iter55) — first **lathe-focused** Autodesk extraction. Lesson 8 was the second-highest-leverage remaining chapter because PRISM's lathe-side tribal corpus has been thinner than mill — this iter fixes that by feeding 8 lathe-specific tips into 8+ Lathe* engines.

## Why this chapter

PRISM's lathe stack has 20+ engines (`LatheSpeedFeedCalculator`, `LatheLiveToolingPlanner`, `LatheTribalIntegration`, `LathePostGeneratorDialect`, `LatheThermodynamics`, `LatheCorePhysics`, etc.) but most operator-level tribal knowledge has been *implicit* in the engine code, not surfaced as queryable tips. This iter wires the foundational lathe vocabulary:

- **Insert selection** (CNMG-433 designation, tolerance grades, chipbreaker geometry) — the language of lathe tooling catalogs
- **Tool types** (Face/Turn, Groove, Bore, Thread, Cutoff) — the 5-way decomposition every lathe op falls into
- **Boring bar geometry** — entry-rule + L:D deflection (links into `ToolDeflectionEngine`)
- **Thread tool touch-off** — Z procedure + X gage adjustment (links into `ThreadEngine`)
- **CSS (Constant Surface Speed) G96/G97** — the auto-RPM feature unique to lathes
- **G50 RPM clamp** — the safety hard-cap that prevents CSS runaway near part-center

JM Die runs Okuma + Hyundai + Doosan lathes. The CSS/G50 pair is **non-negotiable** for any facing operation — operators need the tribal knowledge to verify G50 precedes G96 in every program.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| foc14-801 | CNMG-433 insert designation system — full letter+digit breakdown | LatheTribalIntegration + LatheSpeedFeedCalculatorFacade + LatheLiveToolingPlanner + LatheCorePhysics |
| foc14-802 | 4 insert tolerance grades (M/G/E/K) — pick by part tolerance, NOT op type | LatheTribalIntegration + LatheCorePhysics + LatheLiveToolingPlanner + GDT + ToolDeflection |
| foc14-803 | 6 hole/chipbreaker letter codes (G/W/R/T/P/Z) — chip control prevents the 6-foot snake | LatheTribalIntegration + LatheCorePhysics + LatheLiveToolingPlanner + ShopSafety |
| foc14-804 | 5 lathe tool types (Face/Turn + Groove + Bore + Thread + Cutoff) — when each applies | LatheTribalIntegration + LatheLiveToolingPlanner + LatheCorePhysics + LatheSpeedFeedCalculator |
| foc14-805 | Boring bar entry-rule + L:D deflection ratio (≤3:1 carbide, 4-6:1 anti-vibration, >6:1 specialty) | LatheTribalIntegration + LatheLiveToolingPlanner + LatheCorePhysics + ToolDeflection + CollisionDetection |
| foc14-806 | Thread-tool touch-off: Z-edge + tip-distance from insert docs; X-gage adjustment for Thread Class | LatheTribalIntegration + Thread + LatheLiveToolingPlanner + LatheCorePhysics + GDT |
| foc14-807 | CSS G96/G97 — RPM = (SFM × 3.82) / Dia; halving Dia doubles RPM; G97 for drilling/tapping | LatheSpeedFeedCalculatorFacade + LatheTribalIntegration + LatheCorePhysics + LathePostGeneratorDialect + MachineController + PostProcessorPipeline |
| foc14-808 | G50 spindle-RPM clamp MUST precede G96 — prevents CSS runaway as cut diameter → 0 | LatheSpeedFeedCalculatorFacade + LatheTribalIntegration + LatheCorePhysics + LathePostGeneratorDialect + MachineController + ShopSafety + GCodeSafetyAnalyzer |

## High-leverage rules

- **G50 before G96 ALWAYS:** Missing G50 + G96 = spindle accelerates to mechanical failure as cut diameter → 0. Verify every program with G96 has a preceding G50 within the same tool block.
- **Insert + holder match:** CNMG-433 fits a CNMG-433 holder. Mismatched insert/holder = ejection at speed. Catalog the holder, then pick inserts; never the reverse.
- **Boring bar entry hole:** Must accommodate bar SHAFT diameter + 0.040-0.060in radial clearance for chips. Tip-only clearance is not enough.
- **Tolerance grade matched to PART:** K-class on a roughing op wastes money. M-class on a precision finish wastes the operator's time chasing tolerance. PART_TOL ≥ INSERT_TOL + WEAR_TOL + DEFLECTION_TOL.
- **Thread gage on first piece:** Z touch-off is mechanical (edge + insert docs); X touch-off is iterative (cut → gage → adjust). Never skip the gage check on the first piece — wrong X = wrong thread fit = unscrewable parts.

## Bridges into PRISM pipelines

- `engine.LatheTribalIntegrationEngine` → all 8 tips (the dedicated lathe tribal sink — primary consumer of this iter)
- `engine.LatheSpeedFeedCalculatorFacadeEngine` → foc14-801, 804, 807, 808 (insert + tool type + CSS + G50 all drive speed/feed math)
- `engine.LatheLiveToolingPlannerEngine` → foc14-801..806 (tool selection + setup planning)
- `engine.LatheCorePhysicsEngine` → all 8 (lathe physics from iter52 unlock now extends to insert + tooling tribal)
- `engine.LathePostGeneratorDialectEngine` → foc14-807, 808 (CSS + G50 dialect emission per controller — Okuma OSP / Fanuc / Mazatrol)
- `engine.MachineControllerEngine` → foc14-807, 808 (controller-side CSS execution + G50 enforcement)
- `engine.PostProcessorPipelineEngine` → foc14-807 (CSS post-processor output)
- `engine.ShopSafetyValidationEngine` → foc14-803, 808 (chipbreaker safety + G50 enforcement)
- `engine.GCodeSafetyAnalyzerEngine` → foc14-808 (validate G50-precedes-G96 invariant)
- `engine.ToolDeflectionEngine` → foc14-802, 805 (tolerance + boring bar L:D drive deflection model)
- `engine.CollisionDetectionEngine` → foc14-805 (boring bar entry collision class)
- `engine.ThreadEngine` → foc14-806 (thread touch-off procedure)
- `engine.GDTValidationEngine` → foc14-802, 806 (insert tolerance grade + thread class fit)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-turning-tips.jsonl` (canonical path). Consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`.

## Pipeline status after iter55

- Roost: `ghost.extracted_pdf_tips` — 92 book pivots, **309 tribal tips** (was 301), 402 total nodes
- Autodesk progress: 8/10 lessons extracted (Lessons 2/5/7/8 + earlier batch stubs)
- Cumulative iter27-55: **81 page-cited tips**
- **NEW domain coverage**: 20+ Lathe* engines now have first-class operator-level tribal tips (insert selection + tool types + CSS + G50 safety) — prior lathe tribal was implicit in code

## See also

- [[autodesk-2014-gcode-language]] — Lesson 5 (8 tips, foc14-501..508 — G-code language fundamentals)
- `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-shop-safety-tips.jsonl` — Lesson 2 (7 tips, foc14-301..307)
- `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-toolpath-tips.jsonl` — Lesson 7 (7 tips, foc14-201..207)
- [[solidworks-eng-graphics-revolved]] — Planchard Ch 6 (7 tips, swg-501..507 — CAD revolved → lathe bridge)
