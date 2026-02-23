# PHASE R26: PRODUCTION PLANNING & SCHEDULING INTELLIGENCE
## Status: IN PROGRESS | MS0 COMPLETE

### Phase Vision

R26 builds a production planning intelligence layer for job scheduling,
machine allocation, production sequencing, and capacity planning. This is
the core MES (Manufacturing Execution System) planning layer — connecting
customer orders to shop floor execution through optimized schedules, bottleneck
detection, and real-time production monitoring.

### Composition Dependencies

```
R26 builds on:
  R1  (Registries)     — machine registry, tool registry (resource pools)
  R21 (Maintenance)    — machine availability, planned downtime
  R24 (Workforce)      — operator availability, skill-based assignment
  R25 (Supply Chain)   — material availability, lead times

R26 new engines:
  NEW: JobSchedulingEngine          ← job queue, priority scheduling, due-date tracking
  NEW: MachineAllocationEngine      ← resource allocation, setup minimization, load balancing
  NEW: ProductionSequencingEngine   ← operation sequencing, bottleneck detection, flow optimization
  NEW: CapacityPlanningEngine       ← capacity forecasting, demand matching, overtime planning
  Extended: CCELiteEngine           ← production planning recipes
```

### Milestone Plan

| MS | Title | Effort | Entry |
|----|-------|--------|-------|
| MS0 | Phase Architecture | S (10) | R25 COMPLETE |
| MS1 | JobSchedulingEngine — Job Queue & Priority Scheduling | M (25) | MS0 COMPLETE |
| MS2 | MachineAllocationEngine — Resource Allocation & Load Balancing | M (25) | MS0 COMPLETE (parallel) |
| MS3 | ProductionSequencingEngine — Sequencing & Bottleneck Detection | M (25) | MS0 COMPLETE (parallel) |
| MS4 | CapacityPlanningEngine — Forecasting & Demand Matching | M (25) | MS0 COMPLETE (parallel) |
| MS5 | Production Planning CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| JobSchedulingEngine (NEW) | job_schedule, job_priority, job_status, job_reschedule |
| MachineAllocationEngine (NEW) | alloc_assign, alloc_balance, alloc_setup, alloc_conflict |
| ProductionSequencingEngine (NEW) | seq_optimize, seq_bottleneck, seq_flow, seq_reorder |
| CapacityPlanningEngine (NEW) | cap_forecast, cap_demand, cap_overtime, cap_report |
| CCELiteEngine (ext) | 2 new recipes: production_schedule, capacity_analysis |
