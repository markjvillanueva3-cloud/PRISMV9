# PHASE R31: COST ACCOUNTING & FINANCIAL INTELLIGENCE
## Status: IN PROGRESS

### Phase Vision

R31 adds cost accounting and financial intelligence — product costing, variance analysis,
activity-based costing, and manufacturing financial metrics. This provides the financial
backbone for cost optimization, profitability analysis, and margin improvement.

### Composition Dependencies

```
R31 builds on:
  R18 (Quality)        — scrap/rework costs feed variance analysis
  R24 (Workforce)      — labor rates and hours for cost allocation
  R25 (Supply Chain)   — material costs and purchase price variance
  R26 (Prod Planning)  — standard hours, cycle times for cost standards
  R29 (Lean/CI)        — waste costs, OEE impact on financial metrics

R31 new engines:
  NEW: ProductCostEngine       ← standard costing, BOM rollup, labor/overhead allocation
  NEW: VarianceAnalysisEngine  ← PPV, labor rate/efficiency, overhead spending/volume variance
  NEW: ABCostingEngine         ← activity-based costing, cost drivers, cost pool allocation
  NEW: FinancialMetricsEngine  ← gross margin, contribution margin, break-even, cost per unit
  Extended: CCELiteEngine      ← cost analysis recipes
```

### Milestone Plan

| MS | Title | Effort | Entry | Status |
|----|-------|--------|-------|--------|
| MS0 | Phase Architecture | S (10) | R30 COMPLETE | PASS |
| MS1 | ProductCostEngine — Standard Costing & BOM Rollup | M (25) | MS0 COMPLETE | — |
| MS2 | VarianceAnalysisEngine — PPV, Labor & Overhead Variance | M (25) | MS0 COMPLETE | — |
| MS3 | ABCostingEngine — Activity-Based Costing & Cost Drivers | M (25) | MS0 COMPLETE | — |
| MS4 | FinancialMetricsEngine — Margins, Break-Even & Cost KPIs | M (25) | MS0 COMPLETE | — |
| MS5 | Cost Accounting CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE | — |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE | — |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| ProductCostEngine (NEW) | cost_standard, cost_bom, cost_labor, cost_overhead |
| VarianceAnalysisEngine (NEW) | var_ppv, var_labor, var_overhead, var_summary |
| ABCostingEngine (NEW) | abc_activity, abc_driver, abc_allocate, abc_product |
| FinancialMetricsEngine (NEW) | fin_margin, fin_breakeven, fin_costunit, fin_dashboard |
| CCELiteEngine (ext) | 2 new recipes: product_profitability, cost_optimization |
