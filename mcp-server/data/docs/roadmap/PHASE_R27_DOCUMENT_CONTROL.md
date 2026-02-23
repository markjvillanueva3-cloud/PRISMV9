# PHASE R27: DOCUMENT CONTROL & ENGINEERING CHANGE INTELLIGENCE
## Status: IN PROGRESS

### Phase Vision

R27 builds a document control intelligence layer for engineering change management,
bill of materials (BOM) tracking, revision control, and document workflow automation.
This is a foundational MES component — every manufacturing operation needs to track
what revision of which drawing is active, manage engineering changes systematically,
and maintain BOM accuracy across product configurations.

### Composition Dependencies

```
R27 builds on:
  R1  (Registries)     — part registry, tool registry (BOM line items)
  R22 (Traceability)   — lot/serial tracing (BOM lineage, change history)
  R25 (Supply Chain)   — BOM drives procurement, supplier part mapping
  R26 (Prod Planning)  — engineering changes affect production schedules

R27 new engines:
  NEW: ECNManagementEngine       ← ECN creation, impact analysis, approval workflow, implementation
  NEW: BOMEngine                 ← multi-level BOM, comparison, configuration management, where-used
  NEW: RevisionControlEngine     ← revision tracking, effectivity dates, supersedure, audit trail
  NEW: DocumentWorkflowEngine    ← approval routing, document distribution, compliance, sign-off
  Extended: CCELiteEngine        ← document control recipes
```

### Milestone Plan

| MS | Title | Effort | Entry | Status |
|----|-------|--------|-------|--------|
| MS0 | Phase Architecture | S (10) | R26 COMPLETE | PASS |
| MS1 | ECNManagementEngine — Change Tracking & Impact Analysis | M (25) | MS0 COMPLETE | — |
| MS2 | BOMEngine — Multi-Level BOM & Configuration Management | M (25) | MS0 COMPLETE | — |
| MS3 | RevisionControlEngine — Revision Tracking & Effectivity | M (25) | MS0 COMPLETE | — |
| MS4 | DocumentWorkflowEngine — Approval Routing & Compliance | M (25) | MS0 COMPLETE | — |
| MS5 | Document Control CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE | — |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE | — |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| ECNManagementEngine (NEW) | ecn_create, ecn_impact, ecn_approve, ecn_implement |
| BOMEngine (NEW) | bom_structure, bom_compare, bom_whereused, bom_configure |
| RevisionControlEngine (NEW) | rev_track, rev_effectivity, rev_supersede, rev_audit |
| DocumentWorkflowEngine (NEW) | doc_route, doc_sign, doc_distribute, doc_comply |
| CCELiteEngine (ext) | 2 new recipes: engineering_change, document_release |
