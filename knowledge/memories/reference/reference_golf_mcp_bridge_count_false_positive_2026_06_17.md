---
name: reference-golf-mcp-bridge-count-false-positive-2026-06-17
description: "Diagnosis of \"chats keep getting logged out of MCP\" (2026-06-17, slot golf) — the :3100 server is healthy + fully supervised; the constant \"MCP BRIDGE DOWN / every chat disconnected\" banners are a FALSE POSITIVE because two detectors read transient-bridge count==0 (the normal fleet-idle resting state) as an outage. Fix held for operator confirm (fleet-wide per-turn hook)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.597Z
aliases: reference_golf_mcp_bridge_count_false_positive_2026_06_17
---


# "chats keep getting logged out of MCP" — false-positive bridge-count detector (2026-06-17, slot:golf)

Operator: *"diagnose mcp server issues, chats keep getting logged out."*

## Server is NOT the problem (live evidence)

- `:3100/health` = **healthy, uptime 17,259s (~4.8h continuous)**, heap 688/789 MB (far under the 4 GB cap — the [[reference_mcp_oom_heap_bump_2026_05_23]] fix holds), 0 inflight.
- All MCP scheduled tasks installed + running: `PRISM MCP Server`=**Running**, `PRISM MCP Server Watchdog`/`Connectivity Monitor`/`Priority Guardian`=Ready. The [[reference_mcp_server_3100_crash_fix_2026_05_22]] "uninstalled supervisor" gap is CLOSED.
- No crashes, no OOM cycling, no server downtime.

## Architecture: the `prism` bridge is TRANSIENT by design

`prism` MCP = a per-chat `mcp-http-bridge.mjs` that Claude Code spawns on-demand to forward stdio↔HTTP to the shared :3100. Lifecycle (proven in `.claude/cache/mcp-bridge.log`): `Bridge ready` → serve a request burst → `Bridge stdin closed, exiting` (Claude-Code-side close = normal). **50 distinct bridges** spawned in the recent window, different PIDs every 1–4 min when chats are active.

**Therefore `bridge count == 0` is the NORMAL resting state whenever the fleet is idle** — no chat is actively calling `prism`, so no transient bridge is alive. `0 live bridges ≠ chats logged out`. Claude Code re-spawns a fresh bridge the instant a chat makes a `prism` call.

## The bug — two detectors misread idle as outage

Both treat `bridges===0` as "every chat disconnected," firing the constant nudge that *feels* like perpetual logouts:

1. `.claude/hooks/mcp-connectivity-check.mjs` → `countBridges()` (golf's U-MCP-BRIDGE-DETECT) → `buildDegradedBanner()` = the per-turn **"WARN MCP BRIDGE DOWN … 0 bridge processes"** banner. Reads the fleet-reaper enum-cache; if 0 `mcp-http-bridge` procs → fires.
2. `scripts/lib/mcp-bridge-enforce.mjs` writes `state/shared/mcp-reconnect-signal.json` (`reason: bridge count=0`) → `.claude/hooks/mcp-broadcast-reconnect-inject.mjs` surfaces the **"MCP fleet broadcast — reconnect recommended"** banner.

Neither can distinguish "idle, no bridge needed right now" from a real outage — with a transient-bridge architecture, 0 is the idle resting value. Same class as the 2026-06-11 token-awareness stale-zone regression: an idle/freshness state fabricated into a worse "fault" signal. The PRECISE, reliable signal already exists and the connectivity hook prefers it first: the per-chat sentinel `readBridgeLiveness` (tango's MCP-CLIENT-ENFORCE-MS0) — it knows if THIS chat's OWN bridge died. The fleet-wide count=0 fallback is the noisy one.

## The genuinely-real disconnects (rare, self-healing)

One true event in the log at 21:58 (~4.7h before diagnosis): 7 bridges hit `MCP HTTP server not responding - self-healing` simultaneously = a brief :3100 stall (server respawn / GPU swap). The bridges' built-in retry (lima 5/22) recovered. During such a stall a chat mid-call CAN have its bridge error hard → Claude Code marks `prism` failed for that session → a real `/mcp`-needing logout. Infrequent + self-healing, NOT the constant state the banners imply.

## Fix (golf owns the code; HELD for operator confirm — fleet-wide per-turn hook)

Gate the fleet-wide `countBridges===0` banner AND the `mcp-bridge-enforce` signal write so they only fire on a CORROBORATED outage (server probe degraded OR the per-chat sentinel says THIS chat's bridge is confidently dead) — never on bare idle count=0. Keep the per-chat sentinel as the sole routine bridge-disconnect signal. Regression test: a transient-idle 0-count must NOT fire, while a sentinel-confirmed dead bridge still does. Then 3-of-3 gate. Operator asked to "diagnose"; the fix touches all 26 chats per turn, so golf surfaced it for a go/no-go rather than shipping unilaterally.

## Cross-refs
- [[reference_mcp_server_3100_crash_fix_2026_05_22]] · [[reference_mcp_oom_heap_bump_2026_05_23]] — the two PRIOR (server-side) MCP fixes, both holding.
- `.claude/hooks/mcp-connectivity-check.mjs` (countBridges + sentinel) · `scripts/lib/mcp-bridge-enforce.mjs` (signal writer) · `.claude/hooks/mcp-broadcast-reconnect-inject.mjs` (signal consumer).
