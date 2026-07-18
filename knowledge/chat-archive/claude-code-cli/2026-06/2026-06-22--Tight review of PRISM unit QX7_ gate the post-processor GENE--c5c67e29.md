---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "Tight review of PRISM unit QX7: gate the post-processor GENERATOR pages behind t"
date: "2026-06-22"
first_ts: "2026-06-22T14:37:54.893Z"
last_ts: "2026-06-22T14:39:46.721Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 37
user_msgs: 15
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-af37e563ea2860c35.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Tight review of PRISM unit QX7: gate the post-processor GENERATOR pages behind t

> **claude-code-cli** | 2026-06-22 | 37 msgs (15 user / 22 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-af37e563ea2860c35.jsonl`

## Transcript

### User | 2026-06-22T14:37:54.893Z

Tight review of PRISM unit QX7: gate the post-processor GENERATOR pages behind the entitlement FeatureGate. Single file changed: H:/prism/mcp-server/web/src/App.tsx (added `import { FeatureGate } from './components/entitlement'` + wrapped two route elements). Grade PASS/FAIL + file:line.

The change wraps:
- `/ppg` (PostProcessorGeneratorPage) and `/ppg-lite` (PpgPage) in `<FeatureGate feature="post.generate">...</FeatureGate>` inside the existing `lazyElement(...)` (which provides Suspense + error boundary).

Verify:
1. CORRECT KEY: `post.generate` is the right entitlement key for a post-processor GENERATOR (confirm in H:/prism/mcp-server/web/src/data/pricing.ts: post.generate free=false, starter='addon', pro=1, shop=5, enterprise=-1 -> a free user is correctly denied, starter+ allowed). FeatureGate(post.generate) for a free plan renders an UpgradePrompt (requiredPlanFor -> 'starter').
2. RIGHT PAGES ONLY: confirm the marketing page (`/post-processor` -> PostProcessorPage) and the STORE (`/post-processor-store` -> PostProcessorStorePage) are NOT gated (a user must be able to see marketing + BUY). Only the two generator pages are gated. Check App.tsx for any over-gating.
3. NESTING: `lazyElement(<FeatureGate><LazyPage/></FeatureGate>)` -- FeatureGate (regular import) renders the lazy child when entitled (Suspense in lazyElement catches the lazy load) or an UpgradePrompt when denied (no suspense). Confirm this is sound and won't break the Suspense/error-boundary.
4. Is FeatureGate's useEntitlement (which fetches the plan) safe to run at the route level? Brief blank during plan load (loadingFallback=null) -> acceptable?
5. Any regression: did the import or the wraps break other routes? (tsc passes; FeatureGate+entitlement tests 24/24 still pass.)
6. SEQUENCING (route-gating-map): gating the FE PAGE (showing UpgradePrompt) is safe even if the backend ppg route isn't tier-gated -- it's a UX gate, doesn't 403 anon callers. Confirm this is the safe direction (not gating a
... [+260 chars truncated]

### Assistant | 2026-06-22T14:37:59.330Z

I'll review this change. Let me start by reading the changed file and the supporting modules end-to-end.

### Assistant | 2026-06-22T14:37:59.784Z

[tool_use: Read]

### Assistant | 2026-06-22T14:38:00.174Z

[tool_use: Read]

### User | 2026-06-22T14:38:02.047Z

[tool_result] 1	/**
2	 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
3	 *
4	 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
5	 * Anchored on the tested backend catalog:
6	 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
7	 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
8	 *   - one-time post prices    -> StripeBillingEngine.t
... [+12973 chars truncated]

### User | 2026-06-22T14:38:02.124Z

[tool_result] 1	import { type ComponentType, type ReactNode, Suspense, lazy } from 'react';
2	import { Route, Routes, useLocation } from 'react-router-dom';
3	import { Layout } from './components/Layout';
4	import ProtectedRoute from './components/ProtectedRoute';
5	import { FeatureGate } from './components/entitlement';
6	import { RouteStageFallback, getRouteLoadingMeta } from './components/workspace/RouteStag
... [+35969 chars truncated]

### Assistant | 2026-06-22T14:38:06.816Z

Now let me read the FeatureGate component and the entitlement barrel to verify the nesting, useEntitlement hook, and UpgradePrompt behavior end-to-end.

### Assistant | 2026-06-22T14:38:07.546Z

[tool_use: Glob]

### User | 2026-06-22T14:38:28.056Z

[tool_result] No files found

### Assistant | 2026-06-22T14:38:32.842Z

The glob path may be wrong since cwd is the web directory. Let me locate the entitlement component files directly.

### Assistant | 2026-06-22T14:38:33.354Z

[tool_use: Glob]

### Assistant | 2026-06-22T14:38:33.501Z

[tool_use: Glob]

### User | 2026-06-22T14:38:34.729Z

[tool_result] src\components\entitlement\FeatureGate.tsx
src\components\entitlement\UpgradePrompt.tsx
src\components\entitlement\index.ts

### User | 2026-06-22T14:38:35.287Z

[tool_result] src\components\entitlement\FeatureGate.tsx
src\components\entitlement\UpgradePrompt.tsx
src\components\entitlement\index.ts

### Assistant | 2026-06-22T14:38:38.254Z

[tool_use: Read]

### Assistant | 2026-06-22T14:38:38.721Z

[tool_use: Read]

### Assistant | 2026-06-22T14:38:38.979Z

[tool_use: Read]

### User | 2026-06-22T14:38:40.259Z

[tool_result] 1	/**
2	 * FeatureGate -- renders children only if the live plan can use `feature`,
3	 * otherwise an UpgradePrompt (or a custom fallback). The single FE chokepoint
4	 * for plan-tier gating; pairs with the backend `requireTier` 403 (caught via
5	 * isEntitlementError) so a gate lands without 403-ing an anonymous caller.
6	 */
7	import type { ReactNode } from 'react';
8	import type { FeatureKey } 
... [+847 chars truncated]

### User | 2026-06-22T14:38:40.642Z

[tool_result] 1	// QX1 entitlement keystone -- single import surface for plan-tier gating.
2	// Components:
3	export { FeatureGate, type FeatureGateProps } from './FeatureGate';
4	export { UpgradePrompt, type UpgradePromptProps } from './UpgradePrompt';
5	// Hook (live plan + can(feature)) -- consumed by gated pages + post-checkout flows:
6	export { useEntitlement, clearEntitlementCache, type UseEntitlement } f
... [+375 chars truncated]

### User | 2026-06-22T14:38:40.791Z

[tool_result] 1	/**
2	 * UpgradePrompt -- shown when a plan lacks a feature. Tells the user the
3	 * cheapest tier that unlocks it (or "coming soon" for a not-yet-live wave) and
4	 * routes them to /pricing or the billing portal. Pure presentation off the
5	 * canonical registry + entitlement rules; no fetch.
6	 */
7	import { useNavigate } from 'react-router-dom';
8	import { FEATURE_LABELS, PLAN_TIERS, formatPr
... [+3061 chars truncated]

### Assistant | 2026-06-22T14:38:43.997Z

Now let me read the useEntitlement hook and the entitlement lib to verify `can()`, loading semantics, `requiredPlanFor`, and the anon-caller behavior.

### Assistant | 2026-06-22T14:38:44.953Z

[tool_use: Read]

### Assistant | 2026-06-22T14:38:45.148Z

[tool_use: Read]

### User | 2026-06-22T14:38:45.996Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\lib\entitlement.ts' was already read 16m ago in this session and is unchanged (mtime 1782132016387). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T14:38:46.052Z

[tool_result] 1	/**
2	 * useEntitlement -- supplies the signed-in user's live plan + a `can(feature)`
3	 * predicate built on the pure entitlement rules (lib/entitlement.ts).
4	 *
5	 * The plan comes from GET /billing/status (billingApi.getBillingStatus). It is
6	 * module-cached so N mounted gates do not each refetch; clearEntitlementCache()
7	 * after a successful checkout/plan change. A failed load leaves th
... [+3745 chars truncated]

### Assistant | 2026-06-22T14:38:49.596Z

The read-once guard says I already read entitlement.ts this session, but I don't have its content in my visible context. Let me grep the specific functions I need to verify (`canUseFeature`, `requiredPlanFor`, `resolvePlan`).

### Assistant | 2026-06-22T14:38:50.841Z

[tool_use: Grep]

### User | 2026-06-22T14:38:55.312Z

[tool_result] 41:export function resolvePlan(raw: string | null | undefined): PlanId {
42-  return raw && PLAN_SET.has(raw) ? (raw as PlanId) : 'free';
43-}
44-
45-/** Sold but its tier-inclusion only activates on its launch wave (quoting/erp). */
46-export function isNotYetLive(feature: FeatureKey): boolean {
47-  return feature in FEATURE_NOT_YET_LIVE;
48-}
49-
50-/** Human note for a not-yet-live feature (e.
... [+1405 chars truncated]

### Assistant | 2026-06-22T14:39:04.988Z

I have all the contract I need. Let me trace the key chain precisely:

- `post.generate` matrix (pricing.ts:248): `free: false, starter: 'addon', pro: 1, shop: 5, enterprise: -1`.
- `canUseFeature('post.generate', 'free')` -> not-yet-live? no -> `planIncludes('post.generate','free')` -> `entitlementFor` = `false` -> `false`. Free is correctly denied.
- `planIncludes` for `'addon'` returns true (pricing.ts:278), and for numeric `1`/`5`/`-1` returns true (`-1 !== 0`). So starter/pro/shop/enterprise all pass. Correct.
- `requiredPlanFor('post.generate')` iterates PLAN_ORDER `['free','starter',...]` -> first match is `starter` ('addon' -> planIncludes true). So UpgradePrompt tells a free user "requires the Starter plan (available as an add-on)". Matches the task's claim.

Let me verify two over-gating concerns the task raises: (1) confirm there is no other `/post-processor` marketing or `/post-processor-store` gating, and (2) confirm `ppg-lite` vs `ppg` route uniqueness. Both are visible in App.tsx already (lines 268, 385 ungated; 267, 397 gated). Let me also confirm `billingApi.getBillingStatus` returns a default plan for anonymous users (so an anon user gets `free` and a clean UpgradePrompt, not a crash) — that bears on findings 4 and 6.

### Assistant | 2026-06-22T14:39:05.114Z

[tool_use: Read]

### User | 2026-06-22T14:39:06.516Z

[tool_result] 1	import { ApiError, getRequestHeaders } from './client';
2	
3	/**
4	 * Billing API client.
5	 *
6	 * Backend routes (mcp-server/src/routes/billing.ts) return FLAT JSON
7	 * ({ url, sessionId } / status object) -- NOT the {result}-wrapped PrismResponse
8	 * shape. billingRequest returns the parsed body directly.
9	 */
10	const BILLING_BASE = '/api/v1/billing';
11	
12	export interface BillingStatus
... [+4072 chars truncated]

### Assistant | 2026-06-22T14:39:13.850Z

I now have the full chain verified. One important behavioral note on finding 4/6: if `GET /api/v1/billing/status` returns a non-2xx (e.g. 401 for an anonymous caller), `billingRequest` throws `ApiError`, `useEntitlement` catches it, leaves `snapshot = null`, so `can()` returns `false` -> the gate renders the `UpgradePrompt`. That is deny-by-default and exactly the safe direction (no crash, no leak). If the backend returns a flat status with `plan: 'free'` for anon, same UpgradePrompt result via `canUseFeature('post.generate','free') = false`. Either way the outcome is correct.

Let me confirm the diff is genuinely a thin two-line wrap plus one import (no other App.tsx changes) against the committed tree, and that `post-processor` marketing / `post-processor-store` are the only sibling post routes.

### Assistant | 2026-06-22T14:39:15.264Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:39:15.937Z

[tool_use: Grep]

### User | 2026-06-22T14:39:18.849Z

[tool_result] diff --git a/mcp-server/web/src/App.tsx b/mcp-server/web/src/App.tsx
index 90e5d503ea..738386fee2 100644
--- a/mcp-server/web/src/App.tsx
+++ b/mcp-server/web/src/App.tsx
@@ -2,6 +2,7 @@ import { type ComponentType, type ReactNode, Suspense, lazy } from 'react';
 import { Route, Routes, useLocation } from 'react-router-dom';
 import { Layout } from './components/Layout';
 import ProtectedRoute fro
... [+2140 chars truncated]

### User | 2026-06-22T14:39:20.484Z

[tool_result] 267:              <Route path="ppg" element={lazyElement(<FeatureGate feature="post.generate"><PostProcessorGeneratorPage /></FeatureGate>)} />
268:              <Route path="post-processor" element={lazyElement(<PostProcessorPage />)} />
385:              <Route path="post-processor-store" element={lazyElement(<PostProcessorStorePage />)} />
397:              <Route path="ppg-lite" element={lazyE
... [+74 chars truncated]

### Assistant | 2026-06-22T14:39:46.721Z

The diff is exactly as described: one new import (App.tsx:5) plus two route-element wraps (App.tsx:267, 397) with a clarifying comment. No other lines touched.

I have everything needed to render the verdict. Verification summary against each of the six asks:

1. **Correct key** — pricing.ts:248 `'post.generate': { free: false, starter: 'addon', pro: 1, shop: 5, enterprise: -1 }`. `canUseFeature('post.generate','free')` -> `planIncludes` -> `entitlementFor` = `false` -> denied (entitlement.ts:60-62 + pricing.ts:271,277-278). starter/pro/shop/enterprise all pass (`'addon'` -> true; numerics `1/5/-1` -> `e !== 0` -> true). `requiredPlanFor` iterates PLAN_ORDER and returns `'starter'` first (entitlement.ts:70-75), so the free-user UpgradePrompt correctly says "requires the Starter plan (available as an add-on)". Confirmed correct.

2. **Right pages only** — App.tsx:268 `/post-processor` (marketing) and :385 `/post-processor-store` (store) are ungated; only :267 `/ppg` and :397 `/ppg-lite` (the two generators) are wrapped. No over-gating. The marketing comment matches reality.

3. **Nesting soundness** — `lazyElement(...)` wraps the node in `RouteWorkspaceStage` = `WorkspaceErrorBoundary` > `Suspense` (App.tsx:22-43). `FeatureGate` is a regular (eager) import, so rendering it triggers no lazy boundary. When entitled it returns `<>{children}</>` = the lazy page, whose load is caught by the enclosing `Suspense`/error boundary. When denied it returns the eager `UpgradePrompt` (no suspension). Order is correct: Suspense is the outer ancestor of the lazy child in both branches. Sound.

4. **Route-level useEntitlement** — module-cached (useEntitlement.ts:20-48); `loading` starts `cached === null` and `loadingFallback` defaults to `null` (FeatureGate.tsx:15,28), so a brief blank during first plan load only. Acceptable for a route element and consistent with the rest of the app's lazy-blank pattern.

5. **Regression** — diff is import + two wraps only; no other route altered. `
... [+2521 chars truncated]
