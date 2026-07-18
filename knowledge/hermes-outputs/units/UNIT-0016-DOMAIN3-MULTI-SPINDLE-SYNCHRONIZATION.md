# UNIT-0016 — Multi-Spindle Synchronization

**Unit ID**: 0016
**Domain**: Machine & Process Specific
**Title**: Multi-Spindle Synchronization
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 5 hours

## Description

Models and control strategies for multi-spindle synchronization, including timing, force balancing, and thermal coupling across spindles.

## Acceptance Criteria

- [ ] Synchronization models for at least 3 multi-spindle machines at JM Die
- [ ] Force/thermal balancing algorithms
- [ ] Wired to prism_calc and cam dispatchers
- [ ] Real production data validation
- [ ] 3-of-3 scrutiny

## Dependencies

- UNIT-0013–0015

## Deliverables

- MultiSpindleSyncEngine
- Dispatcher actions and tests

## Autonomous Execution Notes

Focus on whiskey/lathe multi-spindle where applicable.