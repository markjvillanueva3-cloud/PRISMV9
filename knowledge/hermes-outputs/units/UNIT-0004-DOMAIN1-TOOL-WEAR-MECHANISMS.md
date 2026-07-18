# UNIT-0004 — Tool Wear Mechanisms and Prediction

**Unit ID**: 0004
**Domain**: Physics & Material Science
**Title**: Tool Wear Mechanisms and Prediction
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 6 hours

## Description

Model diffusive, adhesive, abrasive, and chemical wear mechanisms with built-up edge chemistry. Produce tool life extension predictions. Wire to prism_calc and prism_safety. Validate on real JM Die tool life data.

## Acceptance Criteria

- [ ] 4 wear mechanism models implemented with formulas from constants
- [ ] Built-up edge chemistry model included
- [ ] Tool life prediction engine with <10% error on JM Die historical data
- [ ] Wired to prism_calc:tool_wear_* and prism_safety
- [ ] Real data E2E validation + 3-of-3
- [ ] No placeholders

## Dependencies

- UNIT-0002, UNIT-0003
- Tool life data from JM Die

## Deliverables

- ToolWearEngine
- Dispatcher actions
- Validation reports

## Autonomous Execution Notes

Implement core, validate live, wire all consumers.