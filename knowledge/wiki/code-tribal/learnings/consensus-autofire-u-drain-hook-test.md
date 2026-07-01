# CONSENSUS-AUTOFIRE/U-DRAIN-HOOK-TEST — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONSENSUS-AUTOFIRE]/U-DRAIN-HOOK-TEST (slot:bravo): make stop-consensus-drain import-safe (was top-level execution + process.exit on import) via run()+isDirect guard; 6 tests (queueDepth, pickDrainer, spawn-only-when-nonempty-and-drainer-present, never-throws); live CLI smoke confirms behavior preserved

**Commit:** `48933c9cc9c3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T08:59:49-05:00
**Tags:** consensus-autofire, u-drain-hook-test, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONSENSUS-AUTOFIRE]/U-DRAIN-HOOK-TEST (slot:bravo): make stop-consensus-drain import-safe (was top-level execution + process.exit on import) via run()+isDirect guard; 6 tests (queueDepth, pickDrainer, spawn-only-when-nonempty-and-drainer-present, never-throws); live CLI smoke confirms behavior preserved

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONSENSUS-AUTOFIRE]/U-DRAIN-HOOK-TEST (slot:bravo): make stop-consensus-drain import-safe (was top-level execution + process.exit on import) via run()+isDirect guard; 6 tests (queueDepth, pickDrainer, spawn-only-when-nonempty-and-drainer-present, never-throws); live CLI smoke confirms behavior preserved
```

## Files touched (3)
- .claude/hooks/stop-consensus-drain.mjs      | 57 +++++++++++++++++++++++++++++++++------------------------
- .claude/hooks/stop-consensus-drain.test.mjs | 79 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 112 insertions(+), 24 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 48933c9cc9c3`
- Milestone envelope: `mcp-server/data/milestones/CONSENSUS-AUTOFIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._