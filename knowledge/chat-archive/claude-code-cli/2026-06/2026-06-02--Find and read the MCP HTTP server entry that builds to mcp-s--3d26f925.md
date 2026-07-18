---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Find and read the MCP HTTP server entry that builds to mcp-server/dist/index.js "
date: "2026-06-02"
first_ts: "2026-06-02T14:07:13.482Z"
last_ts: "2026-06-02T14:11:54.798Z"
cwd: "H:\\prism-slot-golf"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-a8526b81be2f9e117.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Find and read the MCP HTTP server entry that builds to mcp-server/dist/index.js 

> **claude-code-cli** | 2026-06-02 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-a8526b81be2f9e117.jsonl`

## Transcript

### User | 2026-06-02T14:07:13.482Z

Find and read the MCP HTTP server entry that builds to mcp-server/dist/index.js (likely H:/prism/mcp-server/src/index.ts; grep for '3100', 'createServer', 'listen(', 'EADDRINUSE'). How does it bind :3100? What happens on EADDRINUSE — does it exit cleanly or hang (the bug: it loaded all engines ~700MB then hung without the port)? How are concurrent HTTP requests + the per-request McpServer handled? Any connection/concurrency limits, keep-alive, or graceful-shutdown (SIGTERM drain) handling relevant to 26 chats x workflow-agents hammering it?

Return a CONCISE plain-text report (<=30 lines, NO JSON). Cover: (a) current behavior in 3-5 bullets, (b) specific gaps under high concurrency / restart-storms — focus on the failure we just hit: 11 'node dist/index.js' instances piled up racing to bind :3100, hung at ~700MB each instead of exiting, fleet-wide connect failures, (c) 2-3 concrete hardening changes as file:function -> change. Be exact about file paths, function names, and line areas. Do NOT paste large code blocks; cite line ranges.

### Assistant | 2026-06-02T14:07:47.447Z

I'll find and read the MCP HTTP server entry point.

### Assistant | 2026-06-02T14:07:49.060Z

[tool_use: Grep]

### Assistant | 2026-06-02T14:07:49.063Z

[tool_use: Glob]

### User | 2026-06-02T14:08:41.188Z

[tool_result] 986:  // exact BUG-1 / BUG-2 class from reference_mcp_server_3100_crash_fix_2026_05_22)
1265:  const httpServer = app.listen(port, host, () => {

### User | 2026-06-02T14:08:45.638Z

[tool_result] mcp-server\src\index.ts

### Assistant | 2026-06-02T14:08:48.995Z

Found the entry point. Let me read the key areas: the listen/EADDRINUSE handling and the per-request server logic.

### Assistant | 2026-06-02T14:08:50.039Z

[tool_use: Read]

### Assistant | 2026-06-02T14:08:50.484Z

[tool_use: Read]

### User | 2026-06-02T14:09:23.415Z

[tool_result] 960	    // Registry health
961	    const registryStats = {
962	      materials: registryManager.materials.size,
963	      machines: registryManager.machines.size,
964	      tools: registryManager.tools.size,
965	      alarms: registryManager.alarms.size,
966	      formulas: registryManager.formulas.size,
967	    };
968	    const totalEntries = Object.values(registryStats).reduce((a, b) => a + b, 0
... [+5400 chars truncated]

### User | 2026-06-02T14:09:24.465Z

[tool_result] 1240	  // Serve the built web app directly from the backend when available.
1241	  const currentDir = import.meta.dirname;
1242	  const frontendDistDir = path.resolve(currentDir, "../dist/web");
1243	  const frontendIndexPath = path.join(frontendDistDir, "index.html");
1244	  const hasBuiltFrontend = fs.existsSync(frontendIndexPath);
1245	
1246	  if (hasBuiltFrontend) {
1247	    app.use(
1248	    
... [+4622 chars truncated]

### Assistant | 2026-06-02T14:09:27.354Z

Now let me look at the `/mcp` request handler and the per-request McpServer logic, plus confirm there's NO `error` listener on the httpServer (the EADDRINUSE bug).

### Assistant | 2026-06-02T14:09:29.704Z

[tool_use: Grep]

### Assistant | 2026-06-02T14:09:30.366Z

[tool_use: Read]

### User | 2026-06-02T14:09:57.097Z

[tool_result] 20:import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
411:// The HTTP /mcp handler used to call server.connect(transport) on this MODULE-LEVEL
415:// heavy global I/O ONCE; bindDispatchers() is side-effect-free tool registration that runs
521: * on fresh per-request servers built by buildRequestServer(). The temporary
525:async function bindDispatch
... [+882 chars truncated]

### User | 2026-06-02T14:09:58.978Z

[tool_result] 1100	    if (!authConfig.enabled) {
1101	      delete discovery.authentication;
1102	    }
1103	
1104	    res.json(discovery);
1105	  });
1106	
1107	  // MCP Streamable HTTP — POST (JSON-RPC requests)
1108	  app.post("/mcp", async (req, res) => {
1109	    // OBSERVABILITY-MS0 (slot:bravo 2026-05-30): instrument every MCP request at the
1110	    // single choke point — per-tool count/latency + live
... [+5795 chars truncated]

### Assistant | 2026-06-02T14:10:03.698Z

The per-request handler is well-built. Now the critical question: is there an `error` listener on the httpServer for EADDRINUSE? The grep found no `httpServer.on` or `.on('error'`. Let me confirm there's no listen-error handling and check how the process is launched/guarded.

### Assistant | 2026-06-02T14:10:04.650Z

[tool_use: Read]

### Assistant | 2026-06-02T14:10:06.122Z

[tool_use: Grep]

### User | 2026-06-02T14:10:48.667Z

[tool_result] 400	// ============================================================================
401	// SERVER INITIALIZATION
402	// ============================================================================
403	
404	const server = new McpServer({
405	  name: SERVER_NAME,
406	  version: SERVER_VERSION
407	});
408	
409	// MCP-CONCURRENCY-FIX (2026-05-31): the official MCP SDK enforces ONE transport per
410	//
... [+1312 chars truncated]

### User | 2026-06-02T14:10:49.841Z

[tool_result] Found 132 files
H:\prism\mcp-server\src\engines\quoting\MEMORY.md
H:\prism\mcp-server\src\__tests__\businessDispatchRoute.test.ts
H:\prism\mcp-server\src\index.ts
H:\prism\mcp-server\src\__tests__\MemoryGraphEngine.test.ts
H:\prism\mcp-server\src\engines\MemoryGraphEngine.ts
H:\prism\mcp-server\src\engines\EventBusEngine.ts
H:\prism\mcp-server\src\__tests__\hotel-portal-live-integration.test.ts
H:
... [+7748 chars truncated]

### Assistant | 2026-06-02T14:10:55.880Z

I have everything needed. The `index.ts` `app.listen()` at line 1265 has NO `error` listener — confirming the EADDRINUSE hang bug. Let me verify how the process is spawned (whether a wrapper guards the port) by checking the launcher/supervisor.

### Assistant | 2026-06-02T14:10:57.605Z

[tool_use: Grep]

### User | 2026-06-02T14:11:31.036Z

[tool_result] Found 20 files limit: 20
H:\prism\mcp-server\data\state\settings-baseline-2026-06-02T14-07-42-006Z.json
H:\prism\mcp-server\data\state\settings-baseline-2026-06-02T14-04-43-840Z.json
H:\prism\mcp-server\data\state\settings-baseline-2026-06-02T13-36-16-481Z.json
H:\prism\mcp-server\data\state\settings-baseline-2026-06-02T13-33-02-925Z.json
H:\prism\mcp-server\data\state\settings-baseline-2026-06-02
... [+922 chars truncated]

### Assistant | 2026-06-02T14:11:54.798Z

I have confirmed the full picture. The bootstrap/listen ordering is clear from the code I've read: `runHTTP()` runs all the heavy engine bootstrap (loading ~700MB of engines into memory) BEFORE `app.listen()` at line 1265, and that listen call has no `error` handler. That is the bug. I have enough to write the report.

MCP HTTP server entry: H:/prism/mcp-server/src/index.ts (builds to dist/index.js; TRANSPORT=http -> runHTTP()).

(a) CURRENT BEHAVIOR
- Bind: runHTTP() does ALL heavy engine bootstrap first, then `app.listen(port, host, cb)` at L1265 (port=PORT||3000; real launch sets PORT=3100; host=127.0.0.1). Success only logs in the callback.
- Per-request isolation is correct (MCP-CONCURRENCY-FIX, L1170-1194): each POST /mcp builds a FRESH McpServer via buildRequestServer() (L891) + a new StreamableHTTPServerTransport, connects, handleRequest; on res 'close' both transport and reqServer are closed (L1188). bootstrapServices runs once; bindDispatchers per-server; postBindOnce guarded by _postBindDone. This already fixed the "Already connected to a transport" disconnect.
- Concurrency tuning present (L1269-1275): keepAliveTimeout=65s, headersTimeout=70s, requestTimeout=0 (no mid-tool-call sever), maxConnections=200.
- Shutdown: SIGTERM handler at L1288 (bridge stop + ws shutdown + httpServer.close, no drain wait); a SECOND SIGTERM/SIGINT/beforeExit gracefulShutdown at L1350-1352 persists state then process.exit. /health (L971, heap<3500MB gate) + /ready (L1011, canary import) probes exist.

(b) GAPS UNDER HIGH CONCURRENCY / RESTART-STORMS
- THE BUG: `app.listen()` (L1265) has NO `httpServer.on('error', ...)` listener. On EADDRINUSE, Node emits an 'error' event; with no handler it is normally thrown — but here all engines are already resident (~700MB) and the event loop has live timers/WS/intervals, so the process does NOT exit cleanly: it stays alive holding 700MB with an unbound port. 11 `node dist/index.js` instances racing to bind :3100 => 10 zombies at 700MB ea
... [+1538 chars truncated]
