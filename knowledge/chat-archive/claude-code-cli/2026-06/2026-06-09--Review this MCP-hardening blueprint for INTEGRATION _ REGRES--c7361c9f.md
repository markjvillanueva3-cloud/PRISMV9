---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Review this MCP-hardening blueprint for INTEGRATION + REGRESSION risk: I now hav"
date: "2026-06-09"
first_ts: "2026-06-09T16:22:07.260Z"
last_ts: "2026-06-09T16:23:54.869Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-a8a8611a3c4c3049a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Review this MCP-hardening blueprint for INTEGRATION + REGRESSION risk: I now hav

> **claude-code-cli** | 2026-06-09 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-a8a8611a3c4c3049a.jsonl`

## Transcript

### User | 2026-06-09T16:22:07.260Z

Review this MCP-hardening blueprint for INTEGRATION + REGRESSION risk:

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

## CHANGE 1 — Bounded concurrency LIMITER (semaphore + bounded queue) around `buildRe
... [+34108 chars truncated]

### Assistant | 2026-06-09T16:22:31.927Z

I'll review this MCP-hardening blueprint for integration and regression risk. Let me first verify the actual current state of the files against the blueprint's claims, since the entire design rests on specific line numbers and existing behavior.

### Assistant | 2026-06-09T16:22:31.929Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:22:32.357Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:22:32.960Z

[tool_use: Bash]

### User | 2026-06-09T16:23:29.953Z

[tool_result]   // consume the body stream first and break HMAC verification).
  app.use("/api/intake", createIntakeRouter());

  app.use(express.json());
  registerOAuthHttpRoutes(app);
  
  // R6: Enhanced health check endpoint with registry stats
  app.get("/health", async (_, res) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const heapUsedMB = Math.round(memUsage
... [+1314 chars truncated]

### User | 2026-06-09T16:23:35.706Z

[tool_result]     // a telemetry bug can never alter dispatch behavior (collector never throws).
    const _m0 = Date.now();
    const _method = (req.body && typeof req.body.method === "string") ? req.body.method : "(none)";
    const _tool = (_method === "tools/call" && req.body && req.body.params && typeof req.body.params.name === "string")
      ? req.body.params.name
      : _method;
    metrics.recordMetho
... [+3141 chars truncated]

### User | 2026-06-09T16:23:35.873Z

[tool_result]     process.exit(1);
  });

  // §4b HTTP keep-alive tuning (MCP-CONCURRENCY-FIX): hold idle keep-alive connections
  // longer than typical client idle, no per-request timeout (long-running tool calls must
  // not be severed mid-flight), and raise the concurrent-connection cap for the 26-chat fleet.
  // maxConnections sizing (MCP-FLEET-CAPACITY-MS0, 2026-06-08): 26 slots × ~4 concurrent
  // /m
... [+1306 chars truncated]

### Assistant | 2026-06-09T16:23:54.869Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
