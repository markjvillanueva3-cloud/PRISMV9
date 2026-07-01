# ERP Audit — Agent 6: Reporting / Dashboards

## Executive Dashboards
**DashboardPage** (live manufacturing command surface): OEE gauges, machine status grid, job progress tracking, tool wear alerts, shift guidance, learning fabric insights. Integrates hot-job escalations and safety scores.

**OEEDashboardPage**: Four-tab breakdown (Overview, Machines, Losses, Trends). Shows Availability/Performance/Quality decomposition, per-machine OEE, six big losses (TPM framework), 30/14/7-day trend tables with rolling averages.

**DepartmentDashboardPage**: Four-tab view (Overview, Utilization, Downtime, Cost). Live clock-in status, employee utilization %, downtime Pareto (material wait, setup, tool breakage), labor/overhead cost by department (weekly/monthly).

## Financial Reports
- **ToolingCostPage**: Tool usage tracking with wear %, cost, job-side posture, reorder alerts, low-stock continuity warnings.
- **ReportsPage**: Generates Safety Audit, Setup Sheet, Cost Estimate reports. Business reporting APIs: dashboard, pareto, production, quality, financial, trend (exportable as text).
- Partial support: reportingFinancial() API endpoint exists for P&L/cost reporting.

## Operations Reports
- OEE calculator: availability, performance, quality metrics.
- Machine utilization: per-machine uptime %, running/idle/down states.
- Downtime analysis: reason, occurrences, total minutes lost.
- Tool life tracking: wear %, remaining time, reorder alerts.
- Job progress: cycle time, parts completed, ETA.

## KPI Coverage
- OEE (Overall Equipment Effectiveness) ✓
- Machine utilization ✓
- Availability, Performance, Quality (A/P/Q) ✓
- Tool life remaining ✓
- Downtime reasons (Pareto) ✓
- Employee utilization ✓
- Labor/overhead cost ✓
- **Missing**: On-time delivery (OTD), scrap/rework rates, FPY, customer/vendor statements, margin by job/customer

## Export Formats
- Text export (ReportsPage): .txt download
- **Lacking**: Excel (.xlsx), PDF, CSV, email scheduling, drill-down navigation to source transactions

## Score (0-100)
**42/100**

**Strengths**: Live executive dashboard, OEE decomposition, department cost tracking, downtime Pareto, tool economy view.

**Gaps**: No P&L, balance sheet, cash flow, AR/AP aging, sales pipeline, win/loss, compliance audits (ISO/AS9100/ITAR), custom report builder, scheduled email delivery, PDF export, drill-down from summary to detail transactions, actual-vs-estimate cost variance, gross margin by customer.

