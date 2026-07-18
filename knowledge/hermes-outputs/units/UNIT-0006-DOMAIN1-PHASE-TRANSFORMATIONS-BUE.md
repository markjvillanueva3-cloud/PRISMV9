# UNIT-0006 — Phase Transformations and Built-Up Edge Chemistry

**Unit ID**: 0006
**Domain**: Physics & Material Science
**Title**: Phase Transformations and Built-Up Edge Chemistry
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 5-6 hours

## Description

Implement phase transformation models (austenite, martensite, etc.) and built-up edge (BUE) chemistry/adhesion mechanics. Predict BUE formation thresholds and mitigation strategies. Wire to calc/safety. Validate on JM Die stainless and titanium jobs.

## Acceptance Criteria

- [ ] Phase diagrams and transformation kinetics models
- [ ] BUE chemistry and adhesion model with prediction accuracy >90% on real data
- [ ] Wired to prism_calc:phase_transform_* and prism_safety
- [ ] JM Die real-job validation (force, surface finish, tool photos)
- [ ] Full 3-of-3 + no stubs

## Dependencies

- UNIT-0002–0004
- Material chemistry data from JM Die

## Deliverables

- PhaseTransformationEngine + BUEChemistryModel
- Actions and tests

## Autonomous Execution Notes

Physics core → real validation → wiring.