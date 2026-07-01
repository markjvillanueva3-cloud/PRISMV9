---
type: "chat-session"
source: "claude-code-cli"
session_id: "ab0dca09-bdc3-4069-83d6-963041f28da6"
title: "Review PRISM commit `2ff5e227cb` (repo H:/prism). Scrutiny arm B — independent, "
date: "2026-06-22"
first_ts: "2026-06-22T15:38:09.820Z"
last_ts: "2026-06-22T15:43:31.536Z"
cwd: "H:\\prism"
messages: 60
user_msgs: 21
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/ab0dca09-bdc3-4069-83d6-963041f28da6/subagents/agent-ad6ce99ac6de51fa3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Review PRISM commit `2ff5e227cb` (repo H:/prism). Scrutiny arm B — independent, 

> **claude-code-cli** | 2026-06-22 | 60 msgs (21 user / 39 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ab0dca09-bdc3-4069-83d6-963041f28da6/subagents/agent-ad6ce99ac6de51fa3.jsonl`

## Transcript

### User | 2026-06-22T15:38:09.820Z

Review PRISM commit `2ff5e227cb` (repo H:/prism). Scrutiny arm B — independent, weighted to TEST INTEGRITY + the SAFETY contract. Do NOT assume arm A caught everything. Run `git -C H:/prism show 2ff5e227cb`.

The commit adds `mcp-server/src/__tests__/hermesDispatcher.wire.test.ts` — 17 wire-tests for `prism_hermes` (hermesDispatcher.ts → HermesAutomationBridge.ts). No source change.

Scrutinize hard: (1) Could any assertion pass against a BROKEN handler? Are they real intent checks (R9) or weak presence stubs (toBeDefined/typeof-only)? (2) THE SAFETY ASSERTION: the test claims live actions (hermes_model_list, hermes_run) never spawn the real Hermes CLI without the dual-key. Verify the test's env pin (`PRISM_HERMES_MOCK="1"` in beforeAll) actually guarantees this — trace the dual-key logic in HermesAutomationBridge constructor (`this.mock = opts.mock!==undefined ? opts.mock : !(env PRISM_HERMES_MOCK==="0" && opts.noMock===true)`). Is there ANY path where a test could spawn the real CLI (e.g. if PRISM_HERMES_MOCK was already "0" before beforeAll runs, or afterAll restore leaks)? (3) Is the `call()` helper correctly distinguishing success (AtomicValue with .value) from dispatcherError (success:false / re-wrapped error) — could a failure-mode test FALSE-PASS as ok:false when it actually errored for the wrong reason? (4) any `.skip`/`.only`, weakened assertions, or env mutation that leaks into sibling test files.

Grade PASS or FAIL with P0/P1/P2 + file:line. Be concise.

### Assistant | 2026-06-22T15:38:16.899Z

I'll review commit `2ff5e227cb` thoroughly, focusing on test integrity and the safety contract.

### Assistant | 2026-06-22T15:38:17.913Z

[tool_use: Bash]

### User | 2026-06-22T15:38:26.570Z

[tool_result] commit 2ff5e227cb2f5860433570dfc22e7271ba2427b9
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 10:37:19 2026 -0500

    [MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [DISPATCHER-INTEGRITY]/U-HERMES-DISPATCHER-WIRE-TEST (slot:bravo): close the zero-test gap on prism_hermes (only zero-test dispatcher in bravo hermes-zulu domain) -- 17 round-trip wire-tests through the registe
... [+280 chars truncated]

### Assistant | 2026-06-22T15:38:28.920Z

Let me read the full test file and the source files it tests.

### Assistant | 2026-06-22T15:38:29.363Z

[tool_use: Read]

### User | 2026-06-22T15:38:30.379Z

[tool_result] 1	/**
2	 * hermesDispatcher (prism_hermes) round-trip wire test
3	 * (U-HERMES-DISPATCHER-WIRE-TEST, slot:bravo 2026-06-22).
4	 *
5	 * Closes the zero-test gap on the ONE dispatcher in bravo's hermes-zulu domain
6	 * (verified by enumeration: 22/107 dispatchers are zero-test; hermesDispatcher was
7	 * the only bravo-domain one). hermesDispatcher is ALREADY registered (index.ts:629)
8	 * as `prism_
... [+11102 chars truncated]

### Assistant | 2026-06-22T15:38:33.583Z

Now let me read the dispatcher and bridge source files to verify the test asserts against the real contract.

### Assistant | 2026-06-22T15:38:33.806Z

[tool_use: Read]

### User | 2026-06-22T15:38:34.346Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\hermesDispatcher.ts' was already read 8m ago in this session and is unchanged (mtime 1781642305108). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### Assistant | 2026-06-22T15:38:37.426Z

The guard says it's already in context, but I don't actually have it. Let me locate and read both source files.

### Assistant | 2026-06-22T15:38:38.208Z

[tool_use: Bash]

### User | 2026-06-22T15:38:45.517Z

[tool_result] /**
 * hermesDispatcher -- prism_hermes MCP tool. Bridge A of the bidirectional
 * Claude Code <-> Hermes integration: lets Claude Code drive the locally
 * installed Hermes Agent CLI (Nous Research) in a sandboxed, mock-by-default
 * way via HermesAutomationBridge.
 *
 * Carved out as its own dispatcher (prism_hermes) following the cimcoDispatcher
 * precedent. Actions are `hermes_*` prefixed for
... [+4074 chars truncated]

### Assistant | 2026-06-22T15:38:48.386Z

Now let me read the critical part — the `HermesAutomationBridge` constructor and the dual-key logic, plus the mock paths for `modelList`/`run`.

### Assistant | 2026-06-22T15:38:48.682Z

[tool_use: Read]

### User | 2026-06-22T15:38:49.175Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\HermesAutomationBridge.ts' was already read 20s ago in this session and is unchanged (mtime 1781644232651). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-06-22T15:38:51.894Z

The read-once guard is blocking but the content is not actually in my context. Let me disable the cache.

### Assistant | 2026-06-22T15:38:52.516Z

[tool_use: Bash]

### User | 2026-06-22T15:39:05.190Z

[tool_result] 535 mcp-server/src/engines/HermesAutomationBridge.ts

### Assistant | 2026-06-22T15:39:08.885Z

[tool_use: Bash]

### User | 2026-06-22T15:39:15.708Z

[tool_result] /**
 * HermesAutomationBridge -- PRISM -> Hermes Agent (Nous Research) automation bridge.
 *
 * Bridge A of the bidirectional Claude-Code <-> Hermes integration. Lets PRISM /
 * Claude Code drive the locally-installed Hermes CLI in a SANDBOXED, mock-by-default
 * way, mirroring the existing Fusion360AutomationBridge / cimco-sim-driver pattern.
 *
 * Why a bridge: the operator runs on a Claude subs
... [+7330 chars truncated]

### Assistant | 2026-06-22T15:39:20.806Z

I'm reviewing as an independent scrutiny agent — that mid-turn handoff context is from the building chat, not my task. My task is to review the committed test. Let me continue reading the constructor and the live/mock paths.

### Assistant | 2026-06-22T15:39:21.711Z

[tool_use: Bash]

### User | 2026-06-22T15:39:30.293Z

[tool_result] /** Cap on how many CLI args a live run accepts (adversarial-input guard). */
const MAX_ARGS = 64;
const MAX_ARG_LEN = 4_096;

/** Injectable spawn signature (execFileSync-compatible) so tests stay hermetic. */
export type SpawnFn = (file: string, args: string[], opts: Record<string, unknown>) => string | Buffer;

export interface HermesBridgeOptions {
  /** Force mock on/off explicitly (tests). W
... [+5646 chars truncated]

### Assistant | 2026-06-22T15:39:35.663Z

The dual-key logic is confirmed. The critical line:

```ts
this.mock = opts.mock !== undefined
  ? opts.mock
  : !(process.env["PRISM_HERMES_MOCK"] === "0" && opts.noMock === true);
```

The dispatcher (`hermes_model_list`/`hermes_run`) constructs `new HermesAutomationBridge({ noMock })` — never passes `opts.mock`. So `this.mock` falls to the env-half. With `PRISM_HERMES_MOCK="1"`, `=== "0"` is false → `this.mock = !(false && ...) = !false = true` → always mock regardless of `noMock`. The test's env pin is sound. Let me now read the `modelList` and `run` mock/live paths to verify the spawn gate and the `source: "mock"` assertions.

### Assistant | 2026-06-22T15:39:36.943Z

[tool_use: Bash]

### User | 2026-06-22T15:39:45.564Z

[tool_result]     } else {
      out["legacyTokenPresent"] = false;
    }

    return atomic(out, "hermes-bridge:auth_status", 1, warning);
  }

  /** Cron jobs (reads cron/jobs.json directly; no spawn). */
  cronList(): AtomicValue<Record<string, unknown>> {
    const path = join(this.home, "cron", "jobs.json");
    const raw = this.readJson(path);
    if (raw === null) {
      return atomic({ found: false, pa
... [+7037 chars truncated]

### Assistant | 2026-06-22T15:39:48.210Z

Now the `run()` method and the live spawn gate to confirm there's no path to a real spawn under the test's conditions.

### Assistant | 2026-06-22T15:39:49.438Z

[tool_use: Bash]

### User | 2026-06-22T15:39:59.951Z

[tool_result]    * fail-closes (a killed/timed-out child is NEVER a success).
   */
  run(args: string[]): AtomicValue<unknown> {
    if (!Array.isArray(args) || args.length === 0) {
      return atomic(null, "hermes-bridge", 0, "run() requires a non-empty args array");
    }
    if (args.length > MAX_ARGS || args.some((a) => typeof a !== "string" || a.length > MAX_ARG_LEN)) {
      return atomic(null, "hermes-
... [+2381 chars truncated]

### Assistant | 2026-06-22T15:40:03.795Z

Now I have the full safety contract. Let me verify the `validateActionParams`/`dispatcherError` shapes that the `call()` helper distinguishes, and confirm the schema (args.min(1).max(64), profile string, noMock boolean) matches the failure-mode tests.

### Assistant | 2026-06-22T15:40:04.397Z

[tool_use: Bash]

### User | 2026-06-22T15:40:17.009Z

[tool_result] /**
 * hermesActionSchemas -- Zod per-action param schemas for the prism_hermes
 * dispatcher (HermesAutomationBridge, Bridge A of the CC <-> Hermes integration).
 * Mirrors cimcoActionSchemas: one schema per action, validated by
 * validateActionParams(action, params, HERMES_ACTION_SCHEMAS).
 *
 * @module schemas/hermesActionSchemas
 */
import { z } from "zod";

// Read-only inspection actions ta
... [+1697 chars truncated]

### Assistant | 2026-06-22T15:40:20.265Z

Schemas confirm the failure-mode tests: `hermes_run` requires `args` `.min(1).max(64)`, `profile` is `.string()`, `noMock` is `.boolean()`. Now let me verify the `validateActionParams`/`dispatcherError` shapes to confirm the `call()` helper's success/error discrimination is correct.

### Assistant | 2026-06-22T15:40:21.701Z

[tool_use: Bash]

### User | 2026-06-22T15:40:37.265Z

[tool_result] 32:export function dispatcherError(
33-  error: unknown,
34-  action: string,
35-  dispatcher: string,
36-): DispatcherErrorResult {
37-  const message = error instanceof Error ? error.message : String(error);
38-  const body = {
39-    success: false as const,
40-    error: message,
41-    action,
42-    dispatcher,
43-    details: error instanceof Error ? { stack: error.stack } : undefined,
44- 
... [+1078 chars truncated]

### Assistant | 2026-06-22T15:40:47.073Z

This is the key for the `call()` helper's discrimination. `dispatcherError` returns an object that has BOTH a top-level `success:false` AND a `content[].text` field whose JSON also contains `success:false`. Let me trace exactly how the dispatcher returns errors.

Critically: in `dispatchHermes`, when validation fails, it returns `dispatcherError(...)` **directly** (not wrapped). That object has top-level `success:false` AND `content`. But the `registerHermesDispatcher` handler wraps the *successful* result in `{ content: [...] }`. Let me re-trace the validation-failure path carefully.

In `dispatchHermes`:
```ts
const validation = validateActionParams(...);
if (!validation.valid) {
  return dispatcherError(...);  // returns {success:false, error, action, dispatcher, content:[...]}
}
```
This is the **return value of `dispatchHermes`**, assigned to `result` inside the handler's `try`. Then the handler does:
```ts
return { content: [{ type:"text", text: JSON.stringify(slimResponse(result)) }] };
```
So the validation error gets re-wrapped: the outer envelope's `content[0].text` is `JSON.stringify(slimResponse(dispatcherErrorObject))`. Let me verify `validateActionParams` return shape and confirm the `call()` helper path. The `call()` helper checks top-level `raw.success === false` first — but for a validation failure, the top-level object is the handler's `{content:[...]}` envelope with NO top-level `success`. So it falls to parsing `content[0].text`, which is the stringified dispatcherError with `success:false`. The helper's inner check `parsed.success === false` catches it. Let me confirm `validateActionParams` shape and whether `slimResponse` preserves `success`/`error`.

### Assistant | 2026-06-22T15:40:47.845Z

[tool_use: Bash]

### User | 2026-06-22T15:41:03.182Z

[tool_result] export function validateActionParams(
  action: string,
  params: Record<string, unknown>,
  schemas: Record<string, z.ZodTypeAny>,
): ValidationResult {
  const schema = schemas[action];
  if (!schema) {
    // No schema registered -> pass through, but FLAG it (fail-loud observability,
    // NON-blocking). We do NOT throw: ~40% of actions have no schema yet and
    // throwing would mass-break t
... [+1781 chars truncated]

### Assistant | 2026-06-22T15:41:07.746Z

Confirmed. The validation-failure message is `Invalid params for '${action}': ${validation.errorMessage}` — so the parsed `error` text contains `"Invalid params"`, matching the test at line 198. Now let me verify `slimResponse` doesn't strip `success`/`error` (which would break the `call()` discrimination), and confirm the AtomicValue success bodies have `.value` but NO top-level `.success`/`.error`.

### Assistant | 2026-06-22T15:41:08.440Z

[tool_use: Bash]

### User | 2026-06-22T15:41:19.601Z

[tool_result] 18:export function slimResponse<T>(response: T, maxDepth: number | SlimLevel = 32, depth = 0): T {
19-  if (response === null || response === undefined) {
20-    return response;
21-  }
22-  if (typeof response !== "object") {
23-    return response;
24-  }
25-  // Legacy callers (calcDispatcher) pass a SlimLevel string in this slot -- the
26-  // old getSlimLevel(...) arg that slimResponse ignore
... [+1595 chars truncated]

### Assistant | 2026-06-22T15:41:28.382Z

Important: `slimResponse` at line 42-43 **drops null/undefined values and empty arrays**. This matters for one test. Let me check: `hermes_run` with empty args (line 195-199) — the schema rejects `args:[]` via `.min(1)`, so that's a validation error (parsed `success:false`, error contains "Invalid params"). Good.

But consider `hermes_run rejects missing args entirely` (line 201-204): `{ }` → schema requires `args` → validation fails → dispatcherError. The error body has `success:false`. But `dispatcherError`'s body includes `details: undefined` (since it's a string error, not Error). `slimResponse` drops the undefined `details`. The `success:false` and `error` strings survive. Good — the helper catches `parsed.success === false`.

Now a subtle concern: the `routine_plan` warning test (line 155-161). The `warning` is on the AtomicValue. `slimResponse` keeps it (it's a non-empty string). The success body is an AtomicValue `{value, confidence, source, warning}` — has `.value`, no `.success`, no top-level `.error`. So `call()` returns `ok:true`, and `r.data.warning` is accessible. Confirmed correct.

Let me run the test to confirm it actually passes and check for `.skip`/`.only` and any env-leak. Let me also verify the file has no `.only`/`.skip`.

### Assistant | 2026-06-22T15:41:29.796Z

[tool_use: Bash]

### User | 2026-06-22T15:41:35.032Z

[tool_result] NO skip/only/todo found

### Assistant | 2026-06-22T15:41:38.058Z

[tool_use: Bash]

### User | 2026-06-22T15:41:45.806Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/hermesDispatcher.wire.test.ts (17 tests) 81ms

 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  10:41:44
   Duration  391ms (transform 102ms, setup 0ms, import 149ms, tests 81ms, environment 0ms)

### Assistant | 2026-06-22T15:41:54.193Z

All 17 pass. Now the critical safety scrutiny on the env-pin question (2): **Is there ANY path where a test could spawn the real CLI?**

The `beforeAll` saves `prevMock` and sets `PRISM_HERMES_MOCK="1"`. The scrutiny prompt asks specifically: *what if `PRISM_HERMES_MOCK` was already "0" before beforeAll runs?*

Trace: `beforeAll` unconditionally **overwrites** to `"1"` regardless of the prior value. So even if the ambient env was `"0"`, during the suite it's `"1"`. The dual-key needs `=== "0"` — false → mock forced. So no test can spawn. The `afterAll` restores the prior value (including restoring `"0"` if that was ambient — correct, no leak). Let me verify there's no window between `registerHermesDispatcher` and the env set — the env is set on line 80, registration on line 82, and the env is read lazily *per construction inside each handler call* (not at registration). So timing is safe.

Let me double check one adversarial path: vitest runs files in **separate workers/modules by default**, but `process.env` mutation can leak within the same worker if tests interleave. Let me verify the vitest isolation config and whether sibling test files read `PRISM_HERMES_MOCK`.

### Assistant | 2026-06-22T15:41:55.389Z

[tool_use: Bash]

### User | 2026-06-22T15:42:02.963Z

[tool_result] src/engines/HermesAutomationBridge.ts:15: *     BOTH the `noMock` flag AND env PRISM_HERMES_MOCK=0. Neither alone is enough,
src/engines/HermesAutomationBridge.ts:170:  /** Half of the live dual-key (the other half is env PRISM_HERMES_MOCK=0). */
src/engines/HermesAutomationBridge.ts:207:    // Dual-key: mock unless BOTH env PRISM_HERMES_MOCK=0 AND opts.noMock===true.
src/engines/HermesAutomationB
... [+1277 chars truncated]

### Assistant | 2026-06-22T15:42:06.766Z

No other test file reads `PRISM_HERMES_MOCK` — so even if vitest shares a worker (no isolation), the env mutation has no sibling-test consumer, and `afterAll` restores it. No leak risk. Let me check whether there is any *separate* HermesAutomationBridge test that could collide (and confirm vitest isolation default).

### Assistant | 2026-06-22T15:42:08.579Z

[tool_use: Bash]

### User | 2026-06-22T15:42:13.587Z

[tool_result] HermesAutonomousDriverEngine.test.ts
HermesFileScopePartitionerEngine.test.ts
HermesGoalDecomposerEngine.test.ts
HermesParallelBudgetEnvelopeEngine.test.ts
HermesParallelFanoutPlannerEngine.test.ts
HermesParallelVerdictAggregatorEngine.test.ts
HermesSelfCorrectionEngine.test.ts
hermesDispatcher.wire.test.ts
sessionDispatcher.hermesDecompose.e2e.test.ts
---vitest config isolate---
8: * vitest.confi
... [+455 chars truncated]

### Assistant | 2026-06-22T15:42:26.050Z

`isolate: true` (line 47) — each test file gets its own module/env context, so even theoretical env-leak to sibling files is precluded. The env-pin is airtight on all fronts.

Now let me verify the `routine_plan` test assertions match the actual emitted values (R9 — exact values, not stubs). Test line 141 asserts `v.deliver === "telegram"`, line 142-144 count matches list length and `>= 1`, line 145 `deployHint` contains "Operator-gated". From source: default deliver `"telegram"` (line 384), `count: routines.length`, `ROUTINE_TEMPLATES` has 4 entries (so count is 4, `>=1` holds), deployHint starts with "Operator-gated". All confirmed against source. The discord test (149) and bogustarget warning test (160, "not a known Hermes target") match the source warning string at line 412.

Let me verify the `model_list` mock values (test line 170-172): source line 466 returns models including `"qwen2.5-coder:32b"` and `"ollama"`, note contains "mock list". Confirmed. And `hermes_run` mock (test 180-181): source line 470 returns `wouldRun:true, args`. Confirmed.

Now the one nuance worth checking for R9 rigor — the read-only file actions. Tests use value-domain checks (`[true,false].toContain(...)`) because the result depends on whether Hermes is installed. This is appropriate (env-independent), but let me confirm these would still **fail if the handler broke** — e.g., they assert the exact `source` tag, which a broken/swapped handler would not emit. The `source` assertions (`"hermes-bridge:status"`, `:probe`, `:auth_status`, `:cron_list`, `:skill_list`) are real intent checks routing to the correct method. A handler returning the wrong action's result would fail the source assertion. Good — not a pure presence stub.

Let me do a final check: confirm the dispatcher is actually registered as `prism_hermes` in index.ts (the test's premise that this is wiring-complete, no orphan).

### Assistant | 2026-06-22T15:42:26.834Z

[tool_use: Bash]

### User | 2026-06-22T15:42:32.788Z

[tool_result] 74:import { registerHermesDispatcher } from "./tools/dispatchers/hermesDispatcher.js"; // prism_hermes -- Hermes Agent CLI bridge (CC <-> Hermes, sandboxed)
629:  registerHermesDispatcher(server);

### Assistant | 2026-06-22T15:42:41.555Z

Registration confirmed (`index.ts:74` import, `index.ts:629` call) — matches the test's docstring claim (line 7). No orphan; this is a test-only addition to already-wired code.

Let me do one last adversarial check on the `call()` helper's false-pass risk (scrutiny point 3): could a failure-mode test FALSE-PASS as `ok:false` for the *wrong* reason? The failure tests at lines 197-219 assert `ok:false`. The concern: if the handler threw for an unrelated reason (e.g., import error), the catch-branch returns a `dispatcherError` with top-level `success:false` → `call()` returns `ok:false` but with a *different* error message. Two of the five failure tests assert only `ok:false` (lines 204, 210, 215, 220 — i.e. `missing args`, `oversize`, `non-string profile`, `non-boolean noMock`). Those four do NOT pin the error message, so they *could* false-pass if the handler errored for the wrong reason.

However: the test suite passing (17/17) with no thrown import errors, plus the two message-pinned tests (line 198 "Invalid params", line 226 "Unknown action") proving the error path actually reaches validation/dispatch, gives strong evidence the bare-`ok:false` tests fail for the right reason. This is a minor robustness gap, not a correctness defect — I'll note it as P2.

Let me confirm tsc is clean as the commit claims.

### Assistant | 2026-06-22T15:42:42.750Z

[tool_use: Bash]

### User | 2026-06-22T15:43:12.559Z

[tool_result] NO tsc errors in hermesDispatcher.wire.test.ts

### Assistant | 2026-06-22T15:43:31.536Z

Verification complete. Here is my independent arm-B verdict.

---

VERDICT: PASS

summary: The 17 wire-tests are real R9 intent checks routed through the registered `prism_hermes` handler, not presence stubs — every test pins a concrete `source` tag plus exact values (mock model list, `wouldRun` envelope, routine count/deliver/deployHint) or an env-independent value-domain for install-dependent reads. The dual-key SAFETY contract is airtight: the `beforeAll` env-pin to `PRISM_HERMES_MOCK="1"` unconditionally overwrites any prior ambient value (including a hostile `"0"`), and traced through `HermesAutomationBridge` constructor line 212 (`!(env==="0" && noMock===true)`) it forces `this.mock=true` regardless of `noMock`, so no test path reaches `execFileSync` — confirmed by the live `run()` mock short-circuit (bridge:469-471) preceding the spawn. No `.skip`/`.only`, no weakened assertions, `afterAll` restores cleanly, and the env mutation cannot leak (no sibling test reads the var; `vitest.config` `isolate:true`). All 17 pass; tsc clean.

findings:
- [P2] `H:/prism/mcp-server/src/__tests__/hermesDispatcher.wire.test.ts:204,210,215,220` -- four failure-mode tests (`missing args`, oversize >64 args, non-string profile, non-boolean noMock) assert only `expect(r.ok).toBe(false)` without pinning the error message, so they would false-pass if the handler errored for an unrelated reason (e.g. an import/throw landing in the catch-branch `dispatcherError`). Risk is low — the two message-pinned siblings (`:198` "Invalid params", `:226` "Unknown action") and the all-green run prove the validation path is actually reached -- but the assert does not lock the *reason*. Fix: add `expect(String(r.data.error)).toContain("Invalid params")` to each of these four to bind the rejection to schema validation, matching the rigor of line 198.

Auditable PASS evidence I verified end-to-end:
- Dual-key safety: `H:/prism/mcp-server/src/engines/HermesAutomationBridge.ts:207-213` (constructor), `:4
... [+1132 chars truncated]
