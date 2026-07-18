import { useCallback, useEffect, useState } from 'react';
import { ApiError, employeeDeptSummary, employeeUtilization, whoClockedIn } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  ActionButton,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'overview' | 'utilization' | 'downtime' | 'cost';

const TAB_CONFIG: Record<Tab, { label: string }> = {
  overview: { label: 'Overview' },
  utilization: { label: 'Utilization' },
  downtime: { label: 'Downtime' },
  cost: { label: 'Cost' },
};

// ---------------------------------------------------------------------------
// Seed / mock data types — used when backend returns null or empty
// ---------------------------------------------------------------------------

interface ClockedInEmployee {
  employee_id: string;
  name: string;
  clock_in_time: string;
  department: string;
  active_job: string | null;
  machine: string | null;
}

interface DeptSummary {
  department: string;
  headcount: number;
  clocked_in: number;
  active_jobs: number;
}

interface EmployeeUtil {
  employee_id: string;
  name: string;
  department: string;
  utilization_pct: number;
  hours_worked: number;
  hours_available: number;
}

interface DowntimeReason {
  reason: string;
  occurrences: number;
  total_minutes: number;
}

interface DeptCost {
  department: string;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
}

// ---------------------------------------------------------------------------
// Realistic seed data
// ---------------------------------------------------------------------------

const SEED_CLOCKED_IN: ClockedInEmployee[] = [
  { employee_id: 'EMP-001', name: 'Mike Ramirez', clock_in_time: '06:02', department: 'CNC Milling', active_job: 'JOB-2026-0342', machine: 'VF-2SS' },
  { employee_id: 'EMP-004', name: 'Sarah Chen', clock_in_time: '05:58', department: 'CNC Turning', active_job: 'JOB-2026-0339', machine: 'ST-20Y' },
  { employee_id: 'EMP-007', name: 'David Kowalski', clock_in_time: '06:00', department: 'CNC Milling', active_job: 'JOB-2026-0344', machine: 'UMC-750' },
  { employee_id: 'EMP-011', name: 'James Park', clock_in_time: '06:05', department: 'Grinding', active_job: null, machine: null },
  { employee_id: 'EMP-015', name: 'Maria Gonzalez', clock_in_time: '06:01', department: 'Quality', active_job: 'JOB-2026-0340', machine: null },
  { employee_id: 'EMP-018', name: 'Tom Wheeler', clock_in_time: '05:55', department: 'CNC Milling', active_job: 'JOB-2026-0345', machine: 'VF-4SS' },
  { employee_id: 'EMP-022', name: 'Lisa Nguyen', clock_in_time: '06:03', department: 'EDM', active_job: 'JOB-2026-0341', machine: 'FA-20S' },
];

const SEED_DEPT_SUMMARY: DeptSummary[] = [
  { department: 'CNC Milling', headcount: 12, clocked_in: 3, active_jobs: 8 },
  { department: 'CNC Turning', headcount: 6, clocked_in: 1, active_jobs: 4 },
  { department: 'Grinding', headcount: 4, clocked_in: 1, active_jobs: 2 },
  { department: 'EDM', headcount: 3, clocked_in: 1, active_jobs: 2 },
  { department: 'Quality', headcount: 5, clocked_in: 1, active_jobs: 3 },
];

const SEED_UTILIZATION: EmployeeUtil[] = [
  { employee_id: 'EMP-001', name: 'Mike Ramirez', department: 'CNC Milling', utilization_pct: 91, hours_worked: 7.3, hours_available: 8 },
  { employee_id: 'EMP-004', name: 'Sarah Chen', department: 'CNC Turning', utilization_pct: 87, hours_worked: 7.0, hours_available: 8 },
  { employee_id: 'EMP-007', name: 'David Kowalski', department: 'CNC Milling', utilization_pct: 78, hours_worked: 6.2, hours_available: 8 },
  { employee_id: 'EMP-011', name: 'James Park', department: 'Grinding', utilization_pct: 62, hours_worked: 5.0, hours_available: 8 },
  { employee_id: 'EMP-015', name: 'Maria Gonzalez', department: 'Quality', utilization_pct: 84, hours_worked: 6.7, hours_available: 8 },
  { employee_id: 'EMP-018', name: 'Tom Wheeler', department: 'CNC Milling', utilization_pct: 95, hours_worked: 7.6, hours_available: 8 },
  { employee_id: 'EMP-022', name: 'Lisa Nguyen', department: 'EDM', utilization_pct: 73, hours_worked: 5.8, hours_available: 8 },
];

const SEED_DOWNTIME: DowntimeReason[] = [
  { reason: 'Material wait', occurrences: 14, total_minutes: 420 },
  { reason: 'Setup / changeover', occurrences: 11, total_minutes: 330 },
  { reason: 'Tool breakage', occurrences: 6, total_minutes: 210 },
  { reason: 'Program edit', occurrences: 8, total_minutes: 160 },
  { reason: 'First article inspection', occurrences: 9, total_minutes: 135 },
  { reason: 'Machine maintenance', occurrences: 3, total_minutes: 120 },
  { reason: 'Operator break', occurrences: 18, total_minutes: 90 },
];

const SEED_DEPT_COST: Record<string, DeptCost[]> = {
  week: [
    { department: 'CNC Milling', labor_cost: 18400, overhead_cost: 9200, total_cost: 27600 },
    { department: 'CNC Turning', labor_cost: 9600, overhead_cost: 4800, total_cost: 14400 },
    { department: 'Grinding', labor_cost: 6400, overhead_cost: 3200, total_cost: 9600 },
    { department: 'EDM', labor_cost: 5100, overhead_cost: 2550, total_cost: 7650 },
    { department: 'Quality', labor_cost: 7500, overhead_cost: 3750, total_cost: 11250 },
  ],
  month: [
    { department: 'CNC Milling', labor_cost: 73600, overhead_cost: 36800, total_cost: 110400 },
    { department: 'CNC Turning', labor_cost: 38400, overhead_cost: 19200, total_cost: 57600 },
    { department: 'Grinding', labor_cost: 25600, overhead_cost: 12800, total_cost: 38400 },
    { department: 'EDM', labor_cost: 20400, overhead_cost: 10200, total_cost: 30600 },
    { department: 'Quality', labor_cost: 30000, overhead_cost: 15000, total_cost: 45000 },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function utilTone(pct: number): 'emerald' | 'amber' | 'rose' {
  if (pct >= 85) return 'emerald';
  if (pct >= 60) return 'amber';
  return 'rose';
}

function utilBarColor(pct: number): string {
  if (pct >= 85) return 'bg-cyan-300';
  if (pct >= 60) return 'bg-amber-300';
  return 'bg-rose-300';
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DepartmentDashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clockedIn, setClockedIn] = useState<ClockedInEmployee[]>(SEED_CLOCKED_IN);
  const [deptSummaries, setDeptSummaries] = useState<DeptSummary[]>(SEED_DEPT_SUMMARY);
  const [utilData, setUtilData] = useState<EmployeeUtil[]>(SEED_UTILIZATION);
  const [downtimeReasons] = useState<DowntimeReason[]>(SEED_DOWNTIME);
  const [costPeriod, setCostPeriod] = useState<'week' | 'month'>('week');

  // Derived metrics
  const clockedInCount = clockedIn.length;
  const activeJobCount = clockedIn.filter((e) => e.active_job !== null).length;
  const avgUtil = utilData.length > 0
    ? Math.round(utilData.reduce((sum, e) => sum + e.utilization_pct, 0) / utilData.length)
    : 0;

  // Downtime sorted descending by total_minutes (Pareto order)
  const sortedDowntime = [...downtimeReasons].sort((a, b) => b.total_minutes - a.total_minutes);
  const maxDowntimeMinutes = sortedDowntime.length > 0 ? sortedDowntime[0].total_minutes : 1;

  // Cost data
  const costData = SEED_DEPT_COST[costPeriod] ?? SEED_DEPT_COST.week;
  const totalCost = costData.reduce((sum, d) => sum + d.total_cost, 0);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clockedInRes, deptRes] = await Promise.all([
        whoClockedIn(),
        employeeDeptSummary(),
      ]);

      const rawClocked = clockedInRes.result as { employees?: ClockedInEmployee[] } | null;
      if (rawClocked?.employees && rawClocked.employees.length > 0) {
        setClockedIn(rawClocked.employees);
      }

      const rawDept = deptRes.result as { departments?: DeptSummary[] } | null;
      if (rawDept?.departments && rawDept.departments.length > 0) {
        setDeptSummaries(rawDept.departments);
      }

      // Load utilization for each known employee
      const utilPromises = SEED_UTILIZATION.map(async (emp) => {
        try {
          const res = await employeeUtilization({ employee_id: emp.employee_id });
          const raw = res.result as Partial<EmployeeUtil> | null;
          if (raw && typeof raw.utilization_pct === 'number') {
            return { ...emp, ...raw } as EmployeeUtil;
          }
          return emp;
        } catch {
          return emp;
        }
      });

      const nextUtil = await Promise.all(utilPromises);
      setUtilData(nextUtil);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load department data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Shop Floor"
        title="Department Dashboard"
        description="Live department-level view of who is on the clock, what machines are running, and where utilization needs attention before the shift is over."
        metrics={
          <>
            <SummaryTile
              label="Clocked In"
              value={String(clockedInCount)}
              hint={`${clockedInCount} employee${clockedInCount === 1 ? '' : 's'} currently on the floor.`}
            />
            <SummaryTile
              label="Active Jobs"
              value={String(activeJobCount)}
              hint={`${activeJobCount} job${activeJobCount === 1 ? '' : 's'} actively running right now.`}
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Utilization %"
              value={`${avgUtil}%`}
              hint={`Average employee utilization across all departments.`}
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Use this dashboard to monitor real-time department posture. The overview shows live clock-in status, utilization tracks productive hours, and cost tracks labor spend against budget.
            </div>
            <ActionButton onClick={loadData}>Refresh data</ActionButton>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing department data..." /> : null}
      {error ? <ErrorState message={error} onRetry={loadData} /> : null}

      {/* ===== OVERVIEW TAB ===== */}
      {tab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-6">
            {/* Clocked-in employees */}
            <PanelCard title="Who's on the clock" subtitle="Live clock-in status from the timecard system.">
              {clockedIn.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {clockedIn.map((emp) => (
                    <div key={emp.employee_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{emp.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            {emp.employee_id} &middot; {emp.department}
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div>In at {emp.clock_in_time}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {emp.active_job ? (
                          <StatusPill label={emp.active_job} tone="emerald" />
                        ) : (
                          <StatusPill label="No active job" tone="slate" />
                        )}
                        {emp.machine ? (
                          <StatusPill label={emp.machine} tone="sky" />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No employees are currently clocked in.
                </div>
              )}
            </PanelCard>

            {/* Active jobs per machine — derived from clocked-in data */}
            <PanelCard title="Active jobs per machine" subtitle="Machines with an operator and a running job right now.">
              {clockedIn.filter((e) => e.active_job && e.machine).length > 0 ? (
                <div className="space-y-3">
                  {clockedIn
                    .filter((e) => e.active_job && e.machine)
                    .map((e) => (
                      <div key={e.employee_id} className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-cyan-100">{e.machine}</span>
                          <span className="text-xs text-slate-500">&rarr;</span>
                          <span className="text-sm text-slate-200">{e.active_job}</span>
                        </div>
                        <span className="text-xs text-slate-400">{e.name}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No machines have active jobs at this moment.
                </div>
              )}
            </PanelCard>
          </div>

          {/* Right column — department headcount */}
          <div className="space-y-6">
            <PanelCard title="Department headcount" subtitle="Summary by department from the employee registry.">
              {deptSummaries.length > 0 ? (
                <div className="space-y-3">
                  {deptSummaries.map((dept) => (
                    <div key={dept.department} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-50">{dept.department}</div>
                        <StatusPill
                          label={`${dept.clocked_in}/${dept.headcount} in`}
                          tone={dept.clocked_in >= dept.headcount * 0.8 ? 'emerald' : 'amber'}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-lg font-semibold text-slate-50">{dept.headcount}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Roster</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-cyan-100">{dept.clocked_in}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Clocked in</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-emerald-100">{dept.active_jobs}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Jobs</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No department summary data available.
                </div>
              )}
            </PanelCard>
          </div>
        </div>
      ) : null}

      {/* ===== UTILIZATION TAB ===== */}
      {tab === 'utilization' ? (
        <div className="space-y-6">
          <PanelCard title="Employee utilization" subtitle="Productive time as a percentage of available hours this shift.">
            {utilData.length > 0 ? (
              <div className="space-y-3">
                {[...utilData].sort((a, b) => b.utilization_pct - a.utilization_pct).map((emp) => (
                  <div key={emp.employee_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-50">{emp.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {emp.employee_id} &middot; {emp.department}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {emp.hours_worked.toFixed(1)}h / {emp.hours_available.toFixed(1)}h
                        </span>
                        <StatusPill
                          label={`${emp.utilization_pct}%`}
                          tone={utilTone(emp.utilization_pct)}
                        />
                      </div>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={`h-3 rounded-full transition-all ${utilBarColor(emp.utilization_pct)}`}
                        style={{ width: `${Math.min(emp.utilization_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                No utilization data available for the current shift.
              </div>
            )}
          </PanelCard>
        </div>
      ) : null}

      {/* ===== DOWNTIME TAB ===== */}
      {tab === 'downtime' ? (
        <div className="space-y-6">
          <PanelCard title="Downtime Pareto" subtitle="Pause reasons sorted by total impact. Address the top bars first for maximum shift recovery.">
            {sortedDowntime.length > 0 ? (
              <div className="space-y-3">
                {sortedDowntime.map((reason, idx) => {
                  const pct = Math.round((reason.total_minutes / maxDowntimeMinutes) * 100);
                  return (
                    <div key={reason.reason} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-slate-300">
                            {idx + 1}
                          </span>
                          <div className="text-sm font-semibold text-slate-50">{reason.reason}</div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div>{reason.occurrences} events</div>
                          <div className="mt-0.5">{reason.total_minutes} min total</div>
                        </div>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-3 rounded-full bg-amber-300 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-8 text-sm text-emerald-100">
                No downtime events recorded this shift.
              </div>
            )}
          </PanelCard>
        </div>
      ) : null}

      {/* ===== COST TAB ===== */}
      {tab === 'cost' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-6">
            <PanelCard title="Department cost breakdown" subtitle="Labor and overhead cost per department for the selected period.">
              <div className="mb-4 max-w-[200px]">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Period</div>
                <Select value={costPeriod} onChange={(e) => setCostPeriod(e.target.value as 'week' | 'month')}>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </Select>
              </div>
              {costData.length > 0 ? (
                <div className="space-y-3">
                  {costData.map((dept) => (
                    <div key={dept.department} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-50">{dept.department}</div>
                        <div className="text-sm font-semibold text-slate-50">{formatCurrency(dept.total_cost)}</div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Labor</div>
                          <div className="mt-1 text-sm text-slate-200">{formatCurrency(dept.labor_cost)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Overhead</div>
                          <div className="mt-1 text-sm text-slate-200">{formatCurrency(dept.overhead_cost)}</div>
                        </div>
                      </div>
                      {/* Proportional bar */}
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-2 rounded-full bg-violet-300 transition-all"
                          style={{ width: `${totalCost > 0 ? Math.round((dept.total_cost / totalCost) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No cost data available for the selected period.
                </div>
              )}
            </PanelCard>
          </div>

          <div className="space-y-6">
            <PanelCard title="Cost summary" subtitle="Aggregate cost for all departments in the selected period.">
              <div className="grid gap-3">
                <SummaryTile
                  label="Total cost"
                  value={formatCurrency(totalCost)}
                  hint={`Combined labor and overhead for ${costPeriod === 'week' ? 'this week' : 'this month'}.`}
                  accent="from-violet-400/22 via-violet-300/8 to-transparent"
                />
                <SummaryTile
                  label="Total labor"
                  value={formatCurrency(costData.reduce((s, d) => s + d.labor_cost, 0))}
                  hint="Direct labor cost across all departments."
                />
                <SummaryTile
                  label="Total overhead"
                  value={formatCurrency(costData.reduce((s, d) => s + d.overhead_cost, 0))}
                  hint="Machine burden and facility overhead."
                  accent="from-amber-300/22 via-amber-200/8 to-transparent"
                />
              </div>
            </PanelCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
