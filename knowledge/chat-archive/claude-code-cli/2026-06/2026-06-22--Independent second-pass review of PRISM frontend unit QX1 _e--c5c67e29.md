---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "Independent second-pass review of PRISM frontend unit QX1 (entitlement gating ke"
date: "2026-06-22"
first_ts: "2026-06-22T12:46:01.204Z"
last_ts: "2026-06-22T12:49:58.524Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 78
user_msgs: 31
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-afcc7994885ce5d99.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Independent second-pass review of PRISM frontend unit QX1 (entitlement gating ke

> **claude-code-cli** | 2026-06-22 | 78 msgs (31 user / 47 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-afcc7994885ce5d99.jsonl`

## Transcript

### User | 2026-06-22T12:46:01.204Z

Independent second-pass review of PRISM frontend unit QX1 (entitlement gating keystone). Do NOT assume a prior reviewer caught everything. Read each file end-to-end. Weight your review toward: integration with already-built code, hidden coupling, convention conformance, security (entitlement bypass), and dedup (is this reinventing something already present?). Grade PASS or FAIL with P0/P1/P2 + file:line.

Files (under H:/prism/mcp-server/web/src): lib/entitlement.ts, hooks/useEntitlement.ts, components/entitlement/{UpgradePrompt.tsx,FeatureGate.tsx,index.ts}, __tests__/entitlement.test.ts, __tests__/FeatureGate.test.tsx.

Context: this is the FE monetization-enforcement keystone for product launch. The canonical pricing/entitlement registry is H:/prism/mcp-server/web/src/data/pricing.ts (already built). A per-seat entitlement ADMIN UI already shipped (components/admin/EntitlementsPanel.tsx, hooks/useAdmin.ts, api/admin.ts). The backend `requireTier` middleware (mcp-server/src/middleware/tierGate.ts) returns 403 on unentitled.

Check specifically:
1. DEDUP / R8: does this duplicate any existing FE entitlement helper? Grep the web/src for existing useEntitlement/FeatureGate/can()/planIncludes consumers. Is there an existing AuthContext plan concept it should integrate with instead of a new module cache? (contexts/AuthContext.tsx exposes useAuth + meetsMinClearance — clearance/role, NOT subscription plan. Confirm these are genuinely orthogonal and the new code does not conflict.)
2. SECURITY: any way a free/anonymous user gets a paid feature rendered? Consider: loading state flashing children, optimistic render, race between two gates, the module cache holding a stale higher plan after a downgrade (clearEntitlementCache coverage).
3. CONVENTION (R11): import style, file placement, naming, dark-theme Tailwind classes match sibling pages (PostProcessorStorePage.tsx, EntitlementsPanel.tsx). No inlined hex/px where a token class exists.
4. WIRING (R15): is the unit consuma
... [+347 chars truncated]

### Assistant | 2026-06-22T12:46:10.651Z

I'll review the entitlement gating keystone. Let me start by reading all the target files and the context files they integrate with.

### Assistant | 2026-06-22T12:46:11.123Z

[tool_use: Read]

### Assistant | 2026-06-22T12:46:11.595Z

[tool_use: Read]

### User | 2026-06-22T12:46:11.736Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\lib\entitlement.ts' was already read 22s ago in this session and is unchanged (mtime 1782132016387). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T12:46:12.465Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\hooks\useEntitlement.ts' was already read 23s ago in this session and is unchanged (mtime 1782132194386). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T12:46:12.547Z

[tool_use: Read]

### Assistant | 2026-06-22T12:46:13.012Z

[tool_use: Read]

### User | 2026-06-22T12:46:13.445Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\UpgradePrompt.tsx' was already read 23s ago in this session and is unchanged (mtime 1782132206729). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PR
... [+17 chars truncated]

### Assistant | 2026-06-22T12:46:13.486Z

[tool_use: Read]

### Assistant | 2026-06-22T12:46:13.953Z

[tool_use: Read]

### User | 2026-06-22T12:46:14.019Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\FeatureGate.tsx' was already read 23s ago in this session and is unchanged (mtime 1782132212362). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRIS
... [+15 chars truncated]

### Assistant | 2026-06-22T12:46:14.258Z

[tool_use: Read]

### User | 2026-06-22T12:46:14.873Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\index.ts' was already read 23s ago in this session and is unchanged (mtime 1782132216126). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-06-22T12:46:15.488Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\entitlement.test.ts' was already read 23s ago in this session and is unchanged (mtime 1782132121762). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-06-22T12:46:16.065Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\FeatureGate.test.tsx' was already read 24s ago in this session and is unchanged (mtime 1782132263674). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-22T12:46:20.506Z

The read-once guard says these files are already in my context, but I don't actually see their contents in my context — this appears to be a stale guard from a prior session. Let me disable the cache and read them.

### Assistant | 2026-06-22T12:46:20.978Z

[tool_use: Read]

### User | 2026-06-22T12:46:21.844Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\lib\entitlement.ts' was already read 32s ago in this session and is unchanged (mtime 1782132016387). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T12:46:22.074Z

[tool_use: Bash]

### User | 2026-06-22T12:46:29.042Z

[tool_result] /**
 * Entitlement resolution -- pure FE logic bridging a user's live plan to the
 * canonical entitlement matrix (data/pricing.ts) and the backend 403 contract.
 *
 * Single source of truth for "can this plan use this feature right now":
 *   - the matrix (ENTITLEMENT_MATRIX) decides per-plan inclusion;
 *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
 *     deny at t
... [+3374 chars truncated]

### Assistant | 2026-06-22T12:46:32.133Z

The bash cat works. Let me read the rest of the target files via cat, plus the integration/context files.

### Assistant | 2026-06-22T12:46:34.476Z

[tool_use: Bash]

### Assistant | 2026-06-22T12:46:35.597Z

[tool_use: Bash]

### User | 2026-06-22T12:46:39.049Z

[tool_result] ===== useEntitlement.ts =====
/**
 * useEntitlement -- supplies the signed-in user's live plan + a `can(feature)`
 * predicate built on the pure entitlement rules (lib/entitlement.ts).
 *
 * The plan comes from GET /billing/status (billingApi.getBillingStatus). It is
 * module-cached so N mounted gates do not each refetch; clearEntitlementCache()
 * after a successful checkout/plan change. A faile
... [+7993 chars truncated]

### User | 2026-06-22T12:46:40.107Z

[tool_result] ===== entitlement.test.ts =====
import { describe, it, expect } from 'vitest';
import {
  isFeatureKey,
  resolvePlan,
  isNotYetLive,
  notYetLiveNote,
  canUseFeature,
  requiredPlanFor,
  isAddonAt,
  entitlementAt,
  isEntitlementError,
  isAuthRequiredError,
} from '../lib/entitlement';
import { FEATURE_NOT_YET_LIVE } from '../data/pricing';
import { ApiError } from '../api/requestCore';

des
... [+9841 chars truncated]

### Assistant | 2026-06-22T12:46:43.392Z

Now let me read the canonical pricing registry and the integration points: pricing.ts, the billing API, requestCore (ApiError), AuthContext, and sibling pages for convention conformance.

### Assistant | 2026-06-22T12:46:44.369Z

[tool_use: Bash]

### Assistant | 2026-06-22T12:46:45.484Z

[tool_use: Bash]

### User | 2026-06-22T12:46:48.807Z

[tool_result] ===== pricing.ts =====
/**
 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
 *
 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
 * Anchored on the tested backend catalog:
 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
 *   - one-time post prices    -> StripeBillingE
... [+11839 chars truncated]

### User | 2026-06-22T12:46:50.210Z

[tool_result] ===== api/billing.ts =====
import { ApiError, getRequestHeaders } from './client';

/**
 * Billing API client.
 *
 * Backend routes (mcp-server/src/routes/billing.ts) return FLAT JSON
 * ({ url, sessionId } / status object) -- NOT the {result}-wrapped PrismResponse
 * shape. billingRequest returns the parsed body directly.
 */
const BILLING_BASE = '/api/v1/billing';

export interface BillingStatus
... [+11284 chars truncated]

### Assistant | 2026-06-22T12:46:54.285Z

I found a critical issue. The entitlement module imports `ApiError` from `'../api/requestCore'`, but `api/billing.ts` imports `ApiError` from `'./client'`. These may be two different `ApiError` classes. If they are, `isEntitlementError` (an `instanceof` check) would fail on the error actually thrown by the billing client. Let me verify whether `api/client.ts` re-exports the same `ApiError` from `requestCore`, or defines its own.

### Assistant | 2026-06-22T12:46:56.203Z

[tool_use: Bash]

### Assistant | 2026-06-22T12:46:57.103Z

[tool_use: Grep]

### User | 2026-06-22T12:46:58.384Z

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

### User | 2026-06-22T12:47:00.951Z

[tool_result] ===== api/client.ts (ApiError source check) =====
/**
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
  Instan
... [+1701 chars truncated]

### Assistant | 2026-06-22T12:47:04.614Z

Good — `api/client.ts` re-exports the same `ApiError` from `requestCore`, so the `instanceof` check is sound. The `ApiError` thrown by `billing.ts` (imported from `./client`) is the identical class that `entitlement.ts` imports from `../api/requestCore`. No mismatch there.

Now let me check the dedup concern (existing FE entitlement helpers / consumers), the AuthContext orthogonality, and sibling page conventions.

### Assistant | 2026-06-22T12:47:06.043Z

[tool_use: Grep]

### User | 2026-06-22T12:47:06.976Z

[tool_result] Found 9 files
src\__tests__\FeatureGate.test.tsx
src\components\entitlement\index.ts
src\components\entitlement\FeatureGate.tsx
src\components\entitlement\UpgradePrompt.tsx
src\hooks\useEntitlement.ts
src\__tests__\entitlement.test.ts
src\lib\entitlement.ts
src\__tests__\pricing.test.ts
src\data\pricing.ts

### Assistant | 2026-06-22T12:47:07.168Z

[tool_use: Bash]

### User | 2026-06-22T12:47:10.540Z

[tool_result] ===== AuthContext.tsx =====
/**
 * EMP-MS0 U-AUTH1: Authentication Context
 * Manages login/logout, token storage, clearance-based access,
 * 15-min session timeout for shared tablet security.
 */
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setApiKey } from '../api/client';

export type Clearan
... [+7094 chars truncated]

### Assistant | 2026-06-22T12:47:16.855Z

The AuthContext is confirmed orthogonal: it manages `clearance_level` (shop_floor/lead/hr_manager/admin = employee role/permission) and `meetsMinClearance`, which is RBAC, NOT subscription plan. The entitlement module is a genuinely separate concept (subscription tier). No conflict, no dedup violation. The only FE consumers of the new symbols are the new files themselves plus the pricing tests. This is a genuinely new keystone, not a reinvention.

Now let me verify the dedup concern fully and check the convention/sibling pages. Note: I see a possible coupling concern — `useEntitlement` reads plan from `/billing/status` while `AuthContext` reads token from localStorage. These two auth states could diverge. Let me check sibling page conventions and confirm `primary-600` Tailwind tokens exist.

### Assistant | 2026-06-22T12:47:18.653Z

[tool_use: Bash]

### Assistant | 2026-06-22T12:47:19.677Z

[tool_use: Grep]

### Assistant | 2026-06-22T12:47:20.089Z

[tool_use: Glob]

### User | 2026-06-22T12:47:20.709Z

[tool_result] No matches found

### User | 2026-06-22T12:47:22.220Z

[tool_result] No files found

### User | 2026-06-22T12:47:23.764Z

[tool_result] ===== EntitlementsPanel.tsx (admin sibling) =====
import { useCallback, useState } from "react";
import { Card, Button, Spinner, Badge } from "../ui";
import { useAdminEntitlements, useAdminSetEntitlement } from "../../hooks/useAdmin";
import { ENFORCEABLE_FEATURES } from "../../types/admin";

/**
 * Per-seat entitlement administration (Q6, FE for U-COMM-05).
 *
 * A shop admin sees each user's ef
... [+5635 chars truncated]

### Assistant | 2026-06-22T12:47:32.157Z

The admin sibling uses `primary`-free classes (slate/blue/amber/red via shared `ui` components). Let me confirm the `primary-600` token actually exists in the Tailwind config so the UpgradePrompt's "View Plans" button isn't an invisible/no-op color, and verify the PostProcessorStorePage convention. Let me find the actual tailwind config and check primary usage across the existing app.

### Assistant | 2026-06-22T12:47:32.822Z

[tool_use: Bash]

### User | 2026-06-22T12:47:36.435Z

[tool_result] tailwind.config.js
--- primary token search in config ---
--- existing bg-primary-600 usage in app ---
src/components/entitlement/UpgradePrompt.tsx
src/components/ErrorBoundary.tsx
src/components/ppg/AdvancedEnhancer.tsx
src/components/ppg/GcodeDiff.tsx
src/components/ppg/OperationBuilder.tsx
src/components/ppg/OptimizeDownload.tsx
src/components/ppg/TemplateBrowser.tsx
src/components/ppg/Validati
... [+90 chars truncated]

### Assistant | 2026-06-22T12:47:41.641Z

`bg-primary-600`/`bg-primary-500` is used widely across the existing app (ppg, sfc, ErrorBoundary), so the UpgradePrompt button class matches established convention. The grep on the config returned nothing for "primary" literally, which means it's likely defined via a CSS-variable/`@theme` or extended elsewhere. Since the token is used in dozens of shipped components, it resolves correctly. Let me confirm the tailwind config defines `primary` (possibly under `colors` with a different format) and check the PostProcessorStorePage sibling for the navigate/dark-theme convention.

### Assistant | 2026-06-22T12:47:43.365Z

[tool_use: Bash]

### User | 2026-06-22T12:47:47.864Z

[tool_result] === tailwind.config.js (colors section) ===
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        prism: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#
... [+1857 chars truncated]

### Assistant | 2026-06-22T12:47:52.073Z

This is a significant finding. The Tailwind config defines `prism` (50-900), `safety`, and `accent` color tokens — but there is NO `primary` color defined. So `bg-primary-600`, `bg-primary-700`, `bg-primary-500`, `text-primary` etc. do NOT resolve to any defined color in Tailwind. Let me confirm `primary` is truly undefined (check index.css for a `@theme`/`--color-primary` definition, and whether a `safelist` or plugin adds it), since the class is used across many existing components.

### Assistant | 2026-06-22T12:47:54.614Z

[tool_use: Bash]

### User | 2026-06-22T12:47:59.626Z

[tool_result] === primary refs in index.css ===
47:     `text-accent-fg`. In studio mode it keeps the cyan primary button visually
3845:/* Cyan → Blue (file I/O, primary actions) */
=== primary refs in design-system.ts ===
15:  primary: {
56:    primary: '#e2e8f0',
168:  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
=== count of bg-primary usage across app ===
32
=== tailwind version ===
3.4.17

### Assistant | 2026-06-22T12:48:08.326Z

Confirmed. Tailwind 3.4.17 with a config that defines `prism`, `safety`, `accent` — but no `primary`. The `design-system.ts` even shows the canonical primary button is `bg-blue-600 hover:bg-blue-700`, not `bg-primary-600`. So `bg-primary-600` is an undefined utility class. In Tailwind 3, an undefined color utility simply produces NO CSS rule — the "View Plans" button would render with no background color (transparent), making the primary CTA nearly invisible (white text on a transparent/inherited background).

However, this same broken class appears in 32 existing files. This is a pre-existing app-wide pattern, not introduced by this unit. Per R11, the new code is *matching* a (broken) sibling convention. But this is the monetization-conversion CTA — the most important button in the keystone. Let me verify the actual rendering behavior: does Tailwind 3.4 emit anything for `bg-primary-600`, and is there a safelist or content-scan that could pick up a `primary` from elsewhere. Let me also check what PostProcessorStorePage (a named sibling) actually uses for its primary CTA.

### Assistant | 2026-06-22T12:48:10.479Z

[tool_use: Bash]

### User | 2026-06-22T12:48:15.110Z

[tool_result] === safelist in config? ===
=== PostProcessorStorePage primary CTA classes ===
189:            className="ml-4 flex-shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
208:            className="ml-4 flex-shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-pr
... [+402 chars truncated]

### Assistant | 2026-06-22T12:48:22.343Z

This is the key resolution: the named sibling `PostProcessorStorePage.tsx` — explicitly cited as the convention reference — uses the **exact same** `bg-primary-600 ... hover:bg-primary-700 ... dark:bg-primary-500 dark:hover:bg-primary-600` classes for its primary CTA buttons. So the UpgradePrompt is a faithful clone-don't-fork of the sibling convention (R11 satisfied perfectly). Whether `primary` resolves is a pre-existing, app-wide question that is NOT in this unit's scope — and given 32 files (including the most prominent store/checkout pages) ship it, either the token resolves via some mechanism I should verify, or it's a pre-existing app-wide cosmetic debt that this unit correctly inherits rather than forking.

Let me do one final verification: actually compile the class with the project's Tailwind to see if `bg-primary-600` produces output (this determines P-level). And confirm there's no plugin/preset adding `primary`.

### Assistant | 2026-06-22T12:48:26.371Z

[tool_use: Bash]

### User | 2026-06-22T12:48:32.436Z

[tool_result] === any preset/plugin referencing primary in node_modules-config? ===
56:  plugins: [],

=== test compile bg-primary-600 ===
--- primary-600 in output? ---
0
--- prism-600 in output (control) ---
1
--- blue-600 in output (control) ---
1

### Assistant | 2026-06-22T12:48:40.436Z

Definitively confirmed via compile probe: under the project's own Tailwind config, `bg-primary-600` emits **zero** CSS (count 0), while the controls `bg-prism-600` and `bg-blue-600` both emit (count 1 each). So `bg-primary-600 / hover:bg-primary-700 / dark:bg-primary-500` produce no rules — the "View Plans" CTA renders with no background fill (white bold text on transparent/inherited background).

But this is a **pre-existing app-wide issue** affecting 32 files including the named sibling `PostProcessorStorePage.tsx`. The new UpgradePrompt is an exact clone of that sibling's CTA classes (R11 conformance is correct). So this is NOT a regression introduced by QX1 — it inherits existing debt faithfully. I'll flag it as P2 (deferrable, pre-existing, fix app-wide) rather than P0/P1, since failing this unit for matching its cited reference would be wrong.

Now let me close the remaining checks: the security-critical loading-flash / stale-cache-after-downgrade paths, and one coupling concern (the optional `authenticated` field and 401 vs 403 handling in the gate). Let me verify the `getBillingStatus` contract — does the backend return `plan: 'free'` for an anonymous user, or 401? And does `useEntitlement`'s cache survive a downgrade.

### Assistant | 2026-06-22T12:48:42.325Z

[tool_use: Bash]

### Assistant | 2026-06-22T12:48:43.338Z

[tool_use: Grep]

### User | 2026-06-22T12:48:44.322Z

[tool_result] src\hooks\useCoordination.ts:74:    refresh();
src\hooks\useEntitlement.ts:6: * module-cached so N mounted gates do not each refetch; clearEntitlementCache()
src\hooks\useEntitlement.ts:51:export function clearEntitlementCache(): void {
src\hooks\useLearningCourseRegistry.ts:91:    void refresh();
src\__tests__\FeatureGate.test.tsx:6:import { clearEntitlementCache } from '../hooks/useEntitlement';
... [+3011 chars truncated]

### User | 2026-06-22T12:48:46.619Z

[tool_result] === backend /billing/status route ===
9: *   GET  /api/v1/billing/status            -- get user's subscription status
27:const VALID_PLANS: readonly Plan[] = ["free", "starter", "pro", "shop", "enterprise"];
42:      const plan = data?.plan as Plan | undefined;
43:      if (!userId || !plan || !VALID_PLANS.includes(plan)) {
44:        return { applied: false, reason: "missing userId/plan in checko
... [+1658 chars truncated]

### Assistant | 2026-06-22T12:48:50.616Z

I have enough to assess the security paths. Let me verify the backend `/status` route's anonymous behavior (does it 401 or return `free`) to confirm the gate's deny-by-default is sound for anonymous users.

### Assistant | 2026-06-22T12:48:52.448Z

[tool_use: Bash]

### User | 2026-06-22T12:48:57.045Z

[tool_result] === /status handler body ===
9: *   GET  /api/v1/billing/status            -- get user's subscription status
266:  // GET /status -- get user's current subscription status
269:    "/status",
--- full status route ---
 *   GET  /api/v1/billing/status            -- get user's subscription status
 *   POST /api/v1/billing/purchase-post     -- purchase/subscribe to post-processor
 */
import express, {
... [+1990 chars truncated]

### Assistant | 2026-06-22T12:49:06.910Z

This closes the security analysis. The backend `/status` uses `optionalToken` and returns `plan: 'free', authenticated: false` for anonymous callers (never 401). So:

- Anonymous user -> `getBillingStatus()` resolves `{plan:'free', authenticated:false}` -> `resolvePlan('free')='free'` -> `canUseFeature` returns false for any paid feature -> gate shows UpgradePrompt. **No bypass.** Correct.
- Loading flash: `FeatureGate` returns `loadingFallback` (default `null`) while `loading===true`, and `can()` returns false until `snapshot` is set. Children are NEVER rendered before the plan resolves. **No flash of paid content.** Correct.
- Load error: `catch` leaves `snapshot` null, `can()` returns false. **Deny-by-default.** Correct.
- Stale-cache-after-downgrade: `clearEntitlementCache()` exists and is exported; the SubscriptionStore downgrades to free on cancel/past_due server-side. The FE cache is module-level — a downgrade in another tab/session would NOT auto-invalidate this tab's cache until `clearEntitlementCache()` is called or the page reloads. This is a real but bounded coupling concern (the FE is advisory; the backend 403 is the true enforcement). I'll note it as P2.

Let me complete two final checks: (1) confirm there's no `.skip`/`.only` and the tests reference real matrix values (R9), and (2) confirm the barrel export covers what QX2/route-403 handling needs (`isEntitlementError`, `isAuthRequiredError`, `useEntitlement`, `clearEntitlementCache` — note the barrel only re-exports the components, not the lib helpers).

### Assistant | 2026-06-22T12:49:10.161Z

[tool_use: Bash]

### User | 2026-06-22T12:49:15.338Z

[tool_result] === .skip / .only / xit / fit in entitlement tests ===
NONE FOUND (clean)

=== barrel exports (index.ts) -- does it surface lib helpers + hook? ===
export { FeatureGate, type FeatureGateProps } from './FeatureGate';
export { UpgradePrompt, type UpgradePromptProps } from './UpgradePrompt';

=== run the two test files ===
      at Object.invoke (file:///H:/PRISM/mcp-server/web/node_modules/vite/dist
... [+2070 chars truncated]

### Assistant | 2026-06-22T12:49:18.438Z

The `--reporter=basic` flag is unsupported in this vitest version (the error is a reporter-load failure, not a test failure). Let me re-run with the default reporter.

### Assistant | 2026-06-22T12:49:19.339Z

[tool_use: Bash]

### User | 2026-06-22T12:49:25.252Z

[tool_result] [1m[46m RUN [49m[22m [36mv4.0.18 [39m[90mH:/PRISM/mcp-server/web[39m

 [32m✓[39m src/__tests__/entitlement.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/__tests__/FeatureGate.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[32m 114[2mms[22m[39m

[2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m24 passe
... [+171 chars truncated]

### Assistant | 2026-06-22T12:49:58.524Z

All 24 tests pass (18 unit + 6 component). The earlier "test_timeout" triage hook fired on the prior reporter-crash run, not a real timeout — confirmed false alarm.

Let me do a final review of the test integrity (R9) against the matrix, and assess the barrel-export gap for QX2 consumability. The tests assert real matrix-derived values (e.g. `entitlementAt('post.generate','shop')===5` matches `ENTITLEMENT_MATRIX['post.generate'].shop=5`; `requiredPlanFor('sfc.calibration')==='pro'` matches the matrix where calibration is `false` until `pro:true`). These are genuine intent-encoding asserts that would fail if the matrix logic broke — not stubs. They span 5 plans (free/starter/pro/shop/enterprise) plus adversarial inputs (null/undefined/42/`{}`/case-sensitivity/non-ApiError 403-shaped object). R9 satisfied.

I have completed end-to-end review of all target files plus their integration surfaces. Here is my verdict.

---

VERDICT: FAIL

summary: The entitlement keystone is logically sound and secure — anonymous/free/error/loading paths all deny-by-default with no flash-of-paid-content, the `ApiError` `instanceof` 403/401 contract is verified consistent across `api/client.ts` → `requestCore.ts`, AuthContext (clearance/RBAC) is genuinely orthogonal to subscription plan (no dedup violation), and all 24 tests pass with real matrix-derived, multi-plan, adversarial assertions (R9 met, no `.skip`/`.only`). It FAILS only on one P1 wiring gap that blocks the stated QX2/route-403 consumers from using the barrel as-is, plus deferrable P2s.

findings:

- [P1] `H:/prism/mcp-server/web/src/components/entitlement/index.ts:1-2` — The barrel exports ONLY the two components (`FeatureGate`, `UpgradePrompt`). The task says QX2 (SfcCalculatorPage gating) and per-route 403 handling must consume this unit "as-is", but the symbols those consumers need — `isEntitlementError` / `isAuthRequiredError` (from `lib/entitlement.ts`) and `useEntitlement` / `clearEntitlementCache` (from `hooks/useEntitle
... [+3962 chars truncated]
