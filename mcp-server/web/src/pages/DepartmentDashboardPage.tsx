import { useCallback, useEffect, useRef, useState } from 'react';
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
type LaneState = 'loading' | 'live' | 'unavailable';

interface LaneStatus {
  state: LaneState;
  note: string;
}

const TAB_CONFIG: Record<Tab, { label: string }> = {
  overview: { label: 'Overview' },
  utilization: { label: 'Utilization' },
  downtime: { label: 'Downtime' },
  cost: { label: 'Cost' },
};

const LANE_LOADING: Record<Tab, LaneStatus> = {
  overview: {
    state: 'loading',
    note: 'Checking the mounted shift roster and department summary contracts.',
  },
  utilization: {
    state: 'loading',
    note: 'Checking the mounted employee utilization contracts.',
  },
  downtime: {
    state: 'loading',
    note: 'Checking the mounted downtime Pareto contract.',
  },
  cost: {
    state: 'loading',
    note: 'Checking the mounted department cost contract.',
  },
};

const neutralAccent = 'from-slate-400/18 via-slate-300/6 to-transparent';

interface ParsedCollection<T> {
  mounted: boolean;
  rawCount: number;
  rows: T[];
}

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function num(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function countPhrase(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

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

function laneTone(state: LaneState): 'emerald' | 'amber' | 'rose' {
  if (state === 'live') return 'emerald';
  if (state === 'loading') return 'amber';
  return 'rose';
}

function laneLabel(state: LaneState): string {
  if (state === 'live') return 'Live';
  if (state === 'loading') return 'Loading';
  return 'Unavailable';
}

function extractDepartments(value: unknown): unknown[] | null {
  const record = asRecord(value);
  return record && Array.isArray(record.departments) ? record.departments : null;
}

function parseClockedInEmployees(value: unknown): ParsedCollection<ClockedInEmployee> {
  const record = asRecord(value);
  const source = record && Array.isArray(record.employees) ? record.employees : null;

  if (!source) {
    return { mounted: false, rawCount: 0, rows: [] };
  }

  return {
    mounted: true,
    rawCount: source.length,
    rows: source.flatMap((entry) => {
      const employee = asRecord(entry);
      const employeeId = text(employee?.employee_id);
      const name = text(employee?.name);
      const clockInTime = text(employee?.clock_in_time);
      const department = text(employee?.department);

      if (!employeeId || !name || !clockInTime || !department) {
        return [];
      }

      return [{
        employee_id: employeeId,
        name,
        clock_in_time: clockInTime,
        department,
        active_job: text(employee?.active_job),
        machine: text(employee?.machine),
      }];
    }),
  };
}

function parseDeptSummaries(value: unknown): ParsedCollection<DeptSummary> {
  const source = extractDepartments(value);

  if (!source) {
    return { mounted: false, rawCount: 0, rows: [] };
  }

  return {
    mounted: true,
    rawCount: source.length,
    rows: source.flatMap((entry) => {
      const department = asRecord(entry);
      const name = text(department?.department ?? department?.name);
      const headcount = num(department?.headcount);
      const clockedIn = num(department?.clocked_in);
      const activeJobs = num(department?.active_jobs);

      if (!name || headcount == null || clockedIn == null || activeJobs == null) {
        return [];
      }

      return [{
        department: name,
        headcount,
        clocked_in: clockedIn,
        active_jobs: activeJobs,
      }];
    }),
  };
}

function parseDeptCosts(value: unknown): ParsedCollection<DeptCost> {
  const source = extractDepartments(value);

  if (!source) {
    return { mounted: false, rawCount: 0, rows: [] };
  }

  return {
    mounted: true,
    rawCount: source.length,
    rows: source.flatMap((entry) => {
      const department = asRecord(entry);
      const name = text(department?.department ?? department?.name);
      const laborCost = num(department?.labor_cost);
      const overheadCost = num(department?.overhead_cost);
      const totalCost = num(department?.total_cost);

      if (!name || laborCost == null || overheadCost == null) {
        return [];
      }

      return [{
        department: name,
        labor_cost: laborCost,
        overhead_cost: overheadCost,
        total_cost: totalCost ?? laborCost + overheadCost,
      }];
    }),
  };
}

function parseDowntimeReasons(value: unknown): ParsedCollection<DowntimeReason> {
  const record = asRecord(value);
  const source = record && Array.isArray(record.downtime_pareto) ? record.downtime_pareto : null;

  if (!source) {
    return { mounted: false, rawCount: 0, rows: [] };
  }

  return {
    mounted: true,
    rawCount: source.length,
    rows: source.flatMap((entry) => {
      const reason = asRecord(entry);
      const name = text(reason?.reason);
      const occurrences = num(reason?.occurrences);
      const totalMinutes = num(reason?.total_minutes);

      if (!name || occurrences == null || totalMinutes == null) {
        return [];
      }

      return [{
        reason: name,
        occurrences,
        total_minutes: totalMinutes,
      }];
    }),
  };
}

function parseEmployeeUtilization(
  employee: ClockedInEmployee,
  value: unknown,
): EmployeeUtil | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const utilization = num(record.utilization_pct);
  const hoursWorked = num(record.billable_hours ?? record.hours_worked);
  const hoursAvailable = num(record.total_hours ?? record.hours_available ?? record.available_hours);

  if (utilization == null || hoursWorked == null || hoursAvailable == null) {
    return null;
  }

  return {
    employee_id: employee.employee_id,
    name: employee.name,
    department: employee.department,
    utilization_pct: utilization,
    hours_worked: hoursWorked,
    hours_available: hoursAvailable,
  };
}

function LaneStatusCard({
  title,
  status,
}: {
  title: string;
  status: LaneStatus;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">{status.note}</div>
        </div>
        <StatusPill label={laneLabel(status.state)} tone={laneTone(status.state)} />
      </div>
    </div>
  );
}

function LaneMessage({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm leading-6 text-slate-400">
      {message}
    </div>
  );
}

export function DepartmentDashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clockedIn, setClockedIn] = useState<ClockedInEmployee[]>([]);
  const [deptSummaries, setDeptSummaries] = useState<DeptSummary[]>([]);
  const [utilData, setUtilData] = useState<EmployeeUtil[]>([]);
  const [downtimeReasons, setDowntimeReasons] = useState<DowntimeReason[]>([]);
  const [costPeriod, setCostPeriod] = useState<'week' | 'month'>('week');
  const [costData, setCostData] = useState<DeptCost[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [laneStatus, setLaneStatus] = useState<Record<Tab, LaneStatus>>(LANE_LOADING);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clockedInCount = clockedIn.length;
  const activeJobCount = clockedIn.filter((employee) => employee.active_job !== null).length;
  const avgUtil = utilData.length > 0
    ? Math.round(utilData.reduce((sum, employee) => sum + employee.utilization_pct, 0) / utilData.length)
    : 0;
  const sortedDowntime = [...downtimeReasons].sort((left, right) => right.total_minutes - left.total_minutes);
  const maxDowntimeMinutes = sortedDowntime.length > 0 ? sortedDowntime[0].total_minutes : 1;
  const totalCost = costData.reduce((sum, department) => sum + department.total_cost, 0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLaneStatus(LANE_LOADING);

    const nextLaneStatus: Record<Tab, LaneStatus> = { ...LANE_LOADING };
    let unavailableCount = 0;

    const [clockedInResult, deptResult] = await Promise.allSettled([
      whoClockedIn(),
      employeeDeptSummary(),
    ]);

    let overviewClockedIssue: string | null = null;
    let overviewDeptIssue: string | null = null;
    let employees: ClockedInEmployee[] = [];
    let employeeRowsMounted = false;

    if (clockedInResult.status === 'fulfilled') {
      const employeeCollection = parseClockedInEmployees(clockedInResult.value.result);
      employeeRowsMounted = employeeCollection.mounted && (employeeCollection.rawCount === 0 || employeeCollection.rows.length > 0);

      if (employeeRowsMounted) {
        employees = employeeCollection.rows;
        setClockedIn(employeeCollection.rows);
      } else {
        setClockedIn([]);
        overviewClockedIssue = employeeCollection.mounted
          ? 'The mounted /api/v1/erp/who-clocked-in response published employee rows without usable identity or shift fields.'
          : 'The live /api/v1/erp/who-clocked-in route returned no usable employees collection.';
      }

      const downtimeCollection = parseDowntimeReasons(clockedInResult.value.result);
      const downtimeMounted = downtimeCollection.mounted && (downtimeCollection.rawCount === 0 || downtimeCollection.rows.length > 0);

      if (!downtimeMounted) {
        setDowntimeReasons([]);
        unavailableCount += 1;
        nextLaneStatus.downtime = {
          state: 'unavailable',
          note: downtimeCollection.mounted
            ? 'The mounted downtime_pareto collection published no usable reason or minute totals, so this lane stays unavailable instead of staging placeholder loss drivers.'
            : 'The mounted /api/v1/erp/who-clocked-in response did not publish a downtime_pareto collection, so the downtime lane stays unavailable.',
        };
      } else {
        setDowntimeReasons(downtimeCollection.rows);
        nextLaneStatus.downtime = {
          state: 'live',
          note: downtimeCollection.rows.length > 0
            ? `Mounted from /api/v1/erp/who-clocked-in with ${countPhrase(downtimeCollection.rows.length, 'downtime reason')} currently published.`
            : 'Mounted from /api/v1/erp/who-clocked-in with no downtime events currently published for this shift.',
        };
      }
    } else {
      const message = clockedInResult.reason instanceof ApiError
        ? clockedInResult.reason.message
        : 'The live /api/v1/erp/who-clocked-in route is unavailable right now.';
      overviewClockedIssue = message;
      setClockedIn([]);
      setDowntimeReasons([]);
      unavailableCount += 1;
      nextLaneStatus.downtime = {
        state: 'unavailable',
        note: message,
      };
    }

    let departments: DeptSummary[] = [];
    let departmentRowsMounted = false;

    if (deptResult.status === 'fulfilled') {
      const deptCollection = parseDeptSummaries(deptResult.value.result);
      departmentRowsMounted = deptCollection.mounted && (deptCollection.rawCount === 0 || deptCollection.rows.length > 0);

      if (departmentRowsMounted) {
        departments = deptCollection.rows;
        setDeptSummaries(deptCollection.rows);
      } else {
        setDeptSummaries([]);
        overviewDeptIssue = deptCollection.mounted
          ? 'The mounted /api/v1/erp/employee-dept-summary response published department rows without usable headcount, clocked-in, or active-job fields.'
          : 'The live /api/v1/erp/employee-dept-summary route returned no usable departments collection.';
      }

      const costCollection = parseDeptCosts(deptResult.value.result);
      const missingCostFields = costCollection.rawCount - costCollection.rows.length;

      if (!costCollection.mounted) {
        setCostData([]);
        unavailableCount += 1;
        nextLaneStatus.cost = {
          state: 'unavailable',
          note: 'The mounted /api/v1/erp/employee-dept-summary response did not publish a departments collection for the cost lane.',
        };
      } else if (costCollection.rawCount === 0) {
        setCostData([]);
        nextLaneStatus.cost = {
          state: 'live',
          note: 'Mounted from /api/v1/erp/employee-dept-summary with no department rows currently published, so the cost lane has nothing current to display.',
        };
      } else if (missingCostFields > 0) {
        setCostData([]);
        unavailableCount += 1;
        nextLaneStatus.cost = {
          state: 'unavailable',
          note: `The mounted department summary omitted live labor, overhead, or total cost on ${countPhrase(missingCostFields, 'department row')}, so this lane stays unavailable instead of inferring spend from headcount.`,
        };
      } else {
        setCostData(costCollection.rows);
        nextLaneStatus.cost = {
          state: 'live',
          note: `Mounted from /api/v1/erp/employee-dept-summary with ${countPhrase(costCollection.rows.length, 'department row')} carrying live labor and overhead cost fields.`,
        };
      }
    } else {
      const message = deptResult.reason instanceof ApiError
        ? deptResult.reason.message
        : 'The live /api/v1/erp/employee-dept-summary route is unavailable right now.';
      overviewDeptIssue = message;
      setDeptSummaries([]);
      setCostData([]);
      unavailableCount += 1;
      nextLaneStatus.cost = {
        state: 'unavailable',
        note: message,
      };
    }

    if (employeeRowsMounted && departmentRowsMounted) {
      nextLaneStatus.overview = {
        state: 'live',
        note: `Mounted from /api/v1/erp/who-clocked-in and /api/v1/erp/employee-dept-summary with ${countPhrase(employees.length, 'active employee row')} and ${countPhrase(departments.length, 'department row')}.`,
      };
    } else {
      unavailableCount += 1;
      nextLaneStatus.overview = {
        state: 'unavailable',
        note: [overviewClockedIssue, overviewDeptIssue].filter(Boolean).join(' '),
      };
    }

    if (!employeeRowsMounted) {
      setUtilData([]);
      unavailableCount += 1;
      nextLaneStatus.utilization = {
        state: 'unavailable',
        note: overviewClockedIssue ?? 'Utilization cannot mount until the active roster contract returns a usable employee collection.',
      };
    } else if (employees.length === 0) {
      setUtilData([]);
      nextLaneStatus.utilization = {
        state: 'live',
        note: 'Mounted from /api/v1/erp/who-clocked-in with no employees currently on the clock, so there is no live utilization roster to score.',
      };
    } else {
      const utilizationResults = await Promise.allSettled(
        employees.map((employee) => employeeUtilization({ employee_id: employee.employee_id })),
      );

      const parsedUtilization: EmployeeUtil[] = [];
      let utilizationIssues = 0;

      utilizationResults.forEach((result, index) => {
        if (result.status !== 'fulfilled') {
          utilizationIssues += 1;
          return;
        }

        const parsed = parseEmployeeUtilization(employees[index], result.value.result);
        if (!parsed) {
          utilizationIssues += 1;
          return;
        }

        parsedUtilization.push(parsed);
      });

      if (utilizationIssues > 0) {
        setUtilData([]);
        unavailableCount += 1;
        nextLaneStatus.utilization = {
          state: 'unavailable',
          note: `Employee utilization is unavailable because ${countPhrase(utilizationIssues, 'employee call')} failed or returned no usable payload. This lane stays fail-closed instead of zero-filling missing responses.`,
        };
      } else {
        setUtilData(parsedUtilization);
        nextLaneStatus.utilization = {
          state: 'live',
          note: `Mounted from /api/v1/erp/employee-utilization for ${countPhrase(parsedUtilization.length, 'active employee')} currently on the clock.`,
        };
      }
    }

    setLaneStatus(nextLaneStatus);
    setLastRefreshed(new Date());
    setError(
      unavailableCount === 4
        ? 'Department overview, utilization, downtime, and cost feeds are all unavailable right now.'
        : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
    refreshRef.current = setInterval(() => {
      void loadData();
    }, 30000);

    return () => {
      if (refreshRef.current) {
        clearInterval(refreshRef.current);
      }
    };
  }, [loadData]);

  const utilizationValue = laneStatus.utilization.state === 'live'
    ? utilData.length > 0 ? `${avgUtil}%` : 'No roster'
    : laneStatus.utilization.state === 'loading'
      ? 'Loading'
      : 'Unavailable';

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
              value={laneStatus.overview.state === 'live' ? String(clockedInCount) : 'Unavailable'}
              hint={laneStatus.overview.state === 'live'
                ? `${clockedInCount} employee${clockedInCount === 1 ? '' : 's'} currently mounted from the live shift roster.`
                : laneStatus.overview.note}
              accent={laneStatus.overview.state === 'live' ? undefined : neutralAccent}
            />
            <SummaryTile
              label="Active Jobs"
              value={laneStatus.overview.state === 'live' ? String(activeJobCount) : 'Unavailable'}
              hint={laneStatus.overview.state === 'live'
                ? `${activeJobCount} job${activeJobCount === 1 ? '' : 's'} actively running right now.`
                : 'Active job posture stays hidden until the overview lane mounts both live roster and department summary contracts.'}
              accent={laneStatus.overview.state === 'live' ? 'from-sky-400/22 via-sky-300/8 to-transparent' : neutralAccent}
            />
            <SummaryTile
              label="Utilization %"
              value={utilizationValue}
              hint={laneStatus.utilization.state === 'live' && utilData.length > 0
                ? 'Average employee utilization across all mounted utilization rows.'
                : laneStatus.utilization.note}
              accent={laneStatus.utilization.state === 'live' ? 'from-emerald-400/22 via-emerald-300/8 to-transparent' : neutralAccent}
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              This desk now renders mounted department contracts or explicit unavailable posture. Labor cost and utilization are no longer implied when the live responses omit those fields.
            </div>
            {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string }]>).map(([key, config]) => (
              <LaneStatusCard key={key} title={config.label} status={laneStatus[key]} />
            ))}
            <div className="flex items-center gap-3">
              <ActionButton onClick={() => { void loadData(); }}>Refresh data</ActionButton>
              {lastRefreshed ? (
                <span className="text-xs text-slate-500">
                  Updated {lastRefreshed.toLocaleTimeString()}
                </span>
              ) : null}
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing department data..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => { void loadData(); }} /> : null}

      {tab === 'overview' ? (
        laneStatus.overview.state === 'live' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
            <div className="space-y-6">
              <PanelCard title="Who's on the clock" subtitle="Live clock-in status from the timecard system.">
                {clockedIn.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {clockedIn.map((employee) => (
                      <div key={employee.employee_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{employee.name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                              {employee.employee_id} &middot; {employee.department}
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            <div>In at {employee.clock_in_time}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {employee.active_job ? (
                            <StatusPill label={employee.active_job} tone="emerald" />
                          ) : (
                            <StatusPill label="No active job" tone="slate" />
                          )}
                          {employee.machine ? <StatusPill label={employee.machine} tone="sky" /> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <LaneMessage message="The mounted shift roster currently shows no employees clocked in." />
                )}
              </PanelCard>

              <PanelCard title="Active jobs per machine" subtitle="Machines with an operator and a running job right now.">
                {clockedIn.filter((employee) => employee.active_job && employee.machine).length > 0 ? (
                  <div className="space-y-3">
                    {clockedIn
                      .filter((employee) => employee.active_job && employee.machine)
                      .map((employee) => (
                        <div key={employee.employee_id} className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-cyan-100">{employee.machine}</span>
                            <span className="text-xs text-slate-500">&rarr;</span>
                            <span className="text-sm text-slate-200">{employee.active_job}</span>
                          </div>
                          <span className="text-xs text-slate-400">{employee.name}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <LaneMessage message="The mounted shift roster currently shows no machines with an operator and active job." />
                )}
              </PanelCard>
            </div>

            <div className="space-y-6">
              <PanelCard title="Department headcount" subtitle="Summary by department from the employee registry.">
                {deptSummaries.length > 0 ? (
                  <div className="space-y-3">
                    {deptSummaries.map((department) => (
                      <div key={department.department} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-50">{department.department}</div>
                          <StatusPill
                            label={`${department.clocked_in}/${department.headcount} in`}
                            tone={department.clocked_in >= department.headcount * 0.8 ? 'emerald' : 'amber'}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-semibold text-slate-50">{department.headcount}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Roster</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-cyan-100">{department.clocked_in}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Clocked in</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-emerald-100">{department.active_jobs}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Jobs</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <LaneMessage message="The mounted department summary currently publishes no department rows." />
                )}
              </PanelCard>
            </div>
          </div>
        ) : (
          <PanelCard title="Department overview" subtitle="Mounted roster and department summary posture for the current shift.">
            <LaneMessage message={laneStatus.overview.note} />
          </PanelCard>
        )
      ) : null}

      {tab === 'utilization' ? (
        <PanelCard title="Employee utilization" subtitle="Productive time as a percentage of available hours this shift.">
          {laneStatus.utilization.state !== 'live' ? (
            <LaneMessage message={laneStatus.utilization.note} />
          ) : utilData.length > 0 ? (
            <div className="space-y-3">
              {[...utilData].sort((left, right) => right.utilization_pct - left.utilization_pct).map((employee) => (
                <div key={employee.employee_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-50">{employee.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {employee.employee_id} &middot; {employee.department}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {employee.hours_worked.toFixed(1)}h / {employee.hours_available.toFixed(1)}h
                      </span>
                      <StatusPill label={`${employee.utilization_pct}%`} tone={utilTone(employee.utilization_pct)} />
                    </div>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={`h-3 rounded-full transition-all ${utilBarColor(employee.utilization_pct)}`}
                      style={{ width: `${Math.min(employee.utilization_pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <LaneMessage message={laneStatus.utilization.note} />
          )}
        </PanelCard>
      ) : null}

      {tab === 'downtime' ? (
        <PanelCard title="Downtime Pareto" subtitle="Pause reasons sorted by total impact. Address the top bars first for maximum shift recovery.">
          {laneStatus.downtime.state !== 'live' ? (
            <LaneMessage message={laneStatus.downtime.note} />
          ) : sortedDowntime.length > 0 ? (
            <div className="space-y-3">
              {sortedDowntime.map((reason, index) => {
                const pct = Math.round((reason.total_minutes / maxDowntimeMinutes) * 100);
                return (
                  <div key={reason.reason} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-slate-300">
                          {index + 1}
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
            <LaneMessage message="The mounted downtime feed currently publishes no pause events for this shift." />
          )}
        </PanelCard>
      ) : null}

      {tab === 'cost' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-6">
            <PanelCard title="Department cost breakdown" subtitle="Labor and overhead cost per department for the selected period.">
              <div className="mb-4 max-w-[200px]">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Period</div>
                <Select value={costPeriod} onChange={(event) => setCostPeriod(event.target.value as 'week' | 'month')}>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </Select>
              </div>
              {laneStatus.cost.state !== 'live' ? (
                <LaneMessage message={laneStatus.cost.note} />
              ) : costData.length > 0 ? (
                <div className="space-y-3">
                  {costData.map((department) => (
                    <div key={department.department} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-50">{department.department}</div>
                        <div className="text-sm font-semibold text-slate-50">{formatCurrency(department.total_cost)}</div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Labor</div>
                          <div className="mt-1 text-sm text-slate-200">{formatCurrency(department.labor_cost)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Overhead</div>
                          <div className="mt-1 text-sm text-slate-200">{formatCurrency(department.overhead_cost)}</div>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-2 rounded-full bg-violet-300 transition-all"
                          style={{ width: `${totalCost > 0 ? Math.round((department.total_cost / totalCost) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <LaneMessage message={laneStatus.cost.note} />
              )}
            </PanelCard>
          </div>

          <div className="space-y-6">
            <PanelCard title="Cost summary" subtitle="Aggregate cost for all departments in the selected period.">
              {laneStatus.cost.state === 'live' && costData.length > 0 ? (
                <div className="grid gap-3">
                  <SummaryTile
                    label="Total cost"
                    value={formatCurrency(totalCost)}
                    hint={`Combined labor and overhead for ${costPeriod === 'week' ? 'this week' : 'this month'}.`}
                    accent="from-violet-400/22 via-violet-300/8 to-transparent"
                  />
                  <SummaryTile
                    label="Total labor"
                    value={formatCurrency(costData.reduce((sum, department) => sum + department.labor_cost, 0))}
                    hint="Direct labor cost across all departments."
                  />
                  <SummaryTile
                    label="Total overhead"
                    value={formatCurrency(costData.reduce((sum, department) => sum + department.overhead_cost, 0))}
                    hint="Machine burden and facility overhead."
                    accent="from-amber-300/22 via-amber-200/8 to-transparent"
                  />
                </div>
              ) : (
                <LaneMessage message={laneStatus.cost.note} />
              )}
            </PanelCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
