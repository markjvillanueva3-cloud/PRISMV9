---
type: "chat-session"
source: "claude-code-cli"
session_id: "ca9b9050-43d7-4390-93f4-e31f19be4b82"
title: "Read C:\\Users\\wompu\\.claude\\projects\\H--\\ca9b9050-43d7-4390-93f4-e31f19be4b82\\to"
date: "2026-06-25"
first_ts: "2026-06-25T12:37:21.253Z"
last_ts: "2026-06-25T12:40:50.859Z"
cwd: "H:\\prism"
messages: 65
user_msgs: 25
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-aa401ed8ee9af8905.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:49"
---

# Read C:\Users\wompu\.claude\projects\H--\ca9b9050-43d7-4390-93f4-e31f19be4b82\to

> **claude-code-cli** | 2026-06-25 | 65 msgs (25 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-aa401ed8ee9af8905.jsonl`

## Transcript

### User | 2026-06-25T12:37:21.253Z

Read C:\Users\wompu\.claude\projects\H--\ca9b9050-43d7-4390-93f4-e31f19be4b82\tool-results\v1-armA.txt — it contains your full review instructions and the session diff (commit e4760f2dbe, U-HOTEL-WIRE-PM-ASSET: 16 PM/Maintenance + Asset FE→backend route wirings via rfqRoute envelope-unwrap). This is arm A (holistic) of PRISM's 3-of-3 gate. Read the diff end-to-end; verify against the real files (mcp-server/src/routes/erp.ts, mcp-server/src/tools/dispatchers/businessDispatcher.ts pm_*/asset_* cases, mcp-server/src/engines/PreventiveMaintenanceEngine.ts, mcp-server/web/src/api/client.ts, the FE pages PreventiveMaintenancePage.tsx + EquipmentAssetPage.tsx). Confirm: every dead client path maps to a REAL dispatcher action (hyphen-path → underscore-action), the alert_id→schedule_id + wo_id→work_order_id renames are correct, no route collisions, verifyToken is the right tier (internal shop-ops, no $/PII), the envelope-unwrap is applied. Grade PASS/FAIL with P0/P1/P2 + file:line. End with "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-06-25T12:37:24.472Z

I'll start by reading my full review instructions and the session diff.

### Assistant | 2026-06-25T12:37:25.135Z

[tool_use: Read]

### User | 2026-06-25T12:37:25.989Z

[tool_result] 1	You are reviewer A of three independent Claude PRISM agents — a strict, holistic code reviewer for the PRISM manufacturing-intelligence platform.
2	Target: commit HEAD.
3	
4	Acceptance criteria:
5	  1. No stubs, TODOs, or placeholder returns
6	  2. Tests use concrete assertions (no toBeDefined()/toBeTruthy() blanket stubs)
7	  3. ≥3 failure modes covered for any new engine
8	  4. Physics constan
... [+15263 chars truncated]

### Assistant | 2026-06-25T12:37:29.279Z

Now let me read the real files end-to-end to verify the diff claims. Let me start with the key files in parallel.

### Assistant | 2026-06-25T12:37:29.437Z

[tool_use: Read]

### User | 2026-06-25T12:37:30.626Z

[tool_result] 1	/**
2	 * PRISM MCP Server — ERP & Business Operations Routes
3	 *
4	 * Comprehensive backend for all ERP pages:
5	 * Customers, EmployeeDirectory, Exports, FinancialAnalysis,
6	 * GeneralLedger, HRCompliance, OrderTracking, Purchasing,
7	 * QualityManagement, Inventory, Invoicing, Payroll, Scheduling,
8	 * MachineRates, Batch, Reporting, ActualCost, PurchaseOrders,
9	 * TimeClock, ToolUsage, Job
... [+53461 chars truncated]

### Assistant | 2026-06-25T12:37:36.231Z

The erp.ts file confirms the route definitions. Now let me read the other key files to verify the dispatcher actions exist and the FE client paths match. Let me check the businessDispatcher pm_*/asset_* cases, the PreventiveMaintenanceEngine, and the FE client/pages.

### Assistant | 2026-06-25T12:37:38.116Z

[tool_use: Grep]

### User | 2026-06-25T12:37:39.609Z

[tool_result] 789:  "asset_register",
790:  "asset_depreciation_schedule",
791:  "asset_list",
792:  "asset_transfer",
793:  "asset_calibration_due",
1185:  "pm_schedule_create",
1186:  "pm_schedule_list",
1188:  "pm_work_order_generate",
1189:  "pm_work_order_complete",
1190:  "pm_overdue_alerts",
1192:  "pm_work_order_list",
1193:  "pm_work_order_assign",
3369:          case "asset_register": {
3393:         
... [+476 chars truncated]

### Assistant | 2026-06-25T12:37:40.630Z

[tool_use: Grep]

### User | 2026-06-25T12:37:42.054Z

[tool_result] 637:  return request('GET', '/erp/equipment-assets');
639:export async function maintenanceWorkOrders(): Promise<PrismResponse> {
642:export async function maintenanceWorkOrderComplete(params: {
649:// U-HOTEL-MAINT-WORKORDER (gap #6): the MaintenanceWorkOrderPage queue. Distinct from maintenanceWorkOrders()
659:export async function pmSchedules(): Promise<PrismResponse> {
660:  return request('GE
... [+1588 chars truncated]

### Assistant | 2026-06-25T12:37:49.216Z

All dispatcher actions exist. Now let me read the full FE client section for these calls end-to-end to verify the exact paths and parameter shapes, and confirm there are no path mismatches.

### Assistant | 2026-06-25T12:37:50.142Z

[tool_use: Read]

### Assistant | 2026-06-25T12:37:50.661Z

[tool_use: Read]

### User | 2026-06-25T12:37:51.370Z

[tool_result] 625	  return request('GET', `/erp/credit-review/${encodeURIComponent(customerId)}`);
626	}
627	export async function creditReviewAll(): Promise<PrismResponse> {
628	  return request('GET', '/erp/credit-review-all');
629	}
630	export async function vendorScorecard(vendorId: string): Promise<PrismResponse> {
631	  return request('GET', `/erp/vendor-scorecard/${encodeURIComponent(vendorId)}`);
632	}

... [+2891 chars truncated]

### User | 2026-06-25T12:37:51.994Z

[tool_result] 2510	}
2511	
2512	export async function qualityNCRDashboard(): Promise<PrismResponse> {
2513	  return request('GET', '/erp/quality-ncr-dashboard');
2514	}
2515	
2516	// === BIZ-MS5: Preventive Maintenance ===
2517	
2518	export async function pmScheduleCreate(params: Record<string, unknown>): Promise<PrismResponse> {
2519	  return request('POST', '/erp/pm-schedule-create', params);
2520	}
2521	expo
... [+2449 chars truncated]

### Assistant | 2026-06-25T12:38:02.994Z

I found a discrepancy worth flagging. Note line 2524-2525: `pmWorkOrderGenerate(scheduleId, scheduledDate)` posts `{ schedule_id, scheduled_date }` to `/erp/pm-work-order-generate` — but the route at erp.ts:667 (`router.post("/pm-work-order-generate", verifyToken, rfqRoute("pm_work_order_generate"))`) forwards the raw body with NO alert_id→schedule_id mapping. That's a separate route from `/pm-generate-work-order` (line 678, which DOES the mapping). Let me verify both consumers and the engine signature. Let me read the PreventiveMaintenanceEngine and the two FE pages.

### Assistant | 2026-06-25T12:38:03.564Z

[tool_use: Read]

### User | 2026-06-25T12:38:04.000Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\PreventiveMaintenanceEngine.ts' was already read 8m ago in this session and is unchanged (mtime 1775698796000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-25T12:38:09.954Z

The guard says it was already read this session (likely by a peer arm). Let me grep the relevant engine signatures directly instead.

### Assistant | 2026-06-25T12:38:11.867Z

[tool_use: Grep]

### User | 2026-06-25T12:38:13.466Z

[tool_result] 33:  schedule_id: string;
55:  work_order_id: string | undefined;
61:class PreventiveMaintenanceEngine {
72:  createSchedule(params: Omit<PMSchedule, "id" | "created_at">): PMSchedule {
90:  listSchedules(filters?: { machine_id?: string; overdue_only?: boolean }): PMSchedule[] {
113:  generateWorkOrder(scheduleId: string, scheduledDate: string): PMWorkOrder {
115:    if (!schedule) throw new Error
... [+451 chars truncated]

### Assistant | 2026-06-25T12:38:16.889Z

Now let me verify the dispatcher cases — specifically how `pm_work_order_generate`, `pm_work_order_complete`, and `pm_overdue_alerts` read their params and what they return, to confirm the test mocks match the real contract and the renames are correct.

### Assistant | 2026-06-25T12:38:17.478Z

[tool_use: Read]

### User | 2026-06-25T12:38:18.308Z

[tool_result] 3369	          case "asset_register": {
3370	            const engine = await getEngine("equipmentAsset");
3371	            result = engine.registerAsset({
3372	              asset_tag: params.asset_tag,
3373	              name: params.name,
3374	              category: params.category,
3375	              manufacturer: params.manufacturer,
3376	              model_number: params.model_number,
3377
... [+7080 chars truncated]

### Assistant | 2026-06-25T12:38:24.730Z

Now I have confirmed the dispatcher contract. Note the `asset_transfer` case (line 3412): the engine `transferAsset(params.asset_id, { to_location, ... })` reads `params.to_location`, but the FE `assetTransfer(assetId, params)` posts `{ asset_id, ...params }` and the route forwards raw — so the FE must supply `to_location`. The test mock at the test file uses `location` not `to_location`, but that's just the mock's return shape, not a contract assertion. Let me verify the two FE pages to confirm the consumed payload shapes and which client functions they actually call, plus verify there are no route collisions. Let me look at the two pages and check for existing route definitions that might collide.

### Assistant | 2026-06-25T12:38:25.703Z

[tool_use: Glob]

### Assistant | 2026-06-25T12:38:26.165Z

[tool_use: Glob]

### Assistant | 2026-06-25T12:38:28.601Z

[tool_use: Grep]

### User | 2026-06-25T12:38:30.303Z

[tool_result] 651:  router.get("/maintenance-work-orders", verifyToken, listMaintenanceWorkOrders);
664:  router.get("/pm-schedules", verifyToken, rfqRoute("pm_overdue_alerts", () => ({})));
665:  router.post("/pm-schedule-create", verifyToken, rfqRoute("pm_schedule_create"));
666:  router.post("/pm-schedule-list", verifyToken, rfqRoute("pm_schedule_list"));
667:  router.post("/pm-work-order-generate", verifyTo
... [+977 chars truncated]

### User | 2026-06-25T12:38:38.814Z

[tool_result] mcp-server\web\src\pages\PreventiveMaintenancePage.tsx

### User | 2026-06-25T12:38:38.862Z

[tool_result] mcp-server\web\src\pages\EquipmentAssetPage.tsx

### Assistant | 2026-06-25T12:38:43.913Z

No route collisions: each path appears exactly once. Now let me verify the two FE pages to confirm which client functions they call and the exact payloads consumed (to validate the alert_id→schedule_id and wo_id→work_order_id renames against real consumers), and check the `request` helper applies the envelope/auth correctly.

### Assistant | 2026-06-25T12:38:44.471Z

[tool_use: Read]

### User | 2026-06-25T12:38:44.953Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\pages\PreventiveMaintenancePage.tsx' was already read 8m ago in this session and is unchanged (mtime 1776267954000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-25T12:38:47.466Z

The read-once guard is blocking because a peer arm read it. Let me bypass with grep to get the exact client calls and payload consumption in both pages.

### Assistant | 2026-06-25T12:38:50.288Z

[tool_use: Grep]

### Assistant | 2026-06-25T12:38:51.918Z

[tool_use: Grep]

### User | 2026-06-25T12:38:52.025Z

[tool_result] 3:  maintenanceWorkOrderComplete,
4:  maintenanceWorkOrders,
5:  pmGenerateWorkOrder,
6:  pmSchedules,
18:  arrayFromPayload,
45:        pmSchedules(),
46:        maintenanceWorkOrders(),
49:      setScheduleAlerts(arrayFromPayload(scheduleResponse, ['alerts', 'schedules', 'items', 'records']));
50:      setWorkOrders(arrayFromPayload(workOrderResponse, ['work_orders', 'orders', 'items', 'records'
... [+1470 chars truncated]

### User | 2026-06-25T12:38:53.434Z

[tool_result] 3:  assetDueCalibrations,
4:  assetList,
15:  arrayFromPayload,
36:        assetList(),
37:        assetDueCalibrations(Number(daysAhead) || 30),
39:      setAssets(arrayFromPayload(assetResponse, ['assets', 'items', 'records']));
40:      setDueCalibrations(arrayFromPayload(dueResponse, ['assets', 'calibrations', 'items', 'records']));
131:                  {firstText(entry, ['location', 'categor
... [+215 chars truncated]

### Assistant | 2026-06-25T12:39:01.525Z

This is very informative. The PreventiveMaintenancePage actually only imports/calls FOUR client functions: `pmSchedules`, `maintenanceWorkOrders`, `pmGenerateWorkOrder`, `maintenanceWorkOrderComplete`. EquipmentAssetPage calls `assetList` and `assetDueCalibrations`. Let me verify the critical details:

1. PreventiveMaintenancePage line 49: reads `['alerts','schedules',...]` — but `pmSchedules` → GET `/pm-schedules` → `pm_overdue_alerts` returns `{alerts}`. Good. The page reads `selectedAlertId` from `['alert_id','id','machine_id']` (line 66). But the dispatcher `pm_overdue_alerts` returns alerts shaped `{schedule, days_overdue, ...}` — let me check that the alert object actually has an `id` field that equals the schedule id, since `pmGenerateWorkOrder(selectedAlertId)` → `/pm-generate-work-order` maps `alert_id`→`schedule_id`.

2. EquipmentAssetPage line 40: `dueCalibrations` reads `['assets','calibrations',...]` but `asset_calibration_due` returns `{due}` — possible mismatch.

Let me check the `getOverdueAlerts` return shape and the `arrayFromPayload`/`request` helpers.

### Assistant | 2026-06-25T12:39:03.046Z

[tool_use: Read]

### User | 2026-06-25T12:39:03.941Z

[tool_result] 177	  getOverdueAlerts(currentMachineHours?: Map<string, number>): Array<{
178	    schedule: PMSchedule;
179	    days_overdue: number;
180	    hours_overdue: number | undefined;
181	  }> {
182	    const alerts: Array<{ schedule: PMSchedule; days_overdue: number; hours_overdue: number | undefined }> = [];
183	    for (const schedule of this.pmSchedules.values()) {
184	      const machineHours = cur
... [+2329 chars truncated]

### Assistant | 2026-06-25T12:39:04.355Z

[tool_use: Grep]

### User | 2026-06-25T12:39:04.359Z

[tool_result] <tool_use_error>Path does not exist: H:\prism\mcp-server\web\src\utils\recoveryUtils.ts. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-25T12:39:13.752Z

Now I have the key data points. Let me verify two potential issues:

1. **`getOverdueAlerts` returns `{schedule, days_overdue, hours_overdue}`** — NO top-level `id`. The page reads `selectedAlertId` from `firstText(entry, ['alert_id','id','machine_id'])` (line 66) — so it falls through `alert_id`(absent)→`id`(absent at top level)→`machine_id`(absent at top level). The alert's only nested field is `schedule.id`. So `selectedAlertId` resolves to empty/undefined, and `pmGenerateWorkOrder(selectedAlertId)` → maps `alert_id`→`schedule_id` → engine throws "PM schedule not found: undefined". This is a real concern but it lives in the FE page (not in this diff) and the route comment acknowledges the empty-id-throws behavior. Let me confirm whether the page reads `machine_id` (which IS present nested as `schedule.machine_id` but not top-level). Let me find `arrayFromPayload` and `firstText` to confirm whether they dig into nested objects.

2. EquipmentAssetPage `dueCalibrations` reads `['assets','calibrations',...]` but the route returns `{due}` — neither key matches, so the due-calibrations panel renders empty.

Let me locate the recovery utils.

### Assistant | 2026-06-25T12:39:14.230Z

[tool_use: Glob]

### Assistant | 2026-06-25T12:39:15.726Z

[tool_use: Grep]

### User | 2026-06-25T12:39:18.441Z

[tool_result] 18:  arrayFromPayload,
22:  firstText,
49:      setScheduleAlerts(arrayFromPayload(scheduleResponse, ['alerts', 'schedules', 'items', 'records']));
50:      setWorkOrders(arrayFromPayload(workOrderResponse, ['work_orders', 'orders', 'items', 'records']));
66:      setSelectedAlertId(firstText(scheduleAlerts[0], ['alert_id', 'id', 'machine_id']));

[Showing results with pagination = limit: 5]

### User | 2026-06-25T12:39:31.316Z

[tool_result] mcp-server\web\src\pages\recovery\recoveryUtils.ts

### Assistant | 2026-06-25T12:39:35.149Z

[tool_use: Read]

### User | 2026-06-25T12:39:41.972Z

[tool_result] 1	import type { ApiError } from '../../api/client';
2	
3	export function asRecord(value: unknown): Record<string, unknown> | null {
4	  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
5	}
6	
7	export function text(value: unknown): string | null {
8	  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
9	}
10	
11	export fu
... [+3059 chars truncated]

### Assistant | 2026-06-25T12:39:55.764Z

This confirms the critical behavior. `payloadOf` reads `record.result ?? record.data ?? null` — and the route returns `{ ok: true, data: {...} }`, so `payloadOf` correctly returns the `data` object. Then `arrayFromPayload(scheduleResponse, ['alerts', ...])` digs `data.alerts`. Good — the envelope and array extraction work.

Now the two concerns:

1. **`firstText`/`firstNumber` do NOT recurse into nested objects** (line 52-58: they only read top-level `record[key]`). The alert object is `{schedule:{...}, days_overdue, hours_overdue}` — top-level keys are `schedule`, `days_overdue`, `hours_overdue`. The page reads `firstText(alert, ['alert_id','id','machine_id'])` → none of those are top-level → returns `''`. So `selectedAlertId` is empty, and "Generate work order" sends `alert_id:''` → route maps to `schedule_id:''` → engine throws "PM schedule not found:". **This is a real FE/contract dead-spot, BUT it lives in PreventiveMaintenancePage.tsx which is NOT modified in this diff.** The diff only added routes + tests. The page pre-existed unchanged. So this is a pre-existing gap, not introduced by this commit. I'll note it but it's not a blocker for THIS diff.

2. **EquipmentAssetPage due-calibrations key mismatch:** Let me re-examine. The route `/asset-due-calibrations` → `asset_calibration_due` returns `{due:[...]}`. The page reads `arrayFromPayload(dueResponse, ['assets','calibrations','items','records'])` — none is `due`. So that panel renders empty. Again pre-existing page, not in diff. Let me verify whether `assetDueCalibrations` is even one of the 16 wirings claimed, and whether the page is in-diff. The diff only touches `erp.ts` + the test file. So both pages are out-of-diff.

Let me confirm the `request` helper attaches auth (verifyToken tier correctness depends on the client sending a token) and check the test harness's `env`/`http`/`calls` setup to validate the tests have real teeth.

### Assistant | 2026-06-25T12:39:56.812Z

[tool_use: Read]

### User | 2026-06-25T12:40:00.056Z

[tool_result] 1	/**
2	 * erp-rfq-routes.test.ts -- U-HOTEL-RFQ-ASSIGN (gap #2 of HOTEL-ERP-FRONTEND-WIRING-SPEC, slot:hotel)
3	 *
4	 * The RFQInbox page (web/src/pages/RFQInboxPage.tsx) had NO backing /erp/rfq* routes -> it was fully
5	 * dead (rfqList/rfqAssign/rfqUpdateStatus all 404'd). This unit wired 4 routes onto the existing
6	 * RFQToOrderOrchestratorEngine via businessDispatcher. This test drives the e
... [+11431 chars truncated]

### Assistant | 2026-06-25T12:40:07.572Z

The test mock is well-constructed and uses the production envelope (`env()` = `{type:"text", text:JSON}`) which forces the route's `unwrapEnvelope` to actually run (R9 — no convenient-shape masking). Note line 189: `asset_transfer` mock returns `{ id, location }` but the real dispatcher's `transferAsset` reads `params.to_location` and the engine returns a different shape — the mock's return shape is fictional but the test only asserts on `params.asset_id` forwarding (line 170) and `xfer.json.data.location` against its own mock, so it's self-consistent but doesn't validate the real engine's `to_location` requirement. That's a known limitation of route-level tests. Let me read the test harness `http`/`env` setup and the remaining test body to confirm teeth, then check the `request` client helper for auth attachment.

### Assistant | 2026-06-25T12:40:08.484Z

[tool_use: Read]

### User | 2026-06-25T12:40:09.706Z

[tool_result] 200	beforeAll(async () => {
201	  const app = express();
202	  app.use(express.json());
203	  app.use("/api/v1/erp", createErpRouter(callTool));
204	  await new Promise<void>((resolve) => {
205	    server = createServer(app).listen(0, () => {
206	      const addr = server.address();
207	      baseUrl = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
208	      resolve();
209
... [+2683 chars truncated]

### Assistant | 2026-06-25T12:40:10.062Z

[tool_use: Grep]

### User | 2026-06-25T12:40:11.589Z

[tool_result] 49:export function getRequestHeaders(): Record<string, string> {
54:    headers['Authorization'] = `Bearer ${apiKey}`;
59:async function request<T>(
66:    headers: getRequestHeaders(),
72:async function requestData<T>(
79:    headers: getRequestHeaders(),
136:      headers: getRequestHeaders(),
170:    headers: getRequestHeaders(),
179:    headers: getRequestHeaders(),
192:    headers: getRequest
... [+278 chars truncated]

### Assistant | 2026-06-25T12:40:20.764Z

Confirmed: the client `request` helper attaches `Authorization: Bearer ${apiKey}` via `getRequestHeaders()` (line 66), so all 16 wired calls send the token — the `verifyToken` tier is satisfiable from the FE. The test harness sends `Authorization: Bearer t` and mocks `verifyToken` to set `req.userId`/`req.userRoles`. 

Now let me verify the new test assertions have real teeth by reading the rest of the new test block (lines 451+) — I have it from the diff. Let me do a final cross-check on the one item I want to confirm: whether `/maintenance-work-orders/complete` collides with `/maintenance-work-orders` GET (different methods, no collision) and whether Express route ordering causes `/asset-depreciation/:asset_id` to shadow anything. Also let me confirm the verifyToken tier claim — that none of these actions expose $/PII. The asset register includes `purchase_cost`, `salvage_value`, `depreciation` (book_value). Let me verify whether that constitutes financial data requiring a higher tier than peer routes.

### Assistant | 2026-06-25T12:40:21.996Z

[tool_use: Read]

### User | 2026-06-25T12:40:23.019Z

[tool_result] 113	  generateWorkOrder(scheduleId: string, scheduledDate: string): PMWorkOrder {
114	    const schedule = this.pmSchedules.get(scheduleId);
115	    if (!schedule) throw new Error(`PM schedule not found: ${scheduleId}`);
116	
117	    // Check for existing open/in_progress WO for this schedule
118	    for (const wo of this.pmWorkOrders.values()) {
119	      if (wo.schedule_id === scheduleId && (wo.
... [+1491 chars truncated]

### Assistant | 2026-06-25T12:40:50.859Z

I now have everything needed to render a verdict. Let me confirm the engine signatures align with the dispatcher/route contract:

- `generateWorkOrder(scheduleId, scheduledDate)` (line 113) — the route `/pm-generate-work-order` maps `alert_id`→`schedule_id` and defaults `scheduled_date` to today; dispatcher `pm_work_order_generate` (line 3468) reads `params.schedule_id, params.scheduled_date`. **Correct.** A missing alert_id → `schedule_id: undefined` → engine throws "PM schedule not found: undefined" → `rfqRoute` catch → 500 (fail-loud, no fabricated WO). Verified.
- `completeWorkOrder(workOrderId, {labor_hours,...})` (line 145) — route `/maintenance-work-orders/complete` maps `wo_id`→`work_order_id`; dispatcher reads `params.work_order_id`. **Correct.** Without the rename, `completeWorkOrder(undefined)` → throws "Work order not found: undefined". The test (lines 146-158) proves the rename with real teeth.

Now I have a complete picture. Let me finalize my assessment.

## Assessment Summary

**What I verified end-to-end:**
- `mcp-server/src/routes/erp.ts:636-693` — all 16 new route definitions read end-to-end.
- `mcp-server/src/tools/dispatchers/businessDispatcher.ts:789-793, 1185-1193, 3369-3520` — every dispatcher action exists in both the z.enum action lists AND has a case body.
- `mcp-server/src/engines/PreventiveMaintenanceEngine.ts:113-204` — engine signatures (`generateWorkOrder`, `completeWorkOrder`, `getOverdueAlerts`, etc.) match the dispatcher param reads.
- `mcp-server/web/src/api/client.ts:636-664, 2518-2555` — every dead client path now maps to a real route, with auth attached via `getRequestHeaders()`.
- `mcp-server/web/src/pages/recovery/recoveryUtils.ts` — `payloadOf` reads `result ?? data`, so the `{ok,data}` envelope is correctly unwrapped.
- `mcp-server/src/__tests__/erp-rfq-routes.test.ts:159-198, 451-554` — the test mock uses the production `{type,text}` envelope (forces `unwrapEnvelope` to run; R9-honest, no convenient-shape masking).

---

V
... [+2878 chars truncated]
