# TOOL-LIBRARIES/U-CRON-SQLITE-REEXEC — [MAIN-FORCE] [TOOL-LIBRARIES]/U-CRON-SQLITE-REEXEC (slot:romeo): cam cron self-reexecs with --experimental-sqlite + surfaces seat errors (R12)

**Commit:** `519ae3e498d7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T10:20:35-05:00
**Tags:** tool-libraries, u-cron-sqlite-reexec, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CRON-SQLITE-REEXEC (slot:romeo): cam cron self-reexecs with --experimental-sqlite + surfaces seat errors (R12)

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CRON-SQLITE-REEXEC (slot:romeo): cam cron self-reexecs with --experimental-sqlite + surfaces seat errors (R12)

The natural invocation 'node scripts/cam-tool-library-cron.mjs' (no flag) reported
FAILED while every lane showed OK -- the hyperMILL .hmt build needs --experimental-sqlite
and its per-seat 'node:sqlite unavailable' errors were swallowed (silent FAILED, R12 gap).

Fix: (1) reexecWithSqliteIfNeeded() self-reexecs ONCE with the flag (PRISM_CAM_CRON_REEXEC
guard) so the natural invocation just works + the scheduled task stays robust if its action
ever drops the flag -- the codebase's established self-reexec pattern; (2) pure
formatCronReport() surfaces every seat's error reason on a FAILED run -- never a silent fail.
Live: no-flag run now self-reexecs -> OK exit 0 (45894 .hmt tools built); reexec-blocked run
FAILS loud listing each PRISM_*.hmt reason. +4 tests (surfacing on/off + sqlite-probe linchpin
via subprocess; both initial test bugs -- error-count vs placed-count, Windows file:// URL --
caught + fixed, not weakened). 7/7 cron, all 93 tool-library tests green.
```

## Files touched (3)
- scripts/cam-tool-library-cron.mjs      | 53 +++++++++++++++++++++++++++++++++++++++++++++++------
- scripts/cam-tool-library-cron.test.mjs | 49 ++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 95 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 519ae3e498d7`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._