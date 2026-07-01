---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Deep-read PRISM's hook wiring to determine what self-check/test/lint hooks ACTUA"
date: "2026-06-08"
first_ts: "2026-06-08T16:36:44.577Z"
last_ts: "2026-06-08T16:38:18.640Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_4c9296d1-215/agent-a2c5267059e96231a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Deep-read PRISM's hook wiring to determine what self-check/test/lint hooks ACTUA

> **claude-code-cli** | 2026-06-08 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_4c9296d1-215/agent-a2c5267059e96231a.jsonl`

## Transcript

### User | 2026-06-08T16:36:44.577Z

Deep-read PRISM's hook wiring to determine what self-check/test/lint hooks ACTUALLY fire. READ: C:/Users/wompu/.claude/settings.json AND H:/prism/.claude/hooks/bundles/stop-regression-bundle.mjs (read full) AND H:/prism/.claude/hooks/stop_on_failing_tests.mjs (read full). Answer with EVIDENCE (quote real command strings / file:line): (1) Article-1-L2 / Article-3-L3: which PostToolUse hooks run eslint/tsc/lint/typecheck after edits? List their command strings. (2) Article-1-L3 (the most-important layer): is there a Stop hook that runs/gates on the TEST SUITE before "done"? CRITICAL: stop_on_failing_tests.mjs is NOT a top-level Stop entry in settings.json, but stop-regression-bundle.mjs references it — READ the bundle and determine if the bundle actually INVOKES stop_on_failing_tests (i.e. is it wired via the bundle?) or just names it in a comment/list. Quote the exact bundle code that runs it. (3) Is the bundle itself wired as a Stop hook in settings.json? (4) Note the VITEST_REPORT.json is stale (2026-05-12) — does the fail-closed hook block on stale-green or hard-block on missing? Report COVERED/PARTIAL/MISSING per layer with verbatim evidence.

### Assistant | 2026-06-08T16:37:32.298Z

I'll perform a deep read of the PRISM hook wiring to determine what self-check/test/lint hooks actually fire. Let me start by examining the key files.

### Assistant | 2026-06-08T16:37:32.543Z

[tool_use: Read]

### Assistant | 2026-06-08T16:37:32.707Z

[tool_use: Read]

### Assistant | 2026-06-08T16:37:32.710Z

[tool_use: Read]

### User | 2026-06-08T16:37:39.090Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	// stop-regression-bundle.mjs — single Stop hook that runs the DEV-TOOL
4	// regression GATES (the fail-closed ones), as the sibling of stop-bundle.mjs
5	// (which runs only the non-blocking trackers).
6	//
7	// Why: the Stop event runs all gates as individual settings.json entries —
8	// ~62s of serial timeout budget for the 10 folded here, ×N concurrent chat
... [+6471 chars truncated]

### User | 2026-06-08T16:37:39.098Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * stop_on_failing_tests.mjs — Stop Hook (SAFETY-CRITICAL, FAIL-CLOSED)
5	 *
6	 * Blocks Stop unless the project-wide test report is fresh AND clean.
7	 *
8	 * WHY FAIL-CLOSED: This is safety-critical CNC code. A bug ships
9	 * G-code that crashes a $200K machine, ruins a $50K aerospace part,
10	 * or hurts an operator. Earlier behavior was fail-open: mi
... [+9726 chars truncated]

### User | 2026-06-08T16:37:39.942Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1457 of 1784 total (26005 tokens, cap 25000). Call Read with offset=1458 limit=1457 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claud
... [+58052 chars truncated]

### Assistant | 2026-06-08T16:38:18.640Z

I have now read the three critical files. Let me analyze the hook wiring to answer your questions with verbatim evidence.

## FINDINGS

### (1) PostToolUse hooks running eslint/tsc/lint/typecheck after edits

**Article-1-L2 / Article-3-L3: COVERED**

PostToolUse hooks are actually **NOT directly wired** in settings.json. However, the **edit-bundle.mjs** runs in PreToolUse (not PostToolUse) for Edit/Write/MultiEdit and handles compilation/lint checks:

From settings.json line 889-891:
```json
{
  "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/bundles/edit-bundle.mjs",
  "timeout": 12000
}
```

**Matcher:** `Edit|Write|MultiEdit` (line 885)

The bundle itself is not provided for full inspection, but the wiring shows it executes at PreToolUse (before writes complete). There are NO explicit `PostToolUse` hooks for eslint/tsc in the visible settings.json. **This is a PreToolUse gate, not PostToolUse.**

---

### (2) Stop hook that runs/gates on TEST SUITE before "done"

**Article-1-L3 (THE CRITICAL LAYER): PARTIALLY COVERED with wiring uncertainty**

**The bundle IS wired as a Stop hook** (settings.json line 607-609):
```json
{
  "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/bundles/stop-regression-bundle.mjs",
  "timeout": 30000
}
```

**DOES THE BUNDLE ACTUALLY INVOKE stop_on_failing_tests.mjs?**

YES — verbatim from stop-regression-bundle.mjs line 50:
```javascript
{ path: `${HOOK_BASE}/stop_on_failing_tests.mjs`,       timeout: 10000 },
```

The bundle runs `stop_on_failing_tests.mjs` as one of 10 sub-hooks in a **bounded async pool** (lines 67-79):
```javascript
async function runPool(specs, payload, n) {
  if (n === 0) return Promise.all(specs.map((s) => runHook(s.path, payload, s.timeout || 3000)));
  const results = new Array(specs.length);
  let next = 0;
  async function worker() {
    while (next < specs.length) {
      const my = next++;
      const s = specs[my];
      resul
... [+3791 chars truncated]
