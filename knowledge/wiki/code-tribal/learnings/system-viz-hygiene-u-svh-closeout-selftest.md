# SYSTEM-VIZ-HYGIENE/U-SVH-CLOSEOUT-SELFTEST — [MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-CLOSEOUT-SELFTEST (slot:sierra): close-out-milestone self-test mirrors the production two-synonym guard

**Commit:** `868f97af3bcf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T19:27:33-05:00
**Tags:** system-viz-hygiene, u-svh-closeout-selftest, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-CLOSEOUT-SELFTEST (slot:sierra): close-out-milestone self-test mirrors the production two-synonym guard

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-CLOSEOUT-SELFTEST (slot:sierra): close-out-milestone self-test mirrors the production two-synonym guard

The self-test #9 only checked status !== completed, while the production guard accepts BOTH completed (envelope word) AND complete (roadmap-index word), so a regression dropping the complete synonym would pass undetected. Fixed: inline guardRejects() mirrors production + asserts both synonyms ACCEPTED + force overrides. self-test 28/28. No production-logic change.
```

## Files touched (2)
- scripts/close-out-milestone.mjs | 16 ++++++++++++----
- 1 file changed, 12 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 868f97af3bcf`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._