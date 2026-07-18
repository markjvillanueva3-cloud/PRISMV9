---
type: "chat-session"
source: "claude-code-cli"
session_id: "c785ffe4-cff7-477e-b466-ab1899a5842e"
title: "RE-SCRUTINY (second pass) of **H:/prism/.claude/helpers/git-log-tail.mjs** for P"
date: "2026-05-13"
first_ts: "2026-05-13T16:10:07.619Z"
last_ts: "2026-05-13T16:11:03.187Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-accb7d40c42e8a644.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# RE-SCRUTINY (second pass) of **H:/prism/.claude/helpers/git-log-tail.mjs** for P

> **claude-code-cli** | 2026-05-13 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-accb7d40c42e8a644.jsonl`

## Transcript

### User | 2026-05-13T16:10:07.619Z

RE-SCRUTINY (second pass) of **H:/prism/.claude/helpers/git-log-tail.mjs** for PRISM U-CLEANUP-B3.

Your prior pass returned VERDICT: FAIL with these blockers:
- **P0**: Lock-retry timeout budget (24-32s, over Stop 30s budget)
- **P0**: `sleepSync` busy-wait pegs CPU
- **P1**: `loadLastPollIso` race vs in-flight `saveLastPollIso` (EBUSY/EPERM window)
- **P1**: `loadLastPollIso` never checks `schemaVersion`
- **P1**: Atomic-write tmp leak on crash
- **P1**: `isMainEntry` basename match collides on shared filename

Fixes applied in this pass:
1. Added `GIT_LOG_TAIL_LIMITS` exported frozen config object with `MAX_LOCK_RETRIES=2`, `GIT_TIMEOUT_MS=6000`, `TOTAL_BUDGET_MS=20000`, `LOAD_RETRY_COUNT=3`, `LOAD_RETRY_DELAY_MS=20`, `TMP_RAND_BYTES=6`.
2. `runGitWithLockRetry` now tracks `startedAt` and aborts early when remaining budget < 500ms; per-call timeout shrinks to fit remaining budget.
3. `sleepSync` now uses `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)` with bounded busy-wait fallback ≤250ms.
4. `loadLastPollIso` retries 3× with 20ms delay on EBUSY/EPERM/ENOENT (NTFS rename window); explicit non-error path on JSON SyntaxError (returns null immediately, no retry).
5. `loadLastPollIso` now reads `schemaVersion`; warn-to-stderr if `ver > SCHEMA_VERSION`; still returns sinceIso (forward-compat best-effort).
6. `saveLastPollIso` now uses try/catch with explicit `unlinkSync(tmp)` on failure to prevent orphan tmp accumulation.
7. `saveLastPollIso` tmp filename adds `Math.random().toString(36).slice(2, 8)` suffix to prevent same-ms collisions.
8. `isMainEntry` now uses `pathToFileURL(resolve(process.argv[1])).href === import.meta.url` (full URL compare, not basename).
9. `parseLog` now validates `sha` is 40-hex and re-joins trailing 0x1F-split parts onto subject so author-name 0x1F injection cannot hijack `files[]`.
10. Added `// WIRE-EXEMPT: foundational seed helper for CLEANUP-MS0` tag at top of file.
11. Docblock `await tail(...)` corrected to `const 
... [+1058 chars truncated]

### Assistant | 2026-05-13T16:10:15.262Z

I'll analyze the current state of both files to verify the fixes.

### Assistant | 2026-05-13T16:10:15.641Z

[tool_use: Read]

### Assistant | 2026-05-13T16:10:16.161Z

[tool_use: Read]

### User | 2026-05-13T16:10:27.467Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * git-log-tail.mjs — U-CLEANUP-B3 canonical git-log poll helper.
4	 *
5	 * Wraps `git log --since=<iso> --name-only --pretty=...` so every PRISM
6	 * consumer (B1 PeerCommitAuditorEngine, B4 reviewer-dispatch planner, F2
7	 * envelope-drift cron, G6 inventory-freshness, etc.) uses ONE poll primitive.
8	 * Without this, every consumer reimplements the same git invocat
... [+21012 chars truncated]

### User | 2026-05-13T16:10:33.792Z

[tool_result] 1	/**
2	 * gitLogTail.test.ts — tests for .claude/helpers/git-log-tail.mjs (U-CLEANUP-B3)
3	 *
4	 * Coverage (per comprehensive-build-enforce floor):
5	 *   - Happy path: commits since cutoff returned with concrete field shapes
6	 *   - Empty: future cutoff → []; empty repo → []
7	 *   - Multi-file commit: exact file array contents asserted
8	 *   - Author-filter (golf self-attribution prep for G7
... [+18038 chars truncated]

### Assistant | 2026-05-13T16:11:03.187Z

## Re-Scrutiny Results — git-log-tail.mjs (Pass 2)

### Prior Findings

- **P0 — Lock-retry timeout budget (32s over Stop budget):** **RESOLVED**. `MAX_LOCK_RETRIES=2`, `GIT_TIMEOUT_MS=6000`, hard cap `TOTAL_BUDGET_MS=20000` enforced at lines 162-170 via `startedAt`/`elapsed`/`remaining` calculation. Worst case: 6s+0.25s+6s+0.5s+6s = ~18.75s ≤ 20s budget ≤ 30s Stop ceiling. Per-call timeout shrinks via `Math.min(GIT_TIMEOUT_MS, Math.max(remaining, 500))` (line 171) — 500ms floor prevents premature abort.

- **P0 — `sleepSync` CPU busy-wait:** **RESOLVED**. Lines 128-138 use `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)` which yields to OS scheduler. Fallback is bounded to ≤250ms (line 135) so even sandboxed Node builds can't peg CPU.

- **P1 — `loadLastPollIso` race vs in-flight save:** **RESOLVED**. Lines 277-303 retry 3× with 20ms delay (60ms total cap) on EBUSY/EPERM/ENOENT only. JSON SyntaxError bails immediately (line 296 returns `null` since SyntaxError has no `.code` field) — won't waste retries on malformed JSON.

- **P1 — `schemaVersion` never checked:** **RESOLVED**. Lines 285-288 read `parsed.schemaVersion`; warn-to-stderr if `ver > SCHEMA_VERSION`; still returns sinceIso (forward-compat). v0 (missing field) tolerated per test at line 302-305.

- **P1 — Atomic-write tmp leak:** **RESOLVED**. Lines 319-332 use `tmpWritten` flag + try/catch with `unlinkSync(tmp)` in catch. Best-effort cleanup; rethrows underlying error so caller sees the real failure.

- **P1 — `isMainEntry` basename collision:** **RESOLVED**. Lines 446-454 use `pathToFileURL(resolve(process.argv[1])).href === import.meta.url` (full URL comparison), wrapped in try/catch for safety.

### New Issues Found

**P3 (advisory) — `parseLog` block-split fragility on multi-line subjects:** Line 241 splits on `/\n\n/`. Git's `--pretty=format:` does NOT emit a trailing newline between commits when subject contains literal `\n\n` (rare but possible via `git commit -m $'line1\n\nline2
... [+2220 chars truncated]
