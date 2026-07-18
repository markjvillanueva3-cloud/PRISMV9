import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError, getTimecard, listEmployees } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import type { Employee, TimecardSummary } from '../api/types';
import { buildShopFloorPath } from '../utils/shopFloorRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

function weekStart(): string {
  const date = new Date();
  date.setDate(date.getDate() - date.getDay());
  return date.toISOString().slice(0, 10);
}

function weekEnd(): string {
  const date = new Date();
  date.setDate(date.getDate() + (6 - date.getDay()));
  return date.toISOString().slice(0, 10);
}

function hours(value: number): string {
  return `${value.toFixed(1)}h`;
}

const statusTones: Record<string, 'slate' | 'sky' | 'emerald'> = {
  draft: 'slate',
  submitted: 'sky',
  approved: 'emerald',
};

export function TimecardPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || routeContext.origin.source || '';
  const upstreamSource = routeContext.origin.source && routeContext.origin.source !== launcherSource ? routeContext.origin.source : '';
  const routedEmployeeId = routeParams.get('employeeId') || (routeContext.focus.type === 'employee' ? routeContext.focus.id : '');
  const launcherSourceLabel = formatWorkflowSourceLabel(launcherSource);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState(routedEmployeeId);
  const [periodStart, setPeriodStart] = useState(weekStart());
  const [periodEnd, setPeriodEnd] = useState(weekEnd());
  const [timecard, setTimecard] = useState<TimecardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmployees()
      .then((response) => setEmployees((((response.result as unknown as { employees?: Employee[] })?.employees) ?? [])))
      .catch(() => setEmployees([]));
  }, []);

  async function handleFetch() {
    if (!selectedEmployee) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getTimecard({
        employee_id: selectedEmployee,
        period_start: periodStart,
        period_end: periodEnd,
      });
      setTimecard((response.result as unknown as TimecardSummary) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load timecard');
    } finally {
      setLoading(false);
    }
  }

  const selectedEmployeeRecord = employees.find((employee) => employee.id === selectedEmployee);
  const laborCost = useMemo(
    () => (timecard?.jobs ?? []).reduce((sum, job) => sum + job.cost, 0),
    [timecard],
  );
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: launcherSource || 'timecards',
            recordType: selectedEmployeeRecord || routedEmployeeId ? 'Employee' : routeContext.origin.recordType,
            recordId: selectedEmployeeRecord?.id || routedEmployeeId || routeContext.origin.recordId,
            customer: routeContext.origin.customer,
            note:
              routeContext.origin.note
              || `Keep ${selectedEmployeeRecord ? `${selectedEmployeeRecord.first_name} ${selectedEmployeeRecord.last_name}` : 'the selected employee'} attached while labor review moves into payroll or live floor execution.`,
            threadId: routeContext.origin.threadId,
          },
    [launcherSource, routeContext.origin, routedEmployeeId, selectedEmployeeRecord],
  );
  const effectiveFocus = useMemo(
    () =>
      selectedEmployeeRecord
        ? {
            type: 'employee',
            id: selectedEmployeeRecord.id,
          }
        : routeContext.focus.id
          ? routeContext.focus
          : undefined,
    [routeContext.focus, selectedEmployeeRecord],
  );
  const workforceReference =
    selectedEmployeeRecord?.id
    || routedEmployeeId
    || routeContext.origin.recordId
      ? `Employee ${selectedEmployeeRecord?.id || routedEmployeeId || routeContext.origin.recordId}`
      : '';
  const payrollPath = useMemo(
    () =>
      buildWorkflowPath('/payroll', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'timecards',
          employeeId: selectedEmployeeRecord?.id || routedEmployeeId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId, selectedEmployeeRecord?.id],
  );
  const shopFloorPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'timecards',
        note:
          routeContext.origin.note
          || `Launch ${selectedEmployeeRecord ? `${selectedEmployeeRecord.first_name} ${selectedEmployeeRecord.last_name}` : 'the selected employee'} from labor review into live shift and task tracking.`,
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          employeeId: selectedEmployeeRecord?.id || routedEmployeeId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.pathname, location.search, routeContext.origin.note, routedEmployeeId, selectedEmployeeRecord],
  );
  const directoryPath = useMemo(
    () =>
      buildWorkflowPath('/employees', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'timecards',
          employeeId: selectedEmployeeRecord?.id || routedEmployeeId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId, selectedEmployeeRecord?.id],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Labor control"
        title="Timecards"
        description="Review weekly labor posture, employee-level hour splits, and job-by-job labor cost without leaving the scheduling rhythm."
        metrics={
          <>
            <SummaryTile label="Regular hours" value={hours(timecard?.regular_hours ?? 0)} hint="Straight-time load in the selected period." />
            <SummaryTile label="Overtime" value={hours(timecard?.overtime_hours ?? 0)} hint="Overtime pressure already hitting this employee." accent="from-amber-400/22 via-amber-300/10 to-transparent" />
            <SummaryTile label="Labor cost" value={`$${laborCost.toFixed(2)}`} hint="Allocated cost across tracked jobs in the active timecard." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
          </>
        }
        aside={
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Timecard window</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Pull one employee into view, inspect the weekly split, and use the right lane to see status and labor concentration quickly.
              </div>
            </div>
            {launcherSource ? (
              <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                {launcherSourceLabel || 'This workflow'} opened Timecards with workforce context.{' '}
                {effectiveOrigin.note || 'Keep labor review attached while timecards move into payroll or live floor execution.'}
                {workforceReference ? (
                  <div className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-cyan-100/90">
                    Record: <span className="font-semibold normal-case tracking-normal">{workforceReference}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {upstreamSourceLabel ? (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200">
                Upstream workforce origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>.
              </div>
            ) : null}
            <div className="grid gap-3">
              <Field label="Employee">
                <Select id="tc-emp" value={selectedEmployee} onChange={(event) => setSelectedEmployee(event.target.value)}>
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Period start">
                  <Input id="tc-start" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
                </Field>
                <Field label="Period end">
                  <Input id="tc-end" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
                </Field>
              </div>
              <ActionButton onClick={() => void handleFetch()} disabled={loading || !selectedEmployee} className="w-full">
                Load timecard
              </ActionButton>
            </div>
          </div>
        }
      />

      {loading ? <LoadingState label="Loading labor split..." /> : null}
      {error ? <ErrorState message={error} onRetry={handleFetch} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          <PanelCard title="Job allocation" subtitle="The center of gravity for the selected week: hours, cost, and which jobs consumed the labor budget.">
            {timecard ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-50">{timecard.employee_name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill label={hours(timecard.total_hours)} tone="sky" />
                      <StatusPill label={hours(timecard.double_time_hours)} tone={timecard.double_time_hours > 0 ? 'rose' : 'slate'} />
                      <StatusPill label={`${timecard.period_start} → ${timecard.period_end}`} tone="slate" />
                    </div>
                  </div>
                  <StatusPill label={timecard.status.toUpperCase()} tone={statusTones[timecard.status] ?? 'slate'} />
                </div>

                {(timecard.jobs ?? []).length > 0 ? (
                  <div className="grid gap-3">
                    {timecard.jobs.map((job) => (
                      <div
                        key={job.job_id}
                        className="grid gap-3 rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 md:grid-cols-[140px_minmax(0,1fr)_160px]"
                      >
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Job</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">{job.job_id}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Hours booked</div>
                          <div className="mt-2 h-2 rounded-full bg-slate-900">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300"
                              style={{ width: `${timecard.total_hours > 0 ? Math.max((job.hours / timecard.total_hours) * 100, 8) : 8}%` }}
                            />
                          </div>
                          <div className="mt-2 text-sm text-slate-300">{hours(job.hours)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Labor cost</div>
                          <div className="mt-2 font-mono text-lg text-slate-100">${job.cost.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                    The selected timecard has no job allocation rows yet.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Choose an employee and date range to load weekly labor allocation.
              </div>
            )}
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="Labor brief" subtitle="Quick reads for supervisor review before submission or approval.">
            <div className="grid gap-3">
              <SummaryTile label="Total hours" value={hours(timecard?.total_hours ?? 0)} hint="All regular, overtime, and double-time hours in view." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
              <SummaryTile label="Overtime load" value={hours(timecard?.overtime_hours ?? 0)} hint="Use this to catch schedule slippage early." accent="from-amber-400/22 via-amber-300/10 to-transparent" />
              <SummaryTile label="Approval status" value={timecard?.status ?? 'pending'} hint="Current state of the timecard workflow." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
            </div>
          </PanelCard>

          <PanelCard title="Employee posture" subtitle="Keep the selected person, department, and shop role visible while reviewing labor allocation.">
            {selectedEmployeeRecord ? (
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-lg font-semibold text-slate-50">
                    {selectedEmployeeRecord.first_name} {selectedEmployeeRecord.last_name}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusPill label={selectedEmployeeRecord.department} tone="violet" />
                    <StatusPill label={selectedEmployeeRecord.role} tone="sky" />
                    <StatusPill label={selectedEmployeeRecord.status} tone={selectedEmployeeRecord.status === 'active' ? 'emerald' : 'amber'} />
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-300">
                  Skills in rotation: {(selectedEmployeeRecord.skills ?? []).length > 0 ? selectedEmployeeRecord.skills.join(', ') : 'No skill tags on file yet.'}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Employee context will appear here after you select someone from the roster.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Workforce handoff" subtitle="Carry the same employee into payroll or the live floor without losing labor-review context.">
            <div className="grid gap-3">
              <Link
                to={payrollPath}
                className="block rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.10] px-4 py-4 text-sm leading-6 text-emerald-50 transition hover:border-emerald-300/32 hover:bg-emerald-300/[0.16]"
              >
                <div className="font-semibold">Open Payroll follow-up</div>
                <div className="mt-2 text-emerald-50/80">
                  Roll the selected employee and current labor window into payroll review without reopening the people lane cold.
                </div>
              </Link>

              <Link
                to={shopFloorPath}
                className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
              >
                <div className="font-semibold">Open Shop Floor Clock</div>
                <div className="mt-2 text-sky-50/80">
                  Send the selected employee back into live shift and task tracking with the same workforce record attached.
                </div>
              </Link>

              <Link
                to={directoryPath}
                className="block rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-100 transition hover:border-white/18 hover:bg-white/[0.07]"
              >
                <div className="font-semibold">Return to Employee Directory</div>
                <div className="mt-2 text-slate-300">
                  Bring the selected employee back into the roster and skill posture without dropping workforce provenance.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
