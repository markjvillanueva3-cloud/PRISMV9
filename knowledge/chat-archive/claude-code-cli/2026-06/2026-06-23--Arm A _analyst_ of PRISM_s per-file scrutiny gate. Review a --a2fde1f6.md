---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2fde1f6-ef16-4bf7-8383-0d37099377ee"
title: "Arm A (analyst) of PRISM's per-file scrutiny gate. Review a new reactive-entitle"
date: "2026-06-23"
first_ts: "2026-06-23T17:01:37.005Z"
last_ts: "2026-06-23T17:02:55.729Z"
cwd: "H:\\prism\\mcp-server"
messages: 40
user_msgs: 18
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/a2fde1f6-ef16-4bf7-8383-0d37099377ee/subagents/agent-ad27a869f880d9b50.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Arm A (analyst) of PRISM's per-file scrutiny gate. Review a new reactive-entitle

> **claude-code-cli** | 2026-06-23 | 40 msgs (18 user / 22 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/a2fde1f6-ef16-4bf7-8383-0d37099377ee/subagents/agent-ad27a869f880d9b50.jsonl`

## Transcript

### User | 2026-06-23T17:01:37.005Z

Arm A (analyst) of PRISM's per-file scrutiny gate. Review a new reactive-entitlement primitive end-to-end. Read fully:
1. H:/prism/mcp-server/web/src/components/entitlement/GatedError.tsx (new)
2. H:/prism/mcp-server/web/src/__tests__/GatedError.test.tsx (new)
3. H:/prism/mcp-server/web/src/components/entitlement/FeatureGate.tsx (the proactive sibling, for convention)
4. H:/prism/mcp-server/web/src/lib/entitlement.ts (isEntitlementError ~line 91)
5. H:/prism/mcp-server/web/src/components/entitlement/UpgradePrompt.tsx (what it renders)

PURPOSE: GatedError is the REACTIVE companion to FeatureGate. When a page's gated dispatcher call returns 403 (backend requireTier), it renders <UpgradePrompt feature> instead of a raw error; any other error falls through to `fallback`. It composes isEntitlementError (err instanceof ApiError && status===403) + useEntitlement().plan + UpgradePrompt. It will be wired into many gated pages next.

Grade PASS/FAIL with P0/P1/P2 + file:line. Verify:
- Correctness: does it render UpgradePrompt ONLY for a real 403 ApiError, and the fallback for everything else (500/401/null/non-ApiError/plain Error)? Is the instanceof guard sound (a plain {status:403} object must NOT unlock)?
- The dormant-safe contract: when error is null/non-gate, behavior is identical to rendering the fallback alone -- confirm no side effect from the useEntitlement() call (it fetches billing status; is that wasteful/looping when there is no error? Should the hook even run when error is falsy?).
- Convention conformance with FeatureGate (props shape, JSDoc, the barrel export).
- Test integrity: real assertions, covers 403 + >=3 non-gate + adversarial (non-ApiError-with-status, null, plain Error) + the not-yet-live variant + feature-variability (2 features). Any tautology/.skip/.only? Note: the .tsx render tests need jsdom (not installed locally) -- judge the test SOURCE for correctness, not a run.
- Any hidden coupling, accessibility, or type issue.
Be terse. Report only; d
... [+11 chars truncated]

### Assistant | 2026-06-23T17:01:42.819Z

I'll read all five files in parallel to conduct a thorough analysis.

### Assistant | 2026-06-23T17:01:43.440Z

[tool_use: Read]

### Assistant | 2026-06-23T17:01:43.579Z

[tool_use: Read]

### Assistant | 2026-06-23T17:01:44.112Z

[tool_use: Read]

### Assistant | 2026-06-23T17:01:44.600Z

[tool_use: Read]

### Assistant | 2026-06-23T17:01:44.652Z

[tool_use: Read]

### User | 2026-06-23T17:01:45.660Z

[tool_result] 1	/**
2	 * GatedError -- the REACTIVE companion to <FeatureGate> (LAUNCH-FE 2026-06-23).
3	 *
4	 * <FeatureGate> gates a feature PROACTIVELY (client-side `can(feature)` -> no API
5	 * call for a wrong-plan user). GatedError closes the other half: when a page DID
6	 * call a gated dispatcher and the backend `requireTier` returned 403, render the
7	 * upgrade CTA instead of a raw error string. Any n
... [+1808 chars truncated]

### User | 2026-06-23T17:01:45.722Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\FeatureGate.tsx' was already read 7m ago in this session and is unchanged (mtime 1782132212362). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### User | 2026-06-23T17:01:45.799Z

[tool_result] 1	/**
2	 * GatedError -- reactive 403->UpgradePrompt companion to FeatureGate (LAUNCH-FE 2026-06-23).
3	 *
4	 * A gated dispatcher call that returns 403 (backend requireTier denial) must render the
5	 * upgrade CTA, NOT a raw error; every other error (network/500/401/validation) falls
6	 * through to the page's normal error UI. Pins the gate discrimination so a page wiring
7	 * GatedError into its
... [+4434 chars truncated]

### User | 2026-06-23T17:01:45.958Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\UpgradePrompt.tsx' was already read 9m ago in this session and is unchanged (mtime 1782132712015). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### User | 2026-06-23T17:01:46.349Z

[tool_result] 1	/**
2	 * Entitlement resolution -- pure FE logic bridging a user's live plan to the
3	 * canonical entitlement matrix (data/pricing.ts) and the backend 403 contract.
4	 *
5	 * Single source of truth for "can this plan use this feature right now":
6	 *   - the matrix (ENTITLEMENT_MATRIX) decides per-plan inclusion;
7	 *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
8	
... [+3663 chars truncated]

### Assistant | 2026-06-23T17:01:50.148Z

I have all five files from the previous parallel read. Let me now grep for the barrel export, ApiError definition, useEntitlement hook, and UpgradePrompt content that was in context.

### Assistant | 2026-06-23T17:01:51.687Z

[tool_use: Grep]

### Assistant | 2026-06-23T17:01:52.137Z

[tool_use: Grep]

### Assistant | 2026-06-23T17:01:52.850Z

[tool_use: Grep]

### User | 2026-06-23T17:01:54.410Z

[tool_result] web\src\components\entitlement\index.ts:4:export { GatedError, type GatedErrorProps } from './GatedError';
web\src\components\entitlement\GatedError.tsx:2: * GatedError -- the REACTIVE companion to <FeatureGate> (LAUNCH-FE 2026-06-23).
web\src\components\entitlement\GatedError.tsx:5: * call for a wrong-plan user). GatedError closes the other half: when a page DID
web\src\components\entitlement\Gat
... [+201 chars truncated]

### User | 2026-06-23T17:01:55.050Z

[tool_result] web\src\api\requestCore.ts:91:export class ApiError extends Error {

### User | 2026-06-23T17:01:55.256Z

[tool_result] web\src\hooks\useEntitlement.ts:2: * useEntitlement -- supplies the signed-in user's live plan + a `can(feature)`
web\src\hooks\useEntitlement.ts:6: * module-cached so N mounted gates do not each refetch; clearEntitlementCache()
web\src\hooks\useEntitlement.ts:51:export function clearEntitlementCache(): void {
web\src\hooks\useEntitlement.ts:66:export function useEntitlement(): UseEntitlement {

### Assistant | 2026-06-23T17:01:58.783Z

Good. Now I need to read ApiError, useEntitlement, UpgradePrompt, and the barrel index to complete the analysis.

### Assistant | 2026-06-23T17:01:59.565Z

[tool_use: Read]

### Assistant | 2026-06-23T17:01:59.989Z

[tool_use: Read]

### Assistant | 2026-06-23T17:02:00.371Z

[tool_use: Read]

### Assistant | 2026-06-23T17:02:00.647Z

[tool_use: Read]

### User | 2026-06-23T17:02:00.718Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\hooks\useEntitlement.ts' was already read 5s ago in this session and is unchanged (mtime 1782132194386). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T17:02:01.248Z

[tool_result] 85	    return 'PRISM hit a server-side problem while handling this request.';
86	  }
87	
88	  return fallbackMessage;
89	}
90	
91	export class ApiError extends Error {
92	  readonly status: number;
93	  readonly kind: ApiErrorKind;
94	  readonly retryable: boolean;
95	  readonly hint?: string;
96	  /** Machine-readable backend error code (e.g. TIER_LIMIT, ENTITLEMENT_REVOKED). */
97	  readonly cod
... [+377 chars truncated]

### User | 2026-06-23T17:02:01.446Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\UpgradePrompt.tsx' was already read 9m ago in this session and is unchanged (mtime 1782132712015). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### User | 2026-06-23T17:02:01.627Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\FeatureGate.tsx' was already read 7m ago in this session and is unchanged (mtime 1782132212362). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### Assistant | 2026-06-23T17:02:05.497Z

[tool_use: Read]

### Assistant | 2026-06-23T17:02:06.024Z

[tool_use: Read]

### Assistant | 2026-06-23T17:02:06.431Z

[tool_use: Read]

### User | 2026-06-23T17:02:07.840Z

[tool_result] 1	/**
2	 * useEntitlement -- supplies the signed-in user's live plan + a `can(feature)`
3	 * predicate built on the pure entitlement rules (lib/entitlement.ts).
4	 *
5	 * The plan comes from GET /billing/status (billingApi.getBillingStatus). It is
6	 * module-cached so N mounted gates do not each refetch; clearEntitlementCache()
7	 * after a successful checkout/plan change. A failed load leaves th
... [+3121 chars truncated]

### User | 2026-06-23T17:02:08.495Z

[tool_result] 1	/**
2	 * UpgradePrompt -- shown when a plan lacks a feature. Tells the user the
3	 * cheapest tier that unlocks it (or "coming soon" for a not-yet-live wave) and
4	 * routes them to /pricing or the billing portal. Pure presentation off the
5	 * canonical registry + entitlement rules; no fetch.
6	 */
7	import { useNavigate } from 'react-router-dom';
8	import { FEATURE_LABELS, PLAN_TIERS, formatPr
... [+2993 chars truncated]

### User | 2026-06-23T17:02:08.590Z

[tool_result] 1	/**
2	 * FeatureGate -- renders children only if the live plan can use `feature`,
3	 * otherwise an UpgradePrompt (or a custom fallback). The single FE chokepoint
4	 * for plan-tier gating; pairs with the backend `requireTier` 403 (caught via
5	 * isEntitlementError) so a gate lands without 403-ing an anonymous caller.
6	 */
7	import type { ReactNode } from 'react';
8	import type { FeatureKey } 
... [+847 chars truncated]

### Assistant | 2026-06-23T17:02:16.271Z

Now I have everything I need. Let me also check the barrel index and the `quoting` FeatureKey to verify the "not-yet-live" test case.

### Assistant | 2026-06-23T17:02:16.505Z

[tool_use: Read]

### Assistant | 2026-06-23T17:02:16.996Z

[tool_use: Grep]

### User | 2026-06-23T17:02:17.035Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\index.ts' was already read 21s ago in this session and is unchanged (mtime 1782233895831). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-06-23T17:02:19.671Z

[tool_result] 43-  | 'print_to_cnc'
44-  | 'cadcam'
45:  | 'quoting'
46-  | 'erp'
47-  | 'simulation'
--
226-  print_to_cnc: 'Print to CNC program',
227-  cadcam: 'CAD/CAM AI',
228:  quoting: 'Quoting (Wave 2)',
229-  erp: 'ERP suite (Wave 3)',
230-  simulation: 'Simulation',
--
233-
234-/** Features sold but whose tier inclusion ACTIVATES only on their launch wave (R12). */
235:export const FEATURE_NOT_YET_LIV
... [+889 chars truncated]

### Assistant | 2026-06-23T17:02:55.729Z

I have all the information needed. Here is my complete analysis.

---

VERDICT: PASS

summary: GatedError correctly gates on `err instanceof ApiError && err.status === 403` via the canonical `isEntitlementError` helper -- a plain `{status:403}` object cannot unlock it. The `useEntitlement()` call runs unconditionally (even when `error` is null), which triggers a billing fetch on every mount even when dormant; this is the one non-trivial design point, but it is consistent with how `FeatureGate` works (same unconditional call) and the module-level cache in `useEntitlement.ts` means the fetch fires at most once per page lifetime. All other paths are correct. Tests are real-assertion, no `.skip`/`.only`, cover the adversarial cases required, and the barrel export is present.

---

findings:

- [P2] `H:/prism/mcp-server/web/src/components/entitlement/GatedError.tsx:38` -- `useEntitlement()` fires unconditionally on every mount, even when `error` is null (the dormant-safe state the JSDoc advertises). The module cache (`cached` in `useEntitlement.ts:20`) means it does NOT double-fetch if any other gate on the page already loaded the plan, but on a page where GatedError is the FIRST mounted entitlement consumer and `error` is null, it will still issue one `/billing/status` fetch whose result is silently discarded. This is a latent waste, not a bug, and it is exactly parallel to `FeatureGate.tsx:27` which has the same pattern. Fix if the billing endpoint becomes expensive or rate-limited: move the `useEntitlement()` call inside the `if (isEntitlementError(error))` branch via a child component (the Rules-of-Hooks constraint prevents a conditional call in the same component, so a split is required). Defer unless operator signals billing-endpoint cost.

- [P2] `H:/prism/mcp-server/web/src/__tests__/GatedError.test.tsx:45` -- The test string `"Lathe Wizard requires the Pro plan"` must match the text emitted by `UpgradePrompt.tsx:54`: `"{label} requires {neededTier ? \`the ${need
... [+3058 chars truncated]
