# ECHO-WINMAX/U-SFC-FEED-SCALE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-FEED-SCALE: regenerate FEEDS with speeds — full speeds-and-feeds correction

**Commit:** `2feed63a8fad` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T13:51:40-05:00
**Tags:** echo-winmax, u-sfc-feed-scale, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-FEED-SCALE: regenerate FEEDS with speeds — full speeds-and-feeds correction

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-FEED-SCALE: regenerate FEEDS with speeds — full speeds-and-feeds correction

"Most optimized parameters" = speeds AND feeds. The corrector regenerated speed but left feeds
mismatched to the new rpm. Now a spindle-speed correction ALSO scales every feed in that tool's
block by the rpm ratio, preserving the post's chosen feed-per-tooth (chip load) at the corrected
speed: fz = F/(rpm·z) stays constant. Scoped to the tool block; handles the post's multi-tier
feeds (entry/cut/chip-thinning) uniformly. Knob: correction.scaleFeeds=false for speed-only.

DEMONSTRATED on the RICH NC: T1 S3000→S877 + feeds ×0.292 (F235.714→F68.907, F942.857→F275.629);
T2/T3 ×0.585; drill skipped. Corrected NC now internally consistent (speeds+feeds matched).

+2 tests (feed scaling preserves fz exactly; scaleFeeds:false opts out). Existing speed-only
fixtures (no F values) unaffected. Verified via direct node exec (vitest env-killed under contention).

SFC surface fully diagnosed (for oscar): speed_feed=material-blind constant; ultimate_speed_feed=
material-aware Vc but diameter-blind rpm (worked around); sf_orchestrate=physically-wrong output
(Vc 20 m/min, 50mm DOC, conf 0.25) + unstable result shape; multi_optimize/productivity need
explicit Taylor coeffs. Only ultimate_speed_feed's Vc lookup is trustworthy. CHIP-LOAD GAP: the
NC's fz (~0.4mm) is ~3x the SFC's recommended 0.13mm — deeper optimization needs oscar's fix.
```

## Files touched (3)
- scripts/post-closed-loop-correct.mjs      | 25 +++++++++++++++++--------
- scripts/post-closed-loop-correct.test.mjs | 20 ++++++++++++++++++++
- 2 files changed, 37 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- wrong output

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2feed63a8fad`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._