---
type: "chat-session"
source: "claude-code-cli"
session_id: "ca9b9050-43d7-4390-93f4-e31f19be4b82"
title: "Independent silent-breakage review of a frontend wiring change (PRISM QUOTING/U-"
date: "2026-06-23"
first_ts: "2026-06-23T19:02:52.632Z"
last_ts: "2026-06-23T19:07:24.802Z"
cwd: "H:\\prism\\mcp-server"
messages: 86
user_msgs: 32
assistant_msgs: 54
raw_file: "H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a175c1cb1091f87b4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# Independent silent-breakage review of a frontend wiring change (PRISM QUOTING/U-

> **claude-code-cli** | 2026-06-23 | 86 msgs (32 user / 54 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a175c1cb1091f87b4.jsonl`

## Transcript

### User | 2026-06-23T19:02:52.632Z

Independent silent-breakage review of a frontend wiring change (PRISM QUOTING/U-QT04, charlie). A make-vs-buy outsource recommendation was surfaced in the quoting UI. Read:

1. H:\prism\mcp-server\web\src\pages\QuoteBuilderPage.tsx (new mappers + outsource state + fetch + "Make vs buy" panel; search "U-QT04")
2. H:\prism\mcp-server\web\src\api\client.ts (quoteOutsourceRecommend + OutsourceReport)
3. H:\prism\mcp-server\src\engines\OutsourceRecommenderEngine.ts (the engine -- verify the FE inputs are within its valid domain)
4. H:\prism\mcp-server\src\schemas\quotingActionSchemas.ts (outsourceRecommendSchema -- verify the FE payload passes Zod validation)

You are weighted toward SILENT BREAKAGE the feature review misses:
- The Zod schema requires `in_house_total_usd: z.number().positive()` and `estimated_volume_cm3_per_part: z.number().positive()` and `in_house_lead_time_days: z.number().nonnegative()`. Trace the FE: can it ever send a non-positive in_house_total (e.g. estimate.total is 0/NaN -> the fetch is gated, confirm) or a non-positive volume proxy or a negative lead time? The leadDays computation uses Math.max(1, ...) and the volProxy is a fixed 30/60/120 -- confirm both are always positive.
- mapToleranceMmToClass: trace the branch boundaries (>=0.1 coarse, >=0.025 medium, >=0.005 fine, else very_fine; invalid/<=0 -> medium). Any input that returns undefined or falls through? Is the <=0 / NaN guard correct?
- Does the new fetch run in the existing Promise.allSettled estimate flow without blocking it, and does its .catch isolate failures (a failed outsource call must not break the estimate render)?
- Any React key/state issue, double-render, or stale-closure risk with the new `outsource` state?
- Does adding the import `quoteOutsourceRecommend` + `OutsourceReport` to the page risk a circular import or missing export?

Grade PASS or FAIL with P0/P1/P2 and file:line citations.

### Assistant | 2026-06-23T19:02:54.690Z

I'll start by reading all four files in parallel to trace the silent-breakage paths.

### Assistant | 2026-06-23T19:02:55.629Z

[tool_use: Read]

### Assistant | 2026-06-23T19:02:56.099Z

[tool_use: Read]

### User | 2026-06-23T19:02:56.561Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\client.ts' was already read 8s ago in this session and is unchanged (mtime 1782240976922). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T19:02:56.573Z

[tool_use: Read]

### Assistant | 2026-06-23T19:02:56.792Z

[tool_use: Read]

### User | 2026-06-23T19:02:57.080Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1115 of 2847 total (54219 tokens, cap 25000). Call Read with offset=1116 limit=1115 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
2	import { Link, us
... [+48338 chars truncated]

### User | 2026-06-23T19:02:57.285Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\OutsourceRecommenderEngine.ts' was already read 9s ago in this session and is unchanged (mtime 1779688452280). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### User | 2026-06-23T19:02:57.398Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\schemas\quotingActionSchemas.ts' was already read 16m ago in this session and is unchanged (mtime 1782240004459). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-23T19:03:03.929Z

I have the schema and engine context. Let me read the remaining sections: the new outsource fetch logic in the page (search for U-QT04 fetch site), the client.ts function/type, the engine body, and the schema. The cache guard means client.ts, engine, and schema are already in my context from a prior read this session — but I must verify I actually have them. Let me grep the page for the fetch site and read the client/engine/schema content I need.

### Assistant | 2026-06-23T19:03:05.806Z

[tool_use: Grep]

### User | 2026-06-23T19:03:06.710Z

[tool_result] 19:  quoteOutsourceRecommend,
356:// U-QT04: strict-enum mappers for the make-vs-buy outsource recommender, whose engine accepts only
360:  // grind/other have no outsource rate-card entry -> clamp to mill (the closest prismatic baseline).
464:      label: 'Run outsource compare',
466:        'Current risk posture is high enough that the quote should stay in-house first but still trigger a formal 
... [+2925 chars truncated]

### Assistant | 2026-06-23T19:03:07.083Z

[tool_use: Grep]

### User | 2026-06-23T19:03:08.076Z

[tool_result] 1537-  quantity?: number;
1538-  buyer_region?: string;
1539-  category: string;
1540-  expedite?: boolean;
1541-  same_metro?: boolean;
1542-  current_vendor_id?: string;
1543-}): Promise<PrismResponse> {
1544-  // Generic prism_quoting dispatch: { action, params } -> POST /api/v1/quoting/.
1545-  return request('POST', '/quoting', { action: 'location_vendor_pricing', params });
1546-}
1547-
1548
... [+2122 chars truncated]

### Assistant | 2026-06-23T19:03:12.121Z

Note the type mismatch already visible: `quoteOutsourceRecommend` is typed to return `Promise<PrismResponse>`, but the page (line 1382) reads `r && r.ok ? r : null` and treats `r` as an `OutsourceReport`. Let me read the fetch site in full and the schema/engine to verify the domain.

### Assistant | 2026-06-23T19:03:13.073Z

[tool_use: Read]

### User | 2026-06-23T19:03:13.893Z

[tool_result] 1290	          material: form.material,
1291	          quantity: parseInt(form.quantity, 10) || 1,
1292	          process: form.operation,
1293	        }),
1294	        dfmRules(),
1295	        // U-3VIEW01: canonical-rate three-view pricing. Process mapped from the form
1296	        // op; machine_hours seeded at a conservative default here and refined from the
1297	        // estimate's cycle_ti
... [+5428 chars truncated]

### Assistant | 2026-06-23T19:03:14.465Z

[tool_use: Grep]

### User | 2026-06-23T19:03:15.688Z

[tool_result] 18-  // U-QP13 accuracy enhancement actions
19-  "accuracy_platt_calibrate",  // U-QP13 — wrap raw confidence with calibrated probability
20-  "accuracy_fuzzy_match_sku",  // U-QP13 — OCR-confusion-aware catalog fuzzy match
21-  "accuracy_bom_urgency",      // U-QP13 — Weibull replacement-probability for BOM lifecycle
22-  "accuracy_quote_interval",   // U-QP13 — guaranteed-correct quote bounds vi
... [+16965 chars truncated]

### Assistant | 2026-06-23T19:03:22.060Z

Now I have the schema, the FE payload, and the fetch site. Let me verify the engine's valid domain (does it tolerate the FE-clamped values, and what does `ok` mean) and confirm the fetch is gated by `Number.isFinite(inHouseTotal) && inHouseTotal > 0`. Let me read the engine body.

### Assistant | 2026-06-23T19:03:22.483Z

[tool_use: Read]

### User | 2026-06-23T19:03:22.906Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\OutsourceRecommenderEngine.ts' was already read 35s ago in this session and is unchanged (mtime 1779688452280). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-23T19:03:30.759Z

The read-once guard claims the engine is already in my context, but I do not actually have its content (the parallel read at the start errored before returning content). Let me grep the engine to verify its domain handling, the `ok` field, and any division/clamp behavior. I'll disable the cache to get the real content.

### Assistant | 2026-06-23T19:03:31.256Z

[tool_use: Bash]

### User | 2026-06-23T19:03:35.626Z

[tool_result] /**
 * OutsourceRecommenderEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT04
 *
 * Given an in-house FMV quote + current shop loading + a benchmark outsource
 * rate card, recommend in-house vs outsource with $-savings reasoning.
 *
 * Decision rules (deterministic, no LLM):
 *   1. If shop_loading_pct >= 90 (over-capacity) AND lead_time_days <= 7:
 *      → outsource (capacity-constrained) regardless o
... [+7566 chars truncated]

### Assistant | 2026-06-23T19:03:40.779Z

I now have the full engine, schema, FE payload, FE mappers, fetch site, and the client type/signature. Let me verify two remaining integration points: (1) does the route handler/dispatcher actually pass `estimated_volume_cm3_per_part` as the engine's 2nd positional arg, and (2) what `PrismResponse.result` shape comes back (does `o.result` carry the `OutsourceReport` directly, matching the other resolved calls). Let me check the dispatcher routing for `outsource_recommend` and the `PrismResponse` shape.

### Assistant | 2026-06-23T19:03:42.318Z

[tool_use: Bash]

### User | 2026-06-23T19:03:45.942Z

[tool_result] src/tools/dispatchers/quotingDispatcher.ts:424:          case "outsource_recommend": {
src/tools/dispatchers/quotingDispatcher.ts:425:            const { outsourceRecommenderEngine } = await import("../../engines/OutsourceRecommenderEngine.js");
src/tools/dispatchers/quotingDispatcher.ts:427:            const { estimated_volume_cm3_per_part, ...rest } = d;
src/tools/dispatchers/quotingDispatcher.t
... [+101 chars truncated]

### Assistant | 2026-06-23T19:03:47.393Z

[tool_use: Grep]

### User | 2026-06-23T19:03:48.499Z

[tool_result] No matches found

### Assistant | 2026-06-23T19:04:00.104Z

The dispatcher correctly destructures `estimated_volume_cm3_per_part` and passes it as the 2nd positional arg, with `rest` (the schema-validated remainder) as `OutsourceInputs`. Let me confirm the `PrismResponse` definition (where it's imported from) and the dispatcher block context around line 424 to verify the result is wrapped consistently with the sibling calls.

### Assistant | 2026-06-23T19:04:00.511Z

[tool_use: Bash]

### Assistant | 2026-06-23T19:04:00.718Z

[tool_use: Read]

### User | 2026-06-23T19:04:01.603Z

[tool_result] 415	            result = assessUnderQuotes(records, { bandPct: d.bandPct, topN: d.topN });
416	            break;
417	          }
418	          // ── U-QT03/04/05 ──
419	          case "quote_xometry_style": {
420	            const { xometryStyleQuoteInputsEngine } = await import("../../engines/XometryStyleQuoteInputsEngine.js");
421	            result = xometryStyleQuoteInputsEngine.quote(parsed.
... [+1081 chars truncated]

### User | 2026-06-23T19:04:03.674Z

[tool_result] 16:  PrismResponse,
62:): Promise<PrismResponse<T>> {
63:  return fetchJson<PrismResponse<T>>(`${API_BASE}${path}`, {
105:}): Promise<PrismResponse> {
115:}): Promise<PrismResponse> {
---IMPORT---
types.ts:7:export interface PrismResponse<T = Record<string, unknown>> {

### Assistant | 2026-06-23T19:04:07.180Z

I now have everything needed to trace every silent-breakage path. Let me confirm the `PrismResponse` shape (the `result` field) and how the route wraps the dispatcher output, since the FE reads `o.result`.

### Assistant | 2026-06-23T19:04:08.141Z

[tool_use: Read]

### User | 2026-06-23T19:04:08.975Z

[tool_result] 1	/**
2	 * PRISM Dashboard API Types
3	 * Maps to bridge endpoint response format:
4	 *   { result: {...}, safety: { score, warnings }, meta: { formula_used, uncertainty } }
5	 */
6	
7	export interface PrismResponse<T = Record<string, unknown>> {
8	  result: T;
9	  safety: {
10	    score: number;
11	    warnings: string[];
12	  };
13	  meta: {
14	    formula_used: string;
15	    uncertainty: numbe
... [+308 chars truncated]

### Assistant | 2026-06-23T19:04:09.540Z

[tool_use: Bash]

### system

... [6 middle messages omitted -- see raw_file] ...

### User | 2026-06-23T19:04:30.089Z

[tool_result] 117:export type CallToolFn = (toolName: string, action: string, params?: Record<string, any>) => Promise<any>;
122:export function registerRoutes(app: Express, callTool: CallToolFn): void {

### Assistant | 2026-06-23T19:04:36.371Z

`CallToolFn` returns `Promise<any>`, so I cannot statically confirm the `.result` field from the type alone. But the decisive evidence is behavioral parity: the FE's `quoteThreeView` and `quoteLocationVendorPricing` calls go through the exact same generic `/quoting` endpoint with the identical `(x.result as unknown as T)` unwrap and `r && r.ok` gating, and those are shipped/working (per the U-3VIEW01 / U-LVP01 memory references). The new outsource call is byte-identical in shape, so it resolves the same way. Let me do a final verification of the actual `callTool` implementation to close the R12 loop on the `.result` field.

### Assistant | 2026-06-23T19:04:37.605Z

[tool_use: Bash]

### User | 2026-06-23T19:04:44.460Z

[tool_result] src/index.ts:1389:  async function callTool(toolName: string, action: string, params: Record<string, any> = {}) {
---
src/__tests__/agentRouter.test.ts
src/__tests__/businessDispatchRoute.test.ts
src/__tests__/doc-learn-route.test.ts
src/__tests__/knowledge-routes.test.ts
src/__tests__/operator-feedback.test.ts

### Assistant | 2026-06-23T19:04:48.043Z

[tool_use: Read]

### User | 2026-06-23T19:04:48.880Z

[tool_result] 1389	  async function callTool(toolName: string, action: string, params: Record<string, any> = {}) {
1390	    // _registeredTools is a plain Record<string, RegisteredTool>, not a Map
1391	    const registeredTools = (server as any)._registeredTools ?? {};
1392	    const tool = registeredTools[toolName];
1393	    if (!tool) return { error: `Tool ${toolName} not found` };
1394	    try {
1395	      /
... [+2456 chars truncated]

### Assistant | 2026-06-23T19:04:53.188Z

Now I have the complete picture. The decisive finding: `callTool` returns the parsed dispatcher JSON. The dispatcher (`quotingDispatcher.ts:428`) sets `result = outsourceRecommenderEngine.recommend(...)`. I need to confirm whether the dispatcher wraps that in `{ result: ..., safety, meta }` (so the FE's `o.result` resolves) or returns it differently. Let me check how the dispatcher emits its final payload.

### Assistant | 2026-06-23T19:04:54.643Z

[tool_use: Bash]

### User | 2026-06-23T19:04:57.814Z

[tool_result] 4:            result = quoteScenarioGeneratorEngine.generate(parsed.data as any);
11:            result = threeViewPricingEngine.price(parsed.data as any);
20:            result = LocationAwareVendorPricingEngine.price(parsed.data as any);
28:            result = VendorUnitPriceEngine.price(parsed.data as any);
34:            result = outsideKnowledgeSourceCatalogEngine.query(parsed.data as any);

... [+777 chars truncated]

### Assistant | 2026-06-23T19:05:02.147Z

I can see the dispatcher assigns to a local `result` variable for every action (the sibling `three_view_pricing` and `location_vendor_pricing` work the same way), then emits it through a shared tail. Let me find that shared emit tail to confirm the `{ result, ... }` wrapping shape that the FE depends on.

### Assistant | 2026-06-23T19:05:03.613Z

[tool_use: Bash]

### User | 2026-06-23T19:05:07.019Z

[tool_result] 34:          content: [{ type: "text" as const, text: JSON.stringify({ error: `unknown action: ${action}` }) }],
41:          content: [{ type: "text" as const, text: JSON.stringify({ error: "schema-validation-failed", issues: parsed.error.issues }) }],
757:              content: [{ type: "text" as const, text: JSON.stringify({ error: `unhandled action: ${action}` }) }],
764:          content: [{ 
... [+224 chars truncated]

### Assistant | 2026-06-23T19:05:12.419Z

This is the decisive seam. At line 770, the dispatcher emits `JSON.stringify(result)` — NOT `JSON.stringify({ result })`. So `callTool` returns the parsed engine output **directly** (the `OutsourceReport` itself, with `ok`/`recommendation`/`in_house_total_usd` at top level), NOT wrapped in a `{ result: ... }` envelope.

That means the FE's `o.result` at line 1381 reads an `OutsourceReport.result` field that does not exist. Let me verify this is true for the sibling calls too (which would mean the whole pattern is consistently "wrong" but the engines happen to be fine) — and confirm the line 770 context applies to the success path.

### Assistant | 2026-06-23T19:05:15.792Z

[tool_use: Read]

### User | 2026-06-23T19:05:16.670Z

[tool_result] 752	            });
753	            break;
754	          }
755	          default:
756	            return {
757	              content: [{ type: "text" as const, text: JSON.stringify({ error: `unhandled action: ${action}` }) }],
758	              isError: true,
759	            };
760	        }
761	      } catch (err) {
762	        logActionTelemetry(action, Date.now() - quotingStart, false, "prism_q
... [+487 chars truncated]

### Assistant | 2026-06-23T19:05:24.716Z

Confirmed. The dispatcher emits `JSON.stringify(result)` where `result` IS the engine's `OutsourceReport` directly. So `callTool` returns the `OutsourceReport` at the top level: `{ ok, recommendation, in_house_total_usd, ... }`. There is no `.result` wrapper field.

The FE reads `o.result` (line 1381), which is `undefined`, so `r` is `null`, so `setOutsource(null)` always fires and the panel never renders.

But this exact `(x.result as unknown as T)` pattern is used by the sibling `quoteThreeView` (line 1317/1332), `quoteLocationVendorPricing` (line 1351), and the main `estimateResponse.value.result` (line 1311). If the dispatcher returns the report directly with no `.result` wrapper, those siblings would ALL be broken too. This contradicts the memory that U-3VIEW01/U-LVP01 are shipped and rendering. Let me resolve this — there must be a wrapping layer between `callTool` and the FE that I'm missing. The FE goes through `request()` / `fetchJson`, not `callTool` directly. Let me check the client `request`/`fetchJson` and whether the route or fetch layer re-wraps.

### Assistant | 2026-06-23T19:05:25.550Z

[tool_use: Read]

### User | 2026-06-23T19:05:26.707Z

[tool_result] 1	/**
2	 * PRISM API Client
3	 * Connects to F7 Bridge REST endpoints with API key authentication.
4	 * All responses follow the standard format:
5	 *   { result, safety: { score, warnings }, meta: { formula_used, uncertainty } }
6	 */
7	
8	import type {
9	  DataResponse,
10	  InstantQuoteHistory,
11	  InstantQuoteStatus,
12	  InstantQuoteLeadTimeOption,
13	  InstantQuoteQuantityBreak,
14	  Instan
... [+2860 chars truncated]

### Assistant | 2026-06-23T19:05:34.482Z

This resolves the contradiction. The FE `request()` hits `POST /api/v1/quoting` (`API_BASE = '/api/v1'` + `'/quoting'`). But the quoting route I read (`createQuotingRouter`) is mounted at a path, and at line 27 it does `res.json(result)` where `result` is the raw `callTool` output (the unwrapped engine report). 

So there are two possibilities: either (a) the `/api/v1/quoting` route is a *different* mount that wraps in `{ result }`, or (b) the FE pattern relies on a `.result` field that the dispatcher's line-770 `JSON.stringify(result)` does not provide. The sibling three-view/LVP calls use the identical pattern and are claimed shipped, so there must be wrapping. Let me find exactly which router serves `/api/v1/quoting` and whether it wraps.

### Assistant | 2026-06-23T19:05:35.957Z

[tool_use: Bash]

### User | 2026-06-23T19:05:39.428Z

[tool_result] src/routes/index.ts:28:import { createQuotingRouter } from "./quoting.js";
src/routes/index.ts:148:  // QUOTING-PIPELINE-MS0/U-QP08-HTTP — camera-intake quoting bridge (also mounted at /api/mcp/quoting for the mobile-quote page client)
src/routes/index.ts:149:  app.use("/api/v1/quoting", createQuotingRouter(callTool));
src/routes/index.ts:150:  app.use("/api/mcp/quoting", createQuotingRouter(callT
... [+108 chars truncated]

### Assistant | 2026-06-23T19:05:52.382Z

Confirmed. `/api/v1/quoting` is served by `createQuotingRouter`, whose `/` handler (`quoting.ts:26-27`) does:

```js
const result = await callTool("prism_quoting", action, params ?? {});
res.json(result);
```

`callTool` returns the parsed dispatcher output, which (dispatcher line 770) is `JSON.stringify(result)` = the **bare** `OutsourceReport`. So the HTTP response body is `{ ok, recommendation, in_house_total_usd, ... }` at the top level. There is **no `.result` wrapper**.

The FE reads `o.result` (line 1381) — which is `undefined` on this shape — so `r` is always `null`, and the Make-vs-buy panel **never renders**. But the three-view and LVP siblings use the identical `o.result` pattern through the same route and are claimed shipped/rendering. This is the contradiction I must resolve before asserting (R12). Either the siblings are *also* silently broken (a pre-existing bug the new code copied), or there is a wrapper I haven't found. Let me check `fetchJson` in requestCore — it may unwrap or the response may genuinely be bare. And let me directly check if any test asserts the `/quoting` response shape has a `.result` field.

### Assistant | 2026-06-23T19:05:55.205Z

[tool_use: Bash]

### User | 2026-06-23T19:05:59.082Z

[tool_result] === fetchJson ===
117:  return response.json().catch(() => null);
330:      const payload = await response.json().catch((parseError: unknown) => {
=== route test asserting shape ===
src/__tests__/automation-chain.test.ts
src/__tests__/GCodeTimeWire.test.ts
src/__tests__/MaterialCostBasisWire.test.ts
src/__tests__/OutboundPriceIndexEngine.test.ts
src/__tests__/QuotingClosedLoopRunnerEngine.test.ts

... [+224 chars truncated]

### Assistant | 2026-06-23T19:06:02.960Z

`fetchJson` (requestCore.ts:117) returns `response.json()` raw — no unwrapping. So the FE receives exactly what the route sends: the bare dispatcher payload. Let me confirm the dispatcher test asserts the actual response shape for these quoting actions — that's the ground truth for whether `result` is wrapped or bare.

### Assistant | 2026-06-23T19:06:04.363Z

[tool_use: Bash]

### User | 2026-06-23T19:06:07.394Z

[tool_result] 12:type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
26:function parse(out: { content: Array<{ type: "text"; text: string }> }) {
27:  return JSON.parse(out.content[0].text);
97:    expect(out.match.ok).toBe(false);
360:    expect(out.ok).toBe(false);
362:    expect(out.training_status.ok).
... [+12 chars truncated]

### Assistant | 2026-06-23T19:06:14.877Z

The dispatcher test (`parse()` at line 26-27) does `JSON.parse(out.content[0].text)` and then asserts directly on `out.ok` (line 360) — confirming the dispatcher payload is the **bare** engine result with `ok` at top level, NO `.result` wrapper. This is ground-truth verification.

So the contract is unambiguous: the HTTP body for `/api/v1/quoting` actions is `{ ok, recommendation, ... }` at top level. The FE's `o.result` read is reading a non-existent field.

Now the critical question for grading: are the siblings (`quoteThreeView`, `quoteLocationVendorPricing`, and `estimateResponse.value.result`) actually working in production with this same `.result` pattern? If they are, my contract reading is wrong somewhere. Let me check whether the main estimate endpoint (`quoteEstimate`) goes through a *different* route that DOES wrap in `{ result }` — because `estimateResponse.value.result` is read identically and the estimate definitively renders.

### Assistant | 2026-06-23T19:06:17.280Z

[tool_use: Bash]

### User | 2026-06-23T19:06:20.979Z

[tool_result] === FE: which path do these call? ===
1393:export async function quoteEstimate(params: Record<string, unknown>): Promise<PrismResponse> {
1454:export async function quoteThreeView(params: {
1534:export async function quoteLocationVendorPricing(params: {
=== their request() path ===
  return request('POST', '/quote/estimate', params);

### Assistant | 2026-06-23T19:06:25.248Z

Key distinction. `quoteEstimate` hits `/quote/estimate` (a DIFFERENT route, not `/quoting`). `quoteThreeView` and `quoteLocationVendorPricing` hit `/quoting` (the generic dispatch endpoint, same as outsource). Let me check the `/quote/estimate` route — it likely wraps in `{ result }`, which is why `estimateResponse.value.result` works — and confirm the three-view/LVP path to settle whether the new outsource code matches working siblings or broken ones.

### Assistant | 2026-06-23T19:06:28.003Z

[tool_use: Bash]

### User | 2026-06-23T19:06:31.500Z

[tool_result] === quoteThreeView / LVP request paths ===
17:  return request('POST', '/quoting', { action: 'three_view_pricing', params });
92:  return request('POST', '/quoting', { action: 'location_vendor_pricing', params });
=== /quote/estimate route wrapping ===
src/routes/cost.ts:242:  // POST /api/v1/cost/estimate — Per-part cost estimation
src/routes/cost.ts:243:  router.post("/estimate", async (req, res
... [+617 chars truncated]

### Assistant | 2026-06-23T19:06:36.429Z

`quoteEstimate` → `/quote/estimate` → `src/routes/quote.ts:91` via a `quotePost(callTool, "quote_estimate")` helper. Let me read that helper — it almost certainly wraps in `{ result: unwrapped }`, explaining why `estimateResponse.value.result` works. Then I'll confirm three_view/LVP (which share the `/quoting` bare path with outsource) — if THEY also read `o.result` against a bare body, then three-view/LVP are pre-existing-broken and outsource merely inherits the same bug.

### Assistant | 2026-06-23T19:06:37.827Z

[tool_use: Bash]

### User | 2026-06-23T19:06:41.281Z

[tool_result] === quotePost helper ===
function quotePost(callTool: CallToolFn, action: string) {
  return async (req: any, res: Response) => {
    try {
      const result = await callTool("prism_business", action, req.body ?? {});
      sendCompatResponse(res, result);
    } catch (e: any) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        resu
... [+1439 chars truncated]

### Assistant | 2026-06-23T19:06:47.192Z

The `/quote/estimate` route uses `sendCompatResponse(res, result)` which wraps into `{ result: ... }` (line 26-44). That is why `estimateResponse.value.result` works for the estimate.

But `/quoting` (the generic dispatch route serving three_view, location_vendor, AND outsource) uses `res.json(result)` with NO wrapping (`quoting.ts:27`). Let me read `sendCompatResponse` to confirm it produces a `.result` field, then conclusively determine the three_view/LVP/outsource shape on the bare `/quoting` route.

### Assistant | 2026-06-23T19:06:47.777Z

[tool_use: Read]

### User | 2026-06-23T19:06:49.751Z

[tool_result] 26	function sendCompatResponse(res: Response, result: unknown): void {
27	  if (isErrorPayload(result)) {
28	    res.status(500).json({
29	      ok: false,
30	      error: result.error,
31	      result: null,
32	      data: null,
33	    });
34	    return;
35	  }
36	
37	  const safety = isObjectLike(result) && isObjectLike(result["safety"])
38	    ? result["safety"]
39	    : { score: 1, warnings: [
... [+1160 chars truncated]

### Assistant | 2026-06-23T19:07:24.802Z

This is definitive. There are TWO different response shapes depending on the route:

- **`/quote/estimate`, `/quote/compare-materials`** (route `quote.ts`) → `sendCompatResponse` → `{ ok, result, data, safety, meta }`. The `.result` field EXISTS. → `estimateResponse.value.result` works.
- **`/quoting`** generic dispatch (route `quoting.ts:27`, `res.json(result)`) → the **bare** dispatcher payload `{ ok, recommendation, in_house_total_usd, ... }`. There is **NO `.result` field**.

The new outsource call, three_view, and location_vendor ALL hit the bare `/quoting` route and ALL read `o.result`. So either three_view/LVP are pre-existing broken (and outsource copied the bug), OR I am wrong about one of them. The siblings being claimed "shipped & rendering" might mean shipped-but-not-actually-rendering. I have hard, line-cited proof of the contract on both sides. My finding stands on verified evidence; whether the siblings share the bug is a pre-existing concern, not this diff's defect to fix — but it confirms the pattern is wrong.

I have traced every path the prompt asked about. Final verdict below.

---

VERDICT: FAIL

summary: The new outsource fetch reads `o.result` (QuoteBuilderPage.tsx:1381) to extract the `OutsourceReport`, but the `/quoting` generic-dispatch route returns the dispatcher payload **bare** (`res.json(result)` at routes/quoting.ts:27, and the dispatcher emits `JSON.stringify(result)` at quotingDispatcher.ts:770 — no `{ result }` envelope). So `o.result` is `undefined`, `r` is always `null`, `setOutsource(null)` always fires, and the Make-vs-buy panel never renders — the feature is silently dead in production while looking wired. All the schema-domain, mapper, and Promise-isolation concerns the prompt flagged are correctly handled; the response-unwrap contract is the one real defect.

findings:
- [P1] `web/src/pages/QuoteBuilderPage.tsx:1381` -- `quoteOutsourceRecommend` hits `POST /api/v1/quoting` (client.ts:1578), which is served by `createQuotingR
... [+3905 chars truncated]
