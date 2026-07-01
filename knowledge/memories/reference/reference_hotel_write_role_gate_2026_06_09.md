---
name: reference_hotel_write_role_gate_2026_06_09
description: "Opened 4 handoff-workflow WRITE actions to the browser business dispatch behind a per-action role gate (U-HOTEL-ALLOWLIST-WRITE-ENABLE) + reusable lessons: (1) GROUND a security/auth build before coding -- a fan-out found the full RBAC + audit already existed, turning a feared subsystem build into a bounded middleware add; (2) a role gate on a generic multi-action dispatch route must be IN-HANDLER + fail-closed; (3) a role gate is NOT an identity gate -- the open follow-up."
type: reference
slot: hotel
galaxy: business
source: prism-memory
synced: 2026-06-27T20:30:46.613Z
aliases: reference_hotel_write_role_gate_2026_06_09
---


# Hotel write-role gate + three lessons (2026-06-09, slot:hotel)

**Commits:** `18f37c812e` (core) + `d8d2824cf2` (scrutiny polish). 3-of-3 PASS, 23/23 route tests.
**Files:** `mcp-server/src/routes/business.ts`, `src/data/business-dispatch-allowlist.ts`, `src/__tests__/businessDispatchRoute.test.ts`. Operator approved the role model.

## What shipped
`POST /api/v1/business/dispatch` was deny-by-default (17 read-only actions). This opens 4 manager/HR
WORKFLOW-STATE writes -- `handoff_counterparty_respond` / `handoff_manager_approve` /
`handoff_mark_executed` / `handoff_cancel` -- behind a per-action manager-tier role gate
(`lead|supervisor|hr_manager|admin`) via a new `BUSINESS_WRITE_ROLE_MAP`. All four are workflow-state
only (no GL/money, no PII beyond employee IDs), write a frozen append-only audit entry in
`EmployeeTaskHandoffEngine`, and are status-guarded (a retry throws, never double-applies). Financial +
payroll-downstream + PII writes (`po_approve`, `hr_pto_approve`, `pto_approve_request`, `payroll_run`,
`gl_*`, `order_create`) are in NEITHER the read Set NOR the write-map -> they 403 for every role incl
admin (proven in tests).

## LESSON 1 (reusable) -- GROUND a security/auth build before writing a line
Before touching auth code I fanned out 3 parallel readers (auth model / candidate write actions /
existing audit+RBAC). The grounding flipped the build from a feared "RBAC subsystem" to a BOUNDED
middleware add: `verifyToken` already attaches `req.userRoles`, `requireRole`/`requirePermission` +
`ROLE_DB` (7 roles) are production-wired (`erp.ts`, `admin.ts`), and the `auditLog` middleware is
already mounted globally (`routes/index.ts:114`) recording user_id+roles on every write. So: NO new
RBAC, NO new audit -- reuse. The load-bearing unknown ("does a session carry a role?") MUST be settled
by reading the real auth path, not assumed. Pairs with [[dont-reinvent]] + R8.

## LESSON 2 (reusable) -- role gate on a GENERIC multi-action route is IN-HANDLER + fail-closed
Route-level `requireRole(...)` middleware can't gate a single endpoint that dispatches many actions with
different role needs. The gate must be IN the handler: a per-action `Map<action, roles>` + an inline
`req.userRoles` intersection check. Make it FAIL-CLOSED: `const roles = Array.isArray(req.userRoles) ?
req.userRoles : []` so a missing/non-array roles field -> `[]` -> no match -> 403. Use a DISTINCT 403
message for "wrong role" vs "not dispatchable" so a test can prove which path fired (a financial action
must hit the not-dispatchable path BEFORE any role check). `req.userRoles` is server-derived
(`validateToken` from the stored user record), NOT client/JWT/header -> non-spoofable.

## LESSON 3 (open follow-up, scrutiny A-P2) -- a role gate is NOT an identity gate
The HTTP gate authorizes by ROLE; each handoff engine method separately enforces participant-IDENTITY
(`responder_employee_id === counterparty_employee_id`, manager segregation-of-duties) -- but from
CALLER-ASSERTED `req.body.params`, NOT bound to `req.userId`. So a manager-tier session can assert
another employee's identity. Bounded today (workflow-state only, PII-free, and the global auditLog
records the TRUE `req.userId` so impersonation is attributable) -> graded P2, not a blocker. The proper
fix (bind the engine identity param to `req.userId` server-side) needs an auth-user -> employee-id
mapping that does NOT yet exist (auth USR-<hex> != employee id namespace) -> filed as a follow-up unit,
NOT half-built. When you role-gate a write whose engine identity-checks caller-supplied ids, always ask
whether role and identity refer to the same actor.

Related: [[reference_hotel_portal_persistence_2026_06_09]] - [[reference_hotel_false_wire_guard_2026_06_09]] - [[feedback_verify_actual_contract_not_proxy]].
