---
title: Auth token storage-key mismatch (dead panels for logged-in users)
type: lesson
domain: frontend / launch-readiness
slot: hotel
date: 2026-07-03
commits: [6b1f384734, db9740e2f8]
tags: [auth, dead-panel, launch-wire, frontend, R8, R9, R16]
---

# Auth token storage-key mismatch → app-wide dead panels for logged-in users

## The bug class

`AuthContext.tsx` stores the session under the **canonical key `prism-auth-token`
(hyphen)** as a JSON object `{token: "<jwt-string>", userId, employee}` (line 46
`TOKEN_KEY`, line 221 `setItem`).

Seven frontend clients + one page read the **WRONG key directly**:
- `businessDispatch.ts`, `employeePortal.ts`, `hotelBusiness.ts`, `prismBusiness.ts`,
  `wedmCoordination.ts`, `QuotingWorkbenchPage.tsx` → read `prism_auth_token` (underscore)
- `shop.ts` → read `prism_token` (a third variant)

Consequence: a **logged-in** user's token was never found → `token = null` →
no `Authorization: Bearer` header → backend `verifyToken`/`optionalToken`
returned **401 AUTH_REQUIRED** → the panel rendered empty / "sign in" state.
This dead-panned the **entire business ERP + employee portal + parts of quoting**
for signed-in users. Doubly broken: even on a key-hit the old code sent the raw
JSON blob `Bearer {"token":...}` (no unwrap), which the backend rejects.

## The fix (R8 reuse)

Route every client through the already-existing canonical helper
`getStoredAuthToken()` in `mcp-server/web/src/api/authToken.ts`:
- reads `prism-auth-token` (canonical) first, then legacy keys `prism_auth_token` + `prism_token`
- JSON-unwraps `parsed.token ?? parsed.access_token`; tolerates bare strings
- null-safe (`if (!storage) return null`) — subsumes the old `typeof localStorage` SSR guard

`wedmCoordination.ts` kept its `currentAuthToken` explicit-set precedence — the
fix only replaced the localStorage fallback.

## Why the existing tests could not catch it (R9)

`businessDispatch.test.ts` set `localStorage.setItem('prism_auth_token', 'tok-123')`
— the **legacy underscore key with a bare string**. That test passes both before
AND after the fix (legacy fallback), so it had no teeth against the real bug.
The bug is that production writes the **hyphen key with a JSON object**.

The R9-correct regression: set `prism-auth-token = JSON.stringify({token:'abc'})`
and assert `Authorization === 'Bearer abc'` (unwrapped). This **fails against the
pre-fix code** (which read only the underscore key as a raw string) and passes
against the fix. Plus a precedence test: set BOTH keys, assert the canonical wins.

## Backend wire contract (verified, arm C)

`routes/auth.ts:43-44`: `authHeader.slice(7)` → `authEngine.validateToken(token)` —
**never JSON-parses**. So the unwrapped JWT string is exactly what the backend
expects. `AuthContext` itself sends `Bearer ${token}` (raw string) to
`/api/v1/erp/employees:204`, confirming the raw JWT is the wire contract. The
panels were **dead, not working** → the unwrap can only fix, never break.

## Detection heuristic

`grep -rn "getItem('prism_auth_token')\|getItem('prism_token')" mcp-server/web/src/{api,pages}`
— any live hit (not in a comment, not `authToken.ts`'s legacy-key array) is a
dead-panel-for-logged-in-users bug. After the fix: zero live hits remain.

## Sibling of

The [[reference_charlie_estimate_flow_envelope_nested_fix]] / costpage_shape
dead-panel class — but that class is envelope-unwrap / shape-mismatch; THIS class
is the token never reaching the wire at all. Both produce "empty panel for a
real user"; check auth-key FIRST (it dead-pans the whole domain), then envelope,
then shape.
