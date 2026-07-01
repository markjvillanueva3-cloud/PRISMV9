---
type: "chat-session"
source: "claude-code-cli"
session_id: "621b40e6-642b-48d2-bd0d-2c75bf77af44"
title: "Focused review of an EXTENSION to an already-vetted PRISM unit (U-XRAY-EXTRACT-R"
date: "2026-06-24"
first_ts: "2026-06-24T13:04:09.773Z"
last_ts: "2026-06-24T13:07:44.877Z"
cwd: "H:\\prism\\mcp-server"
messages: 57
user_msgs: 23
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a4ec6c344fb88af4a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Focused review of an EXTENSION to an already-vetted PRISM unit (U-XRAY-EXTRACT-R

> **claude-code-cli** | 2026-06-24 | 57 msgs (23 user / 34 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a4ec6c344fb88af4a.jsonl`

## Transcript

### User | 2026-06-24T13:04:09.773Z

Focused review of an EXTENSION to an already-vetted PRISM unit (U-XRAY-EXTRACT-ROUTER machining-prep expansion, slot xray). The file H:/prism/mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts was previously 2-arm-reviewed (PASS); this change adds 4 new ConsumerSpec entries to its data-driven CONSUMERS table: stock_optimize (prism_business:stock_size_optimize), fixture_design (prism_calc:fixture_design_recommend), tool_select (prism_calc:tool_select_recommend), speed_feed (prism_calc:sfc_calculate) — all kind:"advisory".

Read the CONSUMERS table in blueprintExtractionRouter.ts END-TO-END + the updated tests (H:/prism/mcp-server/src/__tests__/blueprintExtractionRouter.test.ts, H:/prism/mcp-server/src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts). Grade PASS/FAIL with P0/P1/P2 + file:line.

Verify: (a) the 4 new dispatcher actions are real + on the named dispatcher (grep stock_size_optimize=businessDispatcher, fixture_design_recommend/tool_select_recommend/sfc_calculate=calcDispatcher/prism_calc — confirm none phantom). (b) The kind="advisory" classification is DEFENSIBLE: these are recommendation/calculation engines the operator reviews before the gated COMMITMENT (the program). Is it correct that NONE of them should be a confirm-gated "commitment" consumer? Consider especially fixture_design (workholding is safety-relevant) — but note it only RECOMMENDS; the actual clamping/setup is the human commitment, and print_to_program is already the gated commitment. Flag if you believe any of the 4 should be commitment (confirm-gated) rather than advisory. (c) eligibility rules sensible: stock/fixture/tool require dims>0 (part envelope / feature geometry); speed_feed requires material (the sfc primary input). (d) the test reference-value updates are CORRECT (consumer count 7->11; the summary counts in the high-trust / confirm-gate / empty / gd&t-only / material-only / adversarial cases). Recompute a couple by hand to confirm. Read-only; cite file:
... [+5 chars truncated]

### Assistant | 2026-06-24T13:04:12.762Z

I'll review this extension to the blueprintExtractionRouter. Let me start by reading the key files end-to-end.

### Assistant | 2026-06-24T13:04:13.246Z

[tool_use: Read]

### Assistant | 2026-06-24T13:04:14.182Z

[tool_use: Read]

### User | 2026-06-24T13:04:14.295Z

[tool_result] 1	/**
2	 * blueprintExtractionRouter -- the executable "apply this extraction to ALL prism features" backbone.
3	 *
4	 * WHY (blueprint-vision-app-integration-plan-2026-06-23): xray owns a versioned, mm-canonical
5	 * `BlueprintExtractionContract` (the stable shape app consumers bind to). The contract NORMALIZES a
6	 * single part's extraction, but nothing turned it into ACTION: "this part has dim
... [+19369 chars truncated]

### Assistant | 2026-06-24T13:04:14.331Z

[tool_use: Read]

### User | 2026-06-24T13:04:15.100Z

[tool_result] 1	/**
2	 * Tests for blueprintExtractionRouter -- the "apply extraction to ALL prism features" fan-out.
3	 *
4	 * Reference-value + invariant tests (R9 -- a test must FAIL when the routing logic changes):
5	 *  - eligibility per consumer is exercised against the EXACT field it depends on
6	 *  - the commitment-consumer confirm-gate (quote/program/inspection) blocks on a below-floor field
7	 *  - a
... [+13765 chars truncated]

### User | 2026-06-24T13:04:15.269Z

[tool_result] 1	/**
2	 * cadDispatcher.blueprintExtractRoute.test.ts -- round-trip wire test for the
3	 * `blueprint_extract_route` action (U-XRAY-EXTRACT-CONSUMER-ROUTER). Proves the full app chain THROUGH
4	 * prism_cad: a producer extraction -> `blueprint_extract_contract` (versioned contract) ->
5	 * `blueprint_extract_route` (the fan-out plan: which prism features can consume it, with confirm-gates).
6	 * 
... [+6797 chars truncated]

### Assistant | 2026-06-24T13:04:18.140Z

Now let me verify the 4 new dispatcher actions are real and on the named dispatchers. This is the most important correctness check.

### Assistant | 2026-06-24T13:04:19.095Z

[tool_use: Grep]

### Assistant | 2026-06-24T13:04:20.035Z

[tool_use: Grep]

### User | 2026-06-24T13:04:20.907Z

[tool_result] src\schemas\businessActionSchemas.ts:1114:const stock_size_optimize = z.object({
src\schemas\businessActionSchemas.ts: WARNING: stopped searching binary file after match (found "\0" byte around offset 86792)
src\engines\blueprint-vision\blueprintExtractionRouter.ts:238:    action: "stock_size_optimize",
src\routes\quote.ts:249:  router.post("/stock-optimize", quotePost(callTool, "stock_size_optimi
... [+563 chars truncated]

### Assistant | 2026-06-24T13:04:20.979Z

[tool_use: Grep]

### User | 2026-06-24T13:04:21.741Z

[tool_result] src\schemas\calcActionSchemas.ts:2111:  fixture_design_recommend: z.object({
src\engines\blueprint-vision\blueprintExtractionRouter.ts:254:    action: "fixture_design_recommend",
src\__tests__\blueprintExtractionRouter.test.ts:131:    expect(routeById(plan, "fixture_design")).toMatchObject({ dispatcher: "prism_calc", action: "fixture_design_recommend", kind: "advisory" });
src\tools\dispatchers\ca
... [+248 chars truncated]

### Assistant | 2026-06-24T13:04:21.843Z

[tool_use: Grep]

### User | 2026-06-24T13:04:22.753Z

[tool_result] src\data\academy\course-33-material-machining-atlas.ts:539:    prismDispatcherActions: ["material_get", "tool_select_recommend"],
src\routes\pipeline.ts:60:      const result = await callTool("prism_calc", "tool_select_recommend", {
src\engines\blueprint-vision\blueprintExtractionRouter.ts:270:    action: "tool_select_recommend",
src\schemas\calcActionSchemas.ts:1427:  tool_select_recommend: z.obj
... [+473 chars truncated]

### User | 2026-06-24T13:04:23.843Z

[tool_result] src\routes\sfc.ts:23:      const result = await callTool("prism_product", "sfc_calculate", req.body);
src\schemas\productActionSchemas.ts:29:const sfc_calculate = z.object({
src\schemas\productActionSchemas.ts:380:  sfc_calculate,
src\engines\blueprint-vision\blueprintExtractionRouter.ts:286:    action: "sfc_calculate",
src\__tests__\blueprintExtractionRouter.test.ts:133:    expect(routeById(plan,
... [+3080 chars truncated]

### Assistant | 2026-06-24T13:04:29.069Z

Important finding emerging on `sfc_calculate`. The router declares dispatcher `prism_calc` action `sfc_calculate`, but the grep shows `sfc_calculate` lives on `calcDispatcher.ts:9212` (prism_calc) AND on `productDispatcher.ts` (prism_product). Let me verify the actual dispatcher registration names and confirm each action is truly on the dispatcher the router names. The dispatcher tool name (e.g. "prism_calc") is registered separately from the file name. Let me check the actual `tool(` registration names and the case handlers.

### Assistant | 2026-06-24T13:04:30.468Z

[tool_use: Bash]

### Assistant | 2026-06-24T13:04:31.854Z

[tool_use: Bash]

### User | 2026-06-24T13:04:34.927Z

[tool_result] 1312:export function registerCalcDispatcher(server: any): void {
1313:  server.tool(

### User | 2026-06-24T13:04:36.248Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-24T13:04:38.973Z

Let me read the actual tool registration name strings in both dispatchers.

### Assistant | 2026-06-24T13:04:40.387Z

[tool_use: Read]

### Assistant | 2026-06-24T13:04:41.385Z

[tool_use: Bash]

### User | 2026-06-24T13:04:45.420Z

[tool_result] 1312	export function registerCalcDispatcher(server: any): void {
1313	  server.tool(
1314	    "prism_calc",
1315	    "Manufacturing calculations: cutting force, tool life, speed/feed, power, G-code, tolerance, optimization, reports, campaigns. Use 'action' param.",
1316	    {
1317	      action: z.enum(ACTIONS),
1318	      params: z.record(z.string(), z.any()).optional()
1319	    },

### User | 2026-06-24T13:04:51.914Z

[tool_result] 1624:  server.tool(
---NEXT LINES---
1624:  server.tool(
1625-    "prism_business",

### Assistant | 2026-06-24T13:04:59.691Z

Confirmed:
- `prism_calc` = `calcDispatcher.ts` registration (line 1314), and `fixture_design_recommend` (case at 4110), `tool_select_recommend` (case at 2542), `sfc_calculate` (case at 9212) are all in the ACTIONS enum AND have case handlers in calcDispatcher.
- `prism_business` = `businessDispatcher.ts` registration (line 1625), and `stock_size_optimize` is in its enum (763) + case handler (3185).

All 4 actions are real and on the correct named dispatcher. None are phantom. The `sfc_calculate` action exists on BOTH `prism_calc` (calcDispatcher) and `prism_product` (productDispatcher) — the router chose `prism_calc`, which is valid. Let me confirm the case handler in calcDispatcher for `sfc_calculate` is a real handler (not a stub/alias) and check the enum membership cleanly.

### Assistant | 2026-06-24T13:05:00.659Z

[tool_use: Read]

### Assistant | 2026-06-24T13:05:01.336Z

[tool_use: Read]

### User | 2026-06-24T13:05:01.628Z

[tool_result] 9205	            const p = params as ValidatedParams;
9206	            banditParameterOptimizerEngine.updateReward(p.armId, p.reward, p.context);
9207	            result = { updated: true };
9208	            break;
9209	          }
9210	
9211	          // -- SFC: Surface Finish Calculation (CAM-EXHAUST-MS0) --
9212	          case "sfc_calculate": {
9213	            const { SFCCalculateEngine } = a
... [+1358 chars truncated]

### User | 2026-06-24T13:05:02.243Z

[tool_result] 4108	
4109	          // ── Batch 13: Workholding & Fixture ────────────────────────
4110	          case "fixture_design_recommend": {
4111	            const { fixtureDesignEngine } = await import("../../engines/FixtureDesignEngine.js");
4112	            result = fixtureDesignEngine.recommend(
4113	              { shape: params.shape ?? "prismatic", length_mm: params.length_mm ?? 100, width_mm: par
... [+847 chars truncated]

### Assistant | 2026-06-24T13:05:08.698Z

Both are real handlers wiring to real engines (`SFCCalculateEngine.calculate`, `fixtureDesignEngine.recommend`). Now an important note: the SFC interpretation. The router's comment (line 282-283) says `sfc_calculate` computes "speeds/feeds from the extracted material" but the calcDispatcher `sfc_calculate` is **Surface Finish Calculation** (SFC = Surface Finish, per comment at 9211 "SFC: Surface Finish Calculation" and engine `SFCCalculateEngine` which "PREDICTS Ra from cutting params"). This is a potential semantic mismatch — "SFC" here means Surface Finish, NOT Speed/Feed Calculator. Let me verify what `SFCCalculateEngine` actually does and whether the router's "speeds/feeds computable" reason is accurate.

### Assistant | 2026-06-24T13:05:09.380Z

[tool_use: Read]

### User | 2026-06-24T13:05:10.279Z

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
... [+2004 chars truncated]

### Assistant | 2026-06-24T13:05:21.588Z

This is a significant finding. The `prism_calc:sfc_calculate` action that the router targets for the `speed_feed` consumer is **`SFCCalculateEngine` = Surface Finish Calculation** (predicts Ra/Rz/Rt surface roughness), NOT a speeds-and-feeds calculator. The router's `speed_feed` consumer:
- consumer id: `"speed_feed"`
- reason: `material "${mat}" -> speeds/feeds computable`
- payload: `{ material, dimensions, surface_finishes }`

But `sfc_calculate` here computes surface finish, and crucially its required inputs (`feedRate`, `cuttingSpeed`, `depthOfCut`, `operation`) are exactly the speed/feed PARAMETERS that the router does not supply — it supplies only `material`. Also `SFCInputSchema.material` is a strict enum (`aluminum|steel|...`) while the router passes the raw extracted string (e.g. `"4140 steel"`), which would fail validation.

Let me check whether there is a different intended "speed-feed calculator" action and what the task author meant. The task brief itself says "sfc_calculate" is the speed/feed. Let me check the `prism_product` sfc and whether the broader codebase treats `sfc_calculate` as "Speed Feed Calculator" anywhere (the SFC page is the "SpeedFeed Calculator").

### Assistant | 2026-06-24T13:05:22.471Z

[tool_use: Bash]

### Assistant | 2026-06-24T13:05:23.914Z

[tool_use: Bash]

### User | 2026-06-24T13:05:34.346Z

[tool_result] 5: * unified product workflows. Each product (SFC, PPG, ShopManager, ACNC)
8: * MS0: Speed & Feed Calculator (SFC) — 10 actions
306:export type SFCAction =
362:export type ProductAction = SFCAction | PPGAction | ShopAction | ACNCAction;
366:export interface SFCInput {
383:export interface SFCResult {
438:export interface SFCCompareResult {
455:export interface SFCOptimizeResult {
468:// (src/physi
... [+910 chars truncated]

### User | 2026-06-24T13:05:35.844Z

[tool_result] src/engines/ProductEngine.ts:8: * MS0: Speed & Feed Calculator (SFC) — 10 actions
src/engines/ProductEngine.ts:293:    description: "Speed-and-feed UI calculation bridge: parameter binding, unit conversion, and recommendation display logic",
src/engines/ProductEngine.ts:725:  const sfResult: SpeedFeedResult = calculateSpeedFeed({
src/engines/ProductEngine.ts:1232:        product: "Speed & Feed Cal
... [+1186 chars truncated]

### Assistant | 2026-06-24T13:05:43.447Z

This confirms the finding clearly. There are **two distinct meanings of "SFC"** in the codebase:

1. **`prism_calc:sfc_calculate` → `SFCCalculateEngine`** = **Surface Finish Calculation** (predicts Ra/Rz/Rt roughness). Header line 2: "Surface Finish Calculation". Comment at calcDispatcher:9211: "SFC: Surface Finish Calculation".
2. **`prism_product:sfc_calculate` → `ProductEngine` SFC** = **Speed & Feed Calculator** (line 8: "Speed & Feed Calculator (SFC)", line 725 `calculateSpeedFeed(...)`). This is oscar's saleable Speed/Feed product.

The router's `speed_feed` consumer wants "speeds/feeds computable" from material — which is the **`prism_product`** semantics, NOT the **`prism_calc`** semantics. The router wired it to `prism_calc:sfc_calculate` which is the Surface Finish engine. Let me confirm the `prism_product` registration name and that `sfc_calculate` there is the speed/feed one, to nail down the recommended fix.

### Assistant | 2026-06-24T13:05:44.864Z

[tool_use: Read]

### Assistant | 2026-06-24T13:05:45.319Z

[tool_use: Read]

### User | 2026-06-24T13:05:45.909Z

[tool_result] 707	function sfcCalculate(params: SFCInput): { result: SFCResult } | { error: string } {
708	  const startTime = Date.now();
709	  const tier = params.tier ?? "pro";
710	
711	  // Resolve material
712	  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);
713	
714	  // Defaults
715	  const toolMat = params.tool_material ?? "Carbide";
716	  const toolDiam =
... [+1464 chars truncated]

### User | 2026-06-24T13:05:46.280Z

[tool_result] 100	  ...PPG_ACTIONS,
101	  ...SHOP_ACTIONS,
102	  ...ACNC_ACTIONS,
103	] as const;
104	
105	// ============================================================================
106	// KEY VALUE EXTRACTOR (for slim responses)
107	// ============================================================================
108	
109	function productExtractKeyValues(action: string, result: any): Record<string, any> {
1
... [+854 chars truncated]

### Assistant | 2026-06-24T13:06:09.986Z

Definitive confirmation. The `prism_product:sfc_calculate` (ProductEngine) IS the **Speed & Feed Calculator** — it returns `cutting_speed`, `spindle_speed`, `feed_per_tooth`, `power`, `tool_life` (the speeds/feeds the router's `speed_feed` consumer describes). The `prism_calc:sfc_calculate` (SFCCalculateEngine) is **Surface Finish** (Ra/Rz/Rt).

The router's `speed_feed` consumer (reason "speeds/feeds computable", eligibility on `material` only) is wired to the WRONG `sfc_calculate` — `prism_calc` (surface finish) instead of `prism_product` (speed/feed). This is a real consumer-intent/target mismatch.

Now let me verify the test reference-value updates by hand. Let me confirm the consumer count and recompute key summary cases. First, count consumers in the CONSUMERS table and confirm which are commitment.

The CONSUMERS table (lines 160-355), in order:
1. redact (privacy)
2. material_resolve (advisory)
3. feature_recognize (advisory)
4. cad_reconstruct (advisory)
5. stock_optimize (advisory) — NEW
6. fixture_design (advisory) — NEW
7. tool_select (advisory) — NEW
8. speed_feed (advisory) — NEW
9. quote (commitment)
10. print_to_program (commitment)
11. inspection_plan (commitment)

That is 11 total (7 original + 4 new). Commitment set = {quote, print_to_program, inspection_plan} = 3. Now let me hand-verify the two most load-bearing reference cases.

**Case A — "confirm-gate on below-floor dimensions" (test lines 150-188):** Contract has 3 dims all `needs_confirm`, 1 GD&T `needs_confirm`, title_block `{customer: "TOPURA", material: "6061-T6"}`.

Eligibility per consumer (dims=3>0, customer present, material present):
- redact: customer present → eligible
- material_resolve: material present → eligible
- feature_recognize: 3 dims → eligible
- cad_reconstruct: 3 dims → eligible
- stock_optimize: 3 dims → eligible
- fixture_design: 3 dims → eligible
- tool_select: 3 dims → eligible
- speed_feed: material present → eligible
- quote: dims>0 → eligible
- print_to_program: 
... [+2337 chars truncated]

### Assistant | 2026-06-24T13:06:11.404Z

[tool_use: Bash]

### Assistant | 2026-06-24T13:06:12.651Z

[tool_use: Bash]

### User | 2026-06-24T13:06:31.555Z

[tool_result] EXIT: 1

### User | 2026-06-24T13:06:37.211Z

[tool_result] 281:  "blueprint_extract_contract",
283:  "blueprint_extract_route",
3520:          case "blueprint_extract_contract": {
3531:                new Error("blueprint_extract_contract requires EXACTLY ONE producer: fused (VLM ensemble output) OR drawing (Drawing2DExtractionEngine result)"),
3552:          case "blueprint_extract_route": {
3555:            // blueprint_extract_contract -> this), return
... [+411 chars truncated]

### Assistant | 2026-06-24T13:06:51.215Z

No `.only`/`.skip`/`toBeDefined()` stubs (exit 1 = no matches). The `blueprint_extract_route` action is properly in the z.enum (line 283) with a real case handler (3552), the contract-validation guard (3562/3570), and the lazy-imported router call (3576). The dispatcher wiring is intact. Let me read the dispatcher handler body to confirm the route action is unchanged by this extension (it shouldn't be — the extension is data-only in the CONSUMERS table) and there's no commitment/advisory leak.

### Assistant | 2026-06-24T13:06:52.177Z

[tool_use: Read]

### User | 2026-06-24T13:06:53.105Z

[tool_result] 3552	          case "blueprint_extract_route": {
3553	            // U-XRAY-EXTRACT-CONSUMER-ROUTER -- the "apply this extraction to ALL prism features"
3554	            // fan-out. Given a VALIDATED BlueprintExtractionContract (the caller chains
3555	            // blueprint_extract_contract -> this), return the routing plan: which downstream prism
3556	            // features (quote / print-to-p
... [+1986 chars truncated]

### Assistant | 2026-06-24T13:07:01.894Z

The dispatcher handler is clean and unchanged by this extension (validates contract, then routes). The handler's doc comment (line 3556-3557) lists the 7 original consumers and was NOT updated to mention the 4 new machining-prep consumers — a minor doc-staleness P2, not a functional issue.

Now let me address the kind-classification question (part b/c of the task) and assess whether `fixture_design` should be commitment. The task explicitly asks me to weigh this. The router's own doctrine (lines 43-52) defines commitment as quote (money) / program (machine motion) / inspection (acceptance) — irreversible downstream commitments on the extracted *fields*. `fixture_design_recommend` only RECOMMENDS workholding; the actual clamping is a human action, and `print_to_program` (the gated commitment) is already confirm-gated. The advisory classification is defensible and consistent with the table's stated rule. The same logic holds for stock/tool/speed_feed — all recommendation/calculation engines reviewed before the program. I agree none of the 4 should be commitment.

Let me do a final check on the eligibility rule sensibility and the `material` enum-mismatch risk for the payloads, and confirm `surfaceFinishes` helper is actually used/defined (the speed_feed payload references it).

### Assistant | 2026-06-24T13:07:02.601Z

[tool_use: Bash]

### User | 2026-06-24T13:07:08.507Z

[tool_result] 123:function surfaceFinishes(c: BlueprintExtractionContract): ContractCallout[] {
124:  return Array.isArray(c?.surface_finishes) ? c.surface_finishes : [];
294:        payload: { material: mat, dimensions: dims(c), surface_finishes: surfaceFinishes(c) },
405:    nNeedsConfirm(surfaceFinishes(contract));

### Assistant | 2026-06-24T13:07:44.877Z

`surfaceFinishes` is defined (123) and used in the speed_feed payload (294) and the n_needs_confirm rollup (405). No undefined-reference issue.

I have completed an end-to-end review of all relevant files. The payloads carry raw contract subsets that "the app route adapts to the action's exact params" (documented at line 77-78 and 367-368), so the `material` enum-strictness of the downstream engines is an app-adapter concern, not a router defect — except that it underscores the consumer-target correctness issue: the `speed_feed` payload of `{material, dimensions, surface_finishes}` is shaped for a speed/feed engine, but the wired `prism_calc:sfc_calculate` is a surface-finish engine expecting `feedRate`/`cuttingSpeed`/`depthOfCut`.

Here is my verdict.

---

VERDICT: FAIL

summary: The 4 new ConsumerSpec entries are all real, non-phantom dispatcher actions correctly attributed to their named dispatchers for stock_optimize, fixture_design, and tool_select. The advisory kind-classification is correct and defensible (including fixture_design — it only recommends; the gated commitment is print_to_program). However, the `speed_feed` consumer is wired to the WRONG `sfc_calculate`: it targets `prism_calc:sfc_calculate` which is the **Surface Finish** engine (predicts Ra/Rz/Rt), not the **Speed & Feed Calculator** the consumer's id/reason/payload describe — that one is `prism_product:sfc_calculate`. The test reference-value updates (7->11, all summary counts) are arithmetically correct and I re-verified the two load-bearing cases by hand.

findings:
- [P1] `H:/prism/mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts:284-286` -- The `speed_feed` consumer (id "speed_feed", reason "speeds/feeds computable", payload `{material, dimensions, surface_finishes}`) targets `dispatcher:"prism_calc"`, `action:"sfc_calculate"`. But `prism_calc:sfc_calculate` resolves to `SFCCalculateEngine` = **Surface Finish Calculation** (`SFCCalculateEngine.ts:2` "Surface Finish Cal
... [+3856 chars truncated]
