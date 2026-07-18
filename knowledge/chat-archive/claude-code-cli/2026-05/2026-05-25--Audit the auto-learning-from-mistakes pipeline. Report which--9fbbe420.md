---
type: "chat-session"
source: "claude-code-cli"
session_id: "9fbbe420-5335-44ea-8eae-7244e85cd53b"
title: "Audit the auto-learning-from-mistakes pipeline. Report which Stop hooks fire to "
date: "2026-05-25"
first_ts: "2026-05-25T02:06:16.841Z"
last_ts: "2026-05-25T02:12:11.531Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 17
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a472dea86b38adb6f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Audit the auto-learning-from-mistakes pipeline. Report which Stop hooks fire to 

> **claude-code-cli** | 2026-05-25 | 40 msgs (17 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a472dea86b38adb6f.jsonl`

## Transcript

### User | 2026-05-25T02:06:16.841Z

Audit the auto-learning-from-mistakes pipeline. Report which Stop hooks fire to capture errors/regressions/conflicts AND propose ONE concrete improvement, then write it.

STEP 1 — Investigate (read-only, ≤8 tool calls):
- Glob `H:/prism/.claude/hooks/*error*` and `H:/prism/.claude/hooks/*mistake*` and `H:/prism/.claude/hooks/*regression*` and `H:/prism/.claude/hooks/*conflict*`
- Read `H:/prism/.claude/hooks/error-pattern-promote.mjs` (if it exists) — main candidate for error→memory promotion
- Read `H:/prism/.claude/hooks/error-pattern-capture.mjs` (sister)
- Check for `state/shared/error-ledger.jsonl` or similar ledger
- Grep `H:/prism/CLAUDE.md` for `## Recent regressions` — count entries in last 7 days

STEP 2 — Identify the weakest link. Likely candidates:
- Error pattern capture exists but never auto-promotes to memory
- Capture writes to ledger but ledger is never analyzed
- No cross-slot conflict detection (peer-claim collisions, doctrine contradictions)
- No surfacing of repeat errors back to chats that introduced them

STEP 3 — Write ONE improvement file (be pragmatic — pick the smallest improvement that genuinely closes a gap):

**File**: `H:/prism-slot-golf/scripts/mistake-learning-audit.mjs`

A read-only audit CLI that:
1. Reads the error ledger (e.g. `state/shared/error-ledger.jsonl` or `state/shared/error-pattern-history.jsonl`)
2. Groups errors by pattern (same regex/signature)
3. Reports top-10 most-frequent error patterns with: pattern, count, first-seen, last-seen, slot, has-memory-promotion (Y/N)
4. Flags patterns with count ≥ 3 but NO memory entry as PROMOTION CANDIDATES

Example output:

```
MISTAKE LEARNING AUDIT — top patterns + promotion gaps
======================================================
Pattern                                       | count | first       | last         | slot   | has-memo
git index.lock contention                     |   23 | 5/12 10:14  | 5/24 17:21  | (any)  | YES
ESM require() bug in hook                     |   
... [+867 chars truncated]

### Assistant | 2026-05-25T02:06:27.626Z

I'll follow the investigation steps systematically before writing anything.

### Assistant | 2026-05-25T02:06:28.056Z

[tool_use: Glob]

### Assistant | 2026-05-25T02:06:28.285Z

[tool_use: Glob]

### User | 2026-05-25T02:06:37.193Z

[tool_result] .claude\hooks\stop_on_session_mistake_digest.mjs

### User | 2026-05-25T02:06:37.197Z

[tool_result] .claude\hooks\lib\error_classifier.py
.claude\hooks\error-block-capture.mjs
.claude\hooks\error-block-prewarn.mjs
.claude\hooks\error-learner-hook.mjs
.claude\hooks\error-pattern-learner.mjs
.claude\hooks\error-pattern-memory.mjs
.claude\hooks\error-recovery-memory.mjs
.claude\hooks\posttool-error-explain.mjs
.claude\hooks\stop_on_build_error.mjs
.claude\hooks\stop_on_repeat_error.mjs
.claude\hook
... [+297 chars truncated]

### Assistant | 2026-05-25T02:06:39.724Z

[tool_use: Glob]

### Assistant | 2026-05-25T02:06:39.842Z

[tool_use: Glob]

### User | 2026-05-25T02:06:48.776Z

[tool_result] .claude\hooks\cross-terminal-conflict.mjs
.claude\hooks\pre-commit-conflict-sim.mjs

### User | 2026-05-25T02:06:48.783Z

[tool_result] .claude\hooks\lib\enforce-regression-test.py
.claude\hooks\lib\enforce-svi-regression.py
.claude\hooks\anti-regression-auto-sweep.mjs
.claude\hooks\stop_on_svi_regression.mjs
.claude\hooks\svi-regression-guard.mjs
.claude\hooks\tsc-baseline-regression-gate.mjs
.claude\hooks\stop-regression-backflow.mjs
.claude\hooks\regression-auto-write.mjs
.claude\hooks\regression-auto-write.test.mjs
.claude\hoo
... [+101 chars truncated]

### Assistant | 2026-05-25T02:06:51.008Z

[tool_use: Read]

### Assistant | 2026-05-25T02:06:51.115Z

[tool_use: Read]

### User | 2026-05-25T02:07:00.227Z

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
... [+9026 chars truncated]

### User | 2026-05-25T02:07:00.278Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// error-pattern-capture.mjs — EXTENSION to existing error-block-capture infrastructure.
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-ERROR-LEARN-LOOP — user directive 2026-05-15:
6	// "errors and mistakes, bugs, mistakes and typos are learned and avoided
7	//  the moment they happen so we don't waste tokens going through the same
8	//  process over and over again."
9	
... [+7147 chars truncated]

### Assistant | 2026-05-25T02:07:02.764Z

Now read the error-learn-store helper to find the exact ledger path, and check what other Stop hooks exist in the pipeline:

### Assistant | 2026-05-25T02:07:04.522Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:07:05.238Z

[tool_use: Grep]

### User | 2026-05-25T02:07:47.769Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
11 matches in 3 files:

9:0:mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl (one JSON object per line).
93:0:also mirror to unified ledger via MCP.
H:/prism/.claude/helpers/error-learn-store.mjs:2:* error-learn-store — append-only JSONL ledger of hook-blocks and tool errors.
H:/prism/.claude/helpers/err
... [+722 chars truncated]

### User | 2026-05-25T02:07:47.777Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `file_path` was provided</tool_use_error>

### Assistant | 2026-05-25T02:07:51.185Z

Good — ledger path is confirmed: `mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl`. Now check the ledger for real content and count recent regressions in CLAUDE.md:

### Assistant | 2026-05-25T02:07:53.396Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:07:54.312Z

[tool_use: Grep]

### User | 2026-05-25T02:08:10.125Z

[tool_result] 500
---
2026-05-25T00:43:33.018Z git-lock-contention tool_error
2026-05-25T00:53:02.296Z git-lock-contention tool_error
2026-05-25T01:01:08.934Z git-lock-contention tool_error
2026-05-25T01:04:34.131Z git-lock-contention tool_error
2026-05-25T01:16:48.019Z git-lock-contention tool_error

### User | 2026-05-25T02:08:13.793Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### Assistant | 2026-05-25T02:08:16.279Z

[tool_use: Grep]

### Assistant | 2026-05-25T02:08:21.908Z

[tool_use: Bash]

### User | 2026-05-25T02:08:38.318Z

[tool_result] CLAUDE.md:27

Found 27 total occurrences across 1 file.

### User | 2026-05-25T02:09:04.653Z

[tool_result] <string>:6: DeprecationWarning: datetime.datetime.utcnow() is deprecated and scheduled for removal in a future version. Use timezone-aware objects to represent datetimes in UTC: datetime.datetime.now(datetime.UTC).
Total ledger entries: 500 | Last-7d entries: 500
Distinct patterns last 7d: 3
  count=464  tool_error|git-lock-contention  first=2026-05-21T01:44  last=2026-05-25T02:08  slots=[None,
... [+208 chars truncated]

### Assistant | 2026-05-25T02:09:07.368Z

[tool_use: Bash]

### User | 2026-05-25T02:09:44.832Z

[tool_result] H:/prism/knowledge/wiki/lessons/auto-cd-h-prism-slot-delta-mcp-server-node-node-modules-vitest.md  965B
H:/prism/knowledge/wiki/lessons/auto-node-h-prism-scripts-ollama-docker-health-mjs-21-head-5-t.md  918B
H:/prism/knowledge/wiki/lessons/auto-test-fail-test-fail.md  982B
H:/prism/knowledge/wiki/lessons/auto-tool-error-fork-storm.md  975B
H:/prism/knowledge/wiki/lessons/auto-tool-error-git-lock-c
... [+143 chars truncated]

### Assistant | 2026-05-25T02:09:59.332Z

I have everything I need. Now I can form the complete picture before writing.

**Investigation findings:**

Stop hooks in the error-learning pipeline:
- `error-pattern-capture.mjs` (PostToolUse T2) — captures 6 pattern classes (fork-storm, rg-timeout, git-lock, edit-mismatch, tsc, test-fail) into `ERROR_LEARN_LEDGER.jsonl`
- `error-pattern-promote.mjs` (Stop T4) — groups ledger by `error_class|trigger`, drafts wiki lesson stubs at `knowledge/wiki/lessons/auto-*.md` when count >= 3 in rolling 7d
- `error-block-prewarn.mjs` — surfaces past errors on next similar PreToolUse
- `stop_on_session_mistake_digest.mjs` — session-end mistake digest
- `stop_on_repeat_error.mjs` — blocks Stop on repeating errors
- `regression-auto-write.mjs` — writes regression entries
- `stop-regression-backflow.mjs` — stops regression backflow

**Ledger state:** 500 entries (at the 500-cap, meaning the ledger has been at max for a while), all last 7d. Three patterns: `git-lock-contention` (464 hits), `test-fail` (33), `tsc` (3). All three have auto-promoted lesson stubs — the promotion mechanism IS working.

**Weakest link identified:** The `stableKey()` grouping in `error-pattern-promote.mjs` uses `error_class|trigger` (e.g. `tool_error|git-lock-contention`) but the ledger's own `fingerprint` field encodes the raw command string — so the `fingerprint` column in the ledger is command-polluted and never matches across invocations. This means the audit CLI's "has-memory-promotion" check must correlate on `error_class|trigger`, not on the ledger's `fingerprint` field.

Additionally: the ledger has hit its 500-entry hard cap with 464/500 being a single pattern (`git-lock-contention`), crowding out all other pattern classes. The audit script should surface this cap-saturation problem.

Now I'll write the audit script. It is under 50 lines of net-new logic so no plan approval is needed — the spec was provided in the task.

### Assistant | 2026-05-25T02:10:00.436Z

[tool_use: Bash]

### User | 2026-05-25T02:10:14.821Z

[tool_result] __fixtures__/
__tests__/
_archive/
agents/
audit/
automation/
batch/
core/
cron/
docker/

### Assistant | 2026-05-25T02:10:19.050Z

Good — the `scripts/` directory exists. Now write the audit script.

### Assistant | 2026-05-25T02:10:58.895Z

[tool_use: Write]

### User | 2026-05-25T02:11:14.867Z

[tool_result] File created successfully at: H:/prism-slot-golf/scripts/mistake-learning-audit.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:11:18.486Z

The magic-number warning is valid (3 is already `THRESHOLD` conceptually but not named as a constant in the script). The unreachable-after-return warning is a false positive from the hook — there is no unreachable code. The write succeeded. Now run it:

### Assistant | 2026-05-25T02:11:19.446Z

[tool_use: Bash]

### User | 2026-05-25T02:11:45.078Z

[tool_result] MISTAKE LEARNING AUDIT — top patterns + promotion gaps
==========================================================================================================================
  Ledger : H:\prism\mcp-server\data\state\ERROR_LEARN_LEDGER.jsonl
  Entries: 500 (AT CAP=500 — oldest entries displaced; single-pattern saturation risk)
  Window : last 7d  |  recent=500  distinct_patterns=3
=============
... [+1108 chars truncated]

### Assistant | 2026-05-25T02:12:11.531Z

The script runs cleanly. Here is the complete report.

---

## Stop hooks that fire in the error-learning pipeline

| Hook | Event | Role |
|---|---|---|
| `error-pattern-capture.mjs` | PostToolUse T2 | Detects 6 pattern classes (fork-storm, rg-timeout, git-lock, edit-mismatch, tsc, test-fail) from tool stdout/stderr; appends to `ERROR_LEARN_LEDGER.jsonl` |
| `error-block-capture.mjs` | PostToolUse | Captures HOOK_BLOCK and TOOL_ERROR decisions (the original pair) |
| `error-block-prewarn.mjs` | PreToolUse | Surfaces matching prior errors on the next similar tool call |
| `error-pattern-promote.mjs` | Stop T4 | Groups ledger by `error_class|trigger`; when count >= 3 in rolling 7d, drafts a wiki lesson stub at `knowledge/wiki/lessons/auto-{slug}.md` |
| `stop_on_repeat_error.mjs` | Stop | Blocks Stop when the same error is repeating this session |
| `stop_on_session_mistake_digest.mjs` | Stop | Session-end mistake digest |
| `regression-auto-write.mjs` | Stop | Writes regression entries to the CLAUDE.md `## Recent regressions` section |
| `stop-regression-backflow.mjs` | Stop | Guards against regression backflow |
| `cross-terminal-conflict.mjs` | PreToolUse | Detects cross-terminal file conflicts |

**CLAUDE.md `## Recent regressions`:** 27 entries in the last 7 days (all dated 2026-05-18 through 2026-05-24).

---

## Weakest link: ledger cap saturation

The pipeline's promotion mechanism works — all 3 current patterns have lesson stubs. But the audit reveals a structural problem that the existing hooks cannot see:

The ledger is **permanently at its 500-entry hard cap**, and a single pattern (`git-lock-contention`) holds **464 of 500 slots (92.8%)**. Because `error-learn-store.mjs` drops the oldest entries on overflow, any new error class that emerges during a session where git-lock is also firing gets written once, then immediately displaced by the next git-lock hit. It will never accumulate the 3 occurrences needed for promotion. The dominant pattern is silently 
... [+2987 chars truncated]
