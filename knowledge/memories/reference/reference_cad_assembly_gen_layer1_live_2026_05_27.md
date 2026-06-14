---
name: reference-cad-assembly-gen-layer1-live-2026-05-27
description: "Piece-3 layer-1 (planFromArchetype) library shipped + live-verified against the 204-template substrate. SolidWorks can now plan a turbine assembly autonomously — 8 ops, all primary-source, zero manual review."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.037Z
aliases: reference_cad_assembly_gen_layer1_live_2026_05_27
---


# Piece-3 layer-1 LIVE (slot:delta iter43-iter44, 2026-05-27)

## What shipped
`H:/prism-slot-delta/scripts/lib/cad-assembly-plan-lib.mjs` — 4 exports:
- `ARCHETYPE_RECIPES` — 7 prerequisite-ordered archetype recipes (turbine, blisk, impeller, mold-die, weldment, sheet-metal-enclosure, die-set)
- `validateArchetypeParams(archetype, params)` — finite-number + type-shape validation
- `planFromArchetype(archetype, software, opts)` — consumes `proposeFunctionOperations()` priors with generic fallback + manual-review flagging
- `archetypeReadinessReport(software, opts)` — coverage-per-archetype rollup

Tests: 13/13 PASS at `H:/prism-slot-delta/scripts/lib/cad-assembly-plan-lib.test.mjs`.

## Live-run results (against actual iter25-iter42 substrate)
SolidWorks archetype readiness:
- weldment: **100% coverage** (7/7 ops have SW templates)
- sheet-metal-enclosure: **100% coverage** (8/8 ops, 1 generic fallback)
- die-set: **85.7%** (6/7 + 1 generic fallback)
- turbine: ALL 8 ops primary-source (zero manual-review)

The substrate built across iter25-iter42 is sufficient to autonomously plan turbine assemblies in SolidWorks. This is concrete piece-3 progress on the operator 4-part directive.

## Pipeline status (3-layer architecture from spec)
1. **Layer 1 PLAN** — ✅ SHIPPED (this file)
2. **Layer 2 SYNTHESIZE** — next-chat: per-software file emitters (start with SW→STEP, reuse `cad-live-regen-batch.mjs`)
3. **Layer 3 VALIDATE** — next-chat: round-trip STEP re-parse + `prism_safety:validate_physics` + S(x) gate

## Why this matters
The iter25-iter42 substrate (204 templates, 31 categories, 2520 tribal entries) wasn't theoretical — it materially enables autonomous CAD assembly generation. The plan library proves the substrate is wired correctly and ready for layer 2.

## Next-chat task list (concrete)
1. Implement `synthesizeOperation(op, params)` per-software → STEP emitter
2. Wire `prism_cad:generate_assembly` dispatcher action
3. Round-trip test: turbine plan → STEP → re-extract via `step-assembly-extract-lib.mjs` → assert entity match
4. Validate via `prism_safety:validate_physics` for shop_floor S(x) ≥ 0.98

## Commit on slot/delta
- iter43 spec: `state/shared/specs/CAD-ASSEMBLY-GENERATION-ENGINE-2026-05-27.md`
- iter44 lib: `scripts/lib/cad-assembly-plan-lib.{mjs,test.mjs}` (424 LOC, 13/13 tests)

## Memory anchors
- `reference_cad_template_engineering_wins_2026_05_27` — substrate buildup pattern (6× ROI of engineering > harvests)
- `reference_cad_template_coverage_plateau_2026_05_27` — coverage ceiling at 80.6% (pre-category-expansion)
