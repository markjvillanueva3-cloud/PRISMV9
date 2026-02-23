# PHASE R32: COMPLIANCE & REGULATORY INTELLIGENCE
## Status: IN PROGRESS

### Phase Vision

R32 adds compliance and regulatory intelligence — audit management, regulatory tracking,
CAPA lifecycle management, and compliance metrics. This provides the compliance backbone
for ISO, FDA, OSHA, and industry-specific regulatory requirements.

### Composition Dependencies

```
R32 builds on:
  R18 (Quality)        — nonconformance data feeds CAPA
  R22 (Traceability)   — lot tracking for regulatory recall
  R27 (Doc Control)    — SOPs and procedures for audit evidence
  R30 (Metrology)      — calibration compliance for audit findings
  R31 (Cost)           — cost of quality and compliance cost tracking

R32 new engines:
  NEW: AuditEngine             ← internal/external audit scheduling, findings, evidence
  NEW: RegulatoryEngine        ← regulatory requirements, submissions, permit tracking
  NEW: CAPAEngine              ← corrective/preventive actions, 8D, root cause, effectiveness
  NEW: ComplianceMetricsEngine ← compliance KPIs, audit scores, overdue tracking, dashboards
  Extended: CCELiteEngine      ← compliance recipes
```

### Milestone Plan

| MS | Title | Effort | Entry | Status |
|----|-------|--------|-------|--------|
| MS0 | Phase Architecture | S (10) | R31 COMPLETE | PASS |
| MS1 | AuditEngine — Audit Scheduling & Findings Management | M (25) | MS0 COMPLETE | — |
| MS2 | RegulatoryEngine — Regulatory Requirements & Submissions | M (25) | MS0 COMPLETE | — |
| MS3 | CAPAEngine — Corrective & Preventive Action Lifecycle | M (25) | MS0 COMPLETE | — |
| MS4 | ComplianceMetricsEngine — Compliance KPIs & Dashboards | M (25) | MS0 COMPLETE | — |
| MS5 | Compliance CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE | — |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE | — |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| AuditEngine (NEW) | aud_schedule, aud_finding, aud_evidence, aud_close |
| RegulatoryEngine (NEW) | reg_require, reg_submit, reg_permit, reg_change |
| CAPAEngine (NEW) | capa_initiate, capa_rootcause, capa_action, capa_verify |
| ComplianceMetricsEngine (NEW) | comp_kpi, comp_score, comp_overdue, comp_dashboard |
| CCELiteEngine (ext) | 2 new recipes: audit_response, regulatory_compliance |
