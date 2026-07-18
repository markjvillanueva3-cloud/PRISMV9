---
type: "chat-session"
source: "claude-code-cli"
session_id: "16c4c64a-3ab9-4d8d-8551-a9449f1efe09"
title: "Review a single-file change for correctness. File: H:/prism/scripts/batch-ollama"
date: "2026-06-04"
first_ts: "2026-06-04T03:56:55.369Z"
last_ts: "2026-06-04T04:00:29.436Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-ae65ca03f39f8df1a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Review a single-file change for correctness. File: H:/prism/scripts/batch-ollama

> **claude-code-cli** | 2026-06-04 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-ae65ca03f39f8df1a.jsonl`

## Transcript

### User | 2026-06-04T03:56:55.369Z

Review a single-file change for correctness. File: H:/prism/scripts/batch-ollama-vision-extract.mjs (read it end-to-end).

CONTEXT: This is unit BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY (slot romeo). The change converts a SERIAL `for` loop that called blocking `spawnSync` (one PDF print at a time) into a BOUNDED ASYNC WORKER POOL so an RTX PRO 6000 Blackwell (96GB) extracts N vision-OCR prints in parallel. Concurrency N comes from `detectGpuTier().concurrency` in scripts/lib/catalog-gpu-profile.mjs (Blackwell=3, 16GB host=1). New/changed exports: `runOnePrintAsync` (spawn-based, replaces sync runOnePrint), `resolveConcurrency`, `runExtractionPool`. Old serial behavior MUST be preserved when concurrency=1 (back-compat). It preserves a SHA-256 checkpoint/resume contract: a print is written to the checkpoint JSONL only on completion; `doneSet` (rebuilt from checkpoint on restart) is reused as the in-flight-claim set.

VERIFY RIGOROUSLY and report P0/P1/P2 with line numbers, then a final PASS or FAIL:
1. CLAIM ATOMICITY: can two workers ever claim the same worklist item? (claimNext() must have no `await` between reading/advancing idx and incrementing attempted). Confirm or find the race.
2. --limit gating: can attempted ever exceed args.limit under concurrency>1?
3. time-budget: does an over-budget state stop new claims while letting in-flight finish? Is budget_hit set correctly?
4. CHECKPOINT under concurrency: appendFileSync from multiple async continuations — is each record write safe/atomic? Any lost-update or interleaved-line risk?
5. FAIL-SOFT: can a single bad print (runImpl rejecting/throwing, non-zero exit, null result) abort the whole pool? runOnePrintAsync must NEVER reject.
6. BOUNDED MEMORY: only `concurrency` extractions in flight (NOT a naive Promise.all over all paths)?
7. BACK-COMPAT: with concurrency=1, are stats (attempted/ok/failed/skipped_done/skipped_missing/budget_hit) and checkpoint records identical to the original serial loop semantics?
8. runOne
... [+396 chars truncated]

### Assistant | 2026-06-04T03:57:05.766Z

I'll review this file end-to-end. Let me read it and its supporting files.

### Assistant | 2026-06-04T03:57:06.763Z

[tool_use: Read]

### Assistant | 2026-06-04T03:57:07.246Z

[tool_use: Read]

### Assistant | 2026-06-04T03:57:07.427Z

[tool_use: Read]

### User | 2026-06-04T03:57:14.926Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/batch-ollama-vision-extract.mjs
3	//
4	// U-PSGB-XRAY-BATCH (#6) — resumable overnight batch vision-OCR runner.
5	//
6	// Orchestrates run-ollama-vision-extract.mjs over a worklist of blueprint PDFs,
7	// designed to run UNATTENDED overnight when the chat fleet is down and the GPU
8	// is uncontended (the live-pilot blocker this session was fleet GPU+CPU
9	// sat
... [+20322 chars truncated]

### User | 2026-06-04T03:57:15.130Z

[tool_result] 1	// scripts/lib/catalog-gpu-profile.mjs
2	//
3	// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
4	//
5	// Host-aware GPU profile for CATALOG / DATABASE extraction throughput.
6	//
7	// WHY: romeo's tool-catalog + machine + material DB generation routes scanned /
8	// image-only / complex-layout catalog PDFs to the Ollama vision extractor
9	// (catalog-extraction-router `ollama-vi
... [+11725 chars truncated]

### User | 2026-06-04T03:57:15.137Z

[tool_result] 1	// scripts/batch-ollama-vision-extract.test.mjs
2	// Tests for the batch runner's pure helpers (U-PSGB-XRAY-BATCH #6).
3	// The GPU-claim + spawn loop is integration (overnight); these pin the
4	// checkpoint/worklist/budget logic that governs resume + dedup + stop.
5	// Run: node --test <file>
6	
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	import { sha256, p
... [+14777 chars truncated]

### Assistant | 2026-06-04T03:57:18.183Z

I have all three files. Let me verify a couple of details against the single-runner contract and the original serial loop semantics. Let me check the git history to compare against the original serial loop.

### Assistant | 2026-06-04T03:57:20.153Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:57:21.888Z

[tool_use: Bash]

### User | 2026-06-04T03:59:08.030Z

[tool_result] 4d920c67a0 [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-CONCURRENT-OCR (slot:xray): vision model → qwen3-vl:8b-instr...
ef100e4303 [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-BATCH-FIX (slot:xray): forward --grayscale to single runner ...
a68b1f7048 [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-BATCH (slot:xray): resumable overnight batch OCR runner + wo...
---DIFF vs HEAD---
scripts/batch-olla
... [+10433 chars truncated]

### User | 2026-06-04T03:59:13.601Z

[tool_result] 30:import { spawnSync } from "node:child_process";
60:  for (const line of text.split("\n")) {

### Assistant | 2026-06-04T03:59:23.985Z

I have the original serial loop now. This is the exact comparison I need for the back-compat analysis. Let me verify the original `dry-run` behavior in detail, plus confirm the original `ok` semantics, since those are the load-bearing back-compat invariants.

I now have everything needed. Let me analyze the original serial loop against the new pool carefully.

**Original serial loop:**
```js
for (const p of paths) {
  if (args.limit > 0 && stats.attempted >= args.limit) break;
  if (!withinBudget(...)) { stats.budget_hit = true; break; }
  if (!existsSync(p)) { stats.skipped_missing++; continue; }
  try { sha = sha256(readFileSync(p)); } catch { stats.skipped_missing++; continue; }
  if (doneSet.has(sha)) { stats.skipped_done++; continue; }
  stats.attempted++;
  if (args.dryRun) { ...; doneSet.add(sha); continue; }   // ← dry-run increments attempted, adds sha
  const r = runOnePrint(p, args);
  ...
  doneSet.add(sha);   // ← real run adds sha AFTER completion
}
```

Key detail: in the original, dry-run adds `sha` to doneSet (line was `doneSet.add(sha); continue;`). In the new pool, `claimNext()` does `doneSet.add(sha)` for **all** claimed items (including dry-run, since claim happens before the dry-run branch in `worker()`). So dry-run dedup is preserved. Good — let me verify the back-compat thoroughly.

Let me run the tests to confirm the stated 36 pass, and check a subtle ordering concern.

### Assistant | 2026-06-04T03:59:24.958Z

[tool_use: Bash]

### User | 2026-06-04T03:59:29.330Z

[tool_result]   ...
# Subtest: runOnePrintAsync: child 'error' event RESOLVES (never rejects)
ok 35 - runOnePrintAsync: child 'error' event RESOLVES (never rejects)
  ---
  duration_ms: 0.2752
  ...
# Subtest: runOnePrintAsync: spawn throw RESOLVES with spawn-failed shape
ok 36 - runOnePrintAsync: spawn throw RESOLVES with spawn-failed shape
  ---
  duration_ms: 0.1369
  ...
1..36
# tests 36
# suites 0
# pass 3
... [+68 chars truncated]

### Assistant | 2026-06-04T04:00:29.436Z

36/36 pass. Now let me do the rigorous adversarial analysis against each of the 9 verification points.

## Analysis

**1. CLAIM ATOMICITY** — `claimNext()` (lines 250-265) is a synchronous function: it reads `idx`, advances `idx++`, runs `existsImpl`/`sha256`/`readImpl` (all sync), checks/mutates `doneSet`, increments `stats.attempted`, and returns — with **zero `await`** inside. JS is single-threaded and cannot preempt a synchronous function, so two workers calling `claimNext()` interleave only at the `await runImpl(...)` boundary in `worker()`, never inside the claim. Confirmed atomic. The `doneSet.add(sha)` at line 260 (before returning) is the in-flight claim that blocks both a sibling worker AND in-run SHA-duplicate paths. **No race.** Test "concurrency=3 extracts each path EXACTLY once" + "two paths identical content extract ONCE" cover this.

**2. `--limit` gating** — `claimNext()` checks `args.limit > 0 && stats.attempted >= args.limit` (line 253) *before* claiming, and `stats.attempted++` happens synchronously inside the same claim (line 261). Since the check-and-increment is atomic, `attempted` can never exceed `limit` even with N workers. Test "--limit caps attempted even under concurrency" confirms (limit 2, concurrency 3 → attempted=2). **Correct.**

**3. Time-budget** — `claimNext()` returns null and sets `stats.budget_hit = true` once `withinBudget()` is false (line 254). The early guard `if (stats.budget_hit) return null` (line 251) makes the stop sticky: once tripped, all subsequent claims short-circuit, so no new work starts. In-flight workers finish their current `await runImpl` (their continuations run independently of `claimNext`), then loop, call `claimNext()`, get null, and return. So **over-budget stops new claims while letting in-flight finish** — exactly the requirement. `budget_hit` is set correctly. Test "time-budget trip sets budget_hit and stops claiming" confirms.

**4. CHECKPOINT under concurrency** — `appendImpl` defaults to `appendF
... [+9065 chars truncated]
