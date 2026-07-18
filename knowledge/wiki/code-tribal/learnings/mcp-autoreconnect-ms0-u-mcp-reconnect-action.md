# MCP-AUTORECONNECT-MS0/U-MCP-RECONNECT-ACTION — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-AUTORECONNECT-MS0]/U-MCP-RECONNECT-ACTION: per-turn MCP daemon auto-reconnect (single-flight O_EXCL) + CLI + golf wire patch

**Commit:** `7af3d6ab65c7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T17:20:40-05:00
**Tags:** mcp-autoreconnect-ms0, u-mcp-reconnect-action, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-AUTORECONNECT-MS0]/U-MCP-RECONNECT-ACTION: per-turn MCP daemon auto-reconnect (single-flight O_EXCL) + CLI + golf wire patch

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-AUTORECONNECT-MS0]/U-MCP-RECONNECT-ACTION: per-turn MCP daemon auto-reconnect (single-flight O_EXCL) + CLI + golf wire patch

Operator rule: if a chat is disconnected it auto-reconnects each turn. Detection
(mcp-connectivity-check, per-turn) + SessionStart spawn (mcp-daemon-autostart) already existed;
this adds the missing MID-session ACTION half (R8 - read all 4 neighbors first).

- scripts/lib/mcp-reconnect-action.mjs: pure decideReconnect + O_EXCL single-flight lock (TTL
  doubles as throttle, <=1 daemon spawn/60s fleet-wide) + detached spawnDaemon + fail-soft
  maybeReconnect (accepts up|ok). 30/30 node:test incl real-fs O_EXCL + self-heal e2e + CLI oracle.
- scripts/mcp-reconnect.mjs: CLI (--json/--probe-only), always exit 0.
- HOOK-PATCH-MCP-AUTORECONNECT.md: golf wire + CLAUDE.md rule + MEMORY pointer.
- wiki + feedback memory (4-surface). 2-reviewer per-file scrutiny PASS/PASS.
```

## Files touched (6)
- knowledge/wiki/architecture/mcp-autoreconnect.md                |  81 ++++++++++++++++++++++++++
- scripts/lib/mcp-reconnect-action.mjs                            | 225 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/mcp-reconnect-action.test.mjs                       | 359 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/mcp-reconnect.mjs                                       |  46 +++++++++++++++
- state/shared/dashboards/patches/HOOK-PATCH-MCP-AUTORECONNECT.md |  98 ++++++++++++++++++++++++++++++++
- 5 files changed, 809 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7af3d6ab65c7`
- Milestone envelope: `mcp-server/data/milestones/MCP-AUTORECONNECT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._