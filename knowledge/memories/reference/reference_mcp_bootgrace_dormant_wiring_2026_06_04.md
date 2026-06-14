---
name: mcp-bootgrace-dormant-wiring-2026-06-04
description: "MCP :3100 flap root cause — the boot-grace flap-prevention is BUILT but DORMANT: PRISM_MCP_WATCHDOG_BOOTGUARD defaults OFF + the bootStartedAt stamp producer is unwired into the reconnect hook's spawn path (mcp-server-daemon.mjs). High-ROI golf gap-fill, deferred for a dedicated session (critical, multi-file, 33-galaxy blast radius)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.203Z
aliases: reference_mcp_bootgrace_dormant_wiring_2026_06_04
---


2026-06-04 (slot golf, discovery /goal). Diagnosed why MCP :3100 flaps 3×/session this session (down→auto-recover, sometimes needing a manual task-trigger).

**Architecture (verified by reading the files):**
- `.claude/hooks/mcp-connectivity-check.mjs` — per-turn UserPromptSubmit probe of `/health`; on down calls `maybeReconnect`. WORKS.
- `scripts/lib/mcp-reconnect-action.mjs` — `maybeReconnect`→`spawnDaemon` spawns `mcp-server-daemon.mjs start` detached. WORKS (tick-8 banner confirmed spawn pid). Also defines the FIX4/6 flap-prevention: `decideRestart` grants a **90s boot-grace** (`BOOT_GRACE_MS`) by reading `lock.bootStartedAt` from the unified port lock `state/shared/.mcp-server-3100.lock`, + `writePortLock`/`isOwnerAlive`.
- `.claude/helpers/mcp-server-daemon.mjs` `start()` — spawns `dist/index.js` detached, writes ONLY `.claude/cache/mcp-daemon.pid`, `await waitForHealth(30s)`. **Does NOT call writePortLock / never stamps bootStartedAt.** ← producer gap.
- `scripts/mcp-server-watchdog.mjs` — spawns a `SUPERVISOR_SCRIPT --once` (NOT mcp-server-daemon.mjs — second spawn path). Its BOOTING guard (consults decideRestart) is gated behind **`PRISM_MCP_WATCHDOG_BOOTGUARD=1` (DEFAULT OFF)** and the docstring says "co-enable with the step-4 stamp".

**Root cause (R7 + dormant-wiring):** the boot-grace consumer (`decideRestart` + BOOTGUARD) exists but (a) is **default-OFF**, and (b) its `bootStartedAt` producer is **not wired into the reconnect hook's spawn path** (mcp-server-daemon.mjs). Two uncoordinated spawn paths (reconnect→daemon-helper vs watchdog→supervisor). So during the ~50s cold boot (64 dispatchers/~700MB) the restarters can still kill a booting server → flap. The cold-boot is the unavoidable cost; the coordination to protect it is built but not switched on/wired.

**Why deferred (NOT fixed live):** critical subsystem, 33-galaxy blast radius, default-OFF flag with an explicit "co-enable BOOTGUARD + stamp" coupling not fully traced (SUPERVISOR_SCRIPT unread), at ~60% session context with 2 crons firing. A wrong activation = perpetual flap fleet-wide. R8/R13/comprehensive-build cut-off → enumerate + check in.

**Scoped activation plan (dedicated session, golf — U-MCP-RESTART-ACTUATOR / MCP-ALWAYS-CONNECTED):**
1. Read `SUPERVISOR_SCRIPT` (watchdog's spawn target) — confirm whether IT stamps `bootStartedAt` (the "step-4 stamp").
2. Wire `writePortLock({pid, startedAt, bootStartedAt: now, role:'supervisor'})` into EVERY spawn path that brings :3100 up — at minimum `mcp-server-daemon.mjs start()` right after `spawn(...dist/index.js...)` (import from scripts/lib/mcp-reconnect-action.mjs).
3. Enable `PRISM_MCP_WATCHDOG_BOOTGUARD=1` (User env / task XML) ONCE the stamp is guaranteed on all paths (co-enable, per the docstring).
4. Tests: assert the lock gets a fresh `bootStartedAt` on spawn; assert `decideRestart` returns `booting/shouldRestart:false` within grace; assert a confirmed-dead owner short-circuits the grace.
5. Verify no regression: MCP comes up once, stays up across a watchdog cycle, no double-spawn.

Band-aid until then: golf monitoring loop triggers `PRISM MCP Server` + `MCP Server Watchdog` tasks on each tick when :3100 is down (works, manual). [[reference_mcp_sdk_single_transport_invariant_2026_05_25]] · [[blackwell-gpu-synergy-golf-2026-06-04]].

## UPDATE 2026-06-04 (all 5 files read — COMPLETE root cause + executable plan)
CONFIRMED by reading `scripts/mcp-server-supervisor.mjs`: the supervisor (SUPERVISOR_SCRIPT, spawned `--once` by the watchdog + run by the `PRISM MCP Server` scheduled task) is the CANONICAL spawner (`spawnChild()` line ~209) — and it **does NOT call writePortLock / never stamps bootStartedAt** either. It uses only its own `mcp-server/data/state/server-supervisor.pid` O_EXCL lock + an exit(0) bind-fail-fast cooperation. So **NEITHER** spawner stamps the unified `.mcp-server-3100.lock` → the boot-grace has **zero producers** → it is fully dormant.

EXACT FIX (do as ONE focused unit in a fresh full-budget context — was context-insufficient at ~65% mid-loop, deferred per comprehensive-build cut-off + operator OR-branch):
1. `scripts/mcp-server-supervisor.mjs spawnChild()` (after the `child = spawn(...)` at ~line 220): `import { writePortLock } from "./lib/mcp-reconnect-action.mjs"` and call `writePortLock({ pid: child.pid, startedAt: Date.now(), bootStartedAt: Date.now(), reason: "supervisor-spawn", role: "supervisor" })`. (Stamp ONCE per spawn; the boot clock starts at spawn.)
2. `.claude/helpers/mcp-server-daemon.mjs start()` (after `child = spawn(...dist/index.js...)` ~line 161, before/with `writePid`): same `writePortLock({...bootStartedAt})` import from `../../scripts/lib/mcp-reconnect-action.mjs`. (Secondary spawn path = the reconnect-hook's; wire BOTH per R13 comprehensive route.)
3. Enable the consumer: set USER env `PRISM_MCP_WATCHDOG_BOOTGUARD=1` (co-enable WITH the stamp, per the watchdog docstring line 34) — AND bake it into the `PRISM MCP Server Watchdog` scheduled-task XML env so it survives reboot.
4. Tests (scripts/lib/...test.mjs or a new hermetic test): assert spawnChild writes a lock with finite `bootStartedAt`; assert `decideRestart({healthUp:false, lock:{bootStartedAt:now}, now, ownerAlive:true})` → `state:'booting', shouldRestart:false` within 90s grace; assert `ownerAlive:false` short-circuits → `shouldRestart:true`; assert grace-exhausted (bootAge>90s) → restart.
5. Verify no-regression: MCP comes up once + stays up across one watchdog cycle (no double-spawn / no boot-clock reset). Then 3-of-3 scrutiny + commit `[MAIN] [MCP-ALWAYS-CONNECTED]/U-BOOTGRACE-PRODUCER-WIRE (slot:golf)`.

Risk if done wrong: enabling BOOTGUARD without the stamp on ALL paths = watchdog defers forever on a never-stamped lock OR still flaps → 33-galaxy MCP outage. Hence co-enable + wire-all-spawners is mandatory, not optional.
