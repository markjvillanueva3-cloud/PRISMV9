---
type: "chat-session"
source: "claude-code-cli"
session_id: "3a620309-f201-4a54-acd1-852132562718"
title: "Review a quebec frontend change for PRISM (read-only). Files: - `H:/prism/mcp-se"
date: "2026-06-21"
first_ts: "2026-06-21T00:11:48.458Z"
last_ts: "2026-06-21T00:14:35.875Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 59
user_msgs: 27
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/3a620309-f201-4a54-acd1-852132562718/subagents/agent-af5695bc9c1a13b87.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review a quebec frontend change for PRISM (read-only). Files: - `H:/prism/mcp-se

> **claude-code-cli** | 2026-06-21 | 59 msgs (27 user / 32 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/3a620309-f201-4a54-acd1-852132562718/subagents/agent-af5695bc9c1a13b87.jsonl`

## Transcript

### User | 2026-06-21T00:11:48.458Z

Review a quebec frontend change for PRISM (read-only). Files:
- `H:/prism/mcp-server/web/src/api/calc.ts` (MODIFIED — SFC API client)
- `H:/prism/mcp-server/web/src/__tests__/calc-api.test.ts` (NEW — its test)

Context: calc.ts previously used raw `fetch`; it was migrated to the canonical `fetchJson` from `./requestCore` (read `H:/prism/mcp-server/web/src/api/requestCore.ts` to verify the contract). A NEW `assertNoEnvelopeError` guard was added because `fetchJson` only throws on `!response.ok` — a `200 OK` body `{error:"..."}` (the "silent-zero" class, frontend-app/CLAUDE.md s2+s5) passes through `fetchJson` and must be guarded in calc.ts.

Verify and grade PASS/FAIL with P0/P1/P2 + file:line:
1. **Regression risk:** the 4 legacy exports (`speedFeed`/`kienzle`/`taylor`/`mrr`) — are their signatures + observable behavior preserved for existing callers (e.g. SfcCalculatorPage)? Did switching raw fetch -> fetchJson change anything a caller depends on (error type, return shape, timeout)? grep callers of `calcApi` if needed.
2. **Guard correctness:** `assertNoEnvelopeError` for every shape — `{error:"x"}`, `{error:{message}}`, `{error:null}`, `{error:""}`, `{error:"   "}`, missing error, error as a number/array. Any false-positive (throwing on a legit payload) or false-negative (missing a real error)?
3. **Convention conformance (R11):** does calc.ts now match how other `src/api/*.ts` modules use fetchJson? Is importing `ApiError` correct?
4. **Type correctness:** the `post<unknown>().then(guard)` flow + the new envelope types.
5. Anything else (silent breakage, the kienzle/taylor/mrr routes that may not exist in sfc.ts).

Be specific. Grade PASS only if no P0/P1.

### Assistant | 2026-06-21T00:11:53.433Z

I'll conduct a thorough read of all relevant files before making any judgments.

### Assistant | 2026-06-21T00:11:53.868Z

[tool_use: Read]

### Assistant | 2026-06-21T00:11:54.250Z

[tool_use: Read]

### Assistant | 2026-06-21T00:11:54.329Z

[tool_use: Read]

### User | 2026-06-21T00:11:55.057Z

[tool_result] 1	/**
2	 * SFC (Speed & Feed Calculator) API client -- `/api/v1/sfc/*`.
3	 *
4	 * Routes through the canonical resilient `fetchJson` helper (retry/timeout/
5	 * offline-normalized) -- NOT raw `fetch`. Two distinct failure modes are
6	 * normalized to a thrown `ApiError` so callers surface a real error state:
7	 *   1. HTTP error (`!response.ok`)            -- handled inside `fetchJson`.
8	 *   2. 
... [+5345 chars truncated]

### User | 2026-06-21T00:11:55.130Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\requestCore.ts' was already read 9m ago in this session and is unchanged (mtime 1779923141812). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T00:11:55.774Z

[tool_result] 1	/**
2	 * Tests for the SFC API client (src/api/calc.ts).
3	 *
4	 * The load-bearing assertion is the SILENT-ZERO guard: a `200 OK` response
5	 * whose body is `{ error: "..." }` MUST reject (carrying the backend's real
6	 * message), not resolve as success. That is the #1 regression class in this
7	 * galaxy (frontend-app/CLAUDE.md s2 + s5). `fetch` is mocked because the SUT
8	 * is the client's
... [+6891 chars truncated]

### Assistant | 2026-06-21T00:12:00.204Z

I need to read `requestCore.ts` to verify the contract (the read-once guard fired but I haven't actually seen the file in this session context — let me verify).

### Assistant | 2026-06-21T00:12:00.958Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:12:01.779Z

[tool_use: Bash]

### User | 2026-06-21T00:12:06.144Z

[tool_result]      1	export type ApiErrorKind = 'http' | 'timeout' | 'offline' | 'network' | 'parse' | 'unknown' | 'auth';
     2	
     3	export type ApiErrorPresentation = {
     4	  title: string;
     5	  message: string;
     6	  hint?: string;
     7	  retryLabel: string;
     8	};
     9	
    10	type ApiErrorOptions = {
    11	  kind?: ApiErrorKind;
    12	  retryable?: boolean;
    13	  hint?: string;
  
... [+10213 chars truncated]

### User | 2026-06-21T00:12:06.948Z

[tool_result] src/api/calc.ts:76: * `calcApi.speedFeed` return below is preserved unchanged for existing callers.
src/api/calc.ts:109:export const calcApi = {
src/api/calculatorData.ts:25:} from '../data/calculatorWorkspace';
src/api/calculatorData.ts:37:} from '../data/calculatorWorkholding';
src/components/calculator/CalculatorSectionPurchaseModal.tsx:5:} from '../../utils/calculatorPurchaseRecommendations';

... [+8482 chars truncated]

### Assistant | 2026-06-21T00:12:11.004Z

The grep confirms no file currently imports from `src/api/calc.ts` directly (no `from.*['"].*api/calc['"]` hits). Now let me check for the SFC routes that `kienzle`, `taylor`, and `mrr` target, and look at the SfcCalculatorPage to understand the caller surface.

### Assistant | 2026-06-21T00:12:12.580Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:12:13.166Z

[tool_use: Bash]

### User | 2026-06-21T00:12:18.243Z

[tool_result] src/api/calc.ts:76: * `calcApi.speedFeed` return below is preserved unchanged for existing callers.
src/api/calc.ts:109:export const calcApi = {

### User | 2026-06-21T00:12:18.487Z

[tool_result] src/routes/calibration.ts:14:  model_id: z.string().min(1).describe("Prediction model ID (e.g., kienzle_force, taylor_tool_life)"),
src/routes/milling.ts:251:            formulas_touched: ["kienzle", "taylor", "surface_finish"],
src/routes/openapi.ts:737:      "/validate/kienzle": {
src/routes/openapi.ts:740:      "/validate/taylor": {
src/routes/specialty.ts:206:  // /grinding/calculate -> MERGE 
... [+434 chars truncated]

### Assistant | 2026-06-21T00:12:21.170Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:12:21.335Z

[tool_use: Bash]

### User | 2026-06-21T00:12:27.069Z

[tool_result] admin.ts
agent.ts
api-ext.ts
asset-check.ts
auth.ts
billing.ts
bridge.ts
business.ts
cad.ts
cadRegression.ts
calibration.ts
cam.ts
cncOps.ts
compliance.ts
context.ts
cost.ts
data.ts
dev.ts
dfm.ts
diagnosis.ts
doc.ts
docLearn.ts
edm.ts
erp.ts
exportRoutes.ts
gsd.ts
hook.ts
hotel-portal.ts
inbox.ts
index.ts
intake.ts
integrations.ts
knowledge.ts
knowledgeExt.ts
latheTurning.ts
learning.ts
machineAud
... [+522 chars truncated]

### User | 2026-06-21T00:12:27.172Z

[tool_result] 3: * Consolidates existing SFC endpoints from index.ts into a proper router
9:/** Creates sfc router.
11: * @returns router
14:  const router = Router();
17:  router.post("/calculate", requireFields("material", "operation"), async (req, res, next) => {
25:  router.post("/cycle-time", async (req, res, next) => {
33:  router.post("/engagement", async (req, res, next) => {
41:  router.post("/deflecti
... [+237 chars truncated]

### Assistant | 2026-06-21T00:12:29.093Z

[tool_use: Read]

### User | 2026-06-21T00:12:29.545Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\sfc.ts' was already read 11m ago in this session and is unchanged (mtime 1777032347157). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T00:12:30.064Z

[tool_use: Bash]

### User | 2026-06-21T00:12:34.685Z

[tool_result] src/api/calc.ts:76: * `calcApi.speedFeed` return below is preserved unchanged for existing callers.
src/api/calc.ts:109:export const calcApi = {
src/api/calc.ts:118:  // of recomputing it client-side. Consumed by SfcCalculatorPage in U-SFC-L2.
src/App.tsx:197:const SfcCalculatorPage = lazy(() => import('./pages/SfcCalculatorPage'));
src/App.tsx:386:              <Route path="speed-feed-calc" eleme
... [+123 chars truncated]

### Assistant | 2026-06-21T00:12:36.488Z

[tool_use: Read]

### User | 2026-06-21T00:12:37.519Z

[tool_result] 1	import { useState, useCallback, useMemo, useEffect } from "react";
2	import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
3	import OperationSelector from "../components/sfc/OperationSelector";
4	import SmartToolSelector from "../components/sfc/SmartToolSelector";
5	import SmartMachineSelector from "../components/sfc/SmartMachineSelector";
6	import ParameterPanel, { type S
... [+14740 chars truncated]

### Assistant | 2026-06-21T00:12:40.845Z

Now let me check the `useSfc` hook to see how `calcApi` is actually consumed, and verify the sfc.ts route file content via bash since the read-once guard blocked it.

### Assistant | 2026-06-21T00:12:43.067Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:12:43.361Z

[tool_use: Bash]

### User | 2026-06-21T00:12:47.978Z

[tool_result] src/hooks/useSfc.ts
     1	import { useCallback, useRef, useState } from "react";
     2	import { sfcApi } from "../api/sfc";
     3	import type { ApiError } from "../types/sfc";
     4	
     5	interface AsyncState<T> {
     6	  data: T | null;
     7	  loading: boolean;
     8	  error: string | null;
     9	}
    10	
    11	function useApiCall<TReq, TRes>(
    12	  apiFn: (params: TReq
... [+1952 chars truncated]

### User | 2026-06-21T00:12:48.049Z

[tool_result]      1	/**
     2	 * PRISM MCP Server — SFC (Speed & Feed Calculator) Routes
     3	 * Consolidates existing SFC endpoints from index.ts into a proper router
     4	 */
     5	import { Router } from "express";
     6	import { requireFields } from "../middleware/validation.js";
     7	import type { CallToolFn } from "./index.js";
     8	
     9	/** Creates sfc router.
    10	 * @param call
... [+2619 chars truncated]

### Assistant | 2026-06-21T00:12:51.164Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:12:52.241Z

[tool_use: Bash]

### User | 2026-06-21T00:12:55.194Z

[tool_result] src/api/sfc.ts
     1	import { getRequestHeaders } from "./client";
     2	import type {
     3	  SfcCalculateRequest, SfcCalculateResult,
     4	  CycleTimeRequest, CycleTimeResult,
     5	  EngagementRequest, EngagementResult,
     6	  DeflectionRequest, DeflectionResult,
     7	  PowerTorqueRequest, PowerTorqueResult,
     8	  SurfaceFinishRequest, SurfaceFinishResult,
     9	  ToolLife
... [+2126 chars truncated]

### User | 2026-06-21T00:12:56.157Z

[tool_result] 25:import { createSfcRouter } from "./sfc.js";
144:  app.use("/api/v1/sfc", createSfcRouter(callTool));

### Assistant | 2026-06-21T00:12:59.487Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:13:00.682Z

[tool_use: Bash]

### User | 2026-06-21T00:13:04.478Z

[tool_result] (Bash completed with no output)

### User | 2026-06-21T00:13:05.765Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-21T00:13:10.653Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:13:10.977Z

[tool_use: Bash]

### User | 2026-06-21T00:13:16.532Z

[tool_result] 144:  app.use("/api/v1/sfc", createSfcRouter(callTool));

### User | 2026-06-21T00:13:16.618Z

[tool_result] src/routes/openapi.ts:737:      "/validate/kienzle": {
src/routes/openapi.ts:740:      "/validate/taylor": {
src/routes/specialty.ts:206:  // /grinding/calculate -> MERGE grinding_force (force/power/thermal/mrr) +
src/routes/validate.ts:19:  router.post("/kienzle", async (req, res) => {
src/routes/validate.ts:23:  router.post("/taylor", async (req, res) => {

### Assistant | 2026-06-21T00:13:20.587Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:13:22.120Z

[tool_use: Bash]

### User | 2026-06-21T00:13:24.449Z

[tool_result] 56:import { createValidateRouter } from "./validate.js";
181:  app.use("/api/v1/validate", createValidateRouter(callTool));

### User | 2026-06-21T00:13:26.473Z

[tool_result] src/api/calculatorData.ts:2628:  const taylor = asRecord(raw.taylor);
src/api/calculatorData.ts:2638:    || safeNum(taylor?.C_carbide ?? taylor?.C, Number.NaN)
src/api/employeePortal.ts:79:  callAction<{ ok: boolean; calc: unknown }>('emp_calc_kienzle_forces', p);
src/api/pipeline.ts:27:  speedFeed: (input: PipelineInput) => post<PipelineResult>("/speed-feed", input),
src/api/speedfeed.ts:284:expo
... [+12764 chars truncated]

### Assistant | 2026-06-21T00:13:29.981Z

This is the critical finding. Now I have the full picture. Let me do one final check — confirm the `kienzle`, `taylor`, and `mrr` routes as targets for `calcApi` and the test coverage of the whitespace-only error edge case.

### Assistant | 2026-06-21T00:13:31.376Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:13:32.162Z

[tool_use: Bash]

### User | 2026-06-21T00:13:35.390Z

[tool_result] (Bash completed with no output)

### User | 2026-06-21T00:13:36.656Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-21T00:13:40.288Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:13:41.136Z

[tool_use: Bash]

### User | 2026-06-21T00:13:43.994Z

[tool_result] (Bash completed with no output)

### User | 2026-06-21T00:13:44.885Z

[tool_result] src/api/sfc.ts:17:  signal?: AbortSignal,
src/api/sfc.ts:23:    signal,
src/api/sfc.ts:35:  calculate: (params: SfcCalculateRequest, signal?: AbortSignal) =>
src/api/sfc.ts:36:    post<SfcCalculateRequest, Wrapped<SfcCalculateResult>>("/calculate", params, signal),
src/api/sfc.ts:38:  cycleTime: (params: CycleTimeRequest, signal?: AbortSignal) =>
src/api/sfc.ts:39:    post<CycleTimeRequest, Wrappe
... [+1014 chars truncated]

### Assistant | 2026-06-21T00:14:35.875Z

I now have everything needed for a complete, citation-anchored verdict. Here is the full review.

---

VERDICT: FAIL

summary: The `kienzle`, `taylor`, and `mrr` entries in `calcApi` POST to `/api/v1/sfc/kienzle`, `/api/v1/sfc/taylor`, and `/api/v1/sfc/mrr` respectively, but those three sub-routes do not exist in the SFC router — they are 404s at runtime. That is a silent regression introduced by this change. A separate but significant gap: `calcApi` and `sfcApi` are parallel clients for the same backend routes; the new `calcApi.calculate`, `cycleTime`, `engagement`, `deflection`, `powerTorque`, `surfaceFinish`, and `toolLife` entries duplicate the entire `sfcApi` surface (`H:/prism/mcp-server/web/src/api/sfc.ts:34-54`) which is what `useSfcCalculate` and all sibling hooks actually consume. The guard logic and test coverage are otherwise correct and well-structured.

---

findings:

- [P0] `H:/prism/mcp-server/web/src/api/calc.ts:112-114` -- `calcApi.kienzle`, `calcApi.taylor`, and `calcApi.mrr` post to `/api/v1/sfc/kienzle`, `/api/v1/sfc/taylor`, and `/api/v1/sfc/mrr`. Verified against `H:/prism/mcp-server/src/routes/sfc.ts:14-72`: the SFC router mounts exactly seven routes (`/calculate`, `/cycle-time`, `/engagement`, `/deflection`, `/power-torque`, `/surface-finish`, `/tool-life`). None of the three legacy routes exist. `H:/prism/mcp-server/src/routes/index.ts:181` mounts this router under `/api/v1/sfc`. The kienzle and taylor routes live at `/api/v1/validate/kienzle` and `/api/v1/validate/taylor` (`H:/prism/mcp-server/src/routes/validate.ts:19,23`), not under `/sfc`. No `/mrr` sub-route exists anywhere in the SFC surface. All three `calcApi` methods will 404 at runtime. The test file has zero tests for these three methods, so the tests do not detect this. -- Fix: either route `kienzle`/`taylor` to `/api/v1/validate/kienzle` and `/api/v1/validate/taylor` (their correct backend addresses), add `/mrr` to the SFC router if it is genuinely needed, or remove these thre
... [+6027 chars truncated]
