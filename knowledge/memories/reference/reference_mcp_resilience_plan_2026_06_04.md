---
name: reference_mcp_resilience_plan_2026_06_04
description: "MCP-server fleet-resilience hardening plan (workflow verdict + 12-item dependency-ordered fix list). FIX-3 BOOTGUARD-default-on shipped; FIX-1/FIX-2 banked. The \"mcp-server doesnt go down under fleet load\" directive."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.206Z
aliases: reference_mcp_resilience_plan_2026_06_04
---


# MCP-RESILIENCE plan — keep :3100 up under the 26-slot fleet (golf, 2026-06-04)

Operator directive: *"fix the mcp-server and upgrade it further to handle the fleet and the agents that spawn from them so the mcp-server doesnt go down."* Diagnosed via the `mcp-resilience-harden` Workflow (run `wel7cerl3`).

**Workflow verdict:** the dominant down-mode is **concurrency / backpressure**, not crashes. The 26-slot fleet (+ spawned subagents) opens many simultaneous `/mcp` requests; combined with a cold-boot flap and an unbounded allocation-per-request, the server is starved/OOM-preempted rather than throwing.

## Three down-modes identified
1. **Allocation storm per request** — `buildRequestServer()` (the single-transport fix `1297b0a8f5`) re-runs `bindDispatchers` into a fresh server on EVERY `/mcp` request. Under fleet concurrency this is the dominant heap/CPU cost. → FIX-1.
2. **No socket reuse on the bridge** — `.claude/helpers/mcp-http-bridge.mjs` opens a fresh TCP connection per call (no keep-alive agent), so connection churn compounds the request storm. → FIX-2.
3. **Cold-boot flap** — watchdog (runs as SYSTEM scheduled task) killed the supervisor's mid-cold-boot child (~50s boot) every cycle, resetting the boot clock = the visible :3100 flap. → FIX-3 **(SHIPPED this session)**.

## FIX-3 — SHIPPED (commit dc4c7a1d5b, 3-of-3 PASS, slot:golf)
Flipped the watchdog boot-guard **DEFAULT-ON** (off only via `PRISM_MCP_WATCHDOG_BOOTGUARD=0`). Activates the boot-grace PRODUCER (`bootStartedAt` stamp) shipped earlier this session as U-BOOTGRACE-PRODUCER-WIRE (`4529d13a25`). Added canonical `bootGuardEnabled(env)` to `scripts/lib/mcp-reconnect-action.mjs` (pure env read, never throws); watchdog gate flipped inline `=== "1"` → `!== "0"` keeping its fail-OPEN structure (gate carries NO import dependency). +3 load-bearing tests (10/10). Reversible. Deadlock-free: every non-restart `decideRestart` path is bounded by `BOOT_GRACE_MS` exhaustion; missing/garbage stamp → `no-boot-stamp`/`no-lock` → restart.

**Reviewer-C follow-up (NON-BLOCKING, real gap):** `scripts/mcp-daemon-autostart.mjs` does NOT stamp `bootStartedAt` (only `.claude/helpers/mcp-server-daemon.mjs` start() + `scripts/mcp-server-supervisor.mjs` spawnChild do). Safe today (unstamped spawn degrades to `no-boot-stamp → restart`, never deadlock) but that spawn path is NOT boot-protected — a cold boot launched via mcp-daemon-autostart.mjs can still be killed mid-boot. **FIX-0.5:** add the same fail-soft `writePortLock({...bootStartedAt})` stamp to mcp-daemon-autostart.mjs IF it actually performs cold-boot server spawns the watchdog races. Verify the path is live first (dedup — it may be dead code).

## BANKED (need full budget — execute next pass, dependency order)

**FIX-2 (low risk, do first) — bridge keep-alive pool.** `.claude/helpers/mcp-http-bridge.mjs` (~lines 38-39 + the request site ~189): construct `const agent = new http.Agent({ keepAlive:true, maxSockets:MAX_CONCURRENT, maxFreeSockets:2 })` once and pass `{ agent }` to every `http.request`. Reuses sockets → kills connection churn. No MCP build needed (.mjs). Test: assert the agent is shared + maxSockets respects MAX_CONCURRENT (=3 per bridge).

**FIX-1 (MED risk, dominant win) — cache dispatcher binding off the per-request path.** `mcp-server/src/index.ts` (~896-899 bindDispatchers + ~1205 buildRequestServer). Today `bindDispatchers` runs per request into the fresh per-request server. Goal: run the expensive dispatcher/registry construction ONCE into a shared/cached registry at boot; `buildRequestServer()` only binds lightweight per-request handlers that REFERENCE the cache. Must preserve the single-transport invariant (`1297b0a8f5`) — fresh `McpServer` per request, but NOT fresh dispatcher graph. Needs MCP build (`npm run build`) + a 100-concurrent-`/mcp` heap-delta test (prove RSS no longer scales linearly with request count). This is the directive's core "handle the fleet" win.

**Follow-ups 4-12 (from the workflow plan, ordered):**
4. Inflight-gated RSS preempt — watchdog must NOT preempt-restart while N requests are in flight (drain first).
5. Watchdog single-instance mutex — O_EXCL lock so two watchdogs (multi-trigger) can't double-restart.
6. Exponential escalation backoff — cap restart storms when boot genuinely fails.
7. Unify spawn paths — supervisor.mjs / mcp-server-daemon.mjs / mcp-daemon-autostart.mjs converge on ONE spawn helper that always stamps (subsumes FIX-0.5).
8. CAS port-lock on PID — compare-and-swap so a stale lock from a dead PID can't block a live owner.
9. Fleet-wide admission semaphore — global cap on concurrent `/mcp` across all 26 slots + subagents (the real backpressure valve).
10. Jittered backoff on the bridge — clients retry with jitter, not thundering-herd.
11. Server-side 503 shed — when at capacity, return 503 fast instead of queueing to OOM.
12. Fix `error_ledger_recall_similar` leak — a known per-call leak that compounds under load.

## Invariants for any MCP-server edit
- Preserve single-transport-per-server (`buildRequestServer` 1297b0a8f5) — fresh server per request, never share a transport.
- Watchdog must stay fail-OPEN (any guard error → escalate/restart; never brick recovery).
- MCP src edits (index.ts) require `cd mcp-server && npm run build` + concurrent heap test before commit.
- Per-file 2-arm scrutiny + 3-of-3 Stop gate mandatory.

Related: [[reference_fleet_git_contention_golf_pickup_2026_06_04]] · [[reference_mcp_sdk_single_transport_invariant_2026_05_25]] · [[feedback_golf_owns_reaper]]
