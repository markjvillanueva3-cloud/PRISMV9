# SFC-JM-ACCURACY/U-OSC-JM-PROVEN-FEED-VERDICT — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-PROVEN-FEED-VERDICT (slot:oscar): verdict the JM proven feed vs CANONICAL_TURNING_FEEDS

**Commit:** `74abff859fe0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T03:15:14-05:00
**Tags:** sfc-jm-accuracy, u-osc-jm-proven-feed-verdict, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-PROVEN-FEED-VERDICT (slot:oscar): verdict the JM proven feed vs CANONICAL_TURNING_FEEDS

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-PROVEN-FEED-VERDICT (slot:oscar): verdict the JM proven feed vs CANONICAL_TURNING_FEEDS

Extends U-OSC-JM-PROVEN-FEED-SURFACE: the JM proven feed (verified IPR->mm/rev) now gets a VERDICT against
the existing canonical turning feed band CANONICAL_TURNING_FEEDS (constants.ts, per-ISO {rough,finish}
mm/rev -- already sourced; NOT new/fabricated reference data), mirroring the CSS verdict. compareFeed reuses
the generic compareCss band logic (the band auto-orients via min/max since roughing feed is heavier than
finishing). Same semantics: conservative/in-band/aggressive, and >1.8x band = suspect-units (a feed units
artifact). Report shows a compact marker (c/i/a/s) next to the mm/rev value.

Additive + wired: CANONICAL_TURNING_FEEDS injected through formatDivergenceReport + both main() paths
(text + --json); feedVerdict/feedDeltaPct/feedBand on each row; null when no band/feed -> the CSS verdict
is byte-unchanged. 17/17 tests (+2: compareFeed verdicts + the row feed-verdict / CSS-unchanged invariant).

LIVE accuracy insight: JM amateur programs run CONSERVATIVE speeds (-72% vs band) but mostly IN-BAND feeds
(0.064c-0.152i) -- the feed dimension agrees with PRISM canonical while the surface speed is slow.
```

## Files touched (3)
- mcp-server/scripts/sfc-jm-proven-divergence.mjs      | 37 ++++++++++++++++++++++++++++++-------
- mcp-server/scripts/sfc-jm-proven-divergence.test.mjs | 30 +++++++++++++++++++++++++++++-
- 2 files changed, 59 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 74abff859fe0`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._