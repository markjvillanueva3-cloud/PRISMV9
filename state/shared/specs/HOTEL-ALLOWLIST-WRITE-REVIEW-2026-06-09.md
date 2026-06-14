# HOTEL-ALLOWLIST-WRITE-REVIEW + P3-REALTIME-VERIFY (slot:hotel, 2026-06-09)

Unit: `U-HOTEL-ALLOWLIST-WRITE-REVIEW + P3-REALTIME-VERIFY` (HOTEL-FORGE-ROADMAP).
Author: slot:hotel (session `19dff632`). Advisory — **no code change**; the write-exposure
decision is operator/security-gated (hotel soul: `defer-pii-to-security`, cautious-before-write).

---

## Part A — ALLOWLIST-WRITE-REVIEW (browser-reachable business writes)

### Current state (verified)
- `POST /api/v1/business/dispatch` (`src/routes/business.ts:62`) is **deny-by-default**: `action` is
  checked against `BUSINESS_DISPATCH_ALLOWLIST` (`src/data/business-dispatch-allowlist.ts`); a
  non-allowlisted action returns **403** (`business.ts:75-80`), and `verifyToken` is required first
  (defense in depth, `business.ts:62`).
- The allowlist is **17 READ-ONLY actions** (vendor reads, hotel-portal reads, marketplace reads,
  geo-routing reads). Every write — including the ~120 largely-financial `prismBusiness.ts` actions —
  stays 403. This is the documented "pending per-action security review" follow-up (`business.ts:27-30`).
- The ONE named hotel WRITE candidate is `handoff_counterparty_respond`
  (`business-dispatch-allowlist.ts:50` — "HR-workflow WRITE, needs per-action role gate").

### Classification (the decision the operator needs)
| Class | Examples | Recommendation |
|-------|----------|----------------|
| **GL / financial / payroll writes** | journal posts, invoice/PO financial mutation, payroll runs, COGS adjust | **STAY 403.** Hotel soul refuses `silent-financial-clobber`; these need the financial-invariant gate (debits=credits, journal-entry trail) which a browser session cannot be trusted to satisfy. Not browser-dispatchable, ever. |
| **PII-touching writes** | employee record edits, SSN/card fields | **STAY 403.** `defer-pii-to-security`. |
| **Manager/HR-workflow writes** | `handoff_counterparty_respond`, PTO approve, PO cut (non-financial state transition) | **Candidate to open — but only behind a per-action ROLE gate**, not the current any-authenticated `verifyToken`. Requires: (1) a role claim on the session (manager/HR), (2) the action's own validation preserved, (3) idempotency/audit-trail so a replay can't double-apply. |

### Why this is NOT an autonomous build
`verifyToken` today proves "a session exists", not "this session may approve a PTO / cut a PO". Opening
a write to the browser without a **per-action role gate** would let any authenticated portal session
mutate business state — a privilege-escalation surface. Adding a role-gating layer is a real auth
design (where do roles live? how are they claimed? audit trail?) and exposing business-state writes is
an outward-facing, hard-to-reverse change. Per the hotel soul (cautious; defer-pii-to-security) and the
"confirm before outward-facing/irreversible" rule, this is an **operator/security sign-off decision**,
not a YOLO allowlist edit.

### Recommended next unit (operator-gated)
`U-HOTEL-ALLOWLIST-WRITE-ENABLE` (separate, gated): add a `requireRole(action, role)` middleware layer
to `business.ts`, a per-action role map, an audit-trail write, then allowlist ONLY the manager/HR
non-financial writes (starting with `handoff_counterparty_respond`). Financial + PII writes stay 403
permanently. Ship with role-gate tests (authorized role passes, wrong/no role 403, financial action
still 403) round-tripped through the route. **Do not begin without operator approval of the role model.**

---

## Part B — P3-REALTIME-VERIFY (does realtime back ≥1 surface?)

**Result: VERIFIED — realtime is wired end-to-end.**
- **Transport (mounted):** `createRealtimeRouter()` mounted at `/api/v1/realtime/*`
  (`src/routes/index.ts:80,179`) — SSE `/stream`, `/emit`, `/stats` (`src/routes/realtime.ts`).
- **Producer path:** `RealtimeEventBridge` subscribes to the EventBus and forwards matching
  `PrismEvent`s into WS/SSE rooms (`src/engines/RealtimeEventBridge.ts:148-202`,
  `eventBus.subscribe(mapping.busPattern, ...)`); event types include the business/portal-relevant
  `quote:update`, `job:progress`, `job:complete`, `notification`, `safety:alert` (`realtime.ts:13-19`).
- **Consumer (the surface):** the frontend consumes the SSE stream via `web/src/hooks/useSSE.ts`
  (referenced from `web/src/api/client.ts`). This is the concrete portal/ERP-facing surface backed by
  realtime.

**Honest caveat (R12):** the transport + bridge + frontend consumer are all present, but I did not
trace which specific business events are *published to the EventBus with a bus-pattern that the bridge
forwards* (i.e. the depth of portal-event producers). The infrastructure backs a surface; verifying that
e.g. a milestone-advance or quote-update actually emits a forwarded bus event is a separate depth check.

---

## Status
- Part B (REALTIME-VERIFY): **DONE — verified backed** (with the producer-depth caveat above).
- Part A (ALLOWLIST-WRITE-REVIEW): **DONE — reviewed; recommendation = keep deny-by-default; opening
  writes is operator-gated `U-HOTEL-ALLOWLIST-WRITE-ENABLE`.** No allowlist change made this unit.

---

## UPDATE 2026-06-09 -- U-HOTEL-ALLOWLIST-WRITE-ENABLE SHIPPED (operator approved the role model)

Commits `18f37c812e` (core) + `d8d2824cf2` (polish). 3-of-3 PASS, 23/23 route tests.
- OPENED behind a per-action manager-tier role gate (`BUSINESS_WRITE_ROLE_MAP`; lead|supervisor|hr_manager|admin):
  `handoff_counterparty_respond`, `handoff_manager_approve`, `handoff_mark_executed`, `handoff_cancel`
  -- workflow-state only, frozen audit trail, status-guarded. Reused existing RBAC (`requireRole`/`ROLE_DB`/
  `req.userRoles`) + the global `auditLog` middleware (`routes/index.ts:114`) -- no new auth/audit code.
- STAYS 403 (proven for admin in tests): `po_approve`, `hr_pto_approve`, `pto_approve_request`, all
  `gl_*`/`payroll_*`/`order_create` -- in neither the read Set nor the write-map.
- OPEN FOLLOW-UP (scrutiny A-P2, NOT built): bind the engine identity param (responder_employee_id etc.)
  to `req.userId` server-side -- the HTTP gate is role-only; the engine identity-check uses caller-asserted
  params. Needs an auth-user -> employee-id mapping that does not yet exist. Bounded (workflow-only,
  PII-free, audited with the true userId).
- PRE-EXISTING BUGS flagged by grounding (all in still-403 actions; separate units): `hr_pto_approve`
  double-apply (no status guard), empty `approved_by` accepted, two divergent PTO approval engines (R7).
