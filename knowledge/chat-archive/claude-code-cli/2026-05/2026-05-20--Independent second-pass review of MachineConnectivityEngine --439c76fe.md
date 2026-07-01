---
type: "chat-session"
source: "claude-code-cli"
session_id: "439c76fe-a520-413d-b8ae-27d57487bd80"
title: "Independent second-pass review of MachineConnectivityEngine wiring to the shop-f"
date: "2026-05-20"
first_ts: "2026-05-20T18:49:32.065Z"
last_ts: "2026-05-20T18:51:24.377Z"
cwd: "H:\\prism\\mcp-server"
messages: 18
user_msgs: 8
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/439c76fe-a520-413d-b8ae-27d57487bd80/subagents/agent-ad2a8a51a5462e8c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent second-pass review of MachineConnectivityEngine wiring to the shop-f

> **claude-code-cli** | 2026-05-20 | 18 msgs (8 user / 10 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/439c76fe-a520-413d-b8ae-27d57487bd80/subagents/agent-ad2a8a51a5462e8c8.jsonl`

## Transcript

### User | 2026-05-20T18:49:32.065Z

Independent second-pass review of MachineConnectivityEngine wiring to the shop-floor outcome bridge.

**File:** `H:/prism/mcp-server/src/engines/MachineConnectivityEngine.ts`

**Diff:** New `domain?: string` field on MachineConfig + new import of `emitFromMachineAlerts` + new try/catch emit block at end of `ingestLiveData()` gated by `PRISM_MACHINE_BRIDGE_DISABLE` env knob.

**Look HARD for what the first reviewer might miss:**
1. **High-frequency emit risk** — `ingestLiveData()` is called by `prism-bridge-service` "via HTTP/WebSocket" on every MTConnect tick (line 13). For a fleet of 21 JM Die machines polling at 100ms intervals = 210 calls/sec. EVEN with empty newAlerts (no-op short-circuit), is the cumulative cost OK? What about when alerts ARE generated — could a sustained chatter event flood the bus with cycle/cycle alerts?
2. **Alert deduplication** — line 269 generates a NEW alert every tick if spindle_load > 85%. A 60-second sustained overload produces ~600 alerts × 600 bus emits. The bus shard would grow ~150KB/min during sustained alerts. Is there an alert-deduplication path the bridge should respect? (Possibly: the engine could only emit ON STATE TRANSITION, not on every tick of a sustained condition.)
3. **alarm_active rate limiting** — line 299 has `current.state === "alarm" && prev?.state !== "alarm"` — that IS state-transition-gated. Good. But overload_trending and feed_override_low fire EVERY tick. The bridge would amplify those.
4. **Domain hint validation** — `machine.domain ?? "shop_floor"`. What if a caller passes an invalid domain string (e.g., a typo "miil")? The bridge's normalizeDomain catches it (→ "other"), but the EMITTER doesn't validate up-front. Defensive validation in MachineConnectivityEngine vs trust-the-bridge?
5. **machine variable scope** — line 223 `const machine = machines.get(machineId);` returns early if undefined. So `machine.domain` is safe at call site. Confirm reading the file.
6. **stderr noise** — every bridge failure wr
... [+696 chars truncated]

### Assistant | 2026-05-20T18:49:40.925Z

Let me read the file directly to verify the code before grading.

### Assistant | 2026-05-20T18:49:41.345Z

[tool_use: Read]

### Assistant | 2026-05-20T18:49:41.373Z

[tool_use: Glob]

### User | 2026-05-20T18:49:46.008Z

[tool_result] 1	import { emitFromMachineAlerts } from "../utils/shopFloorOutcomeBridge.js";
2	
3	/**
4	 * MachineConnectivityEngine.ts — R9-MS0 MTConnect/OPC-UA Data Ingestion
5	 * ======================================================================
6	 *
7	 * Server-side engine for real-time machine data. Provides:
8	 *   - Machine registry with connection status
9	 *   - Live status: RPM, feed, load, positio
... [+32588 chars truncated]

### User | 2026-05-20T18:50:01.845Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-20T18:50:07.218Z

Reviewing the file directly was successful. Now let me check the bridge utility to understand the emit contract and any rate-limiting provisions.

### Assistant | 2026-05-20T18:50:08.194Z

[tool_use: Glob]

### Assistant | 2026-05-20T18:50:08.774Z

[tool_use: Glob]

### User | 2026-05-20T18:50:10.502Z

[tool_result] src\utils\shopFloorOutcomeBridge.ts
src\utils\__tests__\shopFloorOutcomeBridge.test.ts

### User | 2026-05-20T18:50:30.236Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-20T18:50:31.993Z

[tool_use: Read]

### User | 2026-05-20T18:50:35.063Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\shopFloorOutcomeBridge.ts' was already read 14m ago in this session and is unchanged (mtime 1779301622189). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-05-20T18:50:38.689Z

[tool_use: Grep]

### User | 2026-05-20T18:50:39.371Z

[tool_result] 196- *
197- * The lineage_id ties this batch back to the (machine_id, ingest_timestamp)
198- * pair so consumers can correlate alerts from one machine tick.
199- */
200:export function emitFromMachineAlerts(
201-  machineId: string,
202-  domainHint: string | undefined | null,
203-  alerts: ShopFloorAlertLike[],
204-  ingestTimestampIso: string,

### Assistant | 2026-05-20T18:50:41.610Z

[tool_use: Read]

### User | 2026-05-20T18:50:45.448Z

[tool_result] 196	 *
197	 * The lineage_id ties this batch back to the (machine_id, ingest_timestamp)
198	 * pair so consumers can correlate alerts from one machine tick.
199	 */
200	export function emitFromMachineAlerts(
201	  machineId: string,
202	  domainHint: string | undefined | null,
203	  alerts: ShopFloorAlertLike[],
204	  ingestTimestampIso: string,
205	  bus: OutcomeBusLike = outcomeCaptureBusEngine,
... [+2045 chars truncated]

### Assistant | 2026-05-20T18:51:24.377Z

I have everything I need. Here is the independent second-pass review.

---

Reviewing: `H:/prism/mcp-server/src/engines/MachineConnectivityEngine.ts` — new `domain?` field on `MachineConfig`, `emitFromMachineAlerts` import, and the emit block at lines 276-285 inside `ingestLiveData()`.

---

## CRITICAL Issues

None confirmed at P0.

---

## Important Issues (P1)

**P1 — Alert flood on sustained overload: no dedup, no state-transition gate (Confidence: 90)**

File: `H:/prism/mcp-server/src/engines/MachineConnectivityEngine.ts`, lines 296-309 (`overload_trending`) and lines 312-323 (`feed_override_low`)

Both conditions fire a new alert on every tick where the threshold is met. `alarm_active` is correctly state-transition-gated at line 326 (`prev?.state !== "alarm"`). The other two are not.

The emit block at line 276 then forwards every generated alert to the bus without any rate-limiting or dedup on the engine side. `emitFromMachineAlerts` (confirmed by reading the bridge source) calls `bus.record()` once per alert with no throttle of its own — it is a pure pass-through mapper. There is no per-`(machineId, alertType)` cooldown anywhere in the call chain.

Consequence at JM Die's 21 machines polling at 100ms: a machine running above 85% spindle load for 60 seconds generates 600 alerts × 600 bus records for that one machine. At 21 machines in a moderate overload event that is ~12,600 bus records/minute. The bus shard grows proportionally; downstream learning consumers (`CrossProcessNeuralLearning`, `LearningAdaptationEngine`) receive a stream that is not informative — it encodes "still overloaded" 600 times instead of once.

The first reviewer noted this risk. Confirming it is real and the bridge provides no backstop.

Fix — apply the same transition gate already used for `alarm_active` to both continuous-condition alert types. For `overload_trending`, track prior load tier (normal / warn / critical) and only emit on tier change. For `feed_override_low`, gate on `pre
... [+4023 chars truncated]
