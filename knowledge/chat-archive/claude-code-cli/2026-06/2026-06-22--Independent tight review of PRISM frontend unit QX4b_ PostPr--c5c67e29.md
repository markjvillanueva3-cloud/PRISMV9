---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "Independent tight review of PRISM frontend unit QX4b: PostProcessorStorePage now"
date: "2026-06-22"
first_ts: "2026-06-22T13:47:51.114Z"
last_ts: "2026-06-22T13:53:50.462Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 69
user_msgs: 28
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a27c10e1bad9684f0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Independent tight review of PRISM frontend unit QX4b: PostProcessorStorePage now

> **claude-code-cli** | 2026-06-22 | 69 msgs (28 user / 41 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a27c10e1bad9684f0.jsonl`

## Transcript

### User | 2026-06-22T13:47:51.114Z

Independent tight review of PRISM frontend unit QX4b: PostProcessorStorePage now shows "Owned" for controllers the user already licensed (GET /billing/licenses). Files under H:/prism/mcp-server/web/src: lib/postOwnership.ts, api/billing.ts (getLicenses + LicenseSummary), pages/PostProcessorStorePage.tsx, __tests__/postOwnership.test.ts, __tests__/PostProcessorStorePage.test.tsx. Grade PASS/FAIL + P0/P1/P2 + file:line.

Weight toward: convention conformance, regression to the existing store page, and correctness the other arm may miss.
1. REGRESSION: the page previously used `isEnterprise` to disable Buy + bundles + show "Included". Confirm the change to `ownership.allOwned` / per-controller `owned` preserves the enterprise behavior (enterprise still shows "Included" on all 20, bundles disabled) AND adds bundle_all + per-controller owned. Any existing behavior broken? Is `isEnterprise` still used correctly (banner)?
2. CONVENTION (R11): the new code matches the page's existing idiom (slate/dark Tailwind, the existing useState/useEffect best-effort fetch pattern); ASCII-only.
3. LicenseSummary type matches the backend LicenseRecord (LicenseStore.ts) shape it deserializes (licenseKey, product, feature:string|null, scope?:string|null, status:'active'|'revoked', activatedAt?). Any field-shape drift?
4. The two useEffect fetches (status + licenses): ordering, the cancelled-guard, no set-state-after-unmount, no double-render issue.
5. Tests: legitimacy (R9), spanning (per-controller / enterprise / bundle_all / 401-graceful / revoked), no .skip/.only.

End with VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-22T13:47:57.274Z

I'll review the QX4b unit files end to end. Let me start by reading all the changed files plus the backend types they depend on.

### Assistant | 2026-06-22T13:47:57.905Z

[tool_use: Read]

### Assistant | 2026-06-22T13:47:58.695Z

[tool_use: Read]

### Assistant | 2026-06-22T13:47:59.169Z

[tool_use: Read]

### Assistant | 2026-06-22T13:47:59.657Z

[tool_use: Read]

### Assistant | 2026-06-22T13:47:59.889Z

[tool_use: Read]

### User | 2026-06-22T13:48:00.689Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\lib\postOwnership.ts' was already read 16s ago in this session and is unchanged (mtime 1782135786937). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T13:48:00.861Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\billing.ts' was already read 16s ago in this session and is unchanged (mtime 1782135791980). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T13:48:00.996Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\pages\PostProcessorStorePage.tsx' was already read 14s ago in this session and is unchanged (mtime 1782135929438). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### User | 2026-06-22T13:48:01.082Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\postOwnership.test.ts' was already read 14s ago in this session and is unchanged (mtime 1782135813015). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-06-22T13:48:01.226Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\PostProcessorStorePage.test.tsx' was already read 14s ago in this session and is unchanged (mtime 1782135969516). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: P
... [+18 chars truncated]

### Assistant | 2026-06-22T13:48:04.381Z

The read-once guard claims these files are already in my context, but they are not — this is a fresh agent thread. The guard is mistaken. Let me bypass it with the documented escape.

### Assistant | 2026-06-22T13:48:05.321Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:48:05.856Z

[tool_use: Bash]

### User | 2026-06-22T13:48:17.350Z

[tool_result]      1	/**
     2	 * Compute which post-processor controllers a user already owns, from their
     3	 * perpetual licenses (GET /billing/licenses) + plan. Mirrors the backend's own
     4	 * ownership semantics (LicenseStore.ownsController):
     5	 *   - enterprise plan OR an active post_bundle_all license => ALL controllers owned;
     6	 *   - each active post_perpetual license => the single co
... [+1358 chars truncated]

### User | 2026-06-22T13:48:30.612Z

[tool_result]      1	import { ApiError, getRequestHeaders } from './client';
     2	
     3	/**
     4	 * Billing API client.
     5	 *
     6	 * Backend routes (mcp-server/src/routes/billing.ts) return FLAT JSON
     7	 * ({ url, sessionId } / status object) -- NOT the {result}-wrapped PrismResponse
     8	 * shape. billingRequest returns the parsed body directly.
     9	 */
    10	const BILLING_BASE = '/api/v
... [+4541 chars truncated]

### Assistant | 2026-06-22T13:48:33.765Z

The cat approach works. Let me read the remaining three files and the backend dependencies (LicenseStore.ts for the LicenseRecord shape, and the billing routes).

### Assistant | 2026-06-22T13:48:35.167Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:48:36.305Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:48:36.708Z

[tool_use: Bash]

### User | 2026-06-22T13:48:54.598Z

[tool_result]      1	import { useState, useEffect } from "react";
     2	import { billingApi, type LicenseSummary } from "../api/billing";
     3	import { POST_SUBSCRIPTION_USD, ONE_TIME_PRODUCTS, formatPrice } from "../data/pricing";
     4	import { computePostOwnership, ownsController, type PostOwnership } from "../lib/postOwnership";
     5	
     6	interface Controller {
     7	  name: string;
     8	  famil
... [+15226 chars truncated]

### User | 2026-06-22T13:49:14.185Z

[tool_result]      1	import { describe, it, expect } from 'vitest';
     2	import { computePostOwnership, ownsController } from '../lib/postOwnership';
     3	import type { LicenseSummary } from '../api/billing';
     4	
     5	function lic(over: Partial<LicenseSummary>): LicenseSummary {
     6	  return {
     7	    licenseKey: 'PRISM-POST-x-y',
     8	    product: 'post_perpetual',
     9	    feature: null,
 
... [+2887 chars truncated]

### User | 2026-06-22T13:49:28.718Z

[tool_result]      1	import { describe, it, expect, vi, beforeEach } from 'vitest';
     2	import { render, screen, waitFor } from '@testing-library/react';
     3	import PostProcessorStorePage from '../pages/PostProcessorStorePage';
     4	import type { LicenseSummary } from '../api/billing';
     5	
     6	// Mock only the billing client; computePostOwnership + the page render for real
     7	// (round-trip: 
... [+2933 chars truncated]

### Assistant | 2026-06-22T13:49:33.124Z

I have all five frontend files. Now I need to verify the backend contracts: the `LicenseRecord` shape in `LicenseStore.ts`, the `ownsController` semantics, the `/licenses` route shape, and the `ONE_TIME_PRODUCTS`/pricing it depends on. Let me find these.

### Assistant | 2026-06-22T13:49:33.317Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:49:33.758Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:49:34.314Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:49:34.484Z

[tool_use: Glob]

### User | 2026-06-22T13:49:37.916Z

[tool_result] No files found

### User | 2026-06-22T13:49:38.716Z

[tool_result] No files found

### User | 2026-06-22T13:49:40.080Z

[tool_result] No files found

### User | 2026-06-22T13:49:40.299Z

[tool_result] No files found

### Assistant | 2026-06-22T13:49:44.094Z

The cwd is `H:\prism\mcp-server\web`, so my globs were rooted there, not the repo. Let me search from the repo root with absolute paths.

### Assistant | 2026-06-22T13:49:46.077Z

[tool_use: Bash]

### User | 2026-06-22T13:50:04.446Z

[tool_result] /h/prism/mcp-server/src/engines/LicenseStore.ts
---ROUTES---
/h/prism/mcp-server/src/routes/billing.ts
---PRICING---
/h/prism/mcp-server/web/src/data/pricing.ts
---CLIENT---
/h/prism/mcp-server/web/src/api/client.ts

### Assistant | 2026-06-22T13:50:07.335Z

Found them. Let me read the backend LicenseStore (for the `LicenseRecord` shape and `ownsController` semantics), the billing routes (for the `/licenses` and `/status` response shape), and the pricing data file.

### Assistant | 2026-06-22T13:50:08.186Z

[tool_use: Bash]

### User | 2026-06-22T13:50:19.526Z

[tool_result]      1	/**
     2	 * PRISM MCP Server -- LicenseStore (U-COMM-08)
     3	 *
     4	 * Persisted one-time (perpetual) license grants. These are NON-subscription
     5	 * purchases -- the operator's launch ask: "a logical price for one time payment
     6	 * for the sfc and a single post processor."
     7	 *
     8	 * A license grants a feature FOREVER, independent of the user's subscription plan:
... [+15554 chars truncated]

### Assistant | 2026-06-22T13:50:26.523Z

Now I have a critical finding. The backend `LicenseRecord` (line 42-58) shows several material divergences from the frontend `LicenseSummary`. Critically:

- `product` comment says `(sfc_perpetual | post_perpetual)` — only TWO products. There is **no `post_bundle_all` or `post_bundle_5`** in the backend product set referenced here.
- `feature: string | null` matches.
- `scope?: string` (NOT `string | null`) — the backend only sets `scope` when `def.scope === "controller"` (line 233), and it is `undefined` otherwise, never `null`.

This raises a real question about whether `post_bundle_all` / `post_bundle_5` even exist as products. The frontend ownership logic and tests hinge on a `post_bundle_all` product existing in the catalog AND being returned in `/licenses`. Let me verify the actual product catalog and the `/licenses` route's response shape (does it return raw `LicenseRecord` or a projected summary?).

### Assistant | 2026-06-22T13:50:30.107Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:50:30.572Z

[tool_use: Bash]

### User | 2026-06-22T13:50:41.399Z

[tool_result]      1	/**
     2	 * PRISM MCP Server -- Billing Routes
     3	 * Stripe subscription management and post-processor purchases.
     4	 *
     5	 * Endpoints:
     6	 *   POST /api/v1/billing/create-checkout   -- create subscription checkout
     7	 *   POST /api/v1/billing/portal            -- customer billing portal
     8	 *   POST /api/v1/billing/webhook           -- Stripe webhook (no auth, ra
... [+3874 chars truncated]

### User | 2026-06-22T13:50:53.461Z

[tool_result] /h/prism/mcp-server/src/config/pricing-registry.ts
---
123://     for a controller-scoped product whose grant is checked per-controller at the
126://   - `scope`: "none" = blanket feature grant; "controller" = the license is bound
138:  scope: "none" | "controller";
141:export const ONE_TIME_PRODUCTS: Record<string, OneTimeProduct> = {
142:  sfc_perpetual: {
143:    id: "sfc_perpetual",
147:    sc
... [+265 chars truncated]

### Assistant | 2026-06-22T13:50:59.578Z

This is the key finding. The backend `ONE_TIME_PRODUCTS` registry (the source of truth, `pricing-registry.ts`) contains **only two products: `sfc_perpetual` and `post_perpetual`**. There is **no `post_bundle_all` and no `post_bundle_5`** in the backend catalog.

But the frontend `data/pricing.ts` references `ONE_TIME_PRODUCTS.post_bundle_5.priceUsd` and `ONE_TIME_PRODUCTS.post_bundle_all.priceUsd` (PostProcessorStorePage.tsx:57-58), and the ownership logic keys on `product === 'post_bundle_all'`. I must check the frontend's own `data/pricing.ts` — it may have its own product set distinct from the backend. And I must confirm whether the backend can ever actually issue a `post_bundle_all` license (otherwise `allOwned` via bundle is dead code). Let me read the frontend pricing data, the `/licenses` route body in full, and the purchase-post handler.

### Assistant | 2026-06-22T13:51:01.014Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:51:02.321Z

[tool_use: Bash]

### User | 2026-06-22T13:51:16.961Z

[tool_result]      1	/**
     2	 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
     3	 *
     4	 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
     5	 * Anchored on the tested backend catalog:
     6	 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
     7	 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
     8	 *   - one-time
... [+14021 chars truncated]

### User | 2026-06-22T13:51:27.219Z

[tool_result]    100	      : /unknown license key/.test(msg) ? "UNKNOWN_KEY"
   101	      : /another account/.test(msg) ? "ALREADY_ACTIVATED"
   102	      : /revoked/.test(msg) ? "REVOKED"
   103	      : "ACTIVATION_FAILED";
   104	    const status = code === "ALREADY_ACTIVATED" ? 409 : 400;
   105	    return { status, body: { error: { status, message: msg, code } } };
   106	  }
   107	}
   108	
   109	/** Lis
... [+3582 chars truncated]

### Assistant | 2026-06-22T13:51:35.742Z

Now I have the full contract picture. Several important facts:

1. **`GET /licenses` returns RAW `LicenseRecord[]`** (`listLicensesOp` line 114 → `store.getUserLicenses(userId)` which returns `LicenseRecord[]` unprojected). So the frontend `LicenseSummary` deserializes a raw `LicenseRecord`. Field-shape comparison matters.

2. **`GET /licenses` requires `verifyToken`** (line 349) — NOT `optionalToken`. So an anonymous user gets a 401, confirming the frontend's "best-effort catch → own nothing" path is the real behavior.

3. **The `/status` route** — I should confirm its body shape (does it include `plan`?). Let me check it. Also I need to confirm whether `post_bundle_all` can ever actually be issued by the backend (the registry only has 2 products; `getUserLicenses` returns whatever is stored; a bundle license would need a product the backend store can mint). Let me verify the `/status` body and check whether `post_bundle_all`/`post_bundle_5` are minted anywhere, and check the `getRequestHeaders` for auth.

### Assistant | 2026-06-22T13:51:37.164Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:51:38.400Z

[tool_use: Bash]

### User | 2026-06-22T13:51:44.898Z

[tool_result]    266	  // GET /status -- get user's current subscription status
   267	  // --------------------------------------------------------------------------
   268	  router.get(
   269	    "/status",
   270	    optionalToken,
   271	    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
   272	      try {
   273	        const userId = req.userId ?? (req as any).user?.userId;
 
... [+691 chars truncated]

### User | 2026-06-22T13:51:53.472Z

[tool_result] ===== post_bundle_all / post_bundle_5 in backend src =====
/h/prism/mcp-server/src/__tests__/pricing-registry.test.ts:91:    // bundles post_bundle_5/all, deferred BE-side]. The BE ids MUST match the FE ids or

### Assistant | 2026-06-22T13:52:00.522Z

This confirms the key contract gap. Let me read that pricing-registry test comment to understand the documented intent (whether bundles are knowingly deferred backend-side).

### Assistant | 2026-06-22T13:52:01.884Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:52:03.856Z

[tool_use: Bash]

### User | 2026-06-22T13:52:17.574Z

[tool_result]     80	    for (const p of PLANS) {
    81	      expect(PLAN_PRICES[p].monthly_cents / 100).toBe(feMonthly[p]);
    82	    }
    83	    // FE one-time: single post perpetual $199, bundle_5 $799, bundle_all $2499
    84	    expect(POST_PROCESSOR_PRICES.permanent / 100).toBe(199);
    85	    expect(POST_PROCESSOR_PRICES.bundle_5 / 100).toBe(799);
    86	    expect(POST_PROCESSOR_PRICES.bundle_all / 
... [+1003 chars truncated]

### User | 2026-06-22T13:52:22.336Z

[tool_result] ===== how StripeBillingEngine maps controller->product for purchase-post =====
88:  type: PostPurchaseType | "bundle_5" | "bundle_all";
119:  bundle_5:   79900,  // $799 / 5+ controllers
120:  bundle_all: 249900, // $2499 / 20+ (all)
217:      bundle_5:   { cents: POST_PROCESSOR_PRICES.bundle_5,   label: "$799 bundle (5+ controllers)" },
218:      bundle_all: { cents: POST_PROCESSOR_PRICES.bundle_
... [+314 chars truncated]

### Assistant | 2026-06-22T13:52:31.584Z

Now I have a complete and verified picture. Key facts confirmed:

- The backend `LicenseStore` can only mint `sfc_perpetual` and `post_perpetual` products (`PRODUCT_ABBR` line 85-88, `ONE_TIME_PRODUCTS` BE registry has only those two — `pricing-registry.test.ts:98` asserts exactly `["post_perpetual","sfc_perpetual"]`). Bundles are **knowingly deferred backend-side** (documented at `pricing-registry.test.ts:91`).
- Therefore `GET /licenses` can NEVER return a `product: 'post_bundle_all'` record today. The `allOwned`-via-bundle branch in `computePostOwnership` (postOwnership.ts:24) is forward-looking but currently **unreachable in production** — not a bug, but the ownership semantics it claims to "mirror" (the doc comment) don't have a backend `ownsController` to mirror; that's a doc overstatement, not a logic error.

This is a forward-compatibility consideration, not a correctness defect, since the code degrades correctly (no bundle license → `allOwned=false` from that branch → enterprise still works). I'll note it as P2.

Now let me verify the remaining review axes. Let me check `getRequestHeaders` (auth header presence affects the 401 path) and confirm there are no `.skip`/`.only` and the ASCII-only convention.

### Assistant | 2026-06-22T13:52:36.150Z

[tool_use: Bash]

### User | 2026-06-22T13:52:42.782Z

[tool_result] 42:export function getRequestHeaders(): Record<string, string> {
59:    headers: getRequestHeaders(),
72:    headers: getRequestHeaders(),
129:      headers: getRequestHeaders(),
163:    headers: getRequestHeaders(),
172:    headers: getRequestHeaders(),
185:    headers: getRequestHeaders(),
194:    headers: getRequestHeaders(),
221:    headers: getRequestHeaders(),
245:    headers: getRequestHead
... [+382 chars truncated]

### Assistant | 2026-06-22T13:52:47.060Z

All ASCII-clean, no `.skip`/`.only`/`.todo`. The page uses `--` for em-dash substitution (ASCII-conformant, matching the surrounding convention).

Now let me check the original/prior version of the store page to verify the regression concern directly: did the page previously gate on `isEnterprise` for the Buy button and bundles, and is that behavior preserved? Let me look at git to see what changed.

### Assistant | 2026-06-22T13:52:48.808Z

[tool_use: Bash]

### User | 2026-06-22T13:52:59.937Z

[tool_result] f02162c15b [MAIN-FORCE] [PRODUCT-LAUNCH]/U-Q-POST-STORE-HARDEN (slot:quebec): post-processor store purchase correctness
aaba8ddf0a [MAIN] [GOAL-TSC-FIX] (slot:golf /loop iter25): 23 → 19 via 6 fixes (-4)
4426e02b14 [CALC-RESTORE-MS0]/U-CALC-RESTORE-01: restore 274 KEEP untracked files (tracked-imports + entry points)
===== diff of the page vs prior committed version =====
diff --git a/mcp-server/w
... [+4734 chars truncated]

### Assistant | 2026-06-22T13:53:12.830Z

The diff confirms the regression analysis precisely. Let me verify the regression claim point by point against the prior behavior:

**Prior behavior (HEAD):**
- Bundle buttons disabled when `isEnterprise`.
- Per-controller Buy button disabled when `isEnterprise`; showed "Included" when `isEnterprise`.

**New behavior:**
- Bundle buttons disabled when `ownership.allOwned`. For enterprise, `computePostOwnership(..., 'enterprise')` sets `allOwned = true` (postOwnership.ts:24), so bundles stay disabled for enterprise. **Preserved.** Plus now correctly disabled for a `post_bundle_all` owner. Improvement.
- Per-controller button: `owned = ownsController(ownership, ctrl.id)`. For enterprise, `allOwned=true` → `owned=true` for every controller → disabled, and label resolves to `isEnterprise ? "Included"` = "Included" on all 20. **Enterprise "Included" on all 20 preserved.** For non-enterprise per-controller/bundle ownership it now shows "Owned" and disables. New capability added correctly.

`isEnterprise` is still used correctly for the banner (line 166) and for the "Included" vs "Owned" label distinction (line 281).

One subtle correctness item worth confirming: in the enterprise case the bundle label still renders the **price** (`BUNDLE_5_PRICE`/`BUNDLE_ALL_PRICE`) on a disabled button rather than an "Owned"/"Included" word — but that was identical in the prior version (disabled + price shown), so it is not a regression. Noting as P2 cosmetic.

Now let me verify the two `useEffect` concerns and the test legitimacy. There is one ordering detail I want to be precise about: the `setPlan(s.plan)` happens before the `getLicenses` await, and `isEnterprise` derives from `plan` state. Let me confirm there's no intermediate-render window where bundles are wrongly enabled for enterprise. I have everything I need in context to reason about this — no further file reads required.

Let me do a final check: confirm `getRequestHeaders` actually attaches a token (so the 401-on-anonymous p
... [+114 chars truncated]

### Assistant | 2026-06-22T13:53:14.039Z

[tool_use: Bash]

### User | 2026-06-22T13:53:19.697Z

[tool_result]     42	export function getRequestHeaders(): Record<string, string> {
    43	  const headers: Record<string, string> = {
    44	    'Content-Type': 'application/json',
    45	  };
    46	  if (apiKey) {
    47	    headers['Authorization'] = `Bearer ${apiKey}`;
    48	  }
    49	  return headers;
    50	}
    51	
    52	async function request<T>(
    53	  method: 'GET' | 'POST' | 'PATCH',
    54	  p
... [+261 chars truncated]

### Assistant | 2026-06-22T13:53:50.462Z

Confirmed: when no `apiKey` is set, no `Authorization` header is sent → backend `verifyToken` on `/licenses` rejects with 401 → frontend's inner `catch` swallows it → `licenses=[]` → plan-only ownership. The graceful-401 path is real, and the test (`failLicenses` rejecting) accurately models it.

I now have everything verified end to end. Let me compile the final review.

## Verification summary

**Read end-to-end:** all 5 changed files plus the backend contracts they depend on — `LicenseStore.ts` (LicenseRecord shape + ownership semantics), `routes/billing.ts` (`/licenses`, `/status`, `/purchase-post` handlers + auth middleware), `config/pricing-registry.ts` (backend product catalog), `web/src/data/pricing.ts` (frontend product catalog), `web/src/api/client.ts` (`getRequestHeaders` auth), and the parity test `pricing-registry.test.ts`. I also diffed the page against its committed parent (`f02162c15b`).

---

VERDICT: PASS

summary: The `isEnterprise` → `ownership.allOwned`/per-controller `owned` migration preserves every prior enterprise behavior (all-20 "Included", bundles disabled) and correctly adds per-controller "Owned" and bundle-all ownership. The `LicenseSummary` type, the two-fetch effect with its cancelled-guard, and the tests are all sound. No P0/P1. Findings below are P2 forward-compat/cosmetic notes only.

findings:
- [P2] `mcp-server/web/src/lib/postOwnership.ts:24` and `:3-6` (doc) — The `allOwned`-via-`post_bundle_all` branch is currently **unreachable in production**: the backend `LicenseStore` can only mint `sfc_perpetual`/`post_perpetual` (`PRODUCT_ABBR` LicenseStore.ts:85-88; backend `ONE_TIME_PRODUCTS` has exactly `["post_perpetual","sfc_perpetual"]`, asserted at `pricing-registry.test.ts:98`; bundles "deferred BE-side" per `pricing-registry.test.ts:91`), so `GET /licenses` can never return a `post_bundle_all` record today. This is forward-compatible and degrades correctly (enterprise still drives `allOwned`), so it is not a defect — but the do
... [+3427 chars truncated]
