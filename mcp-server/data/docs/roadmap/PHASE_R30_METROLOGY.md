# PHASE R30: METROLOGY & CALIBRATION INTELLIGENCE
## Status: IN PROGRESS

### Phase Vision

R30 adds metrology and calibration intelligence — calibration management, gage R&R studies,
inspection planning, and metrology data analysis. This provides the measurement backbone
for quality assurance, ensuring instruments are calibrated, capable, and data-driven.

### Composition Dependencies

```
R30 builds on:
  R18 (Quality)        — SPC data feeds measurement analysis
  R22 (Traceability)   — lot/serial tracking for instrument traceability
  R27 (Doc Control)    — calibration certificates and procedures
  R29 (Lean/CI)        — Six Sigma capability studies use measurement data

R30 new engines:
  NEW: CalibrationEngine     ← calibration scheduling, certificates, recall tracking, traceability
  NEW: GageRREngine          ← gage repeatability & reproducibility, MSA, measurement uncertainty
  NEW: InspectionPlanEngine  ← inspection plans, sampling strategies, FAI, dimensional analysis
  NEW: MetrologyDataEngine   ← CMM data analysis, measurement SPC, drift detection, correlation
  Extended: CCELiteEngine    ← metrology recipes
```

### Milestone Plan

| MS | Title | Effort | Entry | Status |
|----|-------|--------|-------|--------|
| MS0 | Phase Architecture | S (10) | R29 COMPLETE | PASS |
| MS1 | CalibrationEngine — Scheduling & Certificate Management | M (25) | MS0 COMPLETE | — |
| MS2 | GageRREngine — Gage R&R & Measurement System Analysis | M (25) | MS0 COMPLETE | — |
| MS3 | InspectionPlanEngine — Inspection Plans & FAI Management | M (25) | MS0 COMPLETE | — |
| MS4 | MetrologyDataEngine — CMM Data Analysis & Drift Detection | M (25) | MS0 COMPLETE | — |
| MS5 | Metrology CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE | — |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE | — |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| CalibrationEngine (NEW) | cal_schedule, cal_cert, cal_recall, cal_trace |
| GageRREngine (NEW) | grr_study, grr_msa, grr_uncertainty, grr_linearity |
| InspectionPlanEngine (NEW) | insp_plan, insp_sample, insp_fai, insp_dimension |
| MetrologyDataEngine (NEW) | met_cmm, met_spc, met_drift, met_correlate |
| CCELiteEngine (ext) | 2 new recipes: measurement_validation, calibration_compliance |
