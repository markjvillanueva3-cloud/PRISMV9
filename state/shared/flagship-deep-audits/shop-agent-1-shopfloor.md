# Shop+HR+Payroll Audit — Agent 1: Shop Floor Engines

## Coverage (grep-verified counts)
- **Total shop-floor engines found:** 41
- **Queried catalog:** WorkOrder, JobLifecycle, JobScheduling, Operator, Attendance, Time, OEE, Machine, Capacity, Kanban, Quality, Scrap, Rework, ShopFloor, Andon
- **Match rate:** 41/19 target classes = 216% (significant overlap; many hybrid engines)

## Engine Inventory (verified via Glob + Bash)

| Engine | Category | Status |
|--------|----------|--------|
| JobLifecycleEngine | Job Tracking (13-state) | ✓ Active |
| CapacityPlanningEngine | Capacity/Bottleneck | ✓ Active |
| JobShopSchedulingEngine | Scheduling (deprecated) | ⚠️ Consolidated |
| ShopSchedulerEngine | Scheduling (canonical) | ✓ Active |
| OEECalculatorEngine | Machine Utilization | ✓ Active |
| ShopFloorCheckInEngine | Department Check-in | ✓ Active |
| TimeClockEngine | Time Tracking | ✓ Active |
| OperatorDashboardOrchestratorEngine | Operator Dashboard | ✓ Active |
| ShiftScheduleOptimizerEngine | Shift Scheduling | ✓ Active |
| CertificationTrackingEngine | Operator Certification | ✓ Active |
| MilestoneTrackingEngine | Job Milestones | ✓ Active |
| ScrapRootCauseEngine | Quality/Scrap | ✓ Active |
| QualityManagementEngine | Quality Control | ✓ Active |
| JobTravelerEngine | Job Routing/Traveler | ✓ Active |
| DurableJobQueueEngine | Queue Management | ✓ Active |

**Not Found:** WorkOrderEngine, OperatorAssignmentEngine, TimeTrackingEngine (consolidated), OEEEngine (consolidated→OEECalculatorEngine), MachineUtilizationEngine, DowntimeTrackingEngine, ProductionScheduleEngine, KanbanEngine, QualityAlertEngine, ReworkEngine, AndonEngine.

## Strengths / Gaps

**Strengths:**
- Robust job lifecycle (13 states: quoted→closed)
- OEE calculation with TPM six-big-losses model
- Capacity planning with bottleneck detection & what-if analysis
- Time clock + shift optimization + certification tracking
- Quality + scrap root cause integrated

**Critical Gaps:**
1. **No WorkOrderEngine** — W.O. generation/dispatch missing
2. **No KanbanEngine** — No WIP pull-system orchestration
3. **No AndonEngine** — Real-time alert/escalation missing
4. **No ReworkEngine** — Failed-part disposition/rework queue absent
5. **No MachineUtilizationEngine** — Only OEE; lacks utilization forecasting
6. **No DowntimeTrackingEngine** — Downtime logging separate from OEE

## Score: 62/100

**Rationale:**
- Core job→schedule→time→quality pathway present (40 pts)
- OEE + capacity planning (15 pts)
- Time clock + shift optimization (10 pts)
- Missing: pull-based production (Kanban), real-time alerts (Andon), work order dispatch, rework management (−38 pts)

**Verdict:** Shop floor **monitoring & queuing infrastructure exists**, but **production control systems (pull, alerts, rework) are incomplete**. Ready for enhancement via WO + Kanban + Andon engines.
