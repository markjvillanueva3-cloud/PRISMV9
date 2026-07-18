# KIENZLE-LATHE-WIZARD/U-W2C-FIX — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2C-FIX (slot:whiskey): 3-of-3 arm-C P1 fix -- no silent false success on all-specialty prints + P2 hardening

**Commit:** `d8c5c13cb76b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T03:55:37-05:00
**Tags:** kienzle-lathe-wizard, u-w2c-fix, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2C-FIX (slot:whiskey): 3-of-3 arm-C P1 fix -- no silent false success on all-specialty prints + P2 hardening

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2C-FIX (slot:whiskey): 3-of-3 arm-C P1 fix -- no silent false success on all-specialty prints + P2 hardening

3-of-3 scrutiny: arm A PASS + arm B PASS + arm C FAIL on a real P1 (the independent third arm earning its keep). Fixes:
- [P1] full_geometry_loop_closed flipped TRUE on a print that produced ONLY specialty ops (threading/parting/grooving -- all excluded from band scoring -> band_scored_ops=0, null averages), declaring the loop "closed" while validating nothing vs the empirical cloud. NOW: a print counts as "scored" (ok:true) ONLY when band_scored_ops>0; an all-specialty program records stage "scored-no-bandable-ops" (geometry closed but unvalidated) -- terminal (deterministic) but does NOT flip full_geometry_loop_closed. Dashboard adds prints_geometry_only + honest_note clarifies the distinction (R12).
- [P2] PNG temp-file leak if loadEngines() threw -- engines now load BEFORE rasterizing (no orphan PNG on a tsx/import failure; records transient "engines-failed").
- [P2] --pdf absolute/backslash arg built a nonsense path -> "missing" -> terminal -> cursor poison. Now normalized to repo-relative (path.relative) before queue/dedup.
- [P2] test fixture reworded "sampled from" -> "illustrative (shape-representative)"; ADDED a live-schema contract test pinning the real op_parameter_reference {rough,finish,drill}.{sfm,feed_ipr}.{p05..p95} shape (R9 -- fails loud on source drift). 17/17 pass.
```

## Files touched (3)
- scripts/lathe-rungc-ocr-loop.mjs      | 49 ++++++++++++++++++++++++++++++++++++++-----------
- scripts/lib/lathe-band-score.test.mjs | 35 ++++++++++++++++++++++++++++++++++-
- 2 files changed, 72 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d8c5c13cb76b`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._