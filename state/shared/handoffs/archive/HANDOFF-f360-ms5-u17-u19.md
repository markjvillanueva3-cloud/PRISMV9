# HANDOFF — F360-AP-MS5 U17-U19

## Session Summary
Continued F360-AP-MS5 (Full Machine Coverage) from U17 to U19.

## Units Completed

### U17: Mill-Turn Channel Synchronization M-Codes
- Added `MILL_TURN_SYNC_CODES` constant (M200-M203, M299) — PRISM planning codes
- S4: sync point detection at channel boundaries (C1↔Cm, C1→C2, sub_spindle_transfer)
- Added `generateChannelSyncLines()` static method for G-code emission
- S10: sync lines included in output package
- S7: fixed forward of channel_id, spindle_id, setup_index, sync_before, sync_after from S4→S7
- Added `sub_spindle_transfer` to featureToOperationType map + typeOrder (priority 9)
- 6 new tests

### U18: Per-Operation Tool Change + Coolant Sequences
- Added `generateToolChange()` static method: 7 machine types
  - VMC/HMC: T/M06/G43 H sequence
  - 5-axis 3+2: G49 cancel → G43.4 re-engage
  - 5-axis sim: G49 cancel → G43.5 re-engage
  - Lathe: T[turret][offset] (T0101 format)
  - Mill-turn: per-channel (ATC for Cm, turret for C1/C2)
  - Wire EDM: no tool change
- Added `generateCoolantOn()` / `generateCoolantOff()`: M08/M07/M88/M09
- S10: tool_change_blocks generated and stored in ctx
- 11 new tests

### U19: Turning Approach/Retract Patterns + Multi-Pass Roughing
- Added `TURNING_APPROACH_RETRACT` constant: 8 turning operation patterns
- Added `computeTurningPasses()`: depth splitting for deep roughing
- Added `generateApproachRetract()` static method: G-code per turning pattern
- S4: approach/retract + pass_count assigned to all turning ops
- S7: forward of approach_type, retract_type, pass_count, depth_per_pass_mm
- PlannedOperation interface: +approach_type, +retract_type, +pass_count, +depth_per_pass_mm
- 8 new tests

## Verified State
- Build: PASS (0 errors in AutoProgramOrchestratorEngine.ts)
- Tests: 173/173 passing (148→173, +25 new)
- Physics review: 0 CRITICAL, 0 HIGH (fixed), 0 MEDIUM
  - Fixed: MILL_TURN_SYNC_CODES comment updated to clarify PRISM planning codes vs controller-specific
- F360-AP-MS5: 19/24 units complete

## Engine Stats
- AutoProgramOrchestratorEngine.ts: ~2900 LOC
- Test file: ~2800 LOC

## Remaining Units (U20-U24)
- U20: Machine-specific safety validation extensions (5-axis collision, lathe tailstock, mill-turn interference)
- U21: Per-operation G-code body generation (actual cutting blocks per op type)
- U22: Cycle time estimation per machine type (with setup time, tool change time)
- U23: End-to-end integration tests with all 7 machine type scenarios
- U24: Edge cases + documentation

## RESUME
Continue F360-AP-MS5 at U20. Run `/autopilot-full /startup continue f360 roadmap`.
