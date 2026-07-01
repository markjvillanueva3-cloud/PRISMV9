---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a6e433f-eb2c-47ab-b4d9-2bfcf5883aba"
title: "You are auditing the LAUNCH READINESS of PRISM's Speed & Feed Calculator (SFC) —"
date: "2026-06-06"
first_ts: "2026-06-06T04:30:46.141Z"
last_ts: "2026-06-06T04:42:44.780Z"
cwd: "H:\\prism"
messages: 81
user_msgs: 32
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism/9a6e433f-eb2c-47ab-b4d9-2bfcf5883aba/subagents/agent-ab1d0c53eac4d91d7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are auditing the LAUNCH READINESS of PRISM's Speed & Feed Calculator (SFC) —

> **claude-code-cli** | 2026-06-06 | 81 msgs (32 user / 49 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a6e433f-eb2c-47ab-b4d9-2bfcf5883aba/subagents/agent-ab1d0c53eac4d91d7.jsonl`

## Transcript

### User | 2026-06-06T04:30:46.141Z

You are auditing the LAUNCH READINESS of PRISM's Speed & Feed Calculator (SFC) — a saleable subscription product. I need EVIDENCE-BASED answers, not optimism. Repo root: H:/prism. Use rtk-prefixed bash, Grep, Glob (narrow paths only — repo is huge, broad globs time out).

Answer these 5 questions with concrete file paths + line evidence. If something does NOT exist, say so plainly (that's the most important kind of finding).

1. FRONTEND/PRODUCT SURFACE: Is there a user-facing SFC web UI? Look in `mcp-server/web/` (Next.js App Router — check `mcp-server/web/app/` for routes; also `mcp-server/web/src/`). Search for routes/pages/components named speed-feed, sfc, auto-speed-feed, calculator. List exact route paths and component files. Is it a real interactive calculator UI or a stub? Read 1-2 of the key files to judge.

2. BILLING/SUBSCRIPTION: Is there any subscription/billing/licensing/entitlement wiring for SFC as a paid product? Grep for: stripe, subscription, billing, entitlement, license, paywall, tier, seat. Report what exists vs what's missing for monetization.

3. DISPATCHER INVOCABILITY: Confirm the SFC dispatcher actions are actually wired and invocable. Open `mcp-server/src/tools/dispatchers/calcDispatcher.ts` and confirm the presence of these action cases: sfc_nine_axis_run, sfc_tri_vendor_batch_compare, gwizard_library_export, hsmadvisor_library_export, ultimate_speed_feed, auto_speed_feed_calc. Count total sfc_/speed_feed_ action cases.

4. TESTS GREEN: Run ONE representative SFC test file to confirm the physics core actually passes. Try: `rtk npx vitest run src/__tests__/UltimateSpeedFeedEngine.test.ts` from `H:/prism/mcp-server` (or find the actual filename via `Grep path=mcp-server/src/__tests__ pattern=SpeedFeed -l`). Report pass/fail counts. If the exact file name differs, find it first. Cap at one or two files so it's fast.

5. API/HTTP BRIDGE: Is SFC reachable over HTTP (the bridge on port 3100) for a frontend to call? Grep `mcp-server/web/` lib/a
... [+408 chars truncated]

### Assistant | 2026-06-06T04:30:58.004Z

I'll audit the SFC launch readiness systematically. Let me start by exploring the frontend surface and dispatcher, then run tests.

### Assistant | 2026-06-06T04:30:58.921Z

[tool_use: Glob]

### Assistant | 2026-06-06T04:30:59.297Z

[tool_use: Glob]

### Assistant | 2026-06-06T04:31:00.908Z

[tool_use: Grep]

### User | 2026-06-06T04:31:06.954Z

[tool_result] 824:  "stepover_calc", "ultimate_speed_feed", "tool_selection_advice",
1074:  "auto_speed_feed_calc",
1148:  "sfc_nine_axis_run",
5293:          case "ultimate_speed_feed": {
9522:          case "auto_speed_feed_calc": {
9925:          case "sfc_nine_axis_run": {

### User | 2026-06-06T04:31:20.566Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-06T04:31:21.372Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-06T04:31:25.125Z

Dispatcher cases confirmed present. Let me explore the web app structure with narrower commands and check the dispatcher more thoroughly.

### Assistant | 2026-06-06T04:31:26.561Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:31:27.717Z

[tool_use: Grep]

### User | 2026-06-06T04:31:32.758Z

[tool_result] Exit code 2
total 1188
drwxr-xr-x 1 wompu 197611      0 Apr 19 22:07 %SystemDrive%/
drwxr-xr-x 1 wompu 197611      0 Apr 19 22:07 %TEMP%/
drwxr-xr-x 1 wompu 197611      0 Jun  2 13:19 ./
drwxr-xr-x 1 wompu 197611      0 Jun  4 14:14 ../
-rw-r--r-- 1 wompu 197611   2305 Apr 12 16:33 .env.example
drwxr-xr-x 1 wompu 197611      0 Apr 19 22:07 .tmp/
-rw-r--r-- 1 wompu 197611   4474 May 12 08:16 .vite-
... [+2471 chars truncated]

### User | 2026-06-06T04:31:32.763Z

[tool_result] 30: * @param action - The calc action name (e.g. "cutting_force", "tool_life", "speed_feed")
42:    case "speed_feed":
570:  "cutting_force", "tool_life", "speed_feed", "flow_stress", "surface_finish",
824:  "stepover_calc", "ultimate_speed_feed", "tool_selection_advice",
1039:  "sfc_calculate", "sfc_feed_for_target",
1074:  "auto_speed_feed_calc",
1084:  "cam_speed_feed_bridge",
1092:  // calibra
... [+4243 chars truncated]

### Assistant | 2026-06-06T04:31:37.021Z

Important finding: The web app is **Vite**, not Next.js App Router. The `app/` dir is empty/non-existent. Note also: `sfc_tri_vendor_batch_compare`, `gwizard_library_export`, `hsmadvisor_library_export` did NOT appear in the dispatcher grep. Let me verify those and explore the actual web/src structure.

### Assistant | 2026-06-06T04:31:42.097Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:31:42.391Z

[tool_use: Grep]

### User | 2026-06-06T04:31:46.124Z

[tool_result] No matches found

### User | 2026-06-06T04:31:47.718Z

[tool_result] === src/ ===
App.tsx
__tests__/
api/
components/
contexts/
data/
features/
formulas.ts
hooks/
index.css
lib/
main.tsx
pages/
stores/
styles/
sw.ts
testing/
types/
utils/
vite-env.d.ts
workers/
=== src/pages or routes ===
A3ReportPage.tsx
AILearningDashboardPage.tsx
AdditiveQuotePage.tsx
AdminPage.tsx
AlarmPage.tsx
AuditManagerPage.tsx
BatchPlanningPage.tsx
BlueprintQuotePage.tsx
BusinessSuitePage.
... [+3729 chars truncated]

### Assistant | 2026-06-06T04:31:51.765Z

There are real SFC pages: `SfcCalculatorPage.tsx`, `SpeedFeedPage.tsx`, `CalculatorPage.tsx`, plus `components/sfc/` and `components/calculator/` dirs and a `SpeedFeedPanel.tsx`. Confirmed: `sfc_tri_vendor_batch_compare`, `gwizard_library_export`, `hsmadvisor_library_export` are **NOT** in any dispatcher (zero matches). Let me read the key SFC page and check routing, plus billing.

### Assistant | 2026-06-06T04:31:52.707Z

[tool_use: Read]

### Assistant | 2026-06-06T04:31:54.237Z

[tool_use: Bash]

### User | 2026-06-06T04:31:54.584Z

[tool_result] 1	import { useState, useCallback, useMemo, useEffect } from "react";
2	import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
3	import OperationSelector from "../components/sfc/OperationSelector";
4	import SmartToolSelector from "../components/sfc/SmartToolSelector";
5	import SmartMachineSelector from "../components/sfc/SmartMachineSelector";
6	import ParameterPanel, { type S
... [+14740 chars truncated]

### User | 2026-06-06T04:31:59.948Z

[tool_result] === components/sfc ===
AdvancedCharts.tsx
CalculationHistory.tsx
ComparisonView.tsx
CompatibilityValidator.tsx
MaterialSelector.tsx
OperationSelector.tsx
ParameterPanel.tsx
PresetManager.tsx
ResultsDisplay.tsx
SmartMachineSelector.tsx
SmartMaterialSelector.tsx
SmartToolSelector.tsx
comparison-types.ts
=== components/calculator ===
CalculatorBackendAiReview.tsx
CalculatorProgramWorkbench.tsx
Calcul
... [+776 chars truncated]

### Assistant | 2026-06-06T04:32:06.628Z

`SfcCalculatorPage.tsx` is a real, full-featured interactive calculator. Now let me check routing in App.tsx, the useSfc hook (API wiring), billing, and the HTTP bridge.

### Assistant | 2026-06-06T04:32:07.925Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:32:08.489Z

[tool_use: Read]

### User | 2026-06-06T04:32:10.415Z

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

### User | 2026-06-06T04:32:13.223Z

[tool_result] === SFC routes in App.tsx ===
48:const CalculatorPage = lazyNamed(() => import('./pages/CalculatorPage'), 'CalculatorPage');
197:const SfcCalculatorPage = lazy(() => import('./pages/SfcCalculatorPage'));
199:const SpeedFeedPage = lazy(() => import('./pages/SpeedFeedPage'));
247:              <Route path="calculator" element={lazyElement(<CalculatorPage />)} />
375:               *   /calculator   
... [+356 chars truncated]

### Assistant | 2026-06-06T04:32:16.383Z

Routes are wired (`/speed-feed-calc`, `/speed-feed`, `/calculator`). Now let me read the API client to see how it reaches the backend, and check for billing/auth + the HTTP bridge.

### Assistant | 2026-06-06T04:32:16.877Z

[tool_use: Read]

### User | 2026-06-06T04:32:17.931Z

[tool_result] 1	import { getRequestHeaders } from "./client";
2	import type {
3	  SfcCalculateRequest, SfcCalculateResult,
4	  CycleTimeRequest, CycleTimeResult,
5	  EngagementRequest, EngagementResult,
6	  DeflectionRequest, DeflectionResult,
7	  PowerTorqueRequest, PowerTorqueResult,
8	  SurfaceFinishRequest, SurfaceFinishResult,
9	  ToolLifeRequest, ToolLifeResult,
10	} from "../types/sfc";
11	
12	const SFC_
... [+1832 chars truncated]

### Assistant | 2026-06-06T04:32:18.492Z

[tool_use: Grep]

### User | 2026-06-06T04:32:22.225Z

[tool_result] mcp-server\web\src\__tests__\calculatorCatalogCoverage.test.ts:383:  it('keeps the visible Okuma calculator seats representative of the deeper catalog and legal CAM/tooling lanes', () => {
mcp-server\web\src\__tests__\calculatorCatalogCoverage.test.ts:636:  it('keeps Haas mill and lathe CAM seats categorized and selectable on Haas-legal machines', async () => {
mcp-server\web\src\__tests__\calcula
... [+5602 chars truncated]

### Assistant | 2026-06-06T04:32:26.497Z

Important: There IS billing wiring (`/billing/status`, `/billing/create-checkout`, `/billing/portal`, `/billing/purchase-post`) and a `stripe-billing` node. But note the graph flags a ghost: "MS1 — subscription billing internals (39 units, deferred)". Let me investigate the billing backend and check whether SFC is gated behind any entitlement. Then check the HTTP bridge for the `/api/v1/sfc` endpoint.

### Assistant | 2026-06-06T04:32:27.443Z

[tool_use: Grep]

### Assistant | 2026-06-06T04:32:28.986Z

[tool_use: Grep]

### User | 2026-06-06T04:32:32.507Z

[tool_result] Found 22 files
mcp-server\src\engines\business\PATHS.md
mcp-server\src\tools\dispatchers\businessDispatcher.ts
mcp-server\src\engines\BankFeedImportEngine.ts
mcp-server\src\engines\business\PRISM-NETWORKING-PLATFORM-PLAN.md
mcp-server\src\data\cimatron-cam-tips.ts
mcp-server\src\data\tribal-tips\milling-pdf-cited-tips.ts
mcp-server\src\engines\SpecHTMLCompanionEngine.ts
mcp-server\src\routes\billi
... [+607 chars truncated]

### User | 2026-06-06T04:32:34.136Z

[tool_result] Found 10 files
mcp-server\src\routes\index.ts
mcp-server\src\routes\sfc.ts
mcp-server\src\routes\openapi.ts
mcp-server\src\routes\billing.ts
mcp-server\src\__tests__\route-contract-sfc-speedfeed.test.ts
mcp-server\src\__tests__\m0-critical-routes.test.ts
mcp-server\src\__tests__\quote-routes.test.ts
mcp-server\src\__tests__\quote-compat-routes.test.ts
mcp-server\src\__tests__\m0-route-mounts.test.
... [+48 chars truncated]

### Assistant | 2026-06-06T04:32:37.198Z

There's a real `sfc.ts` route file and a `StripeBillingEngine.ts`. Let me read the SFC route (to confirm the HTTP bridge wiring) and check the billing route + whether SFC is entitlement-gated. Then run the test.

### Assistant | 2026-06-06T04:32:38.137Z

[tool_use: Read]

### system

... [1 middle messages omitted -- see raw_file] ...

### User | 2026-06-06T04:32:46.082Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Billing Routes
3	 * Stripe subscription management and post-processor purchases.
4	 *
5	 * Endpoints:
6	 *   POST /api/v1/billing/create-checkout   — create subscription checkout
7	 *   POST /api/v1/billing/portal            — customer billing portal
8	 *   POST /api/v1/billing/webhook           — Stripe webhook (no auth, raw body)
9	 *   GET  /api/v1/billing/status  
... [+6223 chars truncated]

### User | 2026-06-06T04:32:47.954Z

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

### Assistant | 2026-06-06T04:32:52.229Z

Key finding on the SFC route: `/calculate` calls `prism_product` action `sfc_calculate` — but the dispatcher grep found `sfc_calculate` in `calcDispatcher.ts` (line 9062). Let me verify the StripeBillingEngine is real vs stub (testMode), check if SFC is entitlement-gated anywhere, and confirm the SFC router is mounted in the HTTP bridge. Then run the test.

### Assistant | 2026-06-06T04:32:53.166Z

[tool_use: Read]

### Assistant | 2026-06-06T04:32:54.663Z

[tool_use: Grep]

### User | 2026-06-06T04:32:56.520Z

[tool_result] 1	/**
2	 * PRISM MCP Server — StripeBillingEngine
3	 * Stripe subscription + post-processor purchase billing.
4	 *
5	 * Spec (MIT 6.005 contract):
6	 *   - testMode: true  → all methods return mock data, zero Stripe API calls
7	 *   - testMode: false → uses Stripe SDK with STRIPE_SECRET_KEY env var
8	 *   - calculatePostProcessorPrice is pure — no I/O
9	 *   - All pricing in cents (USD × 100)
10	 
... [+2994 chars truncated]

### User | 2026-06-06T04:32:59.812Z

[tool_result] 6: * - SFC (7), SpeedFeed (8), CAD (5), CAM (4), Quality (4), Schedule (4), Cost (4)
25:import { createSfcRouter } from "./sfc.js";
79:import { createBillingRouter } from "./billing.js";
118:  app.use("/api/v1/sfc", createSfcRouter(callTool));
169:  app.use("/api/v1/billing", createBillingRouter());

### Assistant | 2026-06-06T04:33:04.424Z

I have a clear picture of the architecture. Critical nuance: SFC route `/calculate` calls `prism_product` action `sfc_calculate` (not `prism_calc`). The StripeBillingEngine defaults to **testMode (mock data, zero real Stripe calls)**. Let me verify the `prism_product` dispatcher has `sfc_calculate`, and check whether SFC routes are entitlement-gated (the `/calculate` route has NO auth middleware — important for monetization). Then run the test.

### Assistant | 2026-06-06T04:33:07.290Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:33:07.815Z

[tool_use: Bash]

### User | 2026-06-06T04:33:16.582Z

[tool_result] === sfc_calculate in productDispatcher? ===
src/tools/dispatchers/calcDispatcher.ts
src/tools/dispatchers/intelligenceDispatcher.ts
src/tools/dispatchers/productDispatcher.ts
=== Is /calculate route auth-gated? (check sfc.ts has no verifyToken) ===
6:import { requireFields } from "../middleware/validation.js";
17:  router.post("/calculate", requireFields("material", "operation"), async (req, res, 
... [+10 chars truncated]

### User | 2026-06-06T04:33:17.967Z

[tool_result] AutoSpeedFeedCalculatorEngine.test.ts
AutoSpeedFeedEngine.camx22-sync.test.ts
CAMSpeedFeedBridgeEngine.test.ts
HeatTreatmentAwareSpeedFeedEngine.test.ts
JointSpeedFeedOptimizerDispatcher.test.ts
L2P4-SFCSustain.test.ts
LatheSpeedFeedCalculatorFacadeEngine.test.ts
LatheSpeedFeedDeepLearningAdvisorEngine.test.ts
LatheSpeedFeedReasoningBridgeEngine.test.ts
LatheSpeedFeedShopAwareTuningEngine.test.ts

... [+1903 chars truncated]

### Assistant | 2026-06-06T04:33:22.464Z

Confirmed: SFC `/calculate` and ALL SFC routes have **NO auth/entitlement gating** — `requireFields` only. Anyone can call the calculator free over HTTP. The billing engine exists but is not wired to gate SFC. There's a huge SFC test surface. Let me run the two representative tests now.

### Assistant | 2026-06-06T04:33:23.704Z

[tool_use: Bash]

### User | 2026-06-06T04:36:21.555Z

[tool_result]  FAIL  src/__tests__/UltimateSpeedFeedEngine.test.ts > UltimateSpeedFeedEngine — Physics Validation > Tool Life Prediction (Taylor) > provides cost-optimized and productivity-optimized speeds
AssertionError: expected 300 to be less than or equal to 200
 ❯ src/__tests__/UltimateSpeedFeedEngine.test.ts:441:57
    439|
    440|       // Cost-optimized speed should be lower than productivity-optimi…
 
... [+1982 chars truncated]

### Assistant | 2026-06-06T04:36:25.177Z

Important finding — the representative `UltimateSpeedFeedEngine.test.ts` is FAILING. Let me get the full pass/fail counts for both files and confirm.

### Assistant | 2026-06-06T04:36:26.283Z

[tool_use: Bash]

### User | 2026-06-06T04:36:41.191Z

[tool_result]  ❯ src/__tests__/UltimateSpeedFeedEngine.test.ts (52 tests | 6 failed) 43ms
 Test Files  1 failed | 1 passed (2)
      Tests  6 failed | 71 passed (77)
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

### Assistant | 2026-06-06T04:36:45.259Z

Now let me run a second representative test to gauge whether the failure is isolated to one engine or systemic. Let me check the orchestrator (the central hub) and the route-level SFC test — the route contract passed. Let me also quickly verify the `getMaterialProfile`/`stats` failures aren't a test-data drift vs real regression by checking one more core file.

### Assistant | 2026-06-06T04:36:46.538Z

[tool_use: Bash]

### User | 2026-06-06T04:39:50.009Z

[tool_result] Command running in background with ID: b9cl8ce3a. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\9a6e433f-eb2c-47ab-b4d9-2bfcf5883aba\tasks\b9cl8ce3a.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-06T04:39:53.119Z

The watchdog flagged the prior run as slow; this one went to background. Let me wait for it.

### Assistant | 2026-06-06T04:39:54.070Z

[tool_use: Bash]

### User | 2026-06-06T04:40:45.681Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-06T04:40:49.143Z

[tool_use: Read]

### User | 2026-06-06T04:40:51.020Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-06T04:40:54.788Z

Background task still running (empty output). Let me check status.

### Assistant | 2026-06-06T04:40:55.517Z

[tool_use: Bash]

### User | 2026-06-06T04:41:31.400Z

[tool_result] 0 C:\Users\wompu\AppData\Local\Temp\claude\H--prism\9a6e433f-eb2c-47ab-b4d9-2bfcf5883aba\tasks\b9cl8ce3a.output

### Assistant | 2026-06-06T04:41:39.580Z

Output is empty — likely RTK buffering. Let me wait for the completion notification while I gather the final piece: confirming the total SFC/speed_feed action count in the dispatcher and the LandingPage/pricing surface. The two-test result I already have (route contract PASS, UltimateSpeedFeedEngine 6/52 FAIL) is sufficient evidence for the verdict.

### Assistant | 2026-06-06T04:41:40.651Z

[tool_use: Bash]

### Assistant | 2026-06-06T04:41:43.070Z

[tool_use: Bash]

### User | 2026-06-06T04:41:46.876Z

[tool_result] === count sfc_/speed_feed action cases in calcDispatcher ===
25
=== list them ===
case "auto_speed_feed_calc"
case "cam_speed_feed_bridge"
case "joint_speed_feed_optimize"
case "proven_speed_feed_aggregate_lathe"
case "proven_speed_feed_aggregate_mill"
case "proven_speed_feed_export"
case "proven_speed_feed_query"
case "sfc_calculate"
case "sfc_feed_for_target"
case "sfc_nine_axis_run"
case "sfc_o
... [+425 chars truncated]

### User | 2026-06-06T04:41:52.523Z

[tool_result] === pricing/landing surface ===
=== billing UI usage in pages ===

### Assistant | 2026-06-06T04:41:58.404Z

Key findings confirmed: 24 distinct sfc_/speed_feed action cases (grep -c counted 25 lines incl. one minor overlap). Critically: **NO billing UI consumers** — `billingCreateCheckout/billingStatus/billingPortal` are defined in the API client but called by ZERO pages/components. No pricing surface in LandingPage. The billing engine exists in isolation, not wired to any purchase flow or to gate SFC.

Let me stop the lingering background test (R14) and do a final confirmation on the 3 requested actions that were missing.

### Assistant | 2026-06-06T04:41:58.411Z

[tool_use: TaskStop]

### User | 2026-06-06T04:41:59.783Z

[tool_result] {"message":"Successfully stopped task: b9cl8ce3a (cd /h/prism/mcp-server && rtk npx vitest run src/__tests__/speed-feed-orchestrator.test.ts src/__tests__/ultimate-speed-feed.test.ts 2>&1 | grep -E \"Test Files|Tests |\\.test\\.ts \\(\" | tail -10)","task_id":"b9cl8ce3a","task_type":"local_bash","command":"cd /h/prism/mcp-server && rtk npx vitest run src/__tests__/speed-feed-orchestrator.test.ts s
... [+107 chars truncated]

### Assistant | 2026-06-06T04:42:00.963Z

[tool_use: Bash]

### User | 2026-06-06T04:42:06.397Z

[tool_result] === confirm the 3 requested-but-absent actions anywhere in dispatchers ===
CONFIRMED ABSENT from all dispatchers
=== nearest equivalents that DO exist ===
"gwizard_compare"
"gwizard_read_toolcrib"
"hsmadvisor_compare"
"hsmadvisor_read_current_state"
"sfc_baseline_compare"
"sfc_tri_compare"

### Assistant | 2026-06-06T04:42:44.780Z

All evidence gathered. The three action names in the prompt were slightly off — the real ones are `sfc_tri_compare`, `gwizard_compare`/`gwizard_read_toolcrib`, `hsmadvisor_compare`/`hsmadvisor_read_current_state` (vendor parity exists, just under different names). Here is the brutally honest, evidence-based report.

---

# SFC LAUNCH READINESS AUDIT — Evidence-Based Findings

## 1. FRONTEND/PRODUCT SURFACE — **VERDICT: EXISTS-REAL**

The web app is **Vite + React (lazy routes in `App.tsx`)**, NOT Next.js App Router — `mcp-server/web/app/` does not exist; pages live in `mcp-server/web/src/pages/`.

Three real, wired SFC routes:
- `/speed-feed-calc` → `src/pages/SfcCalculatorPage.tsx` (390 lines) — `App.tsx:386`
- `/speed-feed` → `src/pages/SpeedFeedPage.tsx` (882 lines) — `App.tsx:388`
- `/calculator` → `src/pages/CalculatorPage.tsx` (13,638 lines, "full Studio") — `App.tsx:247`

`SfcCalculatorPage.tsx` is a **genuine interactive calculator**, not a stub: smart material/operation/tool/machine selectors (12 components in `src/components/sfc/`), live calculate via `useSfcCalculate` → `sfcApi.calculate` → real HTTP POST (`SfcCalculatorPage.tsx:125-148`), unit toggle, comparison (up to 4), 100-entry history, presets, charts, PDF export (`utils/sfcReport`), and a real `CompatibilityValidator` banner. This is a saleable-quality UI.

## 2. BILLING/SUBSCRIPTION — **VERDICT: EXISTS-STUB (not wired, not gating SFC)**

Billing scaffolding exists but is **not connected to anything sellable**:
- `src/engines/StripeBillingEngine.ts` — real engine, but **defaults to `testMode: true` → returns mock data, ZERO real Stripe calls** (`StripeBillingEngine.ts:80`). Live mode requires `STRIPE_SECRET_KEY` (not set). Plan tiers defined: free/starter $29/pro $79/shop $199/enterprise $499 (`StripeBillingEngine.ts:47-53`).
- `src/routes/billing.ts` — routes exist (`/create-checkout`, `/portal`, `/webhook`, `/status`, `/purchase-post`), mounted at `routes/index.ts:169`. **The Stripe webhook sign
... [+4812 chars truncated]
