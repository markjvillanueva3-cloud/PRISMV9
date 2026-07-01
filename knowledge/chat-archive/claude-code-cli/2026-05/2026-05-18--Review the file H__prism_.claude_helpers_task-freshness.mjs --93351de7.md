---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Review the file H:/prism/.claude/helpers/task-freshness.mjs end-to-end (read the"
date: "2026-05-18"
first_ts: "2026-05-18T00:29:44.364Z"
last_ts: "2026-05-18T00:30:18.821Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-ae887ebed7cebeeb4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review the file H:/prism/.claude/helpers/task-freshness.mjs end-to-end (read the

> **claude-code-cli** | 2026-05-18 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-ae887ebed7cebeeb4.jsonl`

## Transcript

### User | 2026-05-18T00:29:44.364Z

Review the file H:/prism/.claude/helpers/task-freshness.mjs end-to-end (read the WHOLE file). It is the pure, dependency-injectable core of a new "task freshness gate" for PRISM — a PreToolUse hook (built next, not this file) intercepts `slot-task-claim.mjs claim --unit <MS::U-ID>` and uses this helper to decide whether the task's source is STALE relative to fleet activity (so the chat re-checks before building potentially-already-shipped or rescoped work).

Contract this file must satisfy:
- Pure core, all readers injectable (readJson/statFile/readText/gitLog/readChatBus/now) so the companion test is hermetic.
- FAIL-OPEN: it must NEVER throw to the caller for a resolution failure. classify/read return `unknown`/`null`; the GATE (not this core) owns the block decision. Verify no code path can throw out of any exported function on bad input (null unitId, missing envelope, corrupt JSON, git timeout, future date, malformed frontmatter).
- Field names verified against live data: envelope uses `created_at` (+ per-unit `status`/`completed_at` in units[]); inventories use `generatedAt`; handoffs use frontmatter `written_at`. Confirm the TS_FIELDS cascade + the unit-row status extraction are correct.
- `decideFreshness` STALE conditions: (a) unit's own envelope row status is completed/done/shipped/closed → "already-shipped"; (b) ageHrs > staleHrs; (c) ageHrs>1 AND commitsCount>=peerCommitsTrigger; (d) genIso unresolved AND intervening activity. Check the boolean logic + threshold-boundary correctness (off-by-one at exactly staleHrs, exactly peerCommitsTrigger).
- Atomic write in writeAcknowledgment (tmp+rename, fail-open on error).
- `::`→`__` sanitization for filesystem-safe ack filenames; check it can't escape stampDir via `../` or absolute injection in chatId/unitId.
- CLI `isCli()` detection + ack/eval subcommands.

Flag P0 (correctness/security/throw-on-failure breaking the fail-open contract) and P1 (logic bugs, boundary errors, injection). Grade PASS or FAIL. Be spe
... [+48 chars truncated]

### Assistant | 2026-05-18T00:29:49.084Z

I'll read the file end-to-end.

### Assistant | 2026-05-18T00:29:49.466Z

[tool_use: Read]

### User | 2026-05-18T00:29:50.297Z

[tool_result] 1	#!/usr/bin/env node
2	// task-freshness.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)
3	//
4	// Pure, dependency-injectable core for the task-freshness gate (R13 doctrine).
5	// A task's ground truth is its generation timestamp. Before a chat commits to
6	// building a unit, this module answers: "was this task's source generated
7	// before recent fleet activity, such that it may already be
... [+19354 chars truncated]

### Assistant | 2026-05-18T00:30:18.821Z

I have the full file. Analyzing against the contract.

## Code Quality Analysis Report — task-freshness.mjs

### Summary
- Files Analyzed: 1 (497 lines)
- Issues Found: 2 P1, 3 P2
- Fail-open contract: HELD on all exported functions
- Grade: **PASS**

### Fail-Open Verification (P0 scan — clean)
All exported functions traced for throw-on-bad-input:
- `classifyTaskSource` (123): `String(unitId||"")` null-safe; regex match guarded; readers wrapped. No throw.
- `readGenerationTimestamp` (171): `Date.parse` guarded by `Number.isNaN` before `new Date().toISOString()` (191, 205, 245) — no `RangeError`. `taskRef` null-guarded (174). No throw.
- `countActivitySince` (265): `sinceIso` parse-guarded (268); future-date handled (274); JSON.parse in try/catch (298–302). No throw.
- `decideFreshness` (328): optional-chained thresholds; `gen`/`activity` null-defaulted (331–332). `Date.parse(gen.genIso)` at 358 — genIso here is always an ISO string produced via guarded `toISOString()`, so non-NaN. No throw.
- `acknowledgmentValid` (396) / `writeAcknowledgment` (408): readJson fail-safe; write in try/catch returning `null`. No throw.
- `evaluate` (436): pure composition of the above. No throw.

**No P0.** The fail-open contract is satisfied — no resolution-failure path throws to the caller.

### P1 Findings

**P1-1 — `decideFreshness` future-gen produces negative age, silently "fresh" (line 358–359).** If `gen.genIso` is in the future (clock skew, malformed-but-parseable future date), `ageHrs` is negative, `byHours` = `-N > 24` = false → verdict `fresh`. `countActivitySince` defends future *sinceIso* (274) but `decideFreshness` has no symmetric guard. A future-dated envelope bypasses the gate entirely. Recommend: clamp `ageHrs = Math.max(0, ...)` or treat `ageHrs < 0` as `gen-unknown`-class conservative-stale.

**P1-2 — `git --since` boundary excludes commits AT `sinceIso` (line 280).** Git `--since` is exclusive of the exact second. A commit at precisely the gen timestamp is not co
... [+2179 chars truncated]
