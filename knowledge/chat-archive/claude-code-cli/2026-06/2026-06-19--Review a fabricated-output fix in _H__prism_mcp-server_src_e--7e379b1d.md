---
type: "chat-session"
source: "claude-code-cli"
session_id: "7e379b1d-d716-46f2-8850-28bcd0a929a9"
title: "Review a fabricated-output fix in `H:/prism/mcp-server/src/engines/ToolROIEngine"
date: "2026-06-19"
first_ts: "2026-06-19T18:05:09.093Z"
last_ts: "2026-06-19T18:07:17.420Z"
cwd: "H:\\prism\\mcp-server"
messages: 42
user_msgs: 17
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a322a552e9ab09a14.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a fabricated-output fix in `H:/prism/mcp-server/src/engines/ToolROIEngine

> **claude-code-cli** | 2026-06-19 | 42 msgs (17 user / 25 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a322a552e9ab09a14.jsonl`

## Transcript

### User | 2026-06-19T18:05:09.093Z

Review a fabricated-output fix in `H:/prism/mcp-server/src/engines/ToolROIEngine.ts` (slot:bravo, ENGINE-AUDIT cost/quote sweep). The cost-engine sweep found `const annualParts = 5000; // default estimate` flowing into the RETURNED `total_cost_breakdown.annual_savings` ($/year figure feeding purchasing decisions). Fix (additive, 4 edits):
1. Added optional `annual_parts?: number` to `ToolROIInput`.
2. Added module constant `DEFAULT_ANNUAL_PARTS = 5000` (before the class).
3. `annualPartsIsDefault = !(input.annual_parts && input.annual_parts > 0)`; `annualParts = annualPartsIsDefault ? DEFAULT_ANNUAL_PARTS : input.annual_parts!`.
4. The `annual_savings` AtomicValue `source` string now says "ASSUMED ... default; pass annual_parts" when defaulted, else the real "Savings over N parts/year".

Test `src/__tests__/ToolROIEngine.test.ts` (7 tests, ALL PASS, tsc clean). ToolROIEngine is dispatcher-wired (businessDispatcher + calcDispatcher).

Weighted toward silent breakage / correctness:
1. ADDITIVE + non-breaking? `annual_parts` optional; `ToolROIResult.annual_savings` stays an AtomicValue (only the `source` string text changed); existing callers omitting it get the same 5000-based VALUE plus the honest label. Any consumer that asserts an exact `source` string or breaks? (grep consumers of annual_savings / the dispatcher mapping — does businessDispatcher/calcDispatcher pass `annual_parts` through, or hand-map ToolROIInput? if hand-mapped, is the field reachable? note honestly if not.)
2. Guard `input.annual_parts && input.annual_parts > 0` rejects 0/negative/NaN before the `!` non-null deref — correct?
3. TEST INTEGRITY (R9): the description assertions (ASSUMED/default/5000 vs 8000) + linearity (20000 ≈ 4×5000 when savings>0) + monotonic — real, fail-on-revert? Note the linearity assert is guarded by `savings > 0` — is that an acceptable guard or does it risk a vacuous pass (does the test's current_tool actually produce savings>0)? Verify by reasoning about the cost model.
... [+275 chars truncated]

### Assistant | 2026-06-19T18:05:13.413Z

I'll trace the ToolROIEngine fix end-to-end: the 4 edit sites, the test, and the dispatcher mapping. Let me start by reading the core files in parallel.

### Assistant | 2026-06-19T18:05:13.959Z

[tool_use: Read]

### Assistant | 2026-06-19T18:05:14.115Z

[tool_use: Read]

### User | 2026-06-19T18:05:14.918Z

[tool_result] 1	/**
2	 * ToolROIEngine — Tool Return-on-Investment Analyzer (E1081)
3	 *
4	 * For every tool decision, computes:
5	 * - Best tool from user's crib (inventory) with cost-per-part
6	 * - Best tool from 95K catalog at 3 price points (budget/standard/premium)
7	 * - ROI calculation: payback period vs current tool
8	 *
9	 * Key physics:
10	 *   Taylor tool life: T = (C / Vc)^(1/n) minutes
11	 *   Par
... [+26215 chars truncated]

### User | 2026-06-19T18:05:15.133Z

[tool_result] 1	/**
2	 * ToolROIEngine guard (slot:bravo 2026-06-19, ENGINE-AUDIT/U-FIX-TOOLROI-ANNUALPARTS).
3	 *
4	 * The cost/quote fabricated-output sweep found `calculateCostEfficiency`-style fabrication here:
5	 * `const annualParts = 5000; // default estimate` flowed into the RETURNED
6	 * total_cost_breakdown.annual_savings (a $/year figure feeding purchasing decisions). Fix: accept an
7	 * optional add
... [+4682 chars truncated]

### Assistant | 2026-06-19T18:05:19.223Z

I have the engine and test fully read. Now I need to trace the dispatcher mapping — the critical silent-breakage question is whether `businessDispatcher` and `calcDispatcher` hand-map `ToolROIInput` (in which case `annual_parts` may be unreachable) or pass it through, and whether any consumer asserts the exact `source` string. Let me grep for all consumers.

### Assistant | 2026-06-19T18:05:20.551Z

[tool_use: Grep]

### Assistant | 2026-06-19T18:05:21.512Z

[tool_use: Grep]

### User | 2026-06-19T18:05:21.690Z

[tool_result] Found 10 files
src\__tests__\ToolROIEngine.test.ts
src\engines\ToolROIEngine.ts
src\tools\dispatchers\businessDispatcher.ts
src\tools\dispatchers\calcDispatcher.ts
src\schemas\calcActionSchemas.ts
src\data\academy\course-23-prism-database-mastery.ts
src\routes\speedfeed.ts
src\engines\QuoteToShipOrchestratorEngine.ts
src\__tests__\tool-roi-engine.test.ts
src\__tests__\route-contract-sfc-speedfeed.
... [+7 chars truncated]

### User | 2026-06-19T18:05:22.774Z

[tool_result] web\src\__tests__\InventoryPage.test.tsx:260:      result: { tool_id: 'TOOL-001', optimal_regrinds: 2, annual_savings: 1850 },
web\src\__tests__\InventoryPage.test.tsx:281:      expect(screen.getByText(/annual_savings/i)).toBeDefined();
web\src\__tests__\calculatorPrismMode.test.ts:301:          annual_savings: { value: 9500, unit: '$/year', uncertainty: 100, source: 'annual' },
web\src\__tests__\
... [+11717 chars truncated]

### Assistant | 2026-06-19T18:05:29.331Z

Now let me read the two dispatcher mappings (business + calc), the calc schema, and the two web consumers that read `annual_savings` — these are the silent-breakage candidates.

### Assistant | 2026-06-19T18:05:31.237Z

[tool_use: Bash]

### Assistant | 2026-06-19T18:05:32.652Z

[tool_use: Bash]

### User | 2026-06-19T18:05:36.218Z

[tool_result] 4681:            const { toolROIEngine } = await import("../../engines/ToolROIEngine.js");
4682:            result = toolROIEngine.calculate(params as any);

### User | 2026-06-19T18:05:37.228Z

[tool_result] src/tools/dispatchers/calcDispatcher.ts:1020:  "tool_roi_analysis",
src/tools/dispatchers/calcDispatcher.ts:3194:              current_tool_diameter: params.current_tool_diameter ?? params.tool_diameter ?? params.Dc,
src/tools/dispatchers/calcDispatcher.ts:8716:          case "tool_roi_analysis": {
src/tools/dispatchers/calcDispatcher.ts:8717:            const { toolROIEngine } = await import("../
... [+597 chars truncated]

### Assistant | 2026-06-19T18:05:40.571Z

Both dispatchers pass `params` straight through to `toolROIEngine.calculate(params as any)` — no hand-mapping that would drop `annual_parts`. Now I need to confirm the calc schema (the only validated path) actually permits `annual_parts` through, and check the web consumers. Let me read the relevant ranges.

### Assistant | 2026-06-19T18:05:42.130Z

[tool_use: Read]

### User | 2026-06-19T18:05:43.038Z

[tool_result] 3013	  tool_roi_analysis: z.object({
3014	    feature: z.object({
3015	      type: z.enum(["hole", "pocket", "slot", "face", "contour", "thread", "bore", "drill", "chamfer"]).describe("Feature type"),
3016	      dimensions: z.object({
3017	        diameter_mm: z.number().positive().optional().describe("Feature diameter [mm]"),
3018	        width_mm: z.number().positive().optional().describe("Featu
... [+3759 chars truncated]

### Assistant | 2026-06-19T18:05:43.175Z

[tool_use: Read]

### Assistant | 2026-06-19T18:05:43.582Z

[tool_use: Read]

### User | 2026-06-19T18:05:44.153Z

[tool_result] File does not exist. Note: your current working directory is H:\prism\mcp-server.

### User | 2026-06-19T18:05:44.180Z

[tool_result] 4660	
4661	          // ── Tool Cost Predictor ──
4662	          case "tool_cost_predict": {
4663	            const { toolCostPredictorEngine } = await import("../../engines/ToolCostPredictorEngine.js");
4664	            result = toolCostPredictorEngine.predict(
4665	              String(params.tool ?? "Read"),
4666	              (params.params ?? params.tool_params ?? {}) as any,
4667	           
... [+1101 chars truncated]

### Assistant | 2026-06-19T18:05:50.107Z

Key finding: the calc schema for `tool_roi_analysis` does NOT include an `annual_parts` field, but the top-level object is `.passthrough()` (line 3056) — so an extra `annual_parts` survives Zod validation and reaches the engine. I need to verify the web consumer path (the file moved). Let me locate it and read the consuming code, plus check the businessDispatcher action enum/schema path for whether business validates against a schema that would strip `annual_parts`.

### Assistant | 2026-06-19T18:05:52.012Z

[tool_use: Bash]

### Assistant | 2026-06-19T18:05:54.202Z

[tool_use: Bash]

### User | 2026-06-19T18:05:59.183Z

[tool_result] ./web/src/utils/calculatorPrismMode.ts
---WEB API---
web/src/api/speedfeed.ts:172:export interface ToolRoiAtomicValue {
web/src/api/speedfeed.ts:188:  cost_per_part: ToolRoiAtomicValue;
web/src/api/speedfeed.ts:193:  savings_per_part: ToolRoiAtomicValue;
web/src/api/speedfeed.ts:194:  roi_parts: ToolRoiAtomicValue;
web/src/api/speedfeed.ts:205:    current_total_per_part: ToolRoiAtomicValue | null;
... [+288 chars truncated]

### User | 2026-06-19T18:05:59.279Z

[tool_result] 1127:  "tool_roi_analyze",
1128:  "tool_roi_compare",
4679:          case "tool_roi_analyze":
4680:          case "tool_roi_compare": {
---business schema validation path---
57:import { ACTION_BUSINESS_SCHEMAS } from "../../schemas/businessActionSchemas.js";
1016:  // ── Invoice OCR parser + X12 EDI parser (G2+G6 parser halves — hotel iter20) ──
1017:  "invoice_text_parse",
1018:  "x12_parse_inter
... [+1154 chars truncated]

### Assistant | 2026-06-19T18:06:03.245Z

Now let me verify the business schema for the `tool_roi_analyze`/`tool_roi_compare` actions (whether it strips `annual_parts`), check the web consumer (`calculatorPrismMode.ts` lines 880-890 that read `annual_savings.value`), and confirm the source-string consumers don't assert exact text.

### Assistant | 2026-06-19T18:06:04.171Z

[tool_use: Bash]

### Assistant | 2026-06-19T18:06:05.570Z

[tool_use: Read]

### Assistant | 2026-06-19T18:06:05.810Z

[tool_use: Read]

### User | 2026-06-19T18:06:06.904Z

[tool_result] 875	  const tierRecommendations: Array<{ tierId: PrismPurchaseTierId; recommendation: ToolRoiRecommendation }> = [
876	    { tierId: 'budget', recommendation: roiResult.budget_recommendation },
877	    { tierId: 'standard', recommendation: roiResult.standard_recommendation },
878	    { tierId: 'premium', recommendation: roiResult.premium_recommendation },
879	  ];
880	
881	  const rankedRecommenda
... [+958 chars truncated]

### User | 2026-06-19T18:06:07.399Z

[tool_result] 1	import { describe, expect, it } from "vitest";
2	
3	import { toolROIEngine } from "../engines/ToolROIEngine.js";
4	
5	describe("ToolROIEngine", () => {
6	  it("returns tiered recommendations plus annual savings for a milling feature", () => {
7	    const result = toolROIEngine.calculate({
8	      feature: {
9	        type: "pocket",
10	        dimensions: { width_mm: 12.7, depth_mm: 6, length_mm
... [+1369 chars truncated]

### User | 2026-06-19T18:06:09.165Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T18:06:14.769Z

I now have everything needed. Let me confirm the two remaining items: whether the business dispatcher has ANY schema entry for `tool_roi_analyze`/`tool_roi_compare` (if absent, `params` flows raw — `annual_parts` reachable), and verify the web `calculatorPrismMode.ts` does NOT pass `annual_parts` into the engine input (so the live UI surface still uses the default — an honesty-label concern, not a break). Let me also check the source-string assertion in the web test.

### Assistant | 2026-06-19T18:06:17.614Z

[tool_use: Bash]

### User | 2026-06-19T18:06:22.283Z

[tool_result] === business schema keys for tool_roi ===
(empty = no schema entry, params pass raw)

=== does calculatorPrismMode build a ToolROIInput / call the engine, and pass annual_parts? ===
574:function estimateAnnualPartVolume(machineMode: MachineMode, inventorySignals: InventorySignals) {
730:  const annualParts = estimateAnnualPartVolume(input.machineMode, inventorySignals);
746:      const annualSavin
... [+49 chars truncated]

### Assistant | 2026-06-19T18:06:27.359Z

The web `calculatorPrismMode.ts` is a separate UI-side ROI computation — it does NOT call `toolROIEngine.calculate()`; it consumes a `roiResult` (the engine result shape) passed to it but computes its own `annualParts` via `estimateAnnualPartVolume`. It reads `roiResult.total_cost_breakdown.annual_savings.value` (lines 886-887) but never the `.source` string. So no consumer asserts the exact `source` text. Let me confirm the web tests don't assert the engine's source string and verify how `roiResult` reaches `calculatorPrismMode` (whether it could pass `annual_parts` through to the engine upstream).

### Assistant | 2026-06-19T18:06:29.906Z

[tool_use: Bash]

### User | 2026-06-19T18:06:39.290Z

[tool_result] === web tests asserting annual_savings.source text? ===
web/src/__tests__/calculatorPrismMode.test.ts:301:          annual_savings: { value: 9500, unit: '$/year', uncertainty: 100, source: 'annual' },
web/src/__tests__/CalculatorPage.prismMode.test.tsx:138:                    annual_savings: { value: 9600, unit: '$/year', uncertainty: 100, source: 'annual' },

=== who calls calculatorPrismMode / p
... [+90 chars truncated]

### Assistant | 2026-06-19T18:07:17.420Z

The web tests construct their own mock `annual_savings` objects with `source: 'annual'` — these are test fixtures, NOT assertions against the engine's `source` string. They assert `.value`, not `.source`. No web code calls the `tool_roi` dispatcher action or threads `annual_parts`. 

I now have a complete picture. Let me reason through the cost model for the test-integrity question (the `savings > 0` guard / vacuous-pass risk) before finalizing.

**Trace of the test's `current_tool` producing savings>0:**
- The test fixture (`ToolROIEngine.test.ts:25`) uses `current_tool: { price: 240, condition: "worn" }`, `optimization_goal: "cost"`, ISO P, pocket feature.
- Current tool: `condFactor = CONDITION_DERATE["worn"] = 0.80`. `currentLife = taylorLife(200, "P", "carbide") * 0.80`. `currentToolCpp = 240 / currentPartsPerTool` — a $240 worn tool is expensive per part.
- `optimization_goal: "cost"` selects the lowest cost-per-part among budget/standard/premium (no inventory). The cheapest catalog tool's cpp will be well below the $240 worn-tool cpp.
- So `currentTotalCpp - bestCpp > 0` → `savings > 0` → `annualSavings > 0`. The guard is satisfied with real data, not vacuously skipped.

I verified this is robust: the comment at line 24 deliberately engineered `price: 240, condition: "worn"` to guarantee savings>0. The linearity assert is reachable.

One note on the linearity test's strength: `annualSavings = max(0, (currentCpp - bestCpp) * annualParts)`. Since `currentCpp` and `bestCpp` are independent of `annualParts`, the figure is exactly linear in `annualParts` by construction — so the `4×` `toBeCloseTo(..., 0)` assertion holds precisely. It would fail on revert (the reverted code used a hardcoded `5000` regardless of input, so `five` and `twenty` would be identical → `twenty ≈ 4×five` fails, and `big > def` fails). The tests are genuinely fail-on-revert.

Let me do a final check on the `total_cost_breakdown.annual_savings` math invariance — confirming edit #5 changed on
... [+4929 chars truncated]
