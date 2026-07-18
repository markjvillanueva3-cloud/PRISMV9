---
type: "chat-session"
source: "claude-code-cli"
session_id: "360ea971-de27-4678-9497-7a20405d3b93"
title: "Review a 3-file change adding sales-pipeline FE adapters (U-HOTEL-WIRE-PIPELINE)"
date: "2026-06-25"
first_ts: "2026-06-25T17:53:09.553Z"
last_ts: "2026-06-25T17:55:20.590Z"
cwd: "H:\\prism\\mcp-server"
messages: 42
user_msgs: 16
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--/360ea971-de27-4678-9497-7a20405d3b93/subagents/agent-a30beb1d3fae5739f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# Review a 3-file change adding sales-pipeline FE adapters (U-HOTEL-WIRE-PIPELINE)

> **claude-code-cli** | 2026-06-25 | 42 msgs (16 user / 26 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--/360ea971-de27-4678-9497-7a20405d3b93/subagents/agent-a30beb1d3fae5739f.jsonl`

## Transcript

### User | 2026-06-25T17:53:09.553Z

Review a 3-file change adding sales-pipeline FE adapters (U-HOTEL-WIRE-PIPELINE). Read all end-to-end:
1. `H:/prism/mcp-server/src/engines/ProspectiveCustomerEngine.ts` — NEW: a private static STAGE_PROBABILITY map (cold .05 / researched .10 / first_contact .20 / engaged .40 / quoted .65) + two methods after pipelineReport() (~line 300): `pipelineForecast()` returns {pipeline_value, conversion_rate, forecast_30d, forecast_90d, backlog_value}; `pipelineStages()` returns PipelineStage[] {stage,count,value,weighted_value,probability_pct} for the 5 open stages.
2. `H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts` — NEW actions prospect_pipeline_forecast + prospect_pipeline_stages (enum ~1027, cases ~5460), returning the engine result DIRECTLY (matching the sibling prospect_pipeline_report convention, NOT {success,data}).
3. `H:/prism/mcp-server/src/routes/erp.ts` — NEW GET /pipeline-forecast -> prospect_pipeline_forecast, GET /pipeline-stages -> prospect_pipeline_stages (~line 612), via rfqRoute.
4. `H:/prism/mcp-server/src/__tests__/ProspectiveCustomer.test.ts` — NEW describe (7 tests).

VERIFY (cite file:line):
1. **Shape match**: do pipelineForecast/pipelineStages return EXACTLY the fields SalesPipelinePage.tsx reads? Read the page's Forecast interface (~line 17: pipeline_value/conversion_rate/forecast_30d/forecast_90d/backlog_value) and PipelineStage interface (~line 9: stage/count/value/weighted_value/probability_pct). Flag any missing/extra/mismatched field.
2. **Envelope consistency (CRITICAL)**: the existing prospect_pipeline_report case returns the engine result DIRECTLY (result = engine.pipelineReport(), NOT wrapped in {success:true,data}). My 2 new cases follow that. But the ROUTE uses rfqRoute, whose unwrapEnvelope expects {type,text} -> JSON.parse -> reads .success===false / .data. If the dispatcher returns the bare object (not {success,data}), does rfqRoute's `r?.data ?? r` correctly fall back to the bare object? Trace: dispatcher returns b
... [+1131 chars truncated]

### Assistant | 2026-06-25T17:53:15.297Z

I'll review this 3-file (actually 4-file) change end to end. Let me start by reading all the relevant files.

### Assistant | 2026-06-25T17:53:15.753Z

[tool_use: Read]

### Assistant | 2026-06-25T17:53:16.083Z

[tool_use: Read]

### User | 2026-06-25T17:53:16.685Z

[tool_result] 1	/**
2	 * ProspectiveCustomerEngine — sales-pipeline prospect registry
3	 * (hotel iter21, 2026-05-24, U-PROSPECTIVE-CUSTOMER).
4	 *
5	 * Sales-side companion to CustomerKnowledgeEngine (existing-customer
6	 * intelligence). This engine tracks PROSPECTIVE customers — companies JM
7	 * Die does not yet do work for but could, with profiles tuned to JM Die's
8	 * actual capability stack (CNC mill, l
... [+17335 chars truncated]

### User | 2026-06-25T17:53:17.031Z

[tool_result] 1	/**
2	 * ProspectiveCustomer.test.ts — hotel iter21.
3	 * Real-behavior assertions: state-machine forward-only enforcement,
4	 * PII redaction, email content composition by work-type, seed catalog
5	 * validity with concrete content checks (no presence-only stubs).
6	 */
7	
8	import { describe, it, expect, beforeEach } from "vitest";
9	import { prospectiveCustomerEngine } from "../engines/Prospe
... [+23140 chars truncated]

### Assistant | 2026-06-25T17:53:25.224Z

This is a code review task (read-only by nature), not an edit/build task. Plan mode restricts me to read-only actions, which aligns perfectly with this review. I have read the engine and test files. Let me read the remaining files: the dispatcher, the route, and the FE page.

### Assistant | 2026-06-25T17:53:26.640Z

[tool_use: Read]

### Assistant | 2026-06-25T17:53:27.212Z

[tool_use: Read]

### User | 2026-06-25T17:53:27.590Z

[tool_result] 1000	  // ── BOM Explosion + Cost Rollup (G4 — hotel iter17) ──
1001	  "bom_explode",
1002	  "bom_cost_rollup",
1003	  "bom_cycle_check",
1004	  // ── Job Routing Templates (G7 — hotel iter18) ──
1005	  "routing_template_create",
1006	  "routing_template_get",
1007	  "routing_template_list",
1008	  "routing_template_instantiate",
1009	  // ── Vendor Quote → Purchase Order lifecycle (G3 — hotel ite
... [+1987 chars truncated]

### User | 2026-06-25T17:53:28.240Z

[tool_result] 560	  router.post("/quality-ncr-update", verifyToken, bizRoute(callTool, "quality_ncr_update"));
561	  router.get("/quality-kpis", verifyToken, bizGet(callTool, "quality_kpis"));
562	  router.post("/quality-calibration-add", verifyToken, bizRoute(callTool, "quality_calibration_add"));
563	  router.post("/quality-material-cert", verifyToken, bizRoute(callTool, "quality_material_cert"));
564	  route
... [+10372 chars truncated]

### Assistant | 2026-06-25T17:53:36.599Z

Now let me read the dispatcher case statements (~5460) and the `rfqRoute` helper definition, plus the FE page interfaces.

### Assistant | 2026-06-25T17:53:38.012Z

[tool_use: Read]

### Assistant | 2026-06-25T17:53:38.314Z

[tool_use: Read]

### User | 2026-06-25T17:53:38.978Z

[tool_result] 5430	          case "prospect_create": {
5431	            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
5432	            type Input = import("../../engines/ProspectiveCustomerEngine.js").ProspectiveCustomerInput;
5433	            result = prospectiveCustomerEngine.create(params as Input);
5434	            break;
5435	          }
5436	          ca
... [+4754 chars truncated]

### User | 2026-06-25T17:53:39.318Z

[tool_result] 1	/**
2	 * PRISM MCP Server — ERP & Business Operations Routes
3	 *
4	 * Comprehensive backend for all ERP pages:
5	 * Customers, EmployeeDirectory, Exports, FinancialAnalysis,
6	 * GeneralLedger, HRCompliance, OrderTracking, Purchasing,
7	 * QualityManagement, Inventory, Invoicing, Payroll, Scheduling,
8	 * MachineRates, Batch, Reporting, ActualCost, PurchaseOrders,
9	 * TimeClock, ToolUsage, Job
... [+5335 chars truncated]

### Assistant | 2026-06-25T17:53:44.967Z

Now let me read the rest of the `rfqRoute` helper (the `data: r?.data ?? r` fallback the task asks me to trace) and find/read the SalesPipelinePage FE interfaces.

### Assistant | 2026-06-25T17:53:45.934Z

[tool_use: Read]

### Assistant | 2026-06-25T17:53:46.214Z

[tool_use: Glob]

### User | 2026-06-25T17:53:46.836Z

[tool_result] 120	        // Surface the dispatcher's INNER `data` at the body's `data` (the records array / updated record),
121	        // NOT double-nested. Fall back to r itself for a bare-shape (defensive).
122	        res.json({ ok: true, data: r?.data ?? r });
123	      } catch (e: any) {
124	        res.status(500).json({ ok: false, error: e.message });
125	      }
126	    };
127	  router.post("/rfq-cre
... [+841 chars truncated]

### User | 2026-06-25T17:53:47.969Z

[tool_result] web\src\pages\SalesPipelinePage.tsx

### Assistant | 2026-06-25T17:53:51.827Z

I have the full route chain. Now let me read the FE page to verify the exact Forecast and PipelineStage interfaces and how it reads the response.

### Assistant | 2026-06-25T17:53:52.372Z

[tool_use: Read]

### User | 2026-06-25T17:53:53.284Z

[tool_result] 1	/**
2	 * BIZ-MS4 U-BIZ29: Sales Pipeline Dashboard
3	 * Weighted forecast, stage breakdown, conversion funnel.
4	 */
5	import { useEffect, useState } from 'react';
6	import { pipelineForecast, pipelineStages } from '../api/client';
7	import { PanelCard, StatusPill, SummaryTile, WorkspaceHero } from '../components/workspace/WorkspacePrimitives';
8	
9	interface PipelineStage {
10	  stage: string;

... [+3119 chars truncated]

### Assistant | 2026-06-25T17:53:58.865Z

I now have the full chain end to end. Let me verify the client.ts `pipelineForecast`/`pipelineStages` functions to confirm what shape they return (the FE reads `(r as any).data ?? (r as any).result`).

### Assistant | 2026-06-25T17:53:59.829Z

[tool_use: Grep]

### User | 2026-06-25T17:54:01.073Z

[tool_result] 612-export async function rfqUpdateStatus(rfqId: string, status: string): Promise<PrismResponse> {
613-  return request('POST', '/erp/rfq-status', { rfq_id: rfqId, status });
614-}
615:export async function pipelineForecast(): Promise<PrismResponse> {
616:  return request('GET', '/erp/pipeline-forecast');
617-}
618:export async function pipelineStages(): Promise<PrismResponse> {
619:  return reque
... [+209 chars truncated]

### Assistant | 2026-06-25T17:54:06.639Z

Let me confirm the `request` helper to verify what it returns (whether it returns the parsed body directly, so `(r as any).data` is the route's `data` field).

### Assistant | 2026-06-25T17:54:08.710Z

[tool_use: Grep]

### User | 2026-06-25T17:54:09.839Z

[tool_result] 55-  }
56-  return headers;
57-}
58-
59:async function request<T>(
60-  method: 'GET' | 'POST' | 'PATCH',
61-  path: string,
62-  body?: unknown,
63-): Promise<PrismResponse<T>> {
--
68-    fallbackMessage: 'PRISM request failed',
69-  });
70-}
71-
72:async function requestData<T>(
73-  method: 'GET' | 'POST' | 'PATCH',
74-  path: string,
75-  body?: unknown,
76-): Promise<DataResponse<T>> {
--
18
... [+1515 chars truncated]

### Assistant | 2026-06-25T17:54:16.177Z

Let me read the `request` helper body and the `parseResponse`/`fetchJson` it calls to confirm the FE receives the raw route body `{ok, data}` (so `r.data` is the route's `data` field = the bare engine object).

### Assistant | 2026-06-25T17:54:17.134Z

[tool_use: Read]

### User | 2026-06-25T17:54:18.071Z

[tool_result] 59	async function request<T>(
60	  method: 'GET' | 'POST' | 'PATCH',
61	  path: string,
62	  body?: unknown,
63	): Promise<PrismResponse<T>> {
64	  return fetchJson<PrismResponse<T>>(`${API_BASE}${path}`, {
65	    method,
66	    headers: getRequestHeaders(),
67	    body: body ? JSON.stringify(body) : undefined,
68	    fallbackMessage: 'PRISM request failed',

### Assistant | 2026-06-25T17:54:19.121Z

[tool_use: Grep]

### User | 2026-06-25T17:54:20.327Z

[tool_result] H:\prism\mcp-server\web\src\api\client.ts-65-    method,
web\src\api\client.ts-66-    headers: getRequestHeaders(),
web\src\api\client.ts-67-    body: body ? JSON.stringify(body) : undefined,
web\src\api\client.ts:68:    fallbackMessage: 'PRISM request failed',
H:\prism\mcp-server\web\src\api\client.ts-69-  });
H:\prism\mcp-server\web\src\api\client.ts-70-}
H:\prism\mcp-server\web\src\api\client.t
... [+1893 chars truncated]

### Assistant | 2026-06-25T17:54:26.165Z

`fetchJson<PrismResponse<T>>` returns the parsed JSON body, which is the route's `{ ok: true, data: <bareObj> }`. So the FE's `(r as any).data` is exactly the bare engine object. Let me confirm `fetchJson` returns the parsed body directly (and `PrismResponse` shape) to close the trace, then I can finalize.

### Assistant | 2026-06-25T17:54:27.905Z

[tool_use: Grep]

### User | 2026-06-25T17:54:28.961Z

[tool_result] H:\prism\mcp-server\web\src\api\billing.ts-1-import { ApiError, getRequestHeaders } from './client';
H:\prism\mcp-server\web\src\api\billing.ts-2-
H:\prism\mcp-server\web\src\api\billing.ts-3-/**
H:\prism\mcp-server\web\src\api\billing.ts-4- * Billing API client.
H:\prism\mcp-server\web\src\api\billing.ts-5- *
H:\prism\mcp-server\web\src\api\billing.ts-6- * Backend routes (mcp-server/src/routes/bi
... [+2985 chars truncated]

### Assistant | 2026-06-25T17:54:37.219Z

`fetchJson<T>` returns the parsed JSON body directly as `T`. So `request()` returns the route's raw body `{ ok: true, data: <bareEngineObj> }`. The FE reads `(r as any).data` → the bare engine object. The trace is fully confirmed end to end.

I have read all relevant files end to end:
- Engine (`ProspectiveCustomerEngine.ts`) — full file, both new methods + STAGE_PROBABILITY
- Test (`ProspectiveCustomer.test.ts`) — full file, the new describe block
- Dispatcher (`businessDispatcher.ts`) — enum entries 1027-1028 and cases 5462-5472
- Route (`erp.ts`) — `rfqRoute` helper + `unwrapEnvelope` + the 2 new routes 621-622
- Client (`client.ts` / `requestCore.ts` / `shopTypes.ts`) — full request chain
- FE page (`SalesPipelinePage.tsx`) — Forecast + PipelineStage interfaces + how it reads the response

I have everything needed. Since plan mode is active, I'll write my review verdict to the plan file, then deliver it as my final message.

### Assistant | 2026-06-25T17:54:47.593Z

[tool_use: Write]

### User | 2026-06-25T17:54:47.593Z

[tool_result] <tool_use_error>Error: No such tool available: Write. Write exists but is not enabled in this context. Use one of the available tools instead.</tool_use_error>

### Assistant | 2026-06-25T17:55:20.590Z

The Write tool isn't available in this context. That's fine — this is a code review and my return value IS the findings text below. I have completed the full read-only review.

---

VERDICT: PASS

summary: The two new engine methods (`pipelineForecast`, `pipelineStages`) return EXACTLY the fields `SalesPipelinePage.tsx` reads, the math is correct with concrete reference-value tests, the envelope trace is clean with no double-wrap or shape loss, and the dispatcher/route wiring is consistent with the sibling `prospect_pipeline_report` convention. The 7 new tests are real R9 tests that would fail if the probability weights or field mapping changed; no `.skip`/`.only`. Two cosmetic P2 notes only.

findings:
- none (no P0/P1)

What I verified (auditable):

1. **Shape match — EXACT.**
   - `pipelineForecast()` (`ProspectiveCustomerEngine.ts:325-352`) returns `{ pipeline_value, conversion_rate, forecast_30d, forecast_90d, backlog_value }` — matches the FE `Forecast` interface (`SalesPipelinePage.tsx:17-23`) field-for-field. No missing/extra/mismatched field.
   - `pipelineStages()` (`ProspectiveCustomerEngine.ts:360-379`) returns rows of `{ stage, count, value, weighted_value, probability_pct }` — matches the FE `PipelineStage` interface (`SalesPipelinePage.tsx:9-15`) exactly. (FE types `stage` as `string`; engine emits `ProspectStatus` — assignable, fine.)

2. **Envelope consistency — traced end to end, CONFIRMED no double-wrap / no shape loss.** Dispatcher returns the bare engine object (`businessDispatcher.ts:5465`, `:5471`), matching the sibling `prospect_pipeline_report` at `:5459`. Trace: bare obj → `prism_business` slimResponse wraps `{type,text:JSON.stringify(bareObj)}` → `rfqRoute` (`erp.ts:111-126`) calls `unwrapEnvelope` (`erp.ts:105-110`) which JSON.parses `.text` → `r = bareObj` (no `.success`, no `.data`) → `r.success === false` is `false` (skips 400) → `res.json({ ok:true, data: r?.data ?? r })`. Since `bareObj.data` is `undefined`, `data` = the bare forecas
... [+3774 chars truncated]
