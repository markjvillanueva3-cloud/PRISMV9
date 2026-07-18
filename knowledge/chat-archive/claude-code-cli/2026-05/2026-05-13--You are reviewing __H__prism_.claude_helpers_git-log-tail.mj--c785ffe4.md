---
type: "chat-session"
source: "claude-code-cli"
session_id: "c785ffe4-cff7-477e-b466-ab1899a5842e"
title: "You are reviewing **H:/prism/.claude/helpers/git-log-tail.mjs** end-to-end as pa"
date: "2026-05-13"
first_ts: "2026-05-13T15:59:48.905Z"
last_ts: "2026-05-13T16:00:52.599Z"
cwd: "H:\\prism\\mcp-server"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-a2b71b70dfafc3ab0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# You are reviewing **H:/prism/.claude/helpers/git-log-tail.mjs** end-to-end as pa

> **claude-code-cli** | 2026-05-13 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-a2b71b70dfafc3ab0.jsonl`

## Transcript

### User | 2026-05-13T15:59:48.905Z

You are reviewing **H:/prism/.claude/helpers/git-log-tail.mjs** end-to-end as part of the PRISM per-file scrutiny gate (mandated by CLAUDE.md §PER-FILE SCRUTINY GATE).

CONTEXT — what this file is:
- U-CLEANUP-B3 of the CLEANUP-MS0 milestone (spec: H:/prism/state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md §Subsystem B.B3).
- Canonical git-log poll helper. Every PRISM consumer that polls git log (B1 PeerCommitAuditorEngine, B4 reviewer-dispatch planner, F2 envelope-drift cron, G6 inventory-freshness, etc.) must call THIS module instead of reimplementing the git invocation. Without it, drift in timeout/lock-retry/NUL-byte parsing surfaces only after weeks of fleet operation.
- Exports `tail({sinceIso, repoRoot, excludeAuthors, gitBin})`, `loadLastPollIso(path)`, `saveLastPollIso(iso, path)`.
- Returns `{commits: Commit[], error?: string, lockRelated?: boolean}` where Commit is `{sha, author, isoDate, subject, files[]}`.
- isoDate ALWAYS UTC-Z (R2-UU4 from spec).
- State file (`.watchdog-last-poll.iso`) is JSON with `schemaVersion: 1` wrapper (R3-VER1 forward-compat).
- Lock retry: 3 retries with linear backoff (250/500/1000ms) when stderr mentions index.lock / cannot lock ref / Another git process.
- Uses ASCII 0x1F as field separator in `--pretty=format:%H%x1F%an%x1F%aI%x1F%s` because Node spawnSync rejects NUL bytes in args.
- Resolves git binary via env PRISM_GIT_BIN → C:/Program Files/Git/mingw64/bin/git.exe → bare "git" (PATH fallback). Needed because vitest child PATH on Windows is sparse.
- Empty-repo stderr (`does not have any commits yet` / `bad default revision 'HEAD'` / `ambiguous argument 'HEAD'` / `unknown revision or path not in the working tree`) → treated as `commits=[]` with NO error.
- repoRoot precondition check (existsSync + .git existsSync) was added because on Windows, spawnSync sometimes returns status=0 with empty output when cwd is a non-git dir, masking the error path.

CONTEXT — the 20-test suite at H:/prism/mcp-server/src/__tests__/gitLog
... [+2647 chars truncated]

### Assistant | 2026-05-13T16:00:09.566Z

I'll review the file end-to-end, comparing against the canonical helpers and testing claims against actual code.

### Assistant | 2026-05-13T16:00:09.949Z

[tool_use: Read]

### Assistant | 2026-05-13T16:00:10.340Z

[tool_use: Read]

### Assistant | 2026-05-13T16:00:10.687Z

[tool_use: Read]

### User | 2026-05-13T16:00:19.281Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * git-log-tail.mjs — U-CLEANUP-B3 canonical git-log poll helper.
4	 *
5	 * Wraps `git log --since=<iso> --name-only --pretty=...` so every PRISM
6	 * consumer (B1 PeerCommitAuditorEngine, B4 reviewer-dispatch planner, F2
7	 * envelope-drift cron, G6 inventory-freshness, etc.) uses ONE poll primitive.
8	 * Without this, every consumer reimplements the same git invocat
... [+14489 chars truncated]

### User | 2026-05-13T16:00:19.441Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * stable-session-id.mjs — Generates a stable session ID that persists across hook invocations
4	 *
5	 * Problem: Hooks get new PIDs each invocation, so using $PPID creates phantom sessions.
6	 * Solution: Generate a UUID on first invocation for this terminal window, cache it by
7	 *           a stable identifier (WT_SESSION, terminal title hash, or fallback to machin
... [+16794 chars truncated]

### User | 2026-05-13T16:00:20.197Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * per-agent-handoff.mjs — Per-Terminal Handoff & Pickup Queue System
4	 *
5	 * Solves: multiple Claude/Codex terminals clobbering a single HANDOFF.md
6	 * when they compact or stop simultaneously.
7	 *
8	 * Design:
9	 *   - Each terminal writes its own handoff: state/shared/handoffs/HANDOFF-{instance}.md
10	 *   - On stop, unfinished work moves to state/shared/PICKUP
... [+32057 chars truncated]

### Assistant | 2026-05-13T16:00:52.599Z

Acknowledged. This is a read-only review — no new manual workflow being taught, no command-bridge changes proposed. Proceeding with findings.

## Findings — git-log-tail.mjs

**[P0] Lock-retry timeout budget exceeds spec (lines 59-61, 127-163)**
With `GIT_TIMEOUT_MS=8000` and 3 retries with backoff `[250, 500, 1000]`, worst case is `4 × 8000 + 1750 = 33.75s` — exceeds the 30s Stop budget and CLAUDE.md timeout class. The "3 × 8s = 24s" framing in the review prompt is wrong; with the initial attempt plus 3 retries it's 4 attempts. Six chats simultaneously locked = compound livelock. **Fix:** cap total wall time at 20s (e.g. track elapsed across attempts and abort early), or reduce to 2 retries.

**[P0] `sleepSync` busy-wait pegs a CPU core (lines 100-103)**
Spinning `while (Date.now() < until)` for up to 1000ms × 3 = 1.75s of 100% CPU. With 6 chats × golf-watchdog hitting lock contention, this is a measurable load spike on a developer workstation. **Fix:** use `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)` for true synchronous sleep, or use `child_process.execFileSync` of `node -e 'setTimeout(()=>process.exit(),N)'` if Atomics is unavailable.

**[P1] `loadLastPollIso` is NOT race-safe against in-flight `saveLastPollIso` (lines 204-214, 216-227)**
`readFileSync(path, "utf-8")` on Windows NTFS during a concurrent `renameSync` can throw EBUSY/EPERM (rename briefly holds an exclusive handle). Caught by the bare `try/catch` → silently returns `null` → caller re-polls from epoch → re-emits every commit in the repo. Compare `per-agent-handoff.mjs:34-43` which retries on tmp-file collision; this helper has no retry. **Fix:** retry `readFileSync` 2-3 times with 50ms backoff on EBUSY/EPERM/ENOENT (the rename window).

**[P1] `loadLastPollIso` never checks `schemaVersion` (lines 204-214)**
The R3-VER1 doctrine claims forward-compat but the loader reads `parsed.sinceIso` regardless of `schemaVersion`. A v2 schema that renames `sinceIso` → `sinceUtc` will silen
... [+3398 chars truncated]
