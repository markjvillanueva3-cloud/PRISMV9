---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Read-only review of a concurrency fix. Grade PASS or FAIL with P0/P1/P2 findings"
date: "2026-06-17"
first_ts: "2026-06-17T04:32:00.200Z"
last_ts: "2026-06-17T04:32:59.161Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-ab668d31f27933856.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Read-only review of a concurrency fix. Grade PASS or FAIL with P0/P1/P2 findings

> **claude-code-cli** | 2026-06-17 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-ab668d31f27933856.jsonl`

## Transcript

### User | 2026-06-17T04:32:00.200Z

Read-only review of a concurrency fix. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Do NOT edit.

FILES (read each end-to-end):
1. H:/prism/.claude/scripts/consensus-queue-drain.mjs  (the drain; I added a `claimNextEntry()` and rewrote `main()`)
2. H:/prism/.claude/scripts/consensus-queue-drain-lock.test.mjs  (new concurrency test)
3. H:/prism/scripts/lib/exclusive-file-lock.mjs  (the reused lock primitive — read its hold-duration contract + acquire/release semantics)

WHAT CHANGED + WHY:
The drain fires on EVERY chat's Stop across a 26-slot fleet. The OLD code read the whole queue, processed N entries, then `writeQueue(remaining)` ONCE at the end with NO lock — two concurrent drains clobbered each other (resurrected/lost entries + duplicate Ollama consensus spend). The fix: `claimNextEntry()` claims ONE entry atomically under a SHORT exclusive lock (read queue -> shift -> write remaining -> release), then the slow ~90s `engine.ask()` runs OUTSIDE the lock in `main()`'s loop. Semantics intentionally moved from at-least-once-WITH-RACE to at-most-once (claim-by-remove): a crash AFTER claim but BEFORE appendProcessed loses ONE in-flight entry — documented as acceptable for an advisory consensus-enrichment queue.

VERIFY SPECIFICALLY (weighted toward silent breakage / regression / concurrency correctness):
- Is the lock hold genuinely SHORT (only read-modify-write inside; engine.ask OUTSIDE)? The reused lock's `staleMs` default is 30s and mtime does NOT refresh during hold — confirm no path holds the lock across the 90s consensus call (that would let a peer steal it → race returns).
- Lock release: is `releaseExclusiveLock` in a `finally` so it always releases even if readQueue/writeQueue throws? Does it correctly release on the empty-queue early-return path?
- The `QUEUE_LOCK_PATH` derivation (`${QUEUE_PATH}.drain.lock`) — does a custom PRISM_CONSENSUS_QUEUE (test/env) get its OWN lock (isolation), and does the live default get a stable single fle
... [+937 chars truncated]

### Assistant | 2026-06-17T04:32:04.492Z

I'll review the three files end-to-end, then trace consumers of the output shape.

### Assistant | 2026-06-17T04:32:05.305Z

[tool_use: Read]

### Assistant | 2026-06-17T04:32:05.543Z

[tool_use: Read]

### Assistant | 2026-06-17T04:32:05.765Z

[tool_use: Read]

### User | 2026-06-17T04:32:06.588Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * consensus-queue-drain.mjs — drain the auto-fire consensus queue.
4	 *
5	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTO-FIRE.
6	 *
7	 * The hooks `auto-consensus-userprompt.mjs` and `auto-consensus-critical-edit.mjs`
8	 * both ENQUEUE pending consensus tasks instead of running consensus
9	 * inline (because consensus is 30-60s — too slow for any critical-pat
... [+11719 chars truncated]

### User | 2026-06-17T04:32:06.757Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: test
3	// Concurrency guard for the consensus-queue-drain LOCK fix (slot:bravo, 2026-06-17).
4	//
5	// The drain fires on EVERY chat's Stop across the 26-slot fleet; before this fix it
6	// read the whole queue, processed N, then writeQueue(remaining) ONCE at the end with
7	// NO lock -- two concurrent drains clobbered each other (resurrected/lost entries +
8	// du
... [+6346 chars truncated]

### User | 2026-06-17T04:32:06.978Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/exclusive-file-lock.mjs — the canonical ATOMIC cross-process file lock.
3	// (BRAIN-UPGRADE rank 12, 2026-05-30 slot:alpha.)
4	//
5	// ── Why atomic (O_EXCL), not read-decide-write ─────────────────────────────
6	// Acquire has two paths, NEITHER with a time-of-check-to-time-of-use (TOCTOU)
7	// window:
8	//   • fresh acquire — a single atomic `fs.openSync(lo
... [+7506 chars truncated]

### Assistant | 2026-06-17T04:32:11.989Z

All three files read end-to-end. Now let me trace the consumer of the output shape and confirm the release-pid semantics across process boundaries.

### Assistant | 2026-06-17T04:32:12.397Z

[tool_use: Read]

### Assistant | 2026-06-17T04:32:13.104Z

[tool_use: Grep]

### User | 2026-06-17T04:32:13.285Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * stop-consensus-drain.mjs — Stop hook that triggers async consensus queue drain.
5	 *
6	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTOFIRE.
7	 *
8	 * The auto-consensus hooks (UserPromptSubmit + PreToolUse-critical) enqueue
9	 * pending consensus tasks instead of running them inline (consensus is 30-60s,
10	 * far too slow for any critical-path
... [+2983 chars truncated]

### User | 2026-06-17T04:32:18.762Z

[tool_result] Found 39 files
state\shared\dashboards\injection-dedup-cache.json
state\session-reorientation\reorientation-claude-d6db4d0e.json
.claude\scripts\consensus-queue-drain-lock.test.mjs
state\shared\WORK_CLAIMS.json
mcp-server\data\state\session-file-ownership.json
.claude\scripts\consensus-queue-drain.mjs
knowledge\memories\reference\reference_octopus_include_codex_2026_06_10.md
knowledge\memories\ref
... [+1887 chars truncated]

### Assistant | 2026-06-17T04:32:23.341Z

The consumer `stop-consensus-drain.mjs` spawns the drainer detached and ignores stdout (`stdio: "ignore"`, line 65-69), so the output-shape change has no parsing consumer. Let me check the existing non-lock test file for any contract the new code might have broken, and verify the release-pid semantics one more time.

### Assistant | 2026-06-17T04:32:23.688Z

[tool_use: Read]

### User | 2026-06-17T04:32:24.603Z

[tool_result] 1	// Test -- consensus-queue-drain.mjs buildDrainVoiceBound (RATE-LIMIT-FIX local-only path).
2	//
3	// The drain fires on EVERY Stop across the ~10-session fleet. Its default voice
4	// bound MUST be local-only (no Claude/Codex/Grok/Gemini API spend) -- otherwise
5	// it is the exact org-wide rate-limit amplifier it was built to eliminate. The
6	// includeCodex:false key is load-bearing: without 
... [+1664 chars truncated]

### Assistant | 2026-06-17T04:32:59.161Z

I have everything needed. Let me verify one concrete correctness concern about the lock release pid by checking how `releaseExclusiveLock` is called in `claimNextEntry` versus how it stamps the pid.

The key trace: `acquireExclusiveLock(QUEUE_LOCK_PATH, {staleMs})` stamps `process.pid` (no `selfPid` override), and `releaseExclusiveLock(QUEUE_LOCK_PATH)` reads the lock and only unlinks if `owner === process.pid`. Same process, same default pid — consistent. All within one process. Good.

Now let me confirm the empty-queue early-return path releases the lock (the `finally` covers it) and check the `--max=0`/contention loop bound once more against the actual control flow.

Let me also verify there's no issue with the lock-free `readQueue()` peek at the top of `main()` racing with concurrent writers in a way that matters.

I've traced all paths. Here is my verdict.

---

VERDICT: PASS

summary: The lock fix is correct and well-constructed. The short critical section (read -> shift -> write) is genuinely inside the lock and the ~90s `engine.ask()` runs outside it, so the 30s-staleMs no-mtime-refresh contract is honored and a peer cannot steal a live lock mid-consensus. Release is in a `finally` (covers the empty-queue early-return and any throw), pid-stamp/pid-check are consistent within one process, the contention/empty paths are distinguished and bounded, the concurrency test has real teeth, and the only output-shape consumer ignores stdout entirely.

findings: none

Auditable trace of the consumers and edge-paths I verified (so this PASS is checkable):

1. Lock hold is short (the headline concern). `claimNextEntry` (`consensus-queue-drain.mjs:185-197`) holds the lock across only `readQueue()` -> `queue.shift()` -> `writeQueue()`. The slow call is `processEntry`/`engine.ask({timeoutMs:90_000})` (`:147-162`, `:224`) which runs in `main()`'s loop strictly AFTER `claimNextEntry()` returns — i.e. fully outside the lock. No path holds the lock across `engine.ask`. This sati
... [+4500 chars truncated]
