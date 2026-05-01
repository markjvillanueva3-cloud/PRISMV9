import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError, runPayroll } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  StatusPill,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import type { PayStub } from '../api/types';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

function lastPeriodStart(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function lastPeriodEnd(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function PayrollPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || routeContext.origin.source || '';
  const upstreamSource = routeContext.origin.source && routeContext.origin.source !== launcherSource ? routeContext.origin.source : '';
  const routedEmployeeId = routeParams.get('employeeId') || (routeContext.focus.type === 'employee' ? routeContext.focus.id : '');
  const launcherSourceLabel = formatWorkflowSourceLabel(launcherSource);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);
  const [periodStart, setPeriodStart] = useState(lastPeriodStart());
  const [periodEnd, setPeriodEnd] = useState(lastPeriodEnd());
  const [stubs, setStubs] = useState<PayStub[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const response = await runPayroll({ period_start: periodStart, period_end: periodEnd });
      setStubs((((response.result as unknown as { stubs?: PayStub[] })?.stubs) ?? []));
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Payroll run failed');
    } finally {
      setLoading(false);
    }
  }

  const totalGross = useMemo(() => stubs.reduce((sum, stub) => sum + stub.gross_pay, 0), [stubs]);
  const totalNet = useMemo(() => stubs.reduce((sum, stub) => sum + stub.net_pay, 0), [stubs]);
  const totalDeductions = totalGross - totalNet;
  const averageNet = stubs.length ? totalNet / stubs.length : 0;
  const deductionBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const stub of stubs) {
      for (const deduction of stub.deductions) {
        totals.set(deduction.type, (totals.get(deduction.type) ?? 0) + deduction.amount);
      }
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [stubs]);
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: launcherSource || 'payroll',
            recordType: routedEmployeeId ? 'Employee' : routeContext.origin.recordType,
            recordId: routedEmployeeId || routeContext.origin.recordId,
            customer: routeContext.origin.customer,
            note:
              routeContext.origin.note
              || 'Keep the selected workforce record attached while payroll review moves back into labor detail or directory posture.',
            threadId: routeContext.origin.threadId,
          },
    [launcherSource, routeContext.origin, routedEmployeeId],
  );
  const effectiveFocus = useMemo(
    () =>
      routedEmployeeId
        ? {
            type: 'employee',
            id: routedEmployeeId,
          }
        : routeContext.focus.id
          ? routeContext.focus
          : undefined,
    [routeContext.focus, routedEmployeeId],
  );
  const workforceReference =
    routedEmployeeId || routeContext.origin.recordId
      ? `Employee ${routedEmployeeId || routeContext.origin.recordId}`
      : '';
  const timecardsPath = useMemo(
    () =>
      buildWorkflowPath('/timecards', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'payroll',
          employeeId: routedEmployeeId,
        },
    }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId],
  );
  const generalLedgerPath = useMemo(
    () =>
      buildWorkflowPath('/general-ledger', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'payroll',
          employeeId: routedEmployeeId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId],
  );
  const exportsPath = useMemo(
    () =>
      buildWorkflowPath('/exports', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'payroll',
          employeeId: routedEmployeeId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId],
  );
  const directoryPath = useMemo(
    () =>
      buildWorkflowPath('/employees', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'payroll',
          employeeId: routedEmployeeId,
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routedEmployeeId],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="People operations"
        title="Payroll"
        description="Run the pay period, stage cash posture, and review employee-level stub detail without leaving the operations lane."
        metrics={
          <>
            <SummaryTile label="Pay period stubs" value={`${stubs.length}`} hint="Employees included in the current payroll pass." />
            <SummaryTile label="Gross pay" value={money(totalGross)} hint="Combined payroll liability before deductions." accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
            <SummaryTile label="Net pay" value={money(totalNet)} hint="Cash leaving payroll after deductions settle." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
          </>
        }
        aside={
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Run controls</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Keep the payroll window tight, then run the register and use the right lane to confirm deductions and average take-home.
              </div>
            </div>
            {launcherSource ? (
              <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                {launcherSourceLabel || 'This workflow'} opened Payroll with workforce context.{' '}
                {effectiveOrigin.note || 'Keep payroll review attached while it moves back into labor detail or employee posture.'}
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
              <Field label="Period start">
                <Input id="pr-start" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
              </Field>
              <Field label="Period end">
                <Input id="pr-end" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
              </Field>
              <ActionButton onClick={() => void handleRun()} disabled={loading} className="w-full">
                Run payroll
              </ActionButton>
            </div>
          </div>
        }
      />

      {loading ? <LoadingState label="Processing payroll register..." /> : null}
      {error ? <ErrorState message={error} onRetry={handleRun} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
        <div className="space-y-6">
          <PanelCard title="Payroll register" subtitle="Each stub stays visible with hours, deductions, and take-home posture.">
            {stubs.length > 0 ? (
              <div className="grid gap-3">
                {stubs.map((stub) => {
                  const deductionTotal = stub.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
                  return (
                    <div
                      key={stub.employee_id}
                      className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-slate-50">{stub.employee_name}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusPill label={`${stub.regular_hours.toFixed(1)} regular hrs`} tone="sky" />
                            <StatusPill label={`${stub.overtime_hours.toFixed(1)} OT hrs`} tone={stub.overtime_hours > 0 ? 'amber' : 'slate'} />
                            <StatusPill label={stub.period} tone="slate" />
                          </div>
                        </div>
                        <div className="grid min-w-[220px] gap-2 text-right text-sm">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Gross</div>
                            <div className="mt-1 font-mono text-lg text-slate-100">{money(stub.gross_pay)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Deductions</div>
                            <div className="mt-1 font-mono text-lg text-rose-200">{money(deductionTotal)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Net</div>
                            <div className="mt-1 font-mono text-xl font-semibold text-emerald-200">{money(stub.net_pay)}</div>
                          </div>
                        </div>
                      </div>

                      {stub.deductions.length > 0 ? (
                        <div className="mt-4 grid gap-2 md:grid-cols-2">
                          {stub.deductions.map((deduction) => (
                            <div
                              key={`${stub.employee_id}-${deduction.type}`}
                              className="flex items-center justify-between rounded-2xl border border-white/6 bg-black/15 px-3 py-2 text-sm"
                            >
                              <span className="text-slate-300">{deduction.type}</span>
                              <span className="font-mono text-slate-100">{money(deduction.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Run the payroll period to populate the register, deduction detail, and take-home summary.
              </div>
            )}
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="Payroll brief" subtitle="Use the side lane to review liability and average employee outcome before closing the period.">
            <div className="grid gap-3">
              <SummaryTile label="Deductions" value={money(totalDeductions)} hint="Total withheld taxes, benefits, and employer-side reductions." accent="from-rose-400/22 via-rose-300/10 to-transparent" />
              <SummaryTile label="Average net" value={money(averageNet)} hint="Average take-home across the active payroll register." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
              <SummaryTile label="Period" value={stubs.length ? 'Loaded' : 'Pending'} hint={`${periodStart} through ${periodEnd}`} accent="from-sky-400/22 via-sky-300/10 to-transparent" />
            </div>
          </PanelCard>

          <PanelCard title="Deduction mix" subtitle="A quick read on what is consuming gross pay in the current payroll run.">
            {deductionBreakdown.length > 0 ? (
              <div className="grid gap-3">
                {deductionBreakdown.map(([type, amount]) => (
                  <div key={type} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-200">{type}</span>
                      <span className="font-mono text-sm text-slate-100">{money(amount)}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-900">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-rose-300 via-amber-300 to-cyan-300"
                        style={{ width: `${totalDeductions > 0 ? Math.max((amount / totalDeductions) * 100, 8) : 8}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Deduction mix appears after a payroll run populates the current register.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Workforce handoff" subtitle="Move back into labor review or employee posture without dropping payroll context.">
            <div className="grid gap-3">
              <Link
                to={generalLedgerPath}
                className="block rounded-[22px] border border-cyan-300/20 bg-cyan-300/[0.10] px-4 py-4 text-sm leading-6 text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.16]"
              >
                <div className="font-semibold">Open General Ledger follow-up</div>
                <div className="mt-2 text-cyan-50/80">
                  Carry the current payroll context into ledger review and close posture without restaging the workforce record.
                </div>
              </Link>

              <Link
                to={exportsPath}
                className="block rounded-[22px] border border-violet-300/20 bg-violet-300/[0.10] px-4 py-4 text-sm leading-6 text-violet-50 transition hover:border-violet-300/32 hover:bg-violet-300/[0.16]"
              >
                <div className="font-semibold">Open Exports follow-up</div>
                <div className="mt-2 text-violet-50/80">
                  Move straight into payroll and close-cycle exports while keeping the same upstream workforce origin attached.
                </div>
              </Link>

              <Link
                to={timecardsPath}
                className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
              >
                <div className="font-semibold">Return to Timecards</div>
                <div className="mt-2 text-sky-50/80">
                  Re-open weekly labor detail for the same workforce record without losing payroll provenance.
                </div>
              </Link>

              <Link
                to={directoryPath}
                className="block rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-100 transition hover:border-white/18 hover:bg-white/[0.07]"
              >
                <div className="font-semibold">Open Employee Directory</div>
                <div className="mt-2 text-slate-300">
                  Bring the same workforce record back into roster, department, and skill posture review.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
