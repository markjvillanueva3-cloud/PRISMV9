---
type: extracted-book
source_book: "Fundamentals of CNC Machining (Autodesk 2014 edition)"
author: "Autodesk, Inc."
year: 2014
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter57"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Fundamentals_of_CNC_Machining.pdf"
extraction_focus: "Lesson 9 — 3D Toolpaths (mesh+gouge-check, 3D CDC unsupported, data starving, toolpath filtering, cut tolerance band, 3D roughing pocket, Parallel vs Scallop, REST + Pencil)"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-3d-toolpaths-tips.jsonl"
tip_count_this_pass: 8
chapter_progress: "Autodesk 10/10 lessons extracted (Ch 2 + 5 + 6 + 7 + 8 + 9 + earlier batch stubs)"
cumulative_iter27_57_tips: 97
audience_slots: ["delta", "kilo", "alpha", "india", "bravo"]
---

# Fundamentals of CNC Machining (Autodesk 2014) — Lesson 9 3D Toolpaths extraction

> Eleventh pass overall (iter57). **Autodesk Fundamentals of CNC Machining corpus now 10/10 lessons** with manual page-cited extraction (Lessons 2/5/6/7/8/9 detailed + earlier batch stubs for remaining). Lesson 9 completes the CAM-strategy spectrum (Lesson 7 was 2D toolpaths; this is 3D for molds/dies/organic surfaces).

## Why this chapter

PRISM's 2D toolpath knowledge (Lesson 7, foc14-201..207) was foundational; 3D adds the **non-prismatic surface** dimension that mold/die/cosmetic-surface work requires. The 8 tips formalize:

- **3D mesh + gouge-check** — why 3D toolpaths are calc-intensive (O(triangles × path points))
- **3D CDC unsupported** — operator can't fix worn 3D finish tool by editing register; must REPLACE
- **Data starving + bumping** — the #1 3D-program failure mode (programmer-error class, not equipment)
- **Toolpath filtering** — 90% file-size reduction by fitting long lines / tangent arcs
- **Cut tolerance ± band** — pick LOOSEST tolerance that meets PART tolerance
- **3D roughing strategy** — tiered-cake pocketing with constant-thickness leftover stock
- **Parallel vs Scallop finish** — calc-speed vs surface-finish tradeoff
- **REST + Pencil** — efficient cleanup with tool slightly smaller than smallest feature

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| foc14-901 | 3D mesh + gouge-check — center-tip control + end-mill vs ball-mill paths | CamStrategySelect + CADGeometry + CollisionDetection + PostProcessor + ToolDeflection |
| foc14-902 | 3D CDC NOT supported — replace worn tool, no register fix | CamStrategySelect + PostProcessor + MachineController + ToolWearProgression + ToolDeflection |
| foc14-903 | Data starving + bumping — block-rate limit, machine shudder, fraction-of-programmed feed | CamStrategySelect + PostProcessor + MachineController + GCodeTimeEstimator + ShopSafety |
| foc14-904 | Toolpath filtering — 90% size reduction; G17/G18/G19-parallel paths filter best | CamStrategySelect + PostProcessor + MachineController + GCodeTimeEstimator |
| foc14-905 | Cut tolerance ± band — total band = 2× tolerance; pick LOOSEST that meets part spec | CamStrategySelect + PostProcessor + GCodeTimeEstimator + GDT + ToolDeflection |
| foc14-906 | 3D roughing — 3D pocket slice-normal-to-Z → tiered-cake constant-thickness leftover | CamStrategySelect + CADGeometry + PostProcessor + ToolDeflection + AdaptiveFeedrate |
| foc14-907 | Parallel vs Scallop finish — fast+reliable+scallops vs constant-scallop-height+large-program | CamStrategySelect + PostProcessor + ToolDeflection + GCodeTimeEstimator + GDT |
| foc14-908 | REST + Pencil — calc-stock-removed; tool slightly smaller than smallest feature | CamStrategySelect + CADGeometry + PostProcessor + ToolDeflection + CollisionDetection + GCodeTimeEstimator |

## High-leverage rules

- **3D worn tool → REPLACE, not adjust:** 3D CDC unsupported. Monitor wear aggressively (probe re-measure, scheduled changes by cut hours not visual).
- **Loosest cut tolerance that meets part spec:** Excessive fine tolerance → millions of blocks → data starving → poor finish (the OPPOSITE of fine-tolerance intent).
- **Filter every 3D program:** 90% size reduction, prevents data starving, saves control memory.
- **Constant-stock-thickness roughing:** Variable leftover stock → finish tool sees variable engagement → chatter + dim variation.
- **Biggest-tool-first finishing:** Per the 'sculpt-a-bear' principle — cut away anything that doesn't belong, finish in biggest-tool-first order, use REST/Pencil only on what remains.
- **REST tool slightly smaller than smallest feature:** Makes REST calculations simpler + more effective.

## Bridges into PRISM pipelines

- `engine.CamStrategySelectEngine` → all 8 tips (the CAM-strategy choice layer is the primary consumer)
- `engine.PostProcessorPipelineEngine` → all 8 (post-emits 3D toolpath G-code)
- `engine.CADGeometryEngine` → foc14-901, 906, 908 (mesh source + roughing-runoff + REST stock-tracking)
- `engine.MachineControllerEngine` → foc14-902, 903, 904 (controller-side execution + data-starving behavior)
- `engine.ToolDeflectionEngine` → foc14-901, 902, 905, 906, 907, 908 (deflection-aware path choices)
- `engine.CollisionDetectionEngine` → foc14-901, 908 (gouge-check + REST collision avoidance)
- `engine.ToolWearProgressionEngine` → foc14-902 (3D-finish-tool wear monitoring)
- `engine.GCodeTimeEstimatorEngine` → foc14-903, 904, 905, 907, 908 (cycle-time impact of strategy + tolerance)
- `engine.GDTValidationEngine` → foc14-905, 907 (cut tolerance + finish strategy drive achievable GD&T)
- `engine.AdaptiveFeedrateEngine` → foc14-906 (constant-stock-thickness enables adaptive feedrate)
- `engine.ShopSafetyValidationEngine` → foc14-903 (data-starving is a wear/safety issue)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-3d-toolpaths-tips.jsonl` (canonical path). Consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`.

## Pipeline status after iter57

- Roost: `ghost.extracted_pdf_tips` — 92 book pivots, **325 tribal tips** (was 317), 418 total nodes
- **Autodesk corpus now 10/10 lessons extracted** with manual page-cited tips (Lessons 2/5/6/7/8/9 detailed + earlier batch stubs)
- Cumulative iter27-57: **97 page-cited tips**
- All Autodesk-Fundamentals-of-CNC-Machining bridges now first-class wired

## See also

- [[autodesk-2014-operation]] — Lesson 6 (8 tips, foc14-601..608 — operator procedure)
- [[autodesk-2014-turning]] — Lesson 8 (8 tips, foc14-801..808 — lathe insert + CSS)
- [[autodesk-2014-gcode-language]] — Lesson 5 (8 tips, foc14-501..508 — G-code language)
- `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-toolpath-tips.jsonl` — Lesson 7 (7 tips, foc14-201..207 — 2D toolpaths, the prismatic complement to this lesson's 3D)
- `mcp-server/data/ingestion_cache/extracted-pdfs/autodesk-2014-shop-safety-tips.jsonl` — Lesson 2 (7 tips, foc14-301..307 — safety)
