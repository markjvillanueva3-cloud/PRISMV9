---
name: reference-u-coord05-hook-wiring
description: "U-COORD05 — wired CrossSessionOrchestratorEngine into the harness Edit/Write lifecycle via .claude/hooks/cross-session-orchestrator.mjs (T1). Shipped 2026-05-13 slot ALPHA claude-12128945, commit 2a5666de2, 31/31 vitest pass, 3-of-3 inline ledger PASS, no peer-clobber."
aliases: reference_u_coord05_hook_wiring
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.994Z
---


# U-COORD05 — Wire Orchestrator to Hook System (shipped)

**Shipped:** 2026-05-13 (slot ALPHA, `claude-12128945`)
**Commit:** `2a5666de2` (8 files / +754 / -12)
**Tests:** 31/31 vitest pass across 3 isolated runs (`crossSessionOrchestratorHook.test.ts`)
**Scrutiny:** 3-of-3 ledger PASS — inline self-review (subagents quota-blocked until 22:20 CT; H-series script-pattern precedent applied)

## What it does

`.claude/hooks/cross-session-orchestrator.mjs` (T1, 219 LOC) bridges the Claude Code harness `Edit`/`Write`/`MultiEdit`/`NotebookEdit` lifecycle into [[reference_h8_coordination_store]]'s upstream peer — `CrossSessionOrchestratorEngine` (U-COORD04). Lets every live PRISM session see when peers start/finish editing a file, without scraping commit logs or ChatBus claims.

- **PreToolUse `--pre`** → `orchestrator.isFileClaimedByOther` (advisory; block under `PRISM_COORD_ORCH_BLOCK=1`) + `claim()` + broadcast `{type:"info", content:"edit_started", payload:{file,tool,session}}`
- **PostToolUse `--post`** → `orchestrator.release()` + broadcast `{type:"cache_invalidate", payload:{file,tool,action:"edited",session}}`

## Knobs (in priority order)

- `PRISM_COORD_ORCH_DISABLE=1` — skip all logic (no engine load, no broadcast). Rollback knob.
- `PRISM_COORD_ORCH_BLOCK=1` — opt-in hard-block when a peer session holds the claim. Default is advisory-only (broadcast happens; no block).
- `PRISM_COORD_ORCH_TTL_MS=N` — override default 15-min claim TTL. NaN/Infinity sanitized.
- `PRISM_COORD_ORCH_DIST=<file://url>` — override dist engine module path. Tests only.

## Why not just extend `file-claim-guard.mjs`?

`file-claim-guard.mjs` owns the **ChatBus** claims hard-block contract (different backend — `state/shared/chat-bus/claims/*.json`). This hook owns the **AtomicClaimBroker** observability layer (`state/shared/ATOMIC_CLAIMS.json` + `BROADCAST_CHANNEL.jsonl`). The two coexist intentionally; semantics differ (hard-block vs. advisory + broadcast event emission).

The new hook ALSO adds `NotebookEdit` coverage that file-claim-guard does NOT have.

## Critical gotchas (for U-COORD06+ and similar wiring work)

1. **`engine.broadcastMessage` vs `engine.broadcast`** — the post-U-COORD04 source uses `broadcastMessage`, but stale dist may still expose `broadcast` (the pre-refactor sync `appendFileSync` form). Hook ships a `getBroadcaster()` shim that tolerates BOTH. Don't assume dist is fresh.
2. **Fire-and-forget broadcasts lose events on short-lived hooks** — `void Promise.resolve().then(...).catch(...)` was tried first and dropped events because the hook process exits before the microtask flushes. Fix: `await Promise.race([broadcaster(msg), new Promise(r=>setTimeout(r,250))])` — bounded wait, guarantees the disk write completes for sync broadcasters, caps latency for async ones.
3. **Windows shebang gap** — `H:/.claude/bin/portable-node` is a bash shebang script. Node.spawnSync on Windows cannot resolve it without `shell:true`. Tests use `process.execPath` instead. Production hook command in settings.json works fine because the harness uses the proper invocation.
4. **NotebookEdit uses `notebook_path`, NOT `file_path`** — extractFilePath() branches on `toolName === "NotebookEdit"`. Test enforces this (a payload with `file_path` only on NotebookEdit → no-op).
5. **Test legitimacy gate is strict** — `typeof X .toBe("string")` is rejected as "weak presence-only assertion". Use concrete regex matches (`FACADE_SESSION_RE.test(session)`) or exact-equality (`expect(x).toBe(exactValue)`). The gate also rejects `.toBeDefined()`, `.toBeNull()`, `.toBeTruthy()`.
6. **Pre-existing broken imports in `MultiModelConsensusEngine.ts`** block `npm run build:fast`. Out of scope for U-COORD05. The hook works against stale dist via the broadcaster shim — `INTEL-OLLAMA` chat owns that cleanup.

## Files touched (8)

```
NEW  .claude/hooks/cross-session-orchestrator.mjs              219 LOC, T1
NEW  mcp-server/src/__tests__/crossSessionOrchestratorHook.test.ts  490 LOC
MOD  mcp-server/data/milestones/COORD-MS0.json                 (U-COORD05 pending→complete + ship_notes)
MOD  mcp-server/data/roadmap-index.json                        (last_modified bump)
MOD  state/shared/{MILESTONE_PROGRESS,BUILD_STATE}.{json,md}   (regen)
EXT  C:/Users/wompu/.claude/settings.json + H:/.claude/settings.json
       PreToolUse[1] filled with --pre command
       PostToolUse new entry matcher "Edit|Write|MultiEdit|NotebookEdit" with --post command
       (settings outside git tree; .bak backup at .bak-u-coord05-<ts>)
```

## Verification commands

```bash
# Hook fires + broadcasts:
echo '{"tool_name":"Edit","tool_input":{"file_path":"X.txt"}}' \
  | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/cross-session-orchestrator.mjs --pre
# Expect: {"continue":true} and a new line in H:/prism/state/shared/BROADCAST_CHANNEL.jsonl

# Test sweep:
cd H:/prism/mcp-server && npx vitest run src/__tests__/crossSessionOrchestratorHook.test.ts
# Expect: 31 passed

# Verify settings wiring:
node -e "const s=require('H:/.claude/settings.json'); console.log('PRE[1] hooks:', s.hooks.PreToolUse[1].hooks.length); console.log('POST last matcher:', s.hooks.PostToolUse[s.hooks.PostToolUse.length-1].matcher);"
```

## Status of COORD-MS0 (post-ship)

8/12 complete. Pending: U-COORD02 (Optimistic Locking), U-COORD06 (Startup Banner — Session Count Display), U-COORD09 (Ambient Awareness Badge), U-COORD12 (Checksum Validation on Read).

Companion to [[reference_h8_coordination_store]] (SQLite WAL claim backend), [[reference_u_coord11_ipc]] (named-pipe IPC for hook queries), [[reference_u_coord08_harden_ship]] (CrossTerminalBroadcast trim + setMaxListeners). Extends [[feedback_always_close_out]] — envelope + MILESTONE_PROGRESS + BUILD_STATE + roadmap-index + chat-bus all touched in single session.
