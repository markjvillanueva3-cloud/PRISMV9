# FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-PP-SCALER — [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-SF-PP-SCALER (slot:juliett): wire PPFeedSpeedScalerEngine into prism_calc

**Commit:** `4514322389eb` · **By:** markjvillanueva3-cloud · **At:** 2026-05-21T10:01:54-05:00
**Tags:** feature-gap-audit-ms0, u-wire-backlog-sf-pp-scaler, auto-distilled

## Subject
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-SF-PP-SCALER (slot:juliett): wire PPFeedSpeedScalerEngine into prism_calc

## Body
```
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-SF-PP-SCALER (slot:juliett): wire PPFeedSpeedScalerEngine into prism_calc

pp_feed_speed_scale action — pure G-code F/S text rewriter. Distinct from
feed_rate_optimize (which computes from engagement physics): this is byte-
level post-process scaling for trial cuts, software override emulation, and
machine-limit clamping. ACTIONS 58 -> 59.

Test (14/14 PASS, real reference G-code samples): uniform feed/speed factor,
max_speed clamp (clamped_max), skip_rapid_feeds default-true + opt-out false,
range filter (out_of_range), paren-comment preservation (CRITICAL invariant),
;-tail preservation, modal G1 inheritance across blocks, empty-gcode safe,
feed_factor=0 warning, non-F/S word safety, min_feed clamp-up, round_decimals
integer, 10-field complete result contract.

2-of-2 scrutiny: arm A + arm B PASS, no P0/P1. P2 deferrables: docstring note
for G0-default-on-first-line semantic edge (logged to handoff).
```

## Files touched (4)
- .../src/__tests__/pp-feed-speed-scale-wire.test.ts | 161 +++++++++++++++++++++
- mcp-server/src/schemas/calcActionSchemas.ts        |  18 +++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts |  23 +++
- 3 files changed, 202 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4514322389eb`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._