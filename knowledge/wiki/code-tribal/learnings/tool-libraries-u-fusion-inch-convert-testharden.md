# TOOL-LIBRARIES/U-FUSION-INCH-CONVERT-TESTHARDEN — [MAIN-FORCE] [TOOL-LIBRARIES]/U-FUSION-INCH-CONVERT-TESTHARDEN (slot:romeo): lock unknown-geometry-key guarantee into CI (3-of-3 arm-B P2)

**Commit:** `adbb8115debe` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T16:44:14-05:00
**Tags:** tool-libraries, u-fusion-inch-convert-testharden, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-FUSION-INCH-CONVERT-TESTHARDEN (slot:romeo): lock unknown-geometry-key guarantee into CI (3-of-3 arm-B P2)

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-FUSION-INCH-CONVERT-TESTHARDEN (slot:romeo): lock unknown-geometry-key guarantee into CI (3-of-3 arm-B P2)

Two test-only additions hardening the one residual risk all 3 scrutiny arms flagged (an unclassified future length key silently passing through unscaled): (1) numeric-dp arg does NOT bypass the feed-preset guard; (2) the live legacy PRISM_JM_Milling key set (DCN/LF/shaft-diameter/shoulder-length/tip-diameter/tip-length/thread-profile-angle) asserts zero unknown keys + correct scaling -- so a new unclassified length key fails CI instead of mis-scaling a tool 25.4x. 23 tests.
```

## Files touched (2)
- scripts/lib/tool-unit-convert.test.mjs | 27 +++++++++++++++++++++++++++
- 1 file changed, 27 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show adbb8115debe`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._