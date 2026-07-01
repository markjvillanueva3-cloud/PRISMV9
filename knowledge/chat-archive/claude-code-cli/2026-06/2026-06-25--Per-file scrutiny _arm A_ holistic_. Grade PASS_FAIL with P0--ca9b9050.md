---
type: "chat-session"
source: "claude-code-cli"
session_id: "ca9b9050-43d7-4390-93f4-e31f19be4b82"
title: "Per-file scrutiny (arm A, holistic). Grade PASS/FAIL with P0/P1/P2 + file:line. "
date: "2026-06-25"
first_ts: "2026-06-25T12:29:59.507Z"
last_ts: "2026-06-25T12:31:50.333Z"
cwd: "H:\\prism\\mcp-server"
messages: 40
user_msgs: 16
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a6f8c85f3e072c668.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# Per-file scrutiny (arm A, holistic). Grade PASS/FAIL with P0/P1/P2 + file:line. 

> **claude-code-cli** | 2026-06-25 | 40 msgs (16 user / 24 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a6f8c85f3e072c668.jsonl`

## Transcript

### User | 2026-06-25T12:29:59.507Z

Per-file scrutiny (arm A, holistic). Grade PASS/FAIL with P0/P1/P2 + file:line. End with "VERDICT: PASS" or "VERDICT: FAIL".

FILE: H:\prism\mcp-server\src\routes\erp.ts — the NEW block "Preventive Maintenance + Assets cluster (U-HOTEL-WIRE-PM-ASSET)" (~line 636-690, the routes added right after the /maintenance/refresh route). It wires 16 previously-dead FE client calls (PreventiveMaintenancePage + EquipmentAssetPage) to existing prism_business dispatcher actions.

CONTRACT:
- Every route reuses the existing `rfqRoute(action, getParams?)` helper (erp.ts:111) which unwraps the prism_business {type,text} slimResponse envelope (callTool can't peel it) then returns {ok:true, data: r.data ?? r}. Verify rfqRoute is the right helper (the prism_business dead-panel class).
- Backing actions (verify each EXISTS in businessDispatcher.ts and returns the shape the comment claims): pm_overdue_alerts ({alerts}), pm_schedule_create ({schedule}), pm_schedule_list ({schedules}), pm_work_order_generate ({work_order}, takes schedule_id+scheduled_date), pm_work_order_list ({work_orders}), pm_work_order_assign ({work_order}), pm_work_order_complete ({work_order}), asset_list ({assets}), asset_register, asset_transfer, asset_calibration_due ({due}), asset_depreciation_schedule ({schedule}).
- The /pm-generate-work-order route maps the FE's {alert_id} -> {schedule_id, scheduled_date default today}. VERIFY this mapping is correct: read PreventiveMaintenanceEngine.getOverdueAlerts (returns {schedule, days_overdue}) + generateWorkOrder(scheduleId, scheduledDate). Is alert_id->schedule_id honest? Is the today-default for scheduled_date reasonable (R12)?
- /pm-schedules (GET) maps to pm_overdue_alerts (the page's overdue-alert desk). /equipment-assets (GET) maps to asset_list. Are these intent-correct vs what the FE pages read (PreventiveMaintenancePage reads arrayFromPayload(['alerts','schedules',...]); EquipmentAssetPage reads assetList)?
- All routes are verifyToken-only. Is that the right 
... [+848 chars truncated]

### Assistant | 2026-06-25T12:30:02.512Z

I'll review the new PM + Assets cluster block in erp.ts against its dependencies. Let me start by reading the relevant files.

### Assistant | 2026-06-25T12:30:03.011Z

[tool_use: Read]

### Assistant | 2026-06-25T12:30:03.384Z

[tool_use: Read]

### User | 2026-06-25T12:30:04.170Z

[tool_result] 1	/**
2	 * PRISM MCP Server — ERP & Business Operations Routes
3	 *
4	 * Comprehensive backend for all ERP pages:
5	 * Customers, EmployeeDirectory, Exports, FinancialAnalysis,
6	 * GeneralLedger, HRCompliance, OrderTracking, Purchasing,
7	 * QualityManagement, Inventory, Invoicing, Payroll, Scheduling,
8	 * MachineRates, Batch, Reporting, ActualCost, PurchaseOrders,
9	 * TimeClock, ToolUsage, Job
... [+53014 chars truncated]

### User | 2026-06-25T12:30:04.340Z

[tool_result] 1	/**
2	 * PreventiveMaintenanceEngine — BIZ-MS5 U-BIZ36
3	 * PM schedule management (calendar + hours-based triggers), work order generation,
4	 * downtime recording, overdue alerts.
5	 */
6	import { persistenceBridge } from "../db/PersistenceBridge.js";
7	
8	export interface PMPart {
9	  part_name: string;
10	  part_number: string;
11	  quantity: number;
12	  unit_cost: number;
13	}
14	
15	expor
... [+9383 chars truncated]

### Assistant | 2026-06-25T12:30:08.878Z

Now let me verify each backing action exists in the businessDispatcher and returns the claimed shape, plus check the FE pages.

### Assistant | 2026-06-25T12:30:10.783Z

[tool_use: Grep]

### Assistant | 2026-06-25T12:30:11.719Z

[tool_use: Glob]

### Assistant | 2026-06-25T12:30:11.727Z

[tool_use: Glob]

### User | 2026-06-25T12:30:13.960Z

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

### User | 2026-06-25T12:30:16.500Z

[tool_result] web\src\pages\PreventiveMaintenancePage.tsx

### User | 2026-06-25T12:30:16.548Z

[tool_result] web\src\pages\EquipmentAssetPage.tsx

### Assistant | 2026-06-25T12:30:21.269Z

All 12 backing actions exist. Now let me read the dispatcher cases end-to-end to verify the return shapes, and read both FE pages plus the client functions.

### Assistant | 2026-06-25T12:30:22.135Z

[tool_use: Read]

### User | 2026-06-25T12:30:23.007Z

[tool_result] 3360	                params.purchase_cost,
3361	                params.salvage_value,
3362	                params.useful_life_years,
3363	                params.method,
3364	                params.months_elapsed,
3365	              ),
3366	            };
3367	            break;
3368	          }
3369	          case "asset_register": {
3370	            const engine = await getEngine("equipmentAsset"
... [+7999 chars truncated]

### Assistant | 2026-06-25T12:30:23.110Z

[tool_use: Read]

### Assistant | 2026-06-25T12:30:23.191Z

[tool_use: Read]

### User | 2026-06-25T12:30:24.045Z

[tool_result] 1	import { useCallback, useEffect, useMemo, useState } from 'react';
2	import {
3	  maintenanceWorkOrderComplete,
4	  maintenanceWorkOrders,
5	  pmGenerateWorkOrder,
6	  pmSchedules,
7	} from '../api/client';
8	import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
9	import {
10	  ActionButton,
11	  Field,
12	  Input,
13	  PanelCard,
14	  Select,
15	  Status
... [+12922 chars truncated]

### User | 2026-06-25T12:30:24.153Z

[tool_result] 1	import { useCallback, useEffect, useMemo, useState } from 'react';
2	import {
3	  assetDueCalibrations,
4	  assetList,
5	} from '../api/client';
6	import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
7	import {
8	  ActionButton,
9	  Field,
10	  Input,
11	  PanelCard,
12	  StatusPill,
13	} from '../components/workspace/WorkspacePrimitives';
14	import {
15
... [+6923 chars truncated]

### Assistant | 2026-06-25T12:30:29.314Z

Now let me verify the client functions in `web/src/api/client.ts` to confirm exact paths and HTTP methods, especially the hyphen-vs-slash routing and the completion shape.

### Assistant | 2026-06-25T12:30:31.094Z

[tool_use: Grep]

### User | 2026-06-25T12:30:32.835Z

[tool_result] 635-}
636-export async function equipmentAssets(): Promise<PrismResponse> {
637:  return request('GET', '/erp/equipment-assets');
638-}
639:export async function maintenanceWorkOrders(): Promise<PrismResponse> {
640:  return request('GET', '/erp/maintenance-work-orders');
641-}
642:export async function maintenanceWorkOrderComplete(params: {
643-  wo_id: string;
644-  labor_hours: number;
645-  no
... [+1585 chars truncated]

### Assistant | 2026-06-25T12:30:42.047Z

I have all the pieces. Let me verify one important detail: the completion route. The FE `maintenanceWorkOrderComplete` sends `{ wo_id, labor_hours, notes }` and hits `POST /erp/maintenance-work-orders/complete`, which the new block wires to `rfqRoute("pm_work_order_complete")`. But the engine's `completeWorkOrder` takes `workOrderId` as the first arg, read from `params.work_order_id` in the dispatcher. The FE sends `wo_id`, not `work_order_id`. Let me re-examine the dispatcher case and the rfqRoute param passing.

The dispatcher `pm_work_order_complete` case (line 3471-3480) reads `params.work_order_id`. The FE sends `{ wo_id, labor_hours, notes }`. `rfqRoute("pm_work_order_complete")` with no `getParams` forwards `req.body` verbatim, so `params.work_order_id` is `undefined` → `engine.completeWorkOrder(undefined, ...)` → throws "Work order not found: undefined". Let me confirm there's no transformation and check whether `assetList` filter shape and the `asset_list` GET wiring matter.

### Assistant | 2026-06-25T12:30:42.908Z

[tool_use: Read]

### User | 2026-06-25T12:30:43.740Z

[tool_result] 2535	}
2536	export async function pmOverdueAlerts(): Promise<PrismResponse> {
2537	  return request('GET', '/erp/pm-overdue-alerts');
2538	}
2539	
2540	// === BIZ-MS5: Equipment Assets ===
2541	
2542	export async function assetRegister(params: Record<string, unknown>): Promise<PrismResponse> {
2543	  return request('POST', '/erp/asset-register', params);
2544	}
2545	export async function assetList
... [+784 chars truncated]

### Assistant | 2026-06-25T12:30:44.308Z

[tool_use: Grep]

### User | 2026-06-25T12:30:45.379Z

[tool_result] 3:export function asRecord(value: unknown): Record<string, unknown> | null {
4-  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
5-}
6-
7-export function text(value: unknown): string | null {
8-  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
9-}
10-
11-export function num(value: unknown): number | null {
12-  const 
... [+1341 chars truncated]

### Assistant | 2026-06-25T12:30:53.861Z

Now I have the full picture. Let me confirm the critical finding on the completion route by tracing the exact parameter contract, and verify the `payloadOf`/`arrayFromPayload` consumption against what `rfqRoute` returns.

Key chain analysis for the completion route:
- FE `maintenanceWorkOrderComplete({ wo_id, labor_hours, notes })` → `POST /erp/maintenance-work-orders/complete`
- Route: `rfqRoute("pm_work_order_complete", (req) => req.body ?? {})` → forwards `{ wo_id, labor_hours, notes }` to dispatcher
- Dispatcher `pm_work_order_complete` (line 3474): `engine.completeWorkOrder(params.work_order_id, {...})` — reads `params.work_order_id`, but FE sent `wo_id`
- Engine `completeWorkOrder(workOrderId=undefined)` (line 150): `if (!wo) throw new Error("Work order not found: undefined")`

Let me confirm there's no aliasing in the dispatcher param normalization that maps `wo_id` → `work_order_id`, and check what `rfqRoute` returns for the `{ ok: true, data }` vs FE `payloadOf` (which reads `.result ?? .data`).

### Assistant | 2026-06-25T12:30:55.276Z

[tool_use: Grep]

### User | 2026-06-25T12:30:56.210Z

[tool_result] 2714:              params.wo_id ?? params.woId,
2722:              params.wo_id ?? params.woId,
3474:              work_order: engine.completeWorkOrder(params.work_order_id, {
3499:                work_order_id: params.work_order_id,
3518:            result = { work_order: engine.assignWorkOrder(params.work_order_id, params.assigned_to) };
5064:            result = engine.whatIfWorkOrder(params.wo
... [+21 chars truncated]

### Assistant | 2026-06-25T12:30:56.374Z

[tool_use: Grep]

### User | 2026-06-25T12:30:57.505Z

[tool_result] 59:async function request<T>(
60-  method: 'GET' | 'POST' | 'PATCH',
61-  path: string,
62-  body?: unknown,
63-): Promise<PrismResponse<T>> {
64-  return fetchJson<PrismResponse<T>>(`${API_BASE}${path}`, {
65-    method,
66-    headers: getRequestHeaders(),
67-    body: body ? JSON.stringify(body) : undefined,
68-    fallbackMessage: 'PRISM request failed',
69-  });
70-}
71-
72:async function req
... [+966 chars truncated]

### Assistant | 2026-06-25T12:31:08.279Z

Confirmed. The dispatcher `pm_work_order_complete` reads only `params.work_order_id` (line 3474) — there is no `wo_id` alias for it (the `wo_id ?? woId` alias at 2714/2722 is a different action). The FE sends `wo_id`, so completion is broken.

Now let me verify the `maintenanceWorkOrderComplete` route wiring. The PreventiveMaintenancePage calls `maintenanceWorkOrderComplete` → `POST /erp/maintenance-work-orders/complete`. The new block wires that to `rfqRoute("pm_work_order_complete", (req) => req.body ?? {})`. Let me also double-check the slash sibling `/maintenance/work-orders/complete` to see if a parallel route exists, and confirm there's no `wo_id`→`work_order_id` mapping anywhere in the route layer.

### Assistant | 2026-06-25T12:31:09.349Z

[tool_use: Grep]

### User | 2026-06-25T12:31:10.493Z

[tool_result] 632:  router.get("/maintenance/work-orders", verifyToken, listMaintenanceWorkOrders);
649:  // /erp/maintenance-work-orders (distinct from the slash /maintenance/work-orders the MaintenanceWorkOrderPage
652:  router.post("/maintenance-work-orders/complete", verifyToken,

### Assistant | 2026-06-25T12:31:18.918Z

Confirmed. The completion route `POST /maintenance-work-orders/complete` (erp.ts:652-653) forwards `req.body` verbatim (`{ wo_id, labor_hours, notes }`) and the dispatcher reads `params.work_order_id`. The `wo_id` → `work_order_id` translation happens nowhere, so completion throws.

I have enough to render a verdict. Let me do a final confirmation: verify the `pm-generate-work-order` chain is honest (the contract's claim about alert_id→schedule_id), and confirm the `equipment-assets` GET / `pm-schedules` GET intent against the FE reads — both already verified above. Let me also confirm there's no route-path collision for the new GET routes against any pre-existing route.

### Assistant | 2026-06-25T12:31:21.682Z

[tool_use: Grep]

### User | 2026-06-25T12:31:22.731Z

[tool_result] 651:  router.get("/maintenance-work-orders", verifyToken, listMaintenanceWorkOrders);
658:  router.get("/pm-schedules", verifyToken, rfqRoute("pm_overdue_alerts", () => ({})));
665:  router.get("/pm-overdue-alerts", verifyToken, rfqRoute("pm_overdue_alerts", () => ({})));
681:  router.get("/equipment-assets", verifyToken, rfqRoute("asset_list", () => ({})));
683:  router.post("/asset-list", verify
... [+125 chars truncated]

### Assistant | 2026-06-25T12:31:50.333Z

No route-path collisions: each new path is registered exactly once. All routes verified end-to-end. Here is my verdict.

---

VERDICT: FAIL

summary: The PM + Assets cluster (erp.ts:636-687) correctly reuses `rfqRoute` for envelope unwrapping, and all 12 backing actions exist in `businessDispatcher.ts` with the return shapes the comments claim. The GET-list and asset routes are intent-correct and verifyToken is the right tier (internal shop-ops, no customer $/PII). However there is one P0 contract break: the work-order completion route forwards the FE's `wo_id` to a dispatcher action that reads only `work_order_id`, so every "Complete work order" click throws.

findings:

- [P0] `H:\prism\mcp-server\src\routes\erp.ts:652-653` — The `/maintenance-work-orders/complete` route wires `rfqRoute("pm_work_order_complete", (req) => req.body ?? {})`, forwarding the FE body verbatim. `PreventiveMaintenancePage.handleCompleteWorkOrder` (PreventiveMaintenancePage.tsx:101-105) sends `{ wo_id, labor_hours, notes }` via `maintenanceWorkOrderComplete` (client.ts:642-648). But the dispatcher `pm_work_order_complete` case reads `engine.completeWorkOrder(params.work_order_id, ...)` (businessDispatcher.ts:3474) — it reads `work_order_id`, NOT `wo_id`, and there is no `wo_id` alias for this action (the only `wo_id ?? woId` aliases are at businessDispatcher.ts:2714/2722 for a different action). So `params.work_order_id` is `undefined`, `engine.completeWorkOrder(undefined, ...)` hits `if (!wo) throw new Error("Work order not found: undefined")` (PreventiveMaintenanceEngine.ts:150-151), rfqRoute swallows it as a 500, and the FE shows "Unable to complete the maintenance work order." The complete-WO flow — half the page's dispatch panel — is dead on every click. Fix: map the param in the route, e.g. `rfqRoute("pm_work_order_complete", (req) => ({ work_order_id: req.body?.wo_id ?? req.body?.work_order_id, labor_hours: req.body?.labor_hours, notes: req.body?.notes }))`. (Note: the slash-sibling
... [+2971 chars truncated]
