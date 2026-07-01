---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "Independent review of PRISM frontend unit QX-403: the SFC page now shows an upgr"
date: "2026-06-22"
first_ts: "2026-06-22T14:21:34.548Z"
last_ts: "2026-06-22T14:24:11.533Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 61
user_msgs: 26
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a873035b7e8580f1c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Independent review of PRISM frontend unit QX-403: the SFC page now shows an upgr

> **claude-code-cli** | 2026-06-22 | 61 msgs (26 user / 35 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-a873035b7e8580f1c.jsonl`

## Transcript

### User | 2026-06-22T14:21:34.548Z

Independent review of PRISM frontend unit QX-403: the SFC page now shows an upgrade notice when the speed_feed tier-gate returns 403 (free user over the 10/day cap). Files under H:/prism/mcp-server/web/src: api/sfc.ts, hooks/useSfc.ts, pages/SfcCalculatorPage.tsx, __tests__/useSfc.test.ts. Grade PASS/FAIL + P0/P1/P2 + file:line.

Weight toward: convention conformance, correctness the other arm may miss, and whether this is the right pattern.
1. CORRECTNESS of the 403 semantics: confirm that for the speed_feed gate a 403 truly means "over the free daily cap" (free tier HAS speed_feed=10/day per the entitlement matrix in data/pricing.ts) and NOT "feature not available" -- so the "Daily free limit reached, upgrade to Starter for unlimited" copy is accurate, not misleading. If a 403 could mean something else, flag it.
2. Why a bespoke inline notice instead of the QX1 <UpgradePrompt>? Verify the reasoning is sound: UpgradePrompt(feature) shows requiredPlanFor(feature); for sfc.basic that resolves to 'free' (free is included at 10/day), so UpgradePrompt would say "requires the Free plan" -- WRONG for a cap-exceed. Confirm the bespoke notice is justified, not laziness, and consider whether a reusable RateLimitNotice would be better (note as P2 if so).
3. CONVENTION (R11): the notice matches the UpgradePrompt amber/dark idiom + shared <Button> + h-11 tap target + Title Case CTA + ASCII-only.
4. DESIGN: dark theme, no inline hex/px where a token exists.
5. Did the change preserve the existing error/loading/results rendering for the non-403 path (ResultsDisplay still used)? No regression to the normal calc flow.
6. Tests: legitimacy (R9), no weakened assertions, no .skip/.only.

End with VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-22T14:21:38.365Z

I'll review the QX-403 frontend unit. Let me start by reading all the changed files end to end, plus the supporting files needed to verify the claims.

### Assistant | 2026-06-22T14:21:39.307Z

[tool_use: Read]

### Assistant | 2026-06-22T14:21:40.008Z

[tool_use: Read]

### User | 2026-06-22T14:21:40.215Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\sfc.ts' was already read 10s ago in this session and is unchanged (mtime 1782137863008). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T14:21:40.436Z

[tool_use: Read]

### User | 2026-06-22T14:21:40.571Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\hooks\useSfc.ts' was already read 10s ago in this session and is unchanged (mtime 1782137896529). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T14:21:40.600Z

[tool_use: Read]

### User | 2026-06-22T14:21:40.889Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\pages\SfcCalculatorPage.tsx' was already read 10s ago in this session and is unchanged (mtime 1782137941084). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-22T14:21:41.079Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\useSfc.test.ts' was already read 10s ago in this session and is unchanged (mtime 1782137994573). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-22T14:21:44.110Z

The read-once guard says these files were already read, but they are not actually in my context — this is a fresh agent thread. Let me disable the cache to read them.

### Assistant | 2026-06-22T14:21:45.052Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:21:46.098Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:21:46.931Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:21:47.581Z

[tool_use: Bash]

### User | 2026-06-22T14:21:53.389Z

[tool_result] import { getRequestHeaders } from "./client";
import { ApiError } from "./requestCore";
import { assertNoEnvelopeError } from "./envelopeGuard";
import type {
  SfcCalculateRequest, SfcCalculateResult,
  CycleTimeRequest, CycleTimeResult,
  EngagementRequest, EngagementResult,
  DeflectionRequest, DeflectionResult,
  PowerTorqueRequest, PowerTorqueResult,
  SurfaceFinishRequest, SurfaceFi
... [+2278 chars truncated]

### User | 2026-06-22T14:21:54.739Z

[tool_result] import { useCallback, useRef, useState } from "react";
import { sfcApi } from "../api/sfc";
import type { ApiError } from "../types/sfc";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** HTTP status of the last failure (e.g. 403 = over the free tier cap). */
  errorStatus: number | null;
}

function useApiCall<TReq, TRes>(
  apiFn: (params
... [+2065 chars truncated]

### User | 2026-06-22T14:21:55.349Z

[tool_result] import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
import OperationSelector from "../components/sfc/OperationSelector";
import SmartToolSelector from "../components/sfc/SmartToolSelector";
import SmartMachineSelector from "../components/sfc/SmartMachineS
... [+15577 chars truncated]

### User | 2026-06-22T14:21:56.087Z

[tool_result] import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ApiError } from '../api/requestCore';

// Control what the SFC API does; the hook's status-propagation runs for real.
const h = vi.hoisted(() => ({ mode: 'ok' as 'ok' | '403' | '500' }));

vi.mock('../api/sfc', () => ({
  sfcApi: {
    calculate: () => {
      if (h.mod
... [+1576 chars truncated]

### Assistant | 2026-06-22T14:21:59.300Z

I have the four core files. Now let me verify the supporting claims: the entitlement matrix in pricing.ts, the ApiError shape, the requestCore/types, the UpgradePrompt component, and the Button component conventions.

### Assistant | 2026-06-22T14:22:01.175Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:22:02.112Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:22:03.200Z

[tool_use: Bash]

### User | 2026-06-22T14:22:07.217Z

[tool_result] /**
 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
 *
 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
 * Anchored on the tested backend catalog:
 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
 *   - one-time post prices    -> StripeBillingEngine.ts:55 (POST_PROCE
... [+11977 chars truncated]

### User | 2026-06-22T14:22:07.327Z

[tool_result] export type ApiErrorKind = 'http' | 'timeout' | 'offline' | 'network' | 'parse' | 'unknown' | 'auth';

export type ApiErrorPresentation = {
  title: string;
  message: string;
  hint?: string;
  retryLabel: string;
};

type ApiErrorOptions = {
  kind?: ApiErrorKind;
  retryable?: boolean;
  hint?: string;
  cause?: unknown;
};

type FetchJsonOptions = {
  method?: string;
  headers?: HeadersInit;

... [+7980 chars truncated]

### User | 2026-06-22T14:22:08.377Z

[tool_result] H:/prism/mcp-server/web/src/components/entitlement/FeatureGate.tsx
H:/prism/mcp-server/web/src/components/entitlement/index.ts
H:/prism/mcp-server/web/src/components/entitlement/UpgradePrompt.tsx
=== UpgradePrompt ===
H:/prism/mcp-server/web/src/components/entitlement/UpgradePrompt.tsx

### Assistant | 2026-06-22T14:22:13.982Z

Now let me read the UpgradePrompt component and the entitlement index to verify claim 2 (why bespoke notice over `<UpgradePrompt>`), and check the Button component for convention conformance (variants, sizes, h-11).

### Assistant | 2026-06-22T14:22:15.401Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:22:16.357Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:22:17.421Z

[tool_use: Bash]

### User | 2026-06-22T14:22:23.022Z

[tool_result] /**
 * UpgradePrompt -- shown when a plan lacks a feature. Tells the user the
 * cheapest tier that unlocks it (or "coming soon" for a not-yet-live wave) and
 * routes them to /pricing or the billing portal. Pure presentation off the
 * canonical registry + entitlement rules; no fetch.
 */
import { useNavigate } from 'react-router-dom';
import { FEATURE_LABELS, PLAN_TIERS, formatPrice, type Featur
... [+3549 chars truncated]

### User | 2026-06-22T14:22:24.276Z

[tool_result] /**
 * FeatureGate -- renders children only if the live plan can use `feature`,
 * otherwise an UpgradePrompt (or a custom fallback). The single FE chokepoint
 * for plan-tier gating; pairs with the backend `requireTier` 403 (caught via
 * isEntitlementError) so a gate lands without 403-ing an anonymous caller.
 */
import type { ReactNode } from 'react';
import type { FeatureKey } from '../../data
... [+759 chars truncated]

### User | 2026-06-22T14:22:25.839Z

[tool_result] H:/prism/mcp-server/web/src/components/ui/Badge.tsx
H:/prism/mcp-server/web/src/components/ui/Button.tsx
H:/prism/mcp-server/web/src/components/ui/Card.tsx
H:/prism/mcp-server/web/src/components/ui/index.ts
H:/prism/mcp-server/web/src/components/ui/Input.tsx
H:/prism/mcp-server/web/src/components/ui/Modal.tsx
H:/prism/mcp-server/web/src/components/ui/Select.tsx
H:/prism/mcp-server/web/src/componen
... [+298 chars truncated]

### Assistant | 2026-06-22T14:22:30.049Z

The bespoke-notice justification (claim 2) is confirmed: `UpgradePrompt` derives copy from `requiredPlanFor(feature)`. Let me verify exactly what `requiredPlanFor('sfc.basic')` returns and confirm the `isEntitlementError` semantics. Then read the Button component for the `variant`/`size` props and `h-11` convention, and check the types/sfc.ts re-export of ApiError.

### Assistant | 2026-06-22T14:22:31.465Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:22:31.934Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:22:33.482Z

[tool_use: Bash]

### User | 2026-06-22T14:22:36.965Z

[tool_result] /**
 * Entitlement resolution -- pure FE logic bridging a user's live plan to the
 * canonical entitlement matrix (data/pricing.ts) and the backend 403 contract.
 *
 * Single source of truth for "can this plan use this feature right now":
 *   - the matrix (ENTITLEMENT_MATRIX) decides per-plan inclusion;
 *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
 *     deny at t
... [+3374 chars truncated]

### User | 2026-06-22T14:22:37.395Z

[tool_result] import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate
... [+1088 chars truncated]

### User | 2026-06-22T14:22:38.624Z

[tool_result] 112:export interface ApiError {
=== full type export check ===
112:export interface ApiError {

### Assistant | 2026-06-22T14:22:43.224Z

I now have everything to verify the key claims. There's an important detail to examine: the `useSfc.ts` hook imports `ApiError` as a **type** from `../types/sfc` (an interface), while the actual thrown error is the **class** `ApiError` from `../api/requestCore`. Let me look at the `types/sfc.ts` ApiError interface definition and confirm the status field is read correctly at runtime (the hook reads `.status` via duck-typing, not `instanceof`).

### Assistant | 2026-06-22T14:22:44.175Z

[tool_use: Read]

### User | 2026-06-22T14:22:45.016Z

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

### Assistant | 2026-06-22T14:22:45.586Z

[tool_use: Bash]

### Assistant | 2026-06-22T14:22:46.369Z

[tool_use: Bash]

### User | 2026-06-22T14:22:50.609Z

[tool_result] /**
 * Envelope-error guard for PRISM API clients.
 *
 * The HTTP transport (raw `fetch` / `fetchJson`) only treats `!response.ok`
 * as an error. But a `prism_*` dispatcher can return `200 OK` with a body
 * `{ error: "..." }` (a handled failure). Rendering that body as success is the
 * #1 documented regression class in this galaxy -- the "silent-zero"
 * (frontend-app/CLAUDE.md sections 2 + 5: 
... [+1878 chars truncated]

### User | 2026-06-22T14:22:56.117Z

[tool_result] [1m[46m RUN [49m[22m [36mv4.0.18 [39m[90mH:/PRISM/mcp-server/web[39m

 [32m✓[39m src/__tests__/useSfc.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 16[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m   Start at [22m 09:22:54
[2m   Duration [22m 867ms[2m (transform 61ms, setup 73ms
... [+51 chars truncated]

### Assistant | 2026-06-22T14:23:02.970Z

I now have everything needed to grade. Let me verify the two remaining details: whether the bespoke notice uses the `<Button>` with `variant="primary"` (it does, per the page source) and one subtle correctness check — the CTA label. The page uses `View Plans` and navigates to `/pricing`, matching UpgradePrompt's primary CTA. Let me also confirm whether `useEntitlement` could supply the live plan to make the notice account-aware, and confirm there's no `.skip/.only` and the test mode coverage.

The diff is clean against the spec. Let me do a final confirmation on the one nuance worth checking: whether a 403 from `/api/v1/sfc/calculate` could mean something other than "over the daily cap" for a paid user, and whether the copy is misleading in that case.

### Assistant | 2026-06-22T14:23:04.901Z

[tool_use: Grep]

### User | 2026-06-22T14:23:06.279Z

[tool_result] Found 20 files limit: 20
H:\prism\mcp-server\src\__tests__\automationChainSchema.test.ts
H:\prism\mcp-server\src\tools\dispatchers\quotingDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts
H:\prism\mcp-server\src\engines\MachineAwareSpeedFeedEngine.ts
H:\prism\mcp-server\src\engines\SpeedFeedAutopilotEngine.ts
H:\prism\mcp-server\src\__tests__\billing-license.test.ts
H:\prism
... [+809 chars truncated]

### Assistant | 2026-06-22T14:23:06.293Z

[tool_use: Grep]

### User | 2026-06-22T14:23:08.123Z

[tool_result] H:\prism\mcp-server\src\middleware\attachUserPlan.ts-27-    const overrides = userId ? entitlementOverrideStore.getOverrides(userId) : {};
H:\prism\mcp-server\src\middleware\attachUserPlan.ts-28-    // U-COMM-08: blanket GATED_FEATURES granted by an active perpetual license
H:\prism\mcp-server\src\middleware\attachUserPlan.ts:29:    // (e.g. sfc_perpetual -> "speed_feed"). requireTier grants on me
... [+2462 chars truncated]

### Assistant | 2026-06-22T14:23:12.245Z

Let me read the backend sfc route and tierGate middleware to confirm the exact 403 semantics — specifically whether a 403 on `/calculate` can only mean "over the daily cap" or whether it can also fire for an unauthorized/anonymous caller or other reasons.

### Assistant | 2026-06-22T14:23:13.132Z

[tool_use: Read]

### Assistant | 2026-06-22T14:23:13.622Z

[tool_use: Read]

### User | 2026-06-22T14:23:15.855Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\middleware\tierGate.ts' was already read 42s ago in this session and is unchanged (mtime 1782096678592). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T14:23:16.885Z

[tool_result] 1	/**
2	 * PRISM MCP Server — SFC (Speed & Feed Calculator) Routes
3	 * Consolidates existing SFC endpoints from index.ts into a proper router
4	 */
5	import { Router } from "express";
6	import { requireFields } from "../middleware/validation.js";
7	import { requireTier } from "../middleware/tierGate.js";
8	import { recordFeatureUse } from "../middleware/attachUserPlan.js";
9	import type { CallToo
... [+1194 chars truncated]

### Assistant | 2026-06-22T14:23:22.955Z

The read-once guard is again blocking a file not actually in my context. Let me read tierGate.ts via Bash to verify the exact conditions under which it returns 403 vs other statuses.

### Assistant | 2026-06-22T14:23:23.388Z

[tool_use: Bash]

### User | 2026-06-22T14:23:28.884Z

[tool_result] /**
 * PRISM MCP Server — Tier Gate Middleware
 * Enforces subscription plan feature limits on API endpoints.
 *
 * Spec (MIT 6.005 contract):
 *   - TIER_LIMITS is the single source of truth — exported for tests
 *   - checkTierAccess is a pure function (no side effects)
 *   - requireTier returns a standard Express middleware factory
 *   - 403 on blocked access with structured error bod
... [+8783 chars truncated]

### Assistant | 2026-06-22T14:24:11.533Z

I now have full verification of every claim. This is a critical finding for claim 1: the backend `requireTier("speed_feed")` returns 403 for **three distinct reasons**, not just "over the daily cap." Let me analyze this thoroughly.

The backend `requireTier("speed_feed")` (tierGate.ts:212-262) returns HTTP 403 with `error.message` set to one of:
1. **`ENTITLEMENT_REVOKED`** (tierGate.ts:222-231): an admin disabled `speed_feed` for this seat — `"Access to speed_feed has been disabled for your account by your administrator."`
2. **`TIER_LIMIT` / over the daily cap** (tierGate.ts:154, via checkTierAccess): `"Speed/feed limit reached (10/day). Upgrade to Starter or higher."`

The frontend bespoke notice (SfcCalculatorPage.tsx:303-317) hardcodes **"Daily free limit reached"** for **any** `errorStatus === 403`, discarding the `calc.error` message the hook already carries. So an admin-revoked seat would be told "Daily free limit reached, upgrade to Starter" — which is misleading and unactionable (upgrading the plan won't restore an admin-revoked feature).

I have everything needed. Final grade below.

---

VERDICT: FAIL

summary: The QX-403 wiring is well-built and mostly correct — `sfc.ts` preserves the HTTP status via `ApiError`, `useSfc.ts` propagates it through `errorStatus`, and the bespoke notice is genuinely justified over `<UpgradePrompt>` (which would mis-say "requires the Free plan" for a cap-exceed). Convention/design/test conformance is clean. But the notice hardcodes "Daily free limit reached" for EVERY 403, while the backend `requireTier("speed_feed")` returns 403 for at least two distinct reasons (daily cap AND admin entitlement-revoke), so a revoked seat gets misleading, unactionable copy — and the page throws away the accurate `calc.error` message the hook already carries.

findings:
- [P1] `H:/prism/mcp-server/web/src/pages/SfcCalculatorPage.tsx:303-317` -- The notice assumes `errorStatus === 403` always means "over the free daily cap," but the backend `r
... [+5524 chars truncated]
