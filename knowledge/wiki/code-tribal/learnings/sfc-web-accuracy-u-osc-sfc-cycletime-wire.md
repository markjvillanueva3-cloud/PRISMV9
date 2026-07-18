# SFC-WEB-ACCURACY/U-OSC-SFC-CYCLETIME-WIRE — [MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-CYCLETIME-WIRE (slot:oscar): fix dead frontend->backend wiring on POST /api/v1/sfc/cycle-time. The SFC web client (CycleTimeRequest) posts {feed_rate, cut_length, num_passes, approach_distance, overtravel}, but prism_calc:cycle_time's schema (calcActionSchemas:313) requires {cutting_feedrate, cutting_distance}(+rapid). Live-verified on :3100: every frontend cycle-time call failed Zod. Fix: bridgeCycleTimeParams() at the route boundary -- engineering-standard decomposition the backend's field structure encodes: cutting_feedrate<-feed_rate, cutting_distance<-cut_length*(num_passes||1), rapid_distance<-approach+overtravel. Cycle-time-SCOPED (feed_rate is used by other calc actions); non-destructive; assumptions (passes multiply cut, approach/overtravel=rapid) documented in the helper per R12. 13/13 reference-value tests (7 new); 0 new tsc errors. 2nd of the SFC route field-bridge fixes (after deflection). NOTE: power-torque + tool-life still blocked by pre-machine-completeness-gate -- physics-reviewer confirms that gate is OVER-BROAD for those component calcs (machine-independent); narrowing it is a fleet-wide safety-hook change pending operator approval.

**Commit:** `02e861e2c426` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T10:26:24-05:00
**Tags:** sfc-web-accuracy, u-osc-sfc-cycletime-wire, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-CYCLETIME-WIRE (slot:oscar): fix dead frontend->backend wiring on POST /api/v1/sfc/cycle-time. The SFC web client (CycleTimeRequest) posts {feed_rate, cut_length, num_passes, approach_distance, overtravel}, but prism_calc:cycle_time's schema (calcActionSchemas:313) requires {cutting_feedrate, cutting_distance}(+rapid). Live-verified on :3100: every frontend cycle-time call failed Zod. Fix: bridgeCycleTimeParams() at the route boundary -- engineering-standard decomposition the backend's field structure encodes: cutting_feedrate<-feed_rate, cutting_distance<-cut_length*(num_passes||1), rapid_distance<-approach+overtravel. Cycle-time-SCOPED (feed_rate is used by other calc actions); non-destructive; assumptions (passes multiply cut, approach/overtravel=rapid) documented in the helper per R12. 13/13 reference-value tests (7 new); 0 new tsc errors. 2nd of the SFC route field-bridge fixes (after deflection). NOTE: power-torque + tool-life still blocked by pre-machine-completeness-gate -- physics-reviewer confirms that gate is OVER-BROAD for those component calcs (machine-independent); narrowing it is a fleet-wide safety-hook change pending operator approval.

## Body
```
[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-CYCLETIME-WIRE (slot:oscar): fix dead frontend->backend wiring on POST /api/v1/sfc/cycle-time. The SFC web client (CycleTimeRequest) posts {feed_rate, cut_length, num_passes, approach_distance, overtravel}, but prism_calc:cycle_time's schema (calcActionSchemas:313) requires {cutting_feedrate, cutting_distance}(+rapid). Live-verified on :3100: every frontend cycle-time call failed Zod. Fix: bridgeCycleTimeParams() at the route boundary -- engineering-standard decomposition the backend's field structure encodes: cutting_feedrate<-feed_rate, cutting_distance<-cut_length*(num_passes||1), rapid_distance<-approach+overtravel. Cycle-time-SCOPED (feed_rate is used by other calc actions); non-destructive; assumptions (passes multiply cut, approach/overtravel=rapid) documented in the helper per R12. 13/13 reference-value tests (7 new); 0 new tsc errors. 2nd of the SFC route field-bridge fixes (after deflection). NOTE: power-torque + tool-life still blocked by pre-machine-completeness-gate -- physics-reviewer confirms that gate is OVER-BROAD for those component calcs (machine-independent); narrowing it is a fleet-wide safety-hook change pending operator approval.
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-deflection-bridge.test.ts | 48 +++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/routes/sfc.ts                           | 40 +++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 86 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- NOTE: power-torque + tool-life still blocked by pre-machine-completeness-gate -- physics-reviewer confirms that gate is OVER-BROAD for those component calcs (machine-independent); narrowing it is a fleet-wide safety-hook change pending operator approval.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 02e861e2c426`
- Milestone envelope: `mcp-server/data/milestones/SFC-WEB-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._