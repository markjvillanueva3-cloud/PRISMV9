# SFC-JM-ACCURACY/U-OSC-JM-PROVEN-FEED-SURFACE — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-PROVEN-FEED-SURFACE (slot:oscar): surface JM proven feed (verified IPR->mm/rev) in the divergence report

**Commit:** `ac6045a5251a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T03:02:19-05:00
**Tags:** sfc-jm-accuracy, u-osc-jm-proven-feed-surface, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-PROVEN-FEED-SURFACE (slot:oscar): surface JM proven feed (verified IPR->mm/rev) in the divergence report

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-PROVEN-FEED-SURFACE (slot:oscar): surface JM proven feed (verified IPR->mm/rev) in the divergence report

The PRISM-vs-JM 'test against ALL JM parts' divergence artifact compared CSS only. Now that the feed unit
is empirically verified (JM lathe feed = IPR / inch-per-rev, from raw CNC LATHE/*.MIN: G95 feed-per-rev,
F.0005..F.02), surface the JM proven feed converted to mm/rev (*25.4) per config so the artifact covers
feed-per-rev, not just surface speed.

Additive: feedToMmPerRev(feed, unit='ipr') helper (mirrors cssToMPerMin; *25.4 is a unit conversion, NOT a
physics constant) + jmFeedRaw/jmFeedUnit/jmFeedMmRev on each divergence row + a feed/rev report column.
Reference value only -- no PRISM feed-band verdict yet (a canonical turning fn band is a clean follow-up);
null when a config has no feed. Aligned with the operator directive (JM = test baseline, not trusted).

15/15 tests (+2: feedToMmPerRev unit conversion + the row feed field/null-handling). Live report shows
sensible turning feeds (0.064-0.152 mm/rev). No regression to the CSS comparison.
```

## Files touched (3)
- mcp-server/scripts/sfc-jm-proven-divergence.mjs      | 29 ++++++++++++++++++++++++++---
- mcp-server/scripts/sfc-jm-proven-divergence.test.mjs | 25 +++++++++++++++++++++++++
- 2 files changed, 51 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ac6045a5251a`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._