# UNIT-0003 — Material Behavior Modeling (Core Physics)

**Unit ID**: 0003
**Domain**: Physics & Material Science
**Title**: Material Behavior Modeling (Core Physics)
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 6-8 hours

## Description

Build the core material behavior engine covering work hardening, dynamic strain aging, strain rate effects, and phase transformations for all ISO material groups (P, M, K, N, S, H). Wire to prism_calc with real Kienzle/Taylor formulas (imported from constants, never inlined). Validate on 10+ real JM Die jobs with measured forces vs predicted.

## Acceptance Criteria

- [ ] Engine implements at least 5 core material models with algebraic invariants
- [ ] All constants imported from mcp-server/src/physics/constants.ts
- [ ] Real JM Die data validation: predicted vs measured force error <5% on 10 jobs
- [ ] Dispatcher action prism_calc:material_behavior_* wired and tested
- [ ] 3-of-3 scrutiny passed with real data (not mocks)
- [ ] No stubs — full working implementation with tests

## Dependencies

- UNIT-0002
- Physics constants module
- JM Die job data access via prism_memory or shop profile

## Deliverables

- MaterialBehaviorEngine.ts (or equivalent in mcp-server/src/engines/)
- 5+ dispatcher actions
- Validation test suite with real data
- Unit file update with results

## Autonomous Execution Notes

Autonomous loop will implement, test on live JM Die data, wire, scrutinize, and commit only on PASS. Fail-loud on any mismatch.