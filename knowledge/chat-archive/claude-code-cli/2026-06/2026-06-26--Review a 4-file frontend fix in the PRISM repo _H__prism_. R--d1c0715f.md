---
type: "chat-session"
source: "claude-code-cli"
session_id: "d1c0715f-a8b4-48cf-9bb1-c3b6009bb9fc"
title: "Review a 4-file frontend fix in the PRISM repo (H:/prism). Read each file END-TO"
date: "2026-06-26"
first_ts: "2026-06-26T00:02:48.413Z"
last_ts: "2026-06-26T00:03:51.457Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 12
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/d1c0715f-a8b4-48cf-9bb1-c3b6009bb9fc/subagents/agent-a7c993c03259bd618.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review a 4-file frontend fix in the PRISM repo (H:/prism). Read each file END-TO

> **claude-code-cli** | 2026-06-26 | 28 msgs (12 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d1c0715f-a8b4-48cf-9bb1-c3b6009bb9fc/subagents/agent-a7c993c03259bd618.jsonl`

## Transcript

### User | 2026-06-26T00:02:48.413Z

Review a 4-file frontend fix in the PRISM repo (H:/prism). Read each file END-TO-END and grade PASS/FAIL with P0/P1/P2 findings + file:line citations.

CONTEXT / the defect being fixed:
The SFC web calculator (`/speed-feed-calc`, SfcCalculatorPage) could render a SILENT BLANK result panel. Root cause: the backend `pre-machine-completeness-gate` returns HTTP 200 with body `{ result: { blocked: true, blocker: "pre-machine-completeness-gate", reason: "INCOMPLETE MACHINE DATA: ..." } }` (NO `error` key) when `sfc_calculate` is called without machine spindle data. The frontend's `assertNoEnvelopeError` only catches the `{error}` envelope, so the blocked body passed through into the hook's `data` and rendered as blank/undefined fields (the documented "silent-zero" class, frontend-app/CLAUDE.md s2+s5). Verified live on :3100. All 15 machines in web/src/data/machines.ts have spindle data, so a *selected* machine is always complete; the only way to hit the block from SfcCalculatorPage is machine=null (the page initialized machine to null and did NOT require it before Calculate).

THE FIX (4 files):
1. `mcp-server/web/src/api/envelopeGuard.ts` — added `blockedEnvelopeMessage(raw)` + `assertNotBlocked<T>(payload, endpoint)` (sibling of assertNoEnvelopeError; checks payload AND payload.result for blocked:true; throws ApiError(200, reason, {kind,retryable,code:blocker})).
2. `mcp-server/web/src/api/sfc.ts` — the shared `post()` now calls assertNoEnvelopeError THEN assertNotBlocked on the parsed body.
3. `mcp-server/web/src/__tests__/sfc-api.test.ts` — added blocked integration tests + blockedEnvelopeMessage + assertNotBlocked unit suites (27 tests pass).
4. `mcp-server/web/src/pages/SfcCalculatorPage.tsx` — Calculate button now also disabled when !machine, with a reason hint.

VERIFY:
- Correctness: does assertNotBlocked correctly detect both nesting levels? Does `blocked !== true` (strict) avoid false positives on falsy/truthy-non-bool? Is the `post()` ordering safe (both guard
... [+723 chars truncated]

### Assistant | 2026-06-26T00:02:51.735Z

I'll review the 4-file SFC frontend fix. Let me start by reading all the relevant files end-to-end.

### Assistant | 2026-06-26T00:02:52.219Z

[tool_use: Read]

### Assistant | 2026-06-26T00:02:52.725Z

[tool_use: Read]

### User | 2026-06-26T00:02:53.053Z

[tool_result] 1	/**
2	 * Envelope-error guard for PRISM API clients.
3	 *
4	 * The HTTP transport (raw `fetch` / `fetchJson`) only treats `!response.ok`
5	 * as an error. But a `prism_*` dispatcher can return `200 OK` with a body
6	 * `{ error: "..." }` (a handled failure). Rendering that body as success is the
7	 * #1 documented regression class in this galaxy -- the "silent-zero"
8	 * (frontend-app/CLAUDE.md 
... [+4846 chars truncated]

### Assistant | 2026-06-26T00:02:53.154Z

[tool_use: Read]

### Assistant | 2026-06-26T00:02:53.623Z

[tool_use: Read]

### User | 2026-06-26T00:02:53.689Z

[tool_result] 1	import { getRequestHeaders } from "./client";
2	import { ApiError } from "./requestCore";
3	import { assertNoEnvelopeError, assertNotBlocked } from "./envelopeGuard";
4	import type {
5	  SfcCalculateRequest, SfcCalculateResult,
6	  CycleTimeRequest, CycleTimeResult,
7	  EngagementRequest, EngagementResult,
8	  DeflectionRequest, DeflectionResult,
9	  PowerTorqueRequest, PowerTorqueResult,
10	  S
... [+3554 chars truncated]

### User | 2026-06-26T00:02:54.805Z

[tool_result] 1	import { useState, useCallback, useMemo, useEffect } from "react";
2	import SfcGateNotice from "../components/sfc/SfcGateNotice";
3	import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
4	import OperationSelector from "../components/sfc/OperationSelector";
5	import SmartToolSelector from "../components/sfc/SmartToolSelector";
6	import SmartMachineSelector from "../componen
... [+17798 chars truncated]

### User | 2026-06-26T00:02:54.867Z

[tool_result] 1	/**
2	 * Tests for the LIVE SFC API client (src/api/sfc.ts -- consumed by hooks/useSfc.ts)
3	 * and the shared envelope guard (src/api/envelopeGuard.ts).
4	 *
5	 * The load-bearing assertion is the SILENT-ZERO guard: a `200 OK` whose body is
6	 * `{ error: "..." }` MUST reject (with the backend's real message), not resolve
7	 * as success. That is the #1 regression class in this galaxy
8	 * (fro
... [+13164 chars truncated]

### Assistant | 2026-06-26T00:02:59.112Z

Now let me verify the load-bearing dependencies: the `ApiError` constructor signature (does it accept `code` in its options?), and the `useSfc` hook's error path. Let me also check `buildSfcCalcRequest` and the `client`/`requestCore` exports.

### Assistant | 2026-06-26T00:02:59.589Z

[tool_use: Read]

### Assistant | 2026-06-26T00:03:00.095Z

[tool_use: Read]

### Assistant | 2026-06-26T00:03:00.568Z

[tool_use: Read]

### Assistant | 2026-06-26T00:03:00.997Z

[tool_use: Read]

### User | 2026-06-26T00:03:01.489Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1441 of 2756 total (40614 tokens, cap 25000). Call Read with offset=1442 limit=1441 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * PRISM API Client
3	 * Connects to F7 Bridge REST endpoints with API key authentication.
4	 * 
... [+55989 chars truncated]

### User | 2026-06-26T00:03:01.562Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\hooks\useSfc.ts' was already read 16m ago in this session and is unchanged (mtime 1782138387966). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-26T00:03:01.815Z

[tool_result] 1	export type ApiErrorKind = 'http' | 'timeout' | 'offline' | 'network' | 'parse' | 'unknown' | 'auth';
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
14	  cause?: unknown;
15	  /** Machine-readable backend error c
... [+10613 chars truncated]

### User | 2026-06-26T00:03:02.171Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\sfc\buildSfcRequest.ts' was already read 17m ago in this session and is unchanged (mtime 1782355501249). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-26T00:03:09.524Z

I've confirmed the `ApiError` constructor accepts `code` in its options bag (requestCore.ts:99-113, with `code` at line 112) and exposes it as a readonly property (requestCore.ts:97). The hook and buildSfcRequest were read earlier this session — let me grep their key parts to confirm the error path and the machine-omission behavior, since they're load-bearing for my verdict.

### Assistant | 2026-06-26T00:03:11.012Z

[tool_use: Grep]

### Assistant | 2026-06-26T00:03:11.999Z

[tool_use: Grep]

### User | 2026-06-26T00:03:12.587Z

[tool_result] 3:import type { ApiError } from "../types/sfc";
8:  error: string | null;
10:  errorStatus: number | null;
12:  errorCode: string | null;
18:  const [state, setState] = useState<AsyncState<TRes>>({ data: null, loading: false, error: null, errorStatus: null, errorCode: null });
27:      setState({ data: null, loading: true, error: null, errorStatus: null, errorCode: null });
31:          setState({
... [+554 chars truncated]

### User | 2026-06-26T00:03:13.858Z

[tool_result] 4:import type { MachineEntry } from "../../data/machines";
10: * Includes the selected machine's spindle ceiling (`spindleMaxRpm` -> `machine_max_rpm`) and
11: * power (`spindlePowerKw` -> `machine_power_kw`) so the backend's rpm/power clamp actually fires.
12: * Previously SfcCalculatorPage collected a machine but DISCARDED its limits, so a high-Vc material
17: * guard is `if (params.machine_max_
... [+441 chars truncated]

### Assistant | 2026-06-26T00:03:18.126Z

I now have everything needed to verify the full chain. Let me confirm the hook's error-extraction lines (status/code at 40-46) to be precise about traceability.

### Assistant | 2026-06-26T00:03:19.110Z

[tool_use: Read]

### User | 2026-06-26T00:03:20.047Z

[tool_result] 34	      } catch (e: unknown) {
35	        if ((e as Error).name === "AbortError") return null;
36	        const msg = (e as ApiError).message || "Calculation failed";
37	        // Carry the HTTP status + machine code (sfc.ts throws ApiError) so the
38	        // page can distinguish a 403 daily-cap (TIER_LIMIT) from an admin revoke
39	        // (ENTITLEMENT_REVOKED) and show the right prompt, n
... [+453 chars truncated]

### Assistant | 2026-06-26T00:03:51.457Z

I have verified the complete chain end-to-end. Let me write the verdict.

---

VERDICT: PASS

summary: The 4-file fix correctly closes the silent-blank-result class for the SFC blocked-gate envelope. `assertNotBlocked` detects both nesting levels (top-level and `.result`), uses strict `blocked !== true` to avoid false positives, runs after `assertNoEnvelopeError` without short-circuiting it, and threads the `blocker` code into a real `ApiError.code` property that exists on the class and is read by the consuming hook. Tests verify intent (would fail on revert) with no stubs, and the page gating matches the backend's hard requirement. One P2 (cosmetic test-naming/coverage gap) noted; nothing blocks merge.

findings:
- [P2] `mcp-server/web/src/__tests__/sfc-api.test.ts:128` -- the test titled "does NOT reject when blocked is falsy/absent" only exercises `blocked: false`; it does not also cover the *absent* case at the integration (sfcApi) level. The absent-key path is covered at the unit level (`assertNotBlocked` line 242, `{ result: { x: 1 } }`) and `blockedEnvelopeMessage` line 213, so the behavior IS verified -- the title just overclaims relative to the single integration assertion. Cosmetic; no correctness gap. Fix: either add a second `fetchMock` case with no `blocked` key in the integration test, or narrow the title to "...when blocked is false".

What I verified (audit trail for the PASS):

1. Correctness of `assertNotBlocked` (envelopeGuard.ts:90-102) -- builds `candidates = [payload]` then pushes `payload.result` only when payload is a non-null object with a `result` key (line 92). Iterates both, throws on the first real block. Both nesting levels (top-level `{blocked:true}` and `{result:{blocked:true}}`) are detected. Confirmed by tests at lines 228-239.

2. Strict `blocked !== true` (envelopeGuard.ts:73) -- `blockedEnvelopeMessage` returns null unless `o.blocked === true` exactly. `blocked:false`, `"true"`, `1` all pass through (verified by tests lines 209-2
... [+3624 chars truncated]
