---
name: reference-h7-async-hook-dispatcher
description: HOOK-SYNERGY-MS0/U-HOOK-ASYNC-DISPATCH (H7) — AsyncHookDispatcherEngine decouples Tier-4 hooks from Stop critical path. Use to wrap slow background hooks so Stop never waits >30s.
aliases: reference_h7_async_hook_dispatcher
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.135Z
---


**H7 — AsyncHookDispatcherEngine** (shipped 2026-05-13, HOOK-SYNERGY-MS0/U-HOOK-ASYNC-DISPATCH):

Decouples Tier-4 (async/background) hooks from the synchronous Stop critical path. Vitest gates, deep-test-sweep, git-sync — anything documented as `// tier: T4` — should run through this engine so Stop wall-time stays bounded.

**Files:**
- Engine: `mcp-server/src/engines/AsyncHookDispatcherEngine.ts` (~650 lines)
- Tests: `mcp-server/src/__tests__/AsyncHookDispatcherEngine.test.ts` (42 tests, all green)
- Dispatcher: `prism_dev:async_dispatch` (case in `devDispatcher.ts`, schema in `devActionSchemas.ts`)
- Runner: `scripts/async-hook-runner.mjs` (detached-child entry point)
- Helper: `.claude/helpers/async-hook-enqueue.mjs` (settings.json wrapper, `// tier: T4`)

**How it works:**
1. Parent Stop hook calls `async-hook-enqueue.mjs --hook <path> --tier T4` (or any code calls `engine.enqueue({hookPath, tier, ...})`).
2. Helper writes a job descriptor to `state/shared/async-hook-queue.jsonl` and spawns `async-hook-runner.mjs --job-id <id>` as a **detached child** (`detached:true, stdio:"ignore"`, `.unref()`).
3. Parent returns `{"continue":true}` in <50 ms — wall time of the wrapped hook is irrelevant to Stop.
4. Detached runner calls `engine.runJob(jobId)`: spawns the wrapped hook synchronously, races against `timeoutMs` (default 5 min, cap 30 min), writes a result row to `state/shared/async-hook-results.jsonl`, removes the queue entry.
5. Next SessionStart hook surfaces recent failures via `engine.getResults({status:"failed"})`.

**Dispatcher (6 modes):**
- `prism_dev:async_dispatch action=enqueue job={hook_path, tier, event, matcher, tool, timeout_ms, ctx}` — append + spawn
- `... action=pending` — current queue contents (oldest first)
- `... action=results status=any|succeeded|failed|timeout|skipped hook=<basename> window_ms=N n=50` — filter past outcomes (newest first)
- `... action=stats window_ms=N` — per-hook P50/P95/max + failure rate (default 24h, max 30d)
- `... action=available` — cheap existence check
- `... action=purge older_than_ms=N` — drop entries older than cutoff from both JSONLs

**To migrate a Tier-4 hook**: in settings.json replace
```jsonc
{ "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/foo.mjs" }
```
with
```jsonc
{ "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/helpers/async-hook-enqueue.mjs --hook H:/prism/.claude/hooks/foo.mjs --tier T4" }
```

**Knobs:**
- `PRISM_ASYNC_HOOK_DISABLE=1` — helper-side rollback (returns `{"continue":true}` with a systemMessage, never enqueues)
- Engine constructor accepts `spawnFn`, `queuePath`, `resultsPath`, `runnerScript`, `nodeBin`, `now`, `jobIdFn` for tests

**Caps (`ASYNC_HOOK_LIMITS`):** SCHEMA_VERSION=1, MAX_QUEUE_DEPTH=200, DEFAULT_HOOK_TIMEOUT_MS=300000, ABSOLUTE_HOOK_TIMEOUT_MS=1800000, DEFAULT_WINDOW_MS=86400000, MAX_WINDOW_MS=2592000000, DEFAULT_RESULT_LIMIT=50, ABSOLUTE_RESULT_LIMIT=1000. JSONL auto-rotates at 50 MiB, records capped at 8192 bytes.

**Sibling fix in same commit**: pre-existing H6 wiring bug where `hook_fast_lane` was in the dispatcher's case handler but **missing from the ACTIONS enum** — Zod was rejecting the action before it reached the switch. This commit adds both `hook_fast_lane` and `async_dispatch` to the ACTIONS array so both H6 and H7 dispatcher actions are actually callable.

**Operator quick path**: `node -e "import('./mcp-server/dist/engines/AsyncHookDispatcherEngine.js').then(m => console.log(m.getAsyncHookDispatcherEngine().getStats()))"` to see current Tier-4 stats from any session.

**Related:** [[reference-h6-hook-fast-lane]] · [[reference-h4-hook-envelope]] · [[reference-h2-hook-registry]] · [[reference-h3-hook-tiers]]
