---
title: "MIT 2.830 triplet stubs — auto-extracted 2026-05-23"
type: triplet-stub
course_code: "2.830"
course_slug: mit-2-830-control-of-manufacturing-processes
generated_by: scripts/mit-course-triplet-extractor.mjs
generated_at: 2026-05-24T01:37:14.323Z
slot: india
goal: MIT-COURSE-INTEGRATION batch extract
related:
  - knowledge/wiki/architecture/courses/mit-2-830-control-of-manufacturing-processes.md
  - state/shared/MIT-COURSE-TRIPLET-INDEX-2026-05-23.md
---

# MIT 2.830 — triplet stubs (auto-extracted)

> Per-formula triplet stubs auto-generated from the parent course wiki entry.
> Each row is a candidate (course → formula → engine) triplet. ✅ rows have
> full hand-written memory + concept wiki entry. 📝 rows are stubs awaiting
> a per-formula deep dive (lima slot, prism-academy-specialist).
> ⬜ rows have no consuming engine documented — lima audit pending.

**Source course:** [[mit-2-830-control-of-manufacturing-processes]] · **Code:** `2.830` · **Dept:** MechE / Sloan

**Purpose in PRISM:** SPC, design of experiments, run-to-run control, process feedback. Feeds the closed-loop SFC calibration + SPC engines + adaptive-control loops.

**Raw extracted-content string:** `Shewhart/EWMA/CUSUM control-chart formulas, DOE factorial designs, EWMA run-to-run controller, Cpk acceptance gates.`

## Triplet candidates

| Formula / algorithm / concept | Documented consuming engine(s) | Triplet status |
|---|---|---|
| Shewhart/EWMA/CUSUM control-chart formulas | mitcoursedeeplearningengine, mitcourseintegrationengine, mitcourseknowledgeengine | ✅ [[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]] / [[ewma-run-to-run-controller-2026-05-23]] |
| DOE factorial designs | mitcoursedeeplearningengine, mitcourseintegrationengine, mitcourseknowledgeengine | 📝 stub — full triplet pending |
| EWMA run-to-run controller | mitcoursedeeplearningengine, mitcourseintegrationengine, mitcourseknowledgeengine | ✅ [[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]] / [[ewma-run-to-run-controller-2026-05-23]] |
| Cpk acceptance gates | mitcoursedeeplearningengine, mitcourseintegrationengine, mitcourseknowledgeengine | 📝 stub — full triplet pending |

## Apply

- Lima slot picks each 📝 row and writes the full per-formula triplet (paired memory + wiki concept entry following the [[ewma-run-to-run-controller-2026-05-23]] template).
- ⬜ rows require an engine audit first: either the formula has no PRISM implementation yet (build candidate), or the course wiki's "Consuming engines" row is incomplete (wiki fix).
- Re-run `node scripts/mit-course-triplet-extractor.mjs` after any course-wiki edit; the stubs are idempotent.

Related: [[mit-2-830-control-of-manufacturing-processes]] · [[reference_mit_courses_goal_scope_handoff_2026_05_23]]
