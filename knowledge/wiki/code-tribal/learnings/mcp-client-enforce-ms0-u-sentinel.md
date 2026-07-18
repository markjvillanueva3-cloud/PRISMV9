# MCP-CLIENT-ENFORCE-MS0/U-SENTINEL — [MAIN-FORCE] [MCP-CLIENT-ENFORCE-MS0]/U-SENTINEL: per-chat MCP bridge liveness sentinel + client-aware connectivity hook

**Commit:** `e8ec69164f29` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T10:30:12-05:00
**Tags:** mcp-client-enforce-ms0, u-sentinel, auto-distilled

## Subject
[MAIN-FORCE] [MCP-CLIENT-ENFORCE-MS0]/U-SENTINEL: per-chat MCP bridge liveness sentinel + client-aware connectivity hook

## Body
```
[MAIN-FORCE] [MCP-CLIENT-ENFORCE-MS0]/U-SENTINEL: per-chat MCP bridge liveness sentinel + client-aware connectivity hook

Cross-cutting fleet infra (fleet-wide connectivity hook + per-chat bridge +
shared lib). Belongs on the shared tree; slot/tango worktree copies of these
harness-exec files are dead at runtime (.mcp.json/settings load from main).

Closes the SILENT client-disconnect class: a chat's per-chat prism bridge
(mcp-http-bridge.mjs) can die mid-session while the shared :3100 daemon stays
healthy -> the chat loses every mcp__prism__* tool, but the connectivity hook
(which only probed the DAEMON) stayed silent. Live-reproduced on tango (bridge
pid 50992 died, daemon /health 200, 0 prism tools).

- scripts/lib/mcp-bridge-liveness.mjs (+test, 33 cases): per-slot liveness
  sentinel (write/heartbeat/remove) + reader. pid-liveness + heartbeat-freshness
  defend PID reuse; supersede + pid guards survive fast respawns; fully fail-soft.
  CLI --check self-diagnoses any chat. Reuses slotFromCwd (no reinvention).
- .claude/helpers/mcp-http-bridge.mjs: bridge publishes + 20s-heartbeats its
  sentinel, removes (pid-guarded) on every exit. Additive, fail-soft, unref'd.
- .claude/hooks/mcp-connectivity-check.mjs (+test): PORTS golf slot/golf
  U-MCP-BRIDGE-DETECT countBridges (fleet-wide) verbatim AND layers a precise
  per-CHAT sentinel check on top (sentinel-first, countBridges fallback). Brings
  golf stale-timeout test fix live. In-file R7 merge-note: strict superset of
  golf branch; keep this version on a slot/golf merge.

Honest limit (R12): a hook cannot reconnect the harness MCP client; it now
DETECTS + directs /mcp. 69/69 tests; 4-agent per-file scrutiny PASS (0 P0/P1).
Knobs: PRISM_MCP_CLIENT_CHECK_DISABLE, PRISM_MCP_BRIDGE_{LIVE_DIR,STALE_MS,HEARTBEAT_MS}.
```

## Files touched (6)
- .claude/helpers/mcp-http-bridge.mjs           |  36 +++++++++++++
- .claude/hooks/mcp-connectivity-check.mjs      |  60 +++++++++++++++++++---
- .claude/hooks/mcp-connectivity-check.test.mjs | 105 ++++++++++++++++++++++++++++++++++++++
- scripts/lib/mcp-bridge-liveness.mjs           | 366 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/mcp-bridge-liveness.test.mjs      | 308 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 868 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- note: strict superset of

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e8ec69164f29`
- Milestone envelope: `mcp-server/data/milestones/MCP-CLIENT-ENFORCE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._