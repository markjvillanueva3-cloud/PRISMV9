---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Design MCP server hardening for UNLIMITED parallel-agent (ultracode fleet) load."
date: "2026-06-09"
first_ts: "2026-06-09T16:18:14.501Z"
last_ts: "2026-06-09T16:22:03.129Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-a623da5510ab1f528.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Design MCP server hardening for UNLIMITED parallel-agent (ultracode fleet) load.

> **claude-code-cli** | 2026-06-09 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-a623da5510ab1f528.jsonl`

## Transcript

### User | 2026-06-09T16:18:14.501Z

Design MCP server hardening for UNLIMITED parallel-agent (ultracode fleet) load. Current-code maps:

[REQUEST LIFECYCLE]
null

[WATCHDOG]
I've read the full file. Here is the complete map and the exact inflight-aware gating spec.

## (1) Restart-decision code location

The preemptive RSS-pressure restart decision lives in **`H:/prism/scripts/mcp-server-watchdog.mjs:255`** — the single `if` guard inside `main()`'s healthy branch:

```js
// line 252-271
const rssMB = probe.rssMB;
const sinceLastPreempt = Date.now() - (state.lastPreemptiveRestartAt || 0);
const uptimeOk = (probe.uptimeSec ?? 0) >= 60;
if (RSS_THRESHOLD_MB > 0 && typeof rssMB === "number" && rssMB >= RSS_THRESHOLD_MB && sinceLastPreempt >= PREEMPT_COOLDOWN_MS && uptimeOk) {
  log("warn", "Memory pressure — preemptive restart", { ... });
  const preemptState = { ...state, consecutiveFails: FAIL_THRESHOLD, lastFailReason: `rss_pressure_${rssMB}MB` };
  escalate(preemptState);                       // line 267 — the kill+respawn
  state.lastPreemptiveRestartAt = Date.now();
  state.consecutiveFails = 0;
}
```

`escalate()` (line 190) is the destructive path: `findListenerPid(:3100)` → `taskkill /F /PID` → respawn supervisor. A restart == fleet disconnect, so this is exactly the burst-killer to gate.

Note this is the ONLY decision to change. The **wedge** escalation (line 286-340) must NOT be gated by inflight — a wedged server reporting high inflight is the failure mode, and the existing boot-guard already protects that path. Inflight gating applies to the RSS-pressure path only, because that is the path that fires while the server is healthy and actively serving.

## (2) The exact gating change

Threshold values (env-overridable, following the file's existing `parseInt` convention; place near line 73-74):

```js
// INFLIGHT-AWARE PREEMPT (defer RSS restart mid-burst):
// Defer the orderly RSS recycle while the server is actively serving a burst of
// parallel-agent calls, so a restart never severs in-fli
... [+15221 chars truncated]

### Assistant | 2026-06-09T16:18:20.877Z

I'll produce the complete blueprint. Let me first verify the exact current code at the three insertion sites, since the maps reference specific line numbers I need to confirm before giving paste-ready code.

### Assistant | 2026-06-09T16:18:22.658Z

[tool_use: Read]

### Assistant | 2026-06-09T16:18:22.662Z

[tool_use: Read]

### User | 2026-06-09T16:18:23.782Z

[tool_result] 1290	  
1291	  const port = parseInt(process.env.PORT || "3000", 10);
1292	  // R6: Bind to localhost by default; set PRISM_BIND_HOST=0.0.0.0 for Docker/network exposure
1293	  const host = process.env.PRISM_BIND_HOST || '127.0.0.1';
1294	  const httpServer = app.listen(port, host, () => {
1295	    log.info(`MCP server running on http://${host}:${port}/mcp`);
1296	  });
1297	
1298	  // HARDEN (gol
... [+5311 chars truncated]

### User | 2026-06-09T16:18:24.772Z

[tool_result] 60	const DRY_RUN = process.env.PRISM_MCP_WATCHDOG_DRY_RUN === "1" || process.argv.includes("--dry-run");
61	// MCP-OOM-PERMANENT (slot:kilo 2026-05-23): memory-pressure preemptive restart.
62	// Watchdog reads /health.memory.rss_mb every probe cycle. If RSS exceeds
63	// PRISM_MCP_WATCHDOG_RSS_THRESHOLD_MB (default 3072 = 3GB, well below the
64	// 4GB heap cap shipped in MCP-OOM-FIX), trigger an O
... [+1380 chars truncated]

### Assistant | 2026-06-09T16:18:34.181Z

Now let me read the request lifecycle in index.ts (where `/mcp` is handled and `buildRequestServer()` is called) and the `/health` route handler, plus the watchdog probe + decision sections.

### Assistant | 2026-06-09T16:18:35.563Z

[tool_use: Grep]

### User | 2026-06-09T16:18:38.602Z

[tool_result] 523: * on fresh per-request servers built by buildRequestServer(). The temporary
810:  // built by buildRequestServer(). Guarded by _postBindDone (the first call = shared server).
896:async function buildRequestServer(): Promise<McpServer> {
982:  app.get("/health", async (_, res) => {
1004:      uptime_seconds: Math.round(uptime),
1005:      memory: { heap_used_mb: heapUsedMB, heap_total_mb: heap
... [+545 chars truncated]

### Assistant | 2026-06-09T16:18:44.553Z

Let me read the exact regions: the `/health` handler, the `/mcp` POST handler around `buildRequestServer()`, and the watchdog probe + decision sections.

### Assistant | 2026-06-09T16:18:45.503Z

[tool_use: Read]

### Assistant | 2026-06-09T16:18:46.027Z

[tool_use: Read]

### User | 2026-06-09T16:18:46.985Z

[tool_result] 975	  // consume the body stream first and break HMAC verification).
976	  app.use("/api/intake", createIntakeRouter());
977	
978	  app.use(express.json());
979	  registerOAuthHttpRoutes(app);
980	  
981	  // R6: Enhanced health check endpoint with registry stats
982	  app.get("/health", async (_, res) => {
983	    const memUsage = process.memoryUsage();
984	    const uptime = process.uptime();
98
... [+1405 chars truncated]

### User | 2026-06-09T16:18:48.173Z

[tool_result] 1137	  app.post("/mcp", async (req, res) => {
1138	    // OBSERVABILITY-MS0 (slot:bravo 2026-05-30): instrument every MCP request at the
1139	    // single choke point — per-tool count/latency + live/peak concurrency. Wrapped so
1140	    // a telemetry bug can never alter dispatch behavior (collector never throws).
1141	    const _m0 = Date.now();
1142	    const _method = (req.body && typeof req.b
... [+5550 chars truncated]

### Assistant | 2026-06-09T16:18:55.571Z

Excellent — critical discovery. There is **already a `metrics` collector** (OBSERVABILITY-MS0, slot:bravo 2026-05-30) tracking inflight via `metrics.incInflight()` / `metrics.decInflight()` at the exact `/mcp` choke point. Let me read that metrics module to get the exact API (peak tracking, getters) so the limiter and `/health` changes are precise and reuse what exists rather than duplicating.

### Assistant | 2026-06-09T16:18:56.952Z

[tool_use: Grep]

### User | 2026-06-09T16:19:02.636Z

[tool_result] mcp-server\src\observability\metrics-collector.ts:41:  inflight: number;
mcp-server\src\observability\metrics-collector.ts:42:  peakInflight: number;
mcp-server\src\observability\metrics-collector.ts:48:export class MetricsCollector {
mcp-server\src\observability\metrics-collector.ts:54:  inflight = 0;
mcp-server\src\observability\metrics-collector.ts:55:  peakInflight = 0;
mcp-server\src\observab
... [+5530 chars truncated]

### Assistant | 2026-06-09T16:19:07.701Z

The `metrics` collector already has `inflight` and `peakInflight` fields. Let me read the metrics-collector key regions to confirm the snapshot shape and getters, so the limiter and `/health` changes integrate cleanly.

### Assistant | 2026-06-09T16:19:08.268Z

[tool_use: Read]

### User | 2026-06-09T16:19:13.366Z

[tool_result] 30	  errorRate: number;
31	  p50: number;
32	  p95: number;
33	  p99: number;
34	  lastMs: number;
35	}
36	
37	export interface MetricsSnapshot {
38	  uptimeSec: number;
39	  totalCalls: number;
40	  totalErrors: number;
41	  inflight: number;
42	  peakInflight: number;
43	  methods: Record<string, number>;
44	  rss: { last: number; max: number; samples: number };
45	  tools: ToolSnapshot[];
46	}

... [+2133 chars truncated]

### Assistant | 2026-06-09T16:22:03.129Z

I now have everything verified. The key finding that shapes the whole blueprint: the `metrics` collector (`mcp-server/src/observability/metrics-collector.ts`) **already tracks `inflight` and `peakInflight`** at the exact `/mcp` choke point (`index.ts:1147` inc, `:1192` dec). So Change 2 is nearly free, and the limiter (Change 1) wraps the same choke point. The current `/health` handler (`:982-1010`) does NOT emit inflight — that's the gap the watchdog needs closed.

Here is the complete blueprint.

---

# MCP Server Hardening for Unlimited Parallel-Agent Load — 3-Change Blueprint

## Verified current state (the foundation)

| Fact | Location | Status |
|---|---|---|
| `metrics.incInflight()` / `decInflight()` already wired at `/mcp` choke point | `index.ts:1147`, `:1192` | EXISTS (OBSERVABILITY-MS0) |
| `metrics.inflight` / `metrics.peakInflight` fields + `snapshot()` emits both | `metrics-collector.ts:41,42,54,55,152,153` | EXISTS |
| `buildRequestServer()` call site (the work behind each accepted conn) | `index.ts:1205` | the throttle point |
| `/health` JSON — emits `memory.rss_mb`, `uptime_seconds`; does NOT emit inflight | `index.ts:1000-1009` | GAP for watchdog |
| `/metrics` (Prometheus) already exposes `prism_inflight` / `prism_inflight_peak` | `metrics-collector.ts:180,183` | EXISTS (but watchdog reads `/health`, not `/metrics`) |
| Watchdog RSS-preempt decision | `mcp-server-watchdog.mjs:255` (per CAPACITY map) | consumer to gate |
| `requestTimeout = 0` (no per-request ceiling) | `index.ts:1325` | secondary risk |

Logical build order (R13): **Change 2 (producer: expose inflight on `/health`) before Change 3 (consumer: watchdog reads it)**. Change 1 (limiter) is independent and can land first. I order them 2 -> 1 -> 3 below for clean dependency flow, but present them in the requested numbering.

---

## CHANGE 1 — Bounded concurrency LIMITER (semaphore + bounded queue) around `buildRequestServer()`

### Cap + queue sizing (explicit reasoning)

Memory is b
... [+33468 chars truncated]
