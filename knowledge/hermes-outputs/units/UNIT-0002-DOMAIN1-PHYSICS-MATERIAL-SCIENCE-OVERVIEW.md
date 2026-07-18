# UNIT-0002 — Domain 1: Physics & Material Science Overview

**Unit ID**: 0002
**Domain**: Physics & Material Science
**Title**: Physics & Material Science Overview and Unit Breakdown
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 4-6 hours (foundation)

## Description

Establish the complete physics and material science foundation for PRISM. This unit creates the atomic unit breakdown for all physics domains (material behavior, wear mechanisms, strain rate, phase transformations, serrated chip formation, built-up edge chemistry, work hardening, dynamic strain aging, minimum chip thickness, size effect) and wires them to the relevant PRISM dispatchers (prism_calc, prism_safety, etc.). It produces the master physics unit catalog that all downstream units depend on.

## Acceptance Criteria

- [ ] Full breakdown of Domain 1 into 8-12 atomic units with IDs, titles, descriptions, and acceptance criteria
- [ ] Each sub-unit mapped to specific PRISM dispatchers and formulas (no hardcoded constants)
- [ ] Real-data validation strategy defined using JM Die shop data (INCH units verified per part)
- [ ] 3-of-3 scrutiny template applied
- [ ] No stubs or placeholders — all criteria are measurable and verifiable
- [ ] Wired to prism_calc and prism_memory for formula storage and retrieval
- [ ] Unit files created for all sub-units under units/

## Dependencies

- UNIT-0001 (infrastructure)
- PRISM physics constants (mcp-server/src/physics/constants.ts)
- JM Die shop profile and real job data

## Deliverables

- This overview unit file
- 8-12 atomic unit .md files for Domain 1 sub-topics
- Updated MASTER-UNIT-PLAN.md with cross-references
- Dispatcher wiring map (prism_calc actions for each physics area)
- Validation harness stub (to be exercised in later units)

## Autonomous Execution Notes

This unit is the foundation for all physics-driven features. The autonomous harness will pick it up, generate sub-units, wire them, and mark complete only after real validation on JM Die data. All work must be fully working and wired before proceeding to Domain 2.