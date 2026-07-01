---
type: "chat-session"
source: "claude-code-cli"
session_id: "360ea971-de27-4678-9497-7a20405d3b93"
title: "Review a focused change to `H:/prism/mcp-server/src/routes/erp.ts`: a new \"Sales"
date: "2026-06-25"
first_ts: "2026-06-25T17:12:31.247Z"
last_ts: "2026-06-25T17:15:15.393Z"
cwd: "H:\\prism\\mcp-server"
messages: 56
user_msgs: 23
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--/360ea971-de27-4678-9497-7a20405d3b93/subagents/agent-af81b648a03824520.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# Review a focused change to `H:/prism/mcp-server/src/routes/erp.ts`: a new "Sales

> **claude-code-cli** | 2026-06-25 | 56 msgs (23 user / 33 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--/360ea971-de27-4678-9497-7a20405d3b93/subagents/agent-af81b648a03824520.jsonl`

## Transcript

### User | 2026-06-25T17:12:31.247Z

Review a focused change to `H:/prism/mcp-server/src/routes/erp.ts`: a new "Sales pipeline + Vendor scorecard + Root-cause" block of 6 routes inserted right after the customer routes (~line 598, before "Integration / Export"). Read lines 595-625 end-to-end.

New routes (all reuse the in-file `rfqRoute(action, getParams?)` helper which unwraps the prism_business {type,text} slimResponse envelope):
- GET /pipeline-forecast -> prospect_pipeline_report, {} 
- GET /pipeline-stages -> prospect_pipeline_report, {}  (same action; FE reads different facets of the one report object)
- GET /vendor-scorecard/:vendor_id -> vendor_compute_scorecard, {vendor_id: req.params.vendor_id}
- GET /vendor-list -> vendor_list_all, {}
- GET /root-cause-incidents -> root_cause_list, {status,severity,source from req.query}
- POST /root-cause-analysis -> nc_record_root_cause (FE posts {incident_id, ...analysis})

VERIFY (cite file:line):
1. Every action EXISTS in businessDispatcher.ts: prospect_pipeline_report, vendor_compute_scorecard, vendor_list_all, root_cause_list, nc_record_root_cause. grep each `case`.
2. FE client.ts paths/params match EXACTLY: pipelineForecast/pipelineStages (GET, no body), vendorScorecard(vendorId) -> /vendor-scorecard/<id>, vendorList() -> GET, rootCauseIncidents -> GET /root-cause-incidents?<qs>, rootCauseAnalysis(incidentId, analysis) -> POST {incident_id, ...analysis}.
3. **vendor-scorecard param**: route forwards {vendor_id}. Does vendor_compute_scorecard -> VendorPerformanceTrackerEngine.computeScorecard expect `vendor_id`? Read the method signature. If it expects `vendorId` or another field, flag mismatch.
4. **root-cause-analysis**: route forwards the raw body {incident_id, ...analysis} to nc_record_root_cause -> recordRootCause. Read recordRootCause's expected params — does it take incident_id + a root-cause field? Flag if the FE's `analysis` fields don't map to what recordRootCause needs (this is the highest-risk row — same shape-mismatch class a prior revie
... [+576 chars truncated]

### Assistant | 2026-06-25T17:12:34.840Z

I'll review this change systematically. Let me start by reading the target routes and the helper, then verify each claim against the actual code.

### Assistant | 2026-06-25T17:12:36.129Z

[tool_use: Read]

### User | 2026-06-25T17:12:37.085Z

[tool_result] 560	  router.post("/quality-ncr-update", verifyToken, bizRoute(callTool, "quality_ncr_update"));
561	  router.get("/quality-kpis", verifyToken, bizGet(callTool, "quality_kpis"));
562	  router.post("/quality-calibration-add", verifyToken, bizRoute(callTool, "quality_calibration_add"));
563	  router.post("/quality-material-cert", verifyToken, bizRoute(callTool, "quality_material_cert"));
564	  route
... [+10205 chars truncated]

### Assistant | 2026-06-25T17:12:42.879Z

I'll review this change. I'm a read-only reviewer, so I'll investigate and report rather than edit. Note: I see plan mode is active, but my task is a read-only code review that produces a verdict — I won't make any code edits. Let me investigate each claim.

I've already read the routes block (lines 595-625). Now let me verify the helper functions and the actions in the dispatcher and FE client in parallel.

### Assistant | 2026-06-25T17:12:43.850Z

[tool_use: Read]

### User | 2026-06-25T17:12:44.818Z

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

### Assistant | 2026-06-25T17:12:45.273Z

[tool_use: Grep]

### User | 2026-06-25T17:12:46.408Z

[tool_result] 1026:  "prospect_pipeline_report",
1483:  "nc_record_root_cause",
1490:  "root_cause_list",
1509:  "vendor_compute_scorecard",
1510:  "vendor_list_all",
5454:          case "prospect_pipeline_report": {
7481:          case "nc_record_root_cause": {
7511:          case "root_cause_list": {
7613:          case "vendor_compute_scorecard": {
7618:          case "vendor_list_all": {

### Assistant | 2026-06-25T17:12:53.616Z

All five actions exist in the dispatcher (z.enum + case). Let me read the rest of the rfqRoute helper, the dispatcher cases for each action, and the engine method signatures in parallel.

### Assistant | 2026-06-25T17:12:55.035Z

[tool_use: Read]

### User | 2026-06-25T17:12:55.962Z

[tool_result] 120	        // Surface the dispatcher's INNER `data` at the body's `data` (the records array / updated record),
121	        // NOT double-nested. Fall back to r itself for a bare-shape (defensive).
122	        res.json({ ok: true, data: r?.data ?? r });
123	      } catch (e: any) {
124	        res.status(500).json({ ok: false, error: e.message });
125	      }
126	    };
127	  router.post("/rfq-cre
... [+2829 chars truncated]

### Assistant | 2026-06-25T17:12:55.970Z

[tool_use: Read]

### User | 2026-06-25T17:12:56.938Z

[tool_result] 5450	            const p = params as { id: string; new_status: Status };
5451	            result = prospectiveCustomerEngine.advanceStatus(p.id, p.new_status);
5452	            break;
5453	          }
5454	          case "prospect_pipeline_report": {
5455	            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
5456	            result = prospect
... [+1428 chars truncated]

### Assistant | 2026-06-25T17:12:56.945Z

[tool_use: Read]

### Assistant | 2026-06-25T17:12:57.404Z

[tool_use: Read]

### User | 2026-06-25T17:12:58.013Z

[tool_result] 7475	          }
7476	          case "nc_record_containment": {
7477	            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
7478	            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.recordContainment(params as any) };
7479	            break;
7480	          }
7481	          case "nc_rec
... [+3631 chars truncated]

### User | 2026-06-25T17:12:58.441Z

[tool_result] 7605	            break;
7606	          }
7607	          // ─── HOTEL/U-VENDOR-PERFORMANCE-TRACKER — ISO §8.4 ───────────────
7608	          case "vendor_record_po": {
7609	            const { vendorPerformanceTrackerEngine } = await import("../../engines/VendorPerformanceTrackerEngine.js");
7610	            result = { success: true, data: vendorPerformanceTrackerEngine.recordPO(params as any) };
7
... [+1435 chars truncated]

### Assistant | 2026-06-25T17:13:13.047Z

The reads were intentional parallel reads of different files/offsets, not a loop. Now I have the dispatcher cases. Critical findings to check on the engine signatures (rows 3 and 4 — the highest risk). Let me read the engine method signatures for `computeScorecard`, `recordRootCause`, `pipelineReport`, and `listAllVendors`.

### Assistant | 2026-06-25T17:13:14.470Z

[tool_use: Grep]

### User | 2026-06-25T17:13:15.647Z

[tool_result] 103:  computeScorecard(args: { vendor_id: string; window_days?: number; as_of?: string }): VendorScorecard {
105:      throw new Error("VendorPerformanceTrackerEngine.computeScorecard: vendor_id required");
109:      throw new Error("VendorPerformanceTrackerEngine.computeScorecard: window_days must be 7..1095");
114:      throw new Error("VendorPerformanceTrackerEngine.computeScorecard: as_of must
... [+342 chars truncated]

### Assistant | 2026-06-25T17:13:15.884Z

[tool_use: Grep]

### Assistant | 2026-06-25T17:13:16.473Z

[tool_use: Grep]

### User | 2026-06-25T17:13:17.235Z

[tool_result] 188:  recordRootCause(args: { ncr_id: string; root_cause: string }): NonConformance {
192:        `NonConformanceAndCorrectiveActionEngine.recordRootCause: NC must be 'contained' (got '${nc.status}')`,
197:        "NonConformanceAndCorrectiveActionEngine.recordRootCause: root_cause (≥10 chars) required",

### User | 2026-06-25T17:13:17.790Z

[tool_result] 272:  pipelineReport(): {

### Assistant | 2026-06-25T17:13:26.734Z

This is the key finding. Two critical mismatches:

1. **`computeScorecard`** expects `{ vendor_id: string }` — route forwards `{ vendor_id }`. MATCH (row 3 is fine).

2. **`recordRootCause`** expects `{ ncr_id: string; root_cause: string }` — but the route forwards the FE's raw body `{ incident_id, ...analysis }`. The engine needs `ncr_id` and `root_cause`, NOT `incident_id`. This is a shape mismatch. Let me verify the FE client.ts to confirm what the FE actually sends, and read the full engine signatures plus `pipelineReport`'s return shape.

### Assistant | 2026-06-25T17:13:28.245Z

[tool_use: Read]

### User | 2026-06-25T17:13:29.199Z

[tool_result] 185	  }
186	
187	  /** D4: root cause analysis. */
188	  recordRootCause(args: { ncr_id: string; root_cause: string }): NonConformance {
189	    const nc = this.requireNC(args.ncr_id);
190	    if (nc.status !== "contained") {
191	      throw new Error(
192	        `NonConformanceAndCorrectiveActionEngine.recordRootCause: NC must be 'contained' (got '${nc.status}')`,
193	      );
194	    }
195	    
... [+886 chars truncated]

### Assistant | 2026-06-25T17:13:33.023Z

[tool_use: Read]

### Assistant | 2026-06-25T17:13:33.051Z

[tool_use: Read]

### User | 2026-06-25T17:13:34.176Z

[tool_result] 180	      tier,
181	      rationale: Object.freeze(rationale),
182	      computed_at: new Date().toISOString(),
183	    });
184	  }
185	
186	  listAllVendors(): ReadonlyArray<string> {
187	    const set = new Set<string>();
188	    for (const po of this.pos.values()) set.add(po.vendor_id);
189	    return Object.freeze([...set].sort());
190	  }
191	
192	  rankVendors(args: { window_days?: number; a
... [+238 chars truncated]

### User | 2026-06-25T17:13:34.203Z

[tool_result] 272	  pipelineReport(): {
273	    by_status: Record<ProspectStatus, { count: number; est_spend_total: number }>;
274	    total_prospects: number;
275	    total_pipeline_value_usd: number;
276	    fetched_at: string;
277	  } {
278	    const empty = (): { count: number; est_spend_total: number } => ({ count: 0, est_spend_total: 0 });
279	    const byStatus: Record<ProspectStatus, { count: number; es
... [+1338 chars truncated]

### Assistant | 2026-06-25T17:13:40.853Z

Confirmed the two highest-risk findings. Now I need the FE client.ts to verify the exact param names the frontend sends — specifically whether `rootCauseAnalysis` posts `incident_id`/`ncr_id` and `root_cause`/`analysis`, and whether `vendorScorecard` builds the right path. Let me find and read the relevant client.ts sections.

### Assistant | 2026-06-25T17:13:42.185Z

[tool_use: Grep]

### User | 2026-06-25T17:13:43.191Z

[tool_result] web\src\pages\A3ReportPage.tsx-36-  background: string;
web\src\pages\A3ReportPage.tsx-37-  currentCondition: { oee: string; scrapRate: string; cycleTimeDeviation: string };
web\src\pages\A3ReportPage.tsx-38-  goal: { targetOee: string; targetScrapRate: string; targetCycleTime: string };
web\src\pages\A3ReportPage.tsx:39:  rootCauseAnalysis: string;
web\src\pages\A3ReportPage.tsx-40-  countermeasu
... [+18800 chars truncated]

### Assistant | 2026-06-25T17:13:49.413Z

I notice `rootCauseIncidents` and `rootCauseAnalysis` are NOT defined in client.ts (the grep found no `export async function rootCauseIncidents` or `rootCauseAnalysis` in client.ts — the only `rootCauseAnalysis` hits are an unrelated A3ReportPage field). This is critical. Let me search the full web/src for these two client functions and read the route block's POST body handling plus the rootCause page.

### Assistant | 2026-06-25T17:13:51.310Z

[tool_use: Grep]

### Assistant | 2026-06-25T17:13:52.281Z

[tool_use: Grep]

### User | 2026-06-25T17:13:52.831Z

[tool_result] web\src\api\client.ts:549:  return request('GET', `/erp/root-cause-incidents${qs ? `?${qs}` : ''}`);
web\src\api\client.ts:563:  return request('POST', '/erp/root-cause-analysis', { incident_id: incidentId, ...analysis });

### User | 2026-06-25T17:13:53.676Z

[tool_result] web\src\types\diagnosis.ts-2-  analysis_type: "tool_autopsy" | "chip_analysis" | "surface_defect" | "crash";
web\src\types\diagnosis.ts-3-  findings: Array<{ category: string; description: string; severity: string; evidence: string }>;
web\src\types\diagnosis.ts:4:  root_cause: string;
web\src\types\diagnosis.ts-5-  recommendations: string[];
web\src\types\diagnosis.ts-6-  confidence: number;
--
H
... [+3430 chars truncated]

### Assistant | 2026-06-25T17:14:00.715Z

This is the decisive evidence for the highest-risk row. The FE client at `client.ts:563` posts `{ incident_id: incidentId, ...analysis }` where `analysis` is `{ scrap_reason, why1..why5, root_cause, corrective_action, assigned_to, due_date }`. The route forwards this raw body to `nc_record_root_cause` -> `recordRootCause`, which expects `{ ncr_id, root_cause }`. The FE sends `incident_id` (NOT `ncr_id`), so `requireNC(args.ncr_id)` gets `undefined`. Let me read the full client.ts block (540-565) to confirm the exact `rootCauseIncidents` signature and `rootCauseAnalysis` param shape, and the `request` helper return shape.

### Assistant | 2026-06-25T17:14:01.680Z

[tool_use: Read]

### User | 2026-06-25T17:14:02.732Z

[tool_result] 538	
539	export async function getRootCauseIncidents(params?: {
540	  dateFrom?: string;
541	  dateTo?: string;
542	  departmentId?: string;
543	}): Promise<PrismResponse> {
544	  const q = new URLSearchParams();
545	  if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
546	  if (params?.dateTo) q.set('dateTo', params.dateTo);
547	  if (params?.departmentId) q.set('departmentId', params.depa
... [+730 chars truncated]

### Assistant | 2026-06-25T17:14:03.043Z

[tool_use: Grep]

### User | 2026-06-25T17:14:04.427Z

[tool_result] 154:    const nc = this.requireNC(args.ncr_id);
155-    if (nc.status !== "open") {
156-      throw new Error(
157-        `NonConformanceAndCorrectiveActionEngine.recordContainment: NC must be 'open' (got '${nc.status}')`,
158-      );
159-    }
160-    if (!Array.isArray(args.team_members) || args.team_members.length === 0) {
161-      throw new Error(
162-        "NonConformanceAndCorrectiveAct
... [+2367 chars truncated]

### Assistant | 2026-06-25T17:14:13.296Z

I now have all the evidence I need for a definitive verdict. The FE client function is named `submitRootCauseAnalysis` (not `rootCauseAnalysis`) and `getRootCauseIncidents` (not `rootCauseIncidents`) — minor naming notes, but the functions exist and target the right routes.

The decisive bug: `submitRootCauseAnalysis(incidentId, analysis)` posts `{ incident_id, why1..why5, root_cause, corrective_action, assigned_to, due_date }`. The route forwards this raw to `recordRootCause`, which does `requireNC(args.ncr_id)` — `args.ncr_id` is `undefined` because the FE sends `incident_id`. `requireNC(undefined)` throws `unknown ncr_id "undefined"`. The POST always 500s.

Let me also check the root-cause-incidents query param mismatch (FE sends `dateFrom`/`dateTo`/`departmentId`; route reads `status`/`severity`/`source`) and read the RootCausePage to confirm how it consumes the response. Let me also verify there are no duplicate paths in the file.

### Assistant | 2026-06-25T17:14:14.707Z

[tool_use: Read]

### User | 2026-06-25T17:14:15.640Z

[tool_result] 160	  open: 'slate',
161	  in_progress: 'amber',
162	  resolved: 'emerald',
163	};
164	
165	// ---------------------------------------------------------------------------
166	// Helper
167	// ---------------------------------------------------------------------------
168	
169	function uid(): string {
170	  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
171	}
172	
173	// -----
... [+2296 chars truncated]

### Assistant | 2026-06-25T17:14:16.123Z

[tool_use: Grep]

### User | 2026-06-25T17:14:17.128Z

[tool_result] 1-import { useCallback, useEffect, useState } from 'react';
2:import { getRootCauseIncidents } from '../api/client';
3-import {
4-  ActionButton,
5-  Field,
--
182-
183-  // Load real incidents from API, fall back to seed
184-  useEffect(() => {
185:    getRootCauseIncidents()
186-      .then((res) => {
187-        const data = (res as any).data ?? (res as any).result ?? [];
188-        if (Array.
... [+35 chars truncated]

### Assistant | 2026-06-25T17:14:17.641Z

[tool_use: Bash]

### User | 2026-06-25T17:14:22.825Z

[tool_result] 610:  router.get("/pipeline-forecast", verifyToken, rfqRoute("prospect_pipeline_report", () => ({})));
611:  router.get("/pipeline-stages", verifyToken, rfqRoute("prospect_pipeline_report", () => ({})));
612:  router.get("/vendor-scorecard/:vendor_id", verifyToken, rfqRoute("vendor_compute_scorecard", (req) => ({ vendor_id: String(req.params.vendor_id) })));
613:  router.get("/vendor-list", verify
... [+233 chars truncated]

### Assistant | 2026-06-25T17:14:28.555Z

I have all the evidence needed. No duplicate paths (each registered once). Let me do a final check on the `request` helper return shape and the SalesPipelinePage stages-facet rendering to fully verify rows 2 and 5, then deliver the verdict.

### Assistant | 2026-06-25T17:14:29.531Z

[tool_use: Read]

### User | 2026-06-25T17:14:30.707Z

[tool_result] 9	interface PipelineStage {
10	  stage: string;
11	  count: number;
12	  value: number;
13	  weighted_value: number;
14	  probability_pct: number;
15	}
16	
17	interface Forecast {
18	  pipeline_value: number;
19	  conversion_rate: number;
20	  forecast_30d: number;
21	  forecast_90d: number;
22	  backlog_value: number;
23	}
24	
25	function money(v: number): string { return `$${v.toLocaleString('en
... [+2767 chars truncated]

### Assistant | 2026-06-25T17:15:15.393Z

I now have complete evidence across all 7 verification points. This confirms a third significant finding (row 5): both pipeline pages expect SHAPES that `pipelineReport()` does not return. The report returns `{ by_status, total_prospects, total_pipeline_value_usd, fetched_at }`, but:
- `SalesPipelinePage` forecast reads `pipeline_value`, `conversion_rate`, `forecast_30d`, `forecast_90d`, `backlog_value` — NONE exist in the report.
- `SalesPipelinePage` stages expects an ARRAY of `{ stage, count, value, weighted_value, probability_pct }` — but `by_status` is an OBJECT keyed by status with `{ count, est_spend_total }`. The route returns the whole report object as `data`, so `stages` gets the report object (not an array) → `.length > 0` is undefined → "No pipeline data" placeholder always renders.

Here is my verdict.

---

VERDICT: FAIL

summary: The dispatcher wiring is correct — all five actions exist in `businessDispatcher.ts` (z.enum + case + lazy import) and the six routes reuse `rfqRoute` with no envelope bypass, no duplicate paths, and an auth tier consistent with sibling routes. However, the data contracts are broken on three of the six rows: the highest-risk POST `/root-cause-analysis` will 500 on every call (FE sends `incident_id`, engine requires `ncr_id` + a >=10-char `root_cause` after a 'contained' status), and the two `prospect_pipeline_report` pipeline routes return a shape neither FE page can consume, leaving both pages permanently empty.

findings:
- [P0] `H:/prism/mcp-server/src/routes/erp.ts:619` (route) + `H:/prism/mcp-server/web/src/api/client.ts:563` (FE) vs `H:/prism/mcp-server/src/engines/NonConformanceAndCorrectiveActionEngine.ts:188` (engine) -- The FE `submitRootCauseAnalysis` POSTs `{ incident_id, why1..why5, root_cause, corrective_action, assigned_to, due_date }`; the route forwards the raw body to `nc_record_root_cause` -> `recordRootCause`, which reads `args.ncr_id` and calls `requireNC(args.ncr_id)`. The FE never sends `ncr_id` (it sen
... [+6161 chars truncated]
