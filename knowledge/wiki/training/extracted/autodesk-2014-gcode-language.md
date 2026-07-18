---
type: extracted-book
source_book: "Fundamentals of CNC Machining (Autodesk 2014 edition)"
author: "Autodesk, Inc."
year: 2014
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter54"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Fundamentals_of_CNC_Machining.pdf"
extraction_focus: "Lesson 5 — CNC Programming Language (modal vs non-modal, safety block, 21 address codes, CDC, TLO, arc IJK vs R, block numbers, special characters)"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-gcode-language-tips.jsonl"
tip_count_this_pass: 8
chapter_progress: "Autodesk 7/10 chapters extracted (Ch 2 safety + Ch 5 G-code + Ch 7 toolpaths + earlier batch stubs covering rest)"
cumulative_iter27_54_tips: 73
audience_slots: ["delta", "kilo", "alpha", "india", "bravo", "hotel"]
---

# Fundamentals of CNC Machining (Autodesk 2014) — Lesson 5 CNC programming language extraction

> Eighth book-targeted pass (iter54 — Autodesk pivot after 4 consecutive Planchard chapters). Lesson 5 is the **foundational G-code reference** — every PRISM post-processor + machine-controller + G-code safety analyzer needs this knowledge as a first-class tribal-tip layer.

## Why this chapter

PRISM's CAM pipeline emits G-code through 5+ controller dialects (Fanuc, Haas, Okuma, Mazak, Heidenhain) via `PostProcessorPipelineEngine`. The pipeline can't post-process correctly without understanding the *language rules* — what's modal vs non-modal, what the safety block resets, which letters mean what, and where the bear-traps are (CDC must activate on a linear move, IJK is more reliable than R, TLO clears on M6).

The 8 tips give PRISM the **operator-level vocabulary** to interpret G-code outputs and validate them before they reach the iron. Direct bridge into JM Die's shop-floor safety tier (Ω≥0.95, S(x)≥0.98) — wrong TLO + missing safety-block = collision; the safety tier needs the tribal knowledge to know what to check.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| foc14-501 | Modal vs non-modal codes — state persistence between blocks | PostProcessor + MachineController + GCodeSafety + ShopSafety |
| foc14-502 | Safety block convention (N1 G17 G20 G40 G49 G80 G90) — what each cancels + why every program needs it | PostProcessor + MachineController + GCodeSafety + ShopSafety + ShopFloorTraining |
| foc14-503 | 21 alphabetic address codes — every letter's meaning + restrictions | PostProcessor + MachineController + GCodeSafety + GCodeTimeEstimator |
| foc14-504 | Cutter Diameter Compensation (CDC) — G41/G42/G40 + D-register, MUST activate on linear move (never arc) | PostProcessor + MachineController + GCodeSafety + ToolWearProgression + ToolDeflection |
| foc14-505 | Tool Length Offset (TLO) — G43/G44/G49 + H-register, combines with Fixture Offset, clears on M6 | PostProcessor + MachineController + GCodeSafety + ShopSafety + CollisionDetection |
| foc14-506 | Arc moves — I/J/K vectors PREFERRED over R (R ambiguous for >180° arcs + floating-point error on tangent) | PostProcessor + MachineController + GCodeSafety + CADGeometry |
| foc14-507 | Block numbers — optional except for subprograms; skip in 3D programs to save control memory | PostProcessor + MachineController + GCodeSafety |
| foc14-508 | 4 special characters: %, ( ), /, ; — comment ALL-CAPS ≤40-char rule, block-delete switch | PostProcessor + MachineController + GCodeSafety + ShopFloorTraining |

## High-leverage rules

- **Safety block is non-negotiable:** N1 G17 G20 G40 G49 G80 G90 — ANY missing element bleeds state from prior program. JM Die operators must REJECT programs without the safety block. Modal-state-bleed is a top-3 cause of crashes.
- **TLO + Fixture Offset combo:** TOOL_TIP_Z = MACHINE_Z + FIXTURE_OFFSET_Z + TLO_Z. Get any of the three wrong → tool drills into the fixture. Touch-off procedure is the operator's primary defense.
- **CDC activation:** G41/G42 MUST be activated on a linear lead-in move and cancelled on a linear lead-out move. NEVER activate or cancel during an arc — controller behavior undefined; some go to last-commanded-coord, some abort, some silently continue with the wrong offset.
- **IJK > R always:** R is ambiguous for arcs >180° (two possible centers satisfy the radius equation). IJK vectors are deterministic. The few extra bytes of IJK are worth it.
- **Comments are ALL CAPS:** `(T2: .375 END MILL)` not `(T2: .375 End Mill)`. Mixed-case comments silently dropped by some controllers. JM Die hard rule.

## Bridges into PRISM pipelines

- `engine.PostProcessorPipelineEngine` → tips foc14-501..508 (all 8 — the engine that emits G-code needs to know what it's emitting)
- `engine.MachineControllerEngine` → all 8 (controller-side interpretation of these codes)
- `engine.GCodeSafetyAnalyzerEngine` → all 8 (safety-validate G-code outputs against these rules)
- `engine.ShopSafetyValidationEngine` → foc14-501, 502, 505 (modal-state + safety block + TLO are operator-side safety gates)
- `engine.ShopFloorTrainingEngine` → foc14-502, 508 (operator onboarding needs safety block + comment conventions)
- `engine.ToolWearProgressionEngine` → foc14-504 (CDC D-register edit is the operator's wear compensation path)
- `engine.ToolDeflectionEngine` → foc14-504 (CDC also compensates for deflection)
- `engine.CollisionDetectionEngine` → foc14-505 (TLO wrong → collision; collision detection needs the TLO model)
- `engine.GCodeTimeEstimatorEngine` → foc14-503 (F-register feed rates drive time estimation)
- `engine.CADGeometryEngine` → foc14-506 (arc geometry IJK conversion from CAD splines)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-gcode-language-tips.jsonl` (canonical path). Consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`.

## Pipeline status after iter54

- Roost: `ghost.extracted_pdf_tips` — 92 book pivots, **301 tribal tips** (was 293), 394 total nodes
- Autodesk progress: Lesson 2 safety + Lesson 5 G-code + Lesson 7 toolpaths now extracted manually with page citations; rest of Autodesk corpus covered by batch stubs
- **NEW bridge unlocked**: PostProcessorPipelineEngine + MachineControllerEngine now have first-class G-code-language tribal tips (foc14-501..508) — prior tips were CAM/toolpath-strategy level, this iter adds the syntactic layer

## See also

- `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-shop-safety-tips.jsonl` — Lesson 2 (7 tips, foc14-301..307)
- `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-toolpath-tips.jsonl` — Lesson 7 (7 tips, foc14-201..207)
- [[solidworks-eng-graphics-additive]] — Planchard Ch 11 (8 tips, swg-801..808 — additive manufacturing)
- [[solidworks-eng-graphics-revolved]] — Planchard Ch 6 (7 tips, swg-501..507 — revolved features + lathe bridge)
