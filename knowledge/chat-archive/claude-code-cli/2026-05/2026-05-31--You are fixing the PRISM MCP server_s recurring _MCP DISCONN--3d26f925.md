---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "You are fixing the PRISM MCP server's recurring \"MCP DISCONNECTED\" failures at t"
date: "2026-05-31"
first_ts: "2026-05-31T22:33:00.294Z"
last_ts: "2026-05-31T22:43:46.444Z"
cwd: "H:\\prism-slot-golf"
messages: 40
user_msgs: 14
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a928b5d924e034df8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# You are fixing the PRISM MCP server's recurring "MCP DISCONNECTED" failures at t

> **claude-code-cli** | 2026-05-31 | 40 msgs (14 user / 26 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a928b5d924e034df8.jsonl`

## Transcript

### User | 2026-05-31T22:33:00.294Z

You are fixing the PRISM MCP server's recurring "MCP DISCONNECTED" failures at the ROOT CAUSE. This is critical fleet infrastructure — 26 concurrent Claude chats depend on the shared server at 127.0.0.1:3100. The root cause is ALREADY CONFIRMED from live evidence (below) — do NOT re-investigate it. Implement the fix, build, and validate IN ISOLATION on a test port. Do NOT restart or touch the production server on port 3100 — the orchestrator does the production cutover after reviewing your work.

## CONFIRMED ROOT CAUSE (from live supervisor.log — do not re-derive)
File: `H:/prism/mcp-server/src/index.ts` (the MCP server core; the production server runs the compiled `H:/prism/mcp-server/dist/index.js`).

The HTTP `app.post("/mcp")` handler (~lines 1056-1122) creates a per-request `StreamableHTTPServerTransport` (stateless mode: `sessionIdGenerator: undefined`) and calls `await server.connect(transport)` on the MODULE-LEVEL SHARED `McpServer` (`const server = new McpServer({...})` at line ~404). The MCP SDK enforces ONE transport per `Server` instance. When two /mcp requests OVERLAP (constant with multiple active chats), the 2nd request's `server.connect()` throws:
`Error: Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.`
(SDK source: node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.js:217). The throw happens BEFORE `transport.handleRequest`, so the request gets NO response → client times out → "MCP DISCONNECTED". The `unhandledRejection` handler (line ~1240) only logs (process survives), but the log floods and the watchdog restarts under churn. (Memory leak is NOT the issue — heap is stable ~638MB.)

## THE FIX — official MCP SDK stateless pattern: a FRESH McpServer per request
The SDK's documented stateless pattern builds a NEW McpServer AND a new transport PER REQUEST. PRISM did half (fresh transport) but kept the shared server — that is the bug.

### Structure y
... [+8387 chars truncated]

### Assistant | 2026-05-31T22:33:17.671Z

I'll start by reading the relevant ranges of `index.ts` in full, and checking git status to ensure no peer has uncommitted changes I might clobber.

### Assistant | 2026-05-31T22:33:19.038Z

[tool_use: Bash]

### Assistant | 2026-05-31T22:33:19.473Z

[tool_use: Read]

### User | 2026-05-31T22:34:27.887Z

[tool_result] ok---BRANCH---
cad-fusion-live-ms0

### User | 2026-05-31T22:34:56.373Z

[tool_result] 395	    safety_class: "LOW",
396	    description: "Unified output engine — standardized result formatting, unit labeling, and safety annotation for all engine outputs.",
397	  },
398	};
399	
400	// ============================================================================
401	// SERVER INITIALIZATION
402	// ============================================================================
403	
404	con
... [+5426 chars truncated]

### Assistant | 2026-05-31T22:34:58.773Z

Good — no peer uncommitted changes (working tree clean for index.ts). Now let me read the full `registerTools()` body and the call sites/handler.

### Assistant | 2026-05-31T22:34:59.487Z

[tool_use: Read]

### User | 2026-05-31T22:35:36.725Z

[tool_result] 506	  const originalTool: (...a: any[]) => any = server.tool.bind(server);
507	  const proxiedTool = function(...args: any[]) {
508	    const toolName = args[0];
509	    
510	    if (typeof toolName === 'string' && toolName.startsWith('prism_')) {
511	      const handlerIndex = args.length - 1;
512	      const originalHandler = args[handlerIndex];
513	      
514	      if (typeof originalHandler ==
... [+16435 chars truncated]

### Assistant | 2026-05-31T22:35:41.853Z

Now I have a clear picture of `registerTools()`. Let me carefully analyze the boundaries:

- **423-491**: GLOBAL bootstrap (registries, XProc, DB, domain hooks) → `bootstrapServices()`
- **493-819**: per-server binding (proxy + dispatcher registration + MCP primitives + synergies + SVI + bridge handler + restore tool + module health check) — BUT I need to check which of these are per-process side effects.

Let me look closely. Lines 778-793 (`startAutoWatch`, `setDispatchHandler`) reference the shared `server` and have process-level side effects. Let me read the call sites and handler now.

### Assistant | 2026-05-31T22:35:42.520Z

[tool_use: Read]

### User | 2026-05-31T22:36:06.237Z

[tool_result] 854	async function runStdio(): Promise<void> {
855	  // H1-MS4: Generate unique session ID for MemGraph tracking
856	  process.env.SESSION_ID = `S-${Date.now()}`;
857	  log.info(`Starting ${SERVER_NAME} v${SERVER_VERSION} (stdio mode) [${process.env.SESSION_ID}]`);
858	  log.info(SERVER_DESCRIPTION);
859	  
860	  await registerTools();
861	  
862	  const transport = new StdioServerTransport();
863
... [+4912 chars truncated]

### Assistant | 2026-05-31T22:36:08.471Z

Now the /mcp handler region and the REST callTool helper.

### Assistant | 2026-05-31T22:36:09.099Z

[tool_use: Read]

### User | 2026-05-31T22:36:27.201Z

[tool_result] 964	      registryManager.machines.size +
965	      registryManager.tools.size +
966	      registryManager.alarms.size +
967	      registryManager.formulas.size;
968	    const reasons: string[] = [];
969	    if (totalEntries === 0) reasons.push("registries empty");
970	    if (heapUsedMB >= 3500) reasons.push(`heap pressure (${heapUsedMB}MB)`);
971	    let canaryOk = true;
972	    try {
973	      
... [+9664 chars truncated]

### Assistant | 2026-05-31T22:36:29.584Z

Now let me read the rest of `runHTTP` (the `app.listen` callback and what follows) to see the full listen block and whether keep-alive tuning already exists.

### Assistant | 2026-05-31T22:36:30.334Z

[tool_use: Read]

### User | 2026-05-31T22:36:45.684Z

[tool_result] 1192	  const httpServer = app.listen(port, host, () => {
1193	    log.info(`MCP server running on http://${host}:${port}/mcp`);
1194	  });
1195	
1196	  // RT-MS0: Attach WebSocket server alongside HTTP
1197	  const { webSocketEngine } = await import("./engines/WebSocketEngine.js");
1198	  webSocketEngine.attach(httpServer);
1199	  log.info(`WebSocket server running on ws://${host}:${port}/ws`);
12
... [+3053 chars truncated]

### Assistant | 2026-05-31T22:37:02.558Z

I now have the complete picture. Let me carefully analyze the per-server-binding boundary problem before refactoring.

The critical analysis of lines 493-844, classifying each block:

**Pure per-server binding (safe to repeat per request):**
- 501-536: proxy setup wrapping `server.tool` 
- 538-757: all `registerXxxDispatcher(server)` calls
- 633-641: `telemetryEngine?.init()`, `pfpEngine?.init()`, `memoryGraphEngine?.init()`, `certificateEngine?.init()` — these are **process-level engine inits**, NOT per-server. They are interspersed in the dispatcher registration. Calling them repeatedly per request would re-init engines on every request — wasteful and potentially harmful. These must move to once-only bootstrap.
- 762-770: `registerResources/Prompts/TaskTools(server)` + `initMcpLogging` — per-server binding (registers onto server). `initMcpLogging` touches `(server as any).server` — per-server.
- 796: restore `server.tool` — needed per binding (the proxy mutates `server.tool`).
- 759, 797-799, 801-819: log statements + module health check — the module health check (`require(mod.path)`) is a once-only side effect (verifying lazy loads); harmless if repeated but wasteful.

**Once-only process side effects that are INSIDE the binding region:**
- 633-641: engine `.init()` calls (process-level)
- 772-776: `initSynergies()` — process-level cross-feature wiring
- 778-783: `systemVariabilityIndexEngine.startAutoWatch()` — process-level auto-watch (starts a timer/owner)
- 785-793: `protocolBridgeEngine.setDispatchHandler(...)` — references the shared `server`. This MUST bind to the **shared** server (REST/bridge use it), not a per-request server. Once-only.
- 801-819: module health check (once-only verification)
- 821-844: risk-tier log, consolidation stats, SYSTEM_STARTUP event — once-only.

So the cleanest decomposition:
- `bootstrapServices()` = 423-491 **PLUS** the process-level engine inits and synergies/SVI/bridge/health that don't depend on a per-request server.
- `b
... [+1087 chars truncated]

### Assistant | 2026-05-31T22:37:03.892Z

[tool_use: Grep]

### User | 2026-05-31T22:37:41.555Z

[tool_result] 20:import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
51:import { metrics, metricsViewHtml } from "./observability/metrics-collector.js";
1039:    res.send(metricsViewHtml());
1066:    metrics.incInflight();
1111:    res.on("close", () => metrics.decInflight());
1113:    const transport = new StreamableHTTPServerTransport({

### Assistant | 2026-05-31T22:37:44.537Z

Let me check the `decInflight` signature in the metrics collector to confirm it's safe to call in the error path, and confirm `metrics.decInflight` exists as a method.

### Assistant | 2026-05-31T22:37:44.935Z

[tool_use: Grep]

### User | 2026-05-31T22:37:59.698Z

[tool_result] 59:  incInflight(): void {
60-    this.inflight++;
61-    if (this.inflight > this.peakInflight) this.peakInflight = this.inflight;
62-  }
63-
64:  decInflight(): void {
65-    if (this.inflight > 0) this.inflight--;
66-  }
67-
68-  recordMethod(method: string): void {

### Assistant | 2026-05-31T22:38:09.904Z

`decInflight` exists and is idempotent-safe (guards `inflight > 0`). 

Now, an important consideration regarding the existing `res.on("close", () => metrics.decInflight())` at line 1111 and the error-path `metrics.decInflight?.()` in the spec. If I call `decInflight()` in the catch AND the `res.on("close")` also fires `decInflight()` when the connection closes, that's a double-decrement. But `decInflight` guards against going below 0 — however a double-decrement could still under-count if there are other concurrent inflight requests. 

The spec explicitly says: "Keep whatever the existing handler already wires for res.on("close") inflight decrement — do not double-register the inflight decrement; merge cleanly." The cleanest merge: in the error path, do NOT manually call `decInflight` — instead rely on `res.on("close")` which always fires when the response ends (including after `res.status(500).json(...)`). When we send a 500 response, the socket closes → `res.on("close")` fires → `decInflight` runs exactly once. So I should NOT add the manual `decInflight` in the catch to avoid double-counting.

Let me reconsider: the `res.on("close", () => metrics.decInflight())` at 1111 is registered for EVERY request including the error path. So if `buildRequestServer()` throws and I send a 500, `res.on("close")` will fire and decrement. Adding `metrics.decInflight?.()` in the catch would double-decrement. **I'll omit the manual decInflight in the catch** and document this deviation — it's the cleaner merge the spec asks for.

Now let me make the edits. First, add the module-level `_bootstrapped` flag right after the `server` declaration.

### Assistant | 2026-05-31T22:38:15.964Z

[tool_use: Edit]

### User | 2026-05-31T22:38:45.673Z

[tool_result] The file H:/prism/mcp-server/src/index.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-31T22:38:50.838Z

The completeness warning is a false positive — my comment block is documentation, not commented-out code. Now let me refactor `registerTools()` into the three functions. First, I'll convert the `registerTools` declaration and the bootstrap header into `bootstrapServices()`, moving the process-level engine inits into it.

Let me restructure. I'll change the function signature at line 422 and split. First, convert lines 422-491 region into `bootstrapServices()` with the idempotency guard.

### Assistant | 2026-05-31T22:38:54.909Z

[tool_use: Edit]

### User | 2026-05-31T22:39:49.084Z

[tool_result] The file H:/prism/mcp-server/src/index.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-31T22:39:53.400Z

Now I need to close `bootstrapServices()` at line 491 (after domain hooks) and move the process-level engine inits into it, then start `bindDispatchers(server)`. Let me edit the boundary at line 491-501 where the domain hooks end and the proxy begins. I'll insert the engine inits (currently at 633-641) into bootstrap, close bootstrap, and open `bindDispatchers`.

### Assistant | 2026-05-31T22:40:07.418Z

[tool_use: Edit]

### User | 2026-05-31T22:42:35.007Z

[tool_result] The file H:/prism/mcp-server/src/index.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-31T22:42:38.277Z

These warnings are about pre-existing `any` usage in the proxy code (I preserved it as-is per "match surrounding code style"). Now I need to remove the now-duplicated engine inits from their old location (lines ~633-641 within the dispatcher region) since I moved them to bootstrap. Let me view that region in its current state.

### Assistant | 2026-05-31T22:42:38.908Z

[tool_use: Read]

### User | 2026-05-31T22:43:01.477Z

[tool_result] 648	  // QUOTING-PIPELINE-MS0 / U-QP08 — camera-intake + insert-catalog + service-tag + parts BOM + vendor pricing + live chat
649	  registerQuotingDispatcher(server);
650	  
651	  // Guard: Reasoning + Enforcement + AutoHook (8 actions)
652	  registerGuardDispatcher(server);
653	  
654	  // ATCS: Autonomous Task Completion (10 actions)
655	  registerAtcsDispatcher(server);
656	  
657	  // Autonom
... [+1074 chars truncated]

### Assistant | 2026-05-31T22:43:10.532Z

Now I'll remove the duplicated engine inits from this region (they're now in `bootstrapServices`), keeping the dispatcher registrations.

### Assistant | 2026-05-31T22:43:15.277Z

[tool_use: Edit]

### User | 2026-05-31T22:43:45.418Z

[tool_result] The file H:/prism/mcp-server/src/index.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-31T22:43:46.444Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
