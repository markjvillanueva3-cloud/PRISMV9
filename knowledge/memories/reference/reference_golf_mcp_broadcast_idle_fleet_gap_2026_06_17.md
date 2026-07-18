---
name: reference_golf_mcp_broadcast_idle_fleet_gap_2026_06_17
description: FIX
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.597Z
aliases: reference_golf_mcp_broadcast_idle_fleet_gap_2026_06_17
---


**FIX #2 idle-fleet coverage gap (2026-06-17, slot golf, away-mode watch).**
`U-MCP-FALSEPOS-BROADCAST-GATE` (`9da42f74c6`) suppresses the false "/mcp reconnect" fleet broadcast only when `readCachedServerUp` returns true -- i.e. when the cached `:3100` `/health` probe is FRESH (<=120s) AND `ok:true`. That cache is written by `mcp-connectivity-check.mjs` on **UserPromptSubmit** (30s throttle). In a fully-IDLE away-mode fleet (no chat submits a prompt for >120s), the cache goes STALE -> `readCachedServerUp` returns `undefined` -> the legacy broadcast-on-fleet-0 path still fires. The 15min broadcast TTL (`DEFAULT_BROADCAST_TTL_SEC=900`) dedups it, so a stale-cache fleet-0 detection rewrites the signal roughly every ~15min.

**LIVE EVIDENCE (this tick):** `mcp-reconnect-signal.json` written 6.5min ago by pid 48444 (reason "fleet MCP bridge count=0"); the health cache RIGHT NOW is `ok:true ageSec=96` (fresh) and a direct `:3100 /health` returned `200` in `1.4ms` -- the server was never down. The 6.5m-old write happened during a stale-cache window (idle chats -> no UserPromptSubmit -> cache aged past 120s). FIX #2 IS working (when the cache is fresh, the broadcast is suppressed -- a prior tick's signal sat 12m stale without rewrite); the residual is purely the idle-window stale-cache path.

**Scope (R12 honesty):** FIX #2 fully covers the operator's ACTUAL complaint -- disconnect banners during ACTIVE 16-chat sessions (cache fresh every turn). The idle-fleet residual is advisory-only (a `/mcp` banner; no tool block, no harm) and, with no operator watching in away-mode, nobody even sees it. So this is low-priority, NOT a re-open of the disconnect bug.

**Queued fix (attended session -- a hot-path PreToolUse enforce-gate change merits the full 3-of-3, NOT an unattended away-mode patch):** give the broadcast gate a server-health signal that stays fresh when the fleet is idle. Preferred: have the durable `PRISM Fleet Reaper` sweep (5-min cadence, already probes `:3100`) write a durable health sidecar; `readCachedServerUp` falls back to it (own freshness window) so an idle fleet still has a fresh server-up signal. AVOID a synchronous TCP/HTTP probe inside `mcp-bridge-enforce-pretool.mjs` -- that adds latency to the tool-call hot path. Sibling of [[reference_mcp_false_disconnect_and_capacity_guard_2026_06_17]]; same false-positive class as [[reference_golf_mcp_bridge_count_false_positive_2026_06_17]].
