---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Independent review of H:/prism/.claude/hooks/task-freshness-gate.mjs (read the W"
date: "2026-05-18"
first_ts: "2026-05-18T00:42:46.345Z"
last_ts: "2026-05-18T00:44:43.761Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 13
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a40f1a50339e7064b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Independent review of H:/prism/.claude/hooks/task-freshness-gate.mjs (read the W

> **claude-code-cli** | 2026-05-18 | 31 msgs (13 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a40f1a50339e7064b.jsonl`

## Transcript

### User | 2026-05-18T00:42:46.345Z

Independent review of H:/prism/.claude/hooks/task-freshness-gate.mjs (read the WHOLE file). It's a new PreToolUse(Bash) sub-hook inside bash-bundle.mjs that blocks `slot-task-claim.mjs claim --unit <X>` when the unit source is stale. The helper it imports (../helpers/task-freshness.mjs) already passed 2-reviewer scrutiny — focus on THIS file and integration, not the helper internals.

Weight your attention on what a correctness reviewer misses:

1. **Bundle integration correctness**: hook-runner.mjs spawns this child, reads stdout, and aggregates: `decision==="block"` OR `continue===false` → bundle denies. This hook emits `{decision:"block",reason,systemMessage}` with exit code 2. Is exit-2 correct/required here, or does the bundle only read stdout JSON (making the exit code irrelevant/possibly harmful)? Cross-check against how OTHER bundled sub-hooks (commit-ownership-guard.mjs, git-add-lane-guard.mjs) signal a block — do they exit 2 or exit 0 with JSON? A wrong exit code could make the bundle mis-handle the block. This is the highest-risk integration point.

2. **emit() double-exit / truncation**: `emit()` writes stdout then process.exit in a callback with a 2000ms unref fallback. Under the documented Windows pipe-truncation issue (hook-runner.mjs documents this exact hazard), can a block reason (~1.5KB) be truncated before flush, making the bundle see empty output and treat a BLOCK as a no-op (silent gate-bypass — the exact class hook-runner.mjs warns about)? Is the write-callback-then-exit pattern correct?

3. **Re-claim / heartbeat false-block**: the autonomous /loop re-claims units with --phase to heartbeat. The CLAIM_RE matches ANY `...claim...`. Scenario: chat claims unit (acked, stamp written), 30min ack TTL expires, /loop heartbeats the SAME unit it's actively building → gate re-evaluates → if still stale → BLOCKS an in-progress build mid-loop. Is that a P1 false-block? Should the hook detect "this chat already holds this claim" (read slot-task-claims.json
... [+900 chars truncated]

### Assistant | 2026-05-18T00:42:56.866Z

I'll review the file and cross-check the integration points.

### Assistant | 2026-05-18T00:42:57.085Z

[tool_use: Read]

### Assistant | 2026-05-18T00:42:57.245Z

[tool_use: Read]

### User | 2026-05-18T00:42:58.046Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-18T00:42:59.533Z

[tool_result] 1	#!/usr/bin/env node
2	// task-freshness-gate.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)
3	// tier: T1
4	//
5	// PreToolUse(Bash) gate enforcing CLAUDE.md doctrine R13: a task generated
6	// before recent fleet activity may already be shipped / rescoped / invalid.
7	// This hook intercepts `slot-task-claim.mjs claim --unit <MS::U-ID>` — the
8	// moment a chat commits to building a unit — 
... [+8325 chars truncated]

### Assistant | 2026-05-18T00:43:02.308Z

Let me find the bundle runner and cross-check sibling sub-hooks.

### Assistant | 2026-05-18T00:43:03.820Z

[tool_use: Bash]

### User | 2026-05-18T00:43:11.458Z

[tool_result] -rwxr-xr-x 1 wompu 197611  9862 May 12 21:15 H:/prism/.claude/hooks/commit-ownership-guard.mjs
-rwxr-xr-x 1 wompu 197611 18021 May 16 08:41 H:/prism/.claude/hooks/git-add-lane-guard.mjs
---
bundles/
stop-bg-runner.mjs  3.9K

### Assistant | 2026-05-18T00:43:14.327Z

[tool_use: Bash]

### User | 2026-05-18T00:43:22.469Z

[tool_result] __tests__/
lib/
bash-bundle.mjs  2.3K
edit-bundle.mjs  8.5K
posttool-bash-read-bundle.mjs  4.2K
posttool-edit-bundle.mjs  6.5K
read-bundle.mjs  1.6K
sessionstart-bundle.mjs  4.9K
smoke-test.mjs  5.5K
stop-bundle.mjs  5.0K
stop-regression-bundle.mjs  6.3K
---BASH BUNDLE---
H:/prism/.claude/hooks/bundles/bash-bundle.mjs  2.3K
H:/prism/.claude/hooks/bundles/posttool-bash-read-bundle.mjs  4.2K

### Assistant | 2026-05-18T00:43:25.726Z

[tool_use: Read]

### Assistant | 2026-05-18T00:43:27.091Z

[tool_use: Bash]

### User | 2026-05-18T00:43:27.565Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	// bash-bundle.mjs — single PreToolUse hook for Bash. Replaces the 6-hook
4	// Bash matcher in settings.json with one bundled invocation.
5	
6	import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";
7	
8	const HOOK_BASE = "H:/prism/.claude/hooks";
9	const HELPER_BASE = "H:/prism/.claude/helpers";
10	
11	const BASH_HOOKS = [
12	  { path: `${HELPER_B
... [+2143 chars truncated]

### User | 2026-05-18T00:43:32.354Z

[tool_result] Exit code 1
hook-runner.mjs  11.2K
obsidian-cache.mjs  3.9K
ollama-fuse.mjs  4.3K
---

### Assistant | 2026-05-18T00:43:35.185Z

Note: `task-freshness-gate.mjs` is NOT in the `BASH_HOOKS` array — it's not yet wired. That's a finding. Now the runner.

### Assistant | 2026-05-18T00:43:35.247Z

[tool_use: Read]

### User | 2026-05-18T00:43:35.755Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\bundles\lib\hook-runner.mjs' was already read 4m ago in this session and is unchanged (mtime 1778638513938). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T00:43:38.892Z

I have hook-runner.mjs in context from earlier. Let me grep the exact block-detection logic to be precise.

### Assistant | 2026-05-18T00:43:40.518Z

[tool_use: Grep]

### User | 2026-05-18T00:43:41.169Z

[tool_result] 3:// Spawns each hook as a child process, pipes stdin, collects stdout/stderr,
8://   stdout = JSON {decision?, reason?, additionalContext?, hookSpecificOutput?}
10://   exit 0 = continue, exit 1 = warning, exit 2 = block
13://   - ANY hook returning decision="deny" or permissionDecision="deny" → bundle blocks
56:      return resolve({ hook: hookPath, exitCode: -1, elapsed: Date.now() - start, tim
... [+2029 chars truncated]

### Assistant | 2026-05-18T00:43:41.429Z

[tool_use: Grep]

### User | 2026-05-18T00:43:42.075Z

[tool_result] 229:      console.log(JSON.stringify({ decision: "block", reason: msg }));
254:    console.log(JSON.stringify({ decision: "block", reason: msg }));

### Assistant | 2026-05-18T00:43:44.488Z

This is decisive. Let me confirm sibling hooks' exit codes and the child-spawn parser tolerance.

### Assistant | 2026-05-18T00:43:46.619Z

[tool_use: Bash]

### User | 2026-05-18T00:43:52.815Z

[tool_result] /usr/bin/grep: Unmatched ( or \(
===GIT-ADD-LANE===
365: * to allow or a {decision,reason} object to block. Tests drive this directly.
393:    decision: "block",

### Assistant | 2026-05-18T00:43:56.295Z

[tool_use: Bash]

### User | 2026-05-18T00:44:02.683Z

[tool_result] ===git-add main/emit===
/usr/bin/grep: Unmatched ( or \(

### Assistant | 2026-05-18T00:44:07.442Z

[tool_use: Bash]

### User | 2026-05-18T00:44:15.427Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'process.exit'
---tail commit-own---
    const msg = [
      `⚠ COMMIT BLOCKED: ${foreignFiles.length}/${staged.length} files (${foreignPct.toFixed(0)}%) belong to other sessions.`,
      "",
      "Files owned by other sessions:",
      ...foreignFiles.slice(0, 10).map(f => `  - ${f.file
... [+914 chars truncated]

### Assistant | 2026-05-18T00:44:43.761Z

Confirmed. I now have everything needed.

---

## Review: `task-freshness-gate.mjs` — **FAIL**

The blocker is integration finding #1, exactly the highest-risk point flagged.

### P0 — Exit code 2 on a bundled sub-hook causes the block to be SILENTLY DROPPED (line 202)

The bundle child-reader (`hook-runner.mjs:65-66`) reads **only `stdout` JSON**: `if (stdout.trim()) { try { parsed = JSON.parse(stdout.trim())...`. The block decision is detected purely from `r.parsed.decision === "block"` (line 188). **The child exit code is never read for block detection** — `exitCode` is captured (line 66) but only `parsed` drives `blocked` (lines 186-196).

The canonical sibling pattern proves the contract: `commit-ownership-guard.mjs` emits `console.log(JSON.stringify({decision:"block",reason}))` then `return;` — **exit 0, no `process.exit(2)`**. Same for `git-add-lane-guard.mjs:393` (`decision:"block"`, returned to caller, no exit-2). The bundle itself re-derives the outward exit code (`hook-runner.mjs:282`: `code = response.continue===false ? 2 : 0`) — the *bundle* owns exit-2 to Claude, sub-hooks must not.

`emit({...}, 2)` (line 202) calls `process.exit(2)` in the stdout write-callback. On the documented Windows pipe race (`hook-runner.mjs:273-278`: "process.exit() can lose buffered stdout … causing a *blocking* bundle as a no-op (gate-bypass)"), a ~1.5KB reason (lines 184-200) can be killed before flush. The 2000ms `setTimeout` fallback (line 65) does **not** help — the callback fires on flush *or* the timer races `exit(2)`; `child.stdout` may be destroyed by the bundle's drain logic (`:91`) before flush completes. If stdout is empty, `parsed===null`, `blocked` stays false — **a STALE unit claim is silently allowed**. This is the exact gate-bypass class hook-runner.mjs warns about. Fix: `return emit({decision:"block",...})` with **code 0** (matching every sibling). All other `emit({})` calls already correctly use code 0.

### P1 — Hook is not wired (task #4 still pending; n
... [+2047 chars truncated]
