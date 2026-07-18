---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Independent analyst review (weighted on silent breakage, regression, test integr"
date: "2026-06-17"
first_ts: "2026-06-17T19:56:46.689Z"
last_ts: "2026-06-17T20:00:40.337Z"
cwd: "H:\\prism"
messages: 48
user_msgs: 18
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a779b8834c0f90ab9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Independent analyst review (weighted on silent breakage, regression, test integr

> **claude-code-cli** | 2026-06-17 | 48 msgs (18 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a779b8834c0f90ab9.jsonl`

## Transcript

### User | 2026-06-17T19:56:46.689Z

Independent analyst review (weighted on silent breakage, regression, test integrity) of an uncommitted change to `H:/prism/.claude/hooks/mcp-connectivity-check.mjs` + its test `H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs`.

See both: `cd H:/prism && git diff -- .claude/hooks/mcp-connectivity-check.mjs .claude/hooks/mcp-connectivity-check.test.mjs`. Read the full `runCheck` and the 4 new tests (named "runCheck debounce: ...").

CHANGE: `runCheck` now debounces the server-DOWN verdict — on a failed probe it does ONE confirming re-probe (`Math.min(cfg.timeoutMs,2000)` timeout) and only declares DOWN if both fail. Merge: `result = (confirm && confirm.ok === true) ? confirm : (confirm || result);`. Knob `PRISM_MCP_CONNECTIVITY_NO_DEBOUNCE=1`. All 41 tests pass (37 prior + 4 new).

Analyze:
1. **Regression of existing tests:** the prior "runCheck: disconnect returns DISCONNECTED banner" test uses a probeFn returning ok:false on EVERY call — confirm it still passes BECAUSE both the initial probe and the re-probe fail (sustained). Are there OTHER existing tests whose probeFn returns a failure that would now trigger an unexpected second probe and change behavior/state? Check each runCheck test.
2. **Test integrity (R9):** do the 4 new tests actually FAIL if the debounce logic regresses? Specifically: would the "transient -> NO banner" test fail if someone removed the debounce (single fail → banner)? Would "happy path -> NO re-probe" catch a needless re-probe? Are the `calls` counters and `maybeReconnectFn: () => null` injections correct, or do they mask anything?
3. **State/throttle coupling:** saveState persists the debounced result. Next turn, if the verdict was DOWN, `shouldProbe` re-probes immediately (recovery). With the debounce, a real recovery: turn N persists DOWN (both failed), turn N+1 probes ok → no re-probe → up. Confirm no stuck-down or probe-storm.
4. **Async/await correctness:** the re-probe is awaited; no floating promise; the function stays async
... [+200 chars truncated]

### Assistant | 2026-06-17T19:56:50.659Z

I'll analyze this change to `mcp-connectivity-check.mjs` and its test file. Let me start by reading both files and the diff.

### Assistant | 2026-06-17T19:56:51.608Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:56:52.020Z

[tool_use: Read]

### User | 2026-06-17T19:56:53.147Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-connectivity-check.mjs' was already read 2s ago in this session and is unchanged (mtime 1781725972780). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T19:57:07.025Z

[tool_result] diff --git a/.claude/hooks/mcp-connectivity-check.mjs b/.claude/hooks/mcp-connectivity-check.mjs
index 7ecba8d1d9..08ada406dd 100644
--- a/.claude/hooks/mcp-connectivity-check.mjs
+++ b/.claude/hooks/mcp-connectivity-check.mjs
@@ -31,6 +31,7 @@
  *   PRISM_MCP_CONNECTIVITY_DISABLE=1    skip the probe entirely
  *   PRISM_MCP_CONNECTIVITY_TIMEOUT_MS   probe timeout (default 3000)
  *   PRISM_MCP_CO
... [+5654 chars truncated]

### Assistant | 2026-06-17T19:57:10.110Z

I have the diff. Now let me read the full `runCheck` function and the surrounding helpers (`saveState`, `shouldProbe`, `maybeReconnect`, banner construction) to trace the blast radius. Let me also read the full test file to inspect every existing `runCheck` test's probeFn.

### Assistant | 2026-06-17T19:57:11.070Z

[tool_use: Read]

### Assistant | 2026-06-17T19:57:11.515Z

[tool_use: Read]

### User | 2026-06-17T19:57:17.044Z

[tool_result] 230	    "",
231	    "   To reconnect:",
232	    "     1. ONE-COMMAND recovery (reaps any duplicate-daemon pileup AND respawns a clean TRANSPORT=http daemon — safe no-op if already healthy):",
233	    "        `node H:/prism/scripts/singleton-service-guard.mjs --fix`",
234	    "     2. Manual fallback if --fix can't (MUST set TRANSPORT=http — a bare `node dist/index.js` runs STDIO mode and does NOT
... [+7808 chars truncated]

### User | 2026-06-17T19:57:17.814Z

[tool_result] 1	// mcp-connectivity-check.test.mjs — pure-core tests with injected http + fs.
2	// Run: node --test H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs
3	
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  getConfig,
8	  loadState,
9	  saveState,
10	  shouldProbe,
11	  buildBanner,
12	  runCheck,
13	  countBridges,
14	  buildDegradedBanner,
15	  buil
... [+21793 chars truncated]

### Assistant | 2026-06-17T19:57:21.543Z

I have the full picture. Now let me trace the specifics. I need to read the `maybeReconnect` function (the real prod path) and `probeUrl` to confirm the `result` shape contract, plus verify the test runs clean. Let me also check the consumers of the persisted state.

### Assistant | 2026-06-17T19:57:23.471Z

[tool_use: Grep]

### Assistant | 2026-06-17T19:57:23.973Z

[tool_use: Bash]

### User | 2026-06-17T19:57:25.894Z

[tool_result] 147:export function loadState(path = STATE_FILE, deps = {}) {
159:export function saveState(path, state, deps = {}) {
173:export function shouldProbe(state, throttleSec, nowMs = Date.now()) {
187:export function probeUrl(url, timeoutMs, httpClient = http) {

### User | 2026-06-17T19:57:30.871Z

[tool_result]   ...
# Subtest: runCheck debounce: sustained (both probes fail) -> DISCONNECTED banner
ok 39 - runCheck debounce: sustained (both probes fail) -> DISCONNECTED banner
  ---
  duration_ms: 0.7181
  ...
# Subtest: runCheck debounce: happy path (probe OK) -> NO re-probe (zero added latency)
ok 40 - runCheck debounce: happy path (probe OK) -> NO re-probe (zero added latency)
  ---
  duration_ms: 0.388
... [+341 chars truncated]

### Assistant | 2026-06-17T19:57:34.655Z

41/41 pass. Now let me read `maybeReconnect` (the real prod single-flight path) and `probeUrl` to verify the `result.ok` contract, plus run the R9 regression-revert test (does removing the debounce actually fail the transient test?).

### Assistant | 2026-06-17T19:57:35.880Z

[tool_use: Read]

### User | 2026-06-17T19:57:36.889Z

[tool_result] 173	export function shouldProbe(state, throttleSec, nowMs = Date.now()) {
174	  if (throttleSec <= 0) return true;
175	  // lastProbeAt === 0 is the "never probed" sentinel — always probe on first turn
176	  if (!state.lastProbeAt) return true;
177	  const ageMs = nowMs - state.lastProbeAt;
178	  if (ageMs >= throttleSec * 1000) return true;
179	  // Always re-probe when prior state was disconnect
... [+2158 chars truncated]

### Assistant | 2026-06-17T19:57:37.150Z

[tool_use: Grep]

### User | 2026-06-17T19:57:40.722Z

[tool_result] .claude\hooks\auto-lint-post-edit.mjs:22:import { existsSync, readFileSync, mkdirSync, openSync, closeSync } from "node:fs";
.claude\hooks\auto-lint-post-edit.mjs:55:    const out = openSync(logPath, "w");
.claude\hooks\cad-coverage-auto-refresh.mjs:24:import { statSync, existsSync, readdirSync, readFileSync, openSync, writeSync, closeSync } from "node:fs";
.claude\hooks\cad-coverage-auto-refresh.
... [+4016 chars truncated]

### Assistant | 2026-06-17T19:57:43.936Z

Let me verify the `maybeReconnect` real prod path (the O_EXCL single-flight) and confirm the debounce doesn't change how often it's invoked on a sustained outage. Let me also run the R9 revert test to confirm the new tests actually fail if the debounce is removed.

### Assistant | 2026-06-17T19:57:44.867Z

[tool_use: Read]

### Assistant | 2026-06-17T19:57:48.988Z

[tool_use: Bash]

### User | 2026-06-17T19:57:51.722Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+21179 chars truncated]

### User | 2026-06-17T19:58:00.717Z

[tool_result] debounce-present-after-revert: false

### Assistant | 2026-06-17T19:58:04.590Z

The regressed copy correctly has the debounce removed. Now let me run the 4 new debounce tests against the regressed copy to confirm R9: they must FAIL when the debounce is removed.

### Assistant | 2026-06-17T19:58:07.017Z

[tool_use: Bash]

### User | 2026-06-17T19:58:11.934Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-17T19:58:15.153Z

The grep filter may have eaten the output due to import-path differences. Let me run it more carefully and see the full debounce test results against the regressed module.

### Assistant | 2026-06-17T19:58:15.918Z

[tool_use: Bash]

### User | 2026-06-17T19:58:23.933Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-17T19:58:26.422Z

No output is suspicious — the regressed test file may have failed to import. Let me check exit status and raw tail directly.

### Assistant | 2026-06-17T19:58:27.663Z

[tool_use: Bash]

### User | 2026-06-17T19:58:36.032Z

[tool_result] EXIT=1
Could not find 'C:/Users/wompu/AppData/Local/Temp/cc-regressed.test.mjs'

### Assistant | 2026-06-17T19:58:39.901Z

The Git-Bash `/tmp` maps to a different path than Node sees on Windows. Let me write the regressed copies into a path Node can resolve and re-run.

### Assistant | 2026-06-17T19:58:44.289Z

[tool_use: Bash]

### User | 2026-06-17T19:58:54.924Z

[tool_result] debounce-removed: true
EXIT=1
# tests 1
# pass 0
# fail 1

### Assistant | 2026-06-17T19:59:00.808Z

Only 1 test ran — the relative import of the test helpers likely broke because the test file imports from `./cc-regressed.mjs` but other relative paths in the module resolve fine. Let me see the actual failure.

### Assistant | 2026-06-17T19:59:01.888Z

[tool_use: Bash]

### User | 2026-06-17T19:59:44.105Z

[tool_result] # Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'H:\\scripts\\lib\\mcp-reconnect-action.mjs' imported from H:\\prism\\.tmp-r9\\cc-regressed.mjs
not ok 1 - .tmp-r9\\cc-regressed.test.mjs
  error: 'test failed'

### Assistant | 2026-06-17T19:59:47.167Z

The `../../scripts/lib/` relative import broke because the copy sits one directory deeper. Let me put the regressed module in the same directory as the original so all relative imports resolve identically.

### Assistant | 2026-06-17T19:59:51.198Z

[tool_use: Bash]

### User | 2026-06-17T19:59:56.160Z

[tool_result] EXIT=1
# Subtest: runCheck debounce: transient (probe fails, re-probe OK) -> NO banner
not ok 38 - runCheck debounce: transient (probe fails, re-probe OK) -> NO banner
# Subtest: runCheck debounce: sustained (both probes fail) -> DISCONNECTED banner
not ok 39 - runCheck debounce: sustained (both probes fail) -> DISCONNECTED banner
# Subtest: runCheck debounce: happy path (probe OK) -> NO re-probe 
... [+702 chars truncated]

### Assistant | 2026-06-17T20:00:03.442Z

This is the key R9 finding. With the debounce removed:
- Test 38 (transient -> NO banner) **FAILS** — good, it catches the regression (single fail now produces a banner + calls != 2).
- Test 39 (sustained -> banner) **FAILS** — but only on the `calls === 2` assertion (with debounce gone, only 1 probe fires; the banner still appears). This confirms the test detects the missing re-probe.
- Test 40 (happy path -> NO re-probe) **PASSES even without debounce** — because the happy path never re-probes regardless. So test 40 does NOT actually verify the debounce; it would pass with or without the change. I'll note this.
- Test 41 (NO_DEBOUNCE knob) **PASSES even without debounce** — because with the debounce code gone, behavior is identical to the knob being set. So test 41 also does not exclusively verify the knob branch.

Tests 38 and 39 are the load-bearing R9 guards and both correctly fail on regression. Now let me clean up the temp files and confirm no lingering artifacts, then verify the `result` truthiness edge (could `confirm` ever be null/undefined and cause a problem).

### Assistant | 2026-06-17T20:00:05.150Z

[tool_use: Bash]

### User | 2026-06-17T20:00:11.674Z

[tool_result] CLEAN: no regress artifacts left

### Assistant | 2026-06-17T20:00:40.337Z

Clean. Now let me complete the analysis with the remaining edge-path checks. Let me trace the merge expression robustness and the throttle/state coupling carefully by reading the full code paths I have. I have everything I need to finalize.

Let me verify one more critical regression-risk path: the existing test 200 ("throttle within window with DOWN status STILL probes (recovery)") — its probeFn returns `ok:true`, so the debounce branch is NOT entered (recovery succeeds on first probe). And test 159 ("disconnect returns DISCONNECTED banner") returns `ok:false` on every call, so it now probes twice but still banners. Both confirmed by the 41/41 pass. Let me double-check there is no existing test whose probeFn has a mutable call-count that the second probe would corrupt state on.

Based on my full trace, here is my verdict.

---

VERDICT: PASS

summary: The debounce is a surgical, correctly-guarded addition — it re-probes only on a failed first probe, awaits the re-probe (no floating promise), preserves the fail-open/fail-soft contract, and leaves the `maybeReconnect` O_EXCL single-flight path untouched (still invoked exactly once per turn on a sustained outage, via `result.ok === false`). I verified the live suite (41/41) and ran an R9 revert: removing the debounce makes the two load-bearing new tests (transient + sustained) FAIL, proving they bind the behavior. No existing test regresses, and the state/throttle recovery loop is free of stuck-down or probe-storm.

findings:
- [P2] `.claude/hooks/mcp-connectivity-check.test.mjs:474-485` -- The "happy path -> NO re-probe" test does NOT actually verify the debounce: I reverted the debounce block and this test still PASSED (the happy path never re-probes whether or not the debounce exists, since the branch is gated on `result.ok === false`). It documents intent (zero added latency) but cannot fail if the debounce regresses. Not a defect — it's a true invariant of the happy path — but per R9 it is non-load-bearing. Tests
... [+3319 chars truncated]
