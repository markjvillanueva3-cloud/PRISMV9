# PHASE R19: INTEGRATED DECISION SUPPORT
## Status: in-progress | MS0 IN PROGRESS

### Phase Vision

R19 is the "capstone" layer that synthesizes R15-R18 into actionable manufacturing
decisions. Rather than requiring users to invoke individual physics, simulation, SPC,
or optimization actions separately, R19 provides holistic decision engines that
automatically combine multiple data sources to deliver recommendations.

### Composition Dependencies

```
R19 builds on:
  R15 (Physics)        — force, thermal, surface, tool life models
  R16 (Simulation)     — cutting sim, digital twin, sensitivity, verification
  R17 (Closed-Loop)    — measurement feedback, SPC, calibration, batch analytics
  R18 (Quality)        — GD&T chains, multi-pass, Cpk, tool wear compensation
  R7  (Intelligence)   — optimization, scenario analysis

R19 new engines:
  NEW: DecisionSupportEngine        ← multi-factor parameter recommendation
  NEW: ProductionReadinessEngine    ← pre-production go/no-go scoring
  NEW: RootCauseAnalysisEngine      ← quality issue → probable cause tracing
  NEW: CostQualityTradeoffEngine    ← Pareto optimization: cost vs quality
  Extended: CCELiteEngine           ← decision support recipes
```

### Milestone Plan

| MS | Title | Effort | Entry |
|----|-------|--------|-------|
| MS0 | Phase Architecture | S (10) | R18 COMPLETE |
| MS1 | DecisionSupportEngine — Parameter Recommendation | M (25) | MS0 COMPLETE |
| MS2 | ProductionReadinessEngine — Go/No-Go Assessment | M (25) | MS0 COMPLETE (parallel) |
| MS3 | RootCauseAnalysisEngine — Issue Diagnosis | M (25) | MS0 COMPLETE (parallel) |
| MS4 | CostQualityTradeoffEngine — Pareto Optimization | M (25) | MS0 COMPLETE (parallel) |
| MS5 | Decision CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| DecisionSupportEngine (NEW) | ds_recommend, ds_validate, ds_compare, ds_explain |
| ProductionReadinessEngine (NEW) | pr_assess, pr_checklist, pr_risk, pr_approve |
| RootCauseAnalysisEngine (NEW) | rca_diagnose, rca_tree, rca_correlate, rca_action_plan |
| CostQualityTradeoffEngine (NEW) | cqt_pareto, cqt_optimize, cqt_sensitivity, cqt_scenario |
| CCELiteEngine (ext) | 2 new recipes: decision_pipeline, production_readiness |

### MS0 Deliverables
1. Phase architecture defined (this document)
2. Decision flow mapping across R15-R18 data sources
3. Milestone dependencies mapped
