---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Review H:/prism/.claude/hooks/task-freshness-gate.mjs end-to-end (read the WHOLE"
date: "2026-05-18"
first_ts: "2026-05-18T00:42:27.435Z"
last_ts: "2026-05-18T00:43:05.719Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a7bc1c1414a21f678.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review H:/prism/.claude/hooks/task-freshness-gate.mjs end-to-end (read the WHOLE

> **claude-code-cli** | 2026-05-18 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a7bc1c1414a21f678.jsonl`

## Transcript

### User | 2026-05-18T00:42:27.435Z

Review H:/prism/.claude/hooks/task-freshness-gate.mjs end-to-end (read the WHOLE file). It's a PreToolUse(Bash) sub-hook that runs INSIDE bash-bundle.mjs. It intercepts `slot-task-claim.mjs claim --unit <MS::U-ID>` commands and blocks the claim when the unit's source is stale (delegating the verdict to the already-reviewed-PASS helper H:/prism/.claude/helpers/task-freshness.mjs via dynamic import).

Sub-hook protocol (verified from bash-bundle.mjs/lib/hook-runner.mjs): the bundle spawns this as a child process, pipes stdin JSON {tool_name,tool_input}, reads stdout. `{decision:"block",reason}` → bundle denies the tool call; empty `{}`/non-JSON → no-op allow. Exit 2 on block, 0 otherwise.

Contract this file MUST satisfy:
- **FAIL-OPEN ABSOLUTE**: the gate's OWN failure must NEVER block a legitimate claim. Every throw path (bad stdin, helper import failure, helper throw, fs error) must end in `emit({})` (allow). Verify `main().catch()` and the inner try/catch around `helper.evaluate` both fail-open. Verify NO code path can emit a block due to the gate's own error.
- **FAST PATH / fork-storm**: this fires on EVERY Bash tool call across 12 chats under 98%-commit pressure + Cygwin fork-storm. Verify: kill-switch exits FIRST (zero IO); non-matching command exits BEFORE any fs/import/subprocess; the dynamic `import()` of the helper and any git spawn happen ONLY on a matched claim command. Is there any IO before the CLAIM_RE test?
- **CLAIM_RE** `/slot-task-claim(?:\.mjs)?\b[^\n]*\bclaim\b/` — does it correctly match real claim commands and NOT match `slot-task-claim.mjs list/release/heartbeat/sweep`? Test mentally against: `node .../slot-task-claim.mjs claim --unit X::Y`, `... slot-task-claim.mjs list`, `... slot-task-claim.mjs release --unit X::Y` (does "release" contain a word-boundary "claim"? NO — but verify), `echo claim slot-task-claim` (false-positive risk?).
- **flag() parser**: `--name value | --name=value | bare`. Verify `--unit FEATURE-GAP-AUDIT-MS0::U-X` extrac
... [+852 chars truncated]

### Assistant | 2026-05-18T00:42:32.859Z

I'll review the file end-to-end.

### Assistant | 2026-05-18T00:42:33.285Z

[tool_use: Read]

### User | 2026-05-18T00:42:33.663Z

[tool_result] 1	#!/usr/bin/env node
2	// task-freshness-gate.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)
3	// tier: T1
4	//
5	// PreToolUse(Bash) gate enforcing CLAUDE.md doctrine R13: a task generated
6	// before recent fleet activity may already be shipped / rescoped / invalid.
7	// This hook intercepts `slot-task-claim.mjs claim --unit <MS::U-ID>` — the
8	// moment a chat commits to building a unit — 
... [+8325 chars truncated]

### Assistant | 2026-05-18T00:43:05.719Z

Reviewed end-to-end against the contract. The hook conventions in the system-reminder describe bash-script hooks (source common.sh, parse_hook_input) — this is a Node ESM sub-hook with its own protocol, so those bash conventions don't apply; the relevant contract is the one in the task.

## Code Quality Analysis Report — task-freshness-gate.mjs

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 1 (210 lines)
- Issues Found: 2 (0 P0, 1 P1, 1 P2)

### FAIL-OPEN — PASS
- `main().catch()` (L205-209) → `emit({})`. Absolute last-resort verified.
- `evaluate` try/catch (L146-161): import failure / `acknowledgmentValid` throw / `evaluate` throw all → `emit({})` (L160).
- Bypass try/catch (L124-141): helper import/evaluate/writeAcknowledgment throw → caught (L139), `appendJsonl` is internally try/caught (L68-75, cannot throw out), then `emit({})` (L142). Audit append cannot throw out — verified.
- `readStdin` (L42-49), `JSON.parse` (L94-98) both fail to `emit({})`.
- The ONLY block emit (L202) is reachable solely when `ev.verdict.stale` is truthy from a successful `helper.evaluate` — never from gate-internal error. **No gate-error path can emit a block. PASS.**

### FAST PATH / fork-storm — PASS
- L88: kill-switch is the first statement, pure `process.env` read, zero IO. Correct.
- L90 `readStdin` → L91 trim → L94 `JSON.parse` → L100 cmd extract → **L109 `CLAIM_RE.test(cmd)`**. No filesystem, no `import()`, no subprocess before L109. Reading stdin is unavoidable (protocol input) and is not fs/fork work.
- Dynamic `import(HELPER_URL)` occurs only at L125 (bypass) / L147 (evaluate) — both gated behind the CLAIM_RE pass AND `--unit` presence (L112). No git/subprocess is spawned by this file; any spawn lives in the helper, invoked only post-match. **No fs/import/subprocess before the CLAIM_RE test. PASS.**

### CLAIM_RE — PASS
`/slot-task-claim(?:\.mjs)?\b[^\n]*\bclaim\b/`
- `...slot-task-claim.mjs claim --unit X::Y` → matches (correct).
- `...slot-task-claim.mjs list`
... [+2936 chars truncated]
