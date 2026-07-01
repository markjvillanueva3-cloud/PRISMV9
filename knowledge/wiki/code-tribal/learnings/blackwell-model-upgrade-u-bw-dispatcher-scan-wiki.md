# BLACKWELL-MODEL-UPGRADE/U-BW-DISPATCHER-SCAN-WIKI — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-DISPATCHER-SCAN-WIKI (slot:charlie): wiki lesson — source-lock blind spot on dispatcher model defaults

**Commit:** `d64b781a8c89` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T04:23:56-05:00
**Tags:** blackwell-model-upgrade, u-bw-dispatcher-scan-wiki, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-DISPATCHER-SCAN-WIKI (slot:charlie): wiki lesson — source-lock blind spot on dispatcher model defaults

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-DISPATCHER-SCAN-WIKI (slot:charlie): wiki lesson — source-lock blind spot on dispatcher model defaults

Companion wiki entry for U-BW-DISPATCHER-SCAN (closes the bug-finding->wiki gate).
Generalizable rules: (1) a green source-lock is only trustworthy if its SCAN scope
covers the surface — a guard green because it never looked is a false ALL-CLEAR;
(2) dispatchers are executable and must be policed like engines; (3) a model default
that bypasses ModelRoutingEngine must be validated against live /api/tags, not the
capability-declaration catalog. Links reference_cascade_defaults_retired_model_2026_06_09.
```

## Files touched (2)
- knowledge/wiki/lessons/source-lock-blind-spot-dispatcher-model-defaults.md | 47 +++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 47 insertions(+)

## Lessons surfaced in commit body
- lesson — source-lock blind spot on dispatcher model defaults

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d64b781a8c89`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-MODEL-UPGRADE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._