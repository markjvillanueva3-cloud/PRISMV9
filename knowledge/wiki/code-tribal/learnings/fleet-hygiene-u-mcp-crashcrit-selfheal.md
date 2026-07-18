# FLEET-HYGIENE/U-MCP-CRASHCRIT-SELFHEAL — [MAIN-FORCE] [FLEET-HYGIENE]/U-MCP-CRASHCRIT-SELFHEAL (slot:golf): add 'PRISM MCP Server' + 'PRISM MCP Server Watchdog' to CRASH_CRITICAL_TASKS -- the self-healer (selectReenableTargets/reenableTasks) was BLIND to the fleet's most critical service (they were in KNOWN_PRISM_TASKS but NOT crash-critical), so when both silently landed Disabled mid-session the WARN never self-healed -> :3100 had no durable auto-restart -> the operator's recurring 'mcp server disconnect'. Now a disabled MCP task auto-re-enables (non-elevated, verified live this session). +1 revert-proof test using the real CRASH_CRITICAL_TASKS. DISCLOSE: pre-existing UNRELATED red -- detectInstallerDrift E2E (test 69) flags KNOWN_PRISM_TASKS stale (16 installer tasks unsynced + Zulu->Zebra rename); a separate drift-sync unit, untouched by this change. Ref reference_mcp_durable_tasks_disabled_orphan_supervisor_2026_06_17

**Commit:** `229823571bc5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T19:49:04-05:00
**Tags:** fleet-hygiene, u-mcp-crashcrit-selfheal, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-MCP-CRASHCRIT-SELFHEAL (slot:golf): add 'PRISM MCP Server' + 'PRISM MCP Server Watchdog' to CRASH_CRITICAL_TASKS -- the self-healer (selectReenableTargets/reenableTasks) was BLIND to the fleet's most critical service (they were in KNOWN_PRISM_TASKS but NOT crash-critical), so when both silently landed Disabled mid-session the WARN never self-healed -> :3100 had no durable auto-restart -> the operator's recurring 'mcp server disconnect'. Now a disabled MCP task auto-re-enables (non-elevated, verified live this session). +1 revert-proof test using the real CRASH_CRITICAL_TASKS. DISCLOSE: pre-existing UNRELATED red -- detectInstallerDrift E2E (test 69) flags KNOWN_PRISM_TASKS stale (16 installer tasks unsynced + Zulu->Zebra rename); a separate drift-sync unit, untouched by this change. Ref reference_mcp_durable_tasks_disabled_orphan_supervisor_2026_06_17

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-MCP-CRASHCRIT-SELFHEAL (slot:golf): add 'PRISM MCP Server' + 'PRISM MCP Server Watchdog' to CRASH_CRITICAL_TASKS -- the self-healer (selectReenableTargets/reenableTasks) was BLIND to the fleet's most critical service (they were in KNOWN_PRISM_TASKS but NOT crash-critical), so when both silently landed Disabled mid-session the WARN never self-healed -> :3100 had no durable auto-restart -> the operator's recurring 'mcp server disconnect'. Now a disabled MCP task auto-re-enables (non-elevated, verified live this session). +1 revert-proof test using the real CRASH_CRITICAL_TASKS. DISCLOSE: pre-existing UNRELATED red -- detectInstallerDrift E2E (test 69) flags KNOWN_PRISM_TASKS stale (16 installer tasks unsynced + Zulu->Zebra rename); a separate drift-sync unit, untouched by this change. Ref reference_mcp_durable_tasks_disabled_orphan_supervisor_2026_06_17
```

## Files touched (3)
- scripts/__tests__/fleet-task-health-watch.test.mjs | 16 ++++++++++++++++
- scripts/fleet-task-health-watch.mjs                | 11 +++++++++++
- 2 files changed, 27 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 229823571bc5`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._