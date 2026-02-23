# PHASE R17: CLOSED-LOOP MANUFACTURING FEEDBACK
## Status: in-progress | MS0 IN PROGRESS

### Phase Vision

R17 closes the prediction-to-reality loop by connecting actual measurement data back
to R15/R16 physics and simulation models. This enables continuous model improvement
and statistical process control:
- Measurement data ingestion (CMM, surface profilometer, force dynamometer)
- Statistical process control (SPC) with X-bar/R, CUSUM, EWMA charts
- Bayesian model calibration updating physics coefficients from actuals
- Batch analytics for trend analysis and KPI tracking
- Process drift detection with automatic alert generation

### Composition Dependencies

```
R17 builds on:
  R2  (Safety)            — parameter bounds, safety classification
  R7  (Intelligence)      — adaptive control, job learning, physics prediction
  R15 (Physics)           — Kienzle, Taylor, thermal, surface finish models
  R16 (Simulation)        — cutting sim, digital twin, process verification

R17 new engines:
  NEW: MeasurementFeedbackEngine  ← measurement ingestion + model error computation
  NEW: ProcessDriftEngine          ← SPC charts, process capability, drift detection
  NEW: ModelCalibrationEngine      ← Bayesian updating of physics model parameters
  NEW: BatchAnalyticsEngine        ← cross-job KPIs, trend analysis, batch comparison
  Extended: CCELiteEngine          ← closed-loop recipes
```

### Milestone Plan

| MS | Title | Effort | Entry |
|----|-------|--------|-------|
| MS0 | Phase Architecture | S (10) | R16 COMPLETE |
| MS1 | MeasurementFeedbackEngine — Data Ingestion + Error | L (30) | MS0 COMPLETE |
| MS2 | ProcessDriftEngine — SPC Charts + Capability | M (25) | MS1 COMPLETE |
| MS3 | ModelCalibrationEngine — Bayesian Parameter Update | M (25) | MS1 COMPLETE (parallel) |
| MS4 | BatchAnalyticsEngine — KPIs + Trends | M (20) | MS1 COMPLETE (parallel) |
| MS5 | Closed-Loop CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| MeasurementFeedbackEngine (NEW) | mfb_record, mfb_compare, mfb_error_stats, mfb_correction |
| ProcessDriftEngine (NEW) | spc_xbar_r, spc_cusum, spc_ewma, spc_capability |
| ModelCalibrationEngine (NEW) | cal_update, cal_status, cal_reset, cal_validate |
| BatchAnalyticsEngine (NEW) | batch_kpi, batch_trend, batch_compare, batch_summary |
| CCELiteEngine (ext) | 2 new recipes: closed_loop_calibrate, continuous_improvement |

### MS0 Deliverables (IN PROGRESS)
1. Phase architecture defined (this document)
2. Existing adaptive/learning engines audited (AdaptiveControlEngine, JobLearningEngine)
3. R15/R16 model parameter integration points identified
4. Milestone dependencies mapped
