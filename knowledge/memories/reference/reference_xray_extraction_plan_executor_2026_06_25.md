---
name: reference_xray_extraction_plan_executor_2026_06_25
description: "Cross-domain extraction-routing-plan EXECUTOR — drives a blueprint extraction plan to actual downstream consumer dispatch end-to-end (slot xray, 2026-06-25)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.272Z
aliases: reference_xray_extraction_plan_executor_2026_06_25
---


# Extraction routing-plan executor (slot xray, 2026-06-25, cad-fusion-live-ms0)

`U-XRAY-EXTRACTION-PLAN-EXECUTOR` (commit `fd46f6cff7`). Operator directive: "bypass domains + combine
roles + link in with domain nodes." The `blueprintExtractionRouter` produced a confirm-gated fan-out PLAN
(which downstream prism feature each extraction CAN drive) but it was PURE — nothing executed it. This is
the missing executor that links blueprint/OCR/document extraction into EVERY downstream domain end-to-end.

## What shipped
- **Engine** `mcp-server/src/engines/blueprint-vision/extractionPlanExecutor.ts` — pure DI
  `executeExtractionPlan(plan, callTool, opts)` + `decideRouteDisposition` (the gate). Iterates the plan's
  routes and dispatches the eligible, gate-cleared consumer actions via an **injected** `callTool` (no
  dispatcher import → no cross-dispatcher-call violation; lives at the route layer).
- **Route** `routes/drawing.ts` `executePlanResponse` + `POST /api/v1/drawing/execute` (mounted via
  `createDrawingRouter` @ `/api/v1/drawing`).
- 88 tests green (18 executor + 6 route + regression); tsc clean; per-file 2-arm + 3-of-3 PASS.

## SAFETY (load-bearing)
A **commitment** consumer (quote=money, print_to_program=machine motion, inspection/fai/cmm=acceptance)
**NEVER auto-fires** — it executes ONLY when its id is in `confirmedConsumers` (explicit per-consumer
operator authorization, which also clears a `requires_confirmation` route). Default executes ONLY
`advisory` + `privacy`. Per-consumer error isolation (a throwing/failing dispatch is recorded + never
aborts the rest). Total (never throws on a malformed plan / throwing callTool / failure envelope).

## SECURITY
The `/execute` route takes a **CONTRACT, not a raw plan** — the plan is re-derived via the trusted
`prism_cad:blueprint_extract_route` (builds only KNOWN-consumer routes), so an unauthenticated caller can
NEVER inject an arbitrary `dispatcher:action`. The error branch no longer surfaces the raw dispatcher
failure envelope (per-file P2 fix).

## THE OPEN SEAM (R12 honest) — payload→param adaptation is the NEXT unit
The executor passes `route.payload` (from the router CONSUMERS table) VERBATIM to the action. 3-of-3 arm C
found several router payloads do NOT match the real action params, so an advisory consumer **silently
no-ops while being recorded as `executed`**:
- `spc_calculate`: router payload `{dimensions}` vs action reads `params.measurements/usl/lsl`
  (`qualityDispatcher.ts:104`).
- `material_resolve`: router payload `{title_block, notes}` vs action reads `params.material`
  (`businessDispatcher.ts:3150`).
- `feature_recognize`: router payload `{dimensions, gdt}` vs `engine.recognize(params)` expecting geometry
  (`cadDispatcher.ts:808`).
The router's own doc already acknowledged this ("the app route adapts these to the action's exact params").
This is **confined to advisory/privacy at runtime** (commitments are confirmation-gated + human-reviewed),
so the safety posture holds — but `executed` means "dispatched", not "produced a useful result". **NEXT
UNIT (`U-XRAY-EXECUTOR-PAYLOAD-ADAPT`):** align each CONSUMERS-table payload to its real action params (the
survey's Part C — read all ~20 action signatures), + validate one real round-trip per consumer. The failed
assessment Workflow (autocompact thrashing) would have produced this adaptation map.

Wiki [[blueprint-vision-app-integration-plan-2026-06-23]] (the end-to-end execution layer).
