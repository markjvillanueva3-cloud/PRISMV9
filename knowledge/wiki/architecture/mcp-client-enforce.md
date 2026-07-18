---
title: MCP Client-Connection Enforcement (per-chat bridge liveness)
type: architecture
status: live
slot: tango
milestone: MCP-CLIENT-ENFORCE-MS0
commit: e8ec69164f
created: 2026-06-13
---

# MCP Client-Connection Enforcement

## Problem

The PRISM fleet keeps the **shared MCP daemon** (`http://127.0.0.1:3100`) alive with a supervisor + watchdog + connectivity-monitor + priority-guardian (4 scheduled tasks). But each chat reaches `:3100` through its **own long-lived stdio bridge** process (`mcp-http-bridge.mjs`, one per chat, spawned by the harness from `.mcp.json`). When that per-chat bridge **dies mid-session**, the Claude Code harness drops every `mcp__prism__*` tool for the rest of the session — yet `:3100` stays perfectly healthy.

The per-turn `mcp-connectivity-check.mjs` only probed the **daemon**, so it reported all-clear while the chat was silently disconnected. Live-reproduced 2026-06-13: tango's bridge (pid 50992) initialized fine (67 tools), later died, the chat ran with zero prism tools while `/health` returned 200.

There are **two** disconnect granularities:
- **Total outage** — 0 bridges anywhere (daemon up, fleet-wide bridge layer dead). Detected by golf's `countBridges`.
- **Per-chat** — my bridge dead while peers' bridges are alive (`countBridges > 0` -> false-OK). Detected by the **sentinel** (this milestone).

## Mechanism

```
mcp-http-bridge.mjs (per chat)            mcp-connectivity-check.mjs (per turn)
  on start: writeSentinel(slot,{pid})       probe :3100/health
  every 20s: heartbeatSentinel(slot,{pid})  if daemon UP:
  on exit:   removeSentinel(slot, ownPid)     1. readBridgeLiveness(slot)  <- per-chat (precise)
                  |                              confident dead? -> client-disconnect banner
                  v                            2. else countBridges()      <- fleet-wide fallback (golf)
   .claude/cache/mcp-bridge-live/<slot>.json     0 bridges? -> degraded banner
```

- **Slot key** (`resolveSlotName`): `PRISM_BOOT_SLOT` -> slot-worktree cwd -> null. The bridge and the hook both call it, so they always agree. Reuses `slotFromCwd` from `mcp-tool-domains.mjs`.
- **Liveness verdict** (`readBridgeLiveness`): `pid-dead` / `stale-heartbeat` are the only CONFIDENT "bridge died" verdicts; `no-sentinel` / `unknown-slot` / `parse-error` are **no-signal** (never raise a false alarm — a missing sentinel can be a pre-upgrade bridge or a shared-tree chat). pid-liveness (`process.kill(pid,0)`) + heartbeat freshness (90s stale threshold vs 20s beat) together defend against PID reuse.
- **Fast-respawn safety**: `writeSentinel` is last-writer-wins (newest bridge claims the slot); `heartbeatSentinel` refuses to clobber a sentinel a newer pid owns (supersede guard); `removeSentinel` only deletes its own pid's sentinel (pid guard). So an exiting old bridge never wipes a fresh successor's sentinel.
- **Fail-soft everywhere**: a sentinel error can never break the bridge's stdio loop or a turn.

## Honest limit (R12)

A UserPromptSubmit hook **cannot** force the harness to re-initialize a dead stdio MCP client mid-session — that is harness-owned. The enforcement **detects** the disconnect and **directs** the operator to `/mcp` reconnect (or restart the chat). It does not transparently reconnect the client. The detection activates once a bridge has published a sentinel (every bridge started after commit `e8ec69164f`).

## Files

| File | Role |
|------|------|
| `scripts/lib/mcp-bridge-liveness.mjs` | sentinel write/heartbeat/remove + `readBridgeLiveness` reader + CLI `--check` |
| `scripts/lib/mcp-bridge-liveness.test.mjs` | 33 node:test cases (every verdict, pid-reuse, supersede, parity, fail-soft) |
| `.claude/helpers/mcp-http-bridge.mjs` | publishes + heartbeats + removes the sentinel (additive) |
| `.claude/hooks/mcp-connectivity-check.mjs` | sentinel-first + golf countBridges fallback (superset of golf's `U-MCP-BRIDGE-DETECT`) |

## Reconciliation with golf

Golf shipped `U-MCP-BRIDGE-DETECT` (fleet-wide `countBridges`) on **slot/golf `0fbb5615a9`** (unmerged). This milestone ported golf's exact code verbatim into the live hook and layered the per-chat sentinel on top. The live hook is a strict **superset**; an in-file `MERGE NOTE (R7)` instructs the integrator to keep the live version on a `slot/golf` merge. Golf's unmerged `stop-mcp-server-heal.mjs` is a SERVER-keepalive layer (orthogonal — does not address the bridge/client layer).

## Knobs

`PRISM_MCP_CLIENT_CHECK_DISABLE=1` (skip per-chat sentinel), `PRISM_MCP_BRIDGE_LIVE_DIR`, `PRISM_MCP_BRIDGE_STALE_MS` (default 90000), `PRISM_MCP_BRIDGE_HEARTBEAT_MS` (default 20000), `PRISM_MCP_BRIDGE_CHECK_DISABLE=1` (golf's fleet count).

## Self-diagnose

`node H:/prism/scripts/lib/mcp-bridge-liveness.mjs --check` -> reports daemon up/down + THIS chat's bridge alive/dead + the exact recovery path.

Memory: [[reference_mcp_client_enforce_ms0_2026_06_13]].
