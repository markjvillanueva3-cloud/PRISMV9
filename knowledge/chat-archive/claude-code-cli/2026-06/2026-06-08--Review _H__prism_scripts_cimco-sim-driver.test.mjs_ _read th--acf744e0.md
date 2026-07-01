---
type: "chat-session"
source: "claude-code-cli"
session_id: "acf744e0-dffd-4f18-a0c0-bff8081088a4"
title: "Review `H:/prism/scripts/cimco-sim-driver.test.mjs` (read the WHOLE file) for TE"
date: "2026-06-08"
first_ts: "2026-06-08T16:33:46.311Z"
last_ts: "2026-06-08T16:35:42.778Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/acf744e0-dffd-4f18-a0c0-bff8081088a4/subagents/agent-aedbaabda8305ac4b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Review `H:/prism/scripts/cimco-sim-driver.test.mjs` (read the WHOLE file) for TE

> **claude-code-cli** | 2026-06-08 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/acf744e0-dffd-4f18-a0c0-bff8081088a4/subagents/agent-aedbaabda8305ac4b.jsonl`

## Transcript

### User | 2026-06-08T16:33:46.311Z

Review `H:/prism/scripts/cimco-sim-driver.test.mjs` (read the WHOLE file) for TEST INTEGRITY. It tests `scripts/cimco-sim-driver.mjs`, a Node orchestrator that drives CIMCO Edit Machine Simulation for CNC post-processor verification — a safety-critical tool (a false "cleared for live run" could crash a CNC machine).

The suite has 30 tests, all currently passing. Your job: would these tests FAIL if the business logic broke (R9 — tests verify intent, not behavior)?

Check specifically:
1. Are any tests tautological / would pass even with a stubbed/wrong implementation? (e.g. asserting `toBeDefined` on something that's always defined, or asserting a value the test itself hardcodes.)
2. The SAFETY-CRITICAL assertions: do the tests genuinely lock down "no degraded path ever yields a clearance"? Specifically — would the test `modeDrive mock: an EMPTY report is NEVER clean` actually catch a regression where someone made an empty report return `clearedForLiveRun:true`? Would `ADVERSARIAL: a blocked ui-driver result must not yield a cleared verdict` catch a real leak?
3. The `isMockRun` tests: do they prove the AND-of-two-gates (both `--no-mock` AND `PRISM_CIMCO_MOCK=0` required to go live)? Is every quadrant of the truth table covered (neither / flag-only / env-only / both)?
4. The `parseTailJson` nested-brace test: does it actually exercise the bug it claims to guard (a `map` envelope whose last `{` is inside `controls[]`)?
5. Coverage gaps: which behaviors of the driver's exported functions (parseArgs, isMockRun, probeEnv, parseTailJson, runUiDriver, modeLaunch, modeVerify, modeDrive) are NOT tested? Name them.
6. Real-data dependency: the suite uses a real JM .cps as the NC fixture (`HAAS_VF2_-Ai-Enhanced (iMachining).cps`). Is that brittle (would a missing file silently skip vs fail)?

Output: PASS or FAIL, then a numbered P0/P1/P2 list of test-integrity issues with the test name + concrete strengthening. Flag any test that gives false confidence.

### Assistant | 2026-06-08T16:33:59.309Z

I'll read and review the test file for integrity against R9 (tests verify intent, not behavior) and safety-critical expectations.

### Assistant | 2026-06-08T16:33:59.581Z

[tool_use: Read]

### User | 2026-06-08T16:34:04.335Z

[tool_result] 1	// Tests for scripts/cimco-sim-driver.mjs (U-CIMCO-SIM-2).
2	//
3	// Real-behavior tests (R9): every assertion encodes WHY the behavior matters for
4	// a CNC safety tool. No live CIMCO — the ui-driver spawn is injected as a spy so
5	// every branch (timeout / spawn-fail / bad-output / good-JSON) is exercised
6	// deterministically. The crux: no degraded path may ever surface a clearance.
7	//
8
... [+12217 chars truncated]

### Assistant | 2026-06-08T16:34:09.332Z

Now let me read the actual implementation to understand what the tests are supposed to verify:

### Assistant | 2026-06-08T16:34:09.792Z

[tool_use: Read]

### User | 2026-06-08T16:34:13.038Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * CIMCO Machine-Simulation Driver — Node orchestrator (U-CIMCO-SIM-2).
4	 *
5	 * The connective tissue between the shipped C# MSAA helper (PrismCimcoUI.exe)
6	 * and the shipped verdict core (cimco-control-map.parseSimulationReport +
7	 * CimcoVerificationBridgeEngine.assessLiveRunClearance), so a PRISM-emitted .NC
8	 * can be round-tripped:
9	 *   post → .NC → CIMCO
... [+20613 chars truncated]

### Assistant | 2026-06-08T16:34:16.443Z

Now let me check what `parseSimulationReport` does to understand if the fail-closed guarantees are real:

### Assistant | 2026-06-08T16:34:17.039Z

[tool_use: Read]

### User | 2026-06-08T16:34:20.032Z

[tool_result] 1	// cimco-control-map.mjs — PRISM ↔ CIMCO Edit 2026 control map (API-first, UIA-fallback)
2	//
3	// "Navigate the full map of CIMCO to actively control it without screenshots."
4	// Mirrors the proven WinMax driver pattern (scripts/winmax-ui-map.mjs): a screen/command
5	// FSM + path resolver, but API-FIRST — CIMCO exposes real channels (CLI file-open, DNC-Max
6	// API, bundled MariaDB, JSON mach
... [+4916 chars truncated]

### Assistant | 2026-06-08T16:34:24.267Z

[tool_use: Grep]

### User | 2026-06-08T16:34:29.289Z

[tool_result] No files found

### Assistant | 2026-06-08T16:34:33.641Z

Let me search more specifically:

### Assistant | 2026-06-08T16:34:34.282Z

[tool_use: Grep]

### User | 2026-06-08T16:34:35.951Z

[tool_result] Found 1 file
scripts\cimco-control-map.mjs

### Assistant | 2026-06-08T16:34:41.786Z

[tool_use: Read]

### User | 2026-06-08T16:34:46.631Z

[tool_result] 100	    confidence: CONF.LIKELY,
101	    evidence: "Simulation Report is an on-screen docking-pane tab; rows are UIA-readable text (no screenshot)",
102	    fallback: null,
103	  },
104	  {
105	    action: "file_compare",
106	    channel: CHANNELS.UIA,
107	    invocation: "UIA: File Compare (ignores block renumber + spacing) — for golden byte-check normalize whitespace yourself",
108	    confidenc
... [+9441 chars truncated]

### Assistant | 2026-06-08T16:34:52.389Z

[tool_use: Read]

### User | 2026-06-08T16:34:55.237Z

[tool_result] 300	  if (parts.length === 0) warnings.push("no MachinePartGroups — kinematic chain empty/unparsed");
301	  if (collisionPairs.length === 0) warnings.push("no Collision pairs — collision detection unconfigured");
302	
303	  return {
304	    displayName: header.DisplayName ?? null,
305	    orientation: header.Orientation ?? null, // observed CIMCO values: "Horizontal" / "Vertical" / "Lathe"
306	   
... [+7801 chars truncated]

### Assistant | 2026-06-08T16:35:01.143Z

[tool_use: Read]

### User | 2026-06-08T16:35:03.909Z

[tool_result] 450	    warnings: buckets.warning,
451	    collisions: buckets.collision,
452	    limits: buckets.limit,
453	    collisionCheckConfirmed, // did the collision/limit check demonstrably run?
454	    clearedForLiveRun, // pass AND the check ran — the ONLY safe "go" signal (fail-OPEN guard)
455	    summary,
456	  };
457	}
458	
459	// ─── CLI (argv-guarded, mirrors winmax-ui-map.mjs) ──────────────────
... [+1026 chars truncated]

### Assistant | 2026-06-08T16:35:42.778Z

Perfect. I now have enough context. Let me analyze the test suite against R9 (tests verify intent, not behavior) and safety-critical requirements.

## VERDICT: **FAIL**

The test suite has 4 P0/P1 integrity issues that create **false confidence** in a safety-critical tool. Here are the findings:

---

## P0 & P1 Issues

### **P0-1: Test "modeDrive mock: an EMPTY report is NEVER clean" — Tautological Assertion (Line 215-221)**

**Problem:** The test calls `modeDrive(env, undefined)` and asserts `r.clearedForLiveRun === false`. This test appears to guard the most critical invariant (R12: fail-loud on empty reports). BUT:

1. The test **never exercises the real fail-closed logic**. It injects `undefined`, which becomes `null` in the driver (line 338: `const report = mockReport === undefined ? null : mockReport;`)
2. `parseSimulationReport(null)` has explicit logic at line 388-389: `if (input == null) { // empty report = clean run (sim ran, found nothing) }`
3. BUT then at line 428-430:
   ```typescript
   const anyFindings = counts.error + counts.warning + counts.collision + counts.limit > 0;
   const collisionCheckConfirmed = anyFindings || explicitCheckRan === true;
   const clearedForLiveRun = pass && collisionCheckConfirmed;
   ```
   With an empty null input, `anyFindings=0`, `explicitCheckRan=undefined`, so `collisionCheckConfirmed=false`. Therefore `clearedForLiveRun` is ALWAYS false for null/empty input.

**The test would still PASS if the logic were broken to `clearedForLiveRun = pass || collisionCheckConfirmed`** (the OR would be catastrophic). The assertion tests the IMPLEMENTATION, not the invariant. **What's missing:** A test that proves `parseSimulationReport` is actually called AND that its fail-open guard works, i.e., test that a stubbed `parseSimulationReport` returning `{pass:true, clearedForLiveRun:true}` would **cause the test to fail**. Right now, the test doesn't import or spy on `parseSimulationReport`, so a regression where someone short-circuit
... [+8911 chars truncated]
