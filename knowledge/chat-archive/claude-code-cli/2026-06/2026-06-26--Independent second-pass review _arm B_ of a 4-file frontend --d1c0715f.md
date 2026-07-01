---
type: "chat-session"
source: "claude-code-cli"
session_id: "d1c0715f-a8b4-48cf-9bb1-c3b6009bb9fc"
title: "Independent second-pass review (arm B) of a 4-file frontend fix in PRISM (H:/pri"
date: "2026-06-26"
first_ts: "2026-06-26T00:02:57.554Z"
last_ts: "2026-06-26T00:03:59.143Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/d1c0715f-a8b4-48cf-9bb1-c3b6009bb9fc/subagents/agent-ac9cb9b51bd68e4ed.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Independent second-pass review (arm B) of a 4-file frontend fix in PRISM (H:/pri

> **claude-code-cli** | 2026-06-26 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d1c0715f-a8b4-48cf-9bb1-c3b6009bb9fc/subagents/agent-ac9cb9b51bd68e4ed.jsonl`

## Transcript

### User | 2026-06-26T00:02:57.554Z

Independent second-pass review (arm B) of a 4-file frontend fix in PRISM (H:/prism). Do NOT assume the other reviewer caught everything. Weight toward silent breakage, regression risk, integration coupling, error-budget completeness, edge cases. Read each file END-TO-END. Grade PASS/FAIL with file:line citations.

FILES:
1. mcp-server/web/src/api/envelopeGuard.ts  (new exports: blockedEnvelopeMessage, assertNotBlocked)
2. mcp-server/web/src/api/sfc.ts  (post() now runs assertNoEnvelopeError then assertNotBlocked)
3. mcp-server/web/src/__tests__/sfc-api.test.ts  (new tests)
4. mcp-server/web/src/pages/SfcCalculatorPage.tsx  (Calculate disabled when !machine + hint)

WHAT IT FIXES: a backend `{ result: { blocked: true, reason } }` gate response (HTTP 200, no `error` key) from the SFC pre-machine-completeness-gate was passing through assertNoEnvelopeError and rendering as a SILENT BLANK panel on the /speed-feed-calc page. The fix surfaces it as a thrown ApiError so the page's error path lights up, and requires machine selection so the bad request is never sent.

SPECIFIC ADVERSARIAL CHECKS:
- Does assertNotBlocked iterate [payload, payload.result] correctly and ONLY when "result" in payload? Any way payload.result being a primitive (number/string) throws inside blockedEnvelopeMessage? (it guards typeof object — confirm).
- Could `assertNotBlocked` double-process and mask the `{error}` envelope path? Order: assertNoEnvelopeError runs first (throws on error), then assertNotBlocked. Confirm no interaction.
- Other consumers of envelopeGuard: does adding exports break anything? Does any OTHER api/*.ts client import from envelopeGuard and rely on its current surface? Grep for importers.
- The hook useSfc.ts: does the thrown ApiError land in the `error` state and clear `data`? Trace execute()'s catch.
- Page: with machine now required, does ANY existing test (CalculatorPage.*.test.tsx, sfc tests) assume Calculate works without a machine? Does SpeedFeedPage/CalculatorPage sha
... [+343 chars truncated]

### Assistant | 2026-06-26T00:03:00.310Z

I'll review this 4-file SFC frontend fix end-to-end, tracing every consumer and edge path. Let me start by reading all four files in parallel.

### Assistant | 2026-06-26T00:03:00.786Z

[tool_use: Read]

### Assistant | 2026-06-26T00:03:01.730Z

[tool_use: Read]

### User | 2026-06-26T00:03:01.808Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\envelopeGuard.ts' was already read 9s ago in this session and is unchanged (mtime 1782431412406). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-26T00:03:02.203Z

[tool_use: Read]

### Assistant | 2026-06-26T00:03:02.326Z

[tool_use: Read]

### User | 2026-06-26T00:03:02.399Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\sfc.ts' was already read 9s ago in this session and is unchanged (mtime 1782431447518). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-26T00:03:02.916Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\pages\SfcCalculatorPage.tsx' was already read 9s ago in this session and is unchanged (mtime 1782431893276). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-26T00:03:03.133Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\sfc-api.test.ts' was already read 9s ago in this session and is unchanged (mtime 1782431820391). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-26T00:03:07.608Z

The read-once guard says these files are in context, but I'm arm C starting fresh — the guard is mistaken about my session. Let me disable the cache and read them.

### Assistant | 2026-06-26T00:03:08.524Z

[tool_use: Bash]

### Assistant | 2026-06-26T00:03:09.214Z

[tool_use: Bash]

### User | 2026-06-26T00:03:13.134Z

[tool_result] /**
 * Envelope-error guard for PRISM API clients.
 *
 * The HTTP transport (raw `fetch` / `fetchJson`) only treats `!response.ok`
 * as an error. But a `prism_*` dispatcher can return `200 OK` with a body
 * `{ error: "..." }` (a handled failure). Rendering that body as success is the
 * #1 documented regression class in this galaxy -- the "silent-zero"
 * (frontend-app/CLAUDE.md sections 2 + 5: 
... [+4541 chars truncated]

### User | 2026-06-26T00:03:16.628Z

[tool_result] import { getRequestHeaders } from "./client";
import { ApiError } from "./requestCore";
import { assertNoEnvelopeError, assertNotBlocked } from "./envelopeGuard";
import type {
  SfcCalculateRequest, SfcCalculateResult,
  CycleTimeRequest, CycleTimeResult,
  EngagementRequest, EngagementResult,
  DeflectionRequest, DeflectionResult,
  PowerTorqueRequest, PowerTorqueResult,
  SurfaceFinish
... [+3392 chars truncated]

### Assistant | 2026-06-26T00:03:21.057Z

I notice an important discrepancy already. Let me read the other two files and verify the critical detail I just spotted in sfc.ts.

### Assistant | 2026-06-26T00:03:22.522Z

[tool_use: Bash]

### Assistant | 2026-06-26T00:03:23.610Z

[tool_use: Bash]

### User | 2026-06-26T00:03:26.044Z

[tool_result]      1	/**
     2	 * Tests for the LIVE SFC API client (src/api/sfc.ts -- consumed by hooks/useSfc.ts)
     3	 * and the shared envelope guard (src/api/envelopeGuard.ts).
     4	 *
     5	 * The load-bearing assertion is the SILENT-ZERO guard: a `200 OK` whose body is
     6	 * `{ error: "..." }` MUST reject (with the backend's real message), not resolve
     7	 * as success. That is the #1 regres
... [+13999 chars truncated]

### User | 2026-06-26T00:03:30.026Z

[tool_result]      1	import { useState, useCallback, useMemo, useEffect } from "react";
     2	import SfcGateNotice from "../components/sfc/SfcGateNotice";
     3	import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
     4	import OperationSelector from "../components/sfc/OperationSelector";
     5	import SmartToolSelector from "../components/sfc/SmartToolSelector";
     6	import Sma
... [+19620 chars truncated]

### Assistant | 2026-06-26T00:03:35.224Z

I have all four files. I spotted a critical issue immediately: sfc.ts imports `ApiError` from `./requestCore`, but envelopeGuard.ts imports `ApiError` from `./client`. The test mocks `../api/client`. Let me verify the `ApiError` identity chain — this is a classic silent-break vector (the `instanceof` check in the page and tests).

### Assistant | 2026-06-26T00:03:37.335Z

[tool_use: Bash]

### Assistant | 2026-06-26T00:03:39.055Z

[tool_use: Bash]

### User | 2026-06-26T00:03:41.629Z

[tool_result] === client.ts ApiError ===
20:  ApiError,
22:  toApiError,
26:  ApiError,
27:  describeApiError,
29:  isRetryableApiError,
30:  toApiError,
31:  type ApiErrorKind,
32:  type ApiErrorPresentation,
148:      throw new ApiError(response.status, readPayloadMessage(payload, 'Lathe result request failed'), {
159:    throw toApiError(error, 'Lathe result request failed');
277:      throw new ApiError(
28
... [+1726 chars truncated]

### User | 2026-06-26T00:03:45.056Z

[tool_result] === client.ts head ===
/**
 * PRISM API Client
 * Connects to F7 Bridge REST endpoints with API key authentication.
 * All responses follow the standard format:
 *   { result, safety: { score, warnings }, meta: { formula_used, uncertainty } }
 */

import type {
  DataResponse,
  InstantQuoteHistory,
  InstantQuoteStatus,
  InstantQuoteLeadTimeOption,
  InstantQuoteQuantityBreak,
  InstantQuoteResu
... [+2295 chars truncated]

### Assistant | 2026-06-26T00:03:51.672Z

Good — this resolves a key concern. `ApiError` is a single class defined in `requestCore.ts`. `client.ts` re-exports the *same* class (`export { ApiError ... } from './requestCore'`). So:
- `envelopeGuard.ts` imports `ApiError` from `./client` (re-export) 
- `sfc.ts` imports `ApiError` from `./requestCore` (origin)

Both resolve to the identical class object — no `instanceof` split-brain. The test's `vi.mock("../api/client", ... importOriginal ... { ...actual, getRequestHeaders })` preserves the real `ApiError` re-export, so `instanceof ApiError` holds. This is correct.

Now let me verify the `useSfc` hook's `execute()` catch path — does the thrown `ApiError` land in `error` state and clear `data`? And confirm `errorStatus`/`errorCode` wiring.

### Assistant | 2026-06-26T00:03:54.597Z

[tool_use: Bash]

### User | 2026-06-26T00:03:58.136Z

[tool_result]      1	import { useCallback, useRef, useState } from "react";
     2	import { sfcApi } from "../api/sfc";
     3	import type { ApiError } from "../types/sfc";
     4	
     5	interface AsyncState<T> {
     6	  data: T | null;
     7	  loading: boolean;
     8	  error: string | null;
     9	  /** HTTP status of the last failure (e.g. 403 = tier-gate denial). */
    10	  errorStatus: number 
... [+3047 chars truncated]

### Assistant | 2026-06-26T00:03:59.143Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
