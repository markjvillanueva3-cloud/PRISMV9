---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "Tight review of PRISM frontend unit QX4b (post-processor owned-controllers displ"
date: "2026-06-22"
first_ts: "2026-06-22T13:47:39.858Z"
last_ts: "2026-06-22T13:50:20.382Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 61
user_msgs: 25
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a2d0bfaee282fee34.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Tight review of PRISM frontend unit QX4b (post-processor owned-controllers displ

> **claude-code-cli** | 2026-06-22 | 61 msgs (25 user / 36 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a2d0bfaee282fee34.jsonl`

## Transcript

### User | 2026-06-22T13:47:39.858Z

Tight review of PRISM frontend unit QX4b (post-processor owned-controllers display). Read the files, grade PASS/FAIL + P0/P1/P2 + file:line.

Files (H:/prism/mcp-server/web/src):
- lib/postOwnership.ts (pure: computePostOwnership(licenses, plan) -> {allOwned, owned:Set}; ownsController)
- api/billing.ts (added LicenseSummary type + getLicenses() -> GET /licenses)
- pages/PostProcessorStorePage.tsx (fetches licenses, computes ownership, renders "Owned"/"Included" + disables Buy/bundles when owned)
- __tests__/postOwnership.test.ts (8), __tests__/PostProcessorStorePage.test.tsx (4)

Verify against the BACKEND semantics (H:/prism/mcp-server/src/engines/LicenseStore.ts): LicenseStatus = "active"|"revoked"; ownsController = active + product "post_perpetual" + scope === controllerId (line ~303); blanket feature grant for bundles (line ~294); ONE_TIME_PRODUCTS ids sfc_perpetual|post_perpetual|post_bundle_5|post_bundle_all. And GET /licenses (routes/billing.ts ~345) returns flat {licenses, count}.

Checks:
1. Does computePostOwnership EXACTLY mirror the backend ownership rule? (active-only; post_perpetual.scope = owned controller; post_bundle_all OR enterprise plan = allOwned; post_bundle_5 NOT blanket-owned -- correct? confirm against the backend.) Any controller that the FE marks owned but the backend would NOT (false "Owned" -> a paying customer blocked from re-buying something they don't own) or vice-versa (FE sells something already owned)?
2. getLicenses: flat-response handling matches the other billing client methods (billingRequest); 401/anon handled gracefully in the page (best-effort try/catch -> own nothing)?
3. Page: is "Owned" purely a display gate, with the backend still the source of truth on purchase? No way the owned-state suppresses a legitimate purchase the user needs? Revoked license correctly NOT owned?
4. Tests real round-trip (mock only billing client, real ownership fn)? No weakened assertions?

End with VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-22T13:47:43.016Z

I'll review the QX4b unit thoroughly. Let me start by reading all the relevant files in parallel.

### Assistant | 2026-06-22T13:47:43.487Z

[tool_use: Read]

### Assistant | 2026-06-22T13:47:44.001Z

[tool_use: Read]

### Assistant | 2026-06-22T13:47:44.533Z

[tool_use: Read]

### Assistant | 2026-06-22T13:47:44.899Z

[tool_use: Read]

### Assistant | 2026-06-22T13:47:45.339Z

[tool_use: Read]

### User | 2026-06-22T13:47:46.435Z

[tool_result] 1	/**
2	 * Compute which post-processor controllers a user already owns, from their
3	 * perpetual licenses (GET /billing/licenses) + plan. Mirrors the backend's own
4	 * ownership semantics (LicenseStore.ownsController):
5	 *   - enterprise plan OR an active post_bundle_all license => ALL controllers owned;
6	 *   - each active post_perpetual license => the single controller in its scope.
7	 * Pu
... [+1205 chars truncated]

### User | 2026-06-22T13:47:47.495Z

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

### User | 2026-06-22T13:47:49.646Z

[tool_result] 1	import { useState, useEffect } from "react";
2	import { billingApi, type LicenseSummary } from "../api/billing";
3	import { POST_SUBSCRIPTION_USD, ONE_TIME_PRODUCTS, formatPrice } from "../data/pricing";
4	import { computePostOwnership, ownsController, type PostOwnership } from "../lib/postOwnership";
5	
6	interface Controller {
7	  name: string;
8	  family: string;
9	  id: string;
10	}
11	
12	c
... [+14247 chars truncated]

### User | 2026-06-22T13:47:49.995Z

[tool_result] 1	import { describe, it, expect } from 'vitest';
2	import { computePostOwnership, ownsController } from '../lib/postOwnership';
3	import type { LicenseSummary } from '../api/billing';
4	
5	function lic(over: Partial<LicenseSummary>): LicenseSummary {
6	  return {
7	    licenseKey: 'PRISM-POST-x-y',
8	    product: 'post_perpetual',
9	    feature: null,
10	    scope: 'fanuc-30i',
11	    status: 'act
... [+2574 chars truncated]

### User | 2026-06-22T13:47:50.740Z

[tool_result] 1	import { describe, it, expect, vi, beforeEach } from 'vitest';
2	import { render, screen, waitFor } from '@testing-library/react';
3	import PostProcessorStorePage from '../pages/PostProcessorStorePage';
4	import type { LicenseSummary } from '../api/billing';
5	
6	// Mock only the billing client; computePostOwnership + the page render for real
7	// (round-trip: license -> ownership -> "Owned" cel
... [+2664 chars truncated]

### Assistant | 2026-06-22T13:47:54.549Z

Now let me verify against the backend semantics. Let me read the LicenseStore engine and the billing routes.

### Assistant | 2026-06-22T13:47:55.038Z

[tool_use: Read]

### Assistant | 2026-06-22T13:47:55.817Z

[tool_use: Read]

### User | 2026-06-22T13:48:01.059Z

[tool_result] 1	/**
2	 * PRISM MCP Server -- LicenseStore (U-COMM-08)
3	 *
4	 * Persisted one-time (perpetual) license grants. These are NON-subscription
5	 * purchases -- the operator's launch ask: "a logical price for one time payment
6	 * for the sfc and a single post processor."
7	 *
8	 * A license grants a feature FOREVER, independent of the user's subscription plan:
9	 *   - sfc_perpetual ($299)  -> blank
... [+14488 chars truncated]

### User | 2026-06-22T13:48:01.275Z

[tool_result] 100	      : /unknown license key/.test(msg) ? "UNKNOWN_KEY"
101	      : /another account/.test(msg) ? "ALREADY_ACTIVATED"
102	      : /revoked/.test(msg) ? "REVOKED"
103	      : "ACTIVATION_FAILED";
104	    const status = code === "ALREADY_ACTIVATED" ? 409 : 400;
105	    return { status, body: { error: { status, message: msg, code } } };
106	  }
107	}
108	
109	/** List the authenticated user's per
... [+5103 chars truncated]

### Assistant | 2026-06-22T13:48:06.980Z

I have a critical finding already. Let me verify the backend `LicenseRecord.scope` type vs. the FE `LicenseSummary.scope`, and confirm the GET /licenses route returns the raw record (including `scope` only when present). Let me also check `ONE_TIME_PRODUCTS` for the `post_bundle_5`/`post_bundle_all` definitions and whether the backend ever grants ownership from a bundle's `feature` rather than its `product`.

### Assistant | 2026-06-22T13:48:07.945Z

[tool_use: Read]

### Assistant | 2026-06-22T13:48:08.357Z

[tool_use: Read]

### User | 2026-06-22T13:48:12.170Z

[tool_result] 1	/**
2	 * PRISM canonical backend pricing + plan-limit registry (U-COMM-01).
3	 *
4	 * SINGLE SOURCE OF TRUTH for subscription prices + per-tier feature limits.
5	 * Resolves the prior triplication:
6	 *   - AuthEngineV7.LIMITS        (per-tier feature limits)
7	 *   - tierGate.TIER_LIMITS       (identical copy -- drove the entitlement gate)
8	 *   - StripeBillingEngine.PLAN_PRICES / POST_PROCESS
... [+6248 chars truncated]

### User | 2026-06-22T13:48:12.248Z

[tool_result] 320	        next(e);
321	      }
322	    }
323	  );
324	
325	  // --------------------------------------------------------------------------
326	  // POST /license/activate -- activate a one-time perpetual license key (U-COMM-08b)
327	  // --------------------------------------------------------------------------
328	  router.post(
329	    "/license/activate",
330	    rateLimitMiddleware("RL-BILLI
... [+2029 chars truncated]

### Assistant | 2026-06-22T13:48:16.487Z

This is a major discovery. The canonical backend `ONE_TIME_PRODUCTS` registry contains ONLY `sfc_perpetual` and `post_perpetual`. There is NO `post_bundle_5` and NO `post_bundle_all` in the backend registry. Let me verify this thoroughly because the entire FE ownership logic for bundles hinges on it.

### Assistant | 2026-06-22T13:48:17.901Z

[tool_use: Grep]

### Assistant | 2026-06-22T13:48:17.979Z

[tool_use: Read]

### User | 2026-06-22T13:48:19.528Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\data\pricing.ts' was already read 20m ago in this session and is unchanged (mtime 1782007516670). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T13:48:20.895Z

[tool_result] H:\prism\mcp-server\src\config\pricing-registry.ts:111:  bundle_5: 79900, // $799 / 5+ controllers
H:\prism\mcp-server\src\config\pricing-registry.ts:112:  bundle_all: 249900, // $2499 / 20+ (all)
H:\prism\mcp-server\src\engines\StripeBillingEngine.ts:88:  type: PostPurchaseType | "bundle_5" | "bundle_all";
H:\prism\mcp-server\src\engines\StripeBillingEngine.ts:119:  bundle_5:   79900,  // $799 / 
... [+2649 chars truncated]

### Assistant | 2026-06-22T13:48:25.730Z

The read-once-guard claims `pricing.ts` is in context, but it isn't (this is a fresh agent session). Let me read it with an explicit offset to bypass the guard, and examine the StripeBillingEngine bundle handling plus how a permanent bundle purchase results in licenses (does it create `post_bundle_all` license records, or per-controller `post_perpetual` records?).

### Assistant | 2026-06-22T13:48:26.759Z

[tool_use: Read]

### Assistant | 2026-06-22T13:48:27.345Z

[tool_use: Read]

### User | 2026-06-22T13:48:29.383Z

[tool_result] 0	/**
1	 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
2	 *
3	 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
4	 * Anchored on the tested backend catalog:
5	 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
6	 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
7	 *   - one-time post prices    -> StripeBillingEngine.t
... [+6953 chars truncated]

### User | 2026-06-22T13:48:29.696Z

[tool_result] 80	  monthly_cents: number;
81	  annual_cents: number;
82	  label: string;
83	}
84	
85	export type PostPurchaseType = "monthly" | "annual" | "permanent";
86	
87	export interface PostProcessorPrice {
88	  type: PostPurchaseType | "bundle_5" | "bundle_all";
89	  cents: number;
90	  label: string;
91	}
92	
93	export interface CheckoutResult {
94	  url: string;
95	  sessionId?: string;
96	}
97	
98	exp
... [+6584 chars truncated]

### Assistant | 2026-06-22T13:48:35.236Z

Now I have the full picture. The critical question is what license records a `permanent` bundle purchase actually produces. The FE assumes a `post_bundle_all` license record exists and grants `allOwned`. But the backend `LicenseStore.issue()` only accepts products in `ONE_TIME_PRODUCTS` (backend registry), which is ONLY `sfc_perpetual` and `post_perpetual`. There is NO `post_bundle_all` or `post_bundle_5` product in the backend `LicenseStore`. Let me verify whether the webhook/checkout flow ever issues a `post_bundle_all` license, and how `purchase-post` maps a bundle to a license.

### Assistant | 2026-06-22T13:48:36.202Z

[tool_use: Read]

### User | 2026-06-22T13:48:37.320Z

[tool_result] 1	/**
2	 * PRISM MCP Server -- Billing Routes
3	 * Stripe subscription management and post-processor purchases.
4	 *
5	 * Endpoints:
6	 *   POST /api/v1/billing/create-checkout   -- create subscription checkout
7	 *   POST /api/v1/billing/portal            -- customer billing portal
8	 *   POST /api/v1/billing/webhook           -- Stripe webhook (no auth, raw body)
9	 *   GET  /api/v1/billing/stat
... [+4973 chars truncated]

### Assistant | 2026-06-22T13:48:37.543Z

[tool_use: Grep]

### User | 2026-06-22T13:48:42.782Z

[tool_result] <persisted-output>
Output too large (23.4KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\c5c67e29-5b96-45c0-8c2e-63ed83affa16\tool-results\toolu_01A5yruXLmnfz5dkNtmtrkTG.txt

Preview (first 2KB):
H:\prism\mcp-server\src\hooks\WEDMSafetyHooks.ts-79-      return hookBlock(
H:\prism\mcp-server\src\hooks\WEDMSafetyHooks.ts-80-        wedmCalibrationValidate,
H:\prism\mcp-server\src
... [+1782 chars truncated]

### Assistant | 2026-06-22T13:48:45.787Z

Let me narrow the grep to the billing route and StripeBillingEngine specifically to find the purchase-post handler and how a permanent bundle maps to license issuance.

### Assistant | 2026-06-22T13:48:47.675Z

[tool_use: Grep]

### Assistant | 2026-06-22T13:48:48.823Z

[tool_use: Grep]

### User | 2026-06-22T13:48:51.870Z

[tool_result] 7- *   POST /api/v1/billing/portal            -- customer billing portal
8- *   POST /api/v1/billing/webhook           -- Stripe webhook (no auth, raw body)
9- *   GET  /api/v1/billing/status            -- get user's subscription status
10: *   POST /api/v1/billing/purchase-post     -- purchase/subscribe to post-processor
11- */
12-import express, { Router } from "express";
13-import type { Reques
... [+2654 chars truncated]

### User | 2026-06-22T13:48:52.318Z

[tool_result] 85-export type PostPurchaseType = "monthly" | "annual" | "permanent";
86-
87-export interface PostProcessorPrice {
88:  type: PostPurchaseType | "bundle_5" | "bundle_all";
89-  cents: number;
90-  label: string;
91-}
--
116-  monthly:    900,    // $9 / controller / month
117-  annual:     7900,   // $79 / controller / year
118-  permanent:  19900,  // $199 / controller (single)
119:  bundle_5:   
... [+1188 chars truncated]

### Assistant | 2026-06-22T13:48:57.119Z

Let me read the purchase-post handler in full and confirm there's no license-issuance on bundle purchase (i.e., the webhook only handles subscriptions, and `purchase-post` just creates a checkout session). This determines whether a `post_bundle_all` license record can ever exist.

### Assistant | 2026-06-22T13:48:58.030Z

[tool_use: Read]

### Assistant | 2026-06-22T13:48:59.400Z

[tool_use: Grep]

### User | 2026-06-22T13:49:07.851Z

[tool_result] 1-/**
2- * PRISM MCP Server — StripeBillingEngine
3: * Stripe subscription + post-processor purchase billing.
4- *
5- * Spec (MIT 6.005 contract):
--
208-
209-  /**
210:   * Return post-processor purchase type → price mapping (in cents).
211-   */
212-  getPostProcessorPrices(): Record<string, { cents: number; label: string }> {
--
254-   * @returns { url } redirect URL for Stripe Checkout
255-   
... [+1236 chars truncated]

### User | 2026-06-22T13:49:08.615Z

[tool_result] 289	  // --------------------------------------------------------------------------
290	  // POST /purchase-post -- purchase/subscribe to post-processor controller
291	  // --------------------------------------------------------------------------
292	  router.post(
293	    "/purchase-post",
294	    rateLimitMiddleware("RL-BILLING", "ip"),
295	    verifyToken,
296	    async (req: Request, res: Res
... [+992 chars truncated]

### Assistant | 2026-06-22T13:49:14.734Z

Now let me look at the webhook `post_processor_purchased` handler to confirm whether a bundle purchase ever produces `post_bundle_all`/`post_bundle_5` license records, or per-controller `post_perpetual` records. This is the crux of whether the FE's bundle ownership logic can ever fire correctly.

### Assistant | 2026-06-22T13:49:17.293Z

[tool_use: Read]

### Assistant | 2026-06-22T13:49:17.490Z

[tool_use: Read]

### User | 2026-06-22T13:49:21.210Z

[tool_result] 308	  /**
309	   * Create a Checkout session for a post-processor controller purchase.
310	   *
311	   * @param userId     - PRISM user id
312	   * @param controller - controller name (e.g. "fanuc_30i")
313	   * @param type       - "monthly" | "annual" | "permanent"
314	   * @returns { url } redirect URL
315	   */
316	  async createPostPurchaseCheckout(
317	    userId: string,
318	    controller: 
... [+2070 chars truncated]

### User | 2026-06-22T13:49:21.293Z

[tool_result] 420	          action: "payment_succeeded",
421	          data: {
422	            customerId:     inv.customer,
423	            subscriptionId: inv.subscription,
424	            amount:         inv.amount_paid,
425	            periodEnd:      inv.period_end,
426	          },
427	        };
428	      }
429	
430	      case "payment_intent.succeeded": {
431	        const pi = event.data?.object ?? {};
... [+1169 chars truncated]

### Assistant | 2026-06-22T13:49:29.287Z

I now have a complete picture of the backend contract. Let me confirm the FE's `purchasePost("bundle-all20", "permanent")` call path — the FE sends `controller: "bundle-all20"` which the backend treats as a literal controller name, not a bundle. And `applyWebhookToStore` has NO case for `post_processor_purchased` — so NO license is ever issued from any purchase. Let me verify that `applyWebhookToStore`'s switch has no `post_processor_purchased` case (confirmed in lines 39-77 already — it only handles subscription_* and payment_failed; `post_processor_purchased` falls to default no-op).

Let me do one final verification: check the test for `LicenseSummary.activatedAt` optionality and whether the FE `scope?: string | null` vs backend `scope?: string` (no null) matters, and confirm `getRequestHeaders` behavior for the anon case (does an unauthenticated `getLicenses` actually reject, or return 200 with empty?).

### Assistant | 2026-06-22T13:49:30.291Z

[tool_use: Read]

### Assistant | 2026-06-22T13:49:31.476Z

[tool_use: Grep]

### User | 2026-06-22T13:49:35.885Z

[tool_result] 7- *
8- * Usage:
9: *   router.get("/protected", verifyToken, handler)
10: *   router.post("/admin", verifyToken, requireRole("admin"), handler)
11: *   router.delete("/job/:id", verifyToken, requirePermission("job:delete"), handler)
12- */
13-import type { Request, Response, NextFunction } from "express";
--
29- * Verify Bearer token from Authorization header.
30- * Sets req.userId, req.userRoles
... [+1252 chars truncated]

### User | 2026-06-22T13:49:36.220Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Auth Middleware
3	 * *** SECURITY CRITICAL ***
4	 *
5	 * Express middleware for JWT-like token verification, role-based access
6	 * control, and permission enforcement. Wires AuthEngine to HTTP layer.
7	 *
8	 * Usage:
9	 *   router.get("/protected", verifyToken, handler)
10	 *   router.post("/admin", verifyToken, requireRole("admin"), handler)
11	 *   router.delete("/
... [+1635 chars truncated]

### Assistant | 2026-06-22T13:49:49.599Z

I have all the verification needed. The `GET /licenses` route uses `verifyToken` (not `optionalToken`), so an anonymous request returns 401 — the FE's try/catch around `getLicenses()` correctly handles this (own nothing). Now let me synthesize my findings.

Let me trace the key data flow once more to confirm the central finding:

1. Backend `LicenseStore.ONE_TIME_PRODUCTS` (via `pricing-registry.ts`) = ONLY `sfc_perpetual` + `post_perpetual`. `LicenseStore.issue()` throws on any other product (line 215: `if (!isOneTimeProduct(product)) throw`).
2. `applyWebhookToStore` (billing.ts:33-78) handles only `subscription_created/updated/canceled/payment_failed`. The `post_processor_purchased` action (StripeBillingEngine.ts:433) hits the `default` case → `no-op`. **No post purchase ever issues a license.**
3. There is no code path anywhere that issues a `post_bundle_5` or `post_bundle_all` license record. Those product ids exist ONLY in the FE `pricing.ts` and the price tables — never as `LicenseStore` products.

So the FE's `allOwned` branch keying on `l.product === 'post_bundle_all'` (postOwnership.ts:24) can never fire from real backend data. This is a forward-looking assumption, but it's not a silent break of current behavior — let me classify it correctly. The risk is the inverse: the FE's display correctly mirrors the *documented* backend semantics (`hasPostLicense`: active + post_perpetual + scope === controllerId), and for `allOwned` it's a no-op today (no such license exists) but a correct-if-ever-issued assumption. Let me verify the comment in the test acknowledges the BE-deferred nature.

The pricing-registry test at line 91 said: "bundles post_bundle_5/all, deferred BE-side". Let me confirm that exact comment.

### Assistant | 2026-06-22T13:49:50.920Z

[tool_use: Read]

### User | 2026-06-22T13:49:54.828Z

[tool_result] 78	    // FE PLAN_TIERS monthlyUsd: free 0, starter 29, pro 79, shop 199, enterprise 499
79	    const feMonthly: Record<Plan, number> = { free: 0, starter: 29, pro: 79, shop: 199, enterprise: 499 };
80	    for (const p of PLANS) {
81	      expect(PLAN_PRICES[p].monthly_cents / 100).toBe(feMonthly[p]);
82	    }
83	    // FE one-time: single post perpetual $199, bundle_5 $799, bundle_all $2499
84	  
... [+1003 chars truncated]

### Assistant | 2026-06-22T13:50:20.382Z

This confirms the backend team explicitly deferred bundle license issuance ("bundles deferred BE-side"). My analysis is complete. Let me write the verdict.

## Analysis Summary

I traced the full ownership data flow: FE `computePostOwnership` → `LicenseSummary` shape → backend `GET /licenses` (`listLicensesOp` → `getUserLicenses`) → `LicenseStore.LicenseRecord`, and cross-checked the FE ownership rule against `LicenseStore.hasPostLicense` (the backend's authoritative per-controller check).

**Consumers traced:** `PostProcessorStorePage` (the sole consumer of `computePostOwnership`/`ownsController`/`getLicenses`), the `billingApi` barrel, both test files, the backend `listLicensesOp`/`hasPostLicense`/`grantedFeatures`, `applyWebhookToStore`, and `ONE_TIME_PRODUCTS` (both FE and BE registries).

---

VERDICT: PASS

summary: The FE ownership rule faithfully mirrors the backend's authoritative per-controller check (`LicenseStore.hasPostLicense`: active + `post_perpetual` + `scope === controllerId`), correctly ignores revoked licenses, treats `post_bundle_5` as non-blanket, and gates "Owned" as display-only — the backend remains the purchase source of truth, so no false "Owned" can block a legitimate buy beyond what the user actually holds. The `allOwned`-via-`post_bundle_all` branch is a forward-looking no-op today (the backend issues NO bundle/post licenses yet), which is a correct-when-implemented assumption rather than a current break, and the anon/401 path is handled gracefully. Tests round-trip real ownership logic with only the billing client mocked and contain no weakened assertions.

findings:
- [P2] `H:/prism/mcp-server/web/src/lib/postOwnership.ts:24` — The `allOwned` branch keys on an active `post_bundle_all` license, but no backend path ever issues one: `LicenseStore.ONE_TIME_PRODUCTS` (`pricing-registry.ts:141`) contains only `sfc_perpetual`+`post_perpetual`, `LicenseStore.issue()` throws on any other product (`LicenseStore.ts:215`), and `applyWebhookToStor
... [+2341 chars truncated]
