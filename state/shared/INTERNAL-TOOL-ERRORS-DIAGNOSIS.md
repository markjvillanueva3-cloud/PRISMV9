# Internal Tool Errors — Root Cause Diagnosis

Generated: 2026-05-07T15:00:00Z

## Symptoms

- Many `bash.exe` / `node.exe` / `git.exe` processes accumulating in Task Manager
- "Internal tool errors" surfacing during normal Bash/Edit/Write tool calls
- Memory pressure (8.7 GB node-orphan headroom seen at peak)

## Root Cause

The `stale-claim-sweeper.mjs::sweepZombieNodeHooks` reaper has a `parent_alive` protection rule:

```javascript
// Only kill orphans (parent dead) — protects hooks of active claude.exe sessions
if (c.parent_alive) continue;
```

This is correct in spirit (don't kill live session hooks) but wrong at the boundary: hooks that *should* self-exit in <30s but get wedged (stuck on stdin, deadlocked HTTP fetch, etc.) survive because their parent `claude.exe` is still running.

### Two specific zombie classes observed

1. **`mcp-http-bridge.mjs` instances**: 6 spawned ~10 seconds apart at session start, all stuck. Each was waiting for an HTTP response from an MCP server that never replied. Memory: ~270 MB total.

2. **PostToolUse hook cascade**: 5 sibling hooks (`anti-regression-auto-sweep`, `auto-bug-hunt-after-build`, `error-recovery-memory`, `efficiency-monitor`, `error-learner-hook`) all spawned in the same millisecond from a single Bash tool call, all hung waiting on each other or on stdin. Memory: ~190 MB.

### Feedback loop

- Each tool call triggers PostToolUse hooks that spawn fresh node processes
- Wedged ones survive the sweeper (parent alive)
- New tool calls add more
- Process table fills, Windows starts denying spawns ("internal tool errors")
- More wedged hooks → faster degradation

## Fix Applied

`H:/prism/.claude/hooks/stale-claim-sweeper.mjs`:

Added `NODE_HOOK_HARD_KILL_AGE_MS = 15 * 60 * 1000` and updated the kill loop:

```javascript
const hardKill = c.age_ms > NODE_HOOK_HARD_KILL_AGE_MS;
if (c.parent_alive && !hardKill) continue;
```

Hooks older than 15 minutes are now killed regardless of parent state. Hooks normally complete in <30s, so 15-min escalation has zero false-positive risk while catching wedged ones.

## Other Findings (not the root cause)

- `c-to-h-mirror.mjs` line 134 — `fileName` ReferenceError fixed in earlier session. This was a separate issue causing stderr noise but not orphan accumulation.
- 2,367 ownership claims accumulated in workboard. Sweeper is keeping vs reaping them based on heartbeat. Not contributing to process count but worth a follow-up cleanup.

## Operator Actions

- Closing/exiting paused chat sessions cleanly (chat exit Stop hook fires `bash-orphan-cleaner` and `stale-claim-sweeper` properly)
- Ctrl+C interrupt mid-tool-call leaks the spawned node — the cleaner will catch within 15 min after this fix
- For one-off cleanup: `taskkill /F /IM node.exe` kills all node procs (nuclear option, kills MCP servers too — only safe between sessions)

## Verification

After this fix lands and a sweeper cycle runs:
- `zombieNodes=N/N` lines in `state/shared/stale-claim-sweeper.log` should show `swept` matching `found` for hooks >15 min old
- Total node.exe count over a multi-hour session should plateau, not climb monotonically
