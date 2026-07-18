---
type: "chat-session"
source: "claude-code-cli"
session_id: "efd1e0c2-2259-4fc4-b09d-8c6af113ed16"
title: "Independent review of a 2-file SFC engine fix (slot:oscar, U-SFC-PAGE-DEPTH-WIDT"
date: "2026-06-25"
first_ts: "2026-06-25T01:47:06.125Z"
last_ts: "2026-06-25T01:49:56.538Z"
cwd: "H:\\prism\\mcp-server"
messages: 72
user_msgs: 29
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism/efd1e0c2-2259-4fc4-b09d-8c6af113ed16/subagents/agent-a0fc91d6f9cf90c25.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent review of a 2-file SFC engine fix (slot:oscar, U-SFC-PAGE-DEPTH-WIDT

> **claude-code-cli** | 2026-06-25 | 72 msgs (29 user / 43 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/efd1e0c2-2259-4fc4-b09d-8c6af113ed16/subagents/agent-a0fc91d6f9cf90c25.jsonl`

## Transcript

### User | 2026-06-25T01:47:06.125Z

Independent review of a 2-file SFC engine fix (slot:oscar, U-SFC-PAGE-DEPTH-WIDTH). Weight toward SILENT BREAKAGE + consumer impact. Grade PASS or FAIL + file:line. See `git -C H:/prism diff -- mcp-server/src/engines/ProductEngine.ts mcp-server/src/__tests__/sfc-page-depth-width-honored.test.ts`.

CHANGE: ProductEngine's SFCInput now declares `depth?`/`width?` as aliases for `depth_of_cut`/`width_of_cut`, and 4 functions (sfcCalculate line ~727, sfcCompare ~903, sfcOptimize ~990, sfcSafety ~1176) now read `params.depth_of_cut ?? params.depth ?? toolDiam*0.5`. Reason: the SFC web page posts `depth`/`width` and they were being silently dropped (engine used toolDiam*0.5).

HUNT:
- CONSUMER COLLISION (the main risk): trace EVERY caller of productSFC("sfc_calculate"/"sfc_compare"/"sfc_optimize"/"sfc_safety", ...) and ProductEngine sfc* functions across the repo (dispatchers, routes, other engines, tests). Does any caller already pass a `depth` field that means something different (Z-depth, total depth, hole depth, pocket depth)? If yes -> the alias hijacks it (P0/P1). Pay attention to the route src/routes/sfc.ts and productDispatcher.
- Did adding `depth?`/`width?` to SFCInput break any other code that spreads/destructures SFCInput or has an exhaustive key check?
- Were all 4 SFCInput-reading sites updated, or is there a 5th `depth_of_cut ?? toolDiam` left inconsistent? (grep ProductEngine for `depth_of_cut ??`.)
- Does the fix interact badly with the imperial/unit handling or the recent depth-related fixes (engagement-arc, deflection-Vc-lever)?
- Test integrity: real asserts, no skip/only; does the precedence test actually pin canonical-wins?
Report concisely with severity; PASS or FAIL.

### Assistant | 2026-06-25T01:47:09.139Z

I'll investigate this SFC engine fix, focusing on silent breakage and consumer collision risks. Let me start by reading the diff and the relevant files.

### Assistant | 2026-06-25T01:47:10.613Z

[tool_use: Bash]

### Assistant | 2026-06-25T01:47:11.200Z

[tool_use: Read]

### User | 2026-06-25T01:47:11.347Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### User | 2026-06-25T01:47:12.518Z

[tool_result] 1	/**
2	 * PRISM MCP Server — SFC (Speed & Feed Calculator) Routes
3	 * Consolidates existing SFC endpoints from index.ts into a proper router
4	 */
5	import { Router } from "express";
6	import { requireFields } from "../middleware/validation.js";
7	import { requireTier } from "../middleware/tierGate.js";
8	import { recordFeatureUse } from "../middleware/attachUserPlan.js";
9	import type { CallToo
... [+2913 chars truncated]

### Assistant | 2026-06-25T01:47:17.665Z

I have the diff cached. Let me read the actual ProductEngine SFC functions and trace all consumers in parallel.

### Assistant | 2026-06-25T01:47:19.556Z

[tool_use: Bash]

### Assistant | 2026-06-25T01:47:20.827Z

[tool_use: Grep]

### User | 2026-06-25T01:47:29.170Z

[tool_result] warning: in the working copy of 'mcp-server/src/engines/ProductEngine.ts', CRLF will be replaced by LF the next time Git touches it
diff --git a/mcp-server/src/engines/ProductEngine.ts b/mcp-server/src/engines/ProductEngine.ts
index 3953184a88..192e097fc3 100644
--- a/mcp-server/src/engines/ProductEngine.ts
+++ b/mcp-server/src/engines/ProductEngine.ts
@@ -373,6 +373,11 @@ export interface SFCInpu
... [+3103 chars truncated]

### User | 2026-06-25T01:47:30.976Z

[tool_result] 727:  const ap = params.depth_of_cut ?? params.depth ?? toolDiam * 0.5;
728:  const ae = params.width_of_cut ?? params.width ?? toolDiam * 0.5;
901:  const ap = params.depth_of_cut ?? params.depth ?? toolDiam * 0.5;
902:  const ae = params.width_of_cut ?? params.width ?? toolDiam * 0.5;
988:  const ap = params.depth_of_cut ?? params.depth ?? toolDiam * 0.5;
989:  const ae = params.width_of_cut ?? 
... [+573 chars truncated]

### Assistant | 2026-06-25T01:47:33.989Z

Critical finding emerging at lines 2250-2258 and 2619-2684: `params.depth` and `params.width` are ALREADY consumed by ProductEngine for a DIFFERENT meaning. Let me investigate that collision in depth, and trace all callers.

### Assistant | 2026-06-25T01:47:35.410Z

[tool_use: Read]

### Assistant | 2026-06-25T01:47:35.815Z

[tool_use: Read]

### User | 2026-06-25T01:47:36.624Z

[tool_result] 2230	  return { feature, depth, width, length, diameter, tolerance, finish };
2231	}
2232	
2233	/** Step 1: Feature recognition */
2234	function acncFeatureRecognition(params: Record<string, any>): any {
2235	  const description = params.description;
2236	  // If params.feature is a known feature name, treat as structured; only parse NL from description
2237	  const isStructured = !description && 
... [+3484 chars truncated]

### User | 2026-06-25T01:47:37.151Z

[tool_result] 2590	/** ACNC product dispatcher */
2591	export function productACNC(action: string, params: Record<string, any>): any {
2592	  const tier = params.tier || "free";
2593	
2594	  switch (action) {
2595	    case "acnc_get":
2596	      return {
2597	        product: "Auto CNC Programmer",
2598	        version: "1.0.0",
2599	        pipeline_steps: 7,
2600	        supported_features: Object.keys(ACNC_F
... [+5194 chars truncated]

### Assistant | 2026-06-25T01:47:42.059Z

Now I understand the ACNC `depth`/`width` usage. The critical question: do the SFC functions (`sfcCalculate`, `sfcCompare`, `sfcOptimize`, `sfcSafety`) and the ACNC functions share the same `params` object on any code path? They are separate functions, but I need to check whether the productDispatcher routes `depth`/`width` differently, and whether ACNC pipeline calls SFC functions internally passing the same params. Let me trace the dispatcher and ACNC pipeline.

### Assistant | 2026-06-25T01:47:43.474Z

[tool_use: Grep]

### User | 2026-06-25T01:47:44.780Z

[tool_result] 712:function sfcCalculate(params: SFCInput): { result: SFCResult } | { error: string } {
897:function sfcCompare(params: SFCInput): { result: SFCCompareResult } | { error: string } {
984:function sfcOptimize(params: SFCInput & { objective?: string }): { result: SFCOptimizeResult } | { error: string } {
1119:  return sfcCalculate({
1163:function sfcSafety(params: SFCInput): any {
1221:      return 
... [+464 chars truncated]

### Assistant | 2026-06-25T01:47:44.808Z

[tool_use: Grep]

### User | 2026-06-25T01:47:46.168Z

[tool_result] Found 22 files
src\engines\ProductEngine.ts
src\__tests__\sfc-page-depth-width-honored.test.ts
src\__tests__\documentExtractionRouter.test.ts
src\engines\blueprint-vision\documentExtractionRouter.ts
src\engines\blueprint-vision\blueprintExtractionRouter.ts
src\__tests__\blueprintExtractionRouter.test.ts
src\__tests__\PostProcessorPipelineEngine.kienzle-emit.test.ts
src\__tests__\sfc-jm-fleet-page-
... [+607 chars truncated]

### Assistant | 2026-06-25T01:47:52.324Z

Let me look at the SFC dispatch entry (lines 1200-1240) and the ACNC parameter calc, plus check whether ACNC ever calls into the SFC functions. The key question: are `depth`/`width` ever in the same params bag routed to BOTH ACNC and SFC. They're separate dispatcher actions (`sfc_*` vs `acnc_*`), so no single call hits both. But I must confirm the `productSFC` router and that there's no shared path. Let me also check the productDispatcher routing and the test file.

### Assistant | 2026-06-25T01:47:53.284Z

[tool_use: Read]

### User | 2026-06-25T01:47:54.133Z

[tool_result] 1200	  sfcHistory.push({
1201	    timestamp: new Date().toISOString(),
1202	    action,
1203	    input,
1204	    material: input.material ?? "unknown",
1205	  });
1206	  if (sfcHistory.length > 100) sfcHistory.shift();
1207	}
1208	
1209	// ─── Main SFC Dispatcher ────────────────────────────────────────────────────
1210	
1211	/** Product S F C.
1212	 * @param action - action string
1213	 * @param 
... [+1218 chars truncated]

### Assistant | 2026-06-25T01:47:54.222Z

[tool_use: Read]

### Assistant | 2026-06-25T01:47:54.809Z

[tool_use: Read]

### User | 2026-06-25T01:47:54.925Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\sfc-page-depth-width-honored.test.ts' was already read 40s ago in this session and is unchanged (mtime 1782351858062). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### User | 2026-06-25T01:47:55.653Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Product Dispatcher
3	 *
4	 * Routes 40 product actions to ProductEngine sub-engines.
5	 * Extracted from intelligenceDispatcher (SYS-MS1-U00).
6	 *
7	 * Sub-engines:
8	 *   productSFC  (10 actions) — Surface Finish Calculator
9	 *   productPPG  (10 actions) — Post Processor Generator
10	 *   productShop (10 actions) — Shop Manager
11	 *   productACNC (10 actions) — Ad
... [+2396 chars truncated]

### Assistant | 2026-06-25T01:48:02.434Z

Confirmed: `productSFC` (sfc_* actions) and `productACNC` (acnc_* actions) are separate dispatch paths — no single call routes `depth`/`width` to both. The ACNC `depth`/`width` usage is isolated to ACNC actions. So the alias does NOT hijack ACNC's `depth` because they never share the same invocation.

But the alias broadens the SFC schema. Let me verify two more things: (1) the schema validation — does `ACTION_PRODUCT_SCHEMAS` for sfc_* strip unknown keys or pass them through; (2) whether `sfc_safety`/`sfcQuick` callers in tests pass `depth` meaning something else; and (3) the SFCInput type collision with other consumers. Let me check the schema and the SFCCalculateEngine.

### Assistant | 2026-06-25T01:48:04.327Z

[tool_use: Grep]

### Assistant | 2026-06-25T01:48:04.743Z

[tool_use: Read]

### User | 2026-06-25T01:48:05.582Z

[tool_result] 29:const sfc_calculate = z.object({
35:  axial_depth: optPosNum,
36:  radial_depth: optPosNum,
40:}).passthrough();
46:}).passthrough();
52:}).passthrough();
57:}).passthrough();
63:}).passthrough();
69:}).passthrough();
74:}).passthrough();
76:const sfc_safety = z.object({
79:}).passthrough();
84:}).passthrough();
88:}).passthrough();
97:}).passthrough();
103:}).passthrough();
109:}).passthrough(
... [+1005 chars truncated]

### User | 2026-06-25T01:48:06.114Z

[tool_result] 1	/**
2	 * SFCCalculateEngine — Surface Finish Calculation
3	 * =================================================
4	 *
5	 * Calculates theoretical and predicted surface finish (Ra, Rz, Rt)
6	 * based on cutting parameters, tool geometry, and material properties.
7	 *
8	 * L2-P4-MS1/P0-U05 — Batch 8: Surface Finish
9	 *
10	 * @version 1.0.0
11	 */
12	
13	import { z } from "zod";
14	import { capture
... [+8927 chars truncated]

### Assistant | 2026-06-25T01:48:12.582Z

Important findings:

1. `SFCCalculateEngine.ts` is a **separate, unrelated** engine (surface finish Ra/Rz, with its own `SFCInput` type that has NO `depth`/`width` field — it uses `depthOfCut`). It's not touched by this change and shares no type with `ProductEngine.SFCInput`. No collision there.

2. The schema `sfc_calculate` at line 29-40 uses `.passthrough()` and already declares `axial_depth`, `radial_depth` (line 35-36). The new `depth`/`width` are NOT declared in the schema but `.passthrough()` lets them through to the engine. Good — no schema rejection.

Now the most important check: the schema already has `axial_depth`/`radial_depth`. Does `sfcCalculate` read those too? And critically — does the SFC web page (`SfcParams`) actually post `depth`/`width`, or `axial_depth`/`radial_depth`? Let me verify the web page's actual field names (the premise of the fix) and check the full schema block + whether there's a competing field already wired.

### Assistant | 2026-06-25T01:48:13.998Z

[tool_use: Read]

### User | 2026-06-25T01:48:15.111Z

[tool_result] 29	const sfc_calculate = z.object({
30	  material: z.string().min(1),
31	  operation: optStr,
32	  tool_diameter: optPosNum,
33	  feed_per_tooth: optPosNum,
34	  cutting_speed: optPosNum,
35	  axial_depth: optPosNum,
36	  radial_depth: optPosNum,
37	  nose_radius: optPosNum,
38	  number_of_teeth: z.number().int().positive().optional(),
39	  response_level: responseLevel,
40	}).passthrough();
41	
4
... [+1240 chars truncated]

### Assistant | 2026-06-25T01:48:15.290Z

[tool_use: Grep]

### User | 2026-06-25T01:48:16.435Z

[tool_result] web\CLAUDE.md:80:- ✗ **Fixed-pixel widths anywhere.** `min-w-[280px]` is fine; `w-[1200px]` breaks at 375px. The Calculator Page monolith (660KB) is the canonical violation — every refactored split must drop fixed widths.
web\index.html:5:    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
web\e2e\sfc-calculator.spec.ts:305:      await page.setViewportS
... [+3647 chars truncated]

### Assistant | 2026-06-25T01:48:20.528Z

I need to verify the **core premise** of the fix: does the SFC web page actually post `depth`/`width` (the claimed `SfcParams`)? The `web/` grep didn't find a `SfcParams` with `depth`/`width` fields — it found mostly viewport widths. The schema already has `axial_depth`/`radial_depth`. Let me find the actual SFC page component and its request payload to confirm what field names it sends, and check the `lib/api.ts` SFC call.

### Assistant | 2026-06-25T01:48:21.943Z

[tool_use: Grep]

### Assistant | 2026-06-25T01:48:22.888Z

[tool_use: Grep]

### User | 2026-06-25T01:48:24.811Z

[tool_result] Found 191 files
web\src\__tests__\buildSfcRequest.test.ts
web\src\pages\SfcCalculatorPage.tsx
web\src\components\sfc\buildSfcRequest.ts
web\src\types\sfc.ts
web\src\api\client.ts
web\src\data\calculatorWorkspace.ts
web\src\pages\RFQInboxPage.tsx
web\src\components\calculator\MillSurfaceFinishPanel.tsx
web\src\pages\HotelPortalPage.tsx
web\src\pages\CostEstimatorPage.tsx
web\src\__tests__\Calculato
... [+6812 chars truncated]

### User | 2026-06-25T01:48:25.938Z

[tool_result] Found 13 files
web\src\__tests__\buildSfcRequest.test.ts
web\src\pages\SfcCalculatorPage.tsx
web\src\components\sfc\buildSfcRequest.ts
web\src\components\sfc\AdvancedCharts.tsx
web\src\__tests__\advancedSpeedFeedParams.test.ts
web\src\components\sfc\advancedSpeedFeedParams.ts
web\src\components\sfc\AdvancedSpeedFeedPanel.tsx
web\src\__tests__\AdvancedSpeedFeedPanel.test.tsx
web\src\__tests__\sfc-a
... [+163 chars truncated]

### Assistant | 2026-06-25T01:48:30.850Z

The premise's `SfcParams` is in `buildSfcRequest.ts`. Critically, there are TWO distinct SFC frontend surfaces: `SfcCalculatorPage.tsx` (uses `buildSfcRequest.ts`) and `SpeedFeedPage.tsx` (uses `api/speedfeed.ts`). Let me read what fields `buildSfcRequest` actually sends, and confirm the route it hits, to validate the fix targets the right field names.

### Assistant | 2026-06-25T01:48:31.811Z

[tool_use: Read]

### Assistant | 2026-06-25T01:48:31.897Z

[tool_use: Read]

### User | 2026-06-25T01:48:32.507Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\sfc\buildSfcRequest.ts' was already read 13m ago in this session and is unchanged (mtime 1782350997638). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### User | 2026-06-25T01:48:33.092Z

[tool_result] 1	import { getRequestHeaders } from "./client";
2	import { ApiError } from "./requestCore";
3	import { assertNoEnvelopeError } from "./envelopeGuard";
4	import type {
5	  SfcCalculateRequest, SfcCalculateResult,
6	  CycleTimeRequest, CycleTimeResult,
7	  EngagementRequest, EngagementResult,
8	  DeflectionRequest, DeflectionResult,
9	  PowerTorqueRequest, PowerTorqueResult,
10	  SurfaceFinishReques
... [+3142 chars truncated]

### Assistant | 2026-06-25T01:48:38.666Z

The `api/sfc.ts` route hits `/api/v1/sfc/calculate` → `prism_product` `sfc_calculate` (matches route src/routes/sfc.ts:23). This is the right path. The `buildSfcRequest.ts` content is in my context (read 13m ago). Let me retrieve its field names from context by checking the test that validates it, and confirm whether `buildSfcRequest` posts `depth`/`width` or `axial_depth`/`radial_depth` (which the schema/engine may already read). Let me read the buildSfcRequest test + check whether sfcCalculate reads axial_depth/radial_depth anywhere.

### Assistant | 2026-06-25T01:48:40.092Z

[tool_use: Grep]

### Assistant | 2026-06-25T01:48:41.531Z

[tool_use: Grep]

### User | 2026-06-25T01:48:42.765Z

[tool_result] 38:    depth: params.depth,
39:    width: params.width,

### User | 2026-06-25T01:48:43.450Z

[tool_result] 727:  const ap = params.depth_of_cut ?? params.depth ?? toolDiam * 0.5;
728:  const ae = params.width_of_cut ?? params.width ?? toolDiam * 0.5;
764:      axial_depth: ap,
765:      radial_depth: ae,
794:    axial_depth: ap,
795:    radial_depth: ae,
901:  const ap = params.depth_of_cut ?? params.depth ?? toolDiam * 0.5;
902:  const ae = params.width_of_cut ?? params.width ?? toolDiam * 0.5;
921:  
... [+1568 chars truncated]

### Assistant | 2026-06-25T01:48:50.838Z

This is the decisive confirmation. `buildSfcRequest.ts:38-39` posts `depth: params.depth` and `width: params.width` — exactly the field names the fix now reads. The premise is VERIFIED: the page posts `depth`/`width`, and before this fix the engine dropped them (used `toolDiam*0.5`). The fix correctly wires them.

Now let me confirm:
1. The engine internally re-emits as `axial_depth`/`radial_depth` (lines 764-765 etc.) to downstream physics — so the resolved `ap`/`ae` flow correctly. Good.
2. There's NO 5th `depth_of_cut ??` site left inconsistent — the 4 grep hits (727, 901, 988, 1174) are all updated. Confirmed all 4 SFCInput-reading sites updated.

Now the precedence test integrity, and whether `buildSfcRequest` could ALSO send `depth_of_cut` (double-send causing canonical to win unexpectedly). Let me read the test file content (it's in context but let me confirm the asserts) and check the buildSfcRequest test for what else it sends.

### Assistant | 2026-06-25T01:48:51.588Z

[tool_use: Read]

### User | 2026-06-25T01:48:52.885Z

[tool_result] 1	import { describe, it, expect } from "vitest";
2	import { productSFC } from "../engines/ProductEngine.js";
3	
4	/**
5	 * Regression: the SFC web page (SfcCalculatorPage) posts the customer's cut geometry as
6	 * `depth` / `width` (the SfcParams field names), but ProductEngine.sfcCalculate read ONLY
7	 * `depth_of_cut` / `width_of_cut`, and nothing in the prism_product chain mapped the two.
8	 * 
... [+2078 chars truncated]

### Assistant | 2026-06-25T01:48:59.718Z

The test is real and well-formed: real asserts (`toBe(8)`, `toBe(4)`), precedence test correctly pins canonical-wins (`depth_of_cut:5, depth:99` → expects 5), and a load-bearing physics assertion (deeper cut → higher force, 3x). No `.skip`/`.only`. Good test integrity.

One concern with the precedence test: it asserts `res.depth_of_cut_mm`. I need to confirm `sfcCalculate` actually returns `depth_of_cut_mm` reflecting the resolved `ap` (not some unrelated default), otherwise the test could pass trivially. Let me verify the result-shape emission of `depth_of_cut_mm`/`width_of_cut_mm` and that they derive from `ap`/`ae`. Also let me run the test to confirm it actually passes (verify-before-assert), and check for any other repo consumer that passes a `depth`/`width` that means Z-depth to sfc_* actions.

### Assistant | 2026-06-25T01:49:01.127Z

[tool_use: Grep]

### Assistant | 2026-06-25T01:49:02.406Z

[tool_use: Grep]

### User | 2026-06-25T01:49:06.551Z

[tool_result] 394:  depth_of_cut_mm: number;
395:  width_of_cut_mm: number;
872:    depth_of_cut_mm: Math.round(ap * 10) / 10,
873:    width_of_cut_mm: Math.round(ae * 10) / 10,

### User | 2026-06-25T01:49:07.065Z

[tool_result] 125:    const engine = action.startsWith("sfc_") ? mod.productSFC
571:  "sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick", "sfc_materials", "sfc_tools", "sfc_formulas", "sfc_safety", "sfc_history", "sfc_get",

### Assistant | 2026-06-25T01:49:13.071Z

Confirmed: `depth_of_cut_mm: Math.round(ap * 10) / 10` (line 872) derives directly from the resolved `ap`. The test genuinely pins the wiring — it would fail if the alias were dropped (the comment notes pre-fix value was 6 = toolDiam*0.5). The test is R9-compliant.

Also note `intelligenceDispatcher.ts:125` is a SECOND dispatch path routing `sfc_*` to `productSFC` — but it calls the same `productSFC` function, so the fix covers both `prism_product` and `prism_intelligence` paths uniformly. No drift.

Now let me run the test to verify it actually passes, and do a final sweep for any OTHER repo caller that invokes `sfc_calculate`/`sfc_safety` with a `depth` field carrying a different semantic (the one residual collision risk).

### Assistant | 2026-06-25T01:49:14.031Z

[tool_use: Bash]

### Assistant | 2026-06-25T01:49:15.812Z

[tool_use: Grep]

### User | 2026-06-25T01:49:19.961Z

[tool_result] [DEBUG] [Kienzle] h=0.0812, kc=3372, Fc=1717N
[DEBUG] [Taylor] Vc=200, T=7.9 min

stderr | src/__tests__/sfc-page-depth-width-honored.test.ts > ProductEngine sfc_calculate honors the page's depth/width field names > canonical depth_of_cut/width_of_cut still work and take precedence over the aliases
[DEBUG] [Kienzle] h=0.0716, kc=3479, Fc=831N
[DEBUG] [Taylor] Vc=200, T=8.6 min

stderr | src/__test
... [+586 chars truncated]

### User | 2026-06-25T01:49:21.175Z

[tool_result] H:\prism\mcp-server\src\routes\sfc.ts-22-    try {
src\routes\sfc.ts:23:      const result = await callTool("prism_product", "sfc_calculate", req.body);
src\routes\sfc.ts-24-      \ Only meter a SUCCESSFUL calc (scrutiny P1): callTool returns {error} with
--
src\engines\blueprint-vision\blueprintExtractionRouter.ts-284-    consumer: "speed_feed",
src\engines\blueprint-vision\blueprintExtractionRou
... [+3226 chars truncated]

### Assistant | 2026-06-25T01:49:28.136Z

All 3 tests pass. The grep surfaces an important nuance worth noting but NOT a regression: `sfc_calculate` is overloaded across two dispatchers — `prism_product:sfc_calculate` (ProductEngine, speed/feed, the one being fixed) vs `prism_calc:sfc_calculate` (SFCCalculateEngine, surface finish Ra/Rz). They're already correctly disambiguated by dispatcher (confirmed by the blueprintExtractionRouter comment at lines 285-289 and calcDispatcher:9212-9213). The fix only touches ProductEngine, so the `prism_calc` surface-finish path is untouched. No collision.

The two cross-galaxy consumers (`blueprintExtractionRouter`, `documentExtractionRouter`) call `prism_product:sfc_calculate` advisorily — they pass extracted print dims. Let me do the final collision check: confirm those consumers (and any test) don't pass a `depth` field meaning hole-depth/Z-depth to sfc_calculate. Let me check what params those routers send.

### Assistant | 2026-06-25T01:49:29.098Z

[tool_use: Read]

### User | 2026-06-25T01:49:30.020Z

[tool_result] 278	        payload: { dimensions: dims(c), material: material(c) },
279	      };
280	    },
281	  },
282	  // ADVISORY: compute speeds/feeds from the extracted material (+ geometry / surface finish target)
283	  {
284	    consumer: "speed_feed",
285	    // prism_product:sfc_calculate is the Speed & Feed Calculator (ProductEngine.calculateSpeedFeed ->
286	    // vc/rpm/fz/power/tool_life). NOT pri
... [+1075 chars truncated]

### Assistant | 2026-06-25T01:49:33.745Z

[tool_use: Grep]

### User | 2026-06-25T01:49:34.667Z

[tool_result] No matches found

### Assistant | 2026-06-25T01:49:56.538Z

These advisory consumers send `dimensions: dims(c)` — a `dimensions` array/object, NOT a top-level `depth`/`width` field. So `params.depth`/`params.width` would be `undefined` from these consumers, and the engine correctly falls back to `depth_of_cut` or the default. No collision: the cross-galaxy consumers never set a top-level `depth`/`width` carrying a Z-depth meaning.

I have completed the full blast-radius trace. Let me summarize the consumer paths verified and render the verdict.

## Verdict

VERDICT: PASS

summary: The fix correctly wires the SFC web page's `depth`/`width` payload (verified at `buildSfcRequest.ts:38-39`) into ProductEngine's four SFC functions, replacing the silently-dropped `toolDiam*0.5` default. The feared consumer collision does not occur: the only other `params.depth`/`params.width` readers in ProductEngine are the ACNC functions, which are reached through entirely separate dispatcher actions (`acnc_*` vs `sfc_*`), so the alias never hijacks ACNC's pocket-depth semantics. All four SFCInput-reading sites were updated consistently, the precedence test genuinely pins canonical-wins, and all three tests pass against live code.

findings:
- none

Consumers and edge-paths traced (audit trail for the PASS):
- **The two `params.depth`/`params.width` semantic users** — `acncFeatureRecognition` (`ProductEngine.ts:2250-2259`, pocket/feature depth) and `acncStrategySelection`/`acnc_simulate`/`acnc_output` (`:2619`, `:2649-2650`, `:2684`). These are reached only via `acnc_*` actions through `productACNC` (`:2591`), a different switch from `productSFC` (`:1216`). No single dispatch call routes a `depth`/`width` to both, so the SFC alias cannot hijack ACNC's Z/pocket-depth meaning. **Not a collision.**
- **All 4 SFCInput-reading sites updated** — `sfcCalculate:727-728`, `sfcCompare:901-902`, `sfcOptimize:988-989`, `sfcSafety:1174-1175`. Grep for `depth_of_cut ??` returns exactly these 4 — no 5th inconsistent site. `sfcQuick` delegates to `sfcCalculate`
... [+1798 chars truncated]
