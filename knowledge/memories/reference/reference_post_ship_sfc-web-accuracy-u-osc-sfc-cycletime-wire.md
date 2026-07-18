---
name: reference_post_ship_sfc-web-accuracy-u-osc-sfc-cycletime-wire
description: Auto-distilled learnings from shipping SFC-WEB-ACCURACY/U-OSC-SFC-CYCLETIME-WIRE (commit 02e861e2c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.039Z
aliases: reference_post_ship_sfc-web-accuracy-u-osc-sfc-cycletime-wire
---


# SFC-WEB-ACCURACY/U-OSC-SFC-CYCLETIME-WIRE

[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-CYCLETIME-WIRE (slot:oscar): fix dead frontend->backend wiring on POST /api/v1/sfc/cycle-time. The SFC web client (CycleTimeRequest) posts {feed_rate, cut_length, num_passes, approach_distance, overtravel}, but prism_calc:cycle_time's schema (calcActionSchemas:313) requires {cutting_feedrate, cutting_distance}(+rapid). Live-verified on :3100: every frontend cycle-time call failed Zod. Fix: bridgeCycleTimeParams() at the route boundary -- engineering-standard decomposition the backend's field structure encodes: cutting_feedrate<-feed_rate, cutting_distance<-cut_length*(num_passes||1), rapid_distance<-approach+overtravel. Cycle-time-SCOPED (feed_rate is used by other calc actions); non-destructive; assumptions (passes multiply cut, approach/overtravel=rapid) documented in the helper per R12. 13/13 reference-value tests (7 new); 0 new tsc errors. 2nd of the SFC route field-bridge fixes (after deflection). NOTE: power-torque + tool-life still blocked by pre-machine-completeness-gate -- physics-reviewer confirms that gate is OVER-BROAD for those component calcs (machine-independent); narrowing it is a fleet-wide safety-hook change pending operator approval.

**Shipped:** 2026-06-25T10:26:24-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[sfc-web-accuracy-u-osc-sfc-cycletime-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._