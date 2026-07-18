# FLEET-TASK-HEALTH/U-GOLF-TASK-VALIDATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-GOLF-TASK-VALIDATE (slot:golf): fix 2 broken fleet-task scripts caught by live exit-code validation

**Commit:** `54655e1c4d19` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T11:50:00-05:00
**Tags:** fleet-task-health, u-golf-task-validate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-GOLF-TASK-VALIDATE (slot:golf): fix 2 broken fleet-task scripts caught by live exit-code validation

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-GOLF-TASK-VALIDATE (slot:golf): fix 2 broken fleet-task scripts caught by live exit-code validation

- scripts/cost-alarm-tick.mjs: SyntaxError — a cron literal `*/15 * * * *` inside the JSDoc header contained `*/`, which closed the block comment early so the rest parsed as code. Script never parsed -> PRISM Cost Alarm crashed (exit 1) on every run. Reworded to "every 15 minutes". Now exits 0 (daily=$0 fired=0).
- .claude/helpers/install-slot-worktree-migration-status-task.ps1: node-path candidate list omitted H:/Tools/nodejs/node.exe (the fleet's portable node), so registration aborted "no portable-node candidate". Added it as first candidate.

Context: restored all 5 (then 5+5) MISSING scheduled tasks -> 47 registered, MISSING 0. Validation (R15, live exit codes) caught both bugs that registration alone hid. Migration Status rebound SYSTEM->S4U current-user (fails as SYSTEM, exits 0 as user; install script has -AsCurrentUser for durability). 3 fresh tasks re-validated exit 0.
```

## Files touched (3)
- .claude/helpers/install-slot-worktree-migration-status-task.ps1 | 1 +
- scripts/cost-alarm-tick.mjs                                     | 2 +-
- 2 files changed, 2 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 54655e1c4d19`
- Milestone envelope: `mcp-server/data/milestones/FLEET-TASK-HEALTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._