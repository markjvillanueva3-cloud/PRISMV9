# SELF-COMPACT-FIX/U-YELLOW-SCRUTINY-FIX — [MAIN-FORCE] [SELF-COMPACT-FIX]/U-YELLOW-SCRUTINY-FIX (slot:bravo): close 3-of-3 arm-C P2s -- (1) gate YELLOW->compact on worstPct>=0.5 (the producer emits action:wrap-up for ALL of YELLOW, so without a pct gate every slot would nudge compact from 25%; now only past the band midpoint -- prudent); (2) complete the zebra->zulu import fix the prior commit only did for the TEST: 3 LIVE consumers (zulu-context-load, zulu-context-fleet-dashboard hard-crashed on launch; generate-chat-slot-nodes-features silently degraded) now import the real lib. 139/139 tests; live YELLOW/0.70/wrap-up -> recommend=compact; lib exports verified for the fixed consumers. (arm-B flag: prior sierra U-LINK-ZULU-CORPUS corpus wiring appears lost in shared-tree absorption -- for sierra to re-land, NOT this unit.)

**Commit:** `9e49fdf2daed` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T20:09:43-05:00
**Tags:** self-compact-fix, u-yellow-scrutiny-fix, auto-distilled

## Subject
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-YELLOW-SCRUTINY-FIX (slot:bravo): close 3-of-3 arm-C P2s -- (1) gate YELLOW->compact on worstPct>=0.5 (the producer emits action:wrap-up for ALL of YELLOW, so without a pct gate every slot would nudge compact from 25%; now only past the band midpoint -- prudent); (2) complete the zebra->zulu import fix the prior commit only did for the TEST: 3 LIVE consumers (zulu-context-load, zulu-context-fleet-dashboard hard-crashed on launch; generate-chat-slot-nodes-features silently degraded) now import the real lib. 139/139 tests; live YELLOW/0.70/wrap-up -> recommend=compact; lib exports verified for the fixed consumers. (arm-B flag: prior sierra U-LINK-ZULU-CORPUS corpus wiring appears lost in shared-tree absorption -- for sierra to re-land, NOT this unit.)

## Body
```
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-YELLOW-SCRUTINY-FIX (slot:bravo): close 3-of-3 arm-C P2s -- (1) gate YELLOW->compact on worstPct>=0.5 (the producer emits action:wrap-up for ALL of YELLOW, so without a pct gate every slot would nudge compact from 25%; now only past the band midpoint -- prudent); (2) complete the zebra->zulu import fix the prior commit only did for the TEST: 3 LIVE consumers (zulu-context-load, zulu-context-fleet-dashboard hard-crashed on launch; generate-chat-slot-nodes-features silently degraded) now import the real lib. 139/139 tests; live YELLOW/0.70/wrap-up -> recommend=compact; lib exports verified for the fixed consumers. (arm-B flag: prior sierra U-LINK-ZULU-CORPUS corpus wiring appears lost in shared-tree absorption -- for sierra to re-land, NOT this unit.)
```

## Files touched (6)
- scripts/generate-chat-slot-nodes-features.mjs |  2 +-
- scripts/lib/zulu-context-bundle.mjs           | 12 +++++++++++-
- scripts/lib/zulu-context-bundle.test.mjs      | 18 ++++++++++++++----
- scripts/zulu-context-fleet-dashboard.mjs      |  2 +-
- scripts/zulu-context-load.mjs                 |  2 +-
- 5 files changed, 28 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9e49fdf2daed`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._