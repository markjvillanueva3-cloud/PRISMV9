---
type: extracted-book
source_book: "hyperMILL Software Documentation"
author: "OPEN MIND Technologies AG"
year: 2017
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter61"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/hyperMILL_2D_3D.pdf"
pdf_size_mb: 33.0
extraction_focus: "hyperMILL 2018.1 — 3D strategy taxonomy (16+ cycles), Optimised Roughing HSM, Feature+Macro technology, Slope-dependent + Smooth Overlap, Turning 13 cycles + Rollfeed, Drilling 14 cycles, Probing 4 cycles, multi-channel coolant management"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/hypermill-2018-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
milestone_crossed: "100 books in roost"
cumulative_iter27_61_tips: 129
audience_slots: ["delta", "kilo", "alpha", "india", "bravo", "hotel"]
---

# hyperMILL Software Documentation (OPEN MIND 2017) — extraction

> Thirteenth pass overall (iter61). **MILESTONE: 100-book corpus crossed** (99 → 100 books in `ghost.extracted_pdf_tips` roost). hyperMILL is OPEN MIND Technologies' flagship CAM (used by JM Die alongside Mastercam) — direct feed into `HyperMillStrategyEngine` which previously had only strategy-stub tribal.

## Why this book

hyperMILL is one of the **two primary CAM systems** at JM Die (along with Mastercam). PRISM's `HyperMillStrategyEngine` exists but was thin on operator-level tribal — most strategy choice was done by humans referencing hyperMILL docs directly. This iter wires the strategy + parameter knowledge:

- **3D strategy taxonomy** — 16+ cycles classified by purpose (roughing / finishing / remnant / specialized)
- **Optimised Roughing** — hyperMILL's HSM/HEM analog (parallel to Mastercam Dynamic Mill); scallop-height-driven stepover is the signature
- **Feature + Macro technology** — separation of intent (feature) from execution (macro); enables reuse + audit
- **Slope-dependent + Smooth Overlap** — surface-quality at flat/steep transitions (mold/die polish reduction)
- **Turning 13 cycles + Rollfeed** — the lathe-side equivalent of dynamic milling
- **Drilling 14 cycles** — full hole-making spectrum including 5X Helical (MAXX Machining)
- **Probing 4 cycles** — on-machine inspection closes the feedback loop
- **Multi-channel coolant management** — supports HPC + flood + TSC + air-blast + MQL + cryogenic with per-channel IDs

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| hm18-001 | hyperMILL 3D strategy taxonomy — 16+ cycles by purpose | HyperMillStrategy + CamStrategySelect + AdaptiveFeedrate + MillExpertAdvisor + CADFeatureRecognize + PostProcessor |
| hm18-002 | Optimised Roughing HSM — adaptive pockets, scallop-driven stepover, smooth roll-in | HyperMillStrategy + CamStrategySelect + AdaptiveFeedrate + MillExpertAdvisor + ToolDeflection + MillChipEvacuationPredictor |
| hm18-003 | Feature + Macro technology — intent/execution separation; FeatureCatalogue reuse | HyperMillStrategy + CamStrategySelect + CADFeatureRecognize + MillExpertAdvisor + PostProcessor |
| hm18-004 | Slope-dependent + Smooth Overlap — flat/steep transition optimization in 4 cycles | HyperMillStrategy + CamStrategySelect + MillExpertAdvisor + GCodeTimeEstimator + GDT |
| hm18-005 | Turning 13 cycles + Rollfeed (lathe HSM/HEM analog with 4 dedicated roll-turn insert types) | HyperMillStrategy + LatheCorePhysics + LatheLiveToolingPlanner + LatheSpeedFeedCalculator + LatheTribalIntegration + CamStrategySelect |
| hm18-006 | Drilling 14 cycles taxonomy + L/D-based picking + Thread Milling vs Tapping decision | HyperMillStrategy + CamStrategySelect + Thread + MillExpertAdvisor + MillChipEvacuationPredictor + ToolDeflection |
| hm18-007 | Probing 4 cycles — closed-loop machining + in-process inspection + adaptive feedback | HyperMillStrategy + ShopFloorTraining + MachineController + ToolWearProgression + GDT + WorkCoordinateSystem |
| hm18-008 | Multi-channel coolant management — 7 additional coolants + per-channel IDs for post emission | HyperMillStrategy + PostProcessor + MachineController + CamStrategySelect + GCodeSafetyAnalyzer |

## High-leverage rules

- **Optimised Roughing is hyperMILL's flagship HSM:** Maps to Mastercam Dynamic Mill (dm14-002). Both use HSM strategy but hyperMILL's scallop-height-driven param is operator-friendlier (quality-driven not stepover-driven).
- **Feature ≠ Macro:** Feature captures geometric INTENT (this is a tapped hole); macro captures EXECUTION (this is how we machine tapped holes). 1 feature + 1 macro = 50 holes configured.
- **Rollfeed Turning solves contour-finish inconsistency:** Standard finish-turn varies engagement on contoured parts → uneven finish. Rollfeed maintains constant insert-orientation-relative-to-contour-normal.
- **5X Helical Drilling (MAXX Machining):** For inclined deep holes — combines helical interpolation + 5-axis tool orientation. JM Die candidate for tilted-bore work that previously required tilt fixture + 3-axis drill.
- **Coolant IDs → correct M-codes:** Per the iter27 PRISM HurcoV11 TSC M88 fix — hyperMILL's per-channel coolant IDs are exactly the metadata MasterPost needs to emit correct multi-channel coolant codes.
- **Probing = closed-loop feedback:** Mid-cycle probing → wear-progression update → next-cycle parameter adjust. Direct bridge into `ToolWearProgressionEngine` + iter77's `MillCustomerOrderLifecycleEngine` first-piece-approval flow.

## Bridges into PRISM pipelines

- `engine.HyperMillStrategyEngine` → all 8 tips (the dedicated hyperMILL consumer — was tribal-bare, now fed)
- `engine.CamStrategySelectEngine` → all 8 (CAM-system-agnostic strategy choice now has hyperMILL-specific options)
- `engine.AdaptiveFeedrateEngine` → hm18-001, 002 (HSM + Optimised Roughing both use adaptive feed)
- `engine.MillExpertAdvisorEngine` → all 8 (operator recommendations across strategy/turning/drilling/probing/coolant)
- `engine.MillChipEvacuationPredictorEngine` → hm18-002, 006 (Optimised Roughing + drilling pecking/chip-break chip evac)
- `engine.ToolDeflectionEngine` → hm18-002, 006 (HSM + drilling L/D drive deflection)
- `engine.LatheCorePhysicsEngine` → hm18-005 (turning cycles + Rollfeed)
- `engine.LatheLiveToolingPlannerEngine` → hm18-005 (turning tool selection)
- `engine.LatheSpeedFeedCalculatorFacadeEngine` → hm18-005 (turning F/S)
- `engine.LatheTribalIntegrationEngine` → hm18-005 (lathe tribal sink)
- `engine.ThreadEngine` → hm18-006 (thread milling + tapping)
- `engine.ShopFloorTrainingEngine` → hm18-007 (probing operator procedure)
- `engine.MachineControllerEngine` → hm18-007, 008 (probe execution + coolant M-code)
- `engine.ToolWearProgressionEngine` → hm18-007 (probing-driven wear updates)
- `engine.WorkCoordinateSystemEngine` → hm18-007 (probe → fixture offset)
- `engine.GDTValidationEngine` → hm18-004, 007 (transition surface finish + probe-measured GD&T)
- `engine.PostProcessorPipelineEngine` → hm18-003, 008 (feature/macro post output + coolant ID-to-M-code mapping)
- `engine.GCodeSafetyAnalyzerEngine` → hm18-008 (coolant code emission validation)
- `engine.CADFeatureRecognizeEngine` → hm18-001, 003, 006 (feature detection feeds strategy + macro choice)
- `engine.GCodeTimeEstimatorEngine` → hm18-004 (smooth-overlap cycle-time impact)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `mcp-server/data/ingestion_cache/extracted-pdfs/hypermill-2018-tips.jsonl` (canonical path). Consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`.

## Pipeline status after iter61

- Roost: `ghost.extracted_pdf_tips` — 94 book pivots, **357 tribal tips** (was 349), 452 total nodes
- **MILESTONE: 100 books in roost** (99 → 100) — first 3-digit corpus size
- Cumulative iter27-61: **129 page-cited tips**
- **Key unlock**: `HyperMillStrategyEngine` (and its 5-engine sibling cluster: Lathe* turning chain, MillChipEvac, ToolWear, ProbingFeedback) now have first-class hyperMILL tribal — was tribal-bare before this iter.

## See also

- [[mastercam-dynamic-milling]] — Mastercam Dynamic Mill (8 tips, dm14-001..008 — the Mastercam-side HSM analog)
- [[autodesk-2014-3d-toolpaths]] — Autodesk Lesson 9 (8 tips, foc14-901..908 — CAM-agnostic 3D fundamentals)
- [[autodesk-2014-turning]] — Autodesk Lesson 8 (8 tips, foc14-801..808 — turning-fundamentals that hm18-005 builds on)
