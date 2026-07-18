# UNIT-0005 — Strain Rate Effects and Serrated Chip Formation

**Unit ID**: 0005
**Domain**: Physics & Material Science
**Title**: Strain Rate Effects and Serrated Chip Formation
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 5 hours

## Description

Model strain rate sensitivity, serrated chip formation mechanics, and related instabilities for high-speed machining across material groups. Formulas imported from constants. Validate against JM Die high-speed turning/milling data with measured chip morphology and forces.

## Acceptance Criteria

- [ ] Strain rate models for at least 4 material groups with algebraic proofs
- [ ] Serrated chip formation predictor with <8% error on real JM Die chips
- [ ] Wired to prism_calc:strain_rate_* and prism_safety
- [ ] Real data E2E (force + chip photos/measurements) + 3-of-3 scrutiny
- [ ] No inlined constants or stubs

## Dependencies

- UNIT-0002, UNIT-0003
- JM Die high-speed job data + chip samples

## Deliverables

- StrainRateEngine + SerratedChipPredictor
- Dispatcher actions
- Validation dataset and report

## Autonomous Execution Notes

Core physics implementation first, then live JM Die validation before wiring.