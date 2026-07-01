---
title: hotel-portal.ts -- 31 anon-reachable employee-PII + privileged-mutation routes gated (verifyToken + requireRole)
kind: learning
domain: business
severity: P0-security
unit: HOTEL/U-HOTEL-PORTAL-AUTH
slot: hotel
date: 2026-06-24
commit: 18f8da8ed9
tags: [security, auth, verifyToken, requireRole, pii, hotel, erp, optionalToken, idor, R8, R15]
---

# hotel-portal.ts: 31 anonymously-reachable employee-PII + privileged-mutation routes

The hotel/ERP sibling of the quoting anon-cost-leak sweep. The same anon-leak class, larger surface, and
crucially with **WRITE actions** -- discovered while applying the quoting security pass to the business/ERP
side of the app (operator's named directive).

## The exposure (verified end-to-end, R12)

`routes/index.ts:140` applies `app.use("/api", optionalToken)` to the WHOLE /api surface; `optionalToken`
(`middleware/auth.ts:64-76`) sets `req.userId` for a valid Bearer but NEVER rejects anonymous. The
hotel-portal router (`routes/index.ts:164`, `/api/v1/hotel-portal`) had **ZERO auth middleware** on all 31
endpoints -- so every one was anonymously reachable:

- **Employee/HR PII:** `/digest` (per-employee daily view), `/dashboard` (manager view of all reports),
  `GET /pto/balance/:employee_id` (ANY employee), `/payroll/compute` (**gross wages**), `/osha/incident`
  + `/annual-300a` (injury/medical records, 29 CFR 1904).
- **Privileged MUTATIONS (anyone could perform):** `/pto/approve` (approval -- separation-of-duties),
  `/timeclock/edit` (**edit any punch** -- payroll-fraud vector), `/po/create` + `/transition` +
  `/receipt` (**create/approve purchase orders** -- financial control), `/inspection-report/cofc`
  (**issue Certificates of Conformance** -- legal/quality liability), `/role-academy/hire`.

The sibling `erp.ts` already protected the IDENTICAL action class with `verifyToken` + `requireRole`
(`erp.ts:11-12,166-168,384-388`) -- hotel-portal.ts was simply missing the gate.

## Why verifyToken, NOT redact-when-anon

The quoting cost sweep used redact-when-anon because a customer quote has a legitimate public UX (hide
only the cost basis). Hotel-portal is employee PII + privileged mutations -- there is NO legitimate
anonymous view. The correct fix is to REQUIRE auth (401), mirroring erp.ts. A redaction would be the wrong
tool: you cannot "redact" a write action, and there is no anonymous read that should succeed.

## The fix (R8 mirror erp.ts + R15 wire backend+FE together; commit 18f8da8ed9, 5 files)

1. **`hotel-portal.ts`:** `/health` registered FIRST (before the gate, stays open for monitoring), then
   `router.use(verifyToken)` -- one line gates ALL 31 routes (defense-in-depth: a future-added route is
   auto-protected, can't be forgotten). `requireRole(...)` on the 14 privileged routes, mirroring the
   erp.ts role map EXACTLY (real roles: admin / hr_manager / lead):
   - `hr_manager, admin` -> payroll/compute, timeclock/edit, osha/incident, osha/annual-300a,
     role-academy/hire.
   - `lead, hr_manager, admin` -> dashboard, pto/approve, complaint/triage, nc/management-review-summary,
     inspection-report/cofc, po/create, po/transition, po/receipt.
   - `admin` -> executive-summary.
   - global verifyToken only -> self-service employee read/write (pto/request+balance, swap, complaint
     intake, timeclock/punch+summary, shipping-receiving/*, po/status, inspection-report, role-catalog,
     simulation/run).
   With the GLOBAL `router.use(verifyToken)`, the privileged routes need ONLY `requireRole(...)` added
   (verifyToken already ran + populated req.userId/req.userRoles).
2. **`HotelPortalPage.tsx`:** the page's bare `fetch` sent NO Bearer (the rule-(b) trap) -- adding
   verifyToken alone would 401-break it. Both fetch sites now send the token via `getRequestHeaders()`
   (`api/client.ts`, the shared pattern billing.ts/latheAI.ts use). A logged-out visitor gets 401
   (surfaced as the page error state). The backend gate + FE token are MANDATORY in the SAME unit (R15) --
   gating without the FE wire = broken page -> revert risk.
3. **`hotel-portal-auth.test.ts` (NEW):** 14-test authorization matrix using the **REAL `requireRole`**
   (`vi.mock` with `importOriginal`, stubbing ONLY `verifyToken` to read roles from an `x-test-roles`
   header -- missing header => 401, the real anon path). anon->401, operator->403 on each privileged tier,
   hr_manager/lead/admin->200 on their tier, /health->200 anon, + a negative control. The 403s are
   produced by the genuine middleware (proven by the live `[Auth] denied` logging) -- not a no-op stub.
4. **`hotel-portal-route.test.ts` + `hotel-portal-live-integration.test.ts`:** updated with an
   always-authed-admin `vi.mock` auth stub (they assert WIRING/engine-roundtrip, not the auth matrix --
   which is pinned in the dedicated auth test). Also fixed a PRE-EXISTING stale `/health` assertion
   (portal_engines 12->18, iter15..iter25->iter15..iter38; the route already returned 18, only the test
   lagged).

## Validation

- 66/66 hotel-portal tests green (14 auth matrix + 12 wiring + 40 live-integration); businessDispatch
  43/43 no-regression; backend + FE tsc clean.
- **3-of-3 CLEARED** (blockCount 0). All three arms PASS, no P0/P1. Arm A walked all 31 routes (only
  /health before the gate), confirmed the tiers match erp.ts, and that `optionalToken` cannot weaken the
  inner `verifyToken` (verifyToken re-parses the Authorization header itself). Arm B confirmed the auth
  test exercises the REAL requireRole with teeth + the stubs are legit intent-updates. Arm C traced 5
  blast-radius vectors: no other harness 401-breaks (the 20 full-tree route-mount tests don't hit
  hotel-portal paths), no re-mount drift, no FE circular-import.

## Lessons

1. **verifyToken vs redact-when-anon depends on whether a legitimate anonymous view EXISTS.** Customer
   quote read -> redact (public UX). Employee PII + mutation -> require auth (no public view, and you
   can't redact a write).
2. **Gate the WHOLE router with `router.use(verifyToken)`, register the open probe BEFORE it.** One line
   protects every current + future route; per-route gating is forgettable. `/health` goes above the
   `.use`.
3. **A backend auth gate + the FE token wiring are ONE unit (R15).** The page sent no token; gating alone
   would 401-break it. Wire `getRequestHeaders()` in the same commit, or the gate gets reverted.
4. **Test the gate with the REAL `requireRole`** (`importOriginal`, stub only `verifyToken`) so the 403s
   are genuine middleware decisions -- a both-mocked test is a false-green. Assert `captured.length === 0`
   on a 401/403 to prove the engine was never reached.
5. **Closing the ANON leak is the named class; IDOR is the NEXT layer (R13 logical order).** The
   self-service routes still take an arbitrary `employee_id` -- an authed low-priv employee can read
   another's PTO/digest/timeclock. `erp.ts` solves this with `requireSelfOrAdmin` (erp.ts:56-67). Logged
   as a separate follow-up unit; do NOT conflate it with the anon-leak fix.

## See also
- [[cost-route-anon-cost-basis-redaction]] -- the quoting sibling (redact-when-anon for public cost reads)
- [[costpage-fe-route-shape-and-envelope-dead-panel]] -- the quoting dead-panel fix (same session arc)
- [[reference_charlie_costpage_shape_2026_06_24]] -- the quoting unit that preceded the hotel descent
