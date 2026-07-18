---
type: extracted-book
source_book: "Fundamentals of CNC Machining (Autodesk 2014 edition)"
author: "Autodesk, Inc."
year: 2014
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter56"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Fundamentals_of_CNC_Machining.pdf"
extraction_focus: "Lesson 6 — CNC Operation (10-step process, pre-start checklist, Fixture Offset XY/Z, TLO setting per tool, program transfer methods, offset-adjust without reposting, shutdown discipline)"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-operation-tips.jsonl"
tip_count_this_pass: 8
chapter_progress: "Autodesk 9/10 lessons extracted (Ch 2 safety + Ch 5 G-code + Ch 6 operation + Ch 7 toolpaths + Ch 8 turning + earlier)"
cumulative_iter27_56_tips: 89
audience_slots: ["alpha", "bravo", "kilo", "india", "delta", "hotel"]
---

# Fundamentals of CNC Machining (Autodesk 2014) — Lesson 6 CNC Operation extraction

> Tenth pass overall (iter56). Lesson 6 is the **operator-facing** core of the Autodesk curriculum — covers the 10-step CNC setup-to-shutdown process that every operator follows every shift. This iter wires the operator-knowledge layer into ShopFloorTraining + OperatorOnboarding + WorkCoordinateSystem engines (previously thin on operator-procedure tribal).

## Why this chapter

PRISM's mill/lathe physics + G-code engines need a complementary **operator-knowledge** layer because the iron at JM Die's shop is run by humans who follow procedures. The 8 tips formalize:

- The **10-step process** (Pre-Start → Start/Home → Load Tools → TLO → Fixture XY → Fixture Z → Load Program → Run → Adjust → Shutdown) — skipping any step ≈ collision or wrong-dim part
- **Pre-start checklist** — oil/coolant/air/work-area/doors. Haas requires ≥70 PSI for ATC; below that the carousel hangs mid-cycle
- **Fixture Offset XY** as Machine→WCS converter — G54-G59 register table semantics
- **Fixture Offset Z + TLO formula** — TOOL_TIP_Z = MACHINE_Z + FIXTURE_Z + TLO_Z
- **TLO per tool** + verification procedures (dry-run-with-Z-offset, NC4 probe)
- **Program transfer** — RS-232 / USB-FAT32 / DNC streaming; control memory limits; filename rules
- **Adjust offsets without re-posting** — operator-side fine-tune via D/H register edits (the production benefit of CDC/TLO programming)
- **Shutdown leave-as-found** — clean as a safety control

These tips power JM Die's shop-floor safety tier (Ω≥0.95, S(x)≥0.98) by giving the safety validator the **operator-procedure context** to validate against.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| foc14-601 | 10-step CNC operation process — strict ordering | ShopFloorTraining + OperatorOnboarding + ShopSafety + MachineController + JMDieCustomer |
| foc14-602 | Pre-start checklist — oil/coolant/air ≥70PSI Haas/work-area/doors | ShopFloorTraining + OperatorOnboarding + ShopSafety + MachineController |
| foc14-603 | Fixture Offset XY = Machine→WCS converter; G54-G59 + extended G54.1 P1..P48 | WorkCoordinateSystem + ShopFloorTraining + MachineController + PostProcessor + ShopSafety |
| foc14-604 | Fixture Offset Z purpose; TOOL_TIP_Z = MACHINE_Z + FIXTURE_Z + TLO_Z formula | WorkCoordinateSystem + ShopFloorTraining + MachineController + ShopSafety + CollisionDetection |
| foc14-605 | TLO setting per tool; dry-run-with-Z-offset verification; NC4 in-cycle re-measure | WorkCoordinateSystem + ShopFloorTraining + MachineController + ShopSafety + CollisionDetection + ToolWearProgression |
| foc14-606 | Program transfer — RS-232 / USB-FAT32-only / DNC streaming / proprietary | ShopFloorTraining + MachineController + PostProcessor + OperatorOnboarding |
| foc14-607 | Adjust D/H registers post-run (NOT the program — re-post wipes program edits) | ShopFloorTraining + MachineController + ToolWearProgression + ToolDeflection + GDT |
| foc14-608 | Shutdown discipline — remove tools, retract axes, clean, leave-as-found | ShopFloorTraining + OperatorOnboarding + ShopSafety + MachineController |

## High-leverage rules

- **10-step order non-negotiable**: TLO depends on tools loaded; Fixture XY needs machine homed. Skipping order = crash class.
- **Haas 70 PSI**: below it the ATC hangs mid-cycle — JM Die check air pressure first thing every shift.
- **G54 ≠ G55 ≠ ...**: never reuse a register across setups without re-touch-off. The convention is op-1=G54, op-2=G55, but the discipline is "every setup gets its own register."
- **Edit registers NOT program**: programs re-post from CAM lose edits. Tool-wear logs predict offset accumulation.
- **Clean is a safety control**: chip on floor = slip hazard (foc14-302); chip on bench = hand-cut hazard. Clean-as-you-go (foc14-307) makes shutdown 30 sec instead of 30 min.

## Bridges into PRISM pipelines

- `engine.ShopFloorTrainingEngine` → all 8 tips (the operator-knowledge primary sink — this iter is its largest single feed)
- `engine.OperatorOnboardingEngine` → all 8 (new-operator onboarding curriculum)
- `engine.ShopSafetyValidationEngine` → foc14-601, 602, 603, 604, 605, 608 (safety-tier validation requires operator-procedure context)
- `engine.MachineControllerEngine` → all 8 (controller-side execution of operator actions)
- `engine.WorkCoordinateSystemEngine` → foc14-603, 604, 605 (G54-G59 register semantics + Fixture Z + TLO)
- `engine.JMDieCustomerEngine` → foc14-601 (JM Die operator procedure convention layer)
- `engine.PostProcessorPipelineEngine` → foc14-603, 606 (post emits G54-G59 calls + filename conventions)
- `engine.CollisionDetectionEngine` → foc14-604, 605 (wrong TLO = collision; collision model needs operator-procedure context)
- `engine.ToolWearProgressionEngine` → foc14-605, 607 (offset adjustment = wear progression observation)
- `engine.ToolDeflectionEngine` → foc14-607 (deflection-driven offset adjustment)
- `engine.GDTValidationEngine` → foc14-607 (post-run inspection drives offset adjustment back to spec)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-operation-tips.jsonl` (canonical path). Consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`.

## Pipeline status after iter56

- Roost: `ghost.extracted_pdf_tips` — 92 book pivots, **317 tribal tips** (was 309), 410 total nodes
- Autodesk progress: **9/10 lessons** extracted (Lessons 2/5/6/7/8 + earlier batch stubs)
- Cumulative iter27-56: **89 page-cited tips**
- **NEW domain coverage**: ShopFloorTraining + OperatorOnboarding + WorkCoordinateSystem engines now have first-class operator-procedure tribal (prior tips were CAD/CAM/physics-focused; operator knowledge was thin)

## See also

- [[autodesk-2014-turning]] — Lesson 8 (8 tips, foc14-801..808 — lathe insert + tool + CSS + G50)
- [[autodesk-2014-gcode-language]] — Lesson 5 (8 tips, foc14-501..508 — G-code language fundamentals)
- `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-shop-safety-tips.jsonl` — Lesson 2 (7 tips, foc14-301..307 — shop safety, ties into shutdown discipline)
- `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-toolpath-tips.jsonl` — Lesson 7 (7 tips, foc14-201..207 — toolpath strategy)
