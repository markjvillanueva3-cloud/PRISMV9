---
name: reference_mcp_false_disconnect_and_capacity_guard_2026_06_17
description: "The operator's \"chats get disconnected right away / fix MCP for 16-chat load\" was overwhelmingly FALSE-POSITIVE banners on a healthy server, not a broken server -- fixed the false detectors + guarded the proven 64/512 capacity."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.652Z
aliases: reference_mcp_false_disconnect_and_capacity_guard_2026_06_17
---


**MCP "disconnect" reframe + fixes (2026-06-17, slot golf, branch cad-fusion-live-ms0).**
Operator: "fix and improve mcp server please, chats get disconnected right away ... accommodate a full 16 chat slot heavy session." Empirically (R12) the server was NOT broken: 32 concurrent `initialize` POSTs all HTTP 200 sub-second; peak_inflight only **6** over 6h vs the RequestSemaphore's 64-active/512-queue limits; /ready 5ms; **4 real terminal bridge disconnects vs thousands of FALSE "MCP BRIDGE DOWN" banners across 617 sessions**. The "disconnect" pain was the false-positive detector cluster firing on a HEALTHY server, not real drops.

Root cause (both false banners): `mcp-http-bridge.mjs` processes are TRANSIENT stdio->HTTP shims that spawn/serve/exit (1486 spawn cycles in the log; **0-live-bridges is the NORMAL resting state** between request bursts). Two detectors mistook bare `countBridges()===0` for an outage:
1. `mcp-connectivity-check.mjs` (UserPromptSubmit) -> per-turn "MCP BRIDGE DOWN" banner. **FIX #1 `4c7fba6287`**: gated the fleet-0 fallback banner behind `PRISM_MCP_FLEET0_BANNER=1` (default off); also bumped the health-probe timeout 1000->3000ms (a 1s probe false-failed under load).
2. `mcp-bridge-enforce.mjs` / `-pretool.mjs` (PreToolUse T0) -> wrote `mcp-reconnect-signal.json` -> fleet-wide "/mcp reconnect" broadcast banner. **FIX #2 `9da42f74c6`**: `decideEnforcement` now takes `serverUp`; broadcast fires only when `fleetOut && serverUp !== true`. The hook reads the cached :3100 /health probe via `readCachedServerUp` (true only when fresh <=120s AND `lastStatus.ok===true`, else undefined so a REAL server-down still broadcasts). Per-chat HARD-BLOCK (pid-dead/stale-heartbeat) untouched. `CONNECTIVITY_STATE` env-overridable (`PRISM_MCP_CONNECTIVITY_STATE_FILE`) for hermetic tests.

**Capacity guard `89cd1b5da5` (U-MCP-CAPACITY-CONTRACT):** the /mcp capacity had been silently lowered before (`MCP_MAX_CONCURRENT 6->3` on 2026-05-29) with no test catching it, and `index.ts` hard-coded 64/512 inline (untestable without booting :3100). Extracted `resolveMcpCapacity(env)` + named constants (`MCP_DEFAULT_MAX_CONCURRENCY=64`, `MCP_DEFAULT_QUEUE_MAX=512`, `MCP_MIN_CONCURRENCY_FOR_16_CHATS=16`) into `mcp-server/src/mcp/request-semaphore.ts`; wired `index.ts` to it (byte-identical `Math.max(floor, Number(env.X)||default)` across all 7 input classes). New `mcp-capacity-contract.test.ts` (7/7): pins 64/512 (RED if dropped to 3), proves a 16-chat x 4-build burst (64) never queues, proves a 576-concurrent fan-out absorbs with ZERO shed + only the 577th sheds + FIFO promotion.

**Why:** the actionable lesson is REFRAME before rebuild -- "the server is broken, rebuild it" was the wrong premise; the fix was killing false detectors + guarding proven capacity, not adding concurrency the box never needed.
**How to apply:** when a "X is down/broken" report contradicts the metrics, prove the metric first (concurrent-init smoke + peak-inflight vs limits); a transient-process count of 0 is NOT an outage when the long-lived server is healthy -- gate any outage broadcast on a real health signal, never on the transient count alone. See [[reference_mcp_concurrency_harden_shipped_2026_06_09]], [[reference_golf_mcp_bridge_count_false_positive_2026_06_17]], [[reference_mcp_enforce_gate_staging_harm_2026_06_16]].
