# JM-DIE-LATHE-UPGRADE-MS0/U-UPGRADE-BODY-RESCALE — [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-UPGRADE-BODY-RESCALE (slot:whiskey iter15): envelope-fit gate. [BOOTSTRAP-SLOT-ENFORCE]. JM_DIE_LATHES envelope fields + computeMaxExtent() + skip-with-reason in upgradeOne + batch CLI skip-honor. Closes primary safety gap from U-AUDIT-FINDINGS-BRIEF. 18/19 V2 tests PASS.

**Commit:** `44ddc4d1efb0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T17:43:42-05:00
**Tags:** jm-die-lathe-upgrade-ms0, u-upgrade-body-rescale, auto-distilled

## Subject
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-UPGRADE-BODY-RESCALE (slot:whiskey iter15): envelope-fit gate. [BOOTSTRAP-SLOT-ENFORCE]. JM_DIE_LATHES envelope fields + computeMaxExtent() + skip-with-reason in upgradeOne + batch CLI skip-honor. Closes primary safety gap from U-AUDIT-FINDINGS-BRIEF. 18/19 V2 tests PASS.

## Body
```
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-UPGRADE-BODY-RESCALE (slot:whiskey iter15): envelope-fit gate. [BOOTSTRAP-SLOT-ENFORCE]. JM_DIE_LATHES envelope fields + computeMaxExtent() + skip-with-reason in upgradeOne + batch CLI skip-honor. Closes primary safety gap from U-AUDIT-FINDINGS-BRIEF. 18/19 V2 tests PASS.
```

## Files touched (4)
- .../src/engines/JMDieLatheProgramUpgraderEngine.ts | 31 ++++++--
- .../engines/JMDieLatheProgramUpgraderV2Engine.ts   | 86 ++++++++++++++++++++++
- scripts/upgrade-jm-die-lathe-batch.mjs             |  9 +++
- 3 files changed, 118 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 44ddc4d1efb0`
- Milestone envelope: `mcp-server/data/milestones/JM-DIE-LATHE-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._