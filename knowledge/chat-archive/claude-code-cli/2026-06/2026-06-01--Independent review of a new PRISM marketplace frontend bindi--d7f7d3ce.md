---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Independent review of a new PRISM marketplace frontend binding unit + its allowl"
date: "2026-06-01"
first_ts: "2026-06-01T02:55:22.369Z"
last_ts: "2026-06-01T02:59:13.413Z"
cwd: "H:\\prism-slot-hotel"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a7796e950c28101d3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# Independent review of a new PRISM marketplace frontend binding unit + its allowl

> **claude-code-cli** | 2026-06-01 | 35 msgs (14 user / 21 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a7796e950c28101d3.jsonl`

## Transcript

### User | 2026-06-01T02:55:22.369Z

Independent review of a new PRISM marketplace frontend binding unit + its allowlist additions. Read END-TO-END:
1. H:\prism\mcp-server\web\src\api\marketplace.ts
2. H:\prism\mcp-server\web\src\__tests__\marketplace.test.ts
3. H:\prism\mcp-server\src\data\business-dispatch-allowlist.ts (new marketplace READS block + DEFERRED-writes comment)
4. H:\prism\mcp-server\src\routes\business.ts (the route these bindings hit — confirm the new allowlist entries flow through the deny-by-default gate unchanged)

Weighted toward security + integration + what a type reviewer misses:
1. SECURITY (load-bearing): the allowlist is the only gate beyond verifyToken. Confirm the 9 newly-allowlisted marketplace actions are ALL read-only and NONE is financial (no escrow/payout/ledger) or PII-export. Confirm the 4 deferred writes (seed_from_hints, lead_contact/convert/decline) are genuinely NOT in the Set (a typo'd duplicate or accidental inclusion is a P0). Is the deny-by-default property still intact for everything else?
2. CONSISTENCY with the established pattern: does marketplace.ts match vendorNetwork.ts (same callBusinessAction + unwrapBusiness usage, same export style, same JSDoc discipline)? Any drift?
3. INPUT TYPING: geoRouteCost/geoLandedCost/marketplaceRankRfq type inputs as `Record<string, unknown>` (server validates). Is that an acceptable R5 call here, or a façade that lets bad calls through silently? Is `geoLandedCost`'s `& { partValueUsd: number }` intersection meaningful?
4. UNWRAP CORRECTNESS: these dispatcher cases return BARE results (engine method return, no {success,data} wrapper — businessDispatcher.ts ~2037-2118). Does unwrapBusiness handle a bare object/array/number correctly for each (esp. geo_logistics_score returns a bare NUMBER, marketplace_lead_get returns a possibly-null object)?
5. TEST GAPS: any binding untested? Any vacuous assertion? Is the null-lead path tested?

Report P0/P1/P2 with file:line. Grade PASS or FAIL.

### Assistant | 2026-06-01T02:55:33.691Z

I'll review this marketplace frontend binding unit end-to-end. Let me read all four files in parallel.

### Assistant | 2026-06-01T02:55:34.176Z

[tool_use: Read]

### Assistant | 2026-06-01T02:55:34.767Z

[tool_use: Read]

### Assistant | 2026-06-01T02:55:35.139Z

[tool_use: Read]

### Assistant | 2026-06-01T02:55:35.451Z

[tool_use: Read]

### User | 2026-06-01T02:55:52.808Z

[tool_result] 1	/**
2	 * marketplace.ts — frontend bindings for the PRISM manufacturing-networking marketplace (feature #2).
3	 *
4	 * Surfaces the RFQ-matching, supplier-reputation, lead-directory, and landed-cost-logistics actions to
5	 * the ERP/marketplace UI (e.g. RFQInboxPage). Same transport as vendorNetwork.ts: POST
6	 * /api/v1/business/dispatch (src/routes/business.ts), deny-by-default allowlisted.
7	
... [+6276 chars truncated]

### User | 2026-06-01T02:55:53.380Z

[tool_result] 1	/**
2	 * business-dispatch-allowlist.ts — the curated set of prism_business actions the browser may
3	 * invoke through POST /api/v1/business/dispatch (createBusinessRouter).
4	 *
5	 * ── SECURITY: DENY-BY-DEFAULT ───────────────────────────────────────────────────────────────
6	 * The prism_business dispatcher exposes ~879 actions, many of which are FINANCIAL
7	 * (payroll_run, gl_journal_entry
... [+3776 chars truncated]

### User | 2026-06-01T02:55:53.526Z

[tool_result] 1	// @vitest-environment jsdom
2	import { afterEach, describe, expect, it, vi } from 'vitest';
3	import * as dispatch from '../api/businessDispatch';
4	import {
5	  geoLandedCost,
6	  geoLogisticsScore,
7	  geoRouteCost,
8	  marketplaceLeadGet,
9	  marketplaceLeadList,
10	  marketplaceRankRfq,
11	  supplierReputation,
12	  supplierReputationRank,
13	  type FreightQuote,
14	  type LandedCost,
15	  
... [+6632 chars truncated]

### User | 2026-06-01T02:55:53.811Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Business dispatch route (HOTEL-NETPLAT-UI / U-VNET-ROUTE)
3	 *
4	 * POST /api/v1/business/dispatch  { action, params } → prism_business dispatcher.
5	 *
6	 * This is the generic dispatch surface that the business-domain frontend client modules
7	 * (web/src/api/businessDispatch.ts → vendorNetwork.ts, hotelBusiness.ts) target. Before this
8	 * route, those clients POST
... [+4874 chars truncated]

### Assistant | 2026-06-01T02:55:57.345Z

I have all four files. Now let me verify the key load-bearing claims against the actual source of truth — the businessDispatcher cases and the vendorNetwork.ts comparison pattern. Let me check those.

### Assistant | 2026-06-01T02:55:59.728Z

[tool_use: Grep]

### Assistant | 2026-06-01T02:56:00.197Z

[tool_use: Read]

### User | 2026-06-01T02:56:05.137Z

[tool_result] 1	/**
2	 * vendorNetwork.ts — frontend bindings for charlie's vendor-catalog corpus + vendor lifecycle.
3	 *
4	 * Surfaces VENDOR-NETWORK-MS0 (charlie's ingested 30+ tool-maker catalogs) and the vendor
5	 * performance / ranking actions to the ERP UI. Until now these actions were LIVE in
6	 * businessDispatcher but had NO frontend binding (charlie's corpus was invisible to the app).
7	 *
8	 * Reac
... [+4454 chars truncated]

### User | 2026-06-01T02:56:34.303Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\businessDispatcher.ts:2037:          case "supplier_reputation": {
H:\prism\mcp-server\src\tools\dispatchers\businessDispatcher.ts-2038-            const engine = await getEngine("supplierReputation");
H:\prism\mcp-server\src\tools\dispatchers\businessDispatcher.ts-2039-            result = engine.reputationFor(params.outcomes ?? [], params.supplierId ?? p
... [+8659 chars truncated]

### Assistant | 2026-06-01T02:56:39.861Z

Now let me verify three remaining things: the `businessDispatch.ts` (callBusinessAction + unwrapBusiness contract), the `geoLogistics.logisticsScore` return type (to confirm it returns a bare number), and the `getLead` return (possibly-null). Let me also confirm `marketplace_final_rank` is allowlisted but NOT bound (intentional or orphan).

### Assistant | 2026-06-01T02:56:40.823Z

[tool_use: Read]

### Assistant | 2026-06-01T02:56:42.242Z

[tool_use: Grep]

### Assistant | 2026-06-01T02:56:43.137Z

[tool_use: Grep]

### User | 2026-06-01T02:56:47.102Z

[tool_result] 1	/**
2	 * businessDispatch.ts — shared client envelope for the prism_business MCP dispatcher.
3	 *
4	 * prism_business actions are invoked via POST /api/v1/business/dispatch with a { action, params }
5	 * body (the route in src/routes/business.ts; the same path hotelBusiness.ts targets). That route is
6	 * ALLOWLISTED server-side — only curated read-safe actions are reachable; everything else ret
... [+4206 chars truncated]

### User | 2026-06-01T02:56:54.455Z

[tool_result] 77:  static routeCost(input: RouteInput): FreightQuote {
78-    const p = RouteInputSchema.parse(input);
79-    const zone = GeoLogisticsRoutingEngine.resolveZone(p.fromRegion, p.toRegion, p.sameMetro);
80-    const rate = FREIGHT_ZONES[zone];
81-    const perPart = p.perPartWeightKg ?? DEFAULT_PART_WEIGHT_KG;
82-    const totalWeightKg = GeoLogisticsRoutingEngine.#cents(perPart * p.quantity);
83-
... [+1333 chars truncated]

### User | 2026-06-01T02:56:54.647Z

[tool_result] 319:  static getLead(supplierId: string): MarketplaceLead | null {
320-    const lead = MarketplaceSeedingEngine.leads.get(supplierId);
321-    return lead ? MarketplaceSeedingEngine.#snapshot(lead) : null;
322-  }
323-
324-  /**
--
329:  static listLeads(filter: LeadListFilter = {}): MarketplaceLead[] {
330-    if (filter.status !== undefined && !LEAD_STATUSES.includes(filter.status)) {
331-     
... [+309 chars truncated]

### Assistant | 2026-06-01T02:56:59.590Z

All four files plus the load-bearing source-of-truth files (businessDispatcher cases, GeoLogisticsRoutingEngine, MarketplaceSeedingEngine, businessDispatch.ts envelope, vendorNetwork.ts) are now read. Let me verify the two remaining claims: that `marketplace_final_rank` (allowlisted but not bound in marketplace.ts) is intentional, and confirm the deferred-write actions are genuinely absent from the Set. Let me also check the dispatcher's wrapping behavior around line 2037-2118 to confirm these return BARE results.

### Assistant | 2026-06-01T02:57:00.274Z

[tool_use: Read]

### User | 2026-06-01T02:57:11.286Z

[tool_result] 2125	            result = engine.query(ingested.records, params.filter ?? {});
2126	            break;
2127	          }
2128	
2129	          // ── TimeClock ──
2130	          case "clock_in": {
2131	            const engine = await getEngine("timeClock");
2132	            result = engine.clockIn({
2133	              employee_id: params.employee_id ?? params.employeeId,
2134	              timestamp
... [+2147 chars truncated]

### Assistant | 2026-06-01T02:57:16.825Z

Now let me see how `result` is finally wrapped/returned by the dispatcher — to confirm these marketplace cases return the bare engine value (and how `result` becomes the MCP payload). Let me find the end of the switch and the return path.

### Assistant | 2026-06-01T02:57:18.136Z

[tool_use: Grep]

### User | 2026-06-01T02:57:34.500Z

[tool_result] 5468:            result = { success: true, data: (_customerPortfolioMiner as any).mine?.(params) ?? (_customerPortfolioMiner as any).analyze?.(params) ?? (_customerPortfolioMiner as any).run?.(params) ?? { engine: "CustomerPortfolioMinerEngine", note: "method not callable" } };
5473:            result = { success: true, data: (_customerKnowledge as any).query?.(params) ?? (_customerKnowledge as an
... [+6060 chars truncated]

### Assistant | 2026-06-01T02:57:40.544Z

This confirms the marketplace cases (2037-2118) assign BARE engine returns to `result` (no `{ success: true, data }` wrapper), unlike most other cases. Let me confirm how the final `result` is returned at the end of the switch — to verify the marketplace bare result is passed through verbatim to the MCP payload.

### Assistant | 2026-06-01T02:57:42.375Z

[tool_use: Bash]

### User | 2026-06-01T02:58:08.409Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
104 matches in 2 files:

7167:0:JSON.stringify(result, null, 2),
H:/.../dispatchers/businessDispatcher.ts:184:return _salesUseTax ??= (await import("../../engines/SalesUseTaxEngine.js"))....
H:/.../dispatchers/businessDispatcher.ts:186:return _fixedAssetDep ??= (await import("../../engines/FixedAssetDe
... [+2922 chars truncated]

### Assistant | 2026-06-01T02:58:12.594Z

Line 7167 confirms the final serialization: `JSON.stringify(result, null, 2)` becomes the MCP text payload. So whatever `result` holds — for the marketplace cases, the BARE engine return — is what `callTool` parses and the route returns verbatim. Let me read that final return block to confirm there's no late wrapping, and verify the `result` variable's initial declaration/default.

### Assistant | 2026-06-01T02:58:13.433Z

[tool_use: Read]

### User | 2026-06-01T02:58:25.498Z

[tool_result] 7150	            break;
7151	          }
7152	          case "monolith_roughing_machine_get": {
7153	            const { monolithRoughingMachineConfigsEngine } = await import("../../engines/MonolithRoughingMachineConfigsEngine.js");
7154	            const p = params as any;
7155	            // getConfig requires an id; listIds() if id omitted (read-only discovery)
7156	            result = (p?.id 
... [+1037 chars truncated]

### Assistant | 2026-06-01T02:59:13.413Z

I now have full end-to-end verification of every load-bearing claim. Let me compile the review.

Confirmed facts:
- Marketplace cases (2037-2118) assign bare engine returns to `result`; the switch serializes `result` verbatim via `JSON.stringify(result, null, 2)` (7167). So `geo_logistics_score` → bare number, `marketplace_lead_get` → bare object-or-null. The route returns success verbatim; `unwrapBusiness` receives bare values.
- `unwrapBusiness` `isEnvelope` guard requires `success` to be a boolean AND `data` present, else returns raw. Bare number/null/array/object all fall through to raw. Correct.
- Deferred writes (`marketplace_seed_from_hints`, `marketplace_lead_contact/convert/decline`) exist as dispatcher cases (2090-2118) but are genuinely absent from the allowlist Set.
- `geoLogistics.logisticsScore` returns `number`; `landedCost` signature is `RouteInput & { partValueUsd: number }`; `getLead` returns `MarketplaceLead | null`.

One discrepancy worth surfacing: `marketplace_final_rank` is allowlisted (line 40) but is NOT bound in marketplace.ts.

## Review: marketplace.ts frontend binding unit + allowlist additions

Grade: **PASS**

All four files are internally consistent and the security gate is intact. No P0 or P1 findings. Verified against the actual source of truth (businessDispatcher cases 2037-2118, the `JSON.stringify(result)` serializer at line 7167, GeoLogisticsRoutingEngine, MarketplaceSeedingEngine, businessDispatch.ts envelope, vendorNetwork.ts pattern), not just the unit-under-review's own comments.

### 1. SECURITY (load-bearing) — PASS

**The 9 newly-allowlisted marketplace actions are all read-only, none financial, none PII-export.** Verified each against its dispatcher case:
- `marketplace_rank_rfq` (2084) → `marketplaceMatchOrch.rankRfq` — pure ranking compute
- `marketplace_final_rank` (2078) → `marketplaceFinalRank.rank` — pure blend
- `marketplace_lead_list` (2095) → `listLeads` — read
- `marketplace_lead_get` (2100) → `getLead` — read

... [+7213 chars truncated]
