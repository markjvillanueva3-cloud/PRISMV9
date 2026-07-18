---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "Review PRISM frontend unit QX1 (entitlement keystone) for correctness, silent br"
date: "2026-06-22"
first_ts: "2026-06-22T12:45:42.693Z"
last_ts: "2026-06-22T12:48:57.488Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 80
user_msgs: 33
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-ab313f78b6ac22921.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Review PRISM frontend unit QX1 (entitlement keystone) for correctness, silent br

> **claude-code-cli** | 2026-06-22 | 80 msgs (33 user / 47 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/agent-ab313f78b6ac22921.jsonl`

## Transcript

### User | 2026-06-22T12:45:42.693Z

Review PRISM frontend unit QX1 (entitlement keystone) for correctness, silent breakage, and integration coupling. Read each file end-to-end. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations.

Files (all under H:/prism/mcp-server/web/src):
- lib/entitlement.ts  (pure rules)
- hooks/useEntitlement.ts  (live-plan fetch + module cache)
- components/entitlement/UpgradePrompt.tsx
- components/entitlement/FeatureGate.tsx
- components/entitlement/index.ts
- __tests__/entitlement.test.ts  (18 cases)
- __tests__/FeatureGate.test.tsx  (6 cases)

Contract to verify against:
- The canonical entitlement model lives in H:/prism/mcp-server/web/src/data/pricing.ts: `ENTITLEMENT_MATRIX`, `entitlementFor`, `planIncludes`, `FEATURE_NOT_YET_LIVE`, `PLAN_ORDER`, `PLAN_TIERS`, types `PlanId`/`FeatureKey`/`Entitlement`. Confirm the new code uses these correctly and does NOT re-derive or hardcode entitlement values (no inlined matrix).
- ApiError shape: H:/prism/mcp-server/web/src/api/requestCore.ts (class with `.status`). billingApi.getBillingStatus() returns `{ plan: string, authenticated?: boolean }` (H:/prism/mcp-server/web/src/api/billing.ts).
- Backend contract: `requireTier` middleware returns HTTP 403 when signed-in-but-unentitled, 401 when not signed in.

Specifically check (be adversarial):
1. DENY-BY-DEFAULT: does an unknown plan, a failed plan load, or a null snapshot ever GRANT a paid feature? (resolvePlan unknown->free; hook catch leaves snapshot null -> can()=false.) Any path that leaks paid access on error is a P0.
2. NOT-YET-LIVE (quoting/erp): canUseFeature must deny on EVERY plan incl enterprise; UpgradePrompt must show "coming soon" not an upgrade CTA. Verify.
3. ADDON semantics: canUseFeature treats 'addon' as plan-permitted (true) and relies on backend 403 for the actual purchase. Is that a defensible layering or a leak? Flag if it could let an un-purchased addon feature render.
4. React hook correctness: stale closures, the `mounted` ref logic, the mo
... [+594 chars truncated]

### Assistant | 2026-06-22T12:45:47.548Z

I'll review PRISM frontend unit QX1 (entitlement keystone). Let me start by reading the contract files and the new code in parallel.

### Assistant | 2026-06-22T12:45:48.028Z

[tool_use: Read]

### Assistant | 2026-06-22T12:45:48.538Z

[tool_use: Read]

### Assistant | 2026-06-22T12:45:48.996Z

[tool_use: Read]

### User | 2026-06-22T12:45:49.074Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\data\pricing.ts' was already read 8m ago in this session and is unchanged (mtime 1782007516670). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T12:45:49.654Z

[tool_result] 1	/**
2	 * Entitlement resolution -- pure FE logic bridging a user's live plan to the
3	 * canonical entitlement matrix (data/pricing.ts) and the backend 403 contract.
4	 *
5	 * Single source of truth for "can this plan use this feature right now":
6	 *   - the matrix (ENTITLEMENT_MATRIX) decides per-plan inclusion;
7	 *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
8	
... [+3663 chars truncated]

### Assistant | 2026-06-22T12:45:49.920Z

[tool_use: Read]

### User | 2026-06-22T12:45:49.939Z

[tool_result] 1	/**
2	 * useEntitlement -- supplies the signed-in user's live plan + a `can(feature)`
3	 * predicate built on the pure entitlement rules (lib/entitlement.ts).
4	 *
5	 * The plan comes from GET /billing/status (billingApi.getBillingStatus). It is
6	 * module-cached so N mounted gates do not each refetch; clearEntitlementCache()
7	 * after a successful checkout/plan change. A failed load leaves th
... [+3745 chars truncated]

### Assistant | 2026-06-22T12:45:50.378Z

[tool_use: Read]

### User | 2026-06-22T12:45:50.811Z

[tool_result] 1	/**
2	 * UpgradePrompt -- shown when a plan lacks a feature. Tells the user the
3	 * cheapest tier that unlocks it (or "coming soon" for a not-yet-live wave) and
4	 * routes them to /pricing or the billing portal. Pure presentation off the
5	 * canonical registry + entitlement rules; no fetch.
6	 */
7	import { useNavigate } from 'react-router-dom';
8	import { FEATURE_LABELS, PLAN_TIERS, formatPr
... [+3056 chars truncated]

### Assistant | 2026-06-22T12:45:50.858Z

[tool_use: Read]

### Assistant | 2026-06-22T12:45:51.323Z

[tool_use: Read]

### User | 2026-06-22T12:45:51.391Z

[tool_result] 1	/**
2	 * FeatureGate -- renders children only if the live plan can use `feature`,
3	 * otherwise an UpgradePrompt (or a custom fallback). The single FE chokepoint
4	 * for plan-tier gating; pairs with the backend `requireTier` 403 (caught via
5	 * isEntitlementError) so a gate lands without 403-ing an anonymous caller.
6	 */
7	import type { ReactNode } from 'react';
8	import type { FeatureKey } 
... [+847 chars truncated]

### Assistant | 2026-06-22T12:45:51.809Z

[tool_use: Read]

### User | 2026-06-22T12:45:51.967Z

[tool_result] 1	export { FeatureGate, type FeatureGateProps } from './FeatureGate';
2	export { UpgradePrompt, type UpgradePromptProps } from './UpgradePrompt';
3	

### Assistant | 2026-06-22T12:45:52.260Z

[tool_use: Read]

### Assistant | 2026-06-22T12:45:52.740Z

[tool_use: Read]

### User | 2026-06-22T12:45:53.005Z

[tool_result] 1	import { describe, it, expect } from 'vitest';
2	import {
3	  isFeatureKey,
4	  resolvePlan,
5	  isNotYetLive,
6	  notYetLiveNote,
7	  canUseFeature,
8	  requiredPlanFor,
9	  isAddonAt,
10	  entitlementAt,
11	  isEntitlementError,
12	  isAuthRequiredError,
13	} from '../lib/entitlement';
14	import { FEATURE_NOT_YET_LIVE } from '../data/pricing';
15	import { ApiError } from '../api/requestCore';

... [+6931 chars truncated]

### Assistant | 2026-06-22T12:45:53.114Z

[tool_use: Read]

### User | 2026-06-22T12:45:53.459Z

[tool_result] 1	import { describe, it, expect, vi, beforeEach } from 'vitest';
2	import { render, screen, waitFor } from '@testing-library/react';
3	import { MemoryRouter } from 'react-router-dom';
4	import type { ReactNode } from 'react';
5	import { FeatureGate } from '../components/entitlement';
6	import { clearEntitlementCache } from '../hooks/useEntitlement';
7	import type { FeatureKey } from '../data/prici
... [+3167 chars truncated]

### User | 2026-06-22T12:45:53.481Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\requestCore.ts' was already read 7m ago in this session and is unchanged (mtime 1779923141812). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T12:45:53.657Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\billing.ts' was already read 10m ago in this session and is unchanged (mtime 1782011753789). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T12:45:54.146Z

[tool_result] 1	# PRISM Web Frontend — Development Rules
2	
3	> ## ⚑ FLEET DESIGN LANGUAGE = iOS (2026-06-09 — supersedes the "Calculator Studio" DEFAULT below)
4	> **Operator decision 2026-06-09.** The fleet shell moves to an **Apple-iOS feel**.
5	> Authoritative doctrine + token foundation: **`DESIGN.md` §⚑ FLEET DESIGN LANGUAGE = iOS**
6	> and `state/shared/specs/FLEET-IOS-REDESIGN-DOCTRINE-2026-06-09.md`. D
... [+12516 chars truncated]

### Assistant | 2026-06-22T12:45:58.512Z

I have the new code. The contract files (pricing.ts, requestCore.ts, billing.ts) were read earlier this session but their content isn't in my context now. Let me read them to verify the contract precisely.

### Assistant | 2026-06-22T12:45:59.646Z

[tool_use: Read]

### Assistant | 2026-06-22T12:45:59.818Z

[tool_use: Read]

### Assistant | 2026-06-22T12:45:59.890Z

[tool_use: Read]

### User | 2026-06-22T12:46:00.172Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\data\pricing.ts' was already read 8m ago in this session and is unchanged (mtime 1782007516670). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T12:46:00.486Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\requestCore.ts' was already read 8m ago in this session and is unchanged (mtime 1779923141812). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T12:46:00.675Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\billing.ts' was already read 10m ago in this session and is unchanged (mtime 1782011753789). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T12:46:04.004Z

The read-once guard is blocking me, but the content is NOT actually in my context (the guard is a heuristic). I must verify the contract — I cannot assert based on unread files. Let me bypass the cache to get the actual contract definitions.

### Assistant | 2026-06-22T12:46:04.954Z

[tool_use: Read]

### User | 2026-06-22T12:46:05.819Z

[tool_result] 1	/**
2	 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
3	 *
4	 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
5	 * Anchored on the tested backend catalog:
6	 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
7	 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
8	 *   - one-time post prices    -> StripeBillingEngine.t
... [+12973 chars truncated]

### Assistant | 2026-06-22T12:46:05.905Z

[tool_use: Bash]

### Assistant | 2026-06-22T12:46:06.506Z

[tool_use: Bash]

### User | 2026-06-22T12:46:12.527Z

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

### User | 2026-06-22T12:46:14.418Z

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

... [+2844 chars truncated]

### Assistant | 2026-06-22T12:46:21.465Z

Now I have the full contract. I found a critical discrepancy. Let me verify two key contract mismatches.

**Discrepancy 1 — billing import:** `billing.ts` imports `{ ApiError, getRequestHeaders } from './client'`, NOT from `./requestCore`. The entitlement code imports `ApiError` from `../api/requestCore`. If these are two DIFFERENT `ApiError` classes, then `isEntitlementError(err)` (instanceof check against requestCore's ApiError) would FAIL for a 403 thrown by `billingApi`, which throws `client`'s ApiError. This is a potential P0 instanceof mismatch. Let me check `client.ts`.

**Discrepancy 2 — `getBillingStatus` return type:** the contract said `{ plan: string, authenticated?: boolean }`, but the actual `BillingStatusResult` has `plan: string` and `authenticated?: boolean` plus other fields — that part is fine.

Let me verify the `ApiError` source in `client.ts`.

### Assistant | 2026-06-22T12:46:21.597Z

[tool_use: Read]

### User | 2026-06-22T12:46:22.125Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\client.ts' was already read 9m ago in this session and is unchanged (mtime 1779921987741). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T12:46:26.043Z

Cache guard again — content not in my context. Let me grep for the ApiError export/re-export in client.ts to verify whether it's the same class.

### Assistant | 2026-06-22T12:46:27.102Z

[tool_use: Grep]

### User | 2026-06-22T12:46:30.539Z

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

### Assistant | 2026-06-22T12:46:35.022Z

`client.ts` re-exports `ApiError` (lines 19-31 are an import-then-re-export block). Let me confirm it imports from `requestCore` (so it's the SAME class) rather than defining its own.

### Assistant | 2026-06-22T12:46:35.666Z

[tool_use: Read]

### User | 2026-06-22T12:46:36.709Z

[tool_result] 1	/**
2	 * PRISM API Client
3	 * Connects to F7 Bridge REST endpoints with API key authentication.
4	 * All responses follow the standard format:
5	 *   { result, safety: { score, warnings }, meta: { formula_used, uncertainty } }
6	 */
7	
8	import type {
9	  DataResponse,
10	  InstantQuoteHistory,
11	  InstantQuoteStatus,
12	  InstantQuoteLeadTimeOption,
13	  InstantQuoteQuantityBreak,
14	  Instan
... [+520 chars truncated]

### Assistant | 2026-06-22T12:46:47.716Z

Confirmed: `client.ts` imports `ApiError` from `./requestCore` (line 18-22) and re-exports it (line 24-32). So `billing.ts`'s `ApiError` (from `./client`) IS the same class as the entitlement code's `ApiError` (from `../api/requestCore`). The instanceof check is sound. **Discrepancy 1 is NOT a bug.** Good — verified rather than assumed.

Now let me trace the consumers of the new entitlement code to check for silent integration breakage, and confirm `FEATURE_LABELS` and `PLAN_TIERS` usage in UpgradePrompt against the actual exports.

### Assistant | 2026-06-22T12:46:49.610Z

[tool_use: Grep]

### Assistant | 2026-06-22T12:46:50.341Z

[tool_use: Grep]

### User | 2026-06-22T12:46:50.646Z

[tool_result] src\lib\entitlement.ts:10: *     is called without entitlement (401 = not signed in) -- isEntitlementError
src\lib\entitlement.ts:11: *     lets a page turn that 403 into an UpgradePrompt instead of a raw error.
src\lib\entitlement.ts:14: * (hooks/useEntitlement.ts) supplies the live plan; the components
src\lib\entitlement.ts:60:export function canUseFeature(feature: FeatureKey, plan: PlanId): bo
... [+7517 chars truncated]

### User | 2026-06-22T12:46:51.274Z

[tool_result] No matches found

### Assistant | 2026-06-22T12:46:57.431Z

Two important findings emerging:

1. **No consumers yet** — `FeatureGate`/`useEntitlement`/`UpgradePrompt` are not yet wired into any page (only the index.ts barrel and tests reference them). This is a keystone unit; orphan-status is expected for a foundation piece, not a silent break. Noting as context, not a finding.

2. **`bg-primary-600`/`primary-700`/`primary-500` produced NO matches in `index.css`.** The UpgradePrompt's "View Plans" button (line 66) uses `bg-primary-600 hover:bg-primary-700 dark:bg-primary-500`. If `primary-*` is not a defined Tailwind color/token, the primary CTA button would render with NO background color — a silent visual break (invisible/transparent button). Let me verify whether `primary` is defined in the Tailwind config or index.css.

### Assistant | 2026-06-22T12:46:59.311Z

[tool_use: Grep]

### Assistant | 2026-06-22T12:46:59.813Z

[tool_use: Glob]

### Assistant | 2026-06-22T12:47:00.752Z

[tool_use: Grep]

### User | 2026-06-22T12:47:01.349Z

[tool_result] Found 1 file
src\index.css

### User | 2026-06-22T12:47:02.349Z

[tool_result] Found 27 files
src\components\entitlement\UpgradePrompt.tsx
src\pages\PostProcessorStorePage.tsx
src\components\sfc\SmartMachineSelector.tsx
src\pages\SettingsPage.tsx
src\components\sfc\AdvancedCharts.tsx
src\pages\PpgPage.tsx
src\pages\SfcCalculatorPage.tsx
src\components\shared\ExportButton.tsx
src\components\ErrorBoundary.tsx
src\components\ppg\AdvancedEnhancer.tsx
src\components\ppg\Controlle
... [+594 chars truncated]

### User | 2026-06-22T12:47:02.680Z

[tool_result] No files found

### Assistant | 2026-06-22T12:47:08.904Z

`bg-primary-*` is used in 27 files across the existing frontend (including `ui/Button.tsx`, multiple pages). This means `primary` IS an established Tailwind color in this app — the UpgradePrompt is correctly conforming to the existing convention (R11). My earlier concern that `primary-*` is undefined is wrong: it's defined somewhere in the Tailwind config (likely `@theme` in index.css or a config not matching my glob). The CTA button is consistent with the rest of the app. **Not a finding.** Let me confirm where `primary` is defined to be certain, and check the `index.css` for the token definition.

### Assistant | 2026-06-22T12:47:10.322Z

[tool_use: Grep]

### User | 2026-06-22T12:47:11.350Z

[tool_result] No matches found

### Assistant | 2026-06-22T12:47:11.512Z

[tool_use: Grep]

### User | 2026-06-22T12:47:12.833Z

[tool_result] 47:     `text-accent-fg`. In studio mode it keeps the cyan primary button visually
3845:/* Cyan → Blue (file I/O, primary actions) */

### Assistant | 2026-06-22T12:47:17.390Z

`primary` is not defined as a color token in index.css — it's a Tailwind config color (the config file likely lives at the web root and wasn't matched by my glob; 27 files use `bg-primary-*` including the shared `Button.tsx`, so it resolves at build time). The UpgradePrompt follows the established app-wide convention. This is conformance, not a violation. Let me confirm the tailwind config exists and defines `primary`, to be fully verified rather than inferring.

### Assistant | 2026-06-22T12:47:18.830Z

[tool_use: Bash]

### User | 2026-06-22T12:47:25.081Z

[tool_result] tailwind.config.js
---grep primary in config---
---postcss/vite theme---

### Assistant | 2026-06-22T12:47:28.435Z

`tailwind.config.js` exists at web root but `primary` is not literally in it — meaning `primary` is likely defined via the default Tailwind palette extension or a preset. Let me read the config to confirm `primary` resolves (this determines whether the CTA button has a real background).

### Assistant | 2026-06-22T12:47:28.730Z

[tool_use: Read]

### User | 2026-06-22T12:47:29.583Z

[tool_result] 1	/** @type {import('tailwindcss').Config} */
2	export default {
3	  content: ['./index.html', './src/**/*.{ts,tsx}'],
4	  theme: {
5	    extend: {
6	      colors: {
7	        prism: {
8	          50: '#f0f4ff',
9	          100: '#dbe4ff',
10	          200: '#bac8ff',
11	          300: '#91a7ff',
12	          400: '#748ffc',
13	          500: '#5c7cfa',
14	          600: '#4c6ef5',
15	          70
... [+1835 chars truncated]

### Assistant | 2026-06-22T12:47:37.856Z

This is a confirmed finding. The Tailwind config defines `prism`, `safety`, `accent`, `accent-fg` colors — but **NO `primary` color**. Tailwind's default palette does NOT include a `primary` color (Tailwind's defaults are `slate`, `gray`, `blue`, `indigo`, etc., never `primary`). 

Therefore `bg-primary-600`, `hover:bg-primary-700`, `dark:bg-primary-500`, `dark:hover:bg-primary-600` on the UpgradePrompt's primary "View Plans" CTA (line 66) resolve to **nothing** — Tailwind emits no rule for an undefined color. The button renders with no background fill (transparent), white text on whatever sits behind it. This is a silent visual break of the keystone upgrade CTA.

But wait — 27 existing files use `bg-primary-*` too. If `primary` were truly undefined, the whole app's primary buttons would be broken, which is implausible for a shipped app. Two possibilities: (a) there's a Tailwind v4 `@theme` block in index.css defining `primary` (the `accent` comment mentions CSS-var foundation), or (b) the app genuinely has broken primary buttons everywhere. Let me settle this definitively by checking for a `@theme`/`--color-primary` definition or a Tailwind v4 setup, and confirm the Tailwind version.

### Assistant | 2026-06-22T12:47:40.171Z

[tool_use: Bash]

### User | 2026-06-22T12:47:44.072Z

[tool_result] === tailwind version ===
    "tailwindcss": "3.4.17",
=== @theme / @import tailwind in index.css ===
1:@tailwind base;
2:@tailwind components;
3:@tailwind utilities;
=== any primary color def anywhere in css ===

### Assistant | 2026-06-22T12:47:55.851Z

Definitive. **Tailwind v3.4.17** with classic `@tailwind base/components/utilities` directives (no v4 `@theme`). Colors come ONLY from `tailwind.config.js`, which defines `prism`/`safety`/`accent`/`accent-fg` but **NO `primary`**. There is no `--color-primary` anywhere in CSS.

This means `bg-primary-600` etc. are undefined utilities in this app. In Tailwind v3, an undefined color utility is simply NOT generated → the class is inert (no background). The 27 files using `bg-primary-*` are ALSO affected — this is a pre-existing app-wide issue, NOT introduced by QX1. So for QX1 specifically: the UpgradePrompt's primary CTA inherits a pre-existing broken convention. 

Per R11 (match conventions) the author followed what 27 other files do, but per R12/correctness the primary CTA button on the entitlement upgrade path will render with no fill. Since this is the keystone monetization CTA (the entire point of the unit is to drive upgrades), a CTA that renders transparent/unstyled is a real P1 visual-correctness defect for THIS unit — even though the root cause (missing `primary` token) is shared. I'll report it as P1 scoped to this diff with the shared-root context, plus flag the design-rule angle (the `dark:` ordering and inline conformance).

Let me do final verification passes on the remaining adversarial points: the React hook double-fetch/stale logic, and confirm the `entitlement` import in useEntitlement is actually used (line 12 imports `entitlementFor` — verify no dead/unused import causing a build issue), and the `entitlementAt` re-export is used.

### Assistant | 2026-06-22T12:47:57.041Z

[tool_use: Grep]

### User | 2026-06-22T12:47:58.537Z

[tool_result] 12:import { entitlementFor, type Entitlement, type FeatureKey, type PlanId } from '../data/pricing';
108:      snapshot ? entitlementFor(feature, snapshot.plan) : null,

### Assistant | 2026-06-22T12:48:25.912Z

All imports are used. Now let me reason through the remaining adversarial checks against the code I've fully read:

**4. React hook correctness (useEntitlement.ts):**
- `mounted` ref: initialized `true` (line 70), set `false` on cleanup (line 98), set back `true` in the effect body (line 90). React StrictMode double-invokes effects; the re-set to `true` on line 90 correctly handles remount. The `.then`/`.catch` guard `if (!mounted.current) return` (lines 77, 82) prevents set-state-after-unmount. Correct.
- Module cache + inflight: `loadPlan` returns `cached` if present (line 31), else returns the in-flight promise (line 32) — dedupes concurrent mounts. `inflight` cleared in `.finally` (line 44). Correct dedup.
- `underTest()`: skips writing `cached` under vitest (line 40) so tests start clean (paired with `clearEntitlementCache()` in beforeEach). Correct. Note: `inflight` is NOT skipped under test, but `clearEntitlementCache` resets it and each test awaits via `waitFor`, so no cross-test leak.
- Effect uses `cached` directly (line 91) rather than reading through state — on first mount `cached` is null → `run(false)`. Correct.
- One subtle item: `run` has `[]` deps (line 87) and reads no closure state except setters (stable) → no stale closure. `can`/`entitlement` depend on `[snapshot]` → recompute correctly. Correct.

**Potential staleness gap (P2):** `useState(cached)` initializer (line 67) snapshots the module cache at mount. If a SECOND component mounts after the cache populated, its effect (line 91) sets snapshot from `cached` — fine. But if `clearEntitlementCache()` is called (post-checkout) while a gate is mounted, that gate does NOT re-fetch automatically — it keeps its stale `snapshot` until `refresh()` is called or remount. The doc says "call clearEntitlementCache after checkout" but there's no broadcast to mounted hooks. This is a known/documented design limitation (caller must trigger refresh), so P2 at most.

**1. DENY-BY-DEFAULT:** verified — `resolvePl
... [+2519 chars truncated]

### Assistant | 2026-06-22T12:48:26.988Z

[tool_use: Grep]

### User | 2026-06-22T12:48:28.324Z

[tool_result] 7:  primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
25:  ({ variant = "primary", size = "md", className = "", disabled, children, ...props }, ref) => (
29:      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none
... [+81 chars truncated]

### Assistant | 2026-06-22T12:48:57.488Z

Confirmed: the shared `ui/Button.tsx` (line 7) also uses `bg-primary-600` for its primary variant. So `bg-primary-*` is the app-wide convention for primary CTAs — and it is undefined in the Tailwind config. This is a pre-existing, app-wide issue (not introduced by QX1), and since the entire shipped frontend's primary buttons rely on it, the most likely reality is that the primary buttons render unstyled across the app OR there is a CDN/safelist/another mechanism I cannot see. The key point for THIS review: UpgradePrompt conforms exactly to the established `Button.tsx` convention (R11). It is not introducing a NEW divergent broken class.

Given the root cause is pre-existing and app-wide (not introduced by the QX1 diff), I will report it as a P2 with the shared-root context rather than blaming the keystone unit — but I will explicitly flag it because the upgrade CTA is the monetization keystone and the author could have used the canonical `accent`/`prism` token or the shared `<Button>` component instead of hand-rolling undefined `primary-*` classes.

I have completed all checks. Final verdict.

---

VERDICT: PASS

summary: The entitlement keystone is deny-by-default-correct end to end — unknown plan → 'free' (resolvePlan:42), failed load → null snapshot → can()=false (useEntitlement:103), not-yet-live denies on every plan including enterprise (entitlement:61, test-covered), and the 403/401 ApiError discriminators are instanceof-safe against the single shared ApiError class (I verified billing.ts → client.ts → requestCore.ts is one class, so isEntitlementError will actually fire on a real billing 403). No path leaks paid access on error. The pure rules re-use the canonical matrix/helpers with no inlined entitlement values. Findings are all P2 (no P0/P1): a pre-existing undefined-token CTA style the unit merely inherited, and two documented design limitations.

findings:
- [P2] UpgradePrompt.tsx:66 -- The primary "View Plans" CTA uses `bg-primary-600 hover:bg-primary-7
... [+3304 chars truncated]
