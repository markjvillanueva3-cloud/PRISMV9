---
type: "chat-session"
source: "claude-code-cli"
session_id: "ab0dca09-bdc3-4069-83d6-963041f28da6"
title: "Review PRISM commit `841d98d0d2` (repo H:/prism). Scrutiny arm C — analyst, weig"
date: "2026-06-22"
first_ts: "2026-06-22T16:17:06.657Z"
last_ts: "2026-06-22T16:19:36.431Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 11
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/ab0dca09-bdc3-4069-83d6-963041f28da6/subagents/agent-ab0813cdf168ec82e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Review PRISM commit `841d98d0d2` (repo H:/prism). Scrutiny arm C — analyst, weig

> **claude-code-cli** | 2026-06-22 | 32 msgs (11 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ab0dca09-bdc3-4069-83d6-963041f28da6/subagents/agent-ab0813cdf168ec82e.jsonl`

## Transcript

### User | 2026-06-22T16:17:06.657Z

Review PRISM commit `841d98d0d2` (repo H:/prism). Scrutiny arm C — analyst, weighted to SILENT BREAKAGE, FALSE CONFIDENCE, and TEST ISOLATION. Do NOT assume arms A/B caught everything. Run `git -C H:/prism show 841d98d0d2`.

Adds `mcp-server/src/__tests__/HermesAutomationBridge.test.ts` (18 tests). No source change. Engine: `mcp-server/src/engines/HermesAutomationBridge.ts`.

Analyze: (1) FALSE CONFIDENCE — the LIVE-spawn tests rely on `process.execPath` existing and the `sandbox` tier granting process-spawn. If on some environment `sandboxAllowed` were false, would the "live" tests silently assert the wrong (denied) path while still passing? Confirm the test pins `sandboxAllowed===true` so this can't go unnoticed. (2) TEST ISOLATION — the dual-key test sets/deletes `process.env.PRISM_HERMES_MOCK`; confirm the finally-restore is correct and no other test in the file depends on that env (order-independence under vitest isolate). (3) Does the test exercise genuinely distinct engine code paths, or do some collapse? (4) Is the timeout/killed fail-close assertion airtight, or could a future refactor that drops the killed-check still pass the test? (5) Any real-CLI-spawn risk leaked anywhere (e.g. a test that constructs the bridge live without injecting spawn)?

Grade PASS or FAIL with P0/P1/P2 + file:line. Be concise.

### Assistant | 2026-06-22T16:17:12.082Z

I'll investigate this commit thoroughly. Let me start by examining the diff and the engine it tests.

### Assistant | 2026-06-22T16:17:12.865Z

[tool_use: Bash]

### User | 2026-06-22T16:17:19.486Z

[tool_result] commit 841d98d0d2a84f94614a8ef1569c289b47bf748e
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 11:04:22 2026 -0500

    [MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [DISPATCHER-INTEGRITY]/U-HERMES-BRIDGE-ENGINE-TEST (slot:bravo): dedicated engine test for safety-critical HermesAutomationBridge (scrutiny arm-C P2 follow-up) -- 18 hermetic tests: dual-key gate both direction
... [+11298 chars truncated]

### Assistant | 2026-06-22T16:17:22.946Z

Now let me read the actual engine to verify the test's claims against the real implementation. The test asserts behavior; I need to confirm the engine actually does what the test pins.

### Assistant | 2026-06-22T16:17:23.155Z

[tool_use: Read]

### User | 2026-06-22T16:17:23.630Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\HermesAutomationBridge.ts' was already read 26s ago in this session and is unchanged (mtime 1781644232651). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-06-22T16:17:26.265Z

The guard says it's already in context, but I don't actually have it. Let me grep the key methods to verify the engine contract.

### Assistant | 2026-06-22T16:17:27.218Z

[tool_use: Bash]

### User | 2026-06-22T16:17:32.570Z

[tool_result]      1	/**
     2	 * HermesAutomationBridge -- PRISM -> Hermes Agent (Nous Research) automation bridge.
     3	 *
     4	 * Bridge A of the bidirectional Claude-Code <-> Hermes integration. Lets PRISM /
     5	 * Claude Code drive the locally-installed Hermes CLI in a SANDBOXED, mock-by-default
     6	 * way, mirroring the existing Fusion360AutomationBridge / cimco-sim-driver pattern.
     7	 *
  
... [+27187 chars truncated]

### Assistant | 2026-06-22T16:17:36.072Z

Now I have the full engine. Let me verify the critical claim in question 1: whether the `sandbox` tier actually grants process-spawn (so `sandboxAllowed === true`), and whether any "live" test could silently pass on the denied path. Let me check the PluginSandboxPolicyEngine.

### Assistant | 2026-06-22T16:17:37.282Z

[tool_use: Bash]

### User | 2026-06-22T16:17:46.553Z

[tool_result]      1	/**
     2	 * PluginSandboxPolicyEngine — HMPI14 plugin sandbox policy evaluator.
     3	 *
     4	 * Pure-core: evaluates a plugin's requested capability set against a
     5	 * safety-tier policy (shop_floor / dev / sandbox). Returns the granted
     6	 * subset + denials + a verdict (allowed / partial / blocked).
     7	 *
     8	 * @module engines/PluginSandboxPolicyEngine
     9	 */
  
... [+3244 chars truncated]

### Assistant | 2026-06-22T16:17:54.030Z

Now I have the complete picture. Let me address each question against the verified source.

**Q1 (FALSE CONFIDENCE — sandbox grant):** The engine requests `HERMES_REQUESTED_CAPS = ["process-spawn", "filesystem-read", "env-read", "tool-call"]` (line 158). At `sandbox` tier, `TIER_ALLOW.sandbox` (lines 60-70) contains ALL of these. So `denied.length === 0` → verdict `"allowed"` → `sandboxAllowed === true` (line 224). This is deterministic — pure-core evaluation, no environment dependency. The test at the diff "the sandbox tier grants process-spawn (sandboxAllowed === true)" explicitly pins this. Let me verify the live tests reach the spawn (i.e., the gate is real, not bypassed).

Let me confirm the order-of-operations in `run()` for the live path and verify the test isolation question by checking whether other tests in the file touch `PRISM_HERMES_MOCK`.

### Assistant | 2026-06-22T16:17:55.503Z

[tool_use: Grep]

### User | 2026-06-22T16:17:57.865Z

[tool_result] 42:    const prev = process.env["PRISM_HERMES_MOCK"];
44:      delete process.env["PRISM_HERMES_MOCK"];
46:      process.env["PRISM_HERMES_MOCK"] = "0";
50:      if (prev === undefined) delete process.env["PRISM_HERMES_MOCK"];
51:      else process.env["PRISM_HERMES_MOCK"] = prev;

### Assistant | 2026-06-22T16:18:04.816Z

`PRISM_HERMES_MOCK` is only touched inside the single dual-key test (lines 42-51), within a `try/finally` that restores the prior value (or deletes if it was undefined). No other test reads or writes it. 

Now a subtle isolation point: the other "live" tests (lines using `{ mock: false, tier: "sandbox", ... }`) pass `opts.mock === false` **explicitly**, so per line 210-212 (`opts.mock !== undefined ? opts.mock : ...`) they bypass the env entirely. This means even if a peer test or external runner left `PRISM_HERMES_MOCK` set, the live tests are NOT affected — `mock` is forced to `false` by the explicit option. Good — the live tests don't depend on env state at all. Let me verify the timeout/killed assertion is airtight and run the tests to confirm 18/18.

### Assistant | 2026-06-22T16:18:05.757Z

[tool_use: Bash]

### User | 2026-06-22T16:18:13.487Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/HermesAutomationBridge.test.ts (18 tests) 9ms

 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  11:18:12
   Duration  244ms (transform 52ms, setup 0ms, import 112ms, tests 9ms, environment 0ms)

### Assistant | 2026-06-22T16:18:23.917Z

18/18 pass. Now let me scrutinize the killed/timeout fail-close assertion airtightness (Q4) and verify the distinct-code-path question (Q3) more rigorously.

**Q4 (timeout fail-close airtightness):** The test "SAFETY: a killed/timed-out child is NEVER a success" throws `{ killed: true, signal: "SIGTERM" }`. In `run()`, the catch block checks `if (err.killed || err.signal)` (line 483). The thrown object has BOTH `killed:true` AND `signal:"SIGTERM"`. This is a concern: if a future refactor drops the `killed` check but keeps `err.signal`, OR drops `signal` but keeps `killed`, the test would STILL pass because both are set. The test does NOT isolate the two conditions. Let me verify this is a real gap by examining the assertion regex and the non-zero-exit test interaction.

The killed-test asserts `r.value === null`, `confidence === 0`, and warning matches `/timed out|never a success/`. The non-zero-exit branch (line 487-492) returns `value` as an **object** `{stdout, stderr, code}` (NOT null) with warning `hermes exited non-zero:`. So if a refactor dropped BOTH `killed` and `signal` checks, a killed child throw `{killed:true, signal:"SIGTERM"}` (no `status`) would fall through to the non-zero branch → `value = {stdout:"", stderr:"", code: null}` → `value !== null` → the killed-test's `expect(r.value).toBe(null)` FAILS. So dropping the entire guard IS caught.

But dropping just ONE of the two sub-conditions is NOT caught — the test sets both. Let me confirm there's no separate test isolating each. Let me also check Q5 (real-CLI-spawn leak) by checking every `new HermesAutomationBridge` with `mock:false` for an injected spawn.

### Assistant | 2026-06-22T16:18:24.710Z

[tool_use: Bash]

### User | 2026-06-22T16:18:30.606Z

[tool_result] 33:    expect(new HermesAutomationBridge().mock).toBe(true);
37:    expect(new HermesAutomationBridge({ mock: false }).mock).toBe(false);
38:    expect(new HermesAutomationBridge({ mock: true }).mock).toBe(true);
45:      expect(new HermesAutomationBridge({ noMock: true }).mock).toBe(true); // one key -> still mock
47:      expect(new HermesAutomationBridge({ noMock: true }).mock).toBe(false); // 
... [+1383 chars truncated]

### Assistant | 2026-06-22T16:18:39.857Z

Let me audit each construction for real-CLI-spawn risk (Q5). Every construction that could reach a live spawn must inject a fake `spawn`. The constructions that call `.run()`/`.modelList()` live (mock:false) are lines 62, 71, 92, 104, 116, 131, 149 — all inject `spawn`. The mock-mode and read-only constructions (33, 37-48, 56, 81, 141, 161, 172, 180, 186, 192) never reach the real spawn because `this.mock` is true OR the method is read-only (probe/authStatus/status/routinePlan never spawn).

One construction to double-check: line 71 (`oversize args`) injects `spawn: () => ""` but the run rejects args before spawn anyway. Line 62 (empty args) — same. All covered. No leak.

Now a critical check on Q5: the `status()` test at line 192 calls `existsSync(this.exe)` and `existsSync(this.home)` — `home: NOPE_HOME` so home doesn't exist, but `exe` defaults to `defaultExe(NOPE_HOME)` which is under the nonexistent home — fine, just an `existsSync` false, no spawn. Confirmed read-only.

Let me verify whether the `defaultExe` for the read-only `status()` test could accidentally hit a real installed Hermes on this machine — and whether the default-instance export at engine line 535 runs at import (it does, but mock-by-default). Let me check the default home resolution isn't a concern, and confirm the module-load side effect.

### Assistant | 2026-06-22T16:18:41.775Z

[tool_use: Bash]

### User | 2026-06-22T16:18:46.237Z

[tool_result] LOCALAPPDATA hermes check:
C:\Users\wompu\AppData\Local/hermes/
---
PRISM_HERMES_MOCK env at shell:
(unset)

### Assistant | 2026-06-22T16:18:52.294Z

Important: a real Hermes home **does exist** on this machine at `C:\Users\wompu\AppData\Local\hermes`. This matters for the module-load default instance (engine line 535: `export const hermesAutomationBridge = new HermesAutomationBridge();`). That instance is mock-by-default (`PRISM_HERMES_MOCK` is unset, no `noMock`), so even though it resolves a real home, it never spawns. The test file does NOT use that default instance — all its read-only tests pin `home: NOPE_HOME`. So the read-only tests are deterministic regardless of the real install. Good — no fixture dependency, no flakiness from the real install. Confirmed Q3/Q5 safe.

Now let me nail down Q3 (distinct code paths / collapse). Let me verify the non-zero-exit test's `value !== null` distinction is what separates it from the killed path, confirming they exercise genuinely different branches.

### Assistant | 2026-06-22T16:18:53.239Z

[tool_use: Read]

### User | 2026-06-22T16:18:54.125Z

[tool_result] 99	    expect((r.value as { stdout: string }).stdout).toBe("LIVE-STDOUT");
100	    expect(calls).toEqual([{ file: REAL_EXE, args: ["model", "list"] }]); // exact exe + array args, no shell
101	  });
102	
103	  it("SAFETY: a killed/timed-out child is NEVER a success (R12 fail-close)", () => {
104	    const b = new HermesAutomationBridge({
105	      mock: false, tier: "sandbox", exe: REAL_EXE,
106	 
... [+1448 chars truncated]

### Assistant | 2026-06-22T16:19:03.408Z

I now have everything verified. Let me consolidate the analysis on each question.

**Q3 (distinct code paths):** The killed path (line 483-485) returns `value: null`; the non-zero-exit path (line 487-492) returns a `value` object with `code:2`. The two tests assert disjoint shapes (`value === null` vs `value.code === 2`), so they genuinely exercise the two distinct catch branches — no collapse. The success path (line 480) is separately pinned by the LIVE-STDOUT test (`confidence 0.95`, source `hermes-cli`). The mock-envelope, sandbox-denied, exe-not-found, and arg-guard branches are each separately covered — EXCEPT one. Let me confirm the one gap I see: the `sandboxAllowed === false` branch in `run()` (line 472-473).

Looking at `run()` order: arg-guards → mock-check → **sandbox-denied check (472)** → exe-not-found (475) → spawn. Every live test passes `tier: "sandbox"` so `sandboxAllowed` is always `true` — meaning **line 472-473 (the sandbox-denied refusal) is never exercised by any test**. This is the most important silent-confidence gap relative to Q1's framing. Let me verify there is no test that constructs a non-sandbox tier and calls `run()` live.

### Assistant | 2026-06-22T16:19:05.139Z

[tool_use: Bash]

### User | 2026-06-22T16:19:10.437Z

[tool_result] 56:    expect(new HermesAutomationBridge({ tier: "sandbox" }).sandboxAllowed).toBe(true);
62:    const b = new HermesAutomationBridge({ mock: false, tier: "sandbox", exe: REAL_EXE, spawn: () => { spawned = true; return ""; } });
71:    const b = new HermesAutomationBridge({ mock: false, tier: "sandbox", exe: REAL_EXE, spawn: () => "" });
93:      mock: false, tier: "sandbox", exe: REAL_EXE,
105:  
... [+667 chars truncated]

### Assistant | 2026-06-22T16:19:36.431Z

Confirmed. The analysis is complete. Let me record the verdict.

Findings summary against each question:

- **Q1 (false confidence):** SAFE. The test at line 56 explicitly pins `new HermesAutomationBridge({ tier: "sandbox" }).sandboxAllowed === true`. Verified deterministic against `PluginSandboxPolicyEngine`: `HERMES_REQUESTED_CAPS` ⊆ `TIER_ALLOW.sandbox` → verdict `"allowed"` → `sandboxAllowed === true` with zero environment dependency. The live tests cannot silently assert the denied path while passing, because (a) the spawn-assert tests check `confidence === 0.95` + injected-spawn `calls` were made (line 96-100) — a denied run returns `value: null, confidence: 0` and never calls spawn, which would fail those asserts. So Q1's worry is foreclosed.
- **Q2 (test isolation):** SAFE. `PRISM_HERMES_MOCK` is touched only inside the single dual-key test (lines 42-51), inside a correct `try/finally` that restores prior value or deletes if originally undefined. No other test reads it; all live tests force `mock:false` explicitly (bypassing env per engine line 210). Order-independent.
- **Q3 (distinct paths / collapse):** Mostly distinct. Success / killed / non-zero-exit / exe-not-found / arg-guard / mock-envelope branches are each genuinely separated by disjoint assertions. ONE branch is never exercised: the `sandboxAllowed===false` refusal (engine `run()` lines 472-473).
- **Q4 (timeout fail-close airtightness):** Partial gap. Dropping the *entire* killed/signal guard IS caught (the thrown `{killed,signal}` with no `status` would fall to the non-zero branch → `value` becomes a non-null object → `expect(r.value).toBe(null)` fails). BUT the test sets BOTH `killed:true` AND `signal:"SIGTERM"`, so a refactor that drops only one sub-condition (`err.killed ||` or `|| err.signal`) goes undetected — the surviving condition still matches.
- **Q5 (real-CLI-spawn leak):** SAFE. Every construction that can reach a live spawn injects a fake `spawn`. Read-only/mock constructions never 
... [+2903 chars truncated]
