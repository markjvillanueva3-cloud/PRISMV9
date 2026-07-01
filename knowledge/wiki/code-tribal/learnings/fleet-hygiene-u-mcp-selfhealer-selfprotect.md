# FLEET-HYGIENE/U-MCP-SELFHEALER-SELFPROTECT — [MAIN-FORCE] [FLEET-HYGIENE]/U-MCP-SELFHEALER-SELFPROTECT (slot:golf): the cadence self-healer 'PRISM Fleet Task Health' was itself DISABLED and NOT crash-critical -- so its 5-min auto-re-enable was dormant (only chat-Stops fired the audit) AND nothing could re-enable IT if it dropped. Re-enabled it live ([Ready], PT5M) + added to CRASH_CRITICAL_TASKS (self-protect: the non-dry Stop-hook audit now re-enables it if ever disabled) + KNOWN_PRISM_TASKS (preserves the MUST_EXIST subset CRASH_CRITICAL subset KNOWN invariant; it has a real installer so not drift-stale). +1 revert-proof test (real CRASH_CRITICAL_TASKS). R16 gap-closure on U-MCP-CRASHCRIT-SELFHEAL -- the self-heal system is now self-protecting end-to-end. Pre-existing drift test 69 unchanged (separate unit).

**Commit:** `757e17bbdaef` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T20:07:02-05:00
**Tags:** fleet-hygiene, u-mcp-selfhealer-selfprotect, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-MCP-SELFHEALER-SELFPROTECT (slot:golf): the cadence self-healer 'PRISM Fleet Task Health' was itself DISABLED and NOT crash-critical -- so its 5-min auto-re-enable was dormant (only chat-Stops fired the audit) AND nothing could re-enable IT if it dropped. Re-enabled it live ([Ready], PT5M) + added to CRASH_CRITICAL_TASKS (self-protect: the non-dry Stop-hook audit now re-enables it if ever disabled) + KNOWN_PRISM_TASKS (preserves the MUST_EXIST subset CRASH_CRITICAL subset KNOWN invariant; it has a real installer so not drift-stale). +1 revert-proof test (real CRASH_CRITICAL_TASKS). R16 gap-closure on U-MCP-CRASHCRIT-SELFHEAL -- the self-heal system is now self-protecting end-to-end. Pre-existing drift test 69 unchanged (separate unit).

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-MCP-SELFHEALER-SELFPROTECT (slot:golf): the cadence self-healer 'PRISM Fleet Task Health' was itself DISABLED and NOT crash-critical -- so its 5-min auto-re-enable was dormant (only chat-Stops fired the audit) AND nothing could re-enable IT if it dropped. Re-enabled it live ([Ready], PT5M) + added to CRASH_CRITICAL_TASKS (self-protect: the non-dry Stop-hook audit now re-enables it if ever disabled) + KNOWN_PRISM_TASKS (preserves the MUST_EXIST subset CRASH_CRITICAL subset KNOWN invariant; it has a real installer so not drift-stale). +1 revert-proof test (real CRASH_CRITICAL_TASKS). R16 gap-closure on U-MCP-CRASHCRIT-SELFHEAL -- the self-heal system is now self-protecting end-to-end. Pre-existing drift test 69 unchanged (separate unit).
```

## Files touched (3)
- scripts/__tests__/fleet-task-health-watch.test.mjs | 10 ++++++++++
- scripts/fleet-task-health-watch.mjs                |  8 ++++++++
- 2 files changed, 18 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 757e17bbdaef`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._