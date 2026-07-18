---
title: Design spec — MCP-CAPACITY-MS0 (permanent fix for MCP drops at 30-chat scale)
type: architecture
node_id: ghost.spec.mcp-capacity-ms0
parent_layer: L8
kind: design-spec
spec_file: state/shared/specs/MCP-CAPACITY-MS0.md
status: ghost
deferred: true
generated_by: claude-9e91d800 (slot:golf /loop iter4)
last_verified: 2026-05-25
tags: [architecture, mcp, capacity, design-spec, deferred-ms, infrastructure, 30-chat-fleet]
related:
  - knowledge/wiki/architecture/layer-l8.md
  - knowledge/wiki/architecture/specs/spec-mcp-disconnect-root-cause-2026-05-25.md
---

# Design spec — `MCP-CAPACITY-MS0` (permanent fix for MCP drops at 30-chat scale)

> Design document tracked as a ghost node in the system-viz graph. Source: `state/shared/specs/MCP-CAPACITY-MS0.md`. **Deferred milestone** — design is signed off, implementation queued behind SLOT-RECOVERY-MS0 + the immediate U-MCP-FACTORY-REFACTOR fix.

| Field | Value |
|-------|-------|
| Node ID | `ghost.spec.mcp-capacity-ms0` |
| Spec file | `state/shared/specs/MCP-CAPACITY-MS0.md` |
| HTML twin | `state/shared/specs/MCP-CAPACITY-MS0.html` (render with `node H:/prism/scripts/md-to-html.mjs` if missing) |
| Companion spec | `state/shared/specs/MCP-DISCONNECT-ROOT-CAUSE-2026-05-25.md` (today-actionable 30-min fix; this spec is the 12-week structural plan) |
| Target scale | 30 concurrent chats × ~5 MCP actions/min × 8+ hours, p95 <500ms, drop rate <0.1% |
| Status | DEFERRED — Phase A (5-6 units) is the minimum-viable foundation; Phase B (3-4 units) is optional rewrite if Phase A insufficient |
| Created | 2026-05-25 (slot:golf, claude-9e91d800) per user directive: *"plan for the permanent fix for mcp servers always dropping, build for 30 chats at once"* |

## Motivation

Three prior partial fixes raised the OOM ceiling but did not address the root pattern — there is no admission control. Each fix gets the fleet a few more chats of headroom; load eventually catches up; new fix needed. The pattern is a structural one, not a leak.

- U-WATCHDOG-MEM-PROBE (2026-05-23): preemptive restart at RSS > 3GB. Catches OOM before kernel kills but ~3-5s of dropped requests per restart.
- U-SUPERVISOR-HEAP-BUMP (2026-05-23): `--max-old-space-size=8192` via spawn child. Raised ceiling but didn't eliminate.
- MCP-CONNECTIVITY hook (2026-05-22): UserPromptSubmit `:3100` probe + LOUD banner on disconnect. Surfaces drops; does not prevent them.

## Failure modes addressed at 30-chat scale

The spec enumerates 8 distinct failure modes with today-vs-30-chat frequency tables (§2 of the source spec):

1. OOM heap exhaustion — single Node process accumulating per-chat state
2. HTTP connection limit — `maxConnections=Infinity` default + Windows FD cap
3. Event-loop starvation — sync I/O in dispatchers blocking all clients
4. State-file contention — JSON lock-file + tmp+rename on hot path
5. Cascading restart storms — watchdog kicks under pressure, 30 chats reconnect simultaneously
6. Subprocess fork bombs — unbounded child process spawn from dispatcher actions
7. WAL-checkpoint stall — coordination.db SQLite under concurrent-writer pressure
8. No backpressure — clients keep sending; queue grows unbounded → OOM

## Approach — Phase A foundation (single-process MCP, state externalized, admission control)

The recommended approach (§3.1) is single-process MCP with admission control, not multi-process sharding. 5-6 units, ~12-16h focused work:

1. **Admission control** — return `503 Retry-After` immediately when in-flight count, queue depth, or RSS hit limits. Today actions just hang.
2. **Per-chat rate limiting** — token bucket per session_id (depends on SLOT-RECOVERY-MS0's stable per-slot session sidecar). Default: 30 actions / 30s / chat.
3. **Action latency budget** — hard `setTimeout` per action (10s default). Past budget = 504 + circuit-breaker increment.
4. **State externalization** — `chat-slots.json` / `slot-task-queues.json` / `slot-task-claims.json` move to the existing SQLite WAL connection pool (coordination.db from HOOK-SYNERGY-MS0/U-COORD08). No in-process JSON parse/stringify on hot paths.
5. **Async-only enforcement** — banlist `*Sync` calls on the dispatcher hot path, enforced by lint rule + CI gate.
6. **Watchdog graceful drain** — 2s drain phase before SIGTERM so in-flight requests finish.

## Phase B — capacity safeguards (optional rewrite if Phase A insufficient)

§3.2 — 3-4 units, only if Phase A doesn't meet the 30-chat bar:

7. HTTP/2 multiplexing (reduces socket usage 30+ → ~5)
8. Subprocess pool (size N, bounded; no fork bombs)
9. Connection draining on watchdog restart (clients reconnect over ~500ms vs abrupt SIGKILL)
10. Memory profiling guardrail (heap snapshot to `state/shared/dashboards/mcp-heap-snapshots/` at RSS > 2GB warn)

## Phase C — validation (3 units)

§3.3 — 3 units:

11. Load-test harness `scripts/mcp-load-test.mjs` (30 concurrent chats × N/min × T min, records p50/p95/p99/drops/restarts/peak RSS)
12. Per-action telemetry → `state/shared/dashboards/mcp-action-latency.jsonl`
13. Steady-state SLO gate (30 chats × 5/min × 8h = 72k actions; pass = drops <0.1%, p95 <500ms, restarts ≤1 planned)

## Approaches rejected

| Approach | Why rejected |
|---|---|
| Multi-process MCP shard by chat/domain | Requires routing/proxy + cross-shard coordination; 4-6× more code than §3; keep in reserve as MS1 |
| Per-chat embedded MCP | 30 × ~500 MB = 15 GB just for MCP; prohibitive at fleet scale |
| Stateless HTTP + Redis | New external dep, new failure mode; SQLite WAL gives equivalent without adding a service |
| Bigger box | Linear cost, no structural fix; drops happen at SOME chat count without admission control |

## Integration with SLOT-RECOVERY-MS0 (in-flight)

SLOT-RECOVERY-MS0's per-slot session-id sidecar IS the stable identity that MCP-CAPACITY-MS0's per-chat rate limit (§3.1 #2) needs. The two milestones interact deliberately — recommended build order is SLOT-RECOVERY → FLEET-DASHBOARD → MCP-CAPACITY Phase A.

## Companion: today-actionable 30-minute fix

Before MCP-CAPACITY-MS0 implementation, the companion spec `MCP-DISCONNECT-ROOT-CAUSE-2026-05-25.md` identifies the **immediate** root cause: per-request `server.connect(transport)` at `mcp-server/src/index.ts:973-983` leaks ~10MB/min from closure churn. The 30-minute fix is the session-pool stateful pattern. Tracked as `U-MCP-FACTORY-REFACTOR` (per-session McpServer factory; SDK invariant: `McpServer.connect()` binds ONE transport per server, so the pool needs a fresh McpServer per session). See [[reference_mcp_sdk_single_transport_invariant_2026_05_25]] for the SDK contract discovery.

## Knobs (proposed, §7 of source)

| Knob | Default | Purpose |
|---|---|---|
| `PRISM_MCP_MAX_INFLIGHT` | 60 | Admission-control ceiling (30 chats × 2 burst) |
| `PRISM_MCP_RATE_LIMIT_PER_CHAT` | 30/30s | Token bucket size per session_id |
| `PRISM_MCP_ACTION_TIMEOUT_MS` | 10000 | Per-action latency budget |
| `PRISM_MCP_WATCHDOG_RSS_WARN_MB` | 2048 | Heap snapshot threshold |
| `PRISM_MCP_WATCHDOG_RSS_KILL_MB` | 3072 | Restart threshold |
| `PRISM_MCP_GRACEFUL_DRAIN_MS` | 2000 | Drain-then-exit window |
| `PRISM_MCP_SUBPROCESS_POOL_SIZE` | 8 | Bounded worker pool |
| `PRISM_MCP_HTTP2_DISABLE` | 0 | HTTP/2 on by default |
| `PRISM_MCP_LOAD_TEST_DURATION_MIN` | 60 | Load-test runtime |
| `PRISM_MCP_LOAD_TEST_CHATS` | 30 | Simulated concurrent chats |

## Status: DEFERRED

Not blocking any in-flight milestone. SLOT-RECOVERY-MS0 (8 units, 4 shipped) is independently shippable without MCP-CAPACITY. MCP-CAPACITY ships as a separate milestone when the operator authorizes the 12-16h focused build.

The immediate U-MCP-FACTORY-REFACTOR (in golf queue) is the bridge fix that buys headroom until MCP-CAPACITY Phase A lands.
