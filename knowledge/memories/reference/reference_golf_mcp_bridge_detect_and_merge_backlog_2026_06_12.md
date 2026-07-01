---
name: reference_golf_mcp_bridge_detect_and_merge_backlog_2026_06_12
description: MCP connectivity false-OK fix (server-up != chat-connected, bridge-layer dead) + the meta-finding that golf's top-ROI work is all built-on-slot/golf-but-unmerged (the integrator-merge bottleneck)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.597Z
aliases: reference_golf_mcp_bridge_detect_and_merge_backlog_2026_06_12
---


**Golf MCP-connectivity fix + merge-backlog finding (2026-06-12, slot:golf, operator: "fix the MCP-connectivity-every-turn system + scan golf sessions for incomplete high-ROI work").**

## MCP false-OK fix (U-MCP-BRIDGE-DETECT, commit slot/golf `0fbb5615a9`)
Operator hit it live: had to manually `/mcp`. Root cause: `mcp-connectivity-check.mjs` probes the **server** (`:3100`) and declares `ok` when it returns ANY status <500 (406 = up). But "connected" for a chat is the per-chat **`prism` bridge** (`mcp-http-bridge.mjs`, the stdio<->HTTP conduit Claude Code spawns) -- which can be DEAD while `:3100` is up. Observed: `:3100` 406 (up) + **0 `mcp-http-bridge` procs** -> every chat's prism MCP disconnected, but the probe's `ok:true` = FALSE-OK, so nothing surfaced and `maybeReconnect` (server restart) was a no-op (server already up).
- Fix: `countBridges()` reads the **fleet-reaper enum-cache** (`state/shared/.fleet-reaper-enum-cache-<host>.json`, schema `{procs:[{pid,ppid,name,cmd,...}]}`) -- a cheap FILE READ (a per-turn powershell enum = ~526ms, unacceptable on a per-turn fleet hook). FAIL-SOFT (missing/stale>900s/disabled/bad-schema -> `ok:false`, NEVER a false degraded banner). When server-up + fresh-cache + 0 bridges -> OVERRIDE the silent/reachable banner with a `/mcp` directive + `prism_safe` fallback. 29 tests (22 + 7 new; also fixed a pre-existing stale test: getConfig expected timeoutMs 1000 but hook bumped to 3000).
- **HARNESS LIMIT (R12, honest):** a UserPromptSubmit hook CANNOT respawn the per-chat bridge or reconnect Claude Code's MCP client -- only `/mcp` / session-restart does. So the fix DETECTS + proactively DIRECTS (`/mcp`), it does not auto-reconnect the client. Server-DOWN auto-restart (`maybeReconnect`) is unchanged + still works.
- Slot-checkin (operator's 2nd ask) ALREADY works: golf bound `claude-e13f9e93`, fresh 1-min heartbeat, per-turn heartbeat hooks (`chat-slot-heartbeat`, `heartbeat-keepalive`, `slot-session-sidecar-heartbeat`). Reapers+monitors ALL Ready (Fleet Reaper, Memory Monitor, Hook Janitor, Tmp Sweep).

## META-FINDING (the real high-ROI gap): the slot/golf MERGE BACKLOG
Scanning golf sessions for "incomplete high-ROI" surfaced that golf's TOP-ROI work is built+tested but stuck on `slot/golf`, never merged to the live tree (`cad-fusion-live-ms0`) -> DORMANT. The bottleneck is the integrator merge, not building. Confirmed dormant/unwired (per [[reference_golf_inventory_of_record_2026_06_11]] + this session):
1. **`agent-tier-route.mjs` + `agent-tier-router` lib** (AGENT-TIER-MS0) -- Ollama->Haiku->Sonnet->Opus tier routing, THE 5-30x cost lever (Loop-Engineering); 20 tests, live-smoke verified. UNWIRED.
2. **`stop-mcp-server-heal.mjs`** (`6270570625`) -- 4th MCP keepalive layer, 26-chat redundancy. DIRECTLY serves the operator's "always connected" goal. UNMERGED + unwired. **Highest on-theme item for the MCP ask.**
3. This session (all slot/golf, merge-pending): `prism-skill-curator.mjs` (`b875dd9791`), `agent-fanout-pressure-gate.mjs` (`f6262025bf`, cp'd live but git-untracked in main), `tmp-orphan-janitor` recursion fix (`fb30d278c6`), `mcp-connectivity-check` bridge-detect (`0fbb5615a9`).
4. Others (inventory ROI queue): 89 unwired engines / 26 bridges (P0), `tele()` inject backstop (61/62 inject hooks write no telemetry), G3 tribal-index write-sharding (V8-cap crash class), U-GOLF-HEAL-VERIFY-LEG, read-to-ollama-digest, error-learn bucket-eviction, git-push corruption repair (corrupt tree `e36809bbd2`).

**ACTION (integrator):** a focused `slot/golf -> cad-fusion-live-ms0` merge pass would activate a whole stack of high-ROI fleet hygiene + cost-control + MCP-resilience hooks at once. This is the single highest-leverage golf action -- it converts built-but-dormant into live. Do it when the fleet is calm (not 429-throttled / 31k-dirty). Cross-link: [[reference_golf_skills_hooks_audit_2026_06_12]], [[reference_golf_tmp_janitor_recursion_gap_2026_06_12]].
