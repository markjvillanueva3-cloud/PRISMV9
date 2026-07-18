# FRONTEND-APP/U-Q-LATHE-ERP-WIRE — [MAIN-FORCE] [FRONTEND-APP]/U-Q-LATHE-ERP-WIRE (slot:quebec): build & route the orphan LatheERPDashboard onto real ERP data (operator 'build & route them')

**Commit:** `42a0d6977b6c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:27:55-05:00
**Tags:** frontend-app, u-q-lathe-erp-wire, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-LATHE-ERP-WIRE (slot:quebec): build & route the orphan LatheERPDashboard onto real ERP data (operator 'build & route them')

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-LATHE-ERP-WIRE (slot:quebec): build & route the orphan LatheERPDashboard onto real ERP data (operator 'build & route them')

LatheERPDashboard (6-tile lathe business-intelligence dashboard: pipeline/billing/inventory/
schedule/profitability/quote-accuracy) was a well-built, design-system, R12-clean page (real
per-tile loading/error/empty states, no fabricated data) but ORPHANED -- not routed, and its
defaultDispatch POSTed to a STALE path '/api/dispatch/business' (never mounted; the real route is
'/api/v1/business/dispatch') with NO auth token and NO envelope unwrap -> every tile would have failed.

Build (3 surgical changes, R8/R11 -- reuse the canonical client, don't reinvent):
- LatheERPDashboard.defaultDispatch -> callBusinessAction + unwrapBusiness (web/src/api/businessDispatch.ts):
  fixes the path, adds the auth token + 15s timeout + deny-by-default allowlist gate, and normalizes the
  dispatcher's {success,data}-or-bare envelope so each tile gets its plain payload.
- business-dispatch-allowlist.ts: allowlist the 5 actions the page binds (lathe_order_pipeline,
  billing_stats, lathe_inv_snapshot, lathe_profit_portfolio, lathe_actual_cost_accuracy) -- all READ-ONLY
  analytics, none a GL-write/payroll/escrow/bill-payment/PII-export (per the allowlist's documented rule).
  NOTE (hotel review): 3 are financial-AGGREGATE reads exposed to any authenticated session like the
  existing vendor/marketplace BI; if manager-only revenue RBAC is wanted, add a read-role-map (separate).
- App.tsx: route 'lathe-erp-dashboard' gated lazyElement(secure(<LatheERPDashboard/>, 'lead')) (financial
  surface -> lead+ clearance, matching SchedulingPage); default-export lazy via lazyNamed(...,'default').

Verified: web tsc GREEN; LatheERPDashboard.test.tsx 12/12; businessDispatchRoute.test.ts 23/23 (allowlist
guard intact); route->action contract CLEAN; LF1 /api/dispatch refs 3->2 (this page no longer dead-wired).
1 of 8 orphan pages built+routed; remaining 7 are old hardcoded-data prototypes or dupes (see handoff).
```

## Files touched (4)
- mcp-server/src/data/business-dispatch-allowlist.ts | 12 ++++++++++++
- mcp-server/web/src/App.tsx                         |  2 ++
- mcp-server/web/src/pages/LatheERPDashboard.tsx     | 18 ++++++++----------
- 3 files changed, 22 insertions(+), 10 deletions(-)

## Lessons surfaced in commit body
- tile lathe business-intelligence dashboard: pipeline/billing/inventory/
- tile loading/error/empty states, no fabricated data) but ORPHANED -- not routed, and its
- tile would have failed.
- tile gets its plain payload.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 42a0d6977b6c`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._