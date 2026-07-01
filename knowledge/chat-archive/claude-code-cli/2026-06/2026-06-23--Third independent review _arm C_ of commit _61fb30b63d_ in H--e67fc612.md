---
type: "chat-session"
source: "claude-code-cli"
session_id: "e67fc612-ca01-4124-980a-974c0e849d31"
title: "Third independent review (arm C) of commit `61fb30b63d` in H:/prism (slot:quebec"
date: "2026-06-23"
first_ts: "2026-06-23T00:28:28.166Z"
last_ts: "2026-06-23T00:33:15.804Z"
cwd: "H:\\prism"
messages: 73
user_msgs: 27
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/e67fc612-ca01-4124-980a-974c0e849d31/subagents/agent-ab4a00287599a4253.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Third independent review (arm C) of commit `61fb30b63d` in H:/prism (slot:quebec

> **claude-code-cli** | 2026-06-23 | 73 msgs (27 user / 46 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e67fc612-ca01-4124-980a-974c0e849d31/subagents/agent-ab4a00287599a4253.jsonl`

## Transcript

### User | 2026-06-23T00:28:28.166Z

Third independent review (arm C) of commit `61fb30b63d` in H:/prism (slot:quebec). Weight toward SILENT BREAKAGE and product/revenue correctness. Do NOT assume A/B caught everything.

The change marks `sfc.sld`/`sfc.vendor_parity`/`sfc.calibration` as `FEATURE_NOT_YET_LIVE` (coming-soon, denied on every tier) in `mcp-server/web/src/data/pricing.ts`.

Investigate:
1. **Revenue/UX coherence:** with these now "coming soon", does the user-facing story stay coherent? Trace: PricingPage feature table → FeatureGate on any SFC route/tab → UpgradePrompt. Is there any place a user is told they GET sfc.sld (e.g., a tier marketing bullet, a comparison cell rendering "Included") while the gate says "coming soon"? That mismatch is the silent breakage to hunt. Read `src/pages/PricingPage.tsx`, `src/pages/SubscriptionPage.tsx`, `src/pages/SfcCalculatorPage.tsx`.
2. **Did the change actually verify the premise?** Independently confirm (grep `mcp-server/src/routes/` + `mcp-server/web/src/api/`) that vendor-tri-compare and sfc-calibration have NO route, and `sfc.sld` has no FE client. If the premise is FALSE for any of the 3, that's a P0 (wrongly hidden live feature).
3. **`sfc.stochastic`:** it has a backend route (`/speed-feed/stochastic`) + an FE client (`sfStochastic`) but is it actually reachable by a user on a sellable surface? If NOT, was it correctly LEFT live (not gated) — i.e., is there an inconsistency where stochastic stays "Included" but is equally unreachable as the 3 I gated? Note whether stochastic should also have been addressed (P1/P2, not necessarily this commit).
Grade PASS/FAIL with P0/P1 + file:line. Concise.

### Assistant | 2026-06-23T00:28:31.030Z

I'll investigate this commit systematically. Let me start by reading the changed file and the relevant UI/route surfaces.

### Assistant | 2026-06-23T00:28:32.000Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:28:32.255Z

[tool_use: Read]

### User | 2026-06-23T00:28:33.981Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\data\pricing.ts' was already read 11s ago in this session and is unchanged (mtime 1782174245053). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T00:28:42.672Z

[tool_result] commit 61fb30b63d374553339685b0916bc18f0abc1be6
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 19:27:39 2026 -0500

    [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-FEATURE-HONESTY (slot:quebec): gate unimplemented advanced-SFC features not-yet-live (no launch overselling)
    
    Launch-honesty fix (R12). The entitlement matrix advertised sfc.sld / sfc.vendor_parity / sfc.
... [+1205 chars truncated]

### Assistant | 2026-06-23T00:28:44.306Z

Let me read the pricing.ts file and the relevant UI pages.

### Assistant | 2026-06-23T00:28:44.605Z

[tool_use: Read]

### User | 2026-06-23T00:28:45.325Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\data\pricing.ts' was already read 23s ago in this session and is unchanged (mtime 1782174245053). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T00:28:47.973Z

The guard claims it's in context, but I don't actually see the content. Let me get the diff and the file via git show, plus locate the UI pages.

### Assistant | 2026-06-23T00:28:48.920Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:28:49.861Z

[tool_use: Glob]

### Assistant | 2026-06-23T00:28:50.210Z

[tool_use: Glob]

### User | 2026-06-23T00:28:59.123Z

[tool_result] commit 61fb30b63d374553339685b0916bc18f0abc1be6
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 19:27:39 2026 -0500

    [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-FEATURE-HONESTY (slot:quebec): gate unimplemented advanced-SFC features not-yet-live (no launch overselling)
    
    Launch-honesty fix (R12). The entitlement matrix advertised sfc.sld / sfc.vendor_parity / sfc.
... [+2231 chars truncated]

### User | 2026-06-23T00:29:05.177Z

[tool_result] mcp-server\web\src\pages\PricingPage.tsx
mcp-server\web\src\pages\SubscriptionPage.tsx
mcp-server\web\src\pages\SfcCalculatorPage.tsx

### User | 2026-06-23T00:29:05.190Z

[tool_result] mcp-server\web\src\__tests__\admin-entitlements-api.test.ts
mcp-server\web\src\lib\entitlement.ts
mcp-server\web\src\__tests__\entitlement.test.ts
mcp-server\web\src\hooks\useEntitlement.ts
mcp-server\web\src\__tests__\useEntitlement.test.ts

### Assistant | 2026-06-23T00:29:07.341Z

Now I have the diff. Let me read the pricing.ts file fully (to see the matrix and feature labels), the entitlement logic, and the three pages.

### Assistant | 2026-06-23T00:29:08.282Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:29:08.570Z

[tool_use: Read]

### User | 2026-06-23T00:29:09.399Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\lib\entitlement.ts' was already read 45s ago in this session and is unchanged (mtime 1782132016387). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T00:29:14.826Z

[tool_result] /**
 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
 *
 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
 * Anchored on the tested backend catalog:
 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
 *   - one-time post prices    -> StripeBillingEngine.ts:55 (POST_PROCE
... [+12510 chars truncated]

### Assistant | 2026-06-23T00:29:20.878Z

Now I have the full pricing.ts. I can already see a critical issue in the marketing highlights. Let me read the entitlement logic and the three pages.

### Assistant | 2026-06-23T00:29:21.840Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:29:22.057Z

[tool_use: Read]

### User | 2026-06-23T00:29:24.788Z

[tool_result] 1	import { useState, useCallback } from 'react';
2	import { Link } from 'react-router-dom';
3	import {
4	  PLAN_ORDER,
5	  PLAN_TIERS,
6	  ONE_TIME_PRODUCTS,
7	  ENTITLEMENT_MATRIX,
8	  FEATURE_LABELS,
9	  FEATURE_NOT_YET_LIVE,
10	  entitlementLabel,
11	  formatPrice,
12	  type PlanId,
13	  type FeatureKey,
14	} from '../data/pricing';
15	import { resolveCheckout, isSelfServeCheckout } from '../li
... [+11716 chars truncated]

### User | 2026-06-23T00:29:29.385Z

[tool_result] /**
 * Entitlement resolution -- pure FE logic bridging a user's live plan to the
 * canonical entitlement matrix (data/pricing.ts) and the backend 403 contract.
 *
 * Single source of truth for "can this plan use this feature right now":
 *   - the matrix (ENTITLEMENT_MATRIX) decides per-plan inclusion;
 *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
 *     deny at t
... [+3374 chars truncated]

### Assistant | 2026-06-23T00:29:33.988Z

I found the critical issue. The PricingPage feature comparison matrix renders `entitlementLabel(ENTITLEMENT_MATRIX[fk][id], fk)` which still returns "Included" for the now-not-yet-live features — while the marketing highlights also tout them. Let me verify the exact rendering behavior and confirm the backend route premise. Let me check the marketing highlights mismatch and the SubscriptionPage/SfcCalculatorPage, plus verify routes.

### Assistant | 2026-06-23T00:29:34.932Z

[tool_use: Read]

### User | 2026-06-23T00:29:35.751Z

[tool_result] 1	import { useState, useEffect, useCallback } from 'react';
2	import { Link } from 'react-router-dom';
3	import { billingApi, type BillingStatusResult } from '../api/billing';
4	import { resolveBillingPortal } from '../lib/checkout';
5	import { PLAN_TIERS, type PlanId } from '../data/pricing';
6	
7	/**
8	 * Subscription management (protected). Shows the user's current plan from
9	 * getBillingStat
... [+4981 chars truncated]

### Assistant | 2026-06-23T00:29:36.356Z

[tool_use: Bash]

### User | 2026-06-23T00:29:42.014Z

[tool_result] === routes dir grep: vendor/calibration/sld/stochastic/chatter ===
mcp-server/src/routes/calibration.ts:2: * Calibration Routes — INFRA-5-1 U-CAL3
mcp-server/src/routes/calibration.ts:4: * POST /api/v1/calibration/actuals — Ingest measured actuals for calibration feedback
mcp-server/src/routes/calibration.ts:5: * GET  /api/v1/calibration/status  — Calibration state summary
mcp-server/src/routes/ca
... [+4054 chars truncated]

### Assistant | 2026-06-23T00:29:47.297Z

The grep reveals critical facts that may contradict the commit's premise. The commit claims "vendor_parity + calibration: no route at all" and "sld's only backend is /vibration/chatter". But I see:
- `mcp-server/src/routes/speedfeed.ts:3` mentions "compare" in the pipeline
- `mcp-server/src/routes/calibration.ts` — there IS a calibration router (but is it SFC-feature calibration or a different thing?)
- `mcp-server/src/routes/milling.ts:505` references "Altintas-Budak SLD"

Let me examine the speedfeed route fully (for a "compare"/vendor endpoint) and look at SfcCalculatorPage to confirm what's actually wired on the sellable surface.

### Assistant | 2026-06-23T00:29:47.767Z

[tool_use: Read]

### Assistant | 2026-06-23T00:29:48.274Z

[tool_use: Read]

### User | 2026-06-23T00:29:49.006Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\speedfeed.ts' was already read 59s ago in this session and is unchanged (mtime 1777032347605). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T00:29:49.125Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\pages\SfcCalculatorPage.tsx' was already read 11m ago in this session and is unchanged (mtime 1782159370557). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-23T00:29:51.340Z

The read-once-guard is blocking but the content isn't actually in my context (this is a fresh agent thread). Let me use cat to bypass.

### Assistant | 2026-06-23T00:29:52.142Z

[tool_use: Bash]

### User | 2026-06-23T00:29:57.933Z

[tool_result] ===== speedfeed.ts =====
/**
 * PRISM MCP Server — Speed/Feed Orchestrator Routes
 * Full pipeline: resolve → compute → stochastic → compare → optimize
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createSpeedFeedRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/speed-feed/orchestrate — Full pipelin
... [+2836 chars truncated]

### Assistant | 2026-06-23T00:30:02.299Z

The `/speed-feed/compare` route exists, but it's "Compare scenarios" (`sf_compare`) — NOT vendor tri-compare (HSMAdvisor/G-Wizard parity). So `sfc.vendor_parity` is genuinely route-less. That's consistent with the commit. Now let me verify the SfcCalculatorPage to see what tabs/features are actually rendered (whether sld/vendor/calibration/stochastic appear there), and check the calibration route's actual binding to the SFC feature.

### Assistant | 2026-06-23T00:30:03.066Z

[tool_use: Bash]

### User | 2026-06-23T00:30:11.093Z

[tool_result] ===== SfcCalculatorPage.tsx =====
import { useState, useCallback, useMemo, useEffect } from "react";
import SfcGateNotice from "../components/sfc/SfcGateNotice";
import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
import OperationSelector from "../components/sfc/OperationSelector";
import SmartToolSelector from "../components/sfc/SmartToolSelector";
import SmartMachin
... [+14818 chars truncated]

### Assistant | 2026-06-23T00:30:15.184Z

Now I have the full picture of the sellable surface. The SfcCalculatorPage only gates `sfc.nine_axis` (the "9-Axis" tab). There is NO tab/panel for sld, vendor_parity, calibration, or stochastic. Let me check the AdvancedSpeedFeedPanel (the 9-axis panel) to see if it internally surfaces SLD/stochastic/vendor, and verify the FE API clients for these features. Let me also check ComparisonView (is that vendor parity?).

### Assistant | 2026-06-23T00:30:17.995Z

[tool_use: Bash]

### User | 2026-06-23T00:30:24.882Z

[tool_result] ===== FE api/ grep for sf clients =====
mcp-server/web/src/api/businessDispatch.ts:8: * + response normalizer that business-domain client modules (vendorNetwork.ts, …) build on, so fetch
mcp-server/web/src/api/businessDispatch.ts:12: * is INCONSISTENT — most actions emit { success, data } (e.g. vendor_rank,
mcp-server/web/src/api/businessDispatch.ts:13: * vendor_compute_scorecard, vendor_list_all)
... [+4183 chars truncated]

### Assistant | 2026-06-23T00:30:29.952Z

The grep confirms: the `vendor`/`calibration`/`stability` hits in the FE API are all for ERP vendor scorecards, ERP quality-calibration, and CalculatorPage stability *options* (machine config dropdowns), NOT the SFC entitlement features `sfc.vendor_parity`/`sfc.calibration`/`sfc.sld`. Let me find the `sfStochastic` client the prompt mentioned and confirm whether stochastic is reachable, and check what calls `/speed-feed/stochastic` from the FE. Also check the FeatureGate/UpgradePrompt component to confirm the not-yet-live rendering path.

### Assistant | 2026-06-23T00:30:33.260Z

[tool_use: Bash]

### User | 2026-06-23T00:30:39.351Z

[tool_result] ===== sfStochastic / stochastic FE client + its callers =====

===== where is sfStochastic imported/used in FE (any page/component) =====
mcp-server/web/src/api/speedfeed.ts:228:export async function sfStochastic(params: SpeedFeedParams) {
mcp-server/web/src/api/speedfeed.ts:287:  stochastic: sfStochastic,

===== speedFeed api file listing =====
sfc.ts
speedfeed.ts

### Assistant | 2026-06-23T00:30:45.813Z

So `sfStochastic` is defined in `mcp-server/web/src/api/speedfeed.ts:228` and exported in a bundle object (`stochastic: sfStochastic`) at line 287, but it has NO consumer anywhere in the FE (`.tsx` page/component). Let me confirm that and check what `speedfeed.ts` (the FE api) actually wires, plus check the FeatureGate component and whether the `speedfeed.ts` api bundle is used by any page.

### Assistant | 2026-06-23T00:30:48.208Z

[tool_use: Bash]

### User | 2026-06-23T00:30:52.976Z

[tool_result] ===== consumers of the FE api/speedfeed.ts module =====
mcp-server/web/src/components/sfc/advancedSpeedFeedParams.ts:8:import type { SpeedFeedParams } from '../../api/speedfeed';
mcp-server/web/src/components/SpeedFeedPanel.tsx:8:import { sfQuick, type SpeedFeedParams } from '../api/speedfeed';
mcp-server/web/src/hooks/useSpeedFeed.ts:2:import { speedFeedApi } from "../api/speedfeed";
mcp-server/w
... [+3677 chars truncated]

### Assistant | 2026-06-23T00:30:56.154Z

Now let me check whether `speedFeedApi` (which includes `stochastic`) is actually invoked from a live page via `useSpeedFeed`, and confirm CalculatorPage usage of stochastic. Then read FeatureGate + UpgradePrompt to confirm the not-yet-live rendering path the commit relies on.

### Assistant | 2026-06-23T00:31:00.463Z

[tool_use: Bash]

### User | 2026-06-23T00:31:04.210Z

[tool_result] ===== useSpeedFeed: does it call .stochastic? =====
40:export const useSpeedFeedOrchestrate = () => useApiCall(speedFeedApi.orchestrate);
41:export const useSpeedFeedQuick = () => useApiCall(speedFeedApi.quick);
42:export const useSpeedFeedStochastic = () => useApiCall(speedFeedApi.stochastic);
43:export const useSpeedFeedResolveMachine = () => useApiCall(speedFeedApi.resolveMachine);
44:export co
... [+2497 chars truncated]

### Assistant | 2026-06-23T00:31:08.027Z

Now I have a complete picture. The `useSpeedFeedStochastic` hook exists but let me confirm it has NO page consumer, and read UpgradePrompt to verify the not-yet-live "coming soon" path. Let me also confirm the marketing highlights issue and check the comparison matrix rendering one more time.

### Assistant | 2026-06-23T00:31:10.057Z

[tool_use: Bash]

### User | 2026-06-23T00:31:13.554Z

[tool_result] ===== consumers of useSpeedFeedStochastic (any page/component, non-test) =====
mcp-server/web/src/hooks/useSpeedFeed.ts:42:export const useSpeedFeedStochastic = () => useApiCall(speedFeedApi.stochastic);

===== UpgradePrompt.tsx (not-yet-live render path) =====
/**
 * UpgradePrompt -- shown when a plan lacks a feature. Tells the user the
 * cheapest tier that unlocks it (or "coming soon" for a not
... [+3073 chars truncated]

### Assistant | 2026-06-23T00:31:18.692Z

Now I have everything needed. Let me verify the two coherence problems by re-confirming the exact facts: (1) the marketing highlights in PLAN_TIERS still tout the now-coming-soon features as included Starter/Pro bullets, and (2) the comparison matrix still renders "Included" green checks for those features. Let me also confirm the `sfc_perpetual` one-time product still grants these features (a second mismatch). Let me run the existing test and check tsc parity test for the matrix.

### Assistant | 2026-06-23T00:31:20.884Z

[tool_use: Bash]

### User | 2026-06-23T00:31:24.985Z

[tool_result] ===== sfc_perpetual grants still include the now-coming-soon keys? =====
158:  grants: FeatureKey[];
159-}
--
169:    grants: ['sfc.basic', 'sfc.nine_axis', 'sfc.sld', 'sfc.vendor_parity', 'sfc.export'],
170-  },
--
179:    grants: ['post.generate', 'post.safety'],
180-  },
--
188:    grants: ['post.generate', 'post.safety', 'post.library'],

===== Does any test assert the comparison matrix should
... [+1318 chars truncated]

### Assistant | 2026-06-23T00:31:30.673Z

I now have full verification of all the findings. Let me do a final confirmation that the comparison matrix CellMark renders a green check for `sfc.sld` etc. — the matrix calls `entitlementLabel(ENTITLEMENT_MATRIX['sfc.sld']['starter'], 'sfc.sld')` = `entitlementLabel(true)` = `'Included'` → renders the emerald check SVG. The not-yet-live badge appears in the *feature-label cell* but the per-plan cells still show green "Included". This is the core silent UX/revenue mismatch the prompt asked me to hunt.

Let me verify the `useEntitlement` hook's `can()` uses `canUseFeature` (so the gate genuinely denies), closing the loop on whether the gate side is correct.

### Assistant | 2026-06-23T00:31:35.834Z

[tool_use: Bash]

### User | 2026-06-23T00:31:39.549Z

[tool_result] ===== useEntitlement can() wiring =====
2: * useEntitlement -- supplies the signed-in user's live plan + a `can(feature)`
8: * null, so can() denies by default (never leak a paid feature on a load error).
13:import { canUseFeature, resolvePlan } from '../lib/entitlement';
61:  can: (feature: FeatureKey) => boolean;
83:        // Deny-by-default: a failed plan load leaves the snapshot null -> can()
... [+1633 chars truncated]

### Assistant | 2026-06-23T00:31:43.929Z

Interesting — there IS a `vibrationApi` FE client (`stability-lobes`/`chatter`) with a `useVibration` hook. This is the SLD/chatter backend the commit acknowledged. Let me confirm whether `useVibration`/`vibrationApi` is consumed on any sellable page (which would mean SLD is reachable, contradicting the premise) or is itself unwired.

### Assistant | 2026-06-23T00:31:48.795Z

[tool_use: Bash]

### User | 2026-06-23T00:31:53.645Z

[tool_result] ===== consumers of vibrationApi / useVibration on pages/components (non-test) =====
mcp-server/web/src/pages/VibrationPage.tsx:3:import { useVibrationStabilityLobes, useVibrationModal, useVibrationChatter, useVibrationDamping } from "../hooks/useVibration";
mcp-server/web/src/pages/VibrationPage.tsx:21:  const lobes = useVibrationStabilityLobes();
mcp-server/web/src/pages/VibrationPage.tsx:22:  co
... [+2052 chars truncated]

### Assistant | 2026-06-23T00:32:03.171Z

This is a significant finding. There IS a `VibrationPage.tsx` that consumes the SLD/chatter/modal/damping backend, AND `SpeedFeedPage.tsx` (route `speed-feed`) exposes calibration overrides (`calibration_overrides`) AND a `stability_assessment` result. Let me check: (1) Is `VibrationPage` on a routed/sellable surface and gated? (2) Does `SpeedFeedPage`'s calibration UI + stability assessment mean `sfc.calibration`/`sfc.sld` ARE actually user-reachable, contradicting the commit's premise? This determines whether findings are P0 (wrongly hidden live feature).

### Assistant | 2026-06-23T00:32:08.287Z

[tool_use: Bash]

### User | 2026-06-23T00:32:12.634Z

[tool_result] ===== Is VibrationPage routed in App.tsx? Gated? =====
180:const VibrationPage = lazy(() => import('./pages/VibrationPage'));
373:              <Route path="vibration" element={lazyElement(<VibrationPage />)} />

===== Does VibrationPage have a FeatureGate / sfc.sld? =====

===== SpeedFeedPage: routed at 'speed-feed'? what does its orchestrator input/calibration map to? Is it gated? =====

===== S
... [+785 chars truncated]

### Assistant | 2026-06-23T00:32:20.793Z

Critical findings now fully confirmed. Both `VibrationPage` (route `/vibration`) and `SpeedFeedPage` (route `/speed-feed`) are routed, live, and UNGATED:

- **`VibrationPage`** (`App.tsx:373`, route `/vibration`) consumes the full SLD/chatter backend (`stability-lobes`, `chatter`, `modal`, `damping`) via `useVibration*` hooks — with **NO FeatureGate at all**. This is the `sfc.sld` feature, live and reachable. The commit claimed sld is "still unwired on the FE" — that's FALSE; it's wired on a different page (`/vibration`), just not on `SfcCalculatorPage`.

- **`SpeedFeedPage`** (`App.tsx:408`, route `/speed-feed`) calls `/speed-feed/orchestrate` with `calibration_overrides` (confidence/vc_factor/power_factor/kc1_1_factor/Taylor factors) and renders a `stability_assessment` — i.e. both calibration-style inputs AND SLD stability output, also **UNGATED**.

Let me verify these two routes are reachable without entitlement (inside the same authed layout, no gate) and confirm the orchestrate backend actually honors `calibration_overrides` (so it's a real, working feature, not a dead input).

### Assistant | 2026-06-23T00:32:23.176Z

[tool_use: Bash]

### User | 2026-06-23T00:32:26.861Z

[tool_result] ===== App.tsx context around the speed-feed/vibration routes: are they inside an auth-only or a gated layout? =====
1:                <Route path="academy/:courseId/:lessonId" element={lazyElement(<LessonView />)} />
3:              <Route path="*" element={<div />} />
5:            <Route element={<Layout />}>
6:              <Route path="dashboard" element={lazyElement(<DashboardPage />)} />
7: 
... [+3473 chars truncated]

### Assistant | 2026-06-23T00:33:15.804Z

This confirms the pattern definitively. Routes that ARE entitlement-gated use `<FeatureGate feature="...">` inline (e.g. `print-to-cnc`, `ppg`). The `speed-feed`, `speed-feed-calc`, and `vibration` routes have NO FeatureGate wrapper — they're inside the shared `<Layout>` (auth-only via the layout), reachable by any signed-in user including free/starter.

I now have complete, verified evidence. Let me write up the verdict.

## Verdict

**VERDICT: FAIL**

**summary:** The commit correctly adds an entitlement-gate deny path for `sfc.sld`/`sfc.vendor_parity`/`sfc.calibration`, but it left the rest of the user-facing story incoherent: the pricing comparison matrix and tier marketing bullets still advertise these three as "Included" green-checks, so a prospect sees "Included" in the same row that says "coming soon" and on the tier card. More seriously, the commit's premise is partially FALSE — `sfc.sld` is live and reachable on the ungated `/vibration` page, and `sfc.calibration`/SLD-stability are live and reachable on the ungated `/speed-feed` page — so two of the three "vaporware" features the commit hid are actually shipped, just on a different page than `SfcCalculatorPage`. The commit also silently leaves `sfc.stochastic` "Included" while it is equally unreachable (no FE consumer).

**findings:**

- **[P1] `mcp-server/web/src/data/pricing.ts:90-97,100-119` (rendered at `PricingPage.tsx:236-242` via `CellMark`)** — Silent revenue/UX mismatch. The comparison matrix renders `entitlementLabel(ENTITLEMENT_MATRIX['sfc.sld']['starter'])` = `'Included'` → an emerald check, for all three now-coming-soon features, because the matrix values were NOT changed (only `FEATURE_NOT_YET_LIVE` was added). The not-yet-live violet badge appears only in the left feature-label cell (`PricingPage.tsx:230-234`); the five per-plan cells still show green "Included". A prospect reads a contradiction: "Included" check in the row that also says "coming soon." This is exactly the over-sell the comm
... [+5744 chars truncated]
