# GOLF-QUEUE/U-GOLF-TASK-OWNER-MAP-P3 — [MAIN] [GOLF-QUEUE]/U-GOLF-TASK-OWNER-MAP-P3 (slot:golf): reverse completeness guard for TASK_OWNER_DOMAIN -- catch typo/dead map keys

**Commit:** `13596741a4db` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:30:26-05:00
**Tags:** golf-queue, u-golf-task-owner-map-p3, auto-distilled

## Subject
[MAIN] [GOLF-QUEUE]/U-GOLF-TASK-OWNER-MAP-P3 (slot:golf): reverse completeness guard for TASK_OWNER_DOMAIN -- catch typo/dead map keys

## Body
```
[MAIN] [GOLF-QUEUE]/U-GOLF-TASK-OWNER-MAP-P3 (slot:golf): reverse completeness guard for TASK_OWNER_DOMAIN -- catch typo/dead map keys

Closes the P3 all 3 scrutiny reviewers flagged on U-GOLF-TASK-OWNER-MAP: the original completeness guard was one-directional (KNOWN subset-of MAP), so a typo'd/dead owner-map key pointing at a renamed/removed task went uncaught. Adds export FORWARD_PROVISIONED_OWNER_TASKS (the 4 synthesis/mining crons that are owned-but-deliberately-not-in-KNOWN, to avoid MISSING false-flags) + a reverse-guard test (map keys subset-of KNOWN union forward; forward allowlist itself must not rot). 7/7 owner-map tests; watch file parses.
```

## Files touched (3)
- scripts/__tests__/fleet-task-health-owner-map.test.mjs | 15 +++++++++++++++
- scripts/fleet-task-health-watch.mjs                    | 19 +++++++++++++++++++
- 2 files changed, 34 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 13596741a4db`
- Milestone envelope: `mcp-server/data/milestones/GOLF-QUEUE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._