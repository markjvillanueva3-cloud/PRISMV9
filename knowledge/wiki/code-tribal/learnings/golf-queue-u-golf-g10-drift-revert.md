# GOLF-QUEUE/U-GOLF-G10-DRIFT-REVERT — [MAIN] [GOLF-QUEUE]/U-GOLF-G10-DRIFT-REVERT (slot:golf): revert 4-name KNOWN_PRISM_TASKS add - it cry-wolfed MISSING fleet-wide

**Commit:** `858716e9a559` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T18:19:21-05:00
**Tags:** golf-queue, u-golf-g10-drift-revert, auto-distilled

## Subject
[MAIN] [GOLF-QUEUE]/U-GOLF-G10-DRIFT-REVERT (slot:golf): revert 4-name KNOWN_PRISM_TASKS add - it cry-wolfed MISSING fleet-wide

## Body
```
[MAIN] [GOLF-QUEUE]/U-GOLF-G10-DRIFT-REVERT (slot:golf): revert 4-name KNOWN_PRISM_TASKS add - it cry-wolfed MISSING fleet-wide

R12 self-correction. The G10 inline drift-fix (cataloguing 4 synthesis/mining
cron names to green detectInstallerDrift #69) was an OVERREACH: those tasks have
installers but are NOT live-registered, so cataloguing them made the watchdog
flag all 4 MISSING every audit -- a NEW fleet-wide cry-wolf WARN. Reverted to a
documented NOTE + the owner-informed fix path. #69 returns to its PRE-EXISTING
failing state (not a G10 regression). G10 guard UNAFFECTED: 11 guard tests pass,
4 MISSING confirmed gone live. Suite 85/86.
```

## Files touched (2)
- scripts/fleet-task-health-watch.mjs | 20 ++++++++++----------
- 1 file changed, 10 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 858716e9a559`
- Milestone envelope: `mcp-server/data/milestones/GOLF-QUEUE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._