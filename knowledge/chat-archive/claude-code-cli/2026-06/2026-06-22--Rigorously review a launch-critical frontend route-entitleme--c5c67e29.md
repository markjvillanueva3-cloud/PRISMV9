---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "Rigorously review a launch-critical frontend route-entitlement gating change in "
date: "2026-06-22"
first_ts: "2026-06-22T15:19:10.467Z"
last_ts: "2026-06-22T15:20:32.748Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a178cd80440a9e6d6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Rigorously review a launch-critical frontend route-entitlement gating change in 

> **claude-code-cli** | 2026-06-22 | 33 msgs (14 user / 19 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a178cd80440a9e6d6.jsonl`

## Transcript

### User | 2026-06-22T15:19:10.467Z

Rigorously review a launch-critical frontend route-entitlement gating change in the PRISM web app (Vite+React, react-router). Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Read BOTH files end-to-end.

FILES:
1. H:/prism/mcp-server/web/src/App.tsx  (edited -- added <FeatureGate feature="KEY"> wraps to paid routes)
2. H:/prism/mcp-server/web/src/__tests__/routeFeatureGates.test.ts  (new -- gating invariant test)

CONTEXT -- the canonical entitlement matrix is H:/prism/mcp-server/web/src/data/pricing.ts (ENTITLEMENT_MATRIX, FEATURE_NOT_YET_LIVE). A feature is PAID if free=false (or free=0). The FeatureGate component (src/components/entitlement/FeatureGate.tsx) prop is `feature` (a FeatureKey) and uses canUseFeature() which returns FALSE for EVERY plan (incl enterprise) when the feature is in FEATURE_NOT_YET_LIVE (quoting, erp). So gating a quoting/erp route would lock out all users.

INTENDED GATE MAP (the change should implement exactly this, no more no less, beyond the pre-existing ppg/ppg-lite=post.generate gates):
  /print-to-cnc -> print_to_cnc
  /lathe, /lathe/wizard, /lathe/results -> wizard.lathe
  /milling, /milling/wizard, /milling/results -> wizard.mill
  /wire-edm, /wire-edm/wizard, /wire-edm/results -> wizard.wedm
  /cam-strategy -> cadcam
  /cam-ai-dashboard -> cadcam (FeatureGate must sit INSIDE the existing secure(lead) wrapper)
Must stay OPEN (NOT gated): all SFC pages (sfc.basic free-capped), /wire-edm-studio (no matrix key -- process page), quoting routes + /erp + /cost-estimator (NOT-YET-LIVE), marketing/auth/checkout, shop-floor/safety/kiosk pages, RBAC-secured ERP/HR pages, process pages with no key.

VERIFY SPECIFICALLY:
- Every intended gate uses the EXACT correct FeatureKey (not e.g. wizard.lathe on /turning). Confirm the prop name is `feature=` (NOT featureKey=) so it compiles against FeatureGateProps.
- The /cam-ai-dashboard gate is genuinely INSIDE secure(...) (both layers compose; RBAC still applies).
- NO route was acc
... [+535 chars truncated]

### Assistant | 2026-06-22T15:19:16.274Z

I'll review this launch-critical route-entitlement gating change. Let me start by reading both target files end-to-end, plus the canonical entitlement sources they depend on.

### Assistant | 2026-06-22T15:19:16.759Z

[tool_use: Read]

### Assistant | 2026-06-22T15:19:17.706Z

[tool_use: Read]

### Assistant | 2026-06-22T15:19:18.226Z

[tool_use: Read]

### Assistant | 2026-06-22T15:19:18.314Z

[tool_use: Read]

### User | 2026-06-22T15:19:18.435Z

[tool_result] 1	import { type ComponentType, type ReactNode, Suspense, lazy } from 'react';
2	import { Route, Routes, useLocation } from 'react-router-dom';
3	import { Layout } from './components/Layout';
4	import ProtectedRoute from './components/ProtectedRoute';
5	import { FeatureGate } from './components/entitlement';
6	import { RouteStageFallback, getRouteLoadingMeta } from './components/workspace/RouteStag
... [+37251 chars truncated]

### User | 2026-06-22T15:19:19.157Z

[tool_result] 1	/**
2	 * QX8 route-entitlement gating invariant (U-Q-FEATURE-PAGE-GATES).
3	 *
4	 * Binds the live App.tsx route table to the canonical entitlement matrix so a
5	 * future edit cannot silently:
6	 *   - drop a paid feature page's gate (revenue leak),
7	 *   - gate it with the wrong FeatureKey (wrong upgrade prompt / wrong tier),
8	 *   - or over-gate a FREE / NOT-YET-LIVE / safety / kiosk route 
... [+6983 chars truncated]

### User | 2026-06-22T15:19:19.344Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\data\pricing.ts' was already read 13m ago in this session and is unchanged (mtime 1782007516670). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T15:19:19.494Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\FeatureGate.tsx' was already read 12m ago in this session and is unchanged (mtime 1782132212362). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRIS
... [+15 chars truncated]

### Assistant | 2026-06-22T15:19:25.478Z

The read-once guard tells me pricing.ts and FeatureGate.tsx are already in this session's context, but as a fresh review agent I do not actually have their content. I must verify against the actual matrix, not the task prompt's summary. Let me read the relevant portions of both via Grep/offset reads.

### Assistant | 2026-06-22T15:19:26.422Z

[tool_use: Read]

### Assistant | 2026-06-22T15:19:27.581Z

[tool_use: Grep]

### User | 2026-06-22T15:19:29.709Z

[tool_result] 1	/**
2	 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
3	 *
4	 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
5	 * Anchored on the tested backend catalog:
6	 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
7	 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
8	 *   - one-time post prices    -> StripeBillingEngine.t
... [+3976 chars truncated]

### User | 2026-06-22T15:19:30.603Z

[tool_result] 29:export type FeatureKey =
235:export const FEATURE_NOT_YET_LIVE: Partial<Record<FeatureKey, string>> = {
240:export const ENTITLEMENT_MATRIX: Record<FeatureKey, Record<PlanId, Entitlement>> = {
271:  return ENTITLEMENT_MATRIX[feature]?.[plan] ?? false;

### Assistant | 2026-06-22T15:19:33.644Z

Now let me read the entitlement matrix body (lines 230-275) and the FeatureGate component to verify the prop name and the canUseFeature behavior.

### Assistant | 2026-06-22T15:19:35.066Z

[tool_use: Read]

### Assistant | 2026-06-22T15:19:35.533Z

[tool_use: Read]

### Assistant | 2026-06-22T15:19:35.665Z

[tool_use: Read]

### User | 2026-06-22T15:19:37.220Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\FeatureGate.tsx' was already read 12m ago in this session and is unchanged (mtime 1782132212362). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRIS
... [+15 chars truncated]

### User | 2026-06-22T15:19:37.996Z

[tool_result] 230	  simulation: 'Simulation',
231	  api_access: 'API access',
232	};
233	
234	/** Features sold but whose tier inclusion ACTIVATES only on their launch wave (R12). */
235	export const FEATURE_NOT_YET_LIVE: Partial<Record<FeatureKey, string>> = {
236	  quoting: 'Included when Quoting launches (Wave 2)',
237	  erp: 'Included when the ERP suite launches (Wave 3)',
238	};
239	
240	export const ENTIT
... [+3034 chars truncated]

### User | 2026-06-22T15:19:38.197Z

[tool_result] 1	// QX1 entitlement keystone -- single import surface for plan-tier gating.
2	// Components:
3	export { FeatureGate, type FeatureGateProps } from './FeatureGate';
4	export { UpgradePrompt, type UpgradePromptProps } from './UpgradePrompt';
5	// Hook (live plan + can(feature)) -- consumed by gated pages + post-checkout flows:
6	export { useEntitlement, clearEntitlementCache, type UseEntitlement } f
... [+375 chars truncated]

### Assistant | 2026-06-22T15:19:42.350Z

The read-once guard keeps blocking FeatureGate.tsx. I need its actual content to verify the prop name is `feature` and the canUseFeature/FEATURE_NOT_YET_LIVE behavior. Let me bypass the cache and grep the key parts.

### Assistant | 2026-06-22T15:19:43.749Z

[tool_use: Read]

### User | 2026-06-22T15:19:44.665Z

[tool_result] 1	/**
2	 * FeatureGate -- renders children only if the live plan can use `feature`,
3	 * otherwise an UpgradePrompt (or a custom fallback). The single FE chokepoint
4	 * for plan-tier gating; pairs with the backend `requireTier` 403 (caught via
5	 * isEntitlementError) so a gate lands without 403-ing an anonymous caller.
6	 */
7	import type { ReactNode } from 'react';
8	import type { FeatureKey } 
... [+847 chars truncated]

### Assistant | 2026-06-22T15:19:44.880Z

[tool_use: Grep]

### User | 2026-06-22T15:19:46.758Z

[tool_result] 7: *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
8- *     deny at the gate (R12 -- never let a not-yet-launched wave look usable);
9- *   - the backend `requireTier` middleware returns HTTP 403 when a gated route
10- *     is called without entitlement (401 = not signed in) -- isEntitlementError
11- *     lets a page turn that 403 into an UpgradePrompt instead of a r
... [+1881 chars truncated]

### Assistant | 2026-06-22T15:19:50.873Z

I now have all the load-bearing facts verified directly from source. Let me confirm two final things: that the gated keys in App.tsx are exactly the intended set (no stray gates), and double-check the `useEntitlement` hook's `can` truly routes through `canUseFeature` so the NOT-YET-LIVE semantics hold.

### Assistant | 2026-06-22T15:19:51.811Z

[tool_use: Grep]

### User | 2026-06-22T15:19:53.027Z

[tool_result] 261:              <Route path="print-to-cnc" element={lazyElement(<FeatureGate feature="print_to_cnc"><ProgramReleasePage /></FeatureGate>)} />
269:              <Route path="ppg" element={lazyElement(<FeatureGate feature="post.generate"><PostProcessorGeneratorPage /></FeatureGate>)} />
358:              <Route path="lathe" element={lazyElement(<FeatureGate feature="wizard.lathe"><LatheUploadPage 
... [+1585 chars truncated]

### Assistant | 2026-06-22T15:19:53.111Z

[tool_use: Grep]

### User | 2026-06-22T15:19:54.298Z

[tool_result] 13:import { canUseFeature, resolvePlan } from '../lib/entitlement';
14-
15-interface PlanSnapshot {
16-  plan: PlanId;
--
61:  can: (feature: FeatureKey) => boolean;
62-  entitlement: (feature: FeatureKey) => Entitlement | null;
63-  refresh: () => void;
64-}
--
102:  const can = useCallback(
103:    (feature: FeatureKey) => (snapshot ? canUseFeature(feature, snapshot.plan) : false),
104-    [snap
... [+54 chars truncated]

### Assistant | 2026-06-22T15:20:32.748Z

I have everything verified directly from source. Let me cross-check the complete picture against the intended gate map.

Verified facts:
- `FeatureGateProps.feature: FeatureKey` (FeatureGate.tsx:13) — prop name is `feature`, confirmed. All 14 gate sites in App.tsx use `feature=`.
- `canUseFeature` returns `false` if `isNotYetLive` (entitlement.ts:60-62); `useEntitlement.can` routes through it (useEntitlement.ts:102-104). So gating quoting/erp would lock all plans. Confirmed.
- ENTITLEMENT_MATRIX (pricing.ts:240-260): `cadcam` is `shop:true, enterprise:true, pro:false` — paid and live (not in FEATURE_NOT_YET_LIVE). `print_to_cnc`, `wizard.*`, `post.generate` all `free:false` and live. `sfc.basic.free=10`. `quoting`/`erp` in FEATURE_NOT_YET_LIVE (pricing.ts:235-238).

Now I'll verify the gate map exactly and audit for over/under gating.

Gates present in App.tsx (14 sites): `print-to-cnc→print_to_cnc`, `ppg→post.generate`, `ppg-lite→post.generate`, `lathe`(+wizard+results)→`wizard.lathe`, `milling`(+wizard+results)→`wizard.mill`, `wire-edm`(+wizard+results)→`wizard.wedm`, `cam-ai-dashboard→cadcam` (inside `secure(...,'lead')`), `cam-strategy→cadcam`. This exactly matches the intended map (plus pre-existing ppg/ppg-lite). No more, no less.

`/cam-ai-dashboard` (App.tsx:386): `secure(<FeatureGate feature="cadcam">...</FeatureGate>, 'lead')` — FeatureGate is genuinely the child of `secure()`, i.e. ProtectedRoute wraps FeatureGate. Both layers compose; RBAC still applies. Correct.

Must-stay-open audit: `/wire-edm-studio` (412), all SFC (`speed-feed-calc` 408, `calculator` 258, `speed-feed` 410), `quote-builder` (301), `erp` (391), `cost-estimator` (389), shop-floor/safety/kiosk — none carry a FeatureGate. Confirmed open. Note `/turning` (376, `TurningPage`) is correctly NOT gated with `wizard.lathe` — that adversarial case is clean.

Now examining the test for genuine intent-encoding (R9), I found two real issues.

**Issue 1 — MUST_STAY_OPEN.includes(`employee`) collides
... [+4674 chars truncated]
