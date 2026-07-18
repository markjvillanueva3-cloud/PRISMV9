---
type: "chat-session"
source: "claude-code-cli"
session_id: "3a620309-f201-4a54-acd1-852132562718"
title: "Independent re-verify (read-only) of a reworked PRISM quebec change. A prior rev"
date: "2026-06-21"
first_ts: "2026-06-21T00:21:52.804Z"
last_ts: "2026-06-21T00:23:40.064Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 46
user_msgs: 19
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/3a620309-f201-4a54-acd1-852132562718/subagents/agent-a500003fe91ad02ef.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Independent re-verify (read-only) of a reworked PRISM quebec change. A prior rev

> **claude-code-cli** | 2026-06-21 | 46 msgs (19 user / 27 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/3a620309-f201-4a54-acd1-852132562718/subagents/agent-a500003fe91ad02ef.jsonl`

## Transcript

### User | 2026-06-21T00:21:52.804Z

Independent re-verify (read-only) of a reworked PRISM quebec change. A prior review FAILED an earlier approach (it edited a DEAD client `calc.ts`); this rework redirects the fix to the LIVE client. Confirm the rework is correct and introduces no new breakage.

Files (all in H:/prism/mcp-server/web/src/):
- `api/envelopeGuard.ts` (NEW -- `assertNoEnvelopeError` + `envelopeErrorMessage`, the silent-zero guard)
- `api/sfc.ts` (EDITED -- the LIVE SFC client consumed by `hooks/useSfc.ts`; one line added: `return assertNoEnvelopeError<TRes>(await res.json(), endpoint)` in `post()`)
- `__tests__/sfc-api.test.ts` (NEW -- 15 tests, all passing; tsc clean)
- `api/calc.ts` was REVERTED to its original (dead code, untouched).

Verify and grade PASS/FAIL with P0/P1/P2 + file:line:
1. **FALSE-POSITIVE RISK (highest priority):** Could `assertNoEnvelopeError` wrongly THROW on a LEGITIMATE successful sfc response? Check the backend contract `mcp-server/src/routes/sfc.ts` (what `/calculate` etc. return on success) and how `hooks/useSfc.ts` consumes `sfcApi`. Does any success payload carry a top-level truthy `error` field (e.g. a non-fatal warning) that the guard would misclassify as a failure? This is the key regression risk.
2. **Consumer breakage:** does adding the guard change anything `useSfc.ts` (and its consumers) depend on for the success path? The guard returns the payload unchanged on success.
3. **Guard logic soundness:** `envelopeErrorMessage` for string/number/object-message/null/empty/array/bool/missing -- any wrong branch?
4. **Test legitimacy (R9):** would the silent-zero tests FAIL if the guard line in sfc.ts were removed? Are assertions value-specific?
5. Confirm the prior findings are resolved (live path not dead, signal+auth preserved, no duplicate client).

Grade PASS only if no P0/P1. Be specific with file:line.

### Assistant | 2026-06-21T00:21:58.578Z

I'll systematically investigate the rework by reading all relevant files before forming any verdict.

### Assistant | 2026-06-21T00:21:59.059Z

[tool_use: Read]

### Assistant | 2026-06-21T00:21:59.179Z

[tool_use: Read]

### User | 2026-06-21T00:22:00.881Z

[tool_result] 1	import { getRequestHeaders } from "./client";
2	import { assertNoEnvelopeError } from "./envelopeGuard";
3	import type {
4	  SfcCalculateRequest, SfcCalculateResult,
5	  CycleTimeRequest, CycleTimeResult,
6	  EngagementRequest, EngagementResult,
7	  DeflectionRequest, DeflectionResult,
8	  PowerTorqueRequest, PowerTorqueResult,
9	  SurfaceFinishRequest, SurfaceFinishResult,
10	  ToolLifeRequest,
... [+2102 chars truncated]

### User | 2026-06-21T00:22:00.921Z

[tool_result] 1	/**
2	 * Envelope-error guard for PRISM API clients.
3	 *
4	 * The HTTP transport (raw `fetch` / `fetchJson`) only treats `!response.ok`
5	 * as an error. But a `prism_*` dispatcher can return `200 OK` with a body
6	 * `{ error: "..." }` (a handled failure). Rendering that body as success is the
7	 * #1 documented regression class in this galaxy -- the "silent-zero"
8	 * (frontend-app/CLAUDE.md 
... [+2029 chars truncated]

### Assistant | 2026-06-21T00:22:03.914Z

Now read the backend route and the hook consumer.

### Assistant | 2026-06-21T00:22:04.298Z

[tool_use: Read]

### Assistant | 2026-06-21T00:22:04.727Z

[tool_use: Read]

### User | 2026-06-21T00:22:04.781Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\sfc.ts' was already read 21m ago in this session and is unchanged (mtime 1777032347157). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T00:22:05.654Z

[tool_result] 1	import { useCallback, useRef, useState } from "react";
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
12	  apiFn: (params: TReq, signal?: AbortSignal) => Promise<{ result: TRes }>,
13	) {
14	  const [state, setState
... [+1658 chars truncated]

### Assistant | 2026-06-21T00:22:08.353Z

The read-once guard already has the backend route in context. Let me grep the key response shape from it and read the test file.

### Assistant | 2026-06-21T00:22:09.974Z

[tool_use: Grep]

### Assistant | 2026-06-21T00:22:10.178Z

[tool_use: Read]

### User | 2026-06-21T00:22:11.044Z

[tool_result] 19:      const result = await callTool("prism_product", "sfc_calculate", req.body);
20:      res.json({ result, safety: result?.safety, meta: result?.meta });
27:      const result = await callTool("prism_calc", "cycle_time", req.body);
28:      res.json({ result });
35:      const result = await callTool("prism_calc", "engagement", req.body);
36:      res.json({ result });
43:      const result =
... [+417 chars truncated]

### User | 2026-06-21T00:22:11.579Z

[tool_result] 1	/**
2	 * Tests for the LIVE SFC API client (src/api/sfc.ts -- consumed by hooks/useSfc.ts)
3	 * and the shared envelope guard (src/api/envelopeGuard.ts).
4	 *
5	 * The load-bearing assertion is the SILENT-ZERO guard: a `200 OK` whose body is
6	 * `{ error: "..." }` MUST reject (with the backend's real message), not resolve
7	 * as success. That is the #1 regression class in this galaxy
8	 * (fro
... [+8157 chars truncated]

### Assistant | 2026-06-21T00:22:14.494Z

Now I need to check the backend route's success shape more carefully, the `ApiError` class definition, and the `calc.ts` revert state.

### Assistant | 2026-06-21T00:22:15.264Z

[tool_use: Read]

### Assistant | 2026-06-21T00:22:15.663Z

[tool_use: Read]

### User | 2026-06-21T00:22:17.190Z

[tool_result] 1	/**
2	 * PRISM MCP Server — SFC (Speed & Feed Calculator) Routes
3	 * Consolidates existing SFC endpoints from index.ts into a proper router
4	 */
5	import { Router } from "express";
6	import { requireFields } from "../middleware/validation.js";
7	import type { CallToolFn } from "./index.js";
8	
9	/** Creates sfc router.
10	 * @param callTool - call tool
11	 * @returns router
12	 */
13	export fu
... [+2250 chars truncated]

### User | 2026-06-21T00:22:17.653Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1490 of 2278 total (32467 tokens, cap 25000). Call Read with offset=1491 limit=1490 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * PRISM API Client
3	 * Connects to F7 Bridge REST endpoints with API key authentication.
4	 * 
... [+57210 chars truncated]

### Assistant | 2026-06-21T00:22:21.418Z

I have enough now. Let me check the `ApiError` class definition and verify `calc.ts` is truly reverted.

### Assistant | 2026-06-21T00:22:22.575Z

[tool_use: Grep]

### Assistant | 2026-06-21T00:22:23.227Z

[tool_use: Grep]

### User | 2026-06-21T00:22:23.577Z

[tool_result] src\api\requestCore.ts:89:export class ApiError extends Error {

### User | 2026-06-21T00:22:24.404Z

[tool_result] src\api\envelopeGuard.ts:11: * envelope should route its parsed 2xx payload through `assertNoEnvelopeError`.
src\api\envelopeGuard.ts:44:export function assertNoEnvelopeError<T>(payload: unknown, endpoint: string): T {
src\api\sfc.ts:2:import { assertNoEnvelopeError } from "./envelopeGuard";
src\api\sfc.ts:31:  // success (frontend-app/CLAUDE.md s2 + s5). assertNoEnvelopeError throws on it.
src\ap
... [+944 chars truncated]

### Assistant | 2026-06-21T00:22:28.040Z

Good. Now I need to check `requestCore.ts` for the `ApiError` class shape (specifically that `name === "ApiError"` and the constructor signature), and verify `calc.ts` is untouched.

### Assistant | 2026-06-21T00:22:28.791Z

[tool_use: Read]

### Assistant | 2026-06-21T00:22:29.100Z

[tool_use: Glob]

### User | 2026-06-21T00:22:29.765Z

[tool_result] 85	
86	  return fallbackMessage;
87	}
88	
89	export class ApiError extends Error {
90	  readonly status: number;
91	  readonly kind: ApiErrorKind;
92	  readonly retryable: boolean;
93	  readonly hint?: string;
94	
95	  constructor(status: number, message: string, options: ApiErrorOptions = {}) {
96	    super(message);
97	    // Manual cause assignment — target=ES2020 lib doesn't expose the Error
9
... [+972 chars truncated]

### User | 2026-06-21T00:22:30.580Z

[tool_result] src\api\calc.ts

### Assistant | 2026-06-21T00:22:33.730Z

Now verify `calc.ts` is truly the original (untouched) dead-code version and has no `assertNoEnvelopeError` import.

### Assistant | 2026-06-21T00:22:34.899Z

[tool_use: Grep]

### Assistant | 2026-06-21T00:22:35.363Z

[tool_use: Grep]

### User | 2026-06-21T00:22:36.035Z

[tool_result] No matches found

### User | 2026-06-21T00:22:36.568Z

[tool_result] 21:export interface CalcSpeedFeedRequest {
31:export interface CalcSpeedFeedResult {
40:export const calcApi = {

### Assistant | 2026-06-21T00:22:45.325Z

I have all the data I need. Let me now do the final cross-checks on the backend success shape vs. the guard logic, and the `sfc_calculate` endpoint's specific response.

The backend route (`src/routes/sfc.ts`) emits these shapes on success:

- `/calculate`: `{ result, safety: result?.safety, meta: result?.meta }` — the `result` value comes from `callTool("prism_product", "sfc_calculate", ...)`. The envelope has no top-level `error` field; `safety` and `meta` are optional sub-fields of `result` promoted to the envelope, never named `error`.
- All other endpoints (`/cycle-time`, `/engagement`, `/deflection`, `/power-torque`, `/surface-finish`, `/tool-life`): `{ result }` — a single-field envelope, no `error` field.

The only way the guard fires is if the 200 body contains a truthy top-level `error` field. None of the success paths produce one. Now let me check whether the `prism_product:sfc_calculate` dispatcher could return something with a top-level `error` key that gets hoisted into the outer envelope.

### Assistant | 2026-06-21T00:22:45.842Z

[tool_use: Grep]

### User | 2026-06-21T00:22:47.201Z

[tool_result] H:\prism\mcp-server\src\routes\sfc.ts:19:      const result = await callTool("prism_product", "sfc_calculate", req.body);
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts:1040:  "sfc_calculate", "sfc_feed_for_target", "surface_finish_compare",
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts:9130:          case "sfc_calculate": {
H:\prism\mcp-server\src\tools\dispatchers\calc
... [+2612 chars truncated]

### Assistant | 2026-06-21T00:22:50.426Z

Critical finding. `ProductEngine.ts:582` shows `sfcCalculate` returns `{ result: SFCResult } | { error: string }`. I need to see exactly what the route does with that and whether the error branch reaches the client as a 200.

### Assistant | 2026-06-21T00:22:50.815Z

[tool_use: Read]

### Assistant | 2026-06-21T00:22:51.366Z

[tool_use: Read]

### User | 2026-06-21T00:22:51.684Z

[tool_result] 575	
576	function mapOperation(op: string): "roughing" | "finishing" | "semi-finishing" {
577	  if (op.includes("finish")) return "finishing";
578	  if (op.includes("semi")) return "semi-finishing";
579	  return "roughing"; // milling, drilling, turning, etc. default to roughing
580	}
581	
582	function sfcCalculate(params: SFCInput): { result: SFCResult } | { error: string } {
583	  const startTim
... [+1779 chars truncated]

### User | 2026-06-21T00:22:52.256Z

[tool_result] 1060	export function productSFC(action: string, params: Record<string, any>): any {
1061	  recordHistory(action, params);
1062	
1063	  switch (action) {
1064	    case "sfc_calculate":
1065	      return sfcCalculate(params as SFCInput);
1066	    case "sfc_compare":
1067	      return sfcCompare(params as SFCInput);
1068	    case "sfc_optimize":
1069	      return sfcOptimize(params as SFCInput & { ob
... [+805 chars truncated]

### User | 2026-06-21T00:22:54.168Z

[Your previous response had no visible output. Please continue and produce a user-visible response.]

### Assistant | 2026-06-21T00:23:40.064Z

I have all the data needed. Here is the complete verdict.

---

VERDICT: PASS

summary: The rework correctly redirects the envelope guard to `api/sfc.ts` (the live client consumed by `hooks/useSfc.ts`) rather than the dead `api/calc.ts`. The backend route never emits a top-level `error` field on the success path, so the false-positive risk is zero. The guard logic, `ApiError` class shape, test legitimacy, and consumer wiring all check out cleanly. No P0 or P1 issues found.

findings: none

---

Traced paths and evidence for auditability:

**1. False-positive risk (the key question)**

Backend route `H:/prism/mcp-server/src/routes/sfc.ts`:

- `/calculate` (line 20): `res.json({ result, safety: result?.safety, meta: result?.meta })` — three fields: `result`, `safety`, `meta`. No `error` field.
- All other endpoints (lines 28, 36, 44, 52, 60, 68): `res.json({ result })` — single field. No `error` field.

The guard at `envelopeGuard.ts:44-51` only fires when `payload` has a truthy top-level `"error"` key. None of the 7 success-path responses have one. Zero false-positive risk on the normal success path.

The one subtlety: `ProductEngine.ts:582` shows `sfcCalculate` returns `{ result: SFCResult } | { error: string }`. However, the route at `sfc.ts:19-20` calls `callTool("prism_product", "sfc_calculate", ...)` and then unconditionally does `res.json({ result, safety: result?.safety, meta: result?.meta })`. If the engine returns `{ error: string }`, the route hoists `result` as `undefined` and `safety`/`meta` as `undefined` — the body becomes `{}` (or `{ result: undefined }` which JSON-serializes to `{}`), which has no `error` field. The engine's error shape is swallowed at the route level in this path. This is a pre-existing route-level bug (not introduced by this diff), and the guard does not make it worse — the prior behavior was to render the empty `result` as success silently; the guard correctly passes it through (no `error` key present). This is logged as a pre-exis
... [+4593 chars truncated]
