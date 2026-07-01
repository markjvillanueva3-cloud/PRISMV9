---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "3-of-3 scrutiny ARM C (analyst -- weight toward silent breakage, regression risk"
date: "2026-06-22"
first_ts: "2026-06-22T13:28:32.208Z"
last_ts: "2026-06-22T13:35:12.847Z"
cwd: "H:\\prism"
messages: 98
user_msgs: 37
assistant_msgs: 61
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-aab782682d27f07be.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# 3-of-3 scrutiny ARM C (analyst -- weight toward silent breakage, regression risk

> **claude-code-cli** | 2026-06-22 | 98 msgs (37 user / 61 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-aab782682d27f07be.jsonl`

## Transcript

### User | 2026-06-22T13:28:32.208Z

3-of-3 scrutiny ARM C (analyst -- weight toward silent breakage, regression risk, I/O security, error-budget completeness, integration coupling; do NOT assume arms A/B caught everything). Review the COMBINED diff of three slot:quebec frontend commits via `git -C H:/prism show <sha>`. Grade PASS/FAIL + P0/P1/P2 + file:line.

Commits: a6977bc839 (QX1 entitlement keystone: useEntitlement module cache + FeatureGate + UpgradePrompt), 18d1e2d15f (QX2 SFC AdvancedSpeedFeedPanel + mapper + gated tab), 4d7441540e (QX4 CheckoutOutcomePage + 3 routes). All under H:/prism/mcp-server/web/src.

Analyst checks:
1. SILENT BREAKAGE: the useEntitlement module-level cache (cached/inflight) -- any stale-plan or race issue across mounts/tests? The vitest underTest() skip -- correct? Does clearEntitlementCache cover the downgrade case? (Note: backend requireTier 403 is the true enforcement; FE cache is advisory -- is that layering sound, no false-grant?)
2. ERROR BUDGET: every async/fetch path (getBillingStatus, sfOrchestrate) -- failure handled, deny-by-default on error, no unhandled rejection or set-state-after-unmount? The AdvancedSpeedFeedPanel reset-on-input-change effect -- any infinite loop or spurious reset?
3. REGRESSION: SfcCalculatorPage new tab + handleTabKeyDown arrow nav; App.tsx 3 new top-level routes -- any collision with existing routes or tab indices?
4. I/O SECURITY: session_id from useSearchParams rendered safely (no injection); no user data in URLs; no phantom backend route called.
5. INTEGRATION COUPLING: the 3 units share QX1's barrel -- is the dependency direction clean (no cycle)? lib -> hook -> components, page -> components.

Report real findings only, file:line. End with VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-22T13:28:39.031Z

I'll review the combined diff of these three frontend commits. Let me start by examining each commit.

### Assistant | 2026-06-22T13:28:39.885Z

[tool_use: Bash]

### User | 2026-06-22T13:28:46.758Z

[tool_result] commit a6977bc8394c105c9806cb4c876ed0bd9a12e45c
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 07:55:06 2026 -0500

    [MAIN-FORCE] [FRONTEND-APP]/U-Q-ENTITLEMENT-KEYSTONE (slot:quebec): FE plan-tier gating keystone -- useEntitlement + FeatureGate + UpgradePrompt + 403 helpers
    
    QX1 of the launch frontend queue (LAUNCH-EXECUTION-DELTA-2026-06-22). The reusab
... [+5752 chars truncated]

### Assistant | 2026-06-22T13:28:49.315Z

Let me read the actual source files to verify the implementation.

### Assistant | 2026-06-22T13:28:50.267Z

[tool_use: Read]

### Assistant | 2026-06-22T13:28:50.449Z

[tool_use: Read]

### User | 2026-06-22T13:28:50.908Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\lib\entitlement.ts' was already read 22s ago in this session and is unchanged (mtime 1782132016387). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T13:28:51.105Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\hooks\useEntitlement.ts' was already read 8m ago in this session and is unchanged (mtime 1782132194386). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T13:28:53.838Z

The read-once guard says these were already read, but I don't actually have them in context (this is a fresh session). Let me disable the cache and read them.

### Assistant | 2026-06-22T13:28:54.795Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:28:55.632Z

[tool_use: Bash]

### User | 2026-06-22T13:29:04.237Z

[tool_result] /**
 * Entitlement resolution -- pure FE logic bridging a user's live plan to the
 * canonical entitlement matrix (data/pricing.ts) and the backend 403 contract.
 *
 * Single source of truth for "can this plan use this feature right now":
 *   - the matrix (ENTITLEMENT_MATRIX) decides per-plan inclusion;
 *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
 *     deny at t
... [+3374 chars truncated]

### User | 2026-06-22T13:29:10.138Z

[tool_result]      1	/**
     2	 * useEntitlement -- supplies the signed-in user's live plan + a `can(feature)`
     3	 * predicate built on the pure entitlement rules (lib/entitlement.ts).
     4	 *
     5	 * The plan comes from GET /billing/status (billingApi.getBillingStatus). It is
     6	 * module-cached so N mounted gates do not each refetch; clearEntitlementCache()
     7	 * after a successful checkout/p
... [+4214 chars truncated]

### Assistant | 2026-06-22T13:29:12.300Z

Now let me read the components and pages.

### Assistant | 2026-06-22T13:29:14.702Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:29:15.550Z

[tool_use: Bash]

### User | 2026-06-22T13:29:20.034Z

[tool_result]      1	/**
     2	 * FeatureGate -- renders children only if the live plan can use `feature`,
     3	 * otherwise an UpgradePrompt (or a custom fallback). The single FE chokepoint
     4	 * for plan-tier gating; pairs with the backend `requireTier` 403 (caught via
     5	 * isEntitlementError) so a gate lands without 403-ing an anonymous caller.
     6	 */
     7	import type { ReactNode } from 're
... [+5680 chars truncated]

### User | 2026-06-22T13:29:26.104Z

[tool_result]      1	/**
     2	 * CheckoutOutcomePage -- the post-Stripe-redirect landing for checkout success
     3	 * and cancel, for BOTH subscription and one-time post-processor purchases.
     4	 *
     5	 * Stripe redirect targets (StripeBillingEngine):
     6	 *   subscription success -> /billing/success?session_id=...
     7	 *   subscription cancel  -> /billing/cancel
     8	 *   post success        
... [+5536 chars truncated]

### Assistant | 2026-06-22T13:29:29.032Z

Now let me read the SFC components and pages, plus App.tsx routes.

### Assistant | 2026-06-22T13:29:30.504Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:29:31.083Z

[tool_use: Bash]

### User | 2026-06-22T13:29:37.383Z

[tool_result]      1	/**
     2	 * AdvancedSpeedFeedPanel -- exposes the full 9-axis SpeedFeedOrchestrator
     3	 * (8 resolvers + Monte Carlo UQ) on the standalone SFC page, reusing the page's
     4	 * already-selected material / operation / tool / params (no duplicate inputs).
     5	 * Renders core metrics PLUS the release posture + confidence + limiting factors
     6	 * (oscar soul: never publish a speed
... [+8440 chars truncated]

### User | 2026-06-22T13:29:43.828Z

[tool_result]      1	/**
     2	 * Map the standalone SFC page's selections (MaterialEntry / OperationType /
     3	 * SfcParams / CuttingToolEntry) to the flat SpeedFeedParams the 9-axis
     4	 * orchestrator route consumes. Pure + testable; guards optional fields so a
     5	 * partial selection never sends a malformed value (iso_group / coolant_type
     6	 * are unions -- pass only recognized members, omit
... [+2206 chars truncated]

### Assistant | 2026-06-22T13:29:52.385Z

Now let me check the SfcCalculatorPage diff, App.tsx routes, and the useSpeedFeed hook (orchestrate.reset behavior).

### Assistant | 2026-06-22T13:29:53.816Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:29:54.493Z

[tool_use: Bash]

### User | 2026-06-22T13:29:59.486Z

[tool_result] commit 18d1e2d15ff730caf4c7c303e4b89723efb81b8e
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 08:13:02 2026 -0500

    [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-9AXIS-EXPOSURE (slot:quebec): expose full 9-axis orchestrator + UQ on the standalone SFC page (gated)
    
    QX2 of the launch frontend queue. The standalone /speed-feed-calc page previously
    reached only ba
... [+3434 chars truncated]

### User | 2026-06-22T13:30:06.729Z

[tool_result] commit 4d7441540e8700ef63f88d890018d23652393359
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 08:25:48 2026 -0500

    [MAIN-FORCE] [FRONTEND-APP]/U-Q-CHECKOUT-OUTCOME-PAGES (slot:quebec): fix post-payment 404 -- checkout success/cancel landings
    
    QX4. LAUNCH-BLOCKER: StripeBillingEngine redirects post-checkout to
    /billing/success?session_id=, /billing/c
... [+3153 chars truncated]

### Assistant | 2026-06-22T13:30:10.697Z

Now I need to verify several key integration points: the `useSpeedFeed` hook (does `orchestrate.reset` have a stable identity `useCallback([])`?), the existing routes in App.tsx (collision check for `post-processor/success` vs `post-processor`), the tab keydown navigation, and the data/pricing.ts contract. Let me check these.

### Assistant | 2026-06-22T13:30:13.062Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:30:13.514Z

[tool_use: Bash]

### User | 2026-06-22T13:30:23.726Z

[tool_result]      1	import { useCallback, useRef, useState } from "react";
     2	import { speedFeedApi } from "../api/speedfeed";
     3	import type { ApiError } from "../types/speedfeed";
     4	
     5	interface AsyncState<T> {
     6	  data: T | null;
     7	  loading: boolean;
     8	  error: string | null;
     9	}
    10	
    11	function useApiCall<TReq, TRes>(apiFn: (params: TReq) => Promise<
... [+2036 chars truncated]

### User | 2026-06-22T13:30:31.491Z

[tool_result] 221:            <Route path="post-processor/success" element={lazyElement(<CheckoutOutcomePage outcome="success" context="post" />)} />
264:              <Route path="post-processor" element={lazyElement(<PostProcessorPage />)} />
381:              <Route path="post-processor-store" element={lazyElement(<PostProcessorStorePage />)} />
389:               *   /post-processor    — marketing landing p
... [+35 chars truncated]

### Assistant | 2026-06-22T13:30:37.712Z

Important finding emerging. The `reset` in `useApiCall` is `useCallback([])` (stable) — good, that confirms the AdvancedSpeedFeedPanel reset effect won't infinite loop. But note `execute`'s `useCallback` depends on `[apiFn]`, and `speedFeedApi.orchestrate` is a method reference — I need to confirm it's stable. Also critical: the `run` callback depends on `orchestrate` (the whole object), which changes identity each render. Let me examine the route nesting structure — `post-processor/success` is at line 221 (top-level) while `post-processor` is at line 264 (inside a nested/secured shell). Let me check the route nesting context around these.

### Assistant | 2026-06-22T13:30:38.850Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:30:39.808Z

[tool_use: Bash]

### User | 2026-06-22T13:30:44.010Z

[tool_result] const PostProcessorStorePage = lazy(() => import('./pages/PostProcessorStorePage'));
const PpgPage = lazy(() => import('./pages/PpgPage'));
const QualityPage = lazy(() => import('./pages/QualityPage'));
const CamAiDashboardPage = lazy(() => import('./pages/cam-ai-dashboard'));
const SafetyDashboardPage = lazy(() => import('./pages/SafetyDashboardPage'));
const SfcCalculatorPage = lazy(() => import
... [+5838 chars truncated]

### User | 2026-06-22T13:30:49.945Z

[tool_result] 3: * Routes: orchestrate (full pipeline), quick (no stochastic), stochastic (full UQ)
219:  return sfRequest('/orchestrate', params);
285:  orchestrate: sfOrchestrate,
=====
/**
 * Speed & Feed API — calls SpeedFeedOrchestratorEngine via /api/v1/speed-feed/*
 * Routes: orchestrate (full pipeline), quick (no stochastic), stochastic (full UQ)
 */
import type { PrismResponse } from './types';

const 
... [+1699 chars truncated]

### Assistant | 2026-06-22T13:30:57.394Z

Key findings on routing and the orchestrate identity. The route structure confirms `post-processor/success` is a top-level route (line 221) and `post-processor` is a nested route inside `<Layout>` (line 264) at `/post-processor`. These do NOT collide because React Router v6 matches full paths, and `post-processor/success` is registered as a separate top-level segment. Good — no collision.

Now the `orchestrate` reference: `speedFeedApi.orchestrate` is `sfOrchestrate` (a stable module-level function reference), so `useApiCall(speedFeedApi.orchestrate)` gets a stable `apiFn`, making `execute` and `reset` stable. The `run` callback in AdvancedSpeedFeedPanel depends on the whole `orchestrate` object — but that's only used in `onClick`, not in an effect, so identity churn there is harmless.

Now the critical concern: the **reset effect dependency on `params`**. Let me check whether `params` is a stable reference in SfcCalculatorPage or recreated each render — this determines whether the reset effect fires spuriously every render.

### system

... [18 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-22T13:32:13.477Z

The redirect URLs match the new routes exactly: `/billing/success?session_id={CHECKOUT_SESSION_ID}` → route `billing/success`, `/billing/cancel` → `billing/cancel`, `/post-processor/success` → `post-processor/success`, and post-cancel `/post-processor` reuses the existing route. The `session_id={CHECKOUT_SESSION_ID}` is read via `params.get('session_id')` and rendered as text inside `<p>Ref: {sessionId}</p>` — React escapes text content by default, so no XSS injection.

Now let me check the test files to verify they actually test intent (R9), and check the two test files in the active set for the `underTest()` skip behavior validity, plus check the BillingStatusResult — does the backend `/status` actually return `authenticated`? Let me look at the backend route to confirm no phantom field.

### Assistant | 2026-06-22T13:32:14.892Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:32:16.492Z

[tool_use: Bash]

### User | 2026-06-22T13:32:19.949Z

[tool_result] import { ApiError, getRequestHeaders } from './client';

/**
 * Billing API client.
 *
 * Backend routes (mcp-server/src/routes/billing.ts) return FLAT JSON
 * ({ url, sessionId } / status object) -- NOT the {result}-wrapped PrismResponse
 * shape. billingRequest returns the parsed body directly.
 */
const BILLING_BASE = '/api/v1/billing';

export interface BillingStatusResult {
  userId: string;

... [+484 chars truncated]

### User | 2026-06-22T13:32:31.643Z

[tool_result] mcp-server/src/routes/billing.ts:86:/** Activate a one-time perpetual license key for the authenticated user. */
mcp-server/src/routes/billing.ts:109:/** List the authenticated user's perpetual licenses. */
mcp-server/src/routes/billing.ts:238:        // U-COMM-02b: resolve the Stripe customerId from the authenticated user's
mcp-server/src/routes/billing.ts:280:          authenticated: !!userId,
m
... [+1084 chars truncated]

### Assistant | 2026-06-22T13:32:35.880Z

Confirmed: the backend `/status` route returns `authenticated: !!userId` (billing.ts:280) and `plan` — the hook's reads are against a real contract, no phantom field. The `ApiError` import in `entitlement.ts` is from `../api/requestCore` — let me verify that path exists and exports `ApiError` with a `.status` field (the `isEntitlementError`/`isAuthRequiredError` 403/401 helpers depend on it).

### Assistant | 2026-06-22T13:32:37.647Z

[tool_use: Bash]

### User | 2026-06-22T13:32:43.567Z

[tool_result] mcp-server/web/src/api/requestCore.ts
49:function statusHint(status: number) {
50:  if (status === 401 || status === 403) {
54:  if (status === 404) {
58:  if (status === 408 || status === 429 || status >= 500) {
65:function defaultMessageForStatus(status: number, fallbackMessage: string) {
66:  if (status === 401 || status === 403) {
70:  if (status === 404) {
74:  if (status === 408) {
78:  if (
... [+752 chars truncated]

### Assistant | 2026-06-22T13:32:48.731Z

There are TWO `ApiError` classes in the codebase: one in `requestCore.ts` (imported by `entitlement.ts`) and one referenced in `client.ts` (imported by `billing.ts` — `import { ApiError, getRequestHeaders } from './client'`). This is a potential integration coupling concern. Let me verify whether they're the same class or two distinct classes — if `billingApi` throws a `client.ts` ApiError but `isEntitlementError` checks `instanceof` the `requestCore.ts` ApiError, the 403 detection would silently fail.

### Assistant | 2026-06-22T13:32:50.400Z

[tool_use: Bash]

### User | 2026-06-22T13:32:57.615Z

[tool_result] mcp-server/web/src/api/requestCore.ts:89:export class ApiError extends Error {
=====does client re-export from requestCore?=====
22:} from './requestCore';
32:} from './requestCore';

### Assistant | 2026-06-22T13:33:02.419Z

Let me see exactly what `client.ts` imports/re-exports from `requestCore` to confirm `ApiError` is the same single class (not a duplicate).

### Assistant | 2026-06-22T13:33:03.396Z

[tool_use: Bash]

### User | 2026-06-22T13:33:08.615Z

[tool_result] /**
 * PRISM API Client
 * Connects to F7 Bridge REST endpoints with API key authentication.
 * All responses follow the standard format:
 *   { result, safety: { score, warnings }, meta: { formula_used, uncertainty } }
 */

import type {
  DataResponse,
  InstantQuoteHistory,
  InstantQuoteStatus,
  InstantQuoteLeadTimeOption,
  InstantQuoteQuantityBreak,
  InstantQuoteResult,
  InstantQuoteShare
... [+561 chars truncated]

### Assistant | 2026-06-22T13:33:13.334Z

Confirmed: `client.ts` imports `ApiError` from `requestCore` and re-exports the same class. So `billing.ts`'s `ApiError` (via `client`) IS the same class as `entitlement.ts`'s `ApiError` (direct from `requestCore`). The `instanceof ApiError` check in `isEntitlementError`/`isAuthRequiredError` is sound — no false-negative on 403 detection. Good.

Now let me check how `billingApi.getBillingStatus` actually throws — does it throw an `ApiError` with `.status`, or a plain `Error`? This matters because the hook's `loadPlan` catch path and the deny-by-default depend on it. Let me see `billingRequest`.

### Assistant | 2026-06-22T13:33:14.000Z

[tool_use: Bash]

### User | 2026-06-22T13:33:18.507Z

[tool_result] async function billingRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BILLING_BASE}${path}`, {
    method,
    headers: getRequestHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message =
    
... [+443 chars truncated]

### Assistant | 2026-06-22T13:33:28.417Z

`billingRequest` throws `new ApiError(res.status, message)` — so on a 401/403 the hook's catch receives an `ApiError` with the status. The hook's catch path sets `error` + `loading=false`, leaves snapshot null → `can()` returns false (deny-by-default). Sound.

One subtle thing: on a **network failure** (fetch rejects before `res`), `billingRequest` throws the raw fetch error (a `TypeError`), which the hook's catch still handles (`err instanceof Error ? err.message : ...`). Snapshot stays null → deny-by-default. No unhandled rejection — the `.catch` is attached in both `run()` and the `.finally` clears `inflight`. Good.

Now let me examine a real race-condition concern: **`clearEntitlementCache` during inflight**. CheckoutOutcomePage calls `clearEntitlementCache()` in an effect on mount. If a FeatureGate elsewhere has an inflight load when the cache is cleared, the inflight promise's `.then` still sets `cached = snap` (the OLD plan). Let me trace this carefully and also check the `underTest()` skip interaction with the module cache initialization.

The hook's `loadPlan`:
- `clearEntitlementCache()` sets `cached=null, inflight=null`.
- But if a promise was already created (assigned to a local `promise` var) and is mid-flight, its `.then` callback `if (!underTest()) cached = snap` will re-populate `cached` with the stale snapshot AFTER the clear.

Let me verify this is actually reachable and whether it's a real defect for the checkout flow.

### Assistant | 2026-06-22T13:33:29.112Z

[tool_use: Bash]

### User | 2026-06-22T13:33:34.196Z

[tool_result]      1	import { describe, it, expect, vi, beforeEach } from 'vitest';
     2	import { render, screen } from '@testing-library/react';
     3	import { MemoryRouter } from 'react-router-dom';
     4	import CheckoutOutcomePage from '../pages/CheckoutOutcomePage';
     5	
     6	const h = vi.hoisted(() => ({ clearEntitlementCache: vi.fn() }));
     7	vi.mock('../components/entitlement', () => ({ clear
... [+2844 chars truncated]

### Assistant | 2026-06-22T13:33:45.052Z

Tests verify intent well (R9): they check the cache-clear is called only on success, session_id rendering present/absent, and correct context-specific copy. Good test integrity.

Now let me assess the **timing of `clearEntitlementCache` on CheckoutOutcomePage** more carefully — this is the actual integration risk. The cache clear happens in a `useEffect`. After Stripe redirect, the user lands on `/billing/success`. The CheckoutOutcomePage clears the cache. But the **plan change on the backend may not have propagated yet** (Stripe webhook latency). When the user navigates to `/dashboard`, a FeatureGate refetches `/status` — but if the webhook hasn't processed, it gets the OLD plan and re-caches it. The page body copy even acknowledges this ("Access may take a moment to propagate"). This is an inherent eventual-consistency limitation, not a code defect — the backend `requireTier` 403 is the true enforcement, and FE is advisory. This is acceptable layering. Not a finding.

Let me now verify the one genuine concern: the `entitlement.test.ts` and `advancedSpeedFeedParams.test.ts` to confirm test integrity, and check the FeatureGate test for the `underTest()` skip — specifically that the module cache skip doesn't leak state between the entitlement RTL tests.

### Assistant | 2026-06-22T13:33:45.696Z

[tool_use: Bash]

### User | 2026-06-22T13:33:50.149Z

[tool_result]      1	import { describe, it, expect, vi, beforeEach } from 'vitest';
     2	import { render, screen, waitFor } from '@testing-library/react';
     3	import { MemoryRouter } from 'react-router-dom';
     4	import type { ReactNode } from 'react';
     5	import { FeatureGate } from '../components/entitlement';
     6	import { clearEntitlementCache } from '../hooks/useEntitlement';
     7	import type
... [+3480 chars truncated]

### Assistant | 2026-06-22T13:33:57.945Z

The FeatureGate tests are strong R9 tests: they verify deny-by-default for unrecognized plan ('mystery-tier' → denied, line 71-76), not-yet-live coming-soon on enterprise (line 56-62), tier boundaries (starter denied pro feature, line 49-54), and the `underTest()` skip is correctly worked around with `beforeEach(clearEntitlementCache())`. Note: because `underTest()` returns true in vitest, `cached` is never written by `loadPlan`, so each test gets a fresh load via the mocked `getBillingStatus()` — the `beforeEach` clear is belt-and-suspenders. This is correct.

Now let me examine the **tab keyboard navigation** (handleTabKeyDown / arrow nav) in SfcCalculatorPage to confirm the new "advanced" tab inserted at index 1 doesn't break arrow-key wraparound or tabindex.

### Assistant | 2026-06-22T13:33:59.463Z

[tool_use: Bash]

### User | 2026-06-22T13:34:03.342Z

[tool_result] 55:  const [rightTab, setRightTab] = useState<RightTab>("charts");
158:    setRightTab("compare");
213:  const rightTabs = useMemo<{ id: RightTab; label: string; count?: number }[]>(() => [
220:  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
221:    const ids = rightTabs.map((t) => t.id);
222:    const idx = ids.indexOf(rightTab);
223:    if (e.key === "ArrowRight") {
225:    
... [+683 chars truncated]

### Assistant | 2026-06-22T13:34:10.043Z

The arrow-key nav is fully dynamic: `ids = rightTabs.map(t => t.id)`, `idx = ids.indexOf(rightTab)`, with modular wraparound `(idx + 1) % ids.length` and `(idx - 1 + ids.length) % ids.length`. Inserting "advanced" at index 1 in `rightTabs` is automatically handled — no hardcoded indices, no off-by-one. `tabIndex` is roving (0 for selected, -1 otherwise) — correct ARIA tab pattern. `aria-selected` is data-driven. No regression. The line 158 `setRightTab("compare")` (on some compare action) still targets a valid id. Sound.

Let me also confirm line 158 context (what triggers `setRightTab("compare")`) isn't index-dependent, and verify the AdvancedSpeedFeedPanel test to round out test integrity, plus check the `advancedSpeedFeedParams` test for the mapper edge cases (NaN/zero omission).

### Assistant | 2026-06-22T13:34:10.996Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:34:12.121Z

[tool_use: Bash]

### User | 2026-06-22T13:34:16.185Z

[tool_result]      1	import { describe, it, expect } from 'vitest';
     2	import { toAdvancedSpeedFeedParams } from '../components/sfc/advancedSpeedFeedParams';
     3	import type { MaterialEntry } from '../data/materials';
     4	import type { OperationType } from '../data/operations';
     5	import type { CuttingToolEntry } from '../data/tools';
     6	import type { SfcParams } from '../components/sfc/Parame
... [+1650 chars truncated]

### User | 2026-06-22T13:34:19.740Z

[tool_result]   it('enables the solve and calls execute with mapped params when ready', () => {
    render(<AdvancedSpeedFeedPanel material={material} operation={operation} tool={null} params={params} />);
    const btn = screen.getByRole('button', { name: /Run 9-Axis Solve/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(h.state.execute).toHaveBeenCalledTime
... [+1828 chars truncated]

### Assistant | 2026-06-22T13:34:24.628Z

The AdvancedSpeedFeedPanel tests round-trip a real orchestrate response through the actual normalizer (only the hook mocked), verify mapped params, confidence%, advisory surfacing, busy/error states. Strong R9 tests.

Let me do a final blast-radius check: confirm `MaterialEntry.group`, `MaterialEntry.hardness`, and `SfcParams` field names used by the mapper actually exist (so the mapper isn't reading phantom fields that would silently produce `undefined`), and verify `output_detail: 'full'` is a valid `SpeedFeedParams` field.

### Assistant | 2026-06-22T13:34:28.325Z

[tool_use: Bash]

### User | 2026-06-22T13:34:32.852Z

[tool_result] ===MaterialEntry===
4:  name: string;
5:  group: string;
7:  hardness: number;
23:  { id: "1045", name: "AISI 1045 Carbon Steel", group: "P", groupLabel: "Steel", hardness: 200, tensileStrength: 630, machinability: 65 },
24:  { id: "4140", name: "AISI 4140 Alloy Steel", group: "P", groupLabel: "Steel", hardness: 280, tensileStrength: 950, machinability: 55 },
25:  { id: "4340", name: "AISI 4340 Al
... [+1947 chars truncated]

### Assistant | 2026-06-22T13:34:42.082Z

All mapper field reads are verified against real type definitions:
- `MaterialEntry.group` (string), `.hardness` (number), `.name` (string) — all exist.
- `SfcParams` fields `tool_diameter`, `number_of_teeth`, `depth`, `width`, `tool_material`, `coolant` — all exist.
- `SpeedFeedParams` accepts `flutes`, `num_flutes`, `doc_mm`, `woc_mm`, `axial_depth_mm`, `radial_depth_mm`, `tool_material`, `tool_coating`, and `output_detail: 'full'` — all valid optional fields.

No phantom fields. One observation worth noting: the mapper reads `params.coolant` (a `string` in SfcParams) and guards it against `COOLANT_TYPES`, and `material.group` (a `string`) against `ISO_GROUPS` — so unrecognized values are correctly omitted rather than sent malformed. Sound.

Let me do a final check on the dependency-direction (no cycle) concern raised in the integration check — the barrel `components/entitlement/index.ts` re-exports from `../../hooks/useEntitlement` and `../../lib/entitlement`. Let me confirm no import cycle (lib doesn't import the hook/components; CheckoutOutcomePage imports the barrel).

### Assistant | 2026-06-22T13:34:49.351Z

[tool_use: Bash]

### User | 2026-06-22T13:34:55.353Z

[tool_result] ===lib/entitlement imports===
17:import {
26:} from '../data/pricing';
27:import { ApiError } from '../api/requestCore';
===hooks/useEntitlement imports===
10:import { useCallback, useEffect, useRef, useState } from 'react';
11:import { billingApi } from '../api/billing';
12:import { entitlementFor, type Entitlement, type FeatureKey, type PlanId } from '../data/pricing';
13:import { canUseFeature,
... [+199 chars truncated]

### Assistant | 2026-06-22T13:35:07.882Z

Dependency direction is clean (the only match in lib was a doc comment, not a real import). The graph is: `data/pricing` ← `lib/entitlement` ← `hooks/useEntitlement` ← `components/entitlement/*` ← `barrel` ← `pages`. No cycle. The barrel re-exporting the hook from `../../hooks/useEntitlement` while FeatureGate also imports the hook directly (not via barrel) avoids any barrel-self-reference cycle. Sound.

Now let me reconsider the one residual race I flagged — the inflight `.then` re-populating `cached` after `clearEntitlementCache`. Let me think through whether this is actually a P-level finding for the production checkout flow.

Scenario: User on `/dashboard`, a FeatureGate triggers `loadPlan(false)` → `inflight` set, promise mid-flight. User navigates to `/billing/success` (different page, FeatureGate unmounts). CheckoutOutcomePage effect calls `clearEntitlementCache()` (sets `cached=null, inflight=null`). The earlier inflight promise's `.then` runs: `if (!underTest()) cached = snap` — re-caching the **pre-purchase** plan. Next FeatureGate read returns the stale (old) plan from cache without refetching.

However: in practice, the checkout flow is a **full-page Stripe redirect** (browser navigates away to Stripe's domain, then back to `/billing/success`). The entire JS context (including any inflight promise and the module cache) is destroyed on the redirect away and freshly initialized on return. So `cached`/`inflight` start null on the success page load, and the clear is essentially a no-op-but-safe. The race only matters for an in-SPA navigation without page reload — which the Stripe flow does not do. So in the real flow this is not exploitable. It's a latent edge for any future in-SPA "plan change" caller, worth a P2 note but not a blocker.

I have enough to render a verdict. Let me do one last verification — confirm the new routes don't shadow a wildcard/catch-all that would intercept them, and there's no existing `billing/*` route.

### Assistant | 2026-06-22T13:35:09.608Z

[tool_use: Bash]

### User | 2026-06-22T13:35:12.847Z

[tool_result] 219:            <Route path="billing/success" element={lazyElement(<CheckoutOutcomePage outcome="success" context="subscription" />)} />
220:            <Route path="billing/cancel" element={lazyElement(<CheckoutOutcomePage outcome="cancel" context="subscription" />)} />
251:              <Route path="*" element={<div />} />
===top-level catch-all / NotFound===
251:              <Route path="*" el
... [+18 chars truncated]
