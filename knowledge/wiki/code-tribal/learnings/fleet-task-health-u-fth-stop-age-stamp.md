# FLEET-TASK-HEALTH/U-FTH-STOP-AGE-STAMP — [MAIN] [FLEET-TASK-HEALTH]/U-FTH-STOP-AGE-STAMP (slot:golf): age-stamp the scheduled-task safety-net WARN

**Commit:** `86b4bf8615f9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T09:12:34-05:00
**Tags:** fleet-task-health, u-fth-stop-age-stamp, auto-distilled

## Subject
[MAIN] [FLEET-TASK-HEALTH]/U-FTH-STOP-AGE-STAMP (slot:golf): age-stamp the scheduled-task safety-net WARN

## Body
```
[MAIN] [FLEET-TASK-HEALTH]/U-FTH-STOP-AGE-STAMP (slot:golf): age-stamp the scheduled-task safety-net WARN

The Stop-hook WARN (buildAdvisory) surfaces the watchdog's LAST telemetry row,
not a live audit — so a task you just enabled/registered keeps reading stale for
up to TELEMETRY_FRESH_MS (30m) until the next run writes a fresh row. An un-dated
WARN reads as live truth and cries wolf (observed live this session: 'Zombie
Reaper v2=disabled' persisted minutes after enabling it). Stamp '(audit Nm ago)'
/ '(audit just now)' so every chat knows whether to trust the verdict or re-audit.

Consumer-side complement to peer 928a8226's producer-side migration-freeze-marker
fix (4141daf9d8) — different file, orthogonal. +8 node:test cases (age render,
sub-minute/future-skew clamp, critical tag, 4 anti-regression). 8/8 green.
```

## Files touched (3)
- .claude/hooks/__tests__/fleet-task-health-stop.test.mjs | 73 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/fleet-task-health-stop.mjs                | 11 ++++++++++-
- 2 files changed, 83 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- til the next run writes a fresh row. An un-dated

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 86b4bf8615f9`
- Milestone envelope: `mcp-server/data/milestones/FLEET-TASK-HEALTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._