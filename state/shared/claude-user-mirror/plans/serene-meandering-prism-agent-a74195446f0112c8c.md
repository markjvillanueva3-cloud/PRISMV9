# Data Analytics Gap Analysis — PRISM Employee/Job Tracking
**Role:** Data Analyst
**Plan Date:** 2026-03-31
**Status:** REVIEW ONLY (Plan Mode)

---

## EXECUTIVE SUMMARY

The plan proposes a **robust employee HR/job tracking system** with solid backend foundations (TimeClockEngine, PayrollEngine, EmployeeEngine). However, **critical manufacturing analytics capabilities are either missing or severely under-developed**. The system captures excellent granular labor data but lacks the data model transformations, derived metrics, and reporting infrastructure needed for modern manufacturing intelligence.

**Grade:** Backend foundation 7/10, Analytics readiness 3/10.

---

## FINDINGS BY ANALYTICS CAPABILITY

### 1. **Setup vs Production Time Split** ✓ Partial
**Question:** Can we calculate % of time spent on setup vs production across all jobs?

**Current State:**
- TimeClockEngine captures `process_type` enum (setup, production_run, first_article, rework, inspection, deburring, secondary_ops, programming, material_handling)
- JobTimeEntry has `productive_minutes` and `total_minutes` with pause tracking
- Pause periods track `reason_category` (setup_changeover, machine_down, break, etc.)

**Critical Gaps:**
- **No aggregation schema** — can retrieve job-level time entries but no pre-computed setup/prod split for dashboards
- **Pause reason categories don't include "setup"** — only "setup_changeover" which is a sub-pause, not a job classification
- **No derived table** — would need views or materialized tables for fast pivot queries
- **Missing index** — no composite (employee_id, process_type, date) for GROUP BY queries
- **CSV export** not wired to routes

**Recommendation:**
- Add view: `job_time_by_process_type` (job_id, process_type, total_min, prod_min, setup_min)
- Add migration to index time_clock_entries(process_type, start_time)
- Wire `/api/reports/setup-vs-prod?job_id=X&start_date=&end_date=` route

---

### 2. **OEE Calculation (Overall Equipment Effectiveness)** ✗ Not Started
**Question:** Can we calculate OEE from this data?

**Current State:**
- Jobs table: `completed_qty`, quantity (gives Good parts vs Total)
- Jobs table: `start_time`, `end_time` (gives theoretical runtime)
- Machine table: max_rpm, max_power_kw (no utilization baseline)
- No defect tracking, no downtime table

**Critical Gaps:**
- **Missing downtime event table** — pause_reasons in job_time_entries are not formally recorded as machine downtime
- **No scrap/defect tracking** — JobTimeEntry has scrap_count/reason (planned in phase 1E) but not yet captured
- **No standard runtime definition** — OEE needs "Ideal Cycle Time" from quote or routing, which doesn't exist in schema
- **Performance baseline missing** — machines table has no OEE target or historical performance
- **No real-time vs scheduled breakdown** — availability can't be calculated without formalized shift assignments

**Missing Data Elements:**
```sql
-- REQUIRED but not in schema:
CREATE TABLE downtime_events (
  id UUID PRIMARY KEY,
  machine_id UUID REFERENCES machines(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes NUMERIC,
  reason VARCHAR(100),  -- tool_change, setup, break, maintenance, etc.
  category VARCHAR(50), -- planned | unplanned
  job_id UUID REFERENCES jobs(id),
  notes TEXT
);

-- OR repurpose job_time_pause as downtime event
-- But currently it's nested in JobTimeEntry, not queryable
```

**Recommendation:**
- Create standalone `downtime_events` table
- Populate from pause_periods when reason_category = "machine_down" or "preventive_maintenance"
- Add OEE calculator: `(good_parts ÷ total_parts) × (ideal_cycle × parts ÷ actual_time) × (scheduled_time ÷ actual_time)`
- Requires: scrap_count capture, ideal_cycle_time in jobs table, real-time downtime logging

---

### 3. **Top 5 Downtime Causes per Machine per Month** ✗ Not Structured
**Question:** Can we identify the top 5 downtime causes per machine per month?

**Current State:**
- Pause reasons captured in job_time_pause (reason, reason_category)
- Reason categories: machine_down, material_shortage, setup_changeover, break, preventive_maintenance, idle, shift_end, other

**Critical Gaps:**
- **Pause reasons are not formalized** — they are free-text strings, not enum'd
- **No pause table** — pause_periods is a nested array in JobTimeEntry, not queryable with SQL
- **No aggregation** — can't do `GROUP BY machine_id, pause_reason, DATE_TRUNC('month', pause_start)`
- **Missing reason hierarchy** — category + detail_reason should be two separate fields for drill-down
- **No downtime duration aggregation** — pause end_time may be null for ongoing pauses

**Required Transformation:**
```sql
-- DENORMALIZE pause_periods into a table
CREATE TABLE machine_downtime (
  id UUID PRIMARY KEY,
  job_time_id UUID REFERENCES job_time_entries(id),
  machine_id UUID REFERENCES machines(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes NUMERIC,
  reason_category VARCHAR(50), -- enum
  reason_detail VARCHAR(200),  -- free text
  operator_id UUID REFERENCES employees(id),
  notes TEXT
);
```

**Recommendation:**
- Create migration to extract pause_periods into flat table
- Add route: `/api/reports/downtime-causes?machine_id=X&month=2026-03`
- Implement SQL GROUP BY with LIMIT 5 and ORDER BY duration_minutes DESC

---

### 4. **Labor Productivity Trends (Hours per Part Over Time)** ✓ Feasible with Engineering
**Question:** Can we track labor productivity trends over time? (hours per part trending up/down)

**Current State:**
- TimeClockEngine.timecardSummary gives per-employee aggregation (hours, jobs)
- TimeClockEngine.getJobTimeEntries gives per-job labor
- EmployeeEngine.calculateUtilization exists (job_hours / scheduled_hours)
- No trending or comparison logic

**Critical Gaps:**
- **No time series storage** — would need to materialize daily/weekly snapshots
- **Missing job complexity metric** — can't normalize "hours per part" without weight factor
- **No seasonal decomposition** — for detecting true trends vs cyclical variation
- **Utilization export** doesn't support time ranges for charting
- **No benchmark** — no industry baseline or per-employee historical average to compare against

**Recommendation:**
- Add route: `/api/reports/labor-productivity?employee_id=X&start_date=&end_date=`
  - Returns: [{ date, job_id, parts_completed, hours_worked, hours_per_part, job_type }, ...]
- Create view: `daily_productivity` (employee_id, job_id, date, parts, hours)
- Add /api/reports/labor-trend?employee_id=X with 30/60/90-day trend slope
- For charting: scatter plot (date, hours_per_part) with trend line (linear regression)

---

### 5. **Data Model for Pivot Tables** ✗ Not Normalized
**Question:** Is the data model correct for pivot tables? (employee × job × process_type × machine × date)

**Current State:**
- TimeClockEngine: ShiftEntry (employee_id, clock_in, clock_out, status)
- TimeClockEngine: JobTimeEntry (employee_id, job_id, operation, machine_id, process_type, start_time, pause_periods)
- EmployeeEngine: Employee (id, department, role, shift)
- No fact table, no dimension tables

**Data Normalization Issues:**
| Dimension | Current Location | Issue |
|-----------|------------------|-------|
| **Employee** | EmployeeEngine (memory-backed) | ✓ Good structure, needs persistence |
| **Job** | jobs table | ✓ Exists in DB |
| **Machine** | machines table | ✓ Exists in DB |
| **Process Type** | JobTimeEntry.process_type (enum) | ✓ Good |
| **Date** | JobTimeEntry.start_time (ISO string) | ✓ Can extract |
| **Pause Reason** | JobTimeEntry.pause_periods[].reason (nested array) | ✗ **Not queryable — must flatten** |
| **Department** | EmployeeEngine.department | ✓ Good |
| **Shift** | EmployeeEngine.shift (nested object) | ⚠ Queryable but complex |

**Fact Table Issues:**
```
job_time_entries is the fact table but has:
  - Array field (pause_periods) → not SQL-standard, can't GROUP BY pause reason
  - Missing measure fields: scrap_count, good_parts (planned), setup_cost, prod_cost
  - No foreign keys to normalized dimensions (employee_id only, no employee_department denorm)
  - No computed columns (productive_minutes is calculated but not stored)
```

**Recommendation:**
1. **Flatten pause_periods** into separate `machine_downtime` table with machine_id
2. **Add computed columns** to job_time_entries: scrap_count, good_parts, process_cost (for fast pivots)
3. **Denormalize employee.department** into job_time_entries (for pivot without JOIN)
4. **Create views:**
   ```sql
   CREATE VIEW vw_labor_fact AS
   SELECT
     jte.job_id, emp.id employee_id, emp.department,
     jte.machine_id, jte.process_type,
     DATE(jte.start_time) as work_date,
     jte.total_minutes / 60.0 as labor_hours,
     jte.productive_minutes / 60.0 as productive_hours,
     emp.hourly_rate * (jte.productive_minutes / 60.0) as labor_cost,
     jte.scrap_count, jte.good_parts
   FROM job_time_entries jte
   JOIN employees emp ON jte.employee_id = emp.id;
   ```
5. **Add indexes:** (employee_id, process_type, start_time), (machine_id, start_time), (job_id, employee_id)

---

### 6. **Export to Excel/CSV** ✗ Not Implemented
**Question:** Can we export to Excel/CSV for accountants?

**Current State:**
- Plan mentions "Export to CSV" for TimecardPage (5B)
- No routes exist for export: `/api/export/timecard`, `/api/export/payroll`, `/api/export/labor-cost`
- TimecardPage component planned but not wired

**Critical Gaps:**
- **No CSV serializer** in utils/
- **No streaming export** for large datasets (1000+ rows fails in memory)
- **No Excel formatter** — XLSX library not in package.json
- **No audit trail** — exports not logged
- **Timezone handling** — ISO strings in export could confuse Excel

**Recommendation:**
- Add `src/utils/csvExporter.ts`:
  ```typescript
  export function timecardsToCSV(records: TimecardSummary[]): string {
    // headers, rows, escape quotes
  }
  export function laborCostToCSV(records: LaborRecord[]): string { }
  ```
- Add routes:
  - POST `/api/export/timecard?period_id=X&format=csv|xlsx` → binary download
  - POST `/api/export/payroll?period_id=X&format=csv` → pay stubs for accounting
  - POST `/api/export/labor-cost?job_id=X&format=csv` → per-employee breakdown
- Implement XLSX via `npm install xlsx`
- Log exports in audit_log with user_id, entity_id, row_count

---

### 7. **Derivable KPIs** ✓ Mostly Feasible
**Question:** What KPIs are derivable: utilization%, efficiency%, scrap rate%, OT ratio%, cost variance%?

| KPI | Formula | Data Available? | Notes |
|-----|---------|-----------------|-------|
| **Utilization %** | job_hours / scheduled_hours × 100 | ✓ Yes | EmployeeEngine.calculateUtilization exists |
| **Efficiency %** | productive_min / total_min × 100 | ✓ Yes | JobTimeEntry captures both |
| **Scrap Rate %** | scrap_count / (good_parts + scrap) × 100 | ⚠ Planned (1E) | Not yet captured |
| **OT Ratio %** | overtime_hours / total_hours × 100 | ✓ Yes | ShiftEntry.overtime_hours exists |
| **Cost Variance %** | (actual_cost - budgeted_cost) / budgeted_cost × 100 | ⚠ Partial | Quote has budgeted cost, but no actual_cost aggregation |
| **Labor Cost per Part** | total_labor_cost / good_parts | ⚠ Planned (1E) | Scrap adjustment needs good_parts field |
| **Setup Efficiency** | production_time / setup_time ratio | ✓ Feasible | process_type enum enables this |
| **Downtime %** | downtime_min / scheduled_min × 100 | ✗ Missing | Requires downtime_events table |
| **First Pass Yield** | good_parts_day1 / total_parts × 100 | ✗ Missing | No rework tracking |
| **Machine OEE** | availability × performance × quality | ✗ Missing | Requires downtime table + scrap tracking |

**Recommendation:** All KPIs are implementable once:
1. Scrap_count, good_parts captured in JobTimeEntry (phase 1E)
2. Downtime formalized in separate table
3. Quote.budgeted_cost linked to actual_cost aggregate
4. Rework tracking added (process_type = "rework" exists but not linked to original job)

---

### 8. **Time Series Considerations** ✓ Feasible with Engineering
**Question:** Time series considerations? (shift data over 12 months for seasonal analysis)

**Current State:**
- ShiftEntry: clock_in, clock_out (ISO timestamps, timezone-aware via TIMESTAMPTZ)
- No snapshot/aggregation tables for historical queries
- No partitioning on time-based columns

**Critical Gaps:**
- **No materialized daily snapshot** — every query must aggregate from raw entries
- **No monthly/weekly summary table** — slow to compute on-the-fly for trends
- **Timezone handling unclear** — TIMESTAMPTZ in DB but frontend not specified
- **No seasonal decomposition** — can't separate trend/seasonal/noise
- **Missing day-of-week grain** — Monday vs Friday patterns not obvious

**Recommendation:**
1. Create materialized view (refresh nightly):
   ```sql
   CREATE MATERIALIZED VIEW mv_daily_summary AS
   SELECT
     DATE(clock_in AT TIME ZONE 'America/Chicago') as work_date,
     employee_id, department,
     SUM(total_hours) as shift_hours,
     COUNT(*) as shifts,
     EXTRACT(DOW FROM clock_in) as day_of_week
   FROM shifts
   WHERE status = 'completed'
   GROUP BY work_date, employee_id, department;
   ```
2. Create seasonal index:
   - Weekly summary (SUN-SAT) for 52 weeks
   - Monthly summary for 12 months
   - Holiday calendar for outlier removal (Thanksgiving, Xmas)
3. Add decomposition API: `/api/reports/labor-trend?employee_id=X&granularity=week&include_forecast=true`

---

### 9. **SQL GROUP BY Normalization** ⚠ Partially Ready
**Question:** Is the data normalized enough for SQL GROUP BY queries?

**Current Issues:**
1. **pause_periods is an array** (non-standard) → can't `GROUP BY pause_reason`
2. **shift nested in employee** → need to JOIN or denorm
3. **process_type is only in JobTimeEntry** → can't pivot without joining through jobs
4. **No dimension tables** for process_type (enum as dimension), pause_reason_category (enum as dimension)

**Ready for GROUP BY:**
- ✓ GROUP BY employee_id, department (EmployeeEngine has both)
- ✓ GROUP BY job_id (jobs table keyed)
- ✓ GROUP BY machine_id (machines table keyed)
- ✓ GROUP BY DATE(start_time) (timestamp column)
- ✗ GROUP BY pause_reason (nested array, needs flattening)
- ✗ GROUP BY process_type (enum, but mixed with job_id — scope ambiguous)

**Recommendation:**
- Create dimension tables:
  ```sql
  CREATE TABLE dim_process_type (
    id INT PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    category VARCHAR(30)
  );
  INSERT INTO dim_process_type VALUES
    (1, 'setup', 'preparation'),
    (2, 'production_run', 'production'),
    ...
  ```
- Create dimension for pause reasons (currently free-text + category)
- Flatten pause_periods into downtime facts table
- Index all FK columns (employee_id, job_id, machine_id, process_type_id)

---

### 10. **Shop Floor Scoreboard (Real-Time Metrics)** ✗ Missing Architecture
**Question:** Can we build a "shop floor scoreboard" showing real-time metrics?

**Current State:**
- Plan mentions real-time via WebSocket + 10s polling fallback (4B)
- timeClockEngine.whoClockedIn() exists
- No pub/sub architecture, no event streaming

**Critical Gaps:**
- **No real-time event bus** — would need Redis, Socket.io, or similar
- **No metric aggregation engine** — each query recalculates from raw data
- **No cache layer** — every page reload = full DB join
- **No time-bucketing** — can't efficiently ask "jobs started in last 5 minutes"
- **Dashboard component exists** but would require full web rebuild

**Data Needed for Scoreboard:**
```
Live KPIs:
  - Who's clocked in (per shift)
  - Active jobs (per machine)
  - Average cycle time (running average, last 10 parts)
  - Scrap rate (last hour)
  - Machine utilization (% of time in production vs idle)
  - Downtime reason (current) + duration
  - Labor cost burn rate ($/hour across all clocked-in employees)
```

**Recommendation:**
1. **Add time-series cache table** (1-hour retention):
   ```sql
   CREATE TABLE metric_cache (
     metric_id VARCHAR(100),
     timestamp TIMESTAMPTZ,
     machine_id UUID,
     employee_id UUID,
     value NUMERIC,
     PRIMARY KEY (metric_id, timestamp, machine_id)
   );
   ```
2. **Add aggregator daemon** (runs every 30s):
   - Query active shifts + active jobs
   - Calculate per-machine KPIs
   - Update metric_cache
   - Emit WebSocket update to connected clients
3. **Add WebSocket handler** in Express:
   - Route: `/ws/shop-floor?employee_id=X` (authenticate)
   - Emit on metric_cache update
   - Fallback to polling if WS disconnects
4. **Add DepartmentDashboard** component (mentioned in 5C):
   - Real-time employee list (who_clocked_in)
   - Active jobs tile (by machine)
   - Utilization gauge (per dept)
   - Downtime breakdown pie chart
   - Cost burn counter

---

## DATA MODEL CORRECTED SUMMARY

Current state: Engines + Tables exist, but **schema is not analytics-optimized**.

```
CURRENT (Raw Transaction Model):
  shifts (PK: id)
  job_time_entries (PK: id, FK: shift_id, job_id)
    └─ pause_periods[] (nested, not queryable)
  employees (in-memory, PersistenceBridge to DB)
  jobs (PK: id, FK: machine_id, material_id)
  machines (PK: id)

REQUIRED FOR ANALYTICS (Dimensional + Fact):
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DIMENSIONS:
    dim_employee (id, name, department, role, hourly_rate)
    dim_job (id, job_number, customer_id, quantity, priority, due_date)
    dim_machine (id, name, type, max_rpm, hourly_rate, status)
    dim_process_type (id, name, category)
    dim_pause_reason (id, category, reason_detail)
    dim_date (date, year, month, quarter, week, day_of_week)

  FACT TABLES:
    fact_labor (
      fact_id, employee_id, job_id, machine_id, shift_date,
      shift_hours, regular_hours, overtime_hours,
      job_start_time, job_end_time, productive_minutes,
      good_parts, scrap_count, process_type_id,
      labor_cost, scrap_adjusted_cost
    )

    fact_downtime (
      fact_id, machine_id, job_id, employee_id, event_start, event_end,
      duration_minutes, pause_reason_id, reason_category,
      is_preventive, availability_impact
    )

    fact_quality (
      fact_id, job_id, machine_id, shift_date,
      parts_produced, good_parts, scrap_count, rework_count,
      first_pass_yield, scrap_rate
    )

  AGGREGATION TABLES (refresh nightly):
    agg_daily_labor (employee_id, work_date, shifts, hours, cost)
    agg_daily_machine (machine_id, work_date, uptime_min, downtime_min, oee)
    agg_monthly_labor (employee_id, month, total_hours, ot_hours, total_cost)
```

---

## MISSING ANALYTICS CAPABILITIES

### 1. Reporting Routes (ALL missing)
- `/api/reports/setup-vs-prod` — by job, by machine, by employee, by date range
- `/api/reports/downtime-causes` — top 5 by machine, by month, by category
- `/api/reports/labor-productivity` — hours per part, trend, by employee
- `/api/reports/labor-cost` — by job, by employee, by department
- `/api/reports/oee` — by machine, by shift, by day
- `/api/reports/scrap-analysis` — rate by job type, by operator, by material
- `/api/reports/payroll-summary` — by period, by department
- `/api/reports/machine-utilization` — by machine, by shift
- `/api/export/timecard?format=csv|xlsx`
- `/api/export/payroll?format=csv|xlsx`

### 2. Derived Fields (NOT captured, only calculated on demand)
- **In JobTimeEntry:** scrap_count, good_parts, process_cost (planned but not implemented)
- **In Shift:** regular_hours, overtime_hours (calculated but not stored — recomputed on read)
- **Missing entirely:** first_pass_yield, scrap_rate, effective_cycle_time, labor_cost_per_part

### 3. Aggregation Infrastructure
- **No materialized views** for common queries (daily summary, monthly cost, machine OEE)
- **No time-series bucketing** (partition by month, by week)
- **No cache layer** (every query is fresh from raw tables)
- **No job scheduler** to refresh nightly summaries

### 4. Quality Metrics
- **No scrap tracking** (planned for phase 1E but not implemented)
- **No rework table** (process_type="rework" exists but not linked to original job)
- **No first-article inspection** (FAI) results storage
- **No acceptance criteria** per job (how is "good" defined?)

### 5. Real-Time Monitoring
- **No event bus** (Kafka, Redis Streams, or Socket.io pub/sub)
- **No metric aggregation daemon** (runs constantly, updates cache)
- **No dashboard WebSocket** handler
- **No alert rules engine** (e.g., "alert if scrap_rate > 5%")

---

## RECOMMENDATIONS (Prioritized)

### P0: REQUIRED FOR ANALYTICS (Do these first)
1. **Flatten pause_periods** into `machine_downtime` table
   - Enables: downtime cause analysis, machine OEE calculation
   - Effort: 2 migrations + 1 new engine method
   - Impact: HIGH (5+ KPIs depend on this)

2. **Add scrap_count + good_parts to JobTimeEntry**
   - Enables: scrap rate, yield, cost variance
   - Effort: 1 migration + UI form in stop-job modal
   - Impact: HIGH (3 KPIs)

3. **Create fact_labor materialized view**
   - Enables: all labor analytics (pivot tables, trends, cost analysis)
   - Effort: 1 SQL view + nightly refresh job
   - Impact: VERY HIGH (foundation for 8+ reports)

4. **Wire CSV/Excel export**
   - Enables: accountant workflows, offline analysis
   - Effort: 2 routes + csvExporter util + XLSX lib
   - Impact: MEDIUM (user need but not core analytics)

### P1: IMPORTANT FOR DASHBOARDS (Do these next)
5. **Create machine downtime dimension + fact**
   - Enables: OEE, downtime Pareto charts, maintenance ROI
   - Effort: 1 migration + 2 views
   - Impact: HIGH

6. **Add real-time scoreboard WebSocket handler**
   - Enables: live shop floor visibility
   - Effort: 3 handlers + 1 aggregator daemon
   - Impact: MEDIUM (nice-to-have but requested in plan)

7. **Wire reporting routes** (setup-vs-prod, downtime-causes, labor-productivity)
   - Enables: all KPI dashboards
   - Effort: 6 routes × 30 LOC each = moderate
   - Impact: VERY HIGH (makes analytics actionable)

### P2: NICE-TO-HAVE (Do these if time)
8. **Add quality dimension** (FAI results, acceptance criteria per job)
9. **Add rework tracking** (link rework jobs to original)
10. **Implement seasonal decomposition** (for trend analysis)

---

## DATA COMPLETENESS CHECKLIST

Before analytics go live, verify:

- [x] TimeClockEngine persists to DB (PersistenceBridge wired)
- [ ] EmployeeEngine persists to DB (currently in-memory only per plan)
- [ ] PayrollEngine persists to DB (currently in-memory only per plan)
- [ ] Pause periods flattened to downtime table
- [ ] Scrap count captured in JobTimeEntry (phase 1E)
- [ ] Good parts captured in JobTimeEntry (phase 1E)
- [ ] Pause reason categories finalized (enum, not free-text)
- [ ] Machine hourly_rate field populated (used for cost calc)
- [ ] Employee hourly_rate always set (used for labor cost)
- [ ] Date range filters on all report routes
- [ ] Timezone handling standardized (UTC in DB, local in UI)

---

## IMPACT SUMMARY

**Current Plan Gaps:**
- ✓ Backend foundation SOLID (engines exist, persistence planned)
- ✗ Analytics infrastructure MISSING (no reporting routes, no fact tables)
- ✗ Real-time monitoring MISSING (no event bus, no aggregator)
- ✗ Data export MISSING (no CSV/Excel)
- ⚠ Data normalization PARTIAL (arrays, nested objects, in-memory state)

**Grade:** 6/10 as written. With P0 + P1 additions: 9/10.

**Effort to Full Analytics:** ~3-4 additional sprints beyond plan scope.

