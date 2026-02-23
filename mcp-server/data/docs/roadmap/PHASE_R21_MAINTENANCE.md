# PHASE R21: PREDICTIVE MAINTENANCE & ASSET INTELLIGENCE
## Status: in-progress | MS0 IN PROGRESS

### Phase Vision

R21 builds an asset intelligence layer on top of R15-R20, enabling predictive
maintenance scheduling, machine health monitoring, shop floor analytics, and
structured multi-engine reporting. This transforms PRISM from a calculation
engine into a proactive manufacturing intelligence platform.

### Composition Dependencies

```
R21 builds on:
  R15 (Physics)        — tool life models, force/thermal predictions
  R17 (Closed-Loop)    — measurement feedback, SPC, calibration
  R18 (Quality)        — Cpk, tool wear compensation, GD&T
  R19 (Decisions)      — root cause analysis, production readiness
  R20 (Orchestration)  — workflow composition, adaptive learning, integration gateway

R21 new engines:
  NEW: PredictiveMaintenanceEngine  ← tool wear prediction, replacement scheduling
  NEW: AssetHealthEngine            ← machine health scoring, degradation tracking
  NEW: ShopFloorAnalyticsEngine     ← OEE, utilization, bottleneck detection
  NEW: ReportingEngine              ← structured multi-engine report generation
  Extended: CCELiteEngine           ← maintenance recipes
```

### Milestone Plan

| MS | Title | Effort | Entry |
|----|-------|--------|-------|
| MS0 | Phase Architecture | S (10) | R20 COMPLETE |
| MS1 | PredictiveMaintenanceEngine — Wear Prediction & Scheduling | M (25) | MS0 COMPLETE |
| MS2 | AssetHealthEngine — Machine Health & Degradation | M (25) | MS0 COMPLETE (parallel) |
| MS3 | ShopFloorAnalyticsEngine — OEE & Capacity Planning | M (25) | MS0 COMPLETE (parallel) |
| MS4 | ReportingEngine — Multi-Engine Report Aggregation | M (25) | MS0 COMPLETE (parallel) |
| MS5 | Maintenance CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| PredictiveMaintenanceEngine (NEW) | pm_predict_wear, pm_schedule, pm_failure_risk, pm_optimize_intervals |
| AssetHealthEngine (NEW) | ah_score, ah_degradation, ah_maintenance_plan, ah_compare |
| ShopFloorAnalyticsEngine (NEW) | sf_oee, sf_utilization, sf_bottleneck, sf_capacity |
| ReportingEngine (NEW) | rpt_generate, rpt_summary, rpt_trend, rpt_export |
| CCELiteEngine (ext) | 2 new recipes: predictive_maintenance, asset_health_report |

### MS0 Deliverables
1. Phase architecture defined (this document)
2. Engine capabilities mapped to R15-R20 data sources
3. Milestone dependencies mapped
