---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Produce the FINAL verified MCP-hardening implementation blueprint by merging the"
date: "2026-06-09"
first_ts: "2026-06-09T16:25:00.221Z"
last_ts: "2026-06-09T16:25:12.895Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-a52a8be650220da72.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Produce the FINAL verified MCP-hardening implementation blueprint by merging the

> **claude-code-cli** | 2026-06-09 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-a52a8be650220da72.jsonl`

## Transcript

### User | 2026-06-09T16:25:00.221Z

Produce the FINAL verified MCP-hardening implementation blueprint by merging the design with the 3 adversarial critiques; resolve EVERY NEEDS-FIX finding.

[DESIGN]
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

Logical build order (R13): **Change 2 (producer: expose inflight on `/health`) before Change 3 (consumer: watchdog reads it)**. Change 1 (limiter) is independent and can land first. I order them 2 -> 1 -> 3 below for clean dependency flow, but present them in the requested numbering
... [+50026 chars truncated]

### Assistant | 2026-06-09T16:25:12.895Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
