---
type: "chat-session"
source: "claude-code-cli"
session_id: "ca9b9050-43d7-4390-93f4-e31f19be4b82"
title: "You are arm C of PRISM's 3-of-3 RE-CHECK for **U-HOTEL-OEE-DASHBOARD** (slot:hot"
date: "2026-06-24"
first_ts: "2026-06-24T22:31:53.358Z"
last_ts: "2026-06-24T22:35:24.562Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 19
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-ae7eb6de6fef24e2f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:49"
---

# You are arm C of PRISM's 3-of-3 RE-CHECK for **U-HOTEL-OEE-DASHBOARD** (slot:hot

> **claude-code-cli** | 2026-06-24 | 50 msgs (19 user / 31 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-ae7eb6de6fef24e2f.jsonl`

## Transcript

### User | 2026-06-24T22:31:53.358Z

You are arm C of PRISM's 3-of-3 RE-CHECK for **U-HOTEL-OEE-DASHBOARD** (slot:hotel, gap #4). You FAILED round 1 with a P1 + P2 that were CORRECT and have now been fixed. Verify the fixes are complete + introduced no new breakage.

**Your round-1 findings (now fixed):**
- P1: `losses({})` (FE first-load empty body) returned 6 rows where minor_stops/reduced_speed survived as finite 0 -> the Losses tab showed bogus "0 min lost / Live" cards instead of "Unavailable" (asymmetric with trend's honest empty). 
- P2: negative/huge `ideal_cycle_time_sec` produced negative/giant `minutes_lost` that survived parseLosses -> a negative or overflowing bar.

**The fixes (verify on disk):**
1. `H:\prism\mcp-server\src\engines\OEECalculatorEngine.ts`: `losses()` now FIRST calls `if (!isMeasuredWindow(input)) return []` (the new module-level `isMeasuredWindow` requires all 7 core OEEInput fields to be `Number.isFinite`). And every emitted `minutes_lost` is wrapped in `safeMin(v) = Number.isFinite(v) && v > 0 ? v : 0` (finite, non-negative).
2. The route mock + engine tests updated: `losses({})` -> `[]` test, partial-body -> `[]` test, garbage-numbers (negative/1e9 ideal) -> all minutes finite + >=0 test. Route test: `POST /oee-losses {}` -> `{ok:true, data:[]}`.

**Diff:** `H:\prism\mcp-server\data\state\u-hotel-oee-dashboard.diff` (read first).
**Read:** `OEECalculatorEngine.ts` (losses() + isMeasuredWindow + safeMin), both test files, `web\src\pages\OEEDashboardPage.tsx` (confirm `[]` -> Unavailable on the losses feed).

**Verify (cite file:line; PASS/FAIL):**
1. **P1 fix complete:** does `losses({})` now return `[]`? Does `isMeasuredWindow` correctly reject empty {} AND a partial body (missing any of the 7 fields)? Is it SYMMETRIC with trend (both -> [] -> "Unavailable")? Does the FE losses-feed path (OEEDashboardPage.tsx ~167-171) treat `[]` as 'unavailable' (NOT 'live')? Confirm the bogus-"Live"-0-card path is GONE.
2. **P2 fix complete:** does `safeMin` clamp negative -> 0 AND N
... [+1244 chars truncated]

### Assistant | 2026-06-24T22:31:56.290Z

I'll start by reading the diff, then the engine and the consumers to verify the fixes.

### Assistant | 2026-06-24T22:31:56.770Z

[tool_use: Read]

### Assistant | 2026-06-24T22:31:56.988Z

[tool_use: Read]

### User | 2026-06-24T22:31:57.887Z

[tool_result] 1	/**
2	 * OEECalculatorEngine — L2-P4-MS1 PASS2 Specialty
3	 *
4	 * Calculates Overall Equipment Effectiveness (OEE) — the gold standard
5	 * KPI for manufacturing productivity. OEE = Availability × Performance × Quality.
6	 *
7	 * Models: planned vs unplanned downtime, speed losses, quality losses,
8	 * and six big losses categorization per TPM methodology.
9	 *
10	 * Actions: oee_calc, oee_tren
... [+13064 chars truncated]

### User | 2026-06-24T22:31:57.951Z

[tool_result] 1	diff --git a/mcp-server/src/__tests__/erp-rfq-routes.test.ts b/mcp-server/src/__tests__/erp-rfq-routes.test.ts
2	index 1e97a02268..c12028f085 100644
3	--- a/mcp-server/src/__tests__/erp-rfq-routes.test.ts
4	+++ b/mcp-server/src/__tests__/erp-rfq-routes.test.ts
5	@@ -84,6 +84,32 @@ const callTool: CallToolFn = vi.fn(async (tool: string, action: string, params:
6	   if (action === "credit_review")
... [+16608 chars truncated]

### Assistant | 2026-06-24T22:32:03.275Z

Now let me read the FE page and confirm the consumer paths, plus the engine test file and route test file.

### Assistant | 2026-06-24T22:32:04.146Z

[tool_use: Read]

### Assistant | 2026-06-24T22:32:04.159Z

[tool_use: Glob]

### User | 2026-06-24T22:32:04.823Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\pages\OEEDashboardPage.tsx' was already read 30m ago in this session and is unchanged (mtime 1776215280000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-24T22:32:18.284Z

[tool_result] mcp-server\src\__tests__\OEECalculatorEngine.test.ts

### Assistant | 2026-06-24T22:32:21.379Z

The read-once guard says OEEDashboardPage.tsx was already read this session, but I don't have it in my visible context (this is a fresh agent invocation). Let me read the relevant section of the FE page and the engine test file.

### Assistant | 2026-06-24T22:32:21.849Z

[tool_use: Read]

### User | 2026-06-24T22:32:22.501Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\OEECalculatorEngine.test.ts' was already read 0s ago in this session and is unchanged (mtime 1782340203415). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### Assistant | 2026-06-24T22:32:22.900Z

[tool_use: Bash]

### User | 2026-06-24T22:32:27.416Z

[tool_result] function oeeColor(pct: number) { return pct >= 85 ? 'text-emerald-300' : pct >= 60 ? 'text-amber-300' : 'text-rose-300'; }
function oeeBgColor(pct: number) { return pct >= 85 ? 'bg-emerald-300' : pct >= 60 ? 'bg-amber-300' : 'bg-rose-300'; }
function oeeTone(pct: number): 'emerald' | 'amber' | 'rose' { return pct >= 85 ? 'emerald' : pct >= 60 ? 'amber' : 'rose'; }
function oeeAccent(pct: number) {
... [+8398 chars truncated]

### Assistant | 2026-06-24T22:32:32.284Z

The FE losses-feed path is confirmed. Lines 167-171 (`if (lossesResult.status === 'fulfilled')`): `parseLosses(payloadOf(...))` -> if `parsed.length === 0` it sets `nextFeed.losses = { state: 'unavailable', ... }` (not 'live'). So `[]` -> "Unavailable", symmetric with trend (lines 180-184). The engine test file is in my context. Now let me confirm `parseLosses` and `payloadOf` behavior on the bare array, and verify the engine test cases for the fixes.

### Assistant | 2026-06-24T22:32:33.806Z

[tool_use: Bash]

### User | 2026-06-24T22:32:37.804Z

[tool_result] import { useCallback, useEffect, useState } from 'react';
import { ApiError, analyticsOEE, analyticsOEELosses, analyticsOEETrend } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  ActionButton,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'ov
... [+5177 chars truncated]

### Assistant | 2026-06-24T22:32:43.277Z

Now I have the full FE picture. Let me trace the critical P1/P2 paths carefully.

**FE `payloadOf` on a bare array:** `payloadOf(response)` calls `asRecord(response)`. For a bare array `[...]`, `typeof [] === 'object'` and `[] !== null`, so `asRecord([])` returns the array as `Record`. Then `record.result ?? record.data ?? null` -> `[].result` is undefined, `[].data` is undefined -> returns `null`. Then `parseLosses(null)` -> `!Array.isArray(null)` -> returns `[]`. So even an empty array surfaces as `[]` -> Unavailable. Good — but wait, I need to confirm the route returns `{ ok, data }` not a bare array. The route uses `rfqRoute` which wraps. Let me verify the route handler shape and the `analyticsOEELosses` client function.

### Assistant | 2026-06-24T22:32:45.165Z

[tool_use: Bash]

### Assistant | 2026-06-24T22:32:46.207Z

[tool_use: Bash]

### User | 2026-06-24T22:32:48.776Z

[tool_result] 102:  // and hands the route the RAW {type,text}. So we MUST parse the envelope first, then read .success/.data
103:  // -- otherwise res.data is the {type,text} object, the FE's Array.isArray is false, and the inbox is
111:  const rfqRoute = (action: string, getParams?: (req: any) => Record<string, unknown>) =>
122:        res.json({ ok: true, data: r?.data ?? r });
127:  router.post("/rfq-create
... [+1174 chars truncated]

### User | 2026-06-24T22:32:52.932Z

[tool_result] 583:export async function analyticsOEETrend(params: {
590:export async function analyticsOEELosses(params: {
2486:export async function analyticsOEE(params?: { machine_id?: string; period?: string }): Promise<PrismResponse> {

### Assistant | 2026-06-24T22:32:56.946Z

Let me read the rfqRoute envelope-unwrap logic and the client functions to confirm the bare-array path end-to-end.

### Assistant | 2026-06-24T22:32:58.368Z

[tool_use: Read]

### Assistant | 2026-06-24T22:32:59.185Z

[tool_use: Bash]

### User | 2026-06-24T22:32:59.290Z

[tool_result] 95	  // These wire its rfqList/rfqAssign/rfqUpdateStatus (+ rfqCreate) client calls onto the
96	  // existing RFQToOrderOrchestratorEngine via businessDispatcher. verifyToken baseline
97	  // (front-desk/estimator triage -- any logged-in shop user), mirroring /quote/generate.
98	  //
99	  // ENVELOPE (the dead-panel class, see reference_charlie_estimate_flow_envelope_nested_fix):
100	  // prism_bu
... [+1964 chars truncated]

### User | 2026-06-24T22:33:03.024Z

[tool_result] export async function analyticsOEETrend(params: {
  machine_id?: string;
  days?: number;
}): Promise<PrismResponse> {
  return request('POST', '/erp/oee-trend', params);
}

export async function analyticsOEELosses(params: {
  machine_id?: string;
  date?: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/oee-losses', params);
}

// ── BIZ-MS4: Sales, Pipeline & Procurement APIs 
... [+442 chars truncated]

### Assistant | 2026-06-24T22:33:12.271Z

Now I have the complete end-to-end trace. Let me trace the bare-array case through `rfqRoute`:

For `losses()` returning a bare array `[]`:
- `callTool("prism_business", "oee_losses", params)` -> dispatcher returns `oeeCalculatorEngine.losses(params)` = `[]` (a bare array). But wait — `prism_business` wraps in slimResponse `{type:"text", text:JSON.stringify([])}`. `callTool` (production) can't peel it, hands the route the `{type,text}` object. `unwrapEnvelope` sees `r.type === "text"` -> `JSON.parse("[]")` -> `[]` (a bare array).
- Then `r && r.success === false`: `[]` is truthy, `[].success` is undefined -> not `=== false`, skip.
- `res.json({ ok: true, data: r?.data ?? r })`: `[].data` is undefined -> falls back to `r` = `[]`. So `{ ok: true, data: [] }`.

Then the FE: `request(...)` returns `PrismResponse` (the body `{ok:true, data:[]}`). `payloadOf(response)` -> `asRecord({ok,data})` -> `record.result ?? record.data` -> `record.data` = `[]`. `parseLosses([])` -> `[].flatMap(...)` = `[]`. `parsed.length === 0` -> `nextFeed.losses = { state: 'unavailable' }`. **Confirmed: `[]` -> Unavailable, not Live.**

The route test asserts `{ ok:true, data:[] }` for `POST /oee-losses {}`. Now let me verify the engine test file cases for the P1/P2 fixes and run the actual tests.

### Assistant | 2026-06-24T22:33:14.027Z

[tool_use: Bash]

### User | 2026-06-24T22:33:22.321Z

[tool_result] 4: * The OEEDashboardPage Losses + Trends tabs had no backing engine projection -- losses()/trend()
5: * were promised in the engine's header comment but never built, so /erp/oee-losses + /erp/oee-trend
6: * had nothing to return. This unit adds losses(input):OEELoss[] + trend(samples):OEETrendDay[] as
11: * trend([]) MUST return [] (not throw, not fabricate) -- that is the load-bearing R12 pin he
... [+5843 chars truncated]

### Assistant | 2026-06-24T22:33:27.576Z

Now let me carefully verify the `safeMin` clamp on the negative-ideal case and check one subtle edge: the test at line 101-114 uses `baseInput({ ideal_cycle_time_sec: -100 })`. Let me trace whether a negative ideal could produce a value that the test's `toBeGreaterThanOrEqual(0)` catches but that an OTHER unclamped path might leak. Also check the worst-first sort with a NaN — `safeMin` runs before sort. Let me read the test header/baseInput and run the suite.

### Assistant | 2026-06-24T22:33:28.704Z

[tool_use: Read]

### User | 2026-06-24T22:33:29.646Z

[tool_result] 14	import { oeeCalculatorEngine } from "../engines/OEECalculatorEngine.js";
15	import type { OEEInput } from "../engines/OEECalculatorEngine.js";
16	
17	/** A healthy, fully-populated measurement window with hand-computed reference values:
18	 *  availableTime=450, availability=400/450=88.9%, idealRunTime=350, performance=350/400=87.5%,
19	 *  quality=680/700=97.1%. six_big_losses: breakdowns 36, 
... [+594 chars truncated]

### Assistant | 2026-06-24T22:33:29.932Z

[tool_use: Bash]

### User | 2026-06-24T22:33:35.444Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/OEECalculatorEngine.test.ts (14 tests) 7ms
 ✓ src/__tests__/erp-rfq-routes.test.ts (12 tests) 59ms

 Test Files  2 passed (2)
      Tests  26 passed (26)
   Start at  17:33:34
   Duration  399ms (transform 137ms, setup 0ms, import 264ms, tests 66ms, environment 0ms)

### Assistant | 2026-06-24T22:33:47.883Z

26/26 pass. Now let me do the deep adversarial trace on the P2 fix that the test suite alone doesn't prove. The critical question: **can ANY input still produce a negative/NaN/Infinity minute that survives to the FE?** `safeMin` is applied to all 6 emitted values. Let me verify there's no path where a value bypasses `safeMin`, and check the negative-ideal case produces a value that the clamp actually catches (not just a coincidentally-positive value).

Let me trace `baseInput({ ideal_cycle_time_sec: -100 })` through `calculate()` to find which losses go negative pre-clamp:

- `idealRunTime = (-100 * 700)/60 = -1166.67`
- `speedLoss = runTime - idealRunTime = 400 - (-1166.67) = 1566.67` (positive)
- `minorStops = 1566.67 * 0.3 = 470`, `reducedSpeed = 1566.67 * 0.7 = 1096.67` (both positive, finite)
- `breakdowns = 60*0.6 = 36`, `setupAdj = 60*0.4 = 24` (positive)
- `idealCycleMin = -100/60 = -1.667`; `startupRejects=4` -> `startupMin = round(4*-1.667*10)/10 = -66.7` (NEGATIVE). `prodMin = round(16*-1.667*10)/10 = -266.7` (NEGATIVE).
- `safeMin(-66.7)` -> `-66.7 > 0` false -> `0`. `safeMin(-266.7)` -> `0`. **Clamp catches it.** Good — this test has real teeth (pre-fix, `startup_rejects` and `production_rejects` would have been negative).

Now the key blast-radius question: does `safeMin` cover ALL 6, and is there any minute computed that does NOT pass through `safeMin`? Looking at the engine: all 6 `minutes_lost` fields are `safeMin(...)`. There is no other emitted minute. Let me verify there are no OTHER consumers of `losses()`/`trend()` and that the `/oee-six-losses` route mentioned is unaffected.

### Assistant | 2026-06-24T22:33:49.982Z

[tool_use: Bash]

### User | 2026-06-24T22:33:54.865Z

[tool_result] mcp-server/src/engines/CADRegressionResultsAnalyzerEngine.ts:427:      return this.trend(o.batchIds, o.stateDir ?? DEFAULT_STATE_DIR, o.fs);
mcp-server/src/engines/DailyFlashReportEngine.ts:10:import { oeeCalculatorEngine } from "./OEECalculatorEngine.js";
mcp-server/src/engines/MachineDispatchEngine.ts:337:        const { oeeCalculatorEngine } = require("./OEECalculatorEngine.js");
mcp-server/src
... [+2952 chars truncated]

### Assistant | 2026-06-24T22:34:02.265Z

Important — there are OTHER consumers of `oeeCalculatorEngine`. The matches for `.losses(` and `.trend(` on lines 427/3347/4435 are unrelated engines (CADRegression, memoryPressureMonitor — different `trend()` methods). But `DailyFlashReportEngine.ts`, `MachineDispatchEngine.ts`, `automationDispatcher.ts`, `schedulingDispatcher.ts`, `calcDispatcher.ts` all import `oeeCalculatorEngine`. The new guard `isMeasuredWindow` only affects `losses()` — but I must confirm NONE of these other consumers call `losses()` in a way the new fail-closed guard could now silently break (e.g. a consumer that relied on `losses()` always returning 6 rows). Let me check whether any of these call `.losses()` specifically.

### Assistant | 2026-06-24T22:34:04.887Z

[tool_use: Bash]

### User | 2026-06-24T22:34:10.269Z

[tool_result] === mcp-server/src/engines/DailyFlashReportEngine.ts ===
=== mcp-server/src/engines/MachineDispatchEngine.ts ===
=== mcp-server/src/tools/dispatchers/automationDispatcher.ts ===
62:            result = engine.calculate?.(params) ?? { error: "OEECalculator.calculate() not available" };
=== mcp-server/src/tools/dispatchers/schedulingDispatcher.ts ===
=== mcp-server/src/tools/dispatchers/calcDispatch
... [+21895 chars truncated]

### Assistant | 2026-06-24T22:34:17.548Z

Confirmed: every other `oeeCalculatorEngine` consumer (DailyFlashReport, MachineDispatch, automationDispatcher, schedulingDispatcher, calcDispatcher) calls only `.calculate()` — NONE call `.losses()` or `.trend()`. The new `isMeasuredWindow` guard and `safeMin` clamp live entirely inside `losses()`, so `calculate()` is byte-unchanged. **No new breakage to any other consumer.** The `losses()`/`trend()` are reached ONLY via `businessDispatcher` (oee_losses/oee_trend) -> erp.ts routes -> the OEE page.

The `/oee-six-losses` route at erp.ts:421 deliberately returns 501 (it does NOT call `oee_losses` — comment says "prism_business has NO oee_six_losses"). It's untouched and unaffected.

Now let me verify the `trend()` method was NOT modified by this fix (it should be byte-identical to round 1) and confirm tsc is clean on the changed files.

### Assistant | 2026-06-24T22:34:21.123Z

[tool_use: Bash]

### User | 2026-06-24T22:34:46.494Z

[tool_result]  mcp-server/src/engines/OEECalculatorEngine.ts | 145 ++++++++++++++++++++++++++
 1 file changed, 145 insertions(+)
---trend in current diff vs round1---
98c9f585d7 [MAIN]/U-EFF23: restore 2020 src files from Box canonical
=== tsc on changed files ===
(empty above = no tsc errors in changed files)

### Assistant | 2026-06-24T22:34:57.466Z

No tsc errors in any changed file. Now let me close the final loop: the `isMeasuredWindow` correctness — does it wrongly reject a valid all-zero window? `Number.isFinite(0)` is `true`, so an all-zero (but complete) window passes the guard -> `losses()` runs. And the happy-path `baseInput()` has all 7 fields finite -> passes -> 6 ranked losses. The happy-path test (line 38-61) asserts `toHaveLength(6)` with reference minutes `[36, 24, 15, 35, 2, 8]` by id, and the worst-first test (line 63-70) asserts the sorted order. Both passed in the run.

Let me do one final adversarial check — the worst-first sort with a `NaN` minute. The user's question #4 notes `safeMin` runs BEFORE the sort. Critical subtlety: if any unclamped `NaN` reached the sort comparator `(a,b) => b.minutes_lost - a.minutes_lost`, `NaN` comparisons return `false`, producing an unstable/garbage sort. Since `safeMin` converts every `NaN`/`Infinity`/negative to `0` BEFORE the array is built, the sort only ever sees finite non-negative numbers. Let me confirm the canonical ranking and that no string-interpolated description path could leak a bad number to the FE.

The descriptions interpolate `l.startup_rejects` / `l.production_rejects` (counts, not minutes) — these are not the `minutes_lost` field the FE bar reads, and `parseLosses` only reads `minutes_lost` for the bar (`maxLossMinutes = Math.max(...losses.map(loss => loss.minutes_lost))`). Even a weird count in the description string is cosmetic and cannot break a bar. 

Let me verify the canonical happy-path ranking produces exactly `[36,35,24,15,8,2]` as the user stated (note: by-id the values are breakdowns=36, setup=24, minor_stops=15, reduced_speed=35, startup=2, production=8; sorted desc = 36,35,24,15,8,2).

### Assistant | 2026-06-24T22:34:58.413Z

[tool_use: Read]

### User | 2026-06-24T22:34:59.272Z

[tool_result] 63	  it("ranks losses worst-first by minutes_lost (matches the page's ranked display)", () => {
64	    const losses = oeeCalculatorEngine.losses(baseInput());
65	    const mins = losses.map((l) => l.minutes_lost);
66	    // 36 (breakdowns) > 35 (reduced_speed) > 24 (setup) > 15 (minor_stops) > 8 (prod_rejects) > 2 (startup_rejects)
67	    expect(mins).toEqual([36.0, 35.0, 24.0, 15.0, 8.0, 2.0]);
6
... [+290 chars truncated]

### Assistant | 2026-06-24T22:35:24.562Z

Confirmed: the worst-first test asserts exactly `[36.0, 35.0, 24.0, 15.0, 8.0, 2.0]` (all already positive, so `safeMin` is identity here — it doesn't alter the valid result), plus a strictly-non-increasing invariant. This passed. `safeMin` does NOT mutate a valid result.

I have completed the full verification. Here is my verdict.

---

VERDICT: PASS

summary: Both round-1 findings are genuinely fixed and introduce no new breakage. `losses()` now fail-closes via `isMeasuredWindow` (P1) and clamps every emitted minute via `safeMin` (P2); the guard+clamp live entirely inside `losses()`, so `calculate()` and all five other `oeeCalculatorEngine` consumers (which call only `.calculate()`) are byte-unchanged. 26/26 tests pass, tsc clean on all changed files, and the FE losses-feed path treats `[]` as 'unavailable', killing the bogus-"Live"-0-card path.

findings: none

Audited paths (so the PASS is auditable):

1. **P1 fix complete — VERIFIED.** `OEECalculatorEngine.ts:187` `if (!isMeasuredWindow(input)) return []` runs FIRST. `isMeasuredWindow` (`:284-296`) returns `false` for non-object/null and requires all 7 core fields `Number.isFinite` — so `{}` -> `false` -> `[]`, and a partial body missing any of the 7 (e.g. no `good_parts`) -> `false` -> `[]`. Symmetric with `trend()` (`:258` `samples.length === 0` -> `[]`). FE: `OEEDashboardPage.tsx:167-171` — when `parseLosses(payloadOf(...)).length === 0`, sets `nextFeed.losses = { state: 'unavailable' }` (NOT 'live'); the 'live' branch only fires when `parsed.length > 0`. End-to-end the bare `[]` flows route (`erp.ts:122` `r?.data ?? r`) -> `{ok:true, data:[]}` -> FE `payloadOf` -> `parseLosses([])` -> `[]` -> "Unavailable". The bogus-"Live"-0-card path is GONE. Engine tests at `:86` (`{}`->[]) and `:95` (partial->[]) and route test `POST /oee-losses {}` -> `{ok:true,data:[]}` all green.

2. **P2 fix complete — VERIFIED.** `safeMin = (v) => Number.isFinite(v) && v > 0 ? v : 0` (`OEECalculatorEngine.ts:198`) wraps ALL 6 emitt
... [+2257 chars truncated]
