---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Review this ONE file end-to-end for P0/P1 defects: `H:/prism-hotel-c2/mcp-server"
date: "2026-05-16"
first_ts: "2026-05-16T03:47:57.625Z"
last_ts: "2026-05-16T03:48:59.630Z"
cwd: "h:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ac1526df90f76dcac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review this ONE file end-to-end for P0/P1 defects: `H:/prism-hotel-c2/mcp-server

> **claude-code-cli** | 2026-05-16 | 10 msgs (4 user / 6 assistant) | cwd: h:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ac1526df90f76dcac.jsonl`

## Transcript

### User | 2026-05-16T03:47:57.625Z

Review this ONE file end-to-end for P0/P1 defects: `H:/prism-hotel-c2/mcp-server/src/engines/QueueProcessorEngine.ts`

Context: This is OBSIDIAN-INTELLIGENCE-MS3 unit B3 (U-QUEUE-PROCESSOR). It drains a knowledge-vault queue dir of RESEARCH-*/SYNTHESIZE-*/DRAFT-*.md files, size-gates each (body <2048 bytes → process via Ollama qwen2.5-coder:7b and move input to archive/; body ≥2048 → write a defer stub and move input to claude-queue/), writing Ollama output to generated/<basename>-output.md. It mirrors the established sibling pattern in `H:/prism-hotel-c2/mcp-server/src/engines/DailyContextWorkflowEngine.ts` (B1) — read that too as the convention reference (zod strict schemas, DI lister/processor, CLI guard, WIRE-EXEMPT header).

Unit spec exit conditions to verify the code actually satisfies:
- File naming match: RESEARCH-*.md | SYNTHESIZE-*.md | DRAFT-*.md (case? hidden files? non-.md?)
- Output to <vaultRoot>/generated/<basename>-output.md
- Completed Ollama input MOVES to <vaultRoot>/archive/ ; deferred input MOVES to claude-queue/ (NOT left in queue/ — must not be re-deferred every 2h cron pass)
- Size gate: <2KB → Ollama, ≥2KB → claude-queue. Verify the boundary (exactly 2048 bytes) goes to claude-queue.
- Rollback: on Ollama failure the input file stays UNTOUCHED in queue/ (retried next pass). Verify no half-move (output written before input rename).
- Per-file failure isolation: one unreachable-Ollama file must NOT abort the batch.

Specifically scrutinize: the atomic move + collision-guard (`moveWithCollisionGuard`) for races/overwrite/data-loss; the order of writeFile-output vs rename-input (any window where output exists but input also still in queue → double-process next pass? acceptable?); classifyQueueFile regex correctness & ReDoS; Buffer.byteLength vs string.length consistency for the size gate; the invalid-queue-root mapping (lister throw → run-level fail); AbortController/timeout discrimination in defaultOllamaProcessor; any unhandled/floating prom
... [+332 chars truncated]

### Assistant | 2026-05-16T03:48:03.029Z

I'll review the target file end-to-end against the spec and sibling convention.

### Assistant | 2026-05-16T03:48:03.483Z

[tool_use: Read]

### Assistant | 2026-05-16T03:48:03.749Z

[tool_use: Read]

### User | 2026-05-16T03:48:04.195Z

[tool_result] read-once-guard: 'H:\prism-hotel-c2\mcp-server\src\engines\DailyContextWorkflowEngine.ts' was already read 3m ago in this session and is unchanged (mtime 1778898156114). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: P
... [+18 chars truncated]

### User | 2026-05-16T03:48:04.297Z

[tool_result] 1	// WIRE-EXEMPT: cron-invoked queue processor — wired via scripts/cron/queue-processor-cron.ps1 scheduled-task (2h cadence) which runs scripts/queue-processor-daemon.mjs. Engine is a library (importable for tests + dispatcher composition) AND a CLI (--run) for the scheduled task. No dispatcher action is required for the cron path; downstream composition (Track G observability, B4 weekly synthesis
... [+21262 chars truncated]

### Assistant | 2026-05-16T03:48:06.928Z

The sibling file was read earlier this session — I'll work from the target file content I have. Let me verify a couple of behavioral details with focused checks.

### Assistant | 2026-05-16T03:48:08.782Z

[tool_use: Grep]

### User | 2026-05-16T03:48:09.399Z

[tool_result] 15- *   - no-sources         → ok=false (loader returned 0 files; nothing to summarize)
16- *   - summarizer-failed  → ok=false (Ollama unreachable / refused / parse error)
17: *   - write-failed       → ok=false (output mkdir or writeFile failed)
18- *
19- * Determinism: when both `loader` and `summarizer` are injected, the engine is
--
33-import * as fs from "node:fs/promises";
34-import * as pa
... [+909 chars truncated]

### Assistant | 2026-05-16T03:48:59.630Z

I have enough to complete the review. Now analyzing against spec and the B1 convention.

## Code Quality Analysis Report

### Summary
- File: `H:/prism-hotel-c2/mcp-server/src/engines/QueueProcessorEngine.ts` (539 lines)
- Convention reference: `DailyContextWorkflowEngine.ts` (B1)
- Issues Found: 2 P1, 0 P0 (one near-P0 race documented below as P1 with rationale)
- The core spec contract (size gate, per-file isolation, rollback-on-Ollama-failure, output-before-rename) is correctly implemented.

---

### Critical / P1 Issues

**P1-1 — `truncateBody` slices by chars then claims a byte cap, can exceed `MAX_TASK_BYTES` and the comment is wrong (lines 130–134)**

```ts
export function truncateBody(body: string, max: number = MAX_TASK_BYTES): string {
  if (Buffer.byteLength(body, "utf8") <= max) return body;
  // Slice by chars then hard-cap bytes (utf8-safe enough for the prompt).
  return body.slice(0, max) + "\n\n[truncated]\n";
}
```
The comment says "hard-cap bytes" but `body.slice(0, max)` is a **character** slice. For multi-byte UTF-8 (CJK, emoji, accented manufacturing terms — common in this shop's tribal notes), `body.slice(0, 8000)` can yield up to ~24,000 bytes — 3× the intended cap, defeating the `OLLAMA_NUM_CTX` sizing rationale on line 109. This is not a data-loss bug (sub-2KB tasks never hit this path in normal flow; it is defence-in-depth only, as the comment on line 107 notes), so it is P1 not P0. But the code does not do what it claims.

Minimal fix (true byte cap):
```ts
export function truncateBody(body: string, max: number = MAX_TASK_BYTES): string {
  const buf = Buffer.from(body, "utf8");
  if (buf.length <= max) return body;
  // slice on a UTF-8 char boundary at/below `max` bytes
  return buf.toString("utf8", 0, max).replace(/\uFFFD+$/, "") + "\n\n[truncated]\n";
}
```

**P1-2 — `moveWithCollisionGuard` collision check is TOCTOU and the suffix is not unique within a single run (lines 338–353)**

```ts
try {
  await fs.access(dest);
  const ext = 
... [+6645 chars truncated]
