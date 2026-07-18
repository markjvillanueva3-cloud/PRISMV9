---
name: reference-mcp-sdk-single-transport-invariant-2026-05-25
description: "MCP SDK McpServer.connect() can only bind ONE transport. Stateful session-pool needs new McpServer per session (factory), not per-request server.connect on a singleton. Discovered 2026-05-25 by claude-9e91d800 (slot:golf, /loop iter 2) implementing MCP-DISCONNECT-FIX. Spec diagnosis correct; first implementation hit the invariant."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.653Z
aliases: reference_mcp_sdk_single_transport_invariant_2026_05_25
---


# MCP SDK single-transport invariant

The `@modelcontextprotocol/sdk` `McpServer.connect(transport)` (and underlying `Server.connect()`) sets an internal `_connected` flag and rejects subsequent `connect()` calls with:

> `Error: Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.`

Source: `node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.js:217`.

## Why this matters

MCP-DISCONNECT-ROOT-CAUSE-2026-05-25.md (the spec) correctly diagnosed the per-request `server.connect(transport)` pattern at PRISM's `mcp-server/src/index.ts:973-983` as the root cause of mid-turn disconnects at 20+ chat scale (leaks ~10MB/min from closure churn). The first implementation attempt swapped to a session-pooled stateful pattern but kept the singleton `McpServer` (`const server = new McpServer(...)` at line 402) and called `server.connect(newTransport)` per new session. The second session's connect threw the invariant error → HTTP 500 on every /mcp call. Reverted same iter; baseline restored.

## The proper fix (Path A — factory per session)

```typescript
// Factory: take an empty McpServer, register all tools/resources/prompts, return it ready-to-connect
async function buildMcpServer(): Promise<McpServer> {
  const s = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  await registerToolsOn(s);   // refactored registerTools() that takes server as arg
  return s;
}

const SESSION_CACHE = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport; lastUsed: number }>();

app.post("/mcp", async (req, res) => {
  let sessionId = ((req.headers["mcp-session-id"] as string | undefined) || "").trim();
  let entry = sessionId ? SESSION_CACHE.get(sessionId) : undefined;
  if (!entry) {
    sessionId = sessionId || randomUUID();
    const localId = sessionId;
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => localId, enableJsonResponse: true });
    const server = await buildMcpServer();
    await server.connect(transport);  // ← ONCE per session, on a FRESH McpServer
    entry = { server, transport, lastUsed: Date.now() };
    SESSION_CACHE.set(localId, entry);
    res.setHeader("Mcp-Session-Id", localId);
  } else {
    entry.lastUsed = Date.now();
  }
  await entry.transport.handleRequest(req, res, req.body);
});
```

## Costs to design around

- `registerTools()` does heavy work: `registryManager.initialize()`, `bootstrapRegistries()` (490 formulas + 824 machines from data files), dispatcher lazy-loads. If invoked per-new-session at fleet scale, it dominates session-open latency.
- Mitigation: cache the post-bootstrap data structures (formula registry, machine registry, dispatcher table) once at module load; `registerToolsOn(server)` only replays the cheap `server.tool()`/`server.resource()` calls against them.
- Tool registration in PRISM is ~90 tools — each `server.tool()` is a synchronous Map insert, microseconds. Should be <50ms total per fresh server once registries are cached.

## Path that DOES NOT work

**Path B: `server.close()` then `server.connect(newTransport)` on the singleton.** Only one session can be active at a time; concurrent fleet chats would serialize through the lock. Strictly worse than the per-request leak baseline. Discarded.

**Path C: monkey-patch `_connected = false`.** Brittle — depends on SDK internals; SDK upgrade breaks silently; the Protocol layer also holds the transport reference internally and dispatches messages there. Discarded.

## Current-state delta (re-verified 2026-05-31, slot golf — line numbers DRIFTED + new entanglement)

Re-read `mcp-server/src/index.ts` against this memory. The blueprint above is still correct; the **coordinates moved** and there is a **new entanglement** the factory refactor must preserve:

- `const server = new McpServer(...)` — now **line 404** (was 402).
- `async function registerTools(): Promise<void>` — **line 422**, body runs to ~line 855. It's a **~430-line function** closing over the module-level `server` (line 404). Two call sites: **860** (stdio `prism_safe` path) + **888** (HTTP path). The factory split must thread a `server` param through all `server.tool(...)` calls in that 430-line body, and pull the heavy `registryManager.initialize()` / `bootstrapRegistries()` into a run-once `bootstrapOnce()` so it does NOT re-run per session.
- The leak site is now **`app.post("/mcp")` at line 1056**, `server.connect(transport)` at **line 1120** (spec's 973-983 is stale — that range is now the `/ready` canary endpoint).
- **Why the per-request connect doesn't throw the invariant today:** the handler is **stateless** (`new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`, lines 1113-1116) with **`res.on("close", () => transport.close())`** at 1118. The transport closes at the end of every request, which resets the SDK's `_connected` flag, so the *next* request's `connect()` succeeds. The invariant only bites the *session-cache* design (a live cached transport keeps `_connected` true → 2nd session's `connect()` on the shared singleton throws). That is exactly why Path A needs a **fresh McpServer per session**, not a shared one.
- **NEW ENTANGLEMENT — preserve it:** the `/mcp` handler is now wrapped by **OBSERVABILITY-MS0** instrumentation (slot:bravo, 2026-05-30) — `metrics.recordMethod/incInflight/recordTool`, a 128KB response-body tap detecting JSON-RPC errors + MCP `isError` results, and `res.on("close")` inflight-decrement (lines 1057-1111). The factory refactor must keep this telemetry tap intact around the new session-cache dispatch.
- `app.delete("/mcp")` (1134) + `app.get("/mcp")` (1125) currently return **405 stateless-mode stubs** — Path A turns DELETE into real session-close (`SESSION_CACHE.delete` + `transport.close()`).

**Urgency framing (so the dedicated session isn't rushed):** at **current load this is NOT a fire** — verified `/health` 2026-05-31: heap **631MB / rss 735MB after 11.7h uptime** with 1 active chat. The closure-churn leak is **scale-only** (bites at 20+ concurrent chats). golf's **PT3M supervisor trigger** (2026-05-31, [[reference_mcp_supervisor_persistence_fix_2026_05_31]]) already makes crash-recovery fast + always-on. So the factory refactor is a **high-ROL throughput/stability improvement for fleet scale, not an emergency patch** — it deserves a fresh dedicated papa session with a full `npm run build` + restart + SDK-invariant validation (2nd session must not 500) + a 20-chat load check, NOT a session-tail attempt on compacted context (landing it half-built → broken dist → supervisor crash-loops → MCP down fleet-wide is the worst outcome).

## ✅ SHIPPED 2026-05-31 — `U-MCP-FACTORY-REFACTOR` (commit `1297b0a8f5`, slot golf)

The factory refactor landed. NOT a per-session cache (the §4a sketch) — the simpler, correct, official-SDK-stateless variant: a **fresh McpServer per /mcp REQUEST** via `buildRequestServer()`. Split: `bootstrapServices()` (heavy global I/O, idempotent `_bootstrapped` guard, once) + `async bindDispatchers(server)` (side-effect-free per-server tool registration — already parameterized as `registerXxxDispatcher(server)`) + a `_postBindDone`-guarded once-only tail (synergies / SVI startAutoWatch / protocol-bridge handler / module-health / SYSTEM_STARTUP event — runs only on the shared server's first bind). The shared module-level server stays bound for REST `callTool` + /health + bridge. Hoisted 4 engine `.init()`s (telemetry/pfp/memoryGraph/certificate) into bootstrap (they were buried in the bind region). bindDispatchers is `async` (the tail has `await` SVI + `await import(EventBus)`); cascaded through `buildRequestServer` + both call sites + the handler. §4b `httpServer.{keepAliveTimeout=65000,headersTimeout=70000,requestTimeout=0,maxConnections=200}` shipped too.

**Why per-request not per-session:** per-request needs NO session-id plumbing/cache/idle-GC and matches the SDK's documented stateless example. Measured cost: **warm steady-state ~30ms/request** (90 `server.tool()` Map-inserts; cold/concurrent first hits were ~480ms from cache-warming, front-loaded not per-request). Heap stable. If fleet-scale latency ever bites, the per-session cache is the optimization — but correctness shipped first.

**Validation:** tsc --noEmit clean (16GB heap — 8GB OOMs); esbuild clean (esbuild, NOT tsc, is the binding gate — tsc's incremental cache missed an `await`-in-sync-fn that esbuild caught); isolation :3199 = 115 reqs incl 30 concurrent, **0 "Already connected"**; LIVE :3100 cutover = 36 concurrent reqs ok=36 bad=0, single clean listener.

**Cutover gotcha (for next time):** killing the prod :3100 server to force a respawn triggered a MULTI-SPAWN RACE (the running supervisor + PT3M trigger both respawned → two instances raced for :3100 → loser ran SVI headless without binding). Clean recovery: kill ALL `dist/index.js` node procs, confirm port free, then `Start-ScheduledTask "PRISM MCP Server"` for ONE clean supervised boot. Don't hand-kill into the supervisor; let one supervisor own the respawn.

Co-authored: a rate-limited subagent did the bootstrap/bind split + init-hoist (40%), golf reviewed + completed the guard / buildRequestServer / handler / call-sites / §4b / async + the production cutover.

(Historical follow-up note, now resolved:) was queued 2026-05-25 in slot-task-queues.json as a 200+ LOC refactor with the companion HTTP-tuning lines.

See [[feedback_verify_actual_contract_not_proxy]] — the spec was right but the implementation needed one more iter to verify against the SDK's actual contract before claiming "fix shipped". The `Already connected` error is the SDK's actual contract; the spec assumed the wrong contract.
