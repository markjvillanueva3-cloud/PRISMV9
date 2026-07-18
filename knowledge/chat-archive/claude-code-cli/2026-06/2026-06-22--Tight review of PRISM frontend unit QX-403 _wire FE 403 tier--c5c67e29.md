---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "Tight review of PRISM frontend unit QX-403 (wire FE 403 tier-gate denial -> upgr"
date: "2026-06-22"
first_ts: "2026-06-22T14:21:24.745Z"
last_ts: "2026-06-22T14:23:41.617Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 54
user_msgs: 22
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-af3c6dccd972f6b8f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Tight review of PRISM frontend unit QX-403 (wire FE 403 tier-gate denial -> upgr

> **claude-code-cli** | 2026-06-22 | 54 msgs (22 user / 32 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-af3c6dccd972f6b8f.jsonl`

## Transcript

### User | 2026-06-22T14:21:24.745Z

Tight review of PRISM frontend unit QX-403 (wire FE 403 tier-gate denial -> upgrade prompt on the SFC page). Read the files; grade PASS/FAIL + P0/P1/P2 + file:line.

Files (H:/prism/mcp-server/web/src):
- api/sfc.ts (changed: the !res.ok branch now throws `new ApiError(res.status, msg)` from ./requestCore instead of `new Error(msg)` -- preserves the HTTP status)
- hooks/useSfc.ts (changed: AsyncState gains `errorStatus: number|null`; the catch reads the status structurally `(e as {status?}).status` and stores it; all setState sites updated; returned via ...state)
- pages/SfcCalculatorPage.tsx (changed: when `calc.errorStatus === 403` renders a "Daily free limit reached -> View Plans" upgrade notice instead of <ResultsDisplay>; added useNavigate)
- __tests__/useSfc.test.ts (3 tests: 403/500/ok status propagation)

Context: /api/v1/sfc/calculate is gated requireTier("speed_feed"); free tier = 10/day. A 403 = free user OVER the daily cap (free IS entitled to speed_feed, so 403 is only a cap-exceed). Upgrade copy must be "daily limit -> upgrade for unlimited", NOT a generic feature-lock. Confirm the copy is accurate.

Adversarial checks:
1. BLAST RADIUS: useSfc is shared by useSfcCalculate/CycleTime/Engagement/PowerTorque/SurfaceFinish/ToolLife (hooks/useSfc.ts) and consumed by multiple pages. Is adding `errorStatus` to AsyncState + the return purely ADDITIVE (no existing consumer breaks)? Does any consumer destructure AsyncState in a way that the new field breaks?
2. sfc.ts: ApiError extends Error (requestCore.ts) so `.message` still works for existing catchers -- confirm no consumer relied on `instanceof Error` being a *plain* Error or on the exact constructor. The 200-OK-{error} envelopeGuard path is UNCHANGED (only the !res.ok branch changed) -- confirm.
3. The structural status read `(e as {status?}).status` -- correct for the ApiError class (has .status:number)? Handles a non-ApiError throw (AbortError already returned early; a plain Error -> status null -> falls 
... [+391 chars truncated]

### Assistant | 2026-06-22T14:21:28.695Z

I'll review the QX-403 unit. Let me start by reading all four changed files and their dependencies.

### Assistant | 2026-06-22T14:21:29.175Z

[tool_use: Read]

### Assistant | 2026-06-22T14:21:29.936Z

[tool_use: Read]

### User | 2026-06-22T14:21:30.223Z

[tool_result] 1	import { getRequestHeaders } from "./client";
2	import { ApiError } from "./requestCore";
3	import { assertNoEnvelopeError } from "./envelopeGuard";
4	import type {
5	  SfcCalculateRequest, SfcCalculateResult,
6	  CycleTimeRequest, CycleTimeResult,
7	  EngagementRequest, EngagementResult,
8	  DeflectionRequest, DeflectionResult,
9	  PowerTorqueRequest, PowerTorqueResult,
10	  SurfaceFinishReques
... [+2398 chars truncated]

### Assistant | 2026-06-22T14:21:30.236Z

[tool_use: Read]

### Assistant | 2026-06-22T14:21:30.415Z

[tool_use: Read]

### User | 2026-06-22T14:21:31.011Z

[tool_result] 1	import { useCallback, useRef, useState } from "react";
2	import { sfcApi } from "../api/sfc";
3	import type { ApiError } from "../types/sfc";
4	
5	interface AsyncState<T> {
6	  data: T | null;
7	  loading: boolean;
8	  error: string | null;
9	  /** HTTP status of the last failure (e.g. 403 = over the free tier cap). */
10	  errorStatus: number | null;
11	}
12	
13	function useApiCall<TReq, TRes>(
... [+2183 chars truncated]

### User | 2026-06-22T14:21:31.185Z

[tool_result] 1	import { useState, useCallback, useMemo, useEffect } from "react";
2	import { useNavigate } from "react-router-dom";
3	import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
4	import OperationSelector from "../components/sfc/OperationSelector";
5	import SmartToolSelector from "../components/sfc/SmartToolSelector";
6	import SmartMachineSelector from "../components/sfc/SmartM
... [+16762 chars truncated]

### User | 2026-06-22T14:21:31.426Z

[tool_result] 1	import { describe, it, expect, vi, beforeEach } from 'vitest';
2	import { renderHook, act } from '@testing-library/react';
3	import { ApiError } from '../api/requestCore';
4	
5	// Control what the SFC API does; the hook's status-propagation runs for real.
6	const h = vi.hoisted(() => ({ mode: 'ok' as 'ok' | '403' | '500' }));
7	
8	vi.mock('../api/sfc', () => ({
9	  sfcApi: {
10	    calculate: ()
... [+1742 chars truncated]

### Assistant | 2026-06-22T14:21:36.651Z

Now let me verify the dependencies. The critical ones: `requestCore.ts` (ApiError class definition), `envelopeGuard.ts` (unchanged 200-OK path), the `ApiError` type in `types/sfc.ts`, the `/pricing` route, and the `Button` `variant="primary"` support.

### Assistant | 2026-06-22T14:21:37.131Z

[tool_use: Read]

### Assistant | 2026-06-22T14:21:37.621Z

[tool_use: Read]

### User | 2026-06-22T14:21:38.125Z

[tool_result] 1	export type ApiErrorKind = 'http' | 'timeout' | 'offline' | 'network' | 'parse' | 'unknown' | 'auth';
2	
3	export type ApiErrorPresentation = {
4	  title: string;
5	  message: string;
6	  hint?: string;
7	  retryLabel: string;
8	};
9	
10	type ApiErrorOptions = {
11	  kind?: ApiErrorKind;
12	  retryable?: boolean;
13	  hint?: string;
14	  cause?: unknown;
15	};
16	
17	type FetchJsonOptions = {
18
... [+9153 chars truncated]

### Assistant | 2026-06-22T14:21:38.736Z

[tool_use: Grep]

### User | 2026-06-22T14:21:39.032Z

[tool_result] 1	/**
2	 * Envelope-error guard for PRISM API clients.
3	 *
4	 * The HTTP transport (raw `fetch` / `fetchJson`) only treats `!response.ok`
5	 * as an error. But a `prism_*` dispatcher can return `200 OK` with a body
6	 * `{ error: "..." }` (a handled failure). Rendering that body as success is the
7	 * #1 documented regression class in this galaxy -- the "silent-zero"
8	 * (frontend-app/CLAUDE.md 
... [+2029 chars truncated]

### User | 2026-06-22T14:21:40.433Z

[tool_result] 112:export interface ApiError {

### Assistant | 2026-06-22T14:21:45.265Z

Important finding: `sfc.ts` imports `ApiError` from `./requestCore`, but `envelopeGuard.ts` imports `ApiError` from `./client`. And `useSfc.ts` imports `ApiError` as a **type** from `../types/sfc` (line 3), which is a *different* `ApiError` (an interface at `types/sfc.ts:112`, not the class). Let me verify these are consistent — whether `client` re-exports the same class and whether the `types/sfc` interface has a `.status` field.

### Assistant | 2026-06-22T14:21:46.213Z

[tool_use: Read]

### Assistant | 2026-06-22T14:21:47.279Z

[tool_use: Grep]

### User | 2026-06-22T14:21:47.477Z

[tool_result] 105	
106	export interface ToolLifeResult {
107	  tool_life_minutes: number;
108	  wear_rate: number;
109	}
110	
111	/** Generic API error */
112	export interface ApiError {
113	  message: string;
114	  code?: string;
115	  status?: number;
116	}
117	

### User | 2026-06-22T14:21:50.610Z

[tool_result] 19:  ApiError,
21:  toApiError,
25:  ApiError,
26:  describeApiError,
28:  isRetryableApiError,
29:  toApiError,
30:  type ApiErrorKind,
31:  type ApiErrorPresentation,
141:      throw new ApiError(response.status, readPayloadMessage(payload, 'Lathe result request failed'), {
152:    throw toApiError(error, 'Lathe result request failed');
270:      throw new ApiError(
278:    throw toApiError(erro
... [+36 chars truncated]

### Assistant | 2026-06-22T14:21:55.801Z

`client.ts` re-exports the `ApiError` class from `requestCore` (lines 19/25). So `envelopeGuard.ts` (imports from `./client`) and `sfc.ts` (imports from `./requestCore`) reference the **same class** — consistent. And `types/sfc.ts:112` `ApiError` interface has `status?: number` and `message: string`, structurally compatible with the class, so the `useSfc.ts` type-only import is sound (it's just used as a structural type for `.message`).

Now let me verify: the `/pricing` route exists, the `Button` component supports `variant="primary"`, and trace all consumers of `useSfc` to check the blast radius of the additive `errorStatus` field. Also check whether `AsyncState` is exported/consumed by destructuring elsewhere.

### Assistant | 2026-06-22T14:21:57.256Z

[tool_use: Grep]

### User | 2026-06-22T14:21:58.410Z

[tool_result] src\hooks\useEntitlement.ts:12:import { entitlementFor, type Entitlement, type FeatureKey, type PlanId } from '../data/pricing';
src\components\entitlement\UpgradePrompt.tsx:4: * routes them to /pricing or the billing portal. Pure presentation off the
src\components\entitlement\UpgradePrompt.tsx:8:import { FEATURE_LABELS, PLAN_TIERS, formatPrice, type FeatureKey } from '../../data/pricing';
src\co
... [+1456 chars truncated]

### Assistant | 2026-06-22T14:21:58.669Z

[tool_use: Grep]

### Assistant | 2026-06-22T14:21:59.553Z

[tool_use: Grep]

### User | 2026-06-22T14:22:00.328Z

[tool_result] Found 3 files
src\__tests__\useSfc.test.ts
src\pages\SfcCalculatorPage.tsx
src\hooks\useSfc.ts

### User | 2026-06-22T14:22:00.972Z

[tool_result] src\hooks\useWelding.ts:5:interface AsyncState<T> {
src\hooks\useWelding.ts:12:  const [state, setState] = useState<AsyncState<TRes>>({ data: null, loading: false, error: null });
src\hooks\useVibration.ts:5:interface AsyncState<T> {
src\hooks\useVibration.ts:12:  const [state, setState] = useState<AsyncState<TRes>>({ data: null, loading: false, error: null });
src\hooks\useTurning.ts:5:interface 
... [+6151 chars truncated]

### Assistant | 2026-06-22T14:22:07.062Z

Key blast-radius finding confirmed: `AsyncState` is defined **locally and privately inside each hook file** (each `use*.ts` declares its own `interface AsyncState<T>`). The `useSfc.ts` `AsyncState` is not shared/imported by any other hook, so adding `errorStatus` to it has **zero impact** on the other 30+ hooks. The change is contained.

Now let me confirm the two remaining items: only `SfcCalculatorPage.tsx` consumes `useSfcCalculate` (the other 6 `useSfc*` hooks have only the 3 grep matches = definition + this page + test, meaning the page only uses `useSfcCalculate`), the `/pricing` route is registered in the router, and `Button` supports `variant="primary"`.

### Assistant | 2026-06-22T14:22:08.055Z

[tool_use: Grep]

### User | 2026-06-22T14:22:09.341Z

[tool_result] 100:const MaterialPricingPage = lazyNamed(() => import('./pages/MaterialPricingPage'), 'MaterialPricingPage');
152:const PricingPage = lazy(() => import('./pages/PricingPage'));
215:            <Route path="pricing" element={lazyElement(<PricingPage />)} />
307:              <Route path="material-pricing" element={lazyElement(<MaterialPricingPage />)} />
389:               *   /post-processor    —
... [+55 chars truncated]

### Assistant | 2026-06-22T14:22:09.426Z

[tool_use: Grep]

### User | 2026-06-22T14:22:10.387Z

[tool_result] 3:type Variant = "primary" | "secondary" | "ghost" | "danger";
7:  primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
8:  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
20:  variant?: Variant;
25:  ({ variant = "primary", size = "md", className = "", disabled, children, ...props }, re
... [+7 chars truncated]

### Assistant | 2026-06-22T14:22:10.835Z

[tool_use: Grep]

### User | 2026-06-22T14:22:11.763Z

[tool_result] 20:import { useSfcCalculate } from "../hooks/useSfc";
57:  const calc = useSfcCalculate();
151:    } catch { /* error state handled by useSfcCalculate hook */ }
308:          {calc.errorStatus === 403 ? (

### Assistant | 2026-06-22T14:22:19.031Z

All confirmed:
- `/pricing` route is registered (`App.tsx:215`, `path="pricing"` → `PricingPage`). `navigate("/pricing")` resolves.
- `Button` supports `variant="primary"` (`Button.tsx:3,7,25`). Default is also `primary`.
- The page only consumes `useSfcCalculate` (the other 6 `useSfc*` hooks are unused by any page — their grep matches were definition + test only, so even if those hooks had a different signature it wouldn't matter; but they all share the same `useApiCall` so all 7 get `errorStatus` uniformly and additively).

Now let me verify the backend 403 contract — that a free user over the daily cap actually returns HTTP 403 (not 429), and confirm the upgrade copy accuracy against the entitlement matrix. Let me check `lib/entitlement.ts` (it references "the backend 403 contract") and the route gating.

### Assistant | 2026-06-22T14:22:19.520Z

[tool_use: Read]

### User | 2026-06-22T14:22:20.855Z

[tool_result] 1	/**
2	 * Entitlement resolution -- pure FE logic bridging a user's live plan to the
3	 * canonical entitlement matrix (data/pricing.ts) and the backend 403 contract.
4	 *
5	 * Single source of truth for "can this plan use this feature right now":
6	 *   - the matrix (ENTITLEMENT_MATRIX) decides per-plan inclusion;
7	 *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
8	
... [+3663 chars truncated]

### Assistant | 2026-06-22T14:22:21.027Z

[tool_use: Grep]

### User | 2026-06-22T14:22:22.147Z

[tool_result] Found 22 files
H:\prism\mcp-server\src\routes\billing.ts
H:\prism\mcp-server\src\routes\admin.ts
H:\prism\mcp-server\src\routes\sfc.ts
H:\prism\mcp-server\src\routes\erp.ts
H:\prism\mcp-server\src\routes\index.ts
H:\prism\mcp-server\src\routes\milling.ts
H:\prism\mcp-server\src\routes\cost.ts
H:\prism\mcp-server\src\routes\exportRoutes.ts
H:\prism\mcp-server\src\routes\auth.ts
H:\prism\mcp-server\
... [+531 chars truncated]

### Assistant | 2026-06-22T14:22:26.978Z

This is the critical contract-coupling check. The frontend assumes **403 = over the free daily cap** (and shows "Daily free limit reached"). But the task description itself notes free tier IS entitled to `speed_feed`. So I need to verify what the backend actually returns: does `requireTier("speed_feed")` return 403 for over-cap, or does a rate-limit return 429? And does `requireTier` return 403 for any *other* reason a free user could hit? Let me read the SFC route.

### Assistant | 2026-06-22T14:22:27.289Z

[tool_use: Read]

### User | 2026-06-22T14:22:28.155Z

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

### Assistant | 2026-06-22T14:22:32.538Z

Now the key file: `tierGate.ts` — what HTTP status does `requireTier("speed_feed")` return, and for what reasons? This determines whether `403 === "daily limit reached"` is an accurate mapping or whether a 403 could mean something else (a not-entitled feature, an auth issue, etc.).

### Assistant | 2026-06-22T14:22:32.569Z

[tool_use: Read]

### User | 2026-06-22T14:22:33.606Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Tier Gate Middleware
3	 * Enforces subscription plan feature limits on API endpoints.
4	 *
5	 * Spec (MIT 6.005 contract):
6	 *   - TIER_LIMITS is the single source of truth — exported for tests
7	 *   - checkTierAccess is a pure function (no side effects)
8	 *   - requireTier returns a standard Express middleware factory
9	 *   - 403 on blocked access with structured
... [+9467 chars truncated]

### Assistant | 2026-06-22T14:22:50.339Z

This is the integration-coupling finding. The backend `requireTier("speed_feed")` returns HTTP 403 for **three distinct reasons**, only one of which is "daily limit reached":

1. **`ENTITLEMENT_REVOKED`** (tierGate.ts:224-234) — an admin per-seat override has *disabled* speed_feed for this account. Message: "Access to speed_feed has been disabled for your account by your administrator." This is NOT a daily-cap issue and upgrading will NOT fix it.
2. **`TIER_LIMIT` / daily cap** (tierGate.ts:153-157, 248-258) — free user over 10/day. This is the case the upgrade copy targets. ✓
3. **`TIER_LIMIT` / unknown-plan** (checkTierAccess:148-149, "Unknown plan") — also returns `allowed:false` → 403 with a non-cap reason.

The frontend (`SfcCalculatorPage.tsx:308`) keys purely on `calc.errorStatus === 403` and unconditionally renders "Daily free limit reached." For case 1 (admin revoke) the user is shown wrong copy and a "View Plans" CTA that won't restore access — they'd pay and still be blocked. The backend even ships a machine-readable `code` (`ENTITLEMENT_REVOKED` vs `TIER_LIMIT`) in the error body specifically to disambiguate, but the FE discards it. This is a real silent-mismapping. I'm grading it P1 (it shows materially wrong copy + a non-functional remediation path on a real, shipped 403 branch — `ENTITLEMENT_REVOKED` is a live code per U-COMM-05).

Let me confirm the error body's `code`/structured shape is reachable by the FE — i.e., whether `sfc.ts` preserves it. Looking back at `sfc.ts:28`, it does `err.error || res.statusText` where `err = await res.json()`. The body is `{ error: { status, message, code } }`, so `err.error` is an **object**, not a string. Let me verify what message actually surfaces.

The backend body is `{ error: { status: 403, message: "...", code: "TIER_LIMIT" } }`. In `sfc.ts:32`: `new ApiError(res.status, err.error || res.statusText || "SFC request failed")`. Here `err.error` is the **object** `{status, message, code}`, which is truthy, so it'
... [+670 chars truncated]

### Assistant | 2026-06-22T14:22:52.024Z

[tool_use: Grep]

### User | 2026-06-22T14:22:52.946Z

[tool_result] src\api\admin.ts:13:// The backend error envelope is nested -- { error: { status, message, code }, timestamp }
src\api\admin.ts:19:  return b?.error?.message ?? b?.message ?? statusText;
src\api\billing.ts:43:      typeof err?.error === 'string'
src\api\billing.ts:44:        ? err.error
src\api\billing.ts:45:        : err?.error?.message || err?.message || 'Billing request failed';
src\api\docLear
... [+2940 chars truncated]

### Assistant | 2026-06-22T14:23:09.057Z

Confirmed. `admin.ts:13` documents the canonical backend envelope: `{ error: { status, message, code }, timestamp }` — **nested**, and `admin.ts:19` correctly digs `b?.error?.message`. The sibling pattern (`billing.ts:43-45`, `portal.ts:151-153`, `traveler.ts:95-97`) all handle the case where `error` is an object by reaching `.error.message`.

But `sfc.ts:32` does `err.error || res.statusText` — it does NOT dig into `.error.message`. Since the gated 403 body is `{ error: { status:403, message, code }, timestamp }`, `err.error` is the **object**, which is truthy, so `ApiError`'s `super(message)` coerces it to `"[object Object]"`. So:

- For the **403 daily-cap** path: `calc.error` = `"[object Object]"`, but the page shows hardcoded copy, so the bad message is hidden. The status (403) is correct, so the notice renders. Functionally OK for the happy 403 path, but `calc.error` is garbage.
- For a **non-403 SFC error** (e.g. a 500 from the dispatcher route, or the envelope-guard 200 path which throws a *string* message so that one is fine): the `!res.ok` branch produces `"[object Object]"` shown in `ResultsDisplay`. That's a regression in error display quality (the message was previously also `new Error(msg)` with the same `err.error` bug — so this is **pre-existing**, not introduced by QX-403; the diff only swapped `Error`→`ApiError`, keeping the same message expression). I'll note it P2 as it's not introduced here but is adjacent and real.

Let me verify the test's `ApiError` import path matches the class the hook reads structurally (test imports from `../api/requestCore`, the same class `sfc.ts` throws), confirming the test exercises the real status-read path. I've already confirmed: test line 3 imports `{ ApiError }` from `../api/requestCore` (the class with `.status`), and the hook reads `(e as {status?}).status` structurally. The test rejects with `new ApiError(403, ...)` whose `.status === 403`. Real hook + real ApiError, only `sfcApi` mocked. The tests are genuin
... [+586 chars truncated]

### Assistant | 2026-06-22T14:23:10.551Z

[tool_use: Grep]

### User | 2026-06-22T14:23:14.206Z

[tool_result] 21:import { rateLimitMiddleware } from "../middleware/rateLimit.js";
26:import { createSfcRouter } from "./sfc.js";
139:  app.use("/api", rateLimitMiddleware("RL-API-GLOBAL", "global")); // Global rate limit
146:  app.use("/api/v1/sfc", createSfcRouter(callTool));

### Assistant | 2026-06-22T14:23:41.617Z

There is a global rate limiter (`rateLimitMiddleware`, index.ts:139) mounted on `/api` ahead of the SFC router. A rate-limit breach typically returns HTTP 429, not 403 — so the *daily-cap* semantics live in `requireTier` (403), and the rate-limiter is a separate concern (429). The FE keying on 403 for "daily limit" is consistent with where the daily cap actually lives (tierGate). A 429 (global burst limit) would fall to `ResultsDisplay`, not the upgrade notice — acceptable (a burst-limit is not an upgrade trigger). No issue there.

I have enough to render the verdict. Summary of the trace:

**Blast radius (clean):** `AsyncState` is a private interface re-declared inside each of the ~30 `use*.ts` hooks (confirmed via grep) — `useSfc.ts`'s copy is not shared, so adding `errorStatus` touches nothing else. The 7 `useSfc*` hooks all share `useApiCall`, so all get `errorStatus` uniformly and additively; only `SfcCalculatorPage.tsx` consumes any of them (`useSfcCalculate`). The return is `{...state, execute, reset}` — purely additive; no consumer destructures in a way the new field breaks.

**Status read (correct):** test + `sfc.ts` use the same `ApiError` class from `requestCore` (`.status:number`); `client.ts` re-exports that class so `envelopeGuard.ts` is the same class. The hook's structural `(e as {status?}).status` typeof-number guard is correct, AbortError returns early, non-ApiError → `null` → no false 403. Envelope-guard 200 path → `errorStatus:200` ≠ 403 → no false notice.

**Route/CTA exist:** `/pricing` registered (`App.tsx:215`), `Button variant="primary"` supported.

The one substantive defect is the 403-disambiguation gap.

VERDICT: FAIL

summary: The additive `errorStatus` change is clean (private per-hook `AsyncState`, purely additive return, only `SfcCalculatorPage` consumes it), the `ApiError` class is consistent across `requestCore`/`client`/`envelopeGuard`, the status read is type-safe with no false-403 path, and `/pricing` + `Button variant="primary"`
... [+2900 chars truncated]
