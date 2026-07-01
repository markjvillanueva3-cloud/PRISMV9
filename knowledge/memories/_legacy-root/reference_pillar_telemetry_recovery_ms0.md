---
name: pillar-telemetry-recovery-ms0
description: "2026-05-15 PILLAR-TELEMETRY-RECOVERY-MS0/U-PTR01 shipped — HookTelemetryEngine persistence (env-opt-in, atomic .tmp+rename, debounced auto-save). Three open follow-ups left in the rot pile."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.677Z
aliases: reference_pillar_telemetry_recovery_ms0
---


## What was rotted

`prism_hook:performance` returned `{total:0}` regardless of session activity — the 2026-05-02 audit flagged this as silent-rot. Root cause was layered:

1. **`H:/prism/mcp-server/dist/` was wiped** (likely during the 2026-05-12 git history strip — see [[reference_git_history_strip_event_2026_05_12]]). The 8 long-running MCP procs (started 7:26-7:37 AM) held stale in-memory module handles to a build that no longer existed on disk.
2. **`node_modules/` was empty** — esbuild, typescript, vitest all missing. `npm ci --prefer-offline` repopulated (`H:/Tools/nodejs/npm.cmd` via PowerShell since Bash had no `npm` on PATH).
3. **Build hashes diverged** — the new esbuild output produced different chunk names (`chunk-XXXX.js`) than what the running MCP procs reference (e.g. `DispatcherMapEngine-NHPZ54BA.js`). Running procs can't recover without restart; future MCP procs work fine.
4. **`HookTelemetryEngine` was in-memory only** — even with a fresh build, every MCP restart loses all telemetry. This was the real source-level fix.

## What U-PTR01 shipped (commit `afe5da94e`)

Engine (`HookTelemetryEngine.ts`):
- `persist(filePath?)` and `loadPersisted(filePath?)` with atomic `.tmp` + rename
- Auto-load on construct when `PRISM_HOOK_TELEMETRY_PATH` is set
- Debounced auto-save (default 5000 ms) on every `recordEnd`
- Schema-version gate (v1) + non-fatal failure modes (missing file / corrupt JSON / schema mismatch all return `{ok:false,error,...}` — never throw)
- `reset()` and `setPersistPath(null)` cancel the pending flush (deterministic test fixtures)
- Knobs: `PRISM_HOOK_TELEMETRY_PATH`, `PRISM_HOOK_TELEMETRY_DISABLE=1`, `PRISM_HOOK_TELEMETRY_DEBOUNCE_MS=N`
- Backward compatible: with neither env set, behavior is the pre-2026-05-15 in-memory-only engine

Dispatcher (`prism_hook`, +3 actions):
- `hook_telemetry_persist` — flush current state to disk
- `hook_telemetry_load` — restore from disk into the live singleton
- `hook_telemetry_status` — report `{persistPath, persistenceEnabled, envVar, disabledByEnv, debounceMsEnv}`

Tests (47 total, all pass):
- `HookTelemetryEngine.test.ts`               16/16 (pre-existing, no regression)
- `HookTelemetryEngine.persistence.test.ts`   19/19 (new — engine round-trip + env + debounce + 4 failure modes)
- `hookDispatcher.telemetry-persist-wire.test.ts` 12/12 (new — source-grep contract + in-process round-trip via fake MCP server)

3-of-3 scrutiny: PASS / PASS / PASS at session `ptr01-afe5da94e`.

## Open follow-ups (still rotted)

Two open units remain after U-PTR04 shipped 2026-05-15:

1. **`prism_dev:auto_wiring_scan` throws `Identifier '__filename' has already been declared`** at runtime. This is an esbuild bundling pathology — when the dispatcher lazy-imports `AutoWiringEngine.js`, the bundled chunk redeclares `__filename` in a scope that already has it. Source `AutoWiringEngine.ts` itself does NOT use `__filename`; the clash comes from esbuild's CJS interop shim being injected twice into the same chunk. Needs source-level investigation of which transitive dep is forcing the dual shim — fix candidate: switch the offending dep to a pure-ESM equivalent, or add an esbuild `define`/`banner` to dedupe `__filename`. **Unit: U-PTR02-AUTOWIRING-FILENAME-CLASH** (NOT YET SHIPPED).

2. **`prism_dev:capability_census` returns `{total_engines:0, total_dispatchers:0, ...}` from running MCP procs** even after the dist rebuild. This is a stale-MCP-proc cache issue, NOT a source bug — a fresh MCP proc reads the engines directory correctly (verified by direct `fs.readdirSync` on `mcp-server/src/engines/`). **Resolves on MCP restart**. Fleet reaper should kick out the zombie procs from 2026-05-15 07:26-07:37 (PIDs 8600, 9260, 17096, 27332, 34316, 34668, 35120, 36496). **Unit: U-PTR03-FLEET-MCP-RESTART** (NOT YET SHIPPED) — or just operator-triggered.

3. ~~**`dist/` wipe vulnerability**~~ — ✅ **SHIPPED 2026-05-15 as U-PTR04** (commit `06c251286`). `.claude/hooks/dist-integrity-check.mjs` is wired in SessionStart (timeout 3000 ms, individual entry, NOT in bundle per peer-contention rules). Emits `additionalContext` warning when dist/index.js or dist/chunks/ is missing/empty/stale OR node_modules/esbuild is missing. Knobs: `PRISM_DIST_INTEGRITY_DISABLE=1`, `PRISM_DIST_INTEGRITY_MAX_AGE_HRS=N` (default 720). Tests: 10/10 pass (`mcp-server/src/__tests__/dist-integrity-check.test.mjs`). 3-of-3 scrutiny PASS at `ptr04-06c251286`.

## How to verify telemetry is actually persistent now

1. Set the env var (once per host): `setx PRISM_HOOK_TELEMETRY_PATH H:\prism\state\shared\hook-telemetry-snapshot.json`
2. Restart MCP (kill the zombie procs first — `taskkill /F /PID 8600` etc.)
3. Run a few hook-firing tool calls (Bash, Edit, anything)
4. `prism_hook:hook_telemetry_status` → confirms `persistenceEnabled:true`
5. Wait 6 s, then `cat H:/prism/state/shared/hook-telemetry-snapshot.json` → should contain populated `hooks` map with `schemaVersion:1`
6. Kill + restart MCP → repeat status call → in-memory state restored from disk
7. `prism_hook:performance` → no longer returns `total:0`

Sister to [[reference_h7_async_hook_dispatcher]] (telemetry feeds the async dispatcher's routing decisions) and [[reference_h8_coordination_store]] (similar persistent-state pattern — SQLite WAL for claims, plain JSON snapshot for hook telemetry).


## Related
[[engines/DispatcherMapEngine|DispatcherMapEngine]] • [[engines/HookTelemetryEngine|HookTelemetryEngine]] • [[engines/AutoWiringEngine|AutoWiringEngine]] • [[dispatchers/prism_hook|prism_hook]] • [[dispatchers/prism_dev|prism_dev]] • [[skills/prism|/prism]] • [[skills/mcp-server|/mcp-server]] • [[skills/dist|/dist]] • [[skills/nodejs|/nodejs]] • [[skills/npm|/npm]]