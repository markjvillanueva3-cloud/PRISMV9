---
type: "chat-session"
source: "claude-code-cli"
session_id: "2645074c-83f3-4487-a236-8695c3e53c2c"
title: "TEST-REVIEW SCRUTINY of `H:/prism/mcp-server/src/__tests__/psk.test.ts` for COMM"
date: "2026-05-14"
first_ts: "2026-05-14T17:53:47.708Z"
last_ts: "2026-05-14T17:55:07.825Z"
cwd: "H:\\prism\\mcp-server"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/2645074c-83f3-4487-a236-8695c3e53c2c/subagents/agent-a0ea292fdd0a5d524.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# TEST-REVIEW SCRUTINY of `H:/prism/mcp-server/src/__tests__/psk.test.ts` for COMM

> **claude-code-cli** | 2026-05-14 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2645074c-83f3-4487-a236-8695c3e53c2c/subagents/agent-a0ea292fdd0a5d524.jsonl`

## Transcript

### User | 2026-05-14T17:53:47.708Z

TEST-REVIEW SCRUTINY of `H:/prism/mcp-server/src/__tests__/psk.test.ts` for COMMAND-KERNEL-MS0/U-CK01.

## Unit's test contract (from envelope)
- ≥8 cases (target hit: 21)
- Fail-soft on EVERY syscall (10 syscalls: whoami / manifest / position / delta / tools / pick / checkin / handoff / record / recommend)
- Round-trip a syscall through `prism_session:psk` MCP dispatcher
- Real-value assertions (no toBeDefined / toBeTruthy stubs — enforced by test-legitimacy gate)

## Files under review
- `H:/prism/mcp-server/src/__tests__/psk.test.ts` (271 LOC, 21 tests passing)
- Test target: `H:/prism/.claude/kernel/psk.mjs` (reviewed in earlier scrutiny pass)
- Wiring under test: `H:/prism/mcp-server/src/tools/dispatchers/sessionDispatcher.ts` case "psk":, schema in sessionActionSchemas.ts

## Read end-to-end + grade

1. **Coverage of fail-soft contract.** The unit MUST verify that EVERY declared syscall is fail-soft. Read the FAIL-SOFT INVARIANT block (~L194-215). Does it:
   - Iterate every entry from listSyscalls()? (Should be dynamic, not hardcoded.)
   - Catch any throw as a test failure (not just `expect(threw).toBe(false)`)?
   - Assert the structured result shape per syscall?
   - Verify the syscall name is preserved in the result?

2. **Real-value assertions vs presence-only stubs.** PRISM bans `toBeDefined() / toBeTruthy()` as load-bearing assertions. Scan the file:
   - Are any `expect(...).toBeDefined()` calls present? (Should be ZERO.)
   - Are any `expect(...).toBeTruthy()` calls present that are not paired with structural assertions?
   - Does every test assert at least one CONCRETE value (string-match, exact equality, length-check, key-presence)?

3. **slimResponse-strip-safety.** psk.dispatch's degraded paths return `slot: null`, `branch: null`, `fallback: null`. slimResponse strips nulls before the MCP envelope serializes. Tests asserting `r.result.slot === null` would falsely fail. Walk every assertion in the "MCP wiring round-trip" describe block:
   - Are n
... [+2803 chars truncated]

### Assistant | 2026-05-14T17:53:50.493Z

I'll review the test file for COMMAND-KERNEL-MS0/U-CK01 against the contract you've specified.

### Assistant | 2026-05-14T17:53:50.773Z

[tool_use: Read]

### User | 2026-05-14T17:53:57.832Z

[tool_result] 1	/**
2	 * psk.test.ts — COMMAND-KERNEL-MS0/U-CK01 acceptance tests.
3	 *
4	 * Covers the U-CK01 exit conditions:
5	 *   1. `node .claude/kernel/psk.mjs --help` enumerates every declared syscall
6	 *      (count DERIVED from psk's own table, NOT a hardcoded literal).
7	 *   2. `prism_session:psk` MCP action round-trips a syscall via the dispatcher.
8	 *   3. ≥8 cases incl. fail-soft on every sysca
... [+17190 chars truncated]

### Assistant | 2026-05-14T17:53:59.907Z

Now let me check the actual psk.mjs implementation to verify the test is covering the actual contract:

### Assistant | 2026-05-14T17:54:00.015Z

[tool_use: Read]

### User | 2026-05-14T17:54:03.297Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * psk — PRISM Syscall Kernel (CLI dispatch shell)
4	 *
5	 * COMMAND-KERNEL-MS0 / U-CK01 — thin dispatch shell only. Declares the
6	 * 10-syscall surface every PRISM slash-command, hook, and MCP caller can
7	 * resolve live state through. The actual per-syscall semantics ship in
8	 * follow-on units:
9	 *   - U-CK02 fills whoami / manifest / position
10	 *   - U-CK03 
... [+32066 chars truncated]

### Assistant | 2026-05-14T17:54:04.785Z

Now let me verify the sessionDispatcher wiring to check the slimResponse behavior:

### Assistant | 2026-05-14T17:54:05.183Z

[tool_use: Read]

### User | 2026-05-14T17:54:07.442Z

[tool_result] 1	/**
2	 * Session Dispatcher — session lifecycle, state management, and context control.
3	 * (Action count auto-tracked in PRISM-INVENTORY-LATEST.md; the static "48 actions"
4	 * header from the original module has been corrected — refer to ACTIONS.length and
5	 * the inventory file for live counts.)
6	 *
7	 * Manages cross-session persistence (memory_save/recall), context pressure monitoring,
8
... [+3966 chars truncated]

### Assistant | 2026-05-14T17:54:08.868Z

Let me search for the psk action in the sessionDispatcher to understand the wiring:

### Assistant | 2026-05-14T17:54:09.486Z

[tool_use: Grep]

### User | 2026-05-14T17:54:14.014Z

[tool_result] Found 1 file
src\tools\dispatchers\sessionDispatcher.ts

### Assistant | 2026-05-14T17:54:15.548Z

[tool_use: Grep]

### User | 2026-05-14T17:54:21.406Z

[tool_result] 169-  "cross_session_force_invalidate_all",
170-  "cross_session_create_handoff",
171-  "cross_session_get_status",
172-  "cross_session_get_other_sessions",
173-  "cross_session_get_status_line",
174:  // COMMAND-KERNEL-MS0/U-CK01 — PRISM Syscall Kernel (psk) thin dispatch shell.
175-  // Composes 10 declared syscalls (whoami / manifest / position / delta /
176-  // tools / pick / checkin / hando
... [+3750 chars truncated]

### Assistant | 2026-05-14T17:54:22.582Z

Perfect. Now let me check the slimResponse to understand what gets stripped:

### Assistant | 2026-05-14T17:54:22.896Z

[tool_use: Read]

### User | 2026-05-14T17:54:27.531Z

[tool_result] 1	/**
2	 * Response Slimmer Utility
3	 * Reduces verbose response objects for MCP transport efficiency.
4	 * @module utils/responseSlimmer
5	 */
6	
7	/**
8	 * Slim a response object by removing null/undefined values and empty arrays.
9	 */
10	export function slimResponse<T>(response: T): T {
11	  if (response === null || response === undefined) {
12	    return response;
13	  }
14	  if (typeof resp
... [+1179 chars truncated]

### Assistant | 2026-05-14T17:55:07.825Z

Now I have all the context needed. Let me provide the structured scrutiny verdict:

---

## FINAL SCRUTINY VERDICT: `psk.test.ts` — COMMAND-KERNEL-MS0/U-CK01

### Overall Grade: **PASS** (with 2 P2 deferrables)

---

## Detailed Findings

### 1. **Coverage of fail-soft contract** ✅ PASS
- **L235-258**: FAIL-SOFT INVARIANT test iterates `listSyscalls()` dynamically (not hardcoded).
- Every syscall is invoked with empty params and asserts:
  - `(a)` no throw past dispatch() — L250: `expect(threw).toBe(false)`
  - `(b)` structured result with `ok` field — L251: `expect(typeof results[name].ok).toBe("boolean")`
  - `(c)` syscall name preserved — L254: `expect(got === name || got === null).toBe(true)`
- **Entry count check** (L257): `expect(Object.keys(results).length).toBe(10)` ensures all 10 syscalls tested.
- **All 10 syscalls individually tested** in describe block A (L71-277).

**Grade: PASS** — fail-soft contract fully satisfied.

---

### 2. **Real-value assertions vs presence-only stubs** ✅ PASS
- **Zero `toBeDefined()` / `toBeTruthy()` calls** anywhere in the file — all assertions are concrete.
- Examples of real-value checks:
  - L76: `expect(syscalls.length).toBe(10)` — exact count
  - L103: `expect(sourceKeys).toEqual(["buildState", "dispatcherDigest", "engineDigest", "inventory"])` — structural match
  - L105-106: `.endsWith()` checks on path strings
  - L109: `expect(typeof r.result.available[k]).toBe("boolean")` — type check paired with existence
  - L123: `expect(...endsWith(".claude/helpers")).toBe(true)` — concrete path validation
  - L169-171: `expect(r.result.entry.event).toBe("psk-test")` — exact equality on round-trip
  - L192: `expect(entry.extra.length).toBeLessThanOrEqual(8192)` — numeric bound

**Grade: PASS** — all assertions are load-bearing, no stubs detected.

---

### 3. **slimResponse-strip-safety** ✅ PASS
- **slimResponse strips null/undefined valued fields** (responseSlimmer.ts L23: `if (value === null || value === undefined) continue;`)
... [+9636 chars truncated]
