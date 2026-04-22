---
name: Phase 0-A through 0-C Completion
description: Roadmap phases 0-A (print reading), 0-B (bug fixes), 0-C (test infrastructure) completed 2026-03-24. Foundation verified.
type: project
---

# Phase 0-A through 0-C — Completed 2026-03-24

## Phase 0-A: Print Reading Validation (6/6 units COMPLETE)
- CAMX-V17-P0A marked complete in roadmap-index.json
- X0 Y0 coordinate bug in PrintToProgramPipelineEngine FIXED — programs now use real feature positions
- Position + feature_dims added to PlannedOperation interface, threaded through G-code generation
- 73 tests across 5 test files (OCR, geometry, STEP import, CAM pipeline, E2E coordinates)

## Phase 0-B: Critical Bug Fixes (U07-U13 COMPLETE, safety deferred)
- U07: Multi-start threading — N G76 pairs with 360/N degree offsets, F=lead=pitch×starts
- U08: Facing — G72 multi-pass canned cycle replacing single-pass G01
- U09: MillTurn assembleProgram — pre-resolved (exists at line 1693)
- U10: Routing action name — turning_program → turning_print_to_program
- U11: Kienzle approach angle — h=f×sin(κr) correction added
- U12: Robustness weight — reviewed, already correct
- U13: Grooving G75 Q — peck=min(2mm, width/3) instead of raw width
- 0-B-SAFETY (roadmap line 1523) and 0-B-SECURITY (line 1568) DEFERRED

## Phase 0-C: Test Infrastructure (Sessions 0-C-1 through 0-C-3 COMPLETE)
- parseGCode utility: src/__tests__/helpers/gcode-parser.ts (49 test suite)
- 14-stage pipeline validator: src/__tests__/helpers/pipeline-stage-validator.ts
- Cross-material S/F range tables: src/__tests__/fixtures/material-sf-ranges.ts (6 ISO groups + 15 alloys)
- Controller dialect assertions: src/__tests__/helpers/controller-assertions.ts (6 families × 10+ ops)
- Parameter sanity guard: src/__tests__/helpers/parameter-sanity.ts (physical limits, per-ISO)
- Negative input battery: src/__tests__/negative-input-battery.test.ts (49/54 passing, 5 known-gap)

**Why:** These phases are the foundation — print reading, bug fixes, and test infrastructure MUST be solid before building new capabilities.

**How to apply:** Don't re-audit or re-fix anything in 0-A/0-B/0-C. Trust the tests. See project_roadmap_v24_state.md for current position.
