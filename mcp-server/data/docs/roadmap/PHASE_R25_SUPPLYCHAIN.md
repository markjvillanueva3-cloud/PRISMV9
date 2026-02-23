# PHASE R25: SUPPLY CHAIN & PROCUREMENT INTELLIGENCE
## Status: IN PROGRESS | MS0 COMPLETE

### Phase Vision

R25 builds a supply chain intelligence layer for supplier performance tracking,
material sourcing optimization, lead time forecasting, and procurement analytics.
This connects the manufacturing floor to the supply side — enabling data-driven
purchasing decisions, supplier risk mitigation, and material availability planning.

### Composition Dependencies

```
R25 builds on:
  R1  (Registries)     — material registry, tool registry (sourcing targets)
  R21 (Maintenance)    — spare parts inventory (procurement planning)
  R22 (Traceability)   — material lot tracking (supplier tracing)
  R23 (Sustainability) — supplier carbon footprint (green sourcing)
  R24 (Workforce)      — knowledge capture (supplier lessons learned)

R25 new engines:
  NEW: SupplierManagementEngine     ← supplier scorecard, performance tracking, risk assessment
  NEW: MaterialSourcingEngine       ← sourcing optimization, price comparison, availability
  NEW: LeadTimeEngine               ← lead time forecasting, delivery tracking, disruption alerts
  NEW: ProcurementAnalyticsEngine   ← spend analysis, purchase optimization, contract management
  Extended: CCELiteEngine           ← supply chain recipes
```

### Milestone Plan

| MS | Title | Effort | Entry |
|----|-------|--------|-------|
| MS0 | Phase Architecture | S (10) | R24 COMPLETE |
| MS1 | SupplierManagementEngine — Scorecard & Risk Assessment | M (25) | MS0 COMPLETE |
| MS2 | MaterialSourcingEngine — Sourcing & Price Optimization | M (25) | MS0 COMPLETE (parallel) |
| MS3 | LeadTimeEngine — Forecasting & Delivery Tracking | M (25) | MS0 COMPLETE (parallel) |
| MS4 | ProcurementAnalyticsEngine — Spend Analysis & Contracts | M (25) | MS0 COMPLETE (parallel) |
| MS5 | Supply Chain CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| SupplierManagementEngine (NEW) | sup_scorecard, sup_risk, sup_audit, sup_compare |
| MaterialSourcingEngine (NEW) | src_price, src_availability, src_alternative, src_optimize |
| LeadTimeEngine (NEW) | lt_forecast, lt_track, lt_disrupt, lt_expedite |
| ProcurementAnalyticsEngine (NEW) | proc_spend, proc_contract, proc_optimize, proc_report |
| CCELiteEngine (ext) | 2 new recipes: supplier_evaluation, procurement_optimization |
