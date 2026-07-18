---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Independent second-pass review of `H:/prism-hotel-c2/scripts/lib/broker-verify-c"
date: "2026-05-17"
first_ts: "2026-05-17T15:30:11.023Z"
last_ts: "2026-05-17T15:33:45.445Z"
cwd: "h:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-a38fa894ce02af072.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Independent second-pass review of `H:/prism-hotel-c2/scripts/lib/broker-verify-c

> **claude-code-cli** | 2026-05-17 | 15 msgs (6 user / 9 assistant) | cwd: h:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-a38fa894ce02af072.jsonl`

## Transcript

### User | 2026-05-17T15:30:11.023Z

Independent second-pass review of `H:/prism-hotel-c2/scripts/lib/broker-verify-core.mjs` (pure-core library, ~170 LOC, 8 exports) end-to-end. Assume Arm A reviewer caught the obvious correctness/schema/test-quality issues — your job is to find what they MISSED.

Context: OBSIDIAN-INTELLIGENCE-MS3 / A1 close-out verifier. Pure decision module fed by injected readers in the orchestrator (not yet written — coming next). Test file at `H:/prism-hotel-c2/mcp-server/src/__tests__/BrokerVerifyCore.test.ts` (42 cases green).

Co-reading: the existing broker client at `H:/prism-hotel-c2/.claude/helpers/docker-hook-broker.mjs` returns `{ok, viaBroker, status, stdout, stderr}` per call. This verifier's `summarizeBurnIn` MUST tolerate that shape.

WEIGHTED on what arm A is unlikely to catch:
  - **Integration**: does the burn-in shape match what `invokeHook` actually returns? Any silent-skip class hiding (e.g. r.ok===true but r.viaBroker===undefined treated as fallback success)?
  - **Hidden coupling**: any global state? Date.now() drift between calls? Cache invalidation? Frozen-object lying to caller (Object.freeze shallow vs deep)?
  - **Security / supply-chain**: any `eval`/`Function`/`new RegExp` with untrusted input? The xmalloc loose-match regex — could it ReDoS on hostile event.message?
  - **Error budgets**: if events array has 1M entries, does summarizeXmallocLog OOM or DoS? Any unbounded loop / unbounded string concat?
  - **Naming / convention conformance**: matches the pattern set by other MS3 units (E1/E2/E3/E4/C3 — pure-core + DI + R12 fail-loud)?
  - **Inlined constants**: any thresholds hard-coded in decision paths that should be DEFAULTS-driven?
  - **Stub assertions in tests**: any `.toBeDefined()` / `.not.toBeNull()` weak assertions that would let a regression slip?
  - **What if the orchestrator passes the wrong-shaped input?**: defense-in-depth at the pure-core boundary?

Read the WHOLE file end-to-end. Return PASS/FAIL + per-finding P0/P1/P2/P3 with file:li
... [+39 chars truncated]

### Assistant | 2026-05-17T15:30:21.533Z

I'll perform a thorough independent review of the broker-verify-core.mjs library and its tests.

### Assistant | 2026-05-17T15:30:22.098Z

[tool_use: Read]

### User | 2026-05-17T15:31:13.918Z

[tool_result] 1	// NB: no shebang. Library — invoked from scripts/docker/verify-prism-hooks-broker.mjs.
2	/**
3	 * broker-verify-core.mjs — pure verifier core for OBSIDIAN-INTELLIGENCE-MS3 / A1
4	 *
5	 * Mechanically completes the 3 Docker-blocked exit conditions in the A1 envelope
6	 * (U-DOCKER-HOOK-BROKER partial_ship → final close-out) once the operator restores
7	 * Docker engine. Caller injects three read
... [+8393 chars truncated]

### Assistant | 2026-05-17T15:31:17.085Z

[tool_use: Read]

### User | 2026-05-17T15:31:17.806Z

[tool_result] read-once-guard: 'H:\prism-hotel-c2\mcp-server\src\__tests__\BrokerVerifyCore.test.ts' was already read 66s ago in this session and is unchanged (mtime 1779031724767). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### Assistant | 2026-05-17T15:31:20.821Z

[tool_use: Bash]

### User | 2026-05-17T15:31:26.236Z

[tool_result] /**
 * BrokerVerifyCore.test.ts — vitest for scripts/lib/broker-verify-core.mjs
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / A1 close-out verifier.
 *
 * Real-value assertions only — no `.toBeDefined()` stubs. Every test exercises
 * a concrete decision path that would silently break under regression.
 */
import { describe, it, expect } from "vitest";
import {
  BROKER_VERIFY_SCHEMA_VERSION,
  EXIT_CONDITION
... [+13797 chars truncated]

### Assistant | 2026-05-17T15:31:29.628Z

Now let me look at the broker client to verify the integration contract:

### Assistant | 2026-05-17T15:31:31.024Z

[tool_use: Bash]

### User | 2026-05-17T15:31:41.179Z

[tool_result] // PRISM Docker hook-broker client — OBSIDIAN-INTELLIGENCE-MS3 / U-DOCKER-HOOK-BROKER (A1).
//
// Routes a hook event to the running prism-hooks container at 127.0.0.1:9876 (HTTP) and,
// if the broker is unreachable or refuses, falls back to direct subprocess execution
// (the legacy path the harness uses today). The fallback path is the "graceful degrade"
// the envelope's exit-conditions r
... [+7809 chars truncated]

### Assistant | 2026-05-17T15:31:43.810Z

I have enough material to complete the independent second-pass review. Let me verify one more integration detail.

### Assistant | 2026-05-17T15:31:45.733Z

[tool_use: Grep]

### User | 2026-05-17T15:31:47.284Z

[tool_result] 13: *      → burnIn errors === 0 AND total >= EXPECTED_BURN_IN_TOTAL
43:  const { healthy, error } = input;
48:    const errStr = typeof error === "string" && error.length > 0 ? error : "unknown";
60:      total: 0, viaBroker: 0, fallback: 0, errors: 0,
65:  let viaBroker = 0, fallback = 0, errors = 0;
67:    if (!r || typeof r !== "object") { errors++; continue; }
70:    else errors++;
75:  //   
... [+461 chars truncated]

### Assistant | 2026-05-17T15:33:45.445Z

I have everything I need. Below is my independent second-pass review.

---

# Independent Second-Pass Review — `broker-verify-core.mjs`

**File reviewed:** `H:/prism-hotel-c2/scripts/lib/broker-verify-core.mjs` (187 lines, 8 exports)
**Co-read:** `H:/prism-hotel-c2/.claude/helpers/docker-hook-broker.mjs` · `H:/prism-hotel-c2/mcp-server/src/__tests__/BrokerVerifyCore.test.ts`

## VERDICT: **FAIL** — 2 P0, 4 P1, 5 P2, 3 P3

The pure-core is well-shaped (DI-ready, fail-loud, R12-compliant on the happy path), but the **integration contract with the actual `invokeHook` return shape is broken in two ways that will silently miscount production burn-in results**, and the test suite green-lights both because every fixture invents its own shape rather than using a `invokeHook`-shaped fixture. The xmalloc scanner has an O(n)-bounded but unbounded-input DoS surface and a regex hot-spot that doesn't anchor on a token boundary. None of these were caught by Arm A (judging from the test suite's narrow shape coverage).

---

## P0 — must fix before orchestrator wiring

### P0-1 — Real `invokeHook` returns `viaBroker:false` on validation errors AND on `4xx/5xx other than 501` — both get counted as `fallback` (PASS-class) by `summarizeBurnIn`, masking real broker bugs

**File:** `broker-verify-core.mjs:67-70` vs **integration:** `docker-hook-broker.mjs:181-184, 191-195`

The verifier's classification:
```js
if (r.ok === true && r.viaBroker === true) viaBroker++;
else if (r.ok === true && r.viaBroker === false) fallback++;   // ← "graceful degrade"
else errors++;
```

But `docker-hook-broker.mjs` returns these shapes (full enumeration):

| Path | `ok` | `viaBroker` | Verifier classifies as |
|------|------|-------------|-----------------------|
| Validation reject (bad name) | `false` | `false` | error  (correct) |
| Spawn-throw | `false` | `false` | error (correct) |
| Spawn EPIPE / stdin-end fail | `false` | `false` | error (correct) |
| Fallback exits 0 | `true` | `false` | **fallba
... [+15135 chars truncated]
