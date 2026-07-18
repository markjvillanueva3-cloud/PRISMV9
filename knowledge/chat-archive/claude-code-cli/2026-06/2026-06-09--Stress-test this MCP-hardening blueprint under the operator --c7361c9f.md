---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Stress-test this MCP-hardening blueprint under the operator scenario: the FULL 2"
date: "2026-06-09"
first_ts: "2026-06-09T16:22:07.259Z"
last_ts: "2026-06-09T16:24:52.494Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-ab155ba1b1e60f23e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Stress-test this MCP-hardening blueprint under the operator scenario: the FULL 2

> **claude-code-cli** | 2026-06-09 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-ab155ba1b1e60f23e.jsonl`

## Transcript

### User | 2026-06-09T16:22:07.259Z

Stress-test this MCP-hardening blueprint under the operator scenario: the FULL 26-chat fleet in ultracode mode, each launching Workflows that fan out UNLIMITED agents, all calling /mcp at once:

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

Logical build order (R13): **Change 2 (producer: expose inflight on `/health`) before Change 3 (consumer: watchdog reads it)**. Change 1 (limiter) is independent and can land first. I order them 2 -> 1 -> 3 below for clean dependency flow, but present t
... [+34216 chars truncated]

### Assistant | 2026-06-09T16:22:24.918Z

This is a sophisticated, mostly-verified blueprint. My job is to stress-test it adversarially under the operator's worst-case scenario, then answer the six pointed questions with specifics and a verdict. Let me verify the load-bearing facts against the actual code before I trust the analysis — the blueprint makes specific line-number and behavioral claims that the entire safety argument rests on.

### Assistant | 2026-06-09T16:22:25.873Z

[tool_use: Read]

### Assistant | 2026-06-09T16:22:27.017Z

[tool_use: Read]

### Assistant | 2026-06-09T16:22:32.111Z

[tool_use: Read]

### User | 2026-06-09T16:22:32.344Z

[tool_result] 1100	      '# TYPE prism_registry_entries gauge',
1101	      ...Object.entries(rs).map(([k, v]) => `prism_registry_entries{registry="${k}"} ${v}`),
1102	      '# HELP prism_registry_total Total registry entries',
1103	      '# TYPE prism_registry_total gauge',
1104	      `prism_registry_total ${Object.values(rs).reduce((a, b) => a + b, 0)}`,
1105	    ];
1106	    
1107	    // OBSERVABILITY-MS0 (slo
... [+11123 chars truncated]

### User | 2026-06-09T16:22:33.251Z

[tool_result] 960	        }
961	        resolve(); // non-EADDRINUSE probe error: proceed; the real listen will surface it
962	      });
963	      probe.once("listening", () => probe.close(() => resolve()));
964	      probe.listen(pfPort, pfHost);
965	    });
966	  }
967	
968	  await bootstrapServices();
969	  await bindDispatchers(server);
970	  
971	  const app = express();
972	  // OBSIDIAN-COMPOUND-MS1/S3/U
... [+2414 chars truncated]

### User | 2026-06-09T16:22:47.021Z

[tool_result] 1	/**
2	 * MetricsCollector — in-process MCP request telemetry (OBSERVABILITY-MS0, slot:bravo 2026-05-30).
3	 *
4	 * WHY: chats "disconnecting" from the MCP server was invisible until processes were
5	 * hand-counted. This makes the contention class measurable — per-tool call counts,
6	 * latency percentiles (p50/p95/p99), error counts, live + peak concurrency, and a
7	 * rolling RSS ring. Surface
... [+11526 chars truncated]

### Assistant | 2026-06-09T16:22:52.888Z

The core facts check out exactly as the blueprint claims. Now I need to find the real failure mode. Let me look at the watchdog's actual RSS threshold and supervisor heap config, and check `buildRequestServer`'s real memory cost, because the entire "true memory ceiling" answer depends on these.

### Assistant | 2026-06-09T16:22:53.841Z

[tool_use: Read]

### Assistant | 2026-06-09T16:22:55.665Z

[tool_use: Grep]

### User | 2026-06-09T16:23:04.972Z

[tool_result] 40	 *     Threshold ≥ 2 enforced (the runtime clamps).
41	 *   - Cooldown after escalation: `lastEscalationAt` gates the next escalation
42	 *     by at least PRISM_MCP_WATCHDOG_TIMEOUT_MS × FAIL_THRESHOLD ms so a
43	 *     just-respawned server gets time to come up before being killed again.
44	 *   - DRY_RUN mode prints what it would do without killing/spawning.
45	 */
46	
47	import { spawn, spa
... [+2326 chars truncated]

### User | 2026-06-09T16:23:05.956Z

[tool_result] 14: *   - On failure: increment `consecutiveFails` in state file.
15: *   - After PRISM_MCP_WATCHDOG_FAIL_THRESHOLD consecutive failures (default 2,
20: *       4. Reset consecutiveFails to 0 and stamp `lastEscalationAt`.
21: *   - On healthy: reset consecutiveFails to 0.
32: *   PRISM_MCP_WATCHDOG_FAIL_THRESHOLD=N consecutive fails before escalation (default 2)
42: *     by at least PRISM_MCP_WAT
... [+1998 chars truncated]

### Assistant | 2026-06-09T16:24:52.494Z

The watchdog facts confirm exactly as the blueprint states (18432MB RSS trip, 30min cooldown, `consecutiveFails` preserved on wedge). The decision block at line 255 and the `health.memory.rss_mb` extraction all match. One critical detail: `/health`'s own `healthy` flag uses `heapUsedMB < 3500` (line 998) — a 4GB-relevant threshold that is now stale relative to the 24GB heap, but that's orthogonal to this blueprint. I have everything I need. Let me write the verdict.

---

# STRESS-TEST VERDICT: MCP Hardening Blueprint under Full-Fleet Ultracode Fan-Out

**Foundation verified against live code** (`index.ts:1147/1192/1203-1215/1000-1009/1325/1326`, `metrics-collector.ts:54-65`, `mcp-server-watchdog.mjs:73-74/255`): every load-bearing claim in the blueprint is accurate. `incInflight`/`decInflight` exist at the choke point; `/health` does NOT emit inflight; watchdog trips at 18432MB RSS with a 30-min cooldown and preserves `consecutiveFails` on wedge; `requestTimeout = 0`; `maxConnections = 512`. The blueprint is buildable as written. Now the six answers, adversarially.

## 1. At what concurrency does it return 503, and does that look like a disconnect to the agent?

**Busy/503 onset under defaults:**
- Requests **1–128**: acquire immediately, served.
- Requests **129–640** (128 active + 512 queued): **park in the FIFO**, no error yet — they wait, served as permits free.
- Request **641+** (queue full): **immediate `503 queue_full`**.
- Any queued request waiting **>30s**: **`503 acquire_timeout`**.

So under instantaneous fan-out the hard-503 wall is **641 simultaneous in-flight `/mcp` calls**. But there is a *softer*, earlier wall the blueprint underweights: the **512 socket ceiling sits in FRONT of the semaphore**. Connection 513 never reaches Express — it waits in the kernel accept queue or is refused at the TCP layer. So the effective ordering is: 1–512 get sockets (128 run, 384 queue in-app), 513+ block at the socket layer until a socket frees. The in-app `QUEUE_M
... [+13739 chars truncated]
