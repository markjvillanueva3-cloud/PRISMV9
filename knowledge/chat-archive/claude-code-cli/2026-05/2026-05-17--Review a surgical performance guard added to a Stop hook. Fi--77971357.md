---
type: "chat-session"
source: "claude-code-cli"
session_id: "77971357-5bcb-4ccc-a608-c74803591428"
title: "Review a surgical performance guard added to a Stop hook. File: `H:/prism/.claud"
date: "2026-05-17"
first_ts: "2026-05-17T17:08:19.045Z"
last_ts: "2026-05-17T17:08:51.224Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/77971357-5bcb-4ccc-a608-c74803591428/subagents/agent-a597b699629e525eb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a surgical performance guard added to a Stop hook. File: `H:/prism/.claud

> **claude-code-cli** | 2026-05-17 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/77971357-5bcb-4ccc-a608-c74803591428/subagents/agent-a597b699629e525eb.jsonl`

## Transcript

### User | 2026-05-17T17:08:19.045Z

Review a surgical performance guard added to a Stop hook. File: `H:/prism/.claude/hooks/error-pattern-promote.mjs` (read it end-to-end).

CONTEXT: A token-savings audit found this hook fires ~2400 times / 17 days with 99.83% no-op. The expensive work is `readLedger()` — full read + per-line JSON.parse of `ERROR_LEARN_LEDGER.jsonl` on every Stop. The fix adds a size+mtime memo sidecar (`.claude/cache/error-pattern-promote-last.json`): if the ledger is byte-identical to the last run AND the last decision started with "noop", skip the full read+parse+group and return immediately.

The claimed correctness argument: "byte-identical ledger ⟹ deterministically identical grouping; events aging out of the 7-day rolling window can only LOWER a group's count (never push one over THRESHOLD=3), so a prior no-op stays a no-op until the file actually grows (size changes → cache miss → full work)."

VERIFY EXACTLY THIS — flag P0/P1 issues, grade PASS/FAIL:
1. Is the correctness argument airtight? Specifically: can a memoized "noop" run ever incorrectly skip a run that SHOULD have drafted a stub? Walk the rolling-window aging logic. Consider: clock-based cutoff (`Date.now() - ROLLING_DAYS`) advances between runs even when the file doesn't — does that ever make a below-threshold group CROSS threshold without the file changing? (It cannot grow without new appended events, but verify the reasoning holds.)
2. TOCTOU between `statLedger()` (top of main) and `readLedger()` — is the recorded memo stat ever inconsistent with what was actually processed in a way that causes INCORRECT skipping (not just a missed-speedup)?
3. The `drafted` path writes `decision:"drafted"` — confirm the guard's `.startsWith("noop")` check means a drafted round always re-evaluates next run (does NOT skip). Is that the intended safe behavior?
4. mtimeMs is floored via `Math.floor(s.mtimeMs)`. Does the memo write also floor it consistently so a match is achievable? (Check both sides of the comparison.)
5. Fail-ope
... [+528 chars truncated]

### Assistant | 2026-05-17T17:08:24.713Z

I'll read the file end-to-end.

### Assistant | 2026-05-17T17:08:25.110Z

[tool_use: Read]

### User | 2026-05-17T17:08:31.577Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * error-pattern-promote.mjs — Stop hook.
5	 *
6	 * Watches ERROR_LEARN_LEDGER.jsonl. When the same error fingerprint appears
7	 * ≥THRESHOLD times within ROLLING_DAYS, drafts a lesson stub at
8	 * knowledge/wiki/lessons/auto-{fingerprint}.md so the failure mode gets
9	 * captured into wiki and a hook/skill can be designed to prevent recurrence.
10	 *
11
... [+8763 chars truncated]

### Assistant | 2026-05-17T17:08:51.224Z

## Code Quality Analysis: error-pattern-promote.mjs memo guard

**1. Correctness argument — AIRTIGHT (PASS).** The skip path requires `memo.size === ledgerStat.size && memo.mtimeMs === ledgerStat.mtimeMs`. A byte-identical, mtime-identical file yields a deterministically identical `events` array. The only variable between runs is `cutoff = Date.now() - 7d`, which **advances monotonically**. Aging only ever *removes* events from `recent` (the `t >= cutoff` filter), so every group's count is monotonically non-increasing for a fixed file. A group below `THRESHOLD=3` can never cross 3 without a newly-appended event, and any append changes `size` (JSONL appends are strictly additive → size strictly grows) → cache miss → full work. Edge: a zero-byte append is impossible for valid JSONL (every event ends in `\n`). The clock advancing cannot manufacture a crossing. Argument holds.

**2. TOCTOU — SAFE (PASS).** `statLedger()` runs once at line 143; the skip decision uses that snapshot. On the *full-work* path, `readLedger()` (line 152) may read a newer file than `ledgerStat`, then `writeMemo({...ledgerStat,...})` records the **stale** stat. Worst case: memo under-records size → next run sees a size mismatch → cache miss → redundant full work. It can never record a size *larger* than the processed content (file only grows), so it can never cause an incorrect skip. Safe-by-construction.

**3. `drafted` re-evaluation — CORRECT (PASS).** Line 180 writes `decision:"drafted"`. Guard at line 147 requires `.startsWith("noop")`, so `"drafted"` always falls through to full work next run. Intended and correct — more events may land on a drafted fingerprint.

**4. mtimeMs floor — CONSISTENT (PASS).** `statLedger()` floors via `Math.floor(s.mtimeMs)` (line 30); `writeMemo({...ledgerStat,...})` persists that already-floored value (lines 153/180/189/193). Both comparison sides use the floored value. Match achievable.

**5. Fail-open — CORRECT (PASS).** Missing sidecar/corrupt JSON → `readM
... [+1279 chars truncated]
