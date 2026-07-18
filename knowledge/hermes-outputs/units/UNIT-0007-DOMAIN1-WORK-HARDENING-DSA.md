# UNIT-0007 — Work Hardening and Dynamic Strain Aging

**Unit ID**: 0007
**Domain**: Physics & Material Science
**Title**: Work Hardening and Dynamic Strain Aging
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 4 hours

## Description

Core models for work hardening curves and dynamic strain aging (DSA) phenomena, including Portevin-Le Chatelier effects. Validate on JM Die data showing serrations or hardening behavior.

## Acceptance Criteria

- [ ] Work hardening exponent models per ISO group
- [ ] DSA threshold and serration predictor
- [ ] <7% error on JM Die hardening data
- [ ] Wired to prism_calc:work_hardening_*
- [ ] Real validation + scrutiny

## Dependencies

- UNIT-0002, UNIT-0003, UNIT-0005

## Deliverables

- WorkHardeningEngine + DSA Predictor
- Tests and wiring

## Autonomous Execution Notes

Implement, validate, wire.