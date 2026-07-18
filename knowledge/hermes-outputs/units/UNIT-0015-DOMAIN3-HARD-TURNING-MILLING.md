# UNIT-0015 — Hard Turning and Milling Integration

**Unit ID**: 0015
**Domain**: Machine & Process Specific
**Title**: Hard Turning and Milling Integration
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 5 hours

## Description

Models and strategies for hard turning/milling (including whiskey lathe domain). Force, wear, and quality predictions for hardened materials.

## Acceptance Criteria

- [ ] Hard material models (H group) with Kienzle integration
- [ ] Process recommendations with real JM Die hard-part data
- [ ] Wired to prism_calc and turning dispatchers
- [ ] Validation on hardened steel jobs
- [ ] Full 3-of-3

## Dependencies

- UNIT-0003–0008, UNIT-0013

## Deliverables

- HardTurningMillingEngine
- Lathe-specific (whiskey) extensions
- Dispatcher wiring

## Autonomous Execution Notes

Strong whiskey/lathe focus. Validate on JM Die hardened parts.