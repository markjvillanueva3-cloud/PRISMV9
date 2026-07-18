# HOTEL/U-EMPLOYEE-ROLE-ACADEMY-INJECTION — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-ROLE-ACADEMY-INJECTION (slot:hotel iter15 /goal): role-based PRISM Academy course injection bridge — auto-inject curricula relative to user's role in the company

**Commit:** `4e521277920c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T20:57:34-05:00
**Tags:** hotel, u-employee-role-academy-injection, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-ROLE-ACADEMY-INJECTION (slot:hotel iter15 /goal): role-based PRISM Academy course injection bridge — auto-inject curricula relative to user's role in the company

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-ROLE-ACADEMY-INJECTION (slot:hotel iter15 /goal): role-based PRISM Academy course injection bridge — auto-inject curricula relative to user's role in the company

— EmployeeRoleAcademyInjectionEngine: 17 ShopRole types (apprentice/operator/setup/machinist/programmer/inspector/qa_lead/foreman/buyer/estimator/scheduler/shipping/receiving/accounting/sales/office_admin/owner) each mapped to RoleCourseRequirements record (tier + required_courses + refresher_courses + growth_courses + growth_target_role + min_pass_pct). Course IDs reference CurriculumEngine course-0a..course-34. 4 injection triggers: injectOnHire (full required stack, idempotent), injectOnPromotion (delta of new − passed), injectOnIncident (12 incident_category → remediation map: loto, hazcom_sds, forklift, ppe, respirator, hearing_protection, eye_protection, machine_guarding, ergonomics, electrical_safety, accuracy_nc, scrap_event), recommend (fresh required+refresher+growth+rationale picture). Composes CurriculumEngine (no rebuild) + SafetyTrainingRecordEngine (cadence-aware refresher).

— Tests: 23/23 PASS. Variability: apprentice(4)<operator(6)<machinist(10)<programmer(11). Promotion delta verified (operator→machinist assigns 5 new). Idempotency verified. Hotel-soul invariants: Object.frozen returns, R12 fail-loud (unknown role, missing employee_id, evidence_ref required on passed, unknown incident_category, no role set), PII-redacted (only employee_id, no names/SSN/DOB).

— businessDispatcher: +10 actions (role_academy_list_roles, _get_curriculum, _set_employee_role, _get_employee_role, _inject_on_hire, _inject_on_promotion, _inject_on_incident, _recommend, _record_outcome, _list_assignments). Lazy import pattern.

— /system-viz synergy: hotel-domain-features classifier extended (role_academy_/management_review_/internal_audit_ regex → business axis). Roost regenerated → 293 nodes (3 roosts, +26 from 267). by_axis: safety=28, accounting=54, business=211, unmatched=388.

Bridges: HR onboarding flow → academy curriculum auto-assignment. Promotion event → delta curriculum. Safety/QA incident → targeted remediation. Closes the gap where PRISM Academy existed (CurriculumEngine, 35 courses) but had no role-aware injection layer.
```

## Files touched (5)
- .../EmployeeRoleAcademyInjectionEngine.test.ts     | 292 ++++++++++++
- .../engines/EmployeeRoleAcademyInjectionEngine.ts  | 524 +++++++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  65 +++
- scripts/generate-hotel-domain-features.mjs         |   3 +
- 4 files changed, 884 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4e521277920c`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._