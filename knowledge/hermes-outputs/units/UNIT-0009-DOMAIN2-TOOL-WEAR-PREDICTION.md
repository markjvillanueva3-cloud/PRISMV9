# UNIT-0009 — Tool Wear Prediction Engine

**Unit ID**: 0009
**Domain**: Tool & Wear Modeling
**Title**: Tool Wear Prediction Engine
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 6 hours

## Description

Build the integrated tool wear prediction engine that combines diffusive/adhesive/abrasive/chemical mechanisms with real-time force/thermal inputs. Predict remaining tool life and recommend interventions. Wire to prism_calc and prism_safety. Validate on 15+ JM Die production jobs with measured wear vs predicted.

## Acceptance Criteria

- [ ] Unified wear rate model across 4 mechanisms
- [ ] Tool life predictor with <8% error on real JM Die data
- [ ] Wired to prism_calc:tool_life_* and prism_safety
- [ ] Real E2E validation (force, temperature, wear measurements) + 3-of-3
- [ ] No stubs or inlined constants

## Dependencies

- UNIT-0002–0008 (Domain 1 physics)
- JM Die tool life logs

## Deliverables

- ToolWearPredictionEngine
- Dispatcher actions
- Validation harness with real data

## Autonomous Execution Notes

Physics foundation first, then live JM Die validation before full wiring.