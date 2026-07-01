# QUOTING-SYNERGY-MS0/U-QP-GCODE-TIME-WIRE — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-GCODE-TIME-WIRE (slot:charlie): wire precise G-code cycle time into the quote path (G3)

**Commit:** `4dee4b13bb22` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T13:21:28-05:00
**Tags:** quoting-synergy-ms0, u-qp-gcode-time-wire, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-GCODE-TIME-WIRE (slot:charlie): wire precise G-code cycle time into the quote path (G3)

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-GCODE-TIME-WIRE (slot:charlie): wire precise G-code cycle time into the quote path (G3)

The keystone: CycleTimeEstimatorEngine (S-curve + canned cycles + JM machine
profiles) had NO path into the quote computation -- cycle time was always an
MRR estimate (volume/mrr from one assumed tool) or a complexity-flat guess,
never from the actual program. The 134K+ JM CNC programs were unusable as a
cycle-time source. Two seams now close that:

1. prism_quoting:gcode_cycle_time dispatcher action exposes the precise engine
   (enum + gcodeCycleTimeSchema {gcode, controller?, machine_profile?} + handler
   lazy-importing CycleTimeEstimatorEngine). Additive -- the inferior
   gcode_time_estimate action (GCodeTimeEstimatorEngine) is untouched.
2. InstantQuoteEngine: new gcode_program/gcode_controller/gcode_machine_profile
   inputs. Cycle-time priority is now gcode_precise > physics_calculated (MRR) >
   parametric. The SpeedFeed block is guarded by `if (cycleTimeMin <= 0)` so the
   non-gcode path is behaviorally byte-identical (regression-locked by tests).

9 tests: dispatcher round-trip (incl. quotingActionEnum-membership assertion to
dodge the MockMCPServer z.enum-bypass trap), machine-profile kinematics
invariant, schema rejection of bad controller/missing gcode, and InstantQuote
E2E proving gcode_precise is selected + cycle_time_min == engine total/60 +
differs from the MRR path + empty-program graceful fallback.

2-reviewer per-file gate PASS x2 (wiring-completeness + integration/regression),
0 P0/P1. Touched files tsc-clean. Unblocks the 134K-program training source.
```

## Files touched (5)
- mcp-server/src/__tests__/GCodeTimeWire.test.ts        | 131 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/InstantQuoteEngine.ts          |  86 +++++++++++++++++++++++++++++++++++---------------
- mcp-server/src/schemas/quotingActionSchemas.ts        |   8 +++++
- mcp-server/src/tools/dispatchers/quotingDispatcher.ts |   7 +++++
- 4 files changed, 206 insertions(+), 26 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4dee4b13bb22`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._