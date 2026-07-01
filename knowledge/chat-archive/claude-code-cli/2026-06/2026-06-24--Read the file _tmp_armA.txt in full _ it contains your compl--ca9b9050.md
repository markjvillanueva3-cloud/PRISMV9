---
type: "chat-session"
source: "claude-code-cli"
session_id: "ca9b9050-43d7-4390-93f4-e31f19be4b82"
title: "Read the file /tmp/armA.txt in full — it contains your complete review prompt (t"
date: "2026-06-24"
first_ts: "2026-06-24T16:49:00.495Z"
last_ts: "2026-06-24T16:52:21.526Z"
cwd: "H:\\prism"
messages: 60
user_msgs: 23
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a15f0cec3b0ecfba2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# Read the file /tmp/armA.txt in full — it contains your complete review prompt (t

> **claude-code-cli** | 2026-06-24 | 60 msgs (23 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a15f0cec3b0ecfba2.jsonl`

## Transcript

### User | 2026-06-24T16:49:00.495Z

Read the file /tmp/armA.txt in full — it contains your complete review prompt (the session diff for commit 940599eebe, PRISM U-COSTPAGE-SHAPE, slot:charlie). Execute that review exactly as specified. This is arm A (holistic) of PRISM's 3-of-3 scrutiny gate. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Pay special attention to: the security of the redact-then-adapt anon path (shop cost basis must NEVER reach an anon caller), the {result} envelope unwrap correctness, and whether the new tests have real teeth.

### Assistant | 2026-06-24T16:49:02.562Z

I'll start by reading the review prompt file to understand the exact task.

### Assistant | 2026-06-24T16:49:02.779Z

[tool_use: Read]

### User | 2026-06-24T16:49:05.892Z

[tool_result] 1	You are reviewer A of three independent Claude PRISM agents — a strict, holistic code reviewer for the PRISM manufacturing-intelligence platform.
2	Target: commit 940599eebe.
3	
4	Acceptance criteria:
5	  1. No stubs, TODOs, or placeholder returns
6	  2. Tests use concrete assertions (no toBeDefined()/toBeTruthy() blanket stubs)
7	  3. ≥3 failure modes covered for any new engine
8	  4. Physics c
... [+25342 chars truncated]

### Assistant | 2026-06-24T16:49:10.680Z

Now let me investigate the actual files in the repo to verify the diff against the real code. The diff references files I need to read end-to-end. Let me locate them.

### Assistant | 2026-06-24T16:49:11.631Z

[tool_use: Bash]

### Assistant | 2026-06-24T16:49:12.349Z

[tool_use: Glob]

### Assistant | 2026-06-24T16:49:12.836Z

[tool_use: Glob]

### Assistant | 2026-06-24T16:49:12.847Z

[tool_use: Glob]

### User | 2026-06-24T16:49:16.884Z

[tool_result] commit 940599eebe6090cf5783276dd6ae0ed0764d5111
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 11:48:21 2026 -0500

    [MAIN-FORCE] [QUOTING]/U-COSTPAGE-SHAPE (slot:charlie): fix CostEstimatorPage dead-panel -- route shape adapter + {result} envelope unwrap
    
    CostEstimatorPage was dead for EVERY caller (pre-existing, independent of the U-COST-ROUTE-REDACT
  
... [+2487 chars truncated]

### User | 2026-06-24T16:49:27.872Z

[tool_result] web\src\api\cost.ts
.claude\worktrees\brave-euclid\web\src\api\cost.ts
.git\backup-untracked\mcp-server\web\src\api\cost.ts
prism-test-6d0595\mcp-server\web\src\api\cost.ts
.claude\worktrees\agent-a39ea356e3f158cf4\mcp-server\web\src\api\cost.ts
.claude\worktrees\agent-ad02ba149880ce364\mcp-server\web\src\api\cost.ts
.claude\worktrees\agent-a2d1ca42facf5b5a4\mcp-server\web\src\api\cost.ts
.claude\
... [+2431 chars truncated]

### User | 2026-06-24T16:49:27.981Z

[tool_result] src\routes\cost.ts
.claude\worktrees\brave-euclid\mcp-server\src\routes\cost.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\routes\cost.ts
prism-test-6d0595\mcp-server\src\routes\cost.ts
.claude\worktrees\agent-a39ea356e3f158cf4\mcp-server\src\routes\cost.ts
.claude\worktrees\agent-ad02ba149880ce364\mcp-server\src\routes\cost.ts
.claude\worktrees\agent-a2d1ca42facf5b5a4\mcp-server\src\routes\co
... [+2411 chars truncated]

### User | 2026-06-24T16:49:28.046Z

[tool_result] src\routes\quote.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\routes\quote.ts
prism-test-6d0595\mcp-server\src\routes\quote.ts
.claude\worktrees\agent-a39ea356e3f158cf4\mcp-server\src\routes\quote.ts
.claude\worktrees\agent-ad02ba149880ce364\mcp-server\src\routes\quote.ts
.claude\worktrees\agent-a2d1ca42facf5b5a4\mcp-server\src\routes\quote.ts
.claude\worktrees\agent-afb2adb755bfa9000\mcp-ser
... [+2390 chars truncated]

### Assistant | 2026-06-24T16:49:33.706Z

The canonical files are at `mcp-server/src/routes/cost.ts`, `mcp-server/web/src/api/cost.ts`, and `mcp-server/src/routes/quote.ts`. Let me read the actual committed files end-to-end.

### Assistant | 2026-06-24T16:49:34.180Z

[tool_use: Read]

### Assistant | 2026-06-24T16:49:34.387Z

[tool_use: Read]

### User | 2026-06-24T16:49:35.004Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\cost.ts' was already read 7m ago in this session and is unchanged (mtime 1782319069361). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-24T16:49:35.452Z

[tool_result] 1	const BASE_URL = "/api/v1/cost";
2	const TIMEOUT_MS = 15_000;
3	
4	/**
5	 * T-COSTPAGE-SHAPE -- the /api/v1/cost/{estimate,quote} routes return the engine result WRAPPED as
6	 * `{ result: <body> }` (cost.ts route, res.json({ result: safe })), but this client typed the response as
7	 * the bare body (`CostEstimate`) and CostEstimatorPage derefs `res.per_part_cost` directly. So the page
8	 * read
... [+2972 chars truncated]

### Assistant | 2026-06-24T16:49:44.261Z

I have the FE file. Now let me read the route file (cost.ts) which the read-once-guard says is already in context — but I haven't actually seen its content in this session, only the diff. Let me read the specific sections I need: the redactInternalMarginFields function in quote.ts, and the full cost.ts route handler context.

### Assistant | 2026-06-24T16:49:45.681Z

[tool_use: Read]

### Assistant | 2026-06-24T16:49:46.131Z

[tool_use: Read]

### User | 2026-06-24T16:49:46.636Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Cost Routes
3	 * Cost estimation, quoting, comparison, history, + COST-CASCADE-MS0 dashboard.
4	 */
5	import { Router } from "express";
6	import * as path from "node:path";
7	import type { CallToolFn } from "./index.js";
8	import { redactInternalMarginFields } from "./quote.js";
9	import {
10	  aggregateTelemetry,
11	  normalizeConfig,
12	  makeFsDeps,
13	  type Aggre
... [+4852 chars truncated]

### User | 2026-06-24T16:49:47.113Z

[tool_result] 280	      el('recordCount').textContent=fmtNum(d.daily&&d.daily.recordCount);
281	      renderHourly(d.hourlyUSD);
282	      var tentEntries=Object.entries(d.perTentacle||{}).sort(function(a,b){return b[1].usd-a[1].usd;});
283	      renderTable(document.querySelector('#tentacleTable tbody'), tentEntries);
284	      var clsEntries=Object.entries((d.daily&&d.daily.perTaskClass)||{}).sort(function(a,
... [+5286 chars truncated]

### Assistant | 2026-06-24T16:49:50.870Z

Now I need to read `redactInternalMarginFields` in quote.ts — the security-critical redactor. This is the load-bearing function for the anon no-leak claim. Let me find and read it.

### Assistant | 2026-06-24T16:49:52.332Z

[tool_use: Grep]

### User | 2026-06-24T16:49:54.060Z

[tool_result] 70:const REDACTED_NESTED_BLOCKS = ["costs", "uncertainty", "cost_breakdown", "breakdown", "inputs"] as const;
85:export function redactInternalMarginFields(result: unknown): unknown {
91:  const hasNestedBlock = REDACTED_NESTED_BLOCKS.some((k) => isObjectLike(result[k]));
99:  for (const k of REDACTED_NESTED_BLOCKS) {
153: * the identical `{ type, text }` shape -- otherwise `redactInternalMarginFi
... [+613 chars truncated]

### Assistant | 2026-06-24T16:49:56.621Z

Now let me read the full `redactInternalMarginFields` function and the flat-key redaction list. This is the core of the anon no-leak claim.

### Assistant | 2026-06-24T16:49:57.391Z

[tool_use: Read]

### User | 2026-06-24T16:49:58.399Z

[tool_result] 40	 *
41	 * GRACEFUL-SHAPE contract (per-file scrutiny arm B P1): the `costs` object is kept PRESENT but
42	 * EMPTIED (sub-fields removed), NOT deleted -- the FE consumer `adaptQuoteEstimate`
43	 * (web/src/api/client.ts) hard-gates `if (!e.costs || !e.pricing) return null`, and a null there
44	 * makes QuoteBuilderPage throw a 502 on its whole estimate tab. Keeping `costs` as a truthy empty
45	 
... [+7844 chars truncated]

### Assistant | 2026-06-24T16:50:07.459Z

This is the load-bearing security finding. The `/cost/estimate` and `/cost/quote` routes call `redactInternalMarginFields(result)` DIRECTLY on the result from `callTool("prism_intelligence", ...)`, NOT `redactThroughEnvelope`. The critical question: does `prism_intelligence` return a bare object that `callTool` peels, or a `{type, text}` envelope like `prism_business`?

The redaction is a NO-OP if the result is still wrapped in a `{type, text}` envelope. The memory note `reference_charlie_cost_route_redact_2026_06_24` says: "prism_intelligence returns content[] which callTool (index.ts:887) JSON.parses -> route gets the real object -> redactInternalMarginFields DIRECTLY (NOT redactThroughEnvelope...)". Let me verify this against the actual `callTool` in index.ts, because the entire anon-no-leak guarantee depends on it.

### Assistant | 2026-06-24T16:50:12.144Z

[tool_use: Glob]

### Assistant | 2026-06-24T16:50:12.656Z

[tool_use: Grep]

### User | 2026-06-24T16:50:14.263Z

[tool_result] 117:export type CallToolFn = (toolName: string, action: string, params?: Record<string, any>) => Promise<any>;
122:export function registerRoutes(app: Express, callTool: CallToolFn): void {
158:  app.use("/api/v1/export", createExportRouter(callTool));

### User | 2026-06-24T16:50:22.783Z

[tool_result] mcp-server\src\routes\index.ts

### Assistant | 2026-06-24T16:50:26.093Z

The `callTool` passed to the routers is created at the call site of `registerRoutes`. The CallToolFn type returns `Promise<any>` — the actual peeling logic lives wherever `registerRoutes` is invoked. Let me find where the real `callTool` implementation lives (the one that peels `content[0].text`).

### Assistant | 2026-06-24T16:50:27.171Z

[tool_use: Bash]

### User | 2026-06-24T16:50:34.032Z

[tool_result] src/index.ts:1410:  const { registerRoutes } = await import("./routes/index.js");
src/index.ts:1411:  registerRoutes(app, callTool);
src/__tests__/cwedm-calculator-routes.test.ts:18:import { registerRoutes } from "../routes/index.js";
src/__tests__/cwedm-calculator-routes.test.ts:77:    registerRoutes(app, async (toolName, action, params) => {
src/__tests__/dfm-routes.test.ts:6:import { registerRo
... [+636 chars truncated]

### Assistant | 2026-06-24T16:50:37.146Z

[tool_use: Read]

### User | 2026-06-24T16:50:38.101Z

[tool_result] 1350	      try { transport.close(); } catch { /* best-effort */ }
1351	      try { (reqServer as any).close?.(); } catch { /* best-effort */ }
1352	    });
1353	
1354	    try {
1355	      await reqServer.connect(transport);
1356	      await transport.handleRequest(req, res, req.body);
1357	    } catch (e) {
1358	      // Transport errors were previously the LAST statements of this async
1359	     
... [+2786 chars truncated]

### Assistant | 2026-06-24T16:50:48.548Z

This confirms the security claim. `callTool` (index.ts:1397-1399) peels `result.content[0].text` and `JSON.parse`s it — so `prism_intelligence:process_cost` returns a bare object to the route. The route calls `redactInternalMarginFields(result)` on that bare object directly, which IS effective (not a no-op). The redaction-vs-envelope concern that bit prior quoting units does NOT apply here because `prism_intelligence` returns `content[]` (peelable), unlike `prism_business` which returns a slim `{type,text}`.

Now let me verify the critical redaction path actually strips the cost basis. The `/cost/estimate` anon path: `redactInternalMarginFields(processCostResult)`. The result has `total_cost_per_part`, `machine_cost`, `tool_cost_per_part`, `setup_cost_per_part`, `inputs` (with `machine_rate_per_hour`), `breakdown` (array). Let me trace the redaction:

- `hasFlatKey`: `total_cost_per_part`, `tool_cost_per_part`, `setup_cost_per_part`, `machine_cost`, `total_cost` are all in `REDACTED_FLAT_KEYS` → deleted.
- `hasNestedBlock`: `inputs` and `breakdown` are in `REDACTED_NESTED_BLOCKS` → emptied to `{}`. So `inputs.machine_rate_per_hour` (shop $/hr) is stripped.

Then `adaptCostEstimate(redacted)` sees `total_cost_per_part` absent (deleted) → returns as-is, no fabrication. So the anon path leaks nothing. Verified.

Now let me check the live source shape of `processCost` to confirm `machine_cost` is a top-level flat key (caught by REDACTED_FLAT_KEYS) and that there are no OTHER cost-basis fields the redactor misses. Let me read the engine.

### Assistant | 2026-06-24T16:50:49.418Z

[tool_use: Bash]

### User | 2026-06-24T16:50:53.939Z

[tool_result] src/engines/CastingQuoteEngine.ts
src/engines/IntelligenceEngine.ts

### Assistant | 2026-06-24T16:50:57.321Z

[tool_use: Bash]

### User | 2026-06-24T16:51:01.145Z

[tool_result] 229:  return {
822:      cycle_time_min: r.cycle_time.total_min,
966:    cycle_time_min: plan.cycle_time.total_min,
981:    total_cycle_time_min: planResults.reduce((s, p) => s + p.cycle_time.total_min, 0),
1009:      lines.push(`  - Cycle time: ${op.cycle_time_min} min`);
1017:    lines.push(`**Total cycle time:** ${result.total_cycle_time_min} min`);
1024:    `total ${result.total_cycle_time_min
... [+1598 chars truncated]

### Assistant | 2026-06-24T16:51:04.087Z

Let me read the full processCost return block to enumerate every field and confirm the redactor covers all cost-basis fields.

### Assistant | 2026-06-24T16:51:04.817Z

[tool_use: Read]

### User | 2026-06-24T16:51:05.774Z

[tool_result] 1100	  const toolCostPerPart = toolCost / effectivePartsPerEdge;
1101	  const setupCostPerPart = (setupTimeMin / 60 * machineRate) / batchSize;
1102	  const totalCostPerPart = machineCost + toolCostPerPart + setupCostPerPart;
1103	
1104	  const result = {
1105	    total_cost_per_part: Math.round(totalCostPerPart * 100) / 100,
1106	    machine_cost: Math.round(machineCost * 100) / 100,
1107	    too
... [+711 chars truncated]

### Assistant | 2026-06-24T16:51:13.352Z

Now I have the complete cost-basis field inventory. Let me verify the redactor covers every field, then confirm the test reference values match the engine.

processCost returns (IntelligenceEngine.ts:1104-1119):
- `total_cost_per_part` → in REDACTED_FLAT_KEYS → deleted ✓
- `machine_cost` → in REDACTED_FLAT_KEYS → deleted ✓
- `tool_cost_per_part` → in REDACTED_FLAT_KEYS → deleted ✓
- `setup_cost_per_part` → in REDACTED_FLAT_KEYS → deleted ✓
- `cycle_time_min`, `tool_life_min`, `parts_per_edge`, `batch_size` → process metrics, NOT cost basis → survive (correct; these are not margin-revealing)
- `breakdown` (opCosts array) → in REDACTED_NESTED_BLOCKS → emptied to `{}` ✓
- `inputs` (contains `machine_rate_per_hour` = shop $/hr) → in REDACTED_NESTED_BLOCKS → emptied to `{}` ✓

Every cost-basis field is stripped for anon. The anon no-leak claim holds. Now let me verify the test's mock matches the real engine shape and that the tests have teeth. Let me read the test mock setup (the `post` helper and `processCostResult`).

### Assistant | 2026-06-24T16:51:14.714Z

[tool_use: Read]

### User | 2026-06-24T16:51:16.761Z

[tool_result] 1	/**
2	 * U-COST-ROUTE-REDACT -- anon cost-basis redaction on /api/v1/cost/{estimate,quote} + /api/v1/pipeline/quote.
3	 *
4	 * `cost.ts` (createCostRouter) and `pipeline.ts` (createPipelineRouter) are mounted under /api with only
5	 * `optionalToken` (auth.ts:64-76 -- sets req.userId for a valid Bearer, NEVER rejects anonymous). Three
6	 * handlers leaked the shop's internal cost basis to anonym
... [+8888 chars truncated]

### Assistant | 2026-06-24T16:51:26.393Z

The test mock matches the production wire (returns the parsed engine object directly, matching what `callTool` hands the route after peeling `content[0].text`). I've verified the mock fixture matches the real engine shape (IntelligenceEngine.ts:1104-1119). The reference values 42.5/18.3/6.4/9.1/95 are concrete, and the tests assert real properties (`not.toHaveProperty`, `toEqual({})`, exact values, rawBody string-scan). These are real teeth, not stubs.

Now let me examine one subtle correctness concern: the FE `unwrapResult` over-peel guard and the test claiming nested-result handling. I've read the FE source. One thing to verify in the test file — the negative-control test and whether the anon test's `rawBody` scan is robust. Let me read the rest of the test additions I haven't seen (the new describe block lines 259-352 were in the diff). I've seen those in the diff. Let me now check the pipeline.ts route to confirm the `/pipeline/quote` redaction wasn't broken by this change, and whether `/pipeline` needs the same adapter (consumer-left-unupdated check).

### Assistant | 2026-06-24T16:51:27.799Z

[tool_use: Grep]

### User | 2026-06-24T16:51:29.390Z

[tool_result] 11:import { redactInternalMarginFields } from "./quote.js";
53:      res.json({ result });
67:      res.json({ result });
75:      res.json({ result });
91:      res.json({ result });
121:      res.json({ result });
128:      const result = await callTool("prism_intelligence", "process_cost", {
145:      // U-COST-ROUTE-REDACT: process_cost returns the shop's internal cost stack (total/machine/too
... [+324 chars truncated]

### Assistant | 2026-06-24T16:51:40.082Z

Important observation: `/pipeline/quote` (pipeline.ts:128-150) calls `process_cost` and redacts with `redactInternalMarginFields` but does NOT apply `adaptCostEstimate`. This is correct and intentional — `/pipeline/quote` is a different FE consumer (not CostEstimatorPage), and the commit scope is specifically the CostEstimatorPage dead-panel via `/cost/estimate`. The pipeline route shape was not the bug being fixed. Adding the adapter there without a consumer needing it would be scope creep. The redaction on pipeline.ts:149 is unchanged by this diff, so no regression. This is not a finding — just confirming the consumer was correctly left as-is.

Now let me verify the one remaining correctness subtlety: the FE `unwrapResult` type signature. The `post<T>` returns `unwrapResult<T>(await res.json())`. For `costApi.quote` and `costApi.compare`, `T` is `unknown`, and for `history`, `T` is `unknown` via `get`. The unwrap applies uniformly. Since `/compare` and `/history` return 501 with `{message, error}` (no `result` key), `unwrapResult` falls back to the bare body (the error object) — but `post`/`get` throw on `!res.ok` first (501 is not ok), so they never reach unwrap. Correct.

Let me confirm there are no floating promises or any-spread anti-patterns introduced, and check the FE test error-path assertion is sound. Let me also verify the `breakdown` array `isObjectLike([])` behavior the comment claims (arrays ARE object-like, so `breakdown` array gets emptied to `{}`).

### Assistant | 2026-06-24T16:51:41.029Z

[tool_use: Grep]

### User | 2026-06-24T16:51:42.548Z

[tool_result] 18:function isObjectLike(value: unknown): value is Record<string, unknown> {
19-  return typeof value === "object" && value !== null;
20-}
21-

### Assistant | 2026-06-24T16:51:48.818Z

`isObjectLike([])` returns `true` (arrays are `typeof "object"` and non-null). So in `redactInternalMarginFields`:
- `hasNestedBlock` detects `breakdown` (array) via `isObjectLike` → true → triggers redaction
- The loop `if (isObjectLike(result[k])) clone[k] = {}` empties the `breakdown` array to `{}` ✓

This matches the comment and test (`expect(d.breakdown).toEqual({})`). The array-as-object-like behavior is correctly relied upon. No bug.

Now I have everything I need. Let me do a final check on the two remaining acceptance criteria: physics constants (N/A — this is a route/FE shape adapter, no physics) and dispatcher wiring (N/A — no new engine; `adaptCostEstimate`/`unwrapResult` are pure helpers, both exported and consumed in the same commit + tested). Let me confirm the FE test's error-path and the full new test block render correctly by reading the final portion of the route test (the lines 165-260 I partially saw).

### Assistant | 2026-06-24T16:51:49.552Z

[tool_use: Read]

### User | 2026-06-24T16:51:51.280Z

[tool_result] 165	    const { status, result } = await post("/api/v1/cost/estimate", {}, true);
166	    expect(status).toBe(200);
167	    const d = result as Record<string, unknown>;
168	    // Raw engine cost fields are still present (additive adapter, authed sees everything):
169	    expect(d.total_cost_per_part).toBe(42.5);
170	    expect((d.inputs as Record<string, unknown>).machine_rate_per_hour).toBe(95);
... [+5482 chars truncated]

### Assistant | 2026-06-24T16:52:21.526Z

I now have full verification. Let me consolidate my findings.

I've verified the complete picture end-to-end:

1. **Security (anon redact-then-adapt path):** VERIFIED SOUND. `callTool` (index.ts:1397-1399) peels `content[0].text` and `JSON.parse`s it, so `prism_intelligence:process_cost` hands the route a bare parsed object — `redactInternalMarginFields` runs on the real object directly (NOT a no-op on a `{type,text}` envelope, which was the prior-units' trap, and which only applies to `prism_business`). The anon path (cost.ts:318-319) redacts FIRST: every cost-basis field from the real engine (`total_cost_per_part`/`machine_cost`/`tool_cost_per_part`/`setup_cost_per_part` via REDACTED_FLAT_KEYS; `inputs.machine_rate_per_hour` and the `breakdown` array via REDACTED_NESTED_BLOCKS→`{}`) is stripped. THEN `adaptCostEstimate(redacted)` sees `total_cost_per_part` absent (`typeof perPart !== "number"`) and returns as-is — it never re-fabricates `per_part_cost`/`total_cost`/`breakdown` from absent data. No shop cost basis reaches anon. The order is correct and the test rawBody-scan proves it on the wire.

2. **Envelope unwrap correctness:** VERIFIED. `unwrapResult` (cost.ts FE:14-19) guards array/primitive/null, peels only a plain object with a `result` key, peels only the outer level, falls back to bare body. The route wraps `res.json({ result: safe })`; the FE now peels it. 501 error routes never reach unwrap (thrown on `!res.ok` first).

3. **Test teeth:** REAL. Concrete reference values (42.5/1062.5/{18.3,6.4,9.1}); `not.toHaveProperty` + `toEqual({})` + rawBody string-scans; a negative-control that strips the real `processCostResult()` fixture; adapter adversarial cases (null/string/number/non-numeric/partial). The mock matches the production wire (parsed object, no envelope) — matching the engine shape I verified at IntelligenceEngine.ts:1104-1119. No `.skip`/`.only`, no `toBeDefined()` stubs.

4. No physics constants (N/A), no new engine to dispatcher-wire (pure hel
... [+3288 chars truncated]
