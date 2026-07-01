# GOLF-HIGHRROI-MCP/U-GHM02-SIGNAL-HANDLER-IDEMPOTENT — [MAIN] [GOLF-HIGHRROI-MCP]/U-GHM02-SIGNAL-HANDLER-IDEMPOTENT (slot:golf): MemoryGraphEngine static registry + bind-once signal handlers

**Commit:** `f8379fdebdf0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T21:36:56-05:00
**Tags:** golf-highrroi-mcp, u-ghm02-signal-handler-idempotent, auto-distilled

## Subject
[MAIN] [GOLF-HIGHRROI-MCP]/U-GHM02-SIGNAL-HANDLER-IDEMPOTENT (slot:golf): MemoryGraphEngine static registry + bind-once signal handlers

## Body
```
[MAIN] [GOLF-HIGHRROI-MCP]/U-GHM02-SIGNAL-HANDLER-IDEMPOTENT (slot:golf): MemoryGraphEngine static registry + bind-once signal handlers

High-ROI MCP server upgrade. Companion to U-GMHL01 (today's dirty-flag-guard fix).

Bug surfaced by today's test suite stderr: "MaxListenersExceededWarning: 11 SIGINT listeners added to [process]". Each MemoryGraphEngine constructor ran process.on('SIGINT'|'SIGTERM'|'beforeExit', ...) — N instances leaked 3N listeners. Beyond the warning at N>=4, the worse failure mode was at signal-time: N parallel shutdown() chains all racing to write the SAME checkpoint files (nodes.jsonl, edges.jsonl, index.json, wal.jsonl). With renameSync as the atomic primitive but multiple processes calling it concurrently on the same temp paths, the writes were effectively a race — explains some past "graph state corrupted after restart" reports.

Fix: static `MemoryGraphEngine.activeEngines: Set<MemoryGraphEngine>` + `processSignalsBound: boolean` + `bindProcessSignalsOnce()`. Constructor adds `this` to the registry and calls bindProcessSignalsOnce() (idempotent — only first call binds the 3 process listeners). On signal, the single handler iterates the registry (via Array.from snapshot to handle Set mutation during shutdown) and calls shutdown() on each. shutdown() now removes `this` from the registry so subsequent signals don't re-iterate dead instances.

New diagnostic surface: `MemoryGraphEngine.getActiveEngineCount()` — static method exposing the registry size. Healthy MCP = 1; >1 means singleton drift (multiple module-import paths each constructing a "singleton"). Useful telemetry for the future MCP Watchdog responsiveness probe.

Tests (3 new, 33/33 total passing):
  - active-engine count tracks construct/shutdown lifecycle (delta +1/-1)
  - process listener counts for SIGINT/SIGTERM/beforeExit stay CONSTANT across 15 engine constructions — direct regression test for the leak (delta MUST be 0)
  - shutdown() is idempotent: second call doesn't throw, count doesn't double-decrement

Combined with U-GMHL01, MemoryGraphEngine is now:
  - hot-loop free (dirty-flag guard on saveCheckpoint)
  - listener-leak free (static bind-once on signals)
  - race-free on shutdown (single sequential iteration vs N parallel chains)

Build: esbuild build:fast OK. dist/index.js refreshed.
```

## Files touched (3)
- mcp-server/src/__tests__/MemoryGraphEngine.test.ts | 68 ++++++++++++++++++++++
- mcp-server/src/engines/MemoryGraphEngine.ts        | 63 +++++++++++++++++---
- 2 files changed, 124 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f8379fdebdf0`
- Milestone envelope: `mcp-server/data/milestones/GOLF-HIGHRROI-MCP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._