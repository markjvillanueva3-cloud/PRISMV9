# HOTEL/U-HOTEL-WIRE-COMPLIANCE — [MAIN-FORCE] [HOTEL]/U-HOTEL-WIRE-COMPLIANCE (slot:hotel): wire 7 dead OSHA + internal-audit + management-review FE calls to existing prism_business actions via rfqRoute

**Commit:** `6a361cfb01c8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T12:09:37-05:00
**Tags:** hotel, u-hotel-wire-compliance, auto-distilled

## Subject
[MAIN-FORCE] [HOTEL]/U-HOTEL-WIRE-COMPLIANCE (slot:hotel): wire 7 dead OSHA + internal-audit + management-review FE calls to existing prism_business actions via rfqRoute

## Body
```
[MAIN-FORCE] [HOTEL]/U-HOTEL-WIRE-COMPLIANCE (slot:hotel): wire 7 dead OSHA + internal-audit + management-review FE calls to existing prism_business actions via rfqRoute

OSHACompliancePage + AuditManagerPage create/schedule buttons were dead (no route). Wired (all
actions verified present in businessDispatcher 2026-06-25, all reuse rfqRoute envelope-unwrap for
the prism_business {type,text} slimResponse dead-panel class):
  POST /osha-incident-create  -> osha_record_incident
  POST /osha-log-300          -> osha_300_log
  POST /audit-schedule        -> internal_audit_schedule
  POST /audit-finding-create  -> internal_audit_record_finding
  POST /audit-capa-create     -> audit_capa_create
  POST /management-review-package -> nc_management_review_summary {since: start_date}
  POST /audit-mgmt-review        -> nc_management_review_summary {since: period_start}

requireRole(lead/hr_manager/admin) on mutations; osha-log-300 verifyToken-only (generated report).

Per-file 2-arm scrutiny caught + fixed a P0 BEFORE ship: management-review-package was first mapped
to management_review_schedule (SCHEDULES a meeting; requires chair_employee_id + scheduled_for +
>=2 attendees -> would 400 on the FE date-window body). Remapped both review routes to the
range-summary action nc_management_review_summary (START -> since; engine has no upper bound so
end_date is not honored -- logged, not silently assumed). Both arms re-reviewed PASS.

DEFERRED to Cluster-B (need NEW list actions + tests): GET /audit-schedules (no list-all action)
+ GET /audit-findings (pre-existing 404 making AuditManagerPage.loadDesk Promise.all reject).

7 target paths now backed (audit-schedules intentionally still dead). build:fast clean; erp.ts
tsc-clean (2 pre-existing ReinforcementLearningCAMFeedbackEngine TS2554 errors are kilo-domain,
unrelated).
```

## Files touched (2)
- mcp-server/src/routes/erp.ts | 34 ++++++++++++++++++++++++++++++++++
- 1 file changed, 34 insertions(+)

## Lessons surfaced in commit body
- till dead). build:fast clean; erp.ts

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6a361cfb01c8`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._