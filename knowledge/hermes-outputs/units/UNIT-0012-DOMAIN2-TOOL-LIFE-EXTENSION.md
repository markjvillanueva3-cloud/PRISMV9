# UNIT-0012 — Tool Life Extension Strategies

**Unit ID**: 0012
**Domain**: Tool & Wear Modeling
**Title**: Tool Life Extension Strategies
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 5 hours

## Description

Physics-based strategies for extending tool life (coating selection, edge prep optimization, coolant strategies, parameter modulation). Integrated predictor for life extension ROI.

## Acceptance Criteria

- [ ] 5+ extension levers modeled with formulas from constants
- [ ] ROI predictor with real JM Die before/after data
- [ ] Wired to prism_calc and business dispatchers
- [ ] Validation on 10+ extended-life jobs
- [ ] 3-of-3 scrutiny

## Dependencies

- UNIT-0009–0011

## Deliverables

- ToolLifeExtensionEngine
- Strategy recommender + ROI calculator
- Dispatcher wiring

## Autonomous Execution Notes

Model core strategies, validate on shop extension cases.