# UNIT-0013 — Per-Machine Capability Modeling

**Unit ID**: 0013
**Domain**: Machine & Process Specific
**Title**: Per-Machine Capability Modeling
**Status**: Not Started
**Priority**: P0
**Estimated Effort**: 6 hours

## Description

Model individual machine capabilities (spindle, ways, thermal, vibration) for all JM Die machines. Create capability envelopes and health indicators. Wire to prism_calc and safety.

## Acceptance Criteria

- [ ] Capability models for at least 10 JM Die machines
- [ ] Thermal/vibration/spindle health predictors
- [ ] Real machine data validation
- [ ] Wired to prism_calc:machine_capability_*
- [ ] Full scrutiny + no stubs

## Dependencies

- UNIT-0001–0012
- JM Die machine profiles and sensor data

## Deliverables

- MachineCapabilityEngine
- Per-machine envelopes and health dashboards
- Dispatcher actions

## Autonomous Execution Notes

Start with lathe (whiskey) machines, expand to full fleet.