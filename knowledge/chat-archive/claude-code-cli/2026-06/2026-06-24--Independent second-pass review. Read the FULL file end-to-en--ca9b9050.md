---
type: "chat-session"
source: "claude-code-cli"
session_id: "ca9b9050-43d7-4390-93f4-e31f19be4b82"
title: "Independent second-pass review. Read the FULL file end-to-end: H:\\prism\\mcp-serv"
date: "2026-06-24"
first_ts: "2026-06-24T01:18:21.367Z"
last_ts: "2026-06-24T01:20:46.674Z"
cwd: "H:\\prism\\mcp-server"
messages: 61
user_msgs: 25
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-aa21e9fd75e149420.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:49"
---

# Independent second-pass review. Read the FULL file end-to-end: H:\prism\mcp-serv

> **claude-code-cli** | 2026-06-24 | 61 msgs (25 user / 36 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-aa21e9fd75e149420.jsonl`

## Transcript

### User | 2026-06-24T01:18:21.367Z

Independent second-pass review. Read the FULL file end-to-end: H:\prism\mcp-server\src\data\quoting-dispatch-allowlist.ts

This is U-MKTPRICE02 — a security deny-list extension. 5 actions were just added to a Set that the generic quoting HTTP route 403s. Do NOT assume the first reviewer caught everything. Weight your review toward what arm A might miss:

1. CONVENTION CONFORMANCE: do the 5 new entries match the EXACT comment style + grouping of the original 6 (one-line provenance comment naming the exposed field above each entry)? Is the new block clearly delimited?
2. CORRECTNESS OF THE SECURITY CLAIM (the load-bearing part): for EACH of the 5 added actions, independently verify from the dispatcher + engine source that it ACTUALLY returns the shop's own cost basis (raw $). Read these to confirm:
   - closed_loop_provenance_check → H:/prism/mcp-server/src/engines/QuotingActualOutcomeLoaderEngine.ts (provenanceCheck returns outcomes[] with per-job cost?)
   - quoting_dynamic_shop_rate → H:/prism/mcp-server/src/engines/DynamicShopRateEngine.ts (base_rate_usd_per_hr exposed?)
   - quoting_shop_electricity_cost + quoting_shop_utilities_cost → H:/prism/mcp-server/src/engines/ShopProfileTemplateEngine.ts (cost_usd / rate_usd_per_kwh / total_utilities_cost_usd?)
   - jm_die_financial_baseline → H:/prism/mcp-server/src/engines/JMDieFinancialBaselineEngine.ts (total_revenue_usd?)
   The dispatcher cases are in H:/prism/mcp-server/src/tools/dispatchers/quotingDispatcher.ts (search the action names).
3. THE LEAVE DECISION: confirm closed_loop_outcome_digest is correctly EXCLUDED. Verify it has a token-less caller by grepping H:/prism/mcp-server/web/src for it (expect QuotingCalibrationHealthPage). Verify its engine (QuotingOutcomeLedgerDigestEngine.digest) returns only rate/count telemetry, NOT raw $. If EITHER of those is wrong, the LEAVE is wrong → flag it.
4. ANY OTHER cost-side action in quotingDispatcher.ts that returns raw $ and has NO token-less caller but is NOT in the
... [+115 chars truncated]

### Assistant | 2026-06-24T01:18:24.156Z

I'll review this security deny-list extension thoroughly. Let me start by reading the target file and the key sources in parallel.

### Assistant | 2026-06-24T01:18:24.642Z

[tool_use: Read]

### User | 2026-06-24T01:18:25.409Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\data\quoting-dispatch-allowlist.ts' was already read 11s ago in this session and is unchanged (mtime 1782263872035). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-24T01:18:25.578Z

[tool_use: Read]

### Assistant | 2026-06-24T01:18:26.039Z

[tool_use: Read]

### Assistant | 2026-06-24T01:18:26.513Z

[tool_use: Read]

### User | 2026-06-24T01:18:26.636Z

[tool_result] 1	/**
2	 * QuotingActualOutcomeLoaderEngine -- QUOTING-CLOSED-LOOP-MS0
3	 *
4	 * Supplies REAL actuals from hotel's ActualCostEngine.profitability() to the
5	 * QuotingClosedLoopEngine OODA loop.  Feeds the ClosedLoopDeps.fetchOutcomes
6	 * slot so the provenance gate (classifyOutcomeProvenance) can allow live
7	 * promotion of learned corrections.
8	 *
9	 * Charlie soul refuse: FAIL LOUD when the
... [+11464 chars truncated]

### Assistant | 2026-06-24T01:18:27.107Z

[tool_use: Read]

### Assistant | 2026-06-24T01:18:27.539Z

[tool_use: Read]

### User | 2026-06-24T01:18:27.901Z

[tool_result] 1	/**
2	 * DynamicShopRateEngine — utilization-aware rate adjustment
3	 *
4	 * Operator iter11 gap-audit named "dynamic shop rate" — quote-time rates
5	 * shouldn't be static $/hr off the profile; they should reflect CURRENT
6	 * shop loading. A shop running at 95% capacity should price like it
7	 * (rush uplift); a shop running at 40% should capture work at a discount
8	 * (capture-rate strategy 
... [+12071 chars truncated]

### User | 2026-06-24T01:18:28.366Z

[tool_result] 1	/**
2	 * ShopProfileTemplateEngine — template-first shop rate-table store
3	 *
4	 * Operator directive: "build with template in mind since what we build now
5	 * for JM will carry over to other shops." This engine is THE shop-agnostic
6	 * surface for every quote-time rate lookup (machine $/hr, electricity $/kWh,
7	 * labor $/hr by skill, overhead %, secondary-op rate tables, setup $/hr).
8	 *
9
... [+15916 chars truncated]

### User | 2026-06-24T01:18:29.074Z

[tool_result] 1	/**
2	 * JMDieFinancialBaselineEngine — JM-DIE-FINANCIAL-BASELINE-MS0 / U-JM03
3	 *
4	 * Aggregates ingested JM Die records (U-JM01) + historical material prices
5	 * (U-JM02) into baseline financial analytics:
6	 *
7	 *   - by_customer: revenue trend per customer (count, total_revenue, first/last date)
8	 *   - by_material: spend trend per material (count, total_spend, avg_price)
9	 *   - by_ye
... [+6443 chars truncated]

### User | 2026-06-24T01:18:29.284Z

[tool_result] 1	/**
2	 * QuotingOutcomeLedgerDigestEngine --
3	 * QUOTING-SYNERGY-MS0/U-QP-OUTCOME-LEDGER-DIGEST (slot:charlie 2026-06-11).
4	 *
5	 * The READ-SIDE consumer of the closed-loop outcome ledger written by
6	 * QuotingClosedLoopRunnerEngine.buildLiveDeps().feedOutcome
7	 * (U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY). feedOutcome appends one CycleOutcomeSignal
8	 * per terminal verdict to state/shared/quoti
... [+9851 chars truncated]

### Assistant | 2026-06-24T01:18:34.713Z

Now let me read the deny-list file content fully (it's in my context but I want to confirm exact line numbers), and examine the dispatcher to verify the security claims and the LEAVE decision.

### Assistant | 2026-06-24T01:18:35.186Z

[tool_use: Read]

### User | 2026-06-24T01:18:35.986Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\data\quoting-dispatch-allowlist.ts' was already read 22s ago in this session and is unchanged (mtime 1782263872035). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-24T01:18:37.074Z

[tool_use: Grep]

### User | 2026-06-24T01:18:38.219Z

[tool_result] 141:          case "closed_loop_provenance_check": {
159:          case "closed_loop_outcome_digest": {
247:          case "jm_die_financial_baseline": {
654:          case "quoting_shop_electricity_cost": {
697:          case "quoting_shop_utilities_cost": {
741:          case "quoting_dynamic_shop_rate": {

### Assistant | 2026-06-24T01:18:38.449Z

[tool_use: Grep]

### User | 2026-06-24T01:18:40.043Z

[tool_result] web\src\pages\QuotingCalibrationHealthPage.tsx:149:// Closed-loop OODA self-observation digest (closed_loop_outcome_digest action / the
web\src\__tests__\QuotingClosedLoopHealthPanel.test.tsx:8: * QuotingOutcomeLedgerDigestEngine.digest() (closed_loop_outcome_digest action):
web\src\__tests__\QuotingClosedLoopHealthPanel.test.tsx:157:    mockQuoting({ ...BASE_ROUTES, closed_loop_outcome_digest: di
... [+639 chars truncated]

### Assistant | 2026-06-24T01:18:44.635Z

The grep confirms the dispatcher cases. Now let me read each dispatcher case body to verify what each action actually returns. Let me read the relevant sections of the dispatcher.

### Assistant | 2026-06-24T01:18:46.043Z

[tool_use: Read]

### Assistant | 2026-06-24T01:18:46.600Z

[tool_use: Read]

### User | 2026-06-24T01:18:47.064Z

[tool_result] 130	            const activeFactor =
131	              p.includeActiveFactor === false ? undefined : await quotingActiveFactorLoaderEngine.getMetadata();
132	            // U-QP-OUTCOME-DIGEST-IN-STATUS (charlie 2026-06-11): make the closed-loop behavior-health
133	            // verdict consumable through the SAME read the calibration-health UI already calls. Opt-in
134	            // (default of
... [+8548 chars truncated]

### User | 2026-06-24T01:18:47.634Z

[tool_result] 640	            break;
641	          }
642	          // QUOTING-SYNERGY-MS0 (charlie /goal-20 iter11, 2026-05-25)
643	          case "quoting_shop_profile_get": {
644	            const { shopProfileTemplateEngine } = await import("../../engines/ShopProfileTemplateEngine.js");
645	            result = await shopProfileTemplateEngine.getProfile((parsed.data as any)?.profile_id);
646	            brea
... [+6517 chars truncated]

### Assistant | 2026-06-24T01:18:52.123Z

I now have all dispatcher case bodies. I have the deny-list file content from the start of the session. Let me look at the security gate route that consumes this deny-set, to confirm the deny-set is actually load-bearing (that the actions in it are 403'd and ones not in it are reachable), and check the auth route wiring.

### Assistant | 2026-06-24T01:18:53.541Z

[tool_use: Grep]

### User | 2026-06-24T01:18:55.116Z

[tool_result] Found 29 files
src\data\quoting-dispatch-allowlist.ts
src\engines\quoting\OPEN-THREADS.md
src\__tests__\quotingDispatchDeny.test.ts
src\routes\quoting.ts
src\tools\dispatchers\quotingDispatcher.ts
src\schemas\quotingActionSchemas.ts
src\middleware\attachUserPlan.ts
src\__tests__\entitlement-enforcement.test.ts
src\middleware\tierGate.ts
src\engines\EntitlementOverrideStore.ts
src\engines\ZuluDeleg
... [+774 chars truncated]

### Assistant | 2026-06-24T01:18:58.147Z

The route is the load-bearing consumer. Let me read the route file and the full deny-list file's exact content, plus the test that pins this behavior.

### Assistant | 2026-06-24T01:18:58.611Z

[tool_use: Read]

### User | 2026-06-24T01:18:59.221Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\quoting.ts' was already read 7m ago in this session and is unchanged (mtime 1782260606709). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-24T01:19:03.921Z

The read-once guard says I read it 7m ago, but I have NOT actually seen quoting.ts content in this conversation thread — that prior read was likely in a sibling/parent context that isn't visible to me here. I need its actual content to verify the deny-set is load-bearing. Let me disable the cache and read it, and read the deny-list file the same way.

### Assistant | 2026-06-24T01:19:05.339Z

[tool_use: Bash]

### Assistant | 2026-06-24T01:19:05.630Z

[tool_use: Bash]

### User | 2026-06-24T01:19:10.955Z

[tool_result]      1	/**
     2	 * quoting-dispatch-allowlist.ts -- the cost-basis / sensitive-pricing actions the browser must
     3	 * NEVER reach through the generic POST /api/v1/quoting (and /api/mcp/quoting) dispatch handler.
     4	 *
     5	 * -- SECURITY: DENY-LIST on the generic dispatch surface (U-MKTPRICE01) --------------------------
     6	 * The quoting router's generic `router.post("/")` forward
... [+5872 chars truncated]

### User | 2026-06-24T01:19:11.314Z

[tool_result]      1	/**
     2	 * PRISM MCP Server — Quoting Pipeline Routes — QUOTING-PIPELINE-MS0 / U-QP08-HTTP
     3	 *
     4	 * HTTP bridge to the prism_quoting dispatcher. The mobile capture page +
     5	 * LiveChatWidget call these endpoints; each endpoint maps 1:1 to a
     6	 * prism_quoting action.
     7	 *
     8	 * Two surfaces:
     9	 *   - POST /api/mcp/quoting       -- generic action router 
... [+4784 chars truncated]

### Assistant | 2026-06-24T01:19:18.139Z

I now have the route confirming the deny-set is load-bearing (line 35-38: 403 when `isQuotingGenericDispatchDenied(action)`). Now let me verify the test pins the new behavior, and check the schemas to confirm the 5 actions are real registered z.enum actions (so they're genuinely reachable, not dead). Let me also scan the dispatcher's full action list to hunt for any MISSED cost-side leak (item 4).

### Assistant | 2026-06-24T01:19:19.113Z

[tool_use: Bash]

### Assistant | 2026-06-24T01:19:20.954Z

[tool_use: Grep]

### User | 2026-06-24T01:19:22.400Z

[tool_result] 31:  "jm_die_financial_baseline",      // U-JM03 — aggregate to per-customer/material/year baseline
98:  "quoting_shop_electricity_cost",        // U-SHOP-PROFILE-TEMPLATE — electricity cost for one machine cycle
103:  "quoting_shop_utilities_cost",          // U-UTILITY-COSTS-EXTENDED — aggregate electricity + water + air + natural gas
106:  "quoting_dynamic_shop_rate",              // U-DYNAMIC-
... [+405 chars truncated]

### User | 2026-06-24T01:19:25.077Z

[tool_result]      1	/**
     2	 * U-MKTPRICE01 -- POST /api/v1/quoting security gate (cost-basis deny-list + admin-gated typed verbs)
     3	 *
     4	 * Verifies the leak closure caught by the U-MKTPRICE01 scrutiny (arm C): the generic quoting dispatch
     5	 * surface carried only optionalToken (never rejects anonymous), so `{ action: "cost_index_prior" }`
     6	 * leaked the shop's real cost basis unauthe
... [+9563 chars truncated]

### Assistant | 2026-06-24T01:19:29.979Z

All 5 new actions plus the excluded one are confirmed registered z.enum actions. The test iterates the whole deny-set (`for (const action of QUOTING_GENERIC_DISPATCH_DENY_SET)`) so the 5 new entries are automatically covered. Now for item 4 — hunting for any MISSED cost-side leak. Let me scan the full quoting action enum and cross-check the cost-bearing actions against the deny-set and against token-less callers. Let me read the full schema enum and the relevant dispatcher case bodies for the other cost-bearing-sounding actions.

### Assistant | 2026-06-24T01:19:30.955Z

[tool_use: Read]

### User | 2026-06-24T01:19:33.089Z

[tool_result] 1	/**
2	 * quotingActionSchemas — QUOTING-PIPELINE-MS0 / U-QP08
3	 *
4	 * Zod schemas + action enum for the new prism_quoting dispatcher.
5	 * Each action maps to a U-QP02..U-QP07 engine.
6	 */
7	import { z } from "zod";
8	
9	export const quotingActionEnum = z.enum([
10	  "camera_intake_route",      // U-QP02
11	  "insert_box_lookup",         // U-QP03
12	  "machine_tag_extract",       // U-QP04
1
... [+12300 chars truncated]

### Assistant | 2026-06-24T01:19:40.574Z

I now have the full action enum. Let me investigate item 4 (missed leaks) by examining the cost-bearing actions NOT in the deny-set. The candidates that emit raw $ cost basis and need checking: `fair_market_value`, `three_view_pricing`, `location_vendor_pricing`, `vendor_unit_price`, `quoting_machine_invest_roi`, `quoting_secondary_ops_price_for_profile`, `quoting_shop_profile_get` (returns the full ShopProfile including rates!), `outbound_price_calibration` (already denied), `quoting_calibration_*`. Let me check the token-less callers for the most suspicious ones and read a couple of dispatcher bodies.

`quoting_shop_profile_get` is the standout — it returns the entire `ShopProfile` object which includes `electricity_usd_per_kwh`, `setup_rate_usd_per_hr`, `default_machine_rate_usd_per_hr`, and per-machine `rate_usd_per_hr`. That is exactly the shop's internal $/hr rate basis. Let me verify whether it has a token-less frontend caller.

### Assistant | 2026-06-24T01:19:42.929Z

[tool_use: Grep]

### User | 2026-06-24T01:19:44.203Z

[tool_result] web\src\api\client.ts:1483:  return request('POST', '/quoting', { action: 'three_view_pricing', params });
web\src\api\client.ts:1488:// by region, ranked, with a sourcing suggestion. Wraps prism_quoting:location_vendor_pricing.
web\src\api\client.ts:1558:  return request('POST', '/quoting', { action: 'location_vendor_pricing', params });
web\src\pages\QuotingCalibrationHealthPage.tsx:10: *   - qu
... [+1816 chars truncated]

### Assistant | 2026-06-24T01:19:44.289Z

[tool_use: Grep]

### User | 2026-06-24T01:19:46.551Z

[tool_result] Found 11 files
web\src\__tests__\client.test.ts
web\src\api\client.ts
web\src\__tests__\apiBase.test.ts
web\src\__tests__\QuotingCalibrationHealthPage.test.tsx
web\src\pages\QuotingCalibrationHealthPage.tsx
web\src\pages\MobileCameraQuotePage.tsx
web\src\pages\QuotingWorkbenchPage.tsx
web\src\components\quoting\QuotingTrainingLoopPanel.tsx
web\src\components\quoting\JMDieDocumentSearchPanel.tsx
we
... [+97 chars truncated]

### Assistant | 2026-06-24T01:19:53.869Z

Key finding for item 4: `quoting_shop_profile_get` and `quoting_shop_profile_list` have NO token-less frontend caller (zero hits in web/src), yet `quoting_shop_profile_get` returns the FULL `ShopProfile` — including `electricity_usd_per_kwh`, `setup_rate_usd_per_hr`, `default_machine_rate_usd_per_hr`, and every machine's `rate_usd_per_hr`. This is the exact same internal $/hr + $/kWh rate basis that the U-MKTPRICE02 commit just denied via `quoting_shop_electricity_cost` and `quoting_dynamic_shop_rate`. Let me confirm there's genuinely no caller (the broad grep for `/api/mcp/quoting` matched several files; I need to confirm none of them invoke `quoting_shop_profile_get`). Let me also check whether the dispatcher is even reachable through the generic route (i.e., is `prism_quoting` the tool the generic `/` route calls — yes, confirmed in quoting.ts line 39).

### Assistant | 2026-06-24T01:19:56.248Z

[tool_use: Grep]

### Assistant | 2026-06-24T01:19:56.933Z

[tool_use: Read]

### User | 2026-06-24T01:19:57.428Z

[tool_result] No matches found

### User | 2026-06-24T01:19:57.928Z

[tool_result] 300	            const { quotingPublicQuoteEngine } = await import("../../engines/QuotingPublicQuoteEngine.js");
301	            // instantQuoteEngine.quote() is NOT a never-throws contract: a downstream
302	            // estimate engine can throw, and the dispatcher's generic catch would surface
303	            // the raw internal error string to the customer. Contain it HERE -- any throw
304	   
... [+3378 chars truncated]

### Assistant | 2026-06-24T01:20:05.780Z

This confirms item 4. `quoting_shop_profile_get` / `quoting_shop_profile_list` / `quoting_machine_invest_roi` / `quoting_secondary_ops_price_for_profile` / `quoting_cross_part_synergy_from_fleet` / `quoting_training_orchestrator_run` have ZERO token-less frontend callers in web/src.

Of these, `quoting_shop_profile_get` is a clear, concrete cost-basis leak: it returns the full `ShopProfile` containing `electricity_usd_per_kwh` (0.13), `setup_rate_usd_per_hr` (85), `default_machine_rate_usd_per_hr` (95), and every machine's `rate_usd_per_hr` — the exact internal $/hr and $/kWh rate basis the deny-set rule (a) names. This is reachable unauthenticated via the generic route, has no token-less caller (rule b satisfied), and is NOT in the deny-set. It is inconsistent to deny `quoting_shop_electricity_cost` (which derives a cost FROM `electricity_usd_per_kwh`) while leaving `quoting_shop_profile_get` (which returns `electricity_usd_per_kwh` itself, plus all rates) wide open.

Let me verify the remaining two candidate engines (`MachineInvestmentROIEngine`, `SecondaryOpsQuotePricingEngine`) return raw $ before grading, to be precise about whether they're additional leaks or borderline.

### Assistant | 2026-06-24T01:20:07.676Z

[tool_use: Bash]

### Assistant | 2026-06-24T01:20:08.625Z

[tool_use: Bash]

### User | 2026-06-24T01:20:12.259Z

[tool_result] 2: * MachineInvestmentROIEngine — capacity-aware payback for new-machine purchases
5: * machines to improve cost efficiency for future orders".
9: * CANDIDATE NEW MACHINE, what's the payback if it (a) shifts a percentage of
11: * existing fleet for new revenue.
14: *   - ShopProfileTemplateEngine  (existing & new machine $/hr rates)
29:  /** Acquisition cost in USD. */
30:  cost_usd: number;
31:  
... [+2388 chars truncated]

### User | 2026-06-24T01:20:13.210Z

[tool_result] 8: * Pure pricing engine — composes per-op cost rules (cycle_time, fixed_setup,
12: * No I/O. Caller-supplied catalog override for shop-specific rates.
31:  /** Fixed setup cost USD per lot (regardless of qty). */
32:  setup_usd: number;
33:  /** Per-part cost USD (multiplied by qty). */
34:  per_part_usd: number;
35:  /** Optional material-cost multiplier (when op requires consumables). */
46:  l
... [+3284 chars truncated]

### Assistant | 2026-06-24T01:20:46.674Z

I have everything I need. Let me finalize the verification of all four review items.

**Item 2 — security claim per action (all 5 verified raw-$ cost basis):**
- `closed_loop_provenance_check` → `provenanceCheck()` returns `ProvenanceCheckResult.outcomes: QuoteOutcomeRecord[]`, each carrying `predicted_quote_usd` (= `job.estimated_cost`) and `actual_invoice_usd` (= `job.revenue`) — per-job cost + real invoice. VERIFIED leak (QuotingActualOutcomeLoaderEngine.ts:104-111, dispatcher:147).
- `quoting_dynamic_shop_rate` → `adjust()` returns `base_rate_usd_per_hr` + `adjusted_rate_usd_per_hr` + `delta_usd_per_hr` (DynamicShopRateEngine.ts:234-239, dispatcher:744). VERIFIED internal $/hr.
- `quoting_shop_electricity_cost` → `electricityCost()` returns `cost_usd` + `rate_usd_per_kwh` (ShopProfileTemplateEngine.ts:264-271, dispatcher:658). VERIFIED.
- `quoting_shop_utilities_cost` → `utilitiesCost()` returns `total_utilities_cost_usd` + per-utility costs + `rate`s via electricity reuse (ShopProfileTemplateEngine.ts:237-250, dispatcher:701). VERIFIED.
- `jm_die_financial_baseline` → `aggregate()` returns `total_revenue_usd` + `by_customer[].total_revenue_usd` + `by_year` (JMDieFinancialBaselineEngine.ts:162-174, dispatcher:250). VERIFIED.

**Item 3 — LEAVE decision (`closed_loop_outcome_digest` correctly excluded):** Token-less caller confirmed (`QuotingCalibrationHealthPage.tsx:149`, via `/api/mcp/quoting` no Bearer — rule b fail). Engine `digest()`→`summarizeOutcomeLedger()` returns only `total_cycles`, per-verdict `{count, rate}`, `*_rate`, `drift_detected_count`, `mean_applied_mape_delta`, health verdict — NO raw $ (rule a fail). LEAVE is correct.

**Item 1 — convention conformance:** New block (lines 65-76) has a clear delimiter comment (65-66) and one provenance comment per entry naming the exposed field (67/69/71/73/75), exactly matching the original 6 (53-63). Schema version bumped 1.0.0→1.1.0. Matches.

**Item 4 — MISSED leak found:** `quoting_shop_profile_get` retur
... [+3833 chars truncated]
