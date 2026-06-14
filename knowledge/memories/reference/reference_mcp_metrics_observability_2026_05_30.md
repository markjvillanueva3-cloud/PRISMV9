---
name: reference_mcp_metrics_observability_2026_05_30
description: "OBSERVABILITY-MS0/U-METRICS01 — the MCP server /metrics endpoint now emits per-tool call counts, p50/p95/p99 latency, error rates, live+peak concurrency, and rolling RSS. Query GET /metrics?format=json. Makes the chat-disconnect contention class measurable."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.205Z
aliases: reference_mcp_metrics_observability_2026_05_30
---


2026-05-30 (slot:bravo, operator "add/improve MCP functionality" → chose observability): added **per-tool telemetry** to the live MCP server. Commit `92dedee2d5` on main (`[MAIN] [OBSERVABILITY-MS0]/U-METRICS01`).

**What it does:** the existing `GET /metrics` was static-only (heap/rss/registry sizes). Now a `MetricsCollector` singleton (`mcp-server/src/observability/metrics-collector.ts`) instruments the single `/mcp` POST choke point in `index.ts` and tracks per-tool: call count, error count, p50/p95/p99 latency (bounded 256-sample reservoir), plus global live + peak in-flight concurrency, per-JSON-RPC-method counts, and a rolling RSS ring (opportunistic 30s sampling, no timer). Bounded memory + never-throws (instrumentation can't break dispatch).

**How to query (live on :3100):**
- `GET http://127.0.0.1:3100/metrics?format=json` → rich snapshot: `{totalCalls, inflight, peakInflight, methods{}, rss{last,max}, tools[{tool,count,errors,errorRate,p50,p95,p99,lastMs}]}` (tools sorted by count desc).
- `GET http://127.0.0.1:3100/metrics` → Prometheus text; the static gauges PLUS `prism_tool_calls_total{tool=...}`, `prism_tool_errors_total{tool=...}`, `prism_tool_duration_ms{tool=...,quantile=...}`, `prism_requests_total{method=...}`, `prism_inflight`, `prism_inflight_peak`, `prism_rss_max_bytes`.

**Why:** the chat-"disconnect" episodes earlier this session ([[reference_slot_drift_worktree_transcript_2026_05_30]]) were invisible until processes were hand-counted. This makes the contention class measurable — which tool/dispatcher is hot or slow, peak concurrency, RSS pressure. Verified live: after the :3100 restart, `/metrics?format=json` immediately showed real fleet traffic (prism_guard p95=23ms, prism_memory) with concurrency.

**v2 — U-METRICS02 (commit `815649d032`):** (a) **`GET /metrics/view`** — a self-contained auto-refreshing (3s) HTML dashboard rendering `/metrics?format=json` (tools table sorted by count + summary + methods + RSS). XSS-safe by construction: the page JS builds the DOM with `createElement`+`textContent`, NOT `innerHTML` (the `security_reminder_hook` PreToolUse hook hard-blocks innerHTML — good policy). HTML lives in `metricsViewHtml()` in the collector. (b) **JSON-RPC error capture** — the `/mcp` POST handler now taps the response body (tools/call only, bounded 128KB, fail-safe — always calls the original write/end, never throws) to detect JSON-RPC protocol errors AND MCP `result.isError` (both return HTTP 200), so error rates are real, not just HTTP-level. The res.write/end monkey-patch was verified TRANSPARENT live: a 467KB tools/list response round-trips intact.

**Deploy mechanics (IMPORTANT):** the live server is built with `npm run build:fast` (esbuild, no typecheck) then `:3100` restarted by killing the server+supervisor and re-spawning `scripts/mcp-server-supervisor.mjs` (bridges self-heal within their 60s budget). The FULL `npm run build` (tsc) is currently BLOCKED by **13 pre-existing type errors** in `shopDispatcher.ts`(12, mostly TS2352 Record→typed casts + TS2576 static-method access) and `sessionDispatcher.ts`(1, TS2783 duplicate 'success' key) — NOT from this work; surfaced to the fleet, not fixed (R7). esbuild ignores type errors, so build:fast still ships a working bundle. Tests: 8 vitest cases (`metrics-collector.test.ts`). Related: [[reference_mcp_fleet_scale_fix_2026_05_29]], [[reference_mcp_orphan_server_leak_2026_05_29]].
