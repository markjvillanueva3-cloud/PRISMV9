---
type: "chat-session"
source: "claude-code-cli"
session_id: "2645074c-83f3-4487-a236-8695c3e53c2c"
title: "INDEPENDENT SECOND-PASS REVIEW of `H:/prism/mcp-server/src/__tests__/psk.test.ts"
date: "2026-05-14"
first_ts: "2026-05-14T17:54:17.755Z"
last_ts: "2026-05-14T17:55:39.859Z"
cwd: "H:\\prism\\mcp-server"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/2645074c-83f3-4487-a236-8695c3e53c2c/subagents/agent-a22d56d8372bbca3e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# INDEPENDENT SECOND-PASS REVIEW of `H:/prism/mcp-server/src/__tests__/psk.test.ts

> **claude-code-cli** | 2026-05-14 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2645074c-83f3-4487-a236-8695c3e53c2c/subagents/agent-a22d56d8372bbca3e.jsonl`

## Transcript

### User | 2026-05-14T17:54:17.755Z

INDEPENDENT SECOND-PASS REVIEW of `H:/prism/mcp-server/src/__tests__/psk.test.ts`.

This is the test file for COMMAND-KERNEL-MS0/U-CK01. 21 tests all passing. Assume Agent A is checking the test-legitimacy contract (real-value assertions, fail-soft coverage). Your weight is on:

1. **Test verifies INTENT, not just behavior** (Karpathy R9). `expect(getUserName()).toBe('John')` is worthless if the fn returns a hardcoded id. For each test, ask: would this test FAIL if the underlying business logic broke? Specifically:
   - If psk.dispatch was hardcoded to return `{ok:true, syscall:"manifest"}` regardless of input, which of these tests would still pass? (That's a bug — they should fail.)
   - The "FAIL-SOFT INVARIANT" loop tests no-throw — would it fail if syscall_pick was broken (returns garbage)? Walk through.
   - The "ANTI-REGRESSION" available-actions test — would it fail if I removed psk from ACTIONS? Yes (the .toContain assertion). Good.
   - The "flat-merge" test — would it fail if I removed the flat-merge code from the dispatcher? Yes — error would be "missing required field". Good.
   - The "nested-wins" test asserts `entry.event === "NESTED-value"`. Would it fail if nested-wins broke (flat-wins)? Yes. Good.

2. **Brittle assertion patterns.** Look for:
   - String matches that would break on minor wording changes (e.g. `toMatch(/whitelist/i)`). Could the implementation legitimately reword the error message and break the test? P3 if so.
   - Hardcoded constants that should be derived (action count 84 is hardcoded — what if a future unit adds an action?).
   - Path assertions (`/.claude/helpers`) that would break on a refactor.

3. **False-positive / false-negative risk.** Run this thought experiment for each test:
   - Could the test PASS while the code is broken? (False positive — bad.)
   - Could the test FAIL while the code is correct? (False negative — flaky.)
   - Specifically the `record` syscall tests: the test asserts either ok=true or fallback path. W
... [+3672 chars truncated]

### Assistant | 2026-05-14T17:54:24.731Z

I'll perform an independent second-pass review of the test file with focus on Karpathy R9, brittle assertions, test isolation, and untested critical paths.

### Assistant | 2026-05-14T17:54:25.195Z

[tool_use: Read]

### User | 2026-05-14T17:54:26.951Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\psk.test.ts' was already read 34s ago in this session and is unchanged (mtime 1778781148182). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-14T17:54:30.219Z

The test file content is in my context. Let me also verify the dispatcher source and related files to fully assess the test's intent verification.

### Assistant | 2026-05-14T17:54:30.741Z

[tool_use: Bash]

### User | 2026-05-14T17:54:35.532Z

[tool_result] /**
 * psk.test.ts — COMMAND-KERNEL-MS0/U-CK01 acceptance tests.
 *
 * Covers the U-CK01 exit conditions:
 *   1. `node .claude/kernel/psk.mjs --help` enumerates every declared syscall
 *      (count DERIVED from psk's own table, NOT a hardcoded literal).
 *   2. `prism_session:psk` MCP action round-trips a syscall via the dispatcher.
 *   3. ≥8 cases incl. fail-soft on every syscall.
 *
 * Real-v
... [+12405 chars truncated]

### Assistant | 2026-05-14T17:54:38.501Z

[tool_use: Read]

### User | 2026-05-14T17:54:41.041Z

[tool_result] 300	    // via record's required-field check — if the merge worked, event+command
301	    // arrive at the syscall; if it didn't, the syscall rejects with
302	    // "missing required field: event".
303	    const handler = captureHandler(registerSessionDispatcher);
304	    const out = unwrap(await handler({
305	      action: "psk",
306	      params: { syscall: "record", event: "flat-merge-proof", 
... [+3374 chars truncated]

### Assistant | 2026-05-14T17:55:39.859Z

Now I have full context. Let me complete the second-pass review focusing on Karpathy R9 and the specific failure-mode questions raised.

```
PASS | FAIL: PASS (with P2 actionable items, no P0/P1 blockers)

P0: []

P1: []

P2:
1. SIDE-EFFECT TEST POLLUTION (Karpathy R9 adjacent — test isolation)
   Two tests write to the REAL pipeline-telemetry.jsonl:
   - "dispatch('record', {event,command}) returns structured result" → appends "psk-test" event
   - "dispatch('record', {extra:huge}) caps extra at 8 KiB" → appends "cap-test" event
   Every `npx vitest run` adds 2 entries to production telemetry. Over 100 test runs that's 200 entries
   polluting real shop-floor data. There is NO beforeEach/afterEach cleanup.
   Fix: redirect telemetry path via env var (PRISM_TELEMETRY_PATH or similar) to a tmp file in
   beforeAll(), or assert the test detects fallback path (read-only tmp dir) and verifies cap there.
   Risk-of-leak Karpathy R12: "fail loud" — if the success path silently writes to prod,
   the test is hiding a side-effect contract.

2. SCHEMA-VALIDATION REJECTION IS UNTESTED (untested critical path)
   The Zod schema requires `syscall: z.string().min(1)`. If a caller invokes the MCP wire with
   `params: { syscall: "" }` or `params: {}` (missing syscall entirely), validateActionParams
   should reject with a Zod error BEFORE reaching psk.dispatch. No test exercises this gate.
   This is a real bug surface — a malformed MCP call could either silently dispatch with
   `undefined` syscall (depending on dispatcher behavior) OR throw an unhandled Zod error
   that crashes the dispatcher response shape.
   Fix: add a test:
     it("MCP rejects 'psk' with missing 'syscall' field via Zod validation")
     // assert: response is a Zod error envelope, NOT a thrown exception

3. CLI EXIT-CONDITION #1 IS ONLY TRANSITIVELY TESTED
   The U-CK01 envelope's exit-condition #1 says:
     "`node .claude/kernel/psk.mjs --help` enumerates every declared syscall"
   The test verifies lis
... [+8625 chars truncated]
