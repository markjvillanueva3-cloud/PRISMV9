# QUEBEC-FRONTEND-WIRING/U-WIRE-AUDIT — [MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-WIRE-AUDIT (slot:quebec): fleet-wide FE<->backend wiring auditor -- the gap-list harness for "wire all backend to frontend"

**Commit:** `a77baa20fa10` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T08:49:01-05:00
**Tags:** quebec-frontend-wiring, u-wire-audit, auto-distilled

## Subject
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-WIRE-AUDIT (slot:quebec): fleet-wide FE<->backend wiring auditor -- the gap-list harness for "wire all backend to frontend"

## Body
```
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-WIRE-AUDIT (slot:quebec): fleet-wide FE<->backend wiring auditor -- the gap-list harness for "wire all backend to frontend"

General sibling of audit-erp-fe-route-wiring.mjs (which is ERP/client.ts-scoped). Scans EVERY web/src/api/*.ts module (98) against all registered routes; route resolution is import-anchored so it does NOT false-flag exportRoutes/threads/shopLive the way the ERP tool does. Live: 1219 routes, 891 literal call-sites, 170 dead-wire CANDIDATES across 37 modules -- the finite, prioritizable gap list (the loss function: N -> 0). calc.ts/toolCrib.ts = 0, confirming this session's two wiring fixes.

- scripts/audit-fe-route-wiring.mjs: runAudit() + norm(); main-guarded so importing norm has no side effects. R12 limits documented inline (literal call-sites only; ~4 residual ${} multi-segment template artifacts + base-vs-suffix nuances need hand-triage -- 170 is a CANDIDATE count, not a verified total).
- scripts/audit-fe-route-wiring.test.ts: 7 norm() tests pinning the query-string-vs-path-param distinction (reverting it re-inflates the false-positive count).

The bulk of candidates are cross-domain (orchestration/admin/cad/erp) -- confirms "wire all backend to all frontend" is a multi-session, multi-slot program, not a single unit.
```

## Files touched (3)
- mcp-server/scripts/audit-fe-route-wiring.mjs     | 138 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/scripts/audit-fe-route-wiring.test.ts |  32 +++++++++++++++
- 2 files changed, 170 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a77baa20fa10`
- Milestone envelope: `mcp-server/data/milestones/QUEBEC-FRONTEND-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._