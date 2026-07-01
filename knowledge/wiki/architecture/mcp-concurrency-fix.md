---
title: MCP Concurrency Fix — fresh McpServer per /mcp request
type: architecture
status: shipped
shipped: 2026-05-31
commit: 1297b0a8f5
slot: golf
related: [[reference_mcp_sdk_single_transport_invariant_2026_05_25]], [[reference_mcp_server_3100_crash_fix_2026_05_22]], [[reference_mcp_supervisor_persistence_fix_2026_05_31]]
---

# MCP Concurrency Fix (U-MCP-FACTORY-REFACTOR)

## Symptom
For weeks: chats intermittently saw **"MCP DISCONNECTED"** (timeout, HTTP —) on `:3100` after a few minutes, plus periodic watchdog restarts. `prism_safe` (direct stdio) was never affected — the tell that the bug was in the shared HTTP `:3100` path, not the server core logic.

## Root cause (confirmed from live `supervisor.log`)
`mcp-server/src/index.ts` `app.post("/mcp")` called `server.connect(transport)` on the **module-level SHARED `McpServer`** on every request. The MCP SDK enforces **one transport per `Server` instance** (`@modelcontextprotocol/sdk/dist/esm/shared/protocol.js:217`). When two `/mcp` requests **overlap** — constant with multiple active chats — the 2nd `connect()` throws `Already connected to a transport` **before** `handleRequest`, so the request gets **no response** → client times out → "MCP DISCONNECTED". The `unhandledRejection` handler only logs (process survives), but the log floods and under churn `/health` starves → watchdog restart → cold-boot gap. **Not** a memory leak (heap stable ~640MB).

## Fix — official SDK stateless pattern (fresh McpServer per request)
- `registerTools()` split into:
  - `async bootstrapServices()` — heavy global I/O (registries, bootstrap, DB, domain hooks, hoisted engine `.init()`s). Idempotent `_bootstrapped` guard; runs **once** per process.
  - `async bindDispatchers(server)` — side-effect-free per-server tool registration (already parameterized as `registerXxxDispatcher(server)`). Runs per server.
  - A `_postBindDone`-guarded **once-only tail** inside bindDispatchers: synergies, SVI `startAutoWatch`, the protocol-bridge dispatch handler (captures the SHARED server's `_registeredTools`), module-health, `SYSTEM_STARTUP` event. Runs only on the shared server's first bind.
- `buildRequestServer()` — builds a **fresh `McpServer` per `/mcp` request**, binds dispatchers (tail skipped via guard), so `server.connect()` never contends.
- Shared module-level server still bound (for REST `callTool` + `/health` + bridge).
- §4b `httpServer.{keepAliveTimeout=65000, headersTimeout=70000, requestTimeout=0, maxConnections=200}`.

`bindDispatchers` is `async` (the tail has `await` SVI + `await import(EventBus)`); cascaded through `buildRequestServer` + both call sites + the handler.

## Why per-request, not per-session cache
Per-request needs no session-id plumbing / cache / idle-GC and matches the SDK's documented stateless example. Cost: **warm steady-state ~30ms/request** (cold/concurrent first hits ~480ms = one-time cache warming, front-loaded not per-request). Heap stable. If fleet-scale latency ever bites, a per-session cache is the optimization — correctness shipped first.

## Validation
`tsc --noEmit` clean (needs 16GB heap; 8GB OOMs). **esbuild is the binding gate** — tsc's incremental cache once missed an `await`-in-sync-function that esbuild caught. Isolation `:3199`: 115 reqs incl 30 concurrent, **0 "Already connected"**, heap stable. Live `:3100` cutover: 36 concurrent reqs ok=36 bad=0, single clean listener.

## Cutover gotcha (operational)
Hand-killing the prod `:3100` server to force a respawn triggered a **multi-spawn race** (running supervisor + PT3M trigger both respawned → two instances raced for the port → loser ran SVI headless without binding). Clean recovery: kill ALL `dist/index.js` node procs → confirm port free → `Start-ScheduledTask "PRISM MCP Server"` for ONE clean supervised boot. Let one supervisor own the respawn; don't hand-kill into it.
