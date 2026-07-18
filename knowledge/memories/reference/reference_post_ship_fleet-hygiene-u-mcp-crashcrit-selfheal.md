---
name: reference_post_ship_fleet-hygiene-u-mcp-crashcrit-selfheal
description: Auto-distilled learnings from shipping FLEET-HYGIENE/U-MCP-CRASHCRIT-SELFHEAL (commit 229823571). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.853Z
aliases: reference_post_ship_fleet-hygiene-u-mcp-crashcrit-selfheal
---


# FLEET-HYGIENE/U-MCP-CRASHCRIT-SELFHEAL

[MAIN-FORCE] [FLEET-HYGIENE]/U-MCP-CRASHCRIT-SELFHEAL (slot:golf): add 'PRISM MCP Server' + 'PRISM MCP Server Watchdog' to CRASH_CRITICAL_TASKS -- the self-healer (selectReenableTargets/reenableTasks) was BLIND to the fleet's most critical service (they were in KNOWN_PRISM_TASKS but NOT crash-critical), so when both silently landed Disabled mid-session the WARN never self-healed -> :3100 had no durable auto-restart -> the operator's recurring 'mcp server disconnect'. Now a disabled MCP task auto-re-enables (non-elevated, verified live this session). +1 revert-proof test using the real CRASH_CRITICAL_TASKS. DISCLOSE: pre-existing UNRELATED red -- detectInstallerDrift E2E (test 69) flags KNOWN_PRISM_TASKS stale (16 installer tasks unsynced + Zulu->Zebra rename); a separate drift-sync unit, untouched by this change. Ref reference_mcp_durable_tasks_disabled_orphan_supervisor_2026_06_17

**Shipped:** 2026-06-17T19:49:04-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[fleet-hygiene-u-mcp-crashcrit-selfheal]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._