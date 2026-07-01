---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2fde1f6-ef16-4bf7-8383-0d37099377ee"
title: "Review a quebec frontend launch unit (slot:quebec) on H:/prism. Grade PASS or FA"
date: "2026-06-23"
first_ts: "2026-06-23T14:25:33.456Z"
last_ts: "2026-06-23T14:27:15.984Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 49
user_msgs: 20
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/a2fde1f6-ef16-4bf7-8383-0d37099377ee/subagents/agent-a64f68065bcaacdd0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review a quebec frontend launch unit (slot:quebec) on H:/prism. Grade PASS or FA

> **claude-code-cli** | 2026-06-23 | 49 msgs (20 user / 29 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/a2fde1f6-ef16-4bf7-8383-0d37099377ee/subagents/agent-a64f68065bcaacdd0.jsonl`

## Transcript

### User | 2026-06-23T14:25:33.456Z

Review a quebec frontend launch unit (slot:quebec) on H:/prism. Grade PASS or FAIL with P0/P1 + file:line. All changes are UNCOMMITTED; read the live files.

CONTEXT: two changes. (A) FUNNEL FRONT-DOOR: the root "/" used to render ShellGatewayPage (an internal employee workspace picker) to everyone, so anonymous visitors hit a confusing picker. Now a new IndexGateway routes anonymous->public LandingPage, signed-in->ShellGatewayPage; LandingPage's "Try Free"/"Get Started Free"/free-tier CTAs + checkout.ts free-plan now go to /speed-feed-calc (the free calculator) instead of /login. (B) G6: requestCore.ts now extracts the entitlement error CODE (TIER_LIMIT/ENTITLEMENT_REVOKED) for ALL callers (was SFC-only).

FILES TO REVIEW (read fully):
- mcp-server/web/src/pages/IndexGateway.tsx (new) -- verify the lazy import of ShellGatewayPage uses its NAMED export correctly (.then(m=>({default:m.ShellGatewayPage}))), selectIndexPage logic is correct (loading/shell/landing), useAuthOptional null-safety, no flash for signed-in users.
- mcp-server/web/src/App.tsx -- the IndexGateway lazyNamed import + index route change (line ~214). Confirm 'signin' route + others unaffected.
- mcp-server/web/src/pages/LandingPage.tsx -- 3 CTA href changes to /speed-feed-calc (hero Try Free, free-tier card, CTA-band). Confirm the header "Log In" + paid-tier CTAs still go to /login.
- mcp-server/web/src/lib/checkout.ts + src/__tests__/checkout.test.ts -- free -> /speed-feed-calc + the test updated to match (intent change, not a weakened test).
- mcp-server/web/src/api/requestCore.ts -- extractErrorCode (exported) + passed into the ApiError throw. Confirm it is defined before use, handles nested + top-level code + empty/whitespace + null.
- The 2 new tests (indexGateway.test.ts, requestCoreErrorCode.test.ts) -- real assertions, not stubs.

32 tests pass; tsc clean on these files. Weighted toward: did I break the signed-in employee experience? is the anonymous->landing routing correct + non-breaking?
... [+47 chars truncated]

### Assistant | 2026-06-23T14:25:36.503Z

I'll review this quebec frontend launch unit. Let me start by reading all the files end-to-end.

### Assistant | 2026-06-23T14:25:36.988Z

[tool_use: Read]

### Assistant | 2026-06-23T14:25:37.453Z

[tool_use: Read]

### User | 2026-06-23T14:25:37.878Z

[tool_result] 1	/**
2	 * Index route gateway (LAUNCH-FE, 2026-06-23, slot:quebec).
3	 *
4	 * The root URL "/" must show the PUBLIC marketing LandingPage to an anonymous
5	 * visitor (the funnel entry -- "Try the free Speed/Feed Calculator"), and the
6	 * internal ShellGatewayPage (employee workspace picker) only to a signed-in user.
7	 * Previously "/" rendered ShellGatewayPage unconditionally, so an anonymous

... [+1439 chars truncated]

### Assistant | 2026-06-23T14:25:37.923Z

[tool_use: Read]

### Assistant | 2026-06-23T14:25:38.197Z

[tool_use: Read]

### User | 2026-06-23T14:25:38.856Z

[tool_result] 1	/**
2	 * Checkout-intent resolver (QX9 follow-up) -- the revenue-critical plan-selection
3	 * logic, extracted from PricingPage so it is unit-testable without a DOM render.
4	 *
5	 * It returns the side-effect to perform (a redirect href, or an error message)
6	 * rather than performing it, so the component stays a thin applier:
7	 *   - free       -> the free Speed/Feed Calculator (no checkout,
... [+4511 chars truncated]

### User | 2026-06-23T14:25:39.228Z

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
15	  /** Machine-readable backend error c
... [+10591 chars truncated]

### User | 2026-06-23T14:25:39.288Z

[tool_result] 1	import { type ComponentType, type ReactNode, Suspense, lazy } from 'react';
2	import { Route, Routes, useLocation } from 'react-router-dom';
3	import { Layout } from './components/Layout';
4	import ProtectedRoute from './components/ProtectedRoute';
5	import { FeatureGate } from './components/entitlement';
6	import { RouteStageFallback, getRouteLoadingMeta } from './components/workspace/RouteStag
... [+37775 chars truncated]

### Assistant | 2026-06-23T14:25:42.651Z

Now let me read the LandingPage, both test files, and the AuthContext to verify the null-safety and named exports.

### Assistant | 2026-06-23T14:25:43.080Z

[tool_use: Read]

### Assistant | 2026-06-23T14:25:43.439Z

[tool_use: Read]

### User | 2026-06-23T14:25:43.934Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\contexts\AuthContext.tsx' was already read 9m ago in this session and is unchanged (mtime 1779554761694). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T14:25:43.967Z

[tool_result] 1	import { useState } from "react";
2	import { Link } from "react-router-dom";
3	
4	// ─── Inline SVG Icons ────────────────────────────────────────────────────────
5	
6	function IconCalculator() {
7	  return (
8	    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
9	      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
10	      className
... [+26767 chars truncated]

### Assistant | 2026-06-23T14:25:46.669Z

The AuthContext was already read in this session, but I need to verify the `useAuthOptional` export and its return shape since IndexGateway depends on its null-safety. Let me grep for it specifically.

### Assistant | 2026-06-23T14:25:48.564Z

[tool_use: Grep]

### Assistant | 2026-06-23T14:25:48.882Z

[tool_use: Read]

### User | 2026-06-23T14:25:50.416Z

[tool_result] 29:  isAuthenticated: boolean;
30:  isLoading: boolean;
49:  isAuthenticated: false,
50:  isLoading: true,
64:    if (state.isAuthenticated) {
69:  }, [state.isAuthenticated]);
90:            isAuthenticated: true,
91:            isLoading: false,
103:    setState((s) => ({ ...s, isLoading: false }));
107:    setState((s) => ({ ...s, isLoading: true }));
146:        isAuthenticated: true,
147:    
... [+258 chars truncated]

### User | 2026-06-23T14:25:51.196Z

[tool_result] 1	/**
2	 * resolveCheckout -- the revenue-critical plan-selection resolver. Tests the
3	 * intent (R9): free -> sign in; enterprise -> sales mailto; paid -> the Stripe
4	 * URL; and the failure modes that must NOT silently strand a buyer (no url in
5	 * the response, the call throwing with or without a message).
6	 */
7	import { describe, it, expect } from 'vitest';
8	import {
9	  resolveCheckout,
... [+7333 chars truncated]

### Assistant | 2026-06-23T14:25:53.807Z

I found the AuthContext return shape. Let me read the full `useAuthOptional` definition to confirm null-safety, and then read the two new test files.

### Assistant | 2026-06-23T14:25:54.751Z

[tool_use: Read]

### Assistant | 2026-06-23T14:25:55.703Z

[tool_use: Read]

### Assistant | 2026-06-23T14:25:55.854Z

[tool_use: Read]

### User | 2026-06-23T14:25:57.813Z

[tool_result] 180	  return ctx;
181	}
182	
183	/**
184	 * Non-throwing variant of useAuth: returns the context value or null when no
185	 * AuthProvider is mounted. Used by surfaces that must render without auth
186	 * (component tests, marketing demo, fresh boot before login) but still want to
187	 * personalize when auth IS available — e.g. Academy progress namespacing
188	 * (PRISM-ACADEMY-MOBILE-MS0/U-PAM-A
... [+1098 chars truncated]

### User | 2026-06-23T14:25:58.257Z

[tool_result] 1	/**
2	 * Index funnel routing invariant (LAUNCH-FE, 2026-06-23, slot:quebec).
3	 * selectIndexPage decides what "/" shows. The launch-critical case: an anonymous
4	 * visitor must land on the PUBLIC marketing page, never the internal employee
5	 * workspace picker. Pure -- no render, no DOM.
6	 */
7	import { describe, it, expect } from 'vitest';
8	import { selectIndexPage } from '../pages/IndexG
... [+761 chars truncated]

### User | 2026-06-23T14:25:58.268Z

[tool_result] 1	/**
2	 * requestCore error-code propagation (LAUNCH-FE, 2026-06-23, slot:quebec).
3	 * A 403 entitlement gate must carry its machine-readable code (TIER_LIMIT /
4	 * ENTITLEMENT_REVOKED) so the FE can render the right UpgradePrompt instead of a
5	 * raw error. Previously only the SFC client extracted it; now fetchJson does, for
6	 * every caller. These tests pin extractErrorCode (pure).
7	 */
8	
... [+1142 chars truncated]

### Assistant | 2026-06-23T14:26:03.087Z

Now let me verify the key claims in the context: (1) that `/speed-feed-calc` route actually exists and resolves to a free calculator (confirmed at App.tsx:413), (2) that the SFC client previously extracted the code and now fetchJson does it for all callers — I'll check the prior SFC-only extraction to confirm this isn't a duplicate or behavior change, and (3) confirm the `signin` route was the prior behavior for the employee shell picker.

### Assistant | 2026-06-23T14:26:04.989Z

[tool_use: Grep]

### Assistant | 2026-06-23T14:26:06.168Z

[tool_use: Grep]

### User | 2026-06-23T14:26:06.776Z

[tool_result] src\api\generator.ts:30:  gcode: string;
src\api\generator.ts:33:  warnings: Array<{ code: string; message: string }>;
src\api\client.ts:297:  code: string;
src\api\data.ts:45:  decodeAlarm: (req: { code: string; controller?: string }) => post("/alarm/decode", req),
src\api\cadGeometry.ts:34:  issues: Array<{ severity: string; code: string; message: string }>;
src\api\feasibility.ts:31:  issues: A
... [+2745 chars truncated]

### User | 2026-06-23T14:26:07.748Z

[tool_result] 79:export function ShellGatewayPage() {
140:    return <Navigate replace to={getShellSessionDestination(session)} />;
173:    navigate(option.destination, { replace: true });
228:                  navigate('/dashboard', { replace: true });
241:                    to="/employee"
247:                    to="/shop-clock"
253:                    to="/employees"
342:                  to={getShellSessio
... [+125 chars truncated]

### Assistant | 2026-06-23T14:26:11.895Z

Let me verify the SFC client's prior code extraction (to confirm the G6 change is additive, not a regression of existing behavior) and check that the `signin` route + ShellGatewayPage handle anonymous users safely (since the index now routes anonymous to landing, but `signin` still renders ShellGatewayPage directly).

### Assistant | 2026-06-23T14:26:12.855Z

[tool_use: Read]

### Assistant | 2026-06-23T14:26:13.502Z

[tool_use: Read]

### User | 2026-06-23T14:26:13.934Z

[tool_result] 30	      | null;
31	    // The backend error envelope is { error: { status, message, code } } (or a
32	    // bare string). Extract the human message + machine code -- never stringify
33	    // the object to "[object Object]" (the old `err.error || ...` bug).
34	    const errObj =
35	      err && typeof err.error === "object" && err.error !== null
36	        ? (err.error as { message?: unknown; co
... [+1178 chars truncated]

### User | 2026-06-23T14:26:15.767Z

[tool_result] 79	export function ShellGatewayPage() {
80	  const services = useOperatingSystem();
81	  const location = useLocation();
82	  const navigate = useNavigate();
83	  const [session, setSession] = useState<ShellSession | null>(() => loadShellSession());
84	  const [profiles, setProfiles] = useState<EmployeeShellProfileSummary[]>([]);
85	  const [emailOptions, setEmailOptions] = useState<EmailLoginOpti
... [+2259 chars truncated]

### Assistant | 2026-06-23T14:26:21.081Z

I now have full context. Let me verify the one subtle behavioral concern: ShellGatewayPage line 139 special-cases `location.pathname === '/'` to redirect to a session destination. Since IndexGateway only renders ShellGatewayPage when authenticated, and ShellGatewayPage at `/` redirects if a `session` exists, I need to confirm this still works correctly through the new IndexGateway wrapper. Let me also confirm whether the prior `signin` route is new or pre-existing in git.

### Assistant | 2026-06-23T14:26:22.971Z

[tool_use: Bash]

### Assistant | 2026-06-23T14:26:23.397Z

[tool_use: Bash]

### User | 2026-06-23T14:26:28.358Z

[tool_result] warning: in the working copy of 'mcp-server/web/src/pages/LandingPage.tsx', CRLF will be replaced by LF the next time Git touches it
 mcp-server/web/src/App.tsx                    |  5 ++++-
 mcp-server/web/src/__tests__/checkout.test.ts |  4 ++--
 mcp-server/web/src/api/requestCore.ts         | 27 +++++++++++++++++++++++++++
 mcp-server/web/src/lib/checkout.ts            |  4 ++--
 mcp-server/web
... [+94 chars truncated]

### User | 2026-06-23T14:26:32.038Z

[tool_result] diff --git a/mcp-server/web/src/App.tsx b/mcp-server/web/src/App.tsx
index d41370eb98..c6938505ac 100644
--- a/mcp-server/web/src/App.tsx
+++ b/mcp-server/web/src/App.tsx
@@ -44,6 +44,7 @@ function RouteWorkspaceStage({ children }: { children: ReactNode }) {
 
 const DashboardPage = lazyNamed(() => import('./pages/DashboardPage'), 'DashboardPage');
 const ShellGatewayPage = lazyNamed(() => import(
... [+1054 chars truncated]

### Assistant | 2026-06-23T14:26:35.780Z

The diff confirms the `signin` route was pre-existing (it was already there before this change as a direct ShellGatewayPage route) and is unaffected. Let me verify the LandingPage and checkout diffs precisely to confirm only the 3 CTA hrefs + free-plan changed, and that paid-tier CTAs were left at `/login`.

### Assistant | 2026-06-23T14:26:37.469Z

[tool_use: Bash]

### User | 2026-06-23T14:26:44.648Z

[tool_result] warning: in the working copy of 'mcp-server/web/src/pages/LandingPage.tsx', CRLF will be replaced by LF the next time Git touches it
diff --git a/mcp-server/web/src/__tests__/checkout.test.ts b/mcp-server/web/src/__tests__/checkout.test.ts
index 413f890368..e45ac38478 100644
--- a/mcp-server/web/src/__tests__/checkout.test.ts
+++ b/mcp-server/web/src/__tests__/checkout.test.ts
@@ -16,13 +16,13 @@ 
... [+3078 chars truncated]

### Assistant | 2026-06-23T14:26:49.172Z

I now have everything verified end-to-end. Let me do a final cross-check on the requestCore diff to confirm the G6 change is purely additive (no removed behavior) and the test file's docstring matches its assertions.

### Assistant | 2026-06-23T14:26:50.265Z

[tool_use: Bash]

### User | 2026-06-23T14:26:54.981Z

[tool_result] diff --git a/mcp-server/web/src/api/requestCore.ts b/mcp-server/web/src/api/requestCore.ts
index a34b666502..ba86de07c2 100644
--- a/mcp-server/web/src/api/requestCore.ts
+++ b/mcp-server/web/src/api/requestCore.ts
@@ -138,6 +138,32 @@ function extractErrorMessage(payload: unknown) {
   return null;
 }
 
+/**
+ * Extract the machine-readable error CODE (e.g. TIER_LIMIT / ENTITLEMENT_REVOKED)
+ * f
... [+1430 chars truncated]

### Assistant | 2026-06-23T14:27:15.984Z

I have completed an end-to-end review of all files plus the live diffs, the AuthContext return shape, the SFC prior code-extraction, the ShellGatewayPage `/` redirect logic, and confirmed `/speed-feed-calc` resolves to the free `SfcCalculatorPage` (App.tsx:413).

VERDICT: PASS

summary: Both changes are correct and non-breaking. The funnel front-door (A) correctly routes anonymous→LandingPage and signed-in→ShellGatewayPage via a pure, well-tested `selectIndexPage`, with proper null-safety and no flash-on-load for returning users; the signed-in employee experience is preserved unchanged. The G6 entitlement-code extraction (B) is purely additive — a new exported `extractErrorCode` fed into the existing `ApiError` throw, with no removed behavior. The 3 CTA href changes and the free-plan checkout redirect are clean intent changes, and the updated test asserts the new intent (not a weakened test).

findings: none

What I verified (auditable):
- `IndexGateway.tsx:17-19` — the lazy import of `ShellGatewayPage` uses its NAMED export correctly via `.then(m => ({ default: m.ShellGatewayPage }))`; `ShellGatewayPage` is confirmed a named export at `ShellGatewayPage.tsx:79` (`export function ShellGatewayPage()`). `LandingPage` is correctly imported as a default lazy import (it is `export default function LandingPage` at `LandingPage.tsx:300`).
- `IndexGateway.tsx:30-33` — `selectIndexPage` logic is correct: `loading` when `auth.isLoading`, `shell` when authenticated, `landing` otherwise. Null-safe: `auth && auth.isLoading` / `auth && auth.isAuthenticated` short-circuit on `null`, which `useAuthOptional()` can return (`AuthContext.tsx:190-192` returns `useContext(AuthContext)`, default `null`). `which === 'loading'` returns `null` (no landing→shell flash for returning signed-in users — the `isLoading: true` default at `AuthContext.tsx:49-50` is handled).
- `App.tsx:47` (new `IndexGateway` lazyNamed import), `App.tsx:217` (index route now `<IndexGateway />`). The `signin` route (`
... [+1890 chars truncated]
