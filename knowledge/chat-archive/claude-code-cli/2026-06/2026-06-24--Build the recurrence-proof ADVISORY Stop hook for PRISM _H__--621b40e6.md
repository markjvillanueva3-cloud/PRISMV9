---
type: "chat-session"
source: "claude-code-cli"
session_id: "621b40e6-642b-48d2-bd0d-2c75bf77af44"
title: "Build the recurrence-proof ADVISORY Stop hook for PRISM (H:/prism). Background: "
date: "2026-06-24"
first_ts: "2026-06-24T17:27:26.696Z"
last_ts: "2026-06-24T17:36:32.380Z"
cwd: "H:\\prism"
messages: 80
user_msgs: 31
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-ae7d0ad97ac88ae95.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Build the recurrence-proof ADVISORY Stop hook for PRISM (H:/prism). Background: 

> **claude-code-cli** | 2026-06-24 | 80 msgs (31 user / 49 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-ae7d0ad97ac88ae95.jsonl`

## Transcript

### User | 2026-06-24T17:27:26.696Z

Build the recurrence-proof ADVISORY Stop hook for PRISM (H:/prism). Background: `scripts/audit-dispatcher-engine-methods.mjs` exports a pure `scanDispatchers()` returning {dir, scanned, dispatchers[], missingTotal, missing[]} -- it detects dispatcher->engine method drift (a handler calling engine.METHOD() that doesn't exist). It is UNWIRED (never runs), which is why ~40-49 drift instances accumulated undetected. Wire-as-advisory so future drift surfaces at Stop.

BUILD `.claude/hooks/stop-dispatcher-method-drift-advisory.mjs`:
- ADVISORY ONLY: emit `{continue:true, systemMessage:"..."}` with the MISSING count + top-3 offending dispatchers. NEVER `decision:"block"`. Reads stdin JSON (standard Stop hook), writes JSON to stdout.
- THROTTLED: gate to at most once per ~1 hour via a sidecar timestamp file in `mcp-server/data/state/` (e.g. dispatcher-drift-advisory-last.json). Scanning 107 dispatchers + engines is heavy; within the window, return {continue:true} with no scan.
- FAILS OPEN: any error -> {continue:true} (never break Stop).
- imports `scanDispatchers` from the existing auditor (do NOT reimplement the scan).
- honors `PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE=1` kill switch (return {continue:true} immediately).
- ASCII-only, no stubs.

Study an existing advisory Stop hook for the EXACT JSON contract + throttle pattern: read `.claude/hooks/stop-bug-finding-wiki-gate.mjs` and/or `.claude/hooks/close-out-audit-suggest.mjs`. Match the portable-node shebang + the project's hook conventions.

Write a companion test `.claude/hooks/__tests__/stop-dispatcher-method-drift-advisory.test.mjs` (node:test or vitest -- match sibling hook tests) proving: (1) advisory-not-blocking (never emits decision:block even with missing>0), (2) throttle skips a scan within the window, (3) fail-open on a scanDispatchers error (inject a throwing dep). Run the test and report pass/fail.

Do NOT edit settings.json (the orchestrator wires that -- it is C->H mirror-sensitive). Return: hookPath, 
... [+162 chars truncated]

### Assistant | 2026-06-24T17:27:30.842Z

[tool_use: TaskCreate]

### User | 2026-06-24T17:27:31.436Z

[tool_result] Task #7 created successfully: Build stop-dispatcher-method-drift-advisory.mjs hook + test

### Assistant | 2026-06-24T17:27:34.541Z

[tool_use: TaskUpdate]

### User | 2026-06-24T17:27:35.362Z

[tool_result] Updated task #7 status

### Assistant | 2026-06-24T17:27:37.719Z

Let me study the existing advisory hooks and the auditor first, in parallel.

### Assistant | 2026-06-24T17:27:38.727Z

[tool_use: Read]

### User | 2026-06-24T17:27:40.887Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-bug-finding-wiki-gate.mjs — Stop advisory hook enforcing the
5	 * [[feedback_always_update_wiki_on_bug_finding]] standing rule.
6	 *
7	 * Detects bug-finding artifacts shipped in this session's commits (or
8	 * uncommitted in the working tree) and verifies a companion wiki entry
9	 * exists. Three detection signals:
10	 *
11	 *   1. New line adde
... [+15970 chars truncated]

### Assistant | 2026-06-24T17:27:45.832Z

Now let me read the close-out advisory hook for its throttle pattern and the audit script:

### Assistant | 2026-06-24T17:27:46.106Z

[tool_use: Read]

### User | 2026-06-24T17:27:47.511Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * close-out-audit-suggest.mjs
5	 *
6	 * UserPromptSubmit advisory hook. Fires when the user mentions close-out
7	 * keywords ("close out", "envelope drift", "stale milestones", "shipped
8	 * but pending", etc.) and surfaces:
9	 *   - the count of pending close-out candidates from the most recent audit
10	 *   - the freshness of CLOSE-OUT-CANDIDATES.json
... [+5963 chars truncated]

### Assistant | 2026-06-24T17:27:50.760Z

Now let me read the auditor script and a sibling Stop hook test to understand the test patterns:

### Assistant | 2026-06-24T17:27:50.967Z

[tool_use: Read]

### User | 2026-06-24T17:27:52.255Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * audit-dispatcher-engine-methods.mjs -- standing audit: does every METHOD a
4	 * dispatcher calls on a resolved engine actually exist on that engine's class?
5	 *
6	 * [BACKEND-INTEGRITY]/U-DISPATCHER-ENGINE-METHOD-AUDIT (slot:bravo, 2026-06-22).
7	 *
8	 * THE THIRD SIBLING of the dispatcher-integrity family -- it catches a class of
9	 * silent runtime bug that the 
... [+19062 chars truncated]

### Assistant | 2026-06-24T17:27:58.959Z

Now let me look at a sibling Stop hook test to understand the test file pattern:

### Assistant | 2026-06-24T17:28:01.193Z

[tool_use: Glob]

### User | 2026-06-24T17:28:02.740Z

[tool_result] .claude\hooks\__tests__\stop-force-handoff.test.mjs
.claude\hooks\bundles\__tests__\stop-regression-bundle.test.mjs
.claude\hooks\__tests__\stop-playbook-corpus-drift-advisory.test.mjs
.claude\hooks\__tests__\stop-session-spend-summary.test.mjs
.claude\hooks\__tests__\stop-token-savings-summary.test.mjs
.claude\hooks\__tests__\stop-rtk-fraction-recalibrate.test.mjs
.claude\hooks\__tests__\stop-goa
... [+457 chars truncated]

### Assistant | 2026-06-24T17:28:05.633Z

Good - now read the advisory stop hook test pattern:

### Assistant | 2026-06-24T17:28:05.867Z

[tool_use: Read]

### User | 2026-06-24T17:28:07.506Z

[tool_result] 1	import { describe, it } from "node:test";
2	import assert from "node:assert/strict";
3	import { scanPlaybookSource } from "../stop-playbook-corpus-drift-advisory.mjs";
4	
5	// Tests for scanPlaybookSource — the pure static-parse core of the playbook
6	// corpus-drift advisory Stop hook. Uses synthetic source fixtures so tests
7	// are deterministic, fast, and don't depend on the 5900-line real e
... [+5740 chars truncated]

### Assistant | 2026-06-24T17:28:12.493Z

Now let me also look at a Stop hook that uses a throttle/timestamp pattern, and check what the shebang looks like across hooks:

### Assistant | 2026-06-24T17:28:13.233Z

[tool_use: Read]

### User | 2026-06-24T17:28:14.659Z

[tool_result] 1	// Tests for stop-task-boundary-compact-nudge.mjs (SESSION-CONTINUITY-AGENTIC/U-TASK-BOUNDARY-COMPACT)
2	// R9: real fixtures, assert exact behavior (fire condition, band edges, batch
3	// floor, bound cap, both knobs, handoff append idempotency + RESUME preservation,
4	// honest-limit ENFORCE block). Hermetic: PRISM_TEST_* overrides + injected batch
5	// count bypass git. node:test.
6	
7	import
... [+12852 chars truncated]

### Assistant | 2026-06-24T17:28:20.881Z

Now I have all the context I need. Let me check how an existing Stop advisory hook reads stdin and how the settings.json Stop array is structured:

### Assistant | 2026-06-24T17:28:22.701Z

[tool_use: Bash]

### User | 2026-06-24T17:28:27.342Z

[tool_result] #!/usr/bin/env node

### Assistant | 2026-06-24T17:28:31.752Z

[tool_use: Bash]

### User | 2026-06-24T17:28:36.067Z

[tool_result] [
  "matcher",
  "hooks"
]
hooks count: 63
[
  {
    "type": "command",
    "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/active-chat-priority-decay.mjs",
    "timeout": 3000
  },
  {
    "type": "command",
    "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-hook-aggregator.mjs",
    "timeout": 5000
  },
  {
    "type": "command",
    "command": "\"H:
... [+421 chars truncated]

### Assistant | 2026-06-24T17:28:40.326Z

[tool_use: Bash]

### User | 2026-06-24T17:28:45.825Z

[tool_result] bug-finding-wiki-gate index: 23
{
  "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-bug-finding-wiki-gate.mjs",
  "timeout": 4000
}
prev hook: {
  "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/regression-auto-write.mjs",
  "timeout": 3000
}

### Assistant | 2026-06-24T17:28:49.158Z

[tool_use: Bash]

### User | 2026-06-24T17:28:53.396Z

[tool_result] close-out-audit-suggest index: -1

### Assistant | 2026-06-24T17:28:57.755Z

[tool_use: Bash]

### User | 2026-06-24T17:29:01.873Z

[tool_result] [
  {
    "i": 16,
    "cmd": "stop-slot-task-claims-advisory.mjs"
  },
  {
    "i": 18,
    "cmd": "stop-cross-tree-collision-advisory.mjs"
  },
  {
    "i": 23,
    "cmd": "stop-bug-finding-wiki-gate.mjs"
  },
  {
    "i": 24,
    "cmd": "stop-memory-to-wiki-suggest.mjs"
  },
  {
    "i": 25,
    "cmd": "stop-playbook-corpus-drift-advisory.mjs"
  },
  {
    "i": 28,
    "cmd": "stop-wiring-audit
... [+159 chars truncated]

### Assistant | 2026-06-24T17:29:05.264Z

Now I have everything I need. Let me check the existing wiring advisory stop hook to see its timeout pattern, then write both files:

### Assistant | 2026-06-24T17:29:06.370Z

[tool_use: Bash]

### User | 2026-06-24T17:29:10.491Z

[tool_result] {
  "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-wiring-audit-suggest.mjs",
  "timeout": 2000
}
{
  "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/error-pattern-promote.mjs",
  "timeout": 5000
}
{
  "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/blueprint-coverage-fl
... [+35 chars truncated]

### Assistant | 2026-06-24T17:29:14.393Z

Now I have everything I need. Let me write the hook and test:

### Assistant | 2026-06-24T17:29:50.762Z

[tool_use: Write]

### User | 2026-06-24T17:29:56.554Z

[tool_result] File created successfully at: H:\prism\.claude\hooks\stop-dispatcher-method-drift-advisory.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-24T17:29:59.206Z

Now write the companion test file:

### Assistant | 2026-06-24T17:30:43.844Z

[tool_use: Write]

### User | 2026-06-24T17:30:49.757Z

[tool_result] File created successfully at: H:\prism\.claude\hooks\__tests__\stop-dispatcher-method-drift-advisory.test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-24T17:30:53.420Z

The hook uses `_stateFile` and `_now` opts that aren't wired into the hook implementation yet. I need to update the hook to accept those test seams, then run the tests:

### Assistant | 2026-06-24T17:30:53.956Z

[tool_use: Read]

### User | 2026-06-24T17:30:55.284Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-dispatcher-method-drift-advisory.mjs -- Stop advisory hook that runs
5	 * audit-dispatcher-engine-methods.mjs at most once per ~1 hour and surfaces
6	 * any dispatcher->engine method-drift findings as a systemMessage.
7	 *
8	 * Background: audit-dispatcher-engine-methods.mjs exports `scanDispatchers()`
9	 * which detects handlers that call engine
... [+4682 chars truncated]

### Assistant | 2026-06-24T17:31:00.853Z

The `runGate` function uses module-level `STATE_FILE` which is resolved at import time from the env var. The test injects `_stateFile` as an option but the hook ignores it — the throttle helpers read the module-level `STATE_FILE` constant. I need to rewrite `runGate` to accept `_stateFile` as a runtime override, threading it into `readLastRun`/`writeLastRun`. Let me fix the hook:

### Assistant | 2026-06-24T17:31:38.666Z

[tool_use: Write]

### User | 2026-06-24T17:31:44.155Z

[tool_result] [ascii-guard] Blocked: smart-substitution / non-ASCII chars in a code file (H:\prism\.claude\hooks\stop-dispatcher-method-drift-advisory.mjs). These break PS 5.1 decoding, parsers, diffs, and grep:
  - "—" (em dash) at line 78:51 -> use --
Fix: replace each with its ASCII form above, then retry. Legit case? PRISM_ASCII_GUARD_BYPASS=1 (logged). Markdown/docs are never blocked.

### User | 2026-06-24T17:33:32.181Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   Build a recurrence-proof ADVISORY Stop hook for PRISM (`H:/prism`) that wires the existing `scripts/audit-dispatcher-engine-methods.mjs` auditor so dispatcher->engine method drift surfaces at Stop instead of accumulating silently. The task is explicit:
   - **Hook**: `.claude/hooks/stop-dispatcher-method-drift-advisory.mjs` — ADVISORY ONLY (`{continue:true}`), throttled ~1h via sidecar at `mcp-server/data/state/dispatcher-drift-advisory-last.json`, fail-open on any error, kill switch `PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE=1`, imports `scanDispatchers` from existing auditor (no reimplementation), ASCII-only, no stubs
   - **Test**: `.claude/hooks/__tests__/stop-dispatcher-method-drift-advisory.test.mjs` using node:test proving: (1) advisory-not-blocking, (2) throttle skips within window, (3) fail-open on `scanDispatchers` error. Run tests and report pass/fail
   - **Return**: hookPath, testPath, testsPass(bool), exact settings.json Stop-array entry + where to place it, throttle design
   - Do NOT edit settings.json (orchestrator wires that)

2. Key Technical Concepts:
   - PRISM Stop hook JSON contract: read stdin JSON, write JSON to stdout; `{continue:true}` for advisory, `{continue:false, decision:"block"}` only for blocking hooks
   - Advisory hook pattern: `{continue:true, systemMessage:"..."}` — never emits `decision:block`
   - Throttle via sidecar timestamp JSON file (`lastRunMs` field), checking `Date.now() - lastRunMs < THROTTLE_MS`
   - Fail-open: all errors return `{continue:true}` silently
   - `scanDispatchers(opts)` from `scripts/audit-dispatcher-engine-methods.mjs` — returns `{dir, scanned, dispatchers[], missingTotal, missing[]}`; each dispatcher has `.file`, `.missing[]`, `.indeterminate[]`, `.liveCount`; each missing item has `{key, method, engine, candid
... [+9992 chars truncated]

### Assistant | 2026-06-24T17:34:13.281Z

The current hook file (line 178) uses `opts._now === undefined && isThrottled()` — that bypasses the throttle when `_now` is provided but `_stateFile` is still read from the module-level `STATE_FILE`. The tests inject `_stateFile` expecting it to be the per-test tmpdir path. I need to rewrite the hook to thread `_stateFile` properly through the throttle helpers.

### Assistant | 2026-06-24T17:34:13.908Z

[tool_use: Read]

### User | 2026-06-24T17:34:15.008Z

[tool_result] Wasted call — file unchanged since your last Read. Refer to that earlier tool_result instead.

### Assistant | 2026-06-24T17:34:21.019Z

The current hook has the throttle helpers using module-level `STATE_FILE` constant. I need to edit the file to thread `_stateFile` through `runGate` into the helpers. The key changes:

1. Make `readLastRun(stateFile)`, `writeLastRun(stateFile)`, `isThrottled(stateFile, now)` accept a `stateFile` param
2. In `runGate`, resolve `stateFile = opts._stateFile || DEFAULT_STATE_FILE` and pass it through
3. Fix the `renderAdvisory(null)` crash (current code does `result.missingTotal` on null)
4. Fix em-dash (ascii guard blocked last attempt)

### Assistant | 2026-06-24T17:34:31.339Z

[tool_use: Edit]

### User | 2026-06-24T17:34:36.657Z

[tool_result] The file H:\prism\.claude\hooks\stop-dispatcher-method-drift-advisory.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-24T17:34:40.948Z

Now fix `runGate` to use `DEFAULT_STATE_FILE` renamed constant and pass `stateFile` + `_now` through to the helpers:

### Assistant | 2026-06-24T17:34:46.881Z

[tool_use: Edit]

### User | 2026-06-24T17:34:53.190Z

[tool_result] The file H:\prism\.claude\hooks\stop-dispatcher-method-drift-advisory.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-24T17:34:56.828Z

Now fix `renderAdvisory` to handle `null`/`undefined` input without crashing:

### Assistant | 2026-06-24T17:34:58.310Z

[tool_use: Edit]

### User | 2026-06-24T17:35:04.267Z

[tool_result] The file H:\prism\.claude\hooks\stop-dispatcher-method-drift-advisory.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-24T17:35:06.441Z

Now run the tests to check pass/fail:

### Assistant | 2026-06-24T17:35:07.392Z

[tool_use: Bash]

### User | 2026-06-24T17:35:14.919Z

[tool_result] [stop-dispatcher-method-drift-advisory] scan error: simulated scan failure
TAP version 13
# Subtest: advisory-not-blocking
    # Subtest: returns continue:true when scan finds missing methods
    ok 1 - returns continue:true when scan finds missing methods
      ---
      duration_ms: 1.6242
      ...
    # Subtest: returns continue:true when scan finds zero missing methods
    ok 2 - returns cont
... [+4017 chars truncated]

### Assistant | 2026-06-24T17:35:18.020Z

All 20 tests pass. Now find the right insertion point in settings.json:

### Assistant | 2026-06-24T17:35:22.354Z

[tool_use: Bash]

### User | 2026-06-24T17:35:25.727Z

[tool_result] Exit code 1
[eval]:8
      console.log('FOUND advisory at Stop['+i+']:', h.command.match(/([^/\]+\.mjs)/)?.[1]);
                                                                    ^

SyntaxError: Invalid regular expression: missing /
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:22
    at [eval]-wrapper:6:24
    at runScript (node:interna
... [+150 chars truncated]

### Assistant | 2026-06-24T17:35:33.557Z

[tool_use: Bash]

### User | 2026-06-24T17:35:37.781Z

[tool_result] Exit code 1
[eval]:11
    const name = cmd.split('/').pop().split('\').pop();
                                            ^^^^^^^^^^^

SyntaxError: Invalid or unexpected token
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:22
    at [eval]-wrapper:6:24
    at runScript (node:internal/process/execution:101:62)
    at evalScript (node:intern
... [+91 chars truncated]

### Assistant | 2026-06-24T17:35:42.487Z

[tool_use: Bash]

### User | 2026-06-24T17:35:45.766Z

[tool_result] Exit code 1
file:///H:/prism/[eval1]:10
    const parts = cmd.split(/[/\]/);
                            ^

SyntaxError: Invalid regular expression: missing /
    at compileSourceTextModule (node:internal/modules/esm/utils:338:16)
    at ModuleLoader.eval (node:internal/modules/esm/loader:212:18)
    at node:internal/process/execution:68:24
    at asyncRunEntryPointWithESMLoader (node:inte
... [+414 chars truncated]

### Assistant | 2026-06-24T17:35:50.106Z

[tool_use: Bash]

### User | 2026-06-24T17:35:55.339Z

[tool_result] 7

### Assistant | 2026-06-24T17:35:59.554Z

[tool_use: Bash]

### User | 2026-06-24T17:36:03.519Z

[tool_result] [0] "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/stop-reblock-storm-breaker
[1] "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/stop-memory-size-watchdog.
[2] "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/stop-system-awareness-fres
[3] "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/compact-interval-warning.m
[4] "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/st
... [+192 chars truncated]

### Assistant | 2026-06-24T17:36:07.514Z

Good — 7 Stop entries total. The new hook goes at index 7 (after index 6, `stop-consensus-drain.mjs`). Let me verify what a full entry looks like:

### Assistant | 2026-06-24T17:36:08.404Z

[tool_use: Bash]

### User | 2026-06-24T17:36:13.763Z

[tool_result] {
  "hooks": [
    {
      "type": "command",
      "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-consensus-drain.mjs",
      "timeout": 3000
    }
  ]
}

### Assistant | 2026-06-24T17:36:32.380Z

All 20 tests pass. Here is the complete deliverable summary:

---

**hookPath:** `H:\prism\.claude\hooks\stop-dispatcher-method-drift-advisory.mjs`

**testPath:** `H:\prism\.claude\hooks\__tests__\stop-dispatcher-method-drift-advisory.test.mjs`

**testsPass:** true — 20/20, 0 failures (6 describe blocks: advisory-not-blocking x3, throttle x4, fail-open x3, kill-switch x1, renderAdvisory x8, CLI round-trip x1)

---

**Exact settings.json Stop-array entry to add:**

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-dispatcher-method-drift-advisory.mjs",
      "timeout": 8000
    }
  ]
}
```

Timeout is 8000ms (not 3000) because the scan touches 107 dispatcher files and their resolved engine classes — 3s is tight under fleet load. If it exceeds the window it fail-opens anyway, but 8s gives the scan a real chance to complete before the throttle window saves it next time.

**WHERE to place it:** After the existing `Stop[6]` (`stop-consensus-drain.mjs`) entry — append as `Stop[7]` (the last entry in the `hooks.Stop` array). The current array has 7 entries (indices 0-6); this becomes index 7.

---

**Throttle design:**

- Sidecar: `mcp-server/data/state/dispatcher-drift-advisory-last.json` — stores `{lastRunMs, schemaVersion:"1.0.0"}`
- Default window: 3,600,000ms (1 hour). Override with `PRISM_DISPATCHER_DRIFT_THROTTLE_MS=N`
- On entry: `isThrottled(stateFile, now)` reads `lastRunMs`, computes `elapsed = now - lastRunMs`. If `0 <= elapsed < THROTTLE_MS` -> skip scan, return `{continue:true}` immediately.
- On scan completion (no error): `writeLastRun(stateFile)` writes current `Date.now()` — even if `missingTotal===0` (so clean runs also reset the window and don't re-scan for an hour).
- On scan error: sidecar is NOT written (so the next Stop will retry immediately — fail-open doesn't silently suppress future runs).
- Test seam: `runGate({_stateFile: "/tmp/...json", _now: 0})` — both params
... [+246 chars truncated]
