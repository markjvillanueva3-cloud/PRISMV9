---
type: extracted-book
source_book: "Haas 2023 Mill Operator's Manual (NGC Interactive PDF)"
author: "Haas Automation, Inc."
year: 2023
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter62"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/English - Mill Operator's Manual NGC 2023.pdf"
extraction_focus: "Haas 2023 Mill safety decals + control function keys + mode taxonomy + MEM mode switches + HOME G28 caution + TOOL RELEASE safety"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/haas-mill-2023-operator-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_62_tips: 137
audience_slots: ["alpha", "bravo", "kilo", "india", "delta", "hotel"]
---

# Haas 2023 Mill Operator's Manual (NGC Interactive PDF) — extraction

> Fourteenth pass overall (iter62). Haas is the dominant US machine tool brand at JM Die scale (10-30 machines, mixed mill/lathe job shop). The 2023 manual is the CURRENT operator doctrine — supersedes 2014/2018 editions cited in older tribal. NEW BOOK in corpus (100 → 101 books).

## Why this book

PRISM's `ShopFloorTrainingEngine` + `OperatorOnboardingEngine` had operator-procedure tribal from Autodesk Fundamentals (iter56) but NOT Haas-specific tribal — and Haas controls have unique modal behavior (the 6-mode taxonomy, the MEM-mode 3-switch program-control trio, the HOME G28 no-warning caution, the TOOL RELEASE button discipline). This iter fills the Haas-specific gap that the Autodesk-based generic tips couldn't reach.

The safety decals tip (hms23-001) bridges into the JM Die safety-tier validation — Haas decals are visible-on-machine evidence that the operator can read at the work area, complementing the in-software safety-validation engine.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| hms23-001 | Haas safety decal taxonomy (yellow/red/black categories) | ShopFloorTraining + OperatorOnboarding + ShopSafety + MachineController |
| hms23-002 | Long-tool RPM ejection warning — enclosures don't stop thrown parts | ShopFloorTraining + ShopSafety + ToolDeflection + MachineController + CollisionDetection |
| hms23-003 | Coolant concentration 6-10% — refractometer + rust-inhibitive + never pure water | ShopFloorTraining + OperatorOnboarding + ShopSafety + MachineController + MillExpertAdvisor |
| hms23-004 | 7 primary Haas function keys (RESET / POWER UP / RECOVER / TOOL OFFSET MEASURE / NEXT TOOL / TOOL RELEASE / PART ZERO SET) | ShopFloorTraining + OperatorOnboarding + MachineController + WorkCoordinateSystem + ToolWearProgression |
| hms23-005 | Haas 6 mode taxonomy (EDIT / MEMORY / MDI / HANDLE JOG / ZERO RETURN / LIST PROGRAMS) | ShopFloorTraining + OperatorOnboarding + MachineController + WorkCoordinateSystem |
| hms23-006 | MEM mode 3 switches (SINGLE BLOCK / OPTIONAL STOP / BLOCK DELETE) — prove-out→production | ShopFloorTraining + OperatorOnboarding + MachineController + GCodeSafetyAnalyzer + PostProcessor |
| hms23-007 | HOME G28 NO-WARNING caution — operator MUST verify axis paths before pressing | ShopFloorTraining + OperatorOnboarding + ShopSafety + MachineController + CollisionDetection |
| hms23-008 | TOOL RELEASE button safety — hold tool, spindle dogs aligned, heavy-tool two-operator | ShopFloorTraining + OperatorOnboarding + ShopSafety + MachineController |

## High-leverage rules

- **Decal taxonomy by shape:** yellow triangle = hazard (PPE/care), red circle/slash = prohibited (don't do this), black circle = informational (good practice). Operator must know all 3.
- **Long-tool RPM limit:** >5000 RPM with long tool = ejection risk. Enclosure DOES NOT stop tools. Stand off-axis during high-RPM long-tool ops.
- **Coolant: refractometer not eyeball:** 6-10% concentration; lean=rust ($5-20k repair), rich=waste. Pure water EXPLICITLY PROHIBITED.
- **MEM 3-switch progression:** prove-out (all 3 ON) → production (all 3 OFF). Same program, different switch state, zero edits required.
- **HOME G28 = silent rapid:** No prompt before motion. Verify axis paths clear, no spindle tool that could hit ATC, work area clear of personnel. Top crash-on-startup cause.
- **TOOL RELEASE = hold-before-press:** Release without supporting tool → drops. Heavy tools need two operators. Spindle dogs must align with V-flange cutouts.

## Bridges into PRISM pipelines

- `engine.ShopFloorTrainingEngine` → all 8 tips (Haas-specific operator training)
- `engine.OperatorOnboardingEngine` → all 8 (new-operator curriculum for Haas shop)
- `engine.ShopSafetyValidationEngine` → hms23-001, 002, 003, 007, 008 (safety-tier validation needs Haas-specific context)
- `engine.MachineControllerEngine` → all 8 (Haas controller-side behavior)
- `engine.WorkCoordinateSystemEngine` → hms23-004, 005 (PART ZERO SET + ZERO RETURN mode)
- `engine.ToolWearProgressionEngine` → hms23-004 (TOOL OFFSET MEASURE automates wear-progression observation)
- `engine.ToolDeflectionEngine` → hms23-002 (long-tool deflection drives RPM ceiling)
- `engine.CollisionDetectionEngine` → hms23-002, 007 (tool-ejection + HOME-G28 collision class)
- `engine.MillExpertAdvisorEngine` → hms23-003 (coolant-concentration recommendations)
- `engine.GCodeSafetyAnalyzerEngine` → hms23-006 (M01 + slash + single-block analysis)
- `engine.PostProcessorPipelineEngine` → hms23-006 (post emits M01/slash for operator-friendly programs)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `mcp-server/data/ingestion_cache/extracted-pdfs/haas-mill-2023-operator-tips.jsonl` (canonical path). Consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`.

## Pipeline status after iter62

- Roost: `ghost.extracted_pdf_tips` — 95 book pivots, **365 tribal tips** (was 357), 461 total nodes
- NEW BOOK: 100 → 101 books
- Cumulative iter27-62: **137 page-cited tips**
- **Key unlock**: ShopFloorTraining + OperatorOnboarding now have **Haas-specific** tribal (was Autodesk-generic-only). Bridges into JM Die safety-tier validation with machine-brand awareness.

## See also

- [[autodesk-2014-operation]] — Autodesk Lesson 6 (8 tips, foc14-601..608 — generic CNC operation; Haas-specific layer on top)
- [[autodesk-2014-shop-safety-tips]] — Autodesk Lesson 2 (7 tips, foc14-301..307 — generic shop safety; Haas decal taxonomy adds machine-brand-specific decal lookup)
- [[hypermill-2018]] — hyperMILL CAM (8 tips, hm18-001..008 — CAM side, Haas is the controller side)
- [[mastercam-dynamic-milling]] — Mastercam Dynamic Mill (8 tips, dm14-001..008 — CAM side)
