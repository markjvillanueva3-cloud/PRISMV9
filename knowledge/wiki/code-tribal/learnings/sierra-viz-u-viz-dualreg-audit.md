# SIERRA-VIZ/U-VIZ-DUALREG-AUDIT — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-DUALREG-AUDIT (slot:sierra): FAST[]+merge-splice dual-registration auditor + fix 3 echo roosts silently dropped since 2026-05-26

**Commit:** `2d787d609105` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T07:55:26-05:00
**Tags:** sierra-viz, u-viz-dualreg-audit, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-DUALREG-AUDIT (slot:sierra): FAST[]+merge-splice dual-registration auditor + fix 3 echo roosts silently dropped since 2026-05-26

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-DUALREG-AUDIT (slot:sierra): FAST[]+merge-splice dual-registration auditor + fix 3 echo roosts silently dropped since 2026-05-26

scripts/lib/viz-dual-registration-audit.mjs: pure static auditor of the FAST[]+merge-splice both-or-neither
invariant + CLI + 12 tests + regen-viz preflight wiring. FOUND 3 echo POST-PDF roosts (cited-tips/tribal-wiki/
post-pdf) in regen-viz FAST[] since 2026-05-26 but NEVER spliced into merge-augmentations -> 117 corpus nodes
silently dropped every regen. FIXED via merge-time class-name->node-id resolver (foldRoostAug): +117 nodes,
185/210 bridge edges recovered, 0 danglers. Auditor silentDiscards 3->0. Tests 12/12.
```

## Files touched (8)
- mcp-server/src/engines/system-viz/MEMORY.md      |  14 +++++
- mcp-server/src/engines/system-viz/TOOLBELT.md    |   1 +
- scripts/audit-viz-dual-registration.mjs          |  44 ++++++++++++++++
- scripts/lib/viz-dual-registration-audit.mjs      | 233 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/viz-dual-registration-audit.test.mjs | 155 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/merge-augmentations.mjs                  |  77 +++++++++++++++++++++++++++
- scripts/regen-viz.mjs                            |  20 +++++++
- 7 files changed, 544 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2d787d609105`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._