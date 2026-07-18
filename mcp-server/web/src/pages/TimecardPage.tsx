import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError, getTimecard, getTimecardAuditLog, listEmployees, updateTimecardStatus } from '../api/client';
import { unwrapPrism } from '../api/unwrap';
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
  return formatLocalDateInput(date);
}

function weekEnd(): string {
  const date = new Date();
  date.setDate(date.getDate() + (6 - date.getDay()));
  return formatLocalDateInput(date);
}

function formatLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hours(value: number): string {
  return `${value.toFixed(1)}h`;
}

function formatProcessTypeLabel(value?: string): string {
  if (!value) return 'General';
  return value.replace(/_/g, ' ');
}

const statusTones: Record<string, 'slate' | 'sky' | 'emerald'> = {
  draft: 'slate',
  submitted: 'sky',
  approved: 'emerald',
  locked: 'emerald',
};

function exportTimecardCSV(tc: TimecardSummary) {
  const header = '# ADP-compatible timecard export\nemployee_id,employee_name,period_start,period_end,job_id,hours,cost,total_hours,regular_hours,overtime_hours,double_time_hours,status';
  const rows = (tc.jobs ?? []).map((j) =>
    [tc.employee_id, tc.employee_name, tc.period_start, tc.period_end, j.job_id, j.hours.toFixed(2), j.cost.toFixed(2), tc.total_hours.toFixed(2), tc.regular_hours.toFixed(2), tc.overtime_hours.toFixed(2), tc.double_time_hours.toFixed(2), tc.status].join(',')
  );
  if (rows.length === 0) {
    rows.push([tc.employee_id, tc.employee_name, tc.period_start, tc.period_end, '', '0', '0', tc.total_hours.toFixed(2), tc.regular_hours.toFixed(2), tc.overtime_hours.toFixed(2), tc.double_time_hours.toFixed(2), tc.status].join(','));
  }
  const csv = header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timecard_${tc.employee_name.replace(/\s+/g, '_')}_${tc.period_start}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function extractResponsePayload<T = Record<string, unknown>>(response: unknown): T {
  if (response && typeof response === 'object') {
    const result = (response as { result?: unknown }).result;
    if (result !== undefined) return result as T;
    const data = (response as { data?: unknown }).data;
    if (data !== undefined) return data as T;
  }
  return {} as T;
}

function normalizeTimecardSummary(
  payload: unknown,
  fallbackStart: string,
  fallbackEnd: string,
): TimecardSummary | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const raw = payload as Record<string, any>;
  const jobs = Array.isArray(raw.jobs)
    ? raw.jobs.map((job) => {
        const operationDetails = Array.isArray(job?.operation_details)
          ? job.operation_details.map((detail: Record<string, unknown>) => ({
              operation: String(detail?.operation ?? 'General'),
              process_type: typeof detail?.process_type === 'string' ? detail.process_type : undefined,
              machine_id: typeof detail?.machine_id === 'string' ? detail.machine_id : undefined,
              hours: Number(detail?.hours ?? 0),
              cost: Number(detail?.cost ?? 0),
              good_parts: typeof detail?.good_parts === 'number' ? detail.good_parts : undefined,
              scrap_count: typeof detail?.scrap_count === 'number' ? detail.scrap_count : undefined,
            }))
          : [];

        return {
          job_id: String(job?.job_id ?? ''),
          hours: Number(job?.hours ?? 0),
          cost:
            Number(job?.cost ?? 0)
            || operationDetails.reduce((sum: number, detail: { cost: number }) => sum + detail.cost, 0),
          operations: Array.isArray(job?.operations)
            ? job.operations.map((operation: unknown) => String(operation))
            : [],
          operation_details: operationDetails,
        };
      })
    : [];

  const totalHours =
    typeof raw.total_hours === 'number'
      ? raw.total_hours
      : jobs.reduce((sum, job) => sum + job.hours, 0);

  const status = ['draft', 'submitted', 'approved', 'locked'].includes(String(raw.status ?? ''))
    ? (raw.status as TimecardSummary['status'])
    : 'draft';

  return {
    employee_id: String(raw.employee_id ?? ''),
    employee_name: String(raw.employee_name ?? 'Unknown employee'),
    period_start: String(raw.period_start ?? raw.start_date ?? fallbackStart),
    period_end: String(raw.period_end ?? raw.end_date ?? fallbackEnd),
    regular_hours: Number(raw.regular_hours ?? 0),
    overtime_hours: Number(raw.overtime_hours ?? 0),
    double_time_hours: Number(raw.double_time_hours ?? 0),
    total_hours: Number(totalHours ?? 0),
    jobs,
    status,
  };
}

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
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    listEmployees()
      .then((response) => setEmployees(((unwrapPrism(response) as { employees?: Employee[] })?.employees) ?? []))
      .catch(() => setEmployees([]));
  }, []);

  async function handleFetch() {
    if (!selectedEmployee) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getTimecard({
        employee_id: selectedEmployee,
        start_date: periodStart,
        end_date: periodEnd,
      });
      setTimecard(normalizeTimecardSummary(unwrapPrism(response), periodStart, periodEnd));
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load timecard');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadAudit() {
    if (!selectedEmployee) return;
    setAuditLoading(true);
    try {
      const payload = extractResponsePayload<any>(await getTimecardAuditLog({
        employee_id: selectedEmployee,
        start_date: timecard?.period_start ?? periodStart,
        end_date: timecard?.period_end ?? periodEnd,
      }));
      setAuditLog((payload.records ?? payload.data ?? payload ?? []) as any[]);
    } catch (issue) {
      setAuditLog([]);
      setError(issue instanceof ApiError ? issue.message : 'Failed to load audit trail');
    } finally {
      setAuditLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!selectedEmployee || !timecard) return;
    const trimmedNote = statusNote.trim();
    const requiresReason = newStatus !== 'submitted';
    if (requiresReason && !trimmedNote) {
      setError('Add a status note before approving, rejecting, locking, or reopening this timecard.');
      return;
    }
    setStatusUpdating(true);
    try {
      await updateTimecardStatus({
        employee_id: selectedEmployee,
        week_start: timecard.period_start,
        status: newStatus,
        change_reason: trimmedNote || undefined,
      });
      setTimecard({ ...timecard, status: newStatus as TimecardSummary['status'] });
      setStatusNote('');
      if (showAuditLog) {
        await handleLoadAudit();
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : `Failed to update status to ${newStatus}`);
    } finally {
      setStatusUpdating(false);
    }
  }

  const selectedEmployeeRecord = employees.find((employee) => employee.id === selectedEmployee);
  const workforceEmployeeId = selectedEmployeeRecord?.id || routedEmployeeId || '';
  const workforceSubjectLabel = selectedEmployeeRecord
    ? `${selectedEmployeeRecord.first_name} ${selectedEmployeeRecord.last_name}`
    : 'the selected employee';
  const canLaunchWorkforceFollowup = workforceEmployeeId.length > 0;
  const laborCost = useMemo(
    () => (timecard?.jobs ?? []).reduce((sum, job) => sum + job.cost, 0),
    [timecard],
  );
  const canExport = timecard ? timecard.status === 'approved' || timecard.status === 'locked' : false;
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
              || `Keep ${workforceSubjectLabel} attached while labor review moves into payroll or live floor execution.`,
            threadId: routeContext.origin.threadId,
          },
    [launcherSource, routeContext.origin, routedEmployeeId, selectedEmployeeRecord, workforceSubjectLabel],
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
    workforceEmployeeId
    || routeContext.origin.recordId
      ? `Employee ${workforceEmployeeId || routeContext.origin.recordId}`
      : '';
  const payrollPath = useMemo(
    () =>
      buildWorkflowPath('/payroll', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'timecards',
          employeeId: workforceEmployeeId || undefined,
          periodStart: timecard?.period_start ?? periodStart,
          periodEnd: timecard?.period_end ?? periodEnd,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, periodEnd, periodStart, timecard?.period_end, timecard?.period_start, workforceEmployeeId],
  );
  const shopFloorPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'timecards',
        note:
          routeContext.origin.note
          || `Launch ${workforceSubjectLabel} from labor review into live shift and task tracking.`,
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          employeeId: workforceEmployeeId || undefined,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.pathname, location.search, routeContext.origin.note, workforceEmployeeId, workforceSubjectLabel],
  );
  const directoryPath = useMemo(
    () =>
      buildWorkflowPath('/employees', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'timecards',
          employeeId: workforceEmployeeId || undefined,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, workforceEmployeeId],
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
            <SummaryTile label="Overtime" value={`${hours(timecard?.overtime_hours ?? 0)}${(timecard?.overtime_hours ?? 0) > 0 ? ' OT' : ''}`} hint={`${(timecard?.total_hours ?? 0) > 40 ? 'WEEKLY OT: >40h threshold exceeded. ' : ''}Overtime pressure already hitting this employee.`} accent={(timecard?.overtime_hours ?? 0) > 0 ? 'from-red-400/22 via-red-300/10 to-transparent' : 'from-amber-400/22 via-amber-300/10 to-transparent'} />
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
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={timecard.status.toUpperCase()} tone={statusTones[timecard.status] ?? 'slate'} />
                    {timecard.status === 'draft' && (
                      <button
                        onClick={() => void handleStatusChange('submitted')}
                        disabled={statusUpdating}
                        className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-400/20 disabled:opacity-50"
                      >
                        Submit for Approval
                      </button>
                    )}
                    {timecard.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => void handleStatusChange('approved')}
                          disabled={statusUpdating}
                          className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void handleStatusChange('draft')}
                          disabled={statusUpdating}
                          className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-400/20 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {timecard.status === 'approved' && (
                      <button
                        onClick={() => void handleStatusChange('locked')}
                        disabled={statusUpdating}
                        className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-50"
                      >
                        Lock
                      </button>
                    )}
                    {timecard.status === 'locked' && (
                      <button
                        onClick={() => void handleStatusChange('submitted')}
                        disabled={statusUpdating}
                        className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-50"
                      >
                        Re-open for Review
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <Field label="Status note">
                    <Input
                      id="timecard-status-note"
                      value={statusNote}
                      onChange={(event) => setStatusNote(event.target.value)}
                      placeholder="Required for approve, reject, lock, and reopen actions."
                    />
                  </Field>
                  <div className="flex flex-wrap items-center gap-2">
                    {canExport ? (
                      <button
                        onClick={() => exportTimecardCSV(timecard)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                      >
                        Export CSV
                      </button>
                    ) : (
                      <div className="text-xs text-slate-500">
                        CSV export unlocks after approval.
                      </div>
                    )}
                  </div>
                </div>

                {(timecard.jobs ?? []).length > 0 ? (
                  <div className="grid gap-3">
                    {timecard.jobs.map((job) => (
                      <div
                        key={job.job_id}
                        className="grid gap-4 rounded-[22px] border border-white/8 bg-black/15 px-4 py-4"
                      >
                        <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_160px]">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Job</div>
                            <div className="mt-2 text-sm font-semibold text-slate-100">{job.job_id}</div>
                            {(job.operations ?? []).length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {job.operations?.map((operation) => (
                                  <StatusPill key={`${job.job_id}-${operation}`} label={operation} tone="slate" />
                                ))}
                              </div>
                            ) : null}
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

                        {(job.operation_details ?? []).length > 0 ? (
                          <div className="grid gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Operation breakdown</div>
                              <div className="text-xs text-slate-400">
                                Operators can jump back into the exact job-operation lane from here.
                              </div>
                            </div>
                            <div className="grid gap-3">
                              {job.operation_details?.map((detail) => {
                                const operationShopFloorPath = buildShopFloorPath(location.pathname, location.search, {
                                  source: 'timecards',
                                  note: `Resume ${job.job_id} ${detail.operation} from labor review with the same workforce context attached.`,
                                  origin: effectiveOrigin,
                                  focus: effectiveFocus,
                                  extras: {
                                    employeeId: workforceEmployeeId || undefined,
                                    job: job.job_id,
                                    operation: detail.operation,
                                    machine: detail.machine_id,
                                  },
                                });

                                return (
                                  <div
                                    key={`${job.job_id}-${detail.operation}-${detail.process_type ?? 'general'}-${detail.machine_id ?? 'na'}`}
                                    className="grid gap-3 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto]"
                                  >
                                    <div className="space-y-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-sm font-semibold text-slate-100">{detail.operation}</div>
                                        <StatusPill label={formatProcessTypeLabel(detail.process_type)} tone="sky" />
                                        {detail.machine_id ? <StatusPill label={detail.machine_id} tone="violet" /> : null}
                                      </div>
                                      <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                                        <span>{hours(detail.hours)}</span>
                                        <span>${detail.cost.toFixed(2)} labor</span>
                                        {detail.good_parts ? <span>{detail.good_parts} good</span> : null}
                                        {detail.scrap_count ? <span>{detail.scrap_count} scrap</span> : null}
                                      </div>
                                    </div>
                                    {canLaunchWorkforceFollowup ? (
                                      <Link
                                        to={operationShopFloorPath}
                                        className="inline-flex items-center justify-center rounded-[16px] border border-sky-300/20 bg-sky-300/[0.10] px-3 py-2 text-sm font-medium text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
                                      >
                                        Resume on shop floor
                                      </Link>
                                    ) : (
                                      <div className="inline-flex items-center rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-400">
                                        Select an employee to launch this operation.
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                        {(job.operation_details ?? []).length === 0 && (job.operations ?? []).length === 0 ? (
                          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                            This job has hours booked, but operation-level punches have not been captured yet.
                          </div>
                        ) : null}
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
            {!canLaunchWorkforceFollowup ? (
              <div className="mb-3 rounded-[22px] border border-amber-300/18 bg-amber-300/[0.08] px-4 py-4 text-sm leading-6 text-amber-50">
                Select or route a specific employee before launching payroll, shop-floor, or employee-directory follow-up from timecards.
              </div>
            ) : null}
            <div className="grid gap-3">
              {canLaunchWorkforceFollowup ? (
                <Link
                  to={payrollPath}
                  className="block rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.10] px-4 py-4 text-sm leading-6 text-emerald-50 transition hover:border-emerald-300/32 hover:bg-emerald-300/[0.16]"
                >
                  <div className="font-semibold">Open Payroll follow-up</div>
                  <div className="mt-2 text-emerald-50/80">
                    Roll {workforceSubjectLabel} and the current labor window into payroll review without reopening the people lane cold.
                  </div>
                </Link>
              ) : (
                <div className="rounded-[22px] border border-emerald-300/12 bg-emerald-300/[0.05] px-4 py-4 text-sm leading-6 text-emerald-100/60">
                  <div className="font-semibold">Open Payroll follow-up</div>
                  <div className="mt-2">This handoff unlocks after a real employee context is selected.</div>
                </div>
              )}

              {canLaunchWorkforceFollowup ? (
                <Link
                  to={shopFloorPath}
                  className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
                >
                  <div className="font-semibold">Open Shop Floor Clock</div>
                  <div className="mt-2 text-sky-50/80">
                    Send {workforceSubjectLabel} back into live shift and task tracking with the same workforce record attached.
                  </div>
                </Link>
              ) : (
                <div className="rounded-[22px] border border-sky-300/12 bg-sky-300/[0.05] px-4 py-4 text-sm leading-6 text-sky-100/60">
                  <div className="font-semibold">Open Shop Floor Clock</div>
                  <div className="mt-2">Pick the employee first so the live floor launch does not overpromise continuity.</div>
                </div>
              )}

              {canLaunchWorkforceFollowup ? (
                <Link
                  to={directoryPath}
                  className="block rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-100 transition hover:border-white/18 hover:bg-white/[0.07]"
                >
                  <div className="font-semibold">Return to Employee Directory</div>
                  <div className="mt-2 text-slate-300">
                    Bring {workforceSubjectLabel} back into the roster and skill posture without dropping workforce provenance.
                  </div>
                </Link>
              ) : (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-400">
                  <div className="font-semibold text-slate-200">Return to Employee Directory</div>
                  <div className="mt-2">Choose the employee first so the return path stays attached to the right record.</div>
                </div>
              )}
            </div>
          </PanelCard>
        </div>
      </div>

      {/* Audit Log section — HR manager+ only */}
      {timecard && (
        <PanelCard
          title="Audit trail"
          subtitle="Immutable record of all timecard edits, approvals, and overrides."
        >
          {!showAuditLog ? (
            <ActionButton onClick={() => { setShowAuditLog(true); void handleLoadAudit(); }}>
              Load Audit Log
            </ActionButton>
          ) : auditLoading ? (
            <div className="text-sm text-slate-400">Loading audit records...</div>
          ) : auditLog.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-2 pr-3">Date/Time</th>
                    <th className="pb-2 pr-3">Actor</th>
                    <th className="pb-2 pr-3">Action</th>
                    <th className="pb-2 pr-3">Field</th>
                    <th className="pb-2 pr-3">Old</th>
                    <th className="pb-2 pr-3">New</th>
                    <th className="pb-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((log: any, i: number) => (
                    <tr key={log.id ?? i} className="border-b border-white/5">
                      <td className="py-2 pr-3 text-slate-300">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                      <td className="py-2 pr-3 text-slate-200">{log.actor_name ?? log.actor_id}</td>
                      <td className="py-2 pr-3">
                        <StatusPill label={log.action} tone={log.action === 'approve' ? 'emerald' : log.action === 'reject' ? 'rose' : 'slate'} />
                      </td>
                      <td className="py-2 pr-3 text-slate-400">{log.field_changed ?? '-'}</td>
                      <td className="py-2 pr-3 font-mono text-slate-400">{log.old_value ?? '-'}</td>
                      <td className="py-2 pr-3 font-mono text-slate-200">{log.new_value ?? '-'}</td>
                      <td className="py-2 text-slate-300">{log.change_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-slate-400">No edits this period.</div>
          )}
        </PanelCard>
      )}
    </div>
  );
}
