---
type: "chat-session"
source: "claude-code-cli"
session_id: "e67fc612-ca01-4124-980a-974c0e849d31"
title: "Review commit `61fb30b63d` in H:/prism (slot:quebec) — a launch-honesty fix that"
date: "2026-06-23"
first_ts: "2026-06-23T00:28:09.204Z"
last_ts: "2026-06-23T00:31:32.598Z"
cwd: "H:\\prism"
messages: 81
user_msgs: 33
assistant_msgs: 48
raw_file: "H:/.claude/projects/H--prism/e67fc612-ca01-4124-980a-974c0e849d31/subagents/agent-ade593e4b8ad45c96.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review commit `61fb30b63d` in H:/prism (slot:quebec) — a launch-honesty fix that

> **claude-code-cli** | 2026-06-23 | 81 msgs (33 user / 48 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e67fc612-ca01-4124-980a-974c0e849d31/subagents/agent-ade593e4b8ad45c96.jsonl`

## Transcript

### User | 2026-06-23T00:28:09.204Z

Review commit `61fb30b63d` in H:/prism (slot:quebec) — a launch-honesty fix that adds `sfc.sld`, `sfc.vendor_parity`, `sfc.calibration` to `FEATURE_NOT_YET_LIVE` in `mcp-server/web/src/data/pricing.ts` so they render "coming soon" instead of being billed as live.

Verify, with file:line evidence:
1. **Over-gating risk (the critical check):** are these 3 features GENUINELY unimplemented? Confirm there is NO backend HTTP route for vendor-tri-compare or sfc-calibration, and that `sfc.sld` is not reachable from the sellable `SfcCalculatorPage.tsx`. Grep `mcp-server/src/routes/` (esp. `speedfeed.ts`, `sfc.ts`) and `mcp-server/web/src/` for any client/component exposing these. If ANY of the 3 is actually wired + usable on the sellable page, marking it not-yet-live is WRONG (it would hide a live paid feature) → that is a P0. Also confirm I did NOT accidentally mark a live feature (`sfc.nine_axis`, `sfc.basic`, `sfc.stochastic`, `sfc.export`).
2. **Mechanism correctness:** `canUseFeature` (`src/lib/entitlement.ts:60-63`) returns false for a not-yet-live feature on every tier; `UpgradePrompt.tsx` renders coming-soon. Confirm.
3. **Consumer consistency:** does the pricing TABLE (`src/pages/PricingPage.tsx` / `SubscriptionPage.tsx`) still render these 3 as "Included" for paid tiers, which would CONTRADICT the "coming soon" gate? If so, flag it (the table should mark not-yet-live features consistently). Read how the page renders the entitlement matrix.
4. **Test legitimacy:** `src/__tests__/pricing.test.ts` new block — real assertions that would fail if the gating regressed?
Grade PASS/FAIL with P0/P1 + file:line. Concise.

### Assistant | 2026-06-23T00:28:12.170Z

I'll review commit `61fb30b63d` systematically. Let me start by examining the commit and the key files.

### Assistant | 2026-06-23T00:28:13.226Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:28:13.653Z

[tool_use: Bash]

### User | 2026-06-23T00:28:17.607Z

[tool_result] commit 61fb30b63d374553339685b0916bc18f0abc1be6
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 19:27:39 2026 -0500

    [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-FEATURE-HONESTY (slot:quebec): gate unimplemented advanced-SFC features not-yet-live (no launch overselling)
    
    Launch-honesty fix (R12). The entitlement matrix advertised sfc.sld / sfc.vendor_parity / sfc.
... [+1205 chars truncated]

### User | 2026-06-23T00:28:18.709Z

[tool_result] commit 61fb30b63d374553339685b0916bc18f0abc1be6
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 19:27:39 2026 -0500

    [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-FEATURE-HONESTY (slot:quebec): gate unimplemented advanced-SFC features not-yet-live (no launch overselling)
    
    Launch-honesty fix (R12). The entitlement matrix advertised sfc.sld / sfc.vendor_parity / sfc.
... [+6648 chars truncated]

### Assistant | 2026-06-23T00:28:21.743Z

Now let me read the full pricing.ts to understand FeatureKey, the entitlement matrix, and confirm the live/not-live features. Let me also read the entitlement lib, the SFC page, and pricing/subscription pages.

### Assistant | 2026-06-23T00:28:22.231Z

[tool_use: Read]

### Assistant | 2026-06-23T00:28:22.677Z

[tool_use: Read]

### User | 2026-06-23T00:28:24.333Z

[tool_result] 1	/**
2	 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
3	 *
4	 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
5	 * Anchored on the tested backend catalog:
6	 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
7	 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
8	 *   - one-time post prices    -> StripeBillingEngine.t
... [+13703 chars truncated]

### User | 2026-06-23T00:28:24.903Z

[tool_result] 1	/**
2	 * Entitlement resolution -- pure FE logic bridging a user's live plan to the
3	 * canonical entitlement matrix (data/pricing.ts) and the backend 403 contract.
4	 *
5	 * Single source of truth for "can this plan use this feature right now":
6	 *   - the matrix (ENTITLEMENT_MATRIX) decides per-plan inclusion;
7	 *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
8	
... [+3663 chars truncated]

### Assistant | 2026-06-23T00:28:28.960Z

I have the core mechanism confirmed. Now let me verify the over-gating risk by searching for backend routes and the SfcCalculatorPage, plus the consumer pages (PricingPage/SubscriptionPage).

### Assistant | 2026-06-23T00:28:30.380Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:28:32.275Z

[tool_use: Grep]

### Assistant | 2026-06-23T00:28:32.949Z

[tool_use: Bash]

### User | 2026-06-23T00:28:35.347Z

[tool_result] mcp-server\src\routes\calibration.ts:2: * Calibration Routes — INFRA-5-1 U-CAL3
mcp-server\src\routes\calibration.ts:4: * POST /api/v1/calibration/actuals — Ingest measured actuals for calibration feedback
mcp-server\src\routes\calibration.ts:5: * GET  /api/v1/calibration/status  — Calibration state summary
mcp-server\src\routes\calibration.ts:8: * calibration update jobs via BullMQ.
mcp-server\sr
... [+4432 chars truncated]

### User | 2026-06-23T00:28:42.071Z

[tool_result] calibration.ts
sfc.ts
speedfeed.ts
vibration.ts

### User | 2026-06-23T00:28:44.957Z

[tool_result] CalculatorPage.tsx
SfcCalculatorPage.tsx
SpeedFeedPage.tsx
ThreadCalcPage.tsx

### Assistant | 2026-06-23T00:28:48.057Z

Important finding: there ARE `sfc.ts`, `speedfeed.ts`, `calibration.ts`, and `vibration.ts` route files. The commit claims "vendor_parity + calibration have no route at all" — but `calibration.ts` exists. I need to verify whether these routes are wired to the frontend SfcCalculatorPage and whether they back the `sfc.calibration` / `sfc.vendor_parity` / `sfc.sld` features specifically. Let me read the route files and the SFC page.

### Assistant | 2026-06-23T00:28:49.003Z

[tool_use: Read]

### Assistant | 2026-06-23T00:28:49.106Z

[tool_use: Read]

### User | 2026-06-23T00:28:52.469Z

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

### User | 2026-06-23T00:28:52.828Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Speed/Feed Orchestrator Routes
3	 * Full pipeline: resolve → compute → stochastic → compare → optimize
4	 */
5	import { Router } from "express";
6	import type { CallToolFn } from "./index.js";
7	
8	export function createSpeedFeedRouter(callTool: CallToolFn): Router {
9	  const router = Router();
10	
11	  // POST /api/v1/speed-feed/orchestrate — Full pipeline
12	  rout
... [+2991 chars truncated]

### Assistant | 2026-06-23T00:28:59.636Z

Now I have the route picture. Key observations:
- `sfc.ts` exposes: calculate, cycle-time, engagement, deflection, power-torque, surface-finish, tool-life. No vendor-tri-compare, no SLD/chatter, no SFC calibration endpoint.
- `speedfeed.ts` exposes: orchestrate, quick, stochastic, resolve/*, compare, optimize, inventory-select, tool-roi. `/compare` is scenario compare (sf_compare), NOT vendor tri-compare. `/stochastic` exists (backs sfc.stochastic, which is correctly NOT gated).
- `calibration.ts` is the INFRA-5-1 prediction-outcomes ingestion route (`/api/v1/calibration/actuals` + `/status`) — internal model-feedback, not the sellable `sfc.calibration` closed-loop feature.

Now let me check the SfcCalculatorPage and the vibration route (the "only backend is /vibration/chatter" claim), plus confirm the consumer pricing pages.

### Assistant | 2026-06-23T00:29:00.097Z

[tool_use: Read]

### Assistant | 2026-06-23T00:29:00.564Z

[tool_use: Read]

### User | 2026-06-23T00:29:01.872Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\pages\SfcCalculatorPage.tsx' was already read 11m ago in this session and is unchanged (mtime 1782159370557). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-23T00:29:02.597Z

[tool_result] 1	/**
2	 * PRISM Vibration Routes -- /api/v1/vibration/*
3	 *
4	 * Wired to real prism_vibration_physics actions (U-FE-VIBRATION-ACTION-FIX, slot:sierra). The prior
5	 * action names (stability_lobe_calculate / modal_analysis / chatter_detect / process_damping) did NOT
6	 * exist on the dispatcher -> z.enum reject -> silent HTTP 200 + {error}. All endpoints are POST
7	 * (req.body), so the SPA own
... [+2040 chars truncated]

### Assistant | 2026-06-23T00:29:06.629Z

The read-once guard says I already read SfcCalculatorPage.tsx, but I don't have it in context (this is a fresh agent thread). Let me grep it directly for the three feature areas and confirm the page exists/length, then check the consumer pages.

### Assistant | 2026-06-23T00:29:07.598Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:29:09.611Z

[tool_use: Grep]

### User | 2026-06-23T00:29:12.232Z

[tool_result] 413 H:/prism/mcp-server/web/src/pages/SfcCalculatorPage.tsx

### User | 2026-06-23T00:29:14.374Z

[tool_result] 216:    { id: "advanced", label: "9-Axis" },
397:          {/* QX2: full 9-axis orchestrator + UQ, gated behind the sfc.nine_axis
400:            <FeatureGate feature="sfc.nine_axis">

### Assistant | 2026-06-23T00:29:18.501Z

This confirms the over-gating check decisively. The sellable `SfcCalculatorPage.tsx` (413 lines) only references `9-Axis` and `sfc.nine_axis` (via `FeatureGate`) — there is NO reference to vendor tri-compare, SLD/chatter, calibration, or stochastic anywhere on the page. The three gated features are genuinely not reachable from the sellable page.

Now let me read the FeatureGate component (around line 397-400) and the consumer pricing pages to check consistency.

### Assistant | 2026-06-23T00:29:19.506Z

[tool_use: Read]

### Assistant | 2026-06-23T00:29:20.924Z

[tool_use: Bash]

### User | 2026-06-23T00:29:20.980Z

[tool_result] 380	            />
381	          )}
382	          {rightTab === "compare" && (
383	            <ComparisonView
384	              entries={comparison}
385	              onRemove={handleRemoveFromComparison}
386	              imperial={imperial}
387	            />
388	          )}
389	          {rightTab === "history" && (
390	            <CalculationHistory
391	              entries={fullHistory}
3
... [+788 chars truncated]

### Assistant | 2026-06-23T00:29:21.968Z

[tool_use: Grep]

### User | 2026-06-23T00:29:28.466Z

[tool_result] BatchPlanningPage.tsx
CapacityPlanningPage.tsx
JobPlannerPage.tsx
MaterialPricingPage.tsx
PricingPage.tsx
SubscriptionPage.tsx

### User | 2026-06-23T00:29:30.781Z

[tool_result] Found 19 files
mcp-server\web\src\__tests__\pricing.test.ts
mcp-server\web\src\data\pricing.ts
mcp-server\web\src\pages\PostProcessorStorePage.tsx
mcp-server\web\src\pages\PricingPage.tsx
mcp-server\web\src\__tests__\UpgradePrompt.test.tsx
mcp-server\web\src\__tests__\routeFeatureGates.test.ts
mcp-server\web\src\__tests__\PostProcessorStorePage.test.tsx
mcp-server\web\src\components\entitlement\in
... [+589 chars truncated]

### system

... [1 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-23T00:29:35.824Z

[tool_use: Read]

### Assistant | 2026-06-23T00:29:36.120Z

[tool_use: Read]

### User | 2026-06-23T00:29:36.257Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\pages\PricingPage.tsx' was already read 13s ago in this session and is unchanged (mtime 1782152963448). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T00:29:36.595Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\UpgradePrompt.tsx' was already read 9m ago in this session and is unchanged (mtime 1782132712015). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### Assistant | 2026-06-23T00:29:38.822Z

The read-once guard is blocking me on files I haven't actually read in this thread. Let me bypass it with the env var since I genuinely need this content for the consumer-consistency check.

### Assistant | 2026-06-23T00:29:40.242Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:29:42.651Z

[tool_use: Grep]

### Assistant | 2026-06-23T00:29:43.965Z

[tool_use: Grep]

### User | 2026-06-23T00:29:45.802Z

[tool_result]   259 H:/prism/mcp-server/web/src/pages/PricingPage.tsx
  123 H:/prism/mcp-server/web/src/pages/SubscriptionPage.tsx
   85 H:/prism/mcp-server/web/src/components/entitlement/UpgradePrompt.tsx
  467 total

### User | 2026-06-23T00:29:48.376Z

[tool_result] 7:  ENTITLEMENT_MATRIX,
9:  FEATURE_NOT_YET_LIVE,
10:  entitlementLabel,
38:  if (token === 'Included') {
40:      <svg width="16" height="16" viewBox="0 0 16 16" aria-label="Included" role="img" className="text-emerald-400">
72:  const featureKeys = Object.keys(ENTITLEMENT_MATRIX) as FeatureKey[];
230:                    {FEATURE_NOT_YET_LIVE[fk] && (
232:                        {FEATURE_NOT_YET_
... [+107 chars truncated]

### User | 2026-06-23T00:29:48.693Z

[tool_result] No matches found

### Assistant | 2026-06-23T00:29:53.060Z

Excellent — this is the crux of item 3. PricingPage.tsx imports and uses `FEATURE_NOT_YET_LIVE` (lines 9, 230-232) AND renders the matrix cell mark (line 239). I need to read the actual render block (lines ~210-250) to see whether the "coming soon" note is shown ALONGSIDE the "Included" cell mark (consistent) or whether the cell still independently shows "Included" without any caveat. Let me read that section, the CellMark logic, and the UpgradePrompt + SubscriptionPage.

### Assistant | 2026-06-23T00:29:54.004Z

[tool_use: Read]

### Assistant | 2026-06-23T00:29:54.602Z

[tool_use: Read]

### User | 2026-06-23T00:29:55.537Z

[tool_result] 200	                    Perpetual license at launch
201	                  </span>
202	                )}
203	              </section>
204	            );
205	          })}
206	        </div>
207	
208	        {/* Feature comparison matrix (md+; cards above are the mobile view) */}
209	        <h2 className="mb-4 mt-12 font-mono text-xl font-bold text-slate-100">Compare every feature</h2>
210	       
... [+2222 chars truncated]

### User | 2026-06-23T00:29:56.024Z

[tool_result] 30	  monthly: 'Monthly',
31	  annual: 'Annual (2 months free)',
32	};
33	
34	const ONE_TIME_ORDER = ['sfc_perpetual', 'post_perpetual', 'post_bundle_5', 'post_bundle_all'];
35	
36	// Inline marks keep the file ASCII-clean (ascii-guard) while still showing icons.
37	function CellMark({ token }: { token: string }) {
38	  if (token === 'Included') {
39	    return (
40	      <svg width="16" height="16
... [+967 chars truncated]

### Assistant | 2026-06-23T00:30:03.043Z

This is the key consistency finding. The PricingPage matrix at lines 230-234 DOES render the `FEATURE_NOT_YET_LIVE[fk]` note (a violet "coming soon" badge) next to the feature label whenever a feature is gated — and this is driven directly off `FEATURE_NOT_YET_LIVE`, so the 3 newly-added SFC features automatically get the badge. So the table is consistent: the not-yet-live note appears alongside the cell marks. 

The cell marks themselves (line 239) still render the green "Included" checkmark for paid tiers (because `ENTITLEMENT_MATRIX` is unchanged — the features are still "sold/included" in the tier, just not yet activated). This is the intended pattern (matching quoting/erp, which have always shown "Included" + the Wave badge). The badge provides the disambiguation, so this is internally consistent — NOT a contradiction. This is exactly the pre-existing pattern for quoting/erp.

Let me confirm the UpgradePrompt renders coming-soon (item 2) and check SubscriptionPage doesn't have a separate matrix that would contradict.

### Assistant | 2026-06-23T00:30:03.995Z

[tool_use: Read]

### Assistant | 2026-06-23T00:30:04.436Z

[tool_use: Read]

### User | 2026-06-23T00:30:04.581Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\UpgradePrompt.tsx' was already read 10m ago in this session and is unchanged (mtime 1782132712015). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PR
... [+17 chars truncated]

### User | 2026-06-23T00:30:05.215Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\pages\SubscriptionPage.tsx' was already read 30s ago in this session and is unchanged (mtime 1782154866826). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-23T00:30:09.157Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:30:10.889Z

[tool_use: Grep]

### User | 2026-06-23T00:30:17.207Z

[tool_result]      1	/**
     2	 * UpgradePrompt -- shown when a plan lacks a feature. Tells the user the
     3	 * cheapest tier that unlocks it (or "coming soon" for a not-yet-live wave) and
     4	 * routes them to /pricing or the billing portal. Pure presentation off the
     5	 * canonical registry + entitlement rules; no fetch.
     6	 */
     7	import { useNavigate } from 'react-router-dom';
     8	impor
... [+3406 chars truncated]

### User | 2026-06-23T00:30:19.616Z

[tool_result] No matches found

### Assistant | 2026-06-23T00:30:29.646Z

Item 2 confirmed: `UpgradePrompt.tsx:34-46` — when `isNotYetLive(feature)` is true, it renders a "coming soon" card with the not-yet-live note and NO purchase/upgrade CTA (no "View Plans" with price). The `canUseFeature` mechanism (`entitlement.ts:60-62`) returns false for any not-yet-live feature on every plan. Both confirmed.

SubscriptionPage.tsx has NO entitlement matrix/feature table (no matches) — so it cannot contradict the gate. Item 3 is clean.

Now let me verify the test file legitimacy (item 4) — confirm `PLAN_ORDER` is imported in the test, and that the assertions are real and would fail on regression. Let me read the test file's imports/setup region.

### Assistant | 2026-06-23T00:30:29.781Z

[tool_use: Read]

### User | 2026-06-23T00:30:30.942Z

[tool_result] 1	import { describe, it, expect } from 'vitest';
2	import {
3	  PLAN_ORDER,
4	  PLAN_TIERS,
5	  ONE_TIME_PRODUCTS,
6	  POST_SUBSCRIPTION_USD,
7	  ENTITLEMENT_MATRIX,
8	  FEATURE_LABELS,
9	  entitlementFor,
10	  planIncludes,
11	  formatPrice,
12	  entitlementLabel,
13	  getPlan,
14	  FEATURE_NOT_YET_LIVE,
15	  type FeatureKey,
16	} from '../data/pricing';
17	import { isNotYetLive, canUseFeature } 
... [+930 chars truncated]

### Assistant | 2026-06-23T00:30:42.342Z

`PLAN_ORDER` is imported (line 3) and used in the new tests. The test block (lines 162-201 from the diff) is real:
- `isNotYetLive(fk)` true + `FEATURE_NOT_YET_LIVE[fk]` is a non-empty string for all 3 — would fail if a key were removed from the map.
- `canUseFeature(fk, id) === false` for all plans incl enterprise — the core gate; would fail if the feature became live or the gate regressed.
- Over-gating guard: `isNotYetLive('sfc.nine_axis') === false` + `canUseFeature('sfc.nine_axis','starter') === true` — would fail if the live feature were accidentally gated.
- `sfc.basic` live for free; `quoting`/`erp` stay gated.

These are intent-encoding assertions that fail on real regression (R9). One minor stylistic note: lines like `expect((FEATURE_NOT_YET_LIVE[fk] as string).length >= 3).toBe(true)` use `expect(boolean).toBe(true)` rather than `.toBeGreaterThanOrEqual(3)` — works correctly but yields a less informative failure message. P2, not blocking.

Let me do a final adversarial check: confirm no OTHER sellable component reaches these 3 features (e.g. `AdvancedSpeedFeedPanel` or `CalculatorPage` exposing vendor/sld/calibration on a sellable route), and confirm the `/compare` route is scenario-compare not vendor-compare.

### Assistant | 2026-06-23T00:30:44.224Z

[tool_use: Grep]

### Assistant | 2026-06-23T00:30:45.513Z

[tool_use: Grep]

### User | 2026-06-23T00:30:46.644Z

[tool_result] mcp-server\web\src\data\pricing.ts:32:  | 'sfc.sld'
mcp-server\web\src\data\pricing.ts:33:  | 'sfc.vendor_parity'
mcp-server\web\src\data\pricing.ts:34:  | 'sfc.calibration'
mcp-server\web\src\data\pricing.ts:90:      '9-axis orchestrator, SLD/chatter, vendor tri-compare',
mcp-server\web\src\data\pricing.ts:169:    grants: ['sfc.basic', 'sfc.nine_axis', 'sfc.sld', 'sfc.vendor_parity', 'sfc.export'
... [+1817 chars truncated]

### User | 2026-06-23T00:30:47.385Z

[tool_result] mcp-server\src\routes\speedfeed.ts:62:      const result = await callTool("prism_calc", "sf_compare", req.body);

### Assistant | 2026-06-23T00:30:55.016Z

This closes the loop on the over-gating check. The 3 features `sfc.sld` / `sfc.vendor_parity` / `sfc.calibration` appear ONLY in:
- `pricing.ts` (registry: type, label, matrix, grants, not-yet-live)
- test files (`entitlement.test.ts`, `FeatureGate.test.tsx`, `pricing.test.ts`) — test references, not user-reachable UI
- NO sellable page/component renders them, NO `FeatureGate feature="sfc.sld/vendor_parity/calibration"`, NO route. The `/compare` route is `sf_compare` (scenario comparison), not vendor tri-compare. None of the 3 is user-reachable.

One pre-existing inconsistency worth noting (NOT introduced by this commit, but adjacent): `entitlement.test.ts:74-75` still asserts `canUseFeature('sfc.sld','starter') === true` and `canUseFeature('sfc.vendor_parity','starter') === true`. After this commit those features are not-yet-live, so `canUseFeature` now returns `false` — these two pre-existing assertions are now CONTRADICTED by the new behavior and would FAIL. Let me verify the current state of that test file to confirm whether it was updated or is now broken.

### Assistant | 2026-06-23T00:30:55.972Z

[tool_use: Read]

### User | 2026-06-23T00:30:57.014Z

[tool_result] 60	    expect(isNotYetLive('cadcam')).toBe(false);
61	    expect(notYetLiveNote('sfc.basic') ?? 'no-note').toBe('no-note');
62	  });
63	});
64	
65	describe('canUseFeature (plan ceiling AND live)', () => {
66	  it('free tier: only basic SFC (numeric cap counts as usable), everything paid denied', () => {
67	    expect(canUseFeature('sfc.basic', 'free')).toBe(true); // 10/day != 0
68	    expect(canU
... [+2617 chars truncated]

### Assistant | 2026-06-23T00:31:03.965Z

This is a confirmed P0 regression. `entitlement.test.ts` was NOT updated by this commit, and three of its now-stale assertions directly contradict the new `FEATURE_NOT_YET_LIVE` behavior:

- **Line 74:** `expect(canUseFeature('sfc.sld', 'starter')).toBe(true)` — after the commit, `sfc.sld` is not-yet-live, so `canUseFeature` returns **false**. This assertion now **FAILS**.
- **Line 75:** `expect(canUseFeature('sfc.vendor_parity', 'starter')).toBe(true)` — same; now **FAILS**.
- **Line 85:** `expect(canUseFeature('sfc.calibration', 'pro')).toBe(true)` — `sfc.calibration` is now not-yet-live, returns **false**. Now **FAILS**.

The commit message claims "20/20 pricing.test.ts" and "tsc clean" — but `pricing.test.ts` is a *different file* from `entitlement.test.ts`. The author verified the new test file but did not run the sibling `entitlement.test.ts`, which the same behavior change breaks. This is exactly the R12 failure mode the commit purports to fix ("tests pass" is a lie if you didn't run the affected suite). The full web test suite is now RED.

Let me confirm by running the affected test file.

### Assistant | 2026-06-23T00:31:05.451Z

[tool_use: Bash]

### User | 2026-06-23T00:31:10.391Z

[tool_result] [31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/__tests__/entitlement.test.ts:[2m74:49[22m[39m
    [90m 72| [39m  it('starter unlocks the SFC pro band but not pro-tier features', () …
    [90m 73| [39m    [34mexpect[39m([34mcanUseFeature[39m([32m'sfc.nine_axis'[39m[33m,[39m [32m'starter'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)[33m;[39m
    
... [+2158 chars truncated]

### Assistant | 2026-06-23T00:31:32.598Z

Confirmed empirically: `entitlement.test.ts` is now **RED — 2 test cases failing** (the `it` at line 72 fails on line 74, and the `it` at line 85 fails on line 85). The new behavior introduced by the commit breaks the pre-existing sibling test suite. The commit shipped a partial green ("20/20 pricing.test.ts") while leaving the affected `entitlement.test.ts` broken — a `stop_on_failing_tests` violation and the exact R12 failure the commit set out to prevent.

I have everything needed. Here is my verdict.

---

VERDICT: FAIL

summary: The launch-honesty intent is sound and the over-gating check passes cleanly — the 3 features (`sfc.sld`, `sfc.vendor_parity`, `sfc.calibration`) are genuinely unreachable (no sellable-page UI, no backing route), the gate mechanism is correct, and the PricingPage/UpgradePrompt consumers stay consistent. BUT the behavior change silently breaks the sibling `entitlement.test.ts` (verified RED: 2 cases fail), which the commit never ran or updated — a partial-green ship that is itself the R12 failure the commit claims to fix.

findings:
- [P0] `mcp-server/web/src/__tests__/entitlement.test.ts:74,75,85` -- the commit makes `sfc.sld`/`sfc.vendor_parity`/`sfc.calibration` not-yet-live, so `canUseFeature` now returns `false`, but these pre-existing assertions still expect `true`. Empirically confirmed RED: `npx vitest run entitlement.test.ts` -> 2 failed / 16 passed. The web test suite is broken; commit claims "20/20 pricing.test.ts / tsc clean" but never ran the affected sibling suite (the `entitlement.test.ts` file owns `canUseFeature` coverage). This is a `stop_on_failing_tests` violation and the exact R12 lie the commit set out to prevent. -- Fix: update lines 74-76 to `expect(canUseFeature('sfc.sld'|'sfc.vendor_parity', 'starter')).toBe(false)` and line 85 to `expect(canUseFeature('sfc.calibration', 'pro')).toBe(false)`; relocate the matrix-inclusion intent those lines encoded to `planIncludes(...)`/`entitlementFor(...)` assertions (which re
... [+2112 chars truncated]
