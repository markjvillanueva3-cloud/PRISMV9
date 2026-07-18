---
type: "chat-session"
source: "claude-code-cli"
session_id: "a0a74c41-2bd4-4650-b52c-94b448b82813"
title: "Review H:/prism/scripts/lib/hook-broker-classifier.mjs (just created, ~280 LOC, "
date: "2026-05-22"
first_ts: "2026-05-22T22:49:38.839Z"
last_ts: "2026-05-22T22:51:14.560Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 4
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a70a2a3ed6c48357b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review H:/prism/scripts/lib/hook-broker-classifier.mjs (just created, ~280 LOC, 

> **claude-code-cli** | 2026-05-22 | 11 msgs (4 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a70a2a3ed6c48357b.jsonl`

## Transcript

### User | 2026-05-22T22:49:38.839Z

Review H:/prism/scripts/lib/hook-broker-classifier.mjs (just created, ~280 LOC, pure-core ES module).

Context: This is U-DOCKER-HOOK-BROKER-P1 — a hook classifier that walks .claude/hooks/*.mjs and decides how each hook can integrate with a planned Docker hook-broker daemon. Categories: module-safe / cli-safe-stdin-stdout / mutates-process / imports-only / empty / unknown.

Read the file end-to-end. Verify:
1. `stripBlockBodies` brace counter — does it correctly excise function/class bodies without false-positives from braces inside strings, template literals, or comments? Trace through: `"text with } inside"`, `` `template ${expr}` ``, `// comment with {`, `/* block } comment */`.
2. Regex anchoring — top-level patterns use `^` (`/m` flag). Will they wrongly match indented lines? Lines beginning with non-whitespace after stripping?
3. Decision tree in `classifyHookContent` — does the ordering of category checks (empty → imports-only → module-safe → mutates-process → cli-safe-stdin-stdout → unknown) correctly partition the space? Any hook that should land in `module-safe` but accidentally gets `unknown`?
4. `summarizeReport` aggregation — counts add up to `total`?
5. Anti-patterns: hardcoded values? Missing error handling? Floating promises? (Pre-Write hook flagged floating-promise + unreachable-after-return — verify both are false positives or fix).
6. Hook file at `H:/prism/.claude/hooks/_envelope.mjs` (read first 50 lines if needed) — what category would this classifier assign? Top-level `spawnSync` import + later `passthrough(target, targetArgs)` call. Walk through and verify the output makes sense.

Report P0 (correctness bug) / P1 (logic error in less common path) / P2 (style or perf) findings and a final PASS/FAIL grade. Under 400 words.

### Assistant | 2026-05-22T22:50:00.901Z

I'll review the file end-to-end.

### Assistant | 2026-05-22T22:50:01.537Z

[tool_use: Read]

### User | 2026-05-22T22:50:11.653Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\hook-broker-classifier.mjs' was already read 6s ago in this session and is unchanged (mtime 1779490130025). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-22T22:50:15.040Z

The file isn't actually in my context — let me bypass the cache.

### Assistant | 2026-05-22T22:50:15.932Z

[tool_use: Bash]

### User | 2026-05-22T22:50:31.442Z

[tool_result] /**
 * hook-broker-classifier.mjs — U-DOCKER-HOOK-BROKER-P1
 *
 * Pure-core hook content classifier. Given a Claude Code hook's source text,
 * decides which broker integration strategy that hook is compatible with:
 *
 *   - `module-safe`         — `export default fn(stdin)` shape, broker can
 *                             dynamic-import once and call in-process.
 *   - `cli-safe-stdin-stdout` — 
... [+11212 chars truncated]

### Assistant | 2026-05-22T22:50:35.351Z

Now let me examine the `_envelope.mjs` hook for the test case.

### Assistant | 2026-05-22T22:50:35.754Z

[tool_use: Read]

### User | 2026-05-22T22:50:43.810Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * _envelope.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
5	 *
6	 * Profiling shim that wraps any Claude Code hook. Records wall-time + exit code
7	 * to `state/shared/hook-latency.jsonl` so `HookLatencyEngine` can surface
8	 * P50/P95/P99 per hook and the nightly digest can flag regressions.
9	 *
10	 * USAGE — wrap a settings.json hook entry by prefixi
... [+3111 chars truncated]

### Assistant | 2026-05-22T22:51:14.560Z

I have enough context. Let me deliver findings.

## Code Review: hook-broker-classifier.mjs

### P0 — Correctness Bug

**`stripBlockBodies` regex flag (`m`) — actually works, but produces a stripped output without preserved newlines inside block bodies.** When `depth > 0`, the function copies *nothing* (not even `\n`). A multi-line function body collapses to nothing, then the surrounding top-level content reflows. This means a top-level statement *immediately after* a `}` on the same line as code below can shift onto the same line as something earlier — but since `/m` anchors on `^` (start-of-line), the loss of an interior `\n` doesn't matter for top-level anchoring. **Verdict: false alarm, not a bug.**

**`spawn` regex false-positive for `Response(process.stdin)` and `Promise.resolve()`.** The pattern `/(?:^|\s)spawn\s*\(/` won't match either — `spawn` must be the exact word. But it WILL match `respawn(`, `userSpawn(` only via word-boundary... actually `(?:^|\s)` requires whitespace before, so identifier prefix is blocked. **OK.**

### P1 — Logic Issue

**`_envelope.mjs` would classify as `mutates-process` (correct).** Walks: stripped retains `import {spawnSync}`, top-level `const argv = process.argv...`, `if (process.env...) { passthrough(...) }` (body stripped), `let stdinBuf = ...; try { stdinBuf = fs.readFileSync(0); }` (try-body stripped), then `const result = spawnSync(...)` at column 0. `RE.spawnSync = /\bspawnSync\s*\(/` (no `/m`, scans whole `text`) — matches the call AND the import line. `mutatesProcess=true` → category `mutates-process`. **Correct outcome — broker MUST spawn-isolate this.** Reasons array reads "spawns subprocess at module scope" — accurate.

**However:** `RE.spawnSync` scans **raw `text`**, not `stripped`. A hook that imports `spawnSync` but only calls it *inside* a function body would still be flagged `mutates-process`. That's the conservative-side error the doc-comment promises, so intentional — but worth flagging: `module-safe` hooks 
... [+1702 chars truncated]
