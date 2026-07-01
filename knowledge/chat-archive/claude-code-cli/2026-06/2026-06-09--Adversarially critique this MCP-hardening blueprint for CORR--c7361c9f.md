---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Adversarially critique this MCP-hardening blueprint for CORRECTNESS + concurrenc"
date: "2026-06-09"
first_ts: "2026-06-09T16:22:07.257Z"
last_ts: "2026-06-09T16:23:58.509Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-af2a8c7ee53a9d0dc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Adversarially critique this MCP-hardening blueprint for CORRECTNESS + concurrenc

> **claude-code-cli** | 2026-06-09 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-af2a8c7ee53a9d0dc.jsonl`

## Transcript

### User | 2026-06-09T16:22:07.257Z

Adversarially critique this MCP-hardening blueprint for CORRECTNESS + concurrency bugs:

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

## CHANGE 1 — Bounded concurrency LIMITER (semaphore + bounded queue
... [+34038 chars truncated]

### Assistant | 2026-06-09T16:22:39.434Z

I'll analyze this blueprint for correctness and concurrency bugs. Let me verify the key claims against the actual codebase before critiquing.

### Assistant | 2026-06-09T16:22:40.022Z

[tool_use: Bash]

### Assistant | 2026-06-09T16:22:40.541Z

[tool_use: Bash]

### User | 2026-06-09T16:23:37.025Z

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

### User | 2026-06-09T16:23:43.165Z

[tool_result]     // a telemetry bug can never alter dispatch behavior (collector never throws).
    const _m0 = Date.now();
    const _method = (req.body && typeof req.body.method === "string") ? req.body.method : "(none)";
    const _tool = (_method === "tools/call" && req.body && req.body.params && typeof req.body.params.name === "string")
      ? req.body.params.name
      : _method;
    metrics.recordMetho
... [+3141 chars truncated]

### Assistant | 2026-06-09T16:23:58.509Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
