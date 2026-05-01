import { useEffect, useMemo, useState } from 'react';
import { ApiError, capacityAllLoads, capacityBottlenecks, capacityScheduleJob, capacitySummary, capacityWhatIf } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { Bottleneck, MachineLoad } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'overview' | 'schedule' | 'whatif';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  overview: {
    label: 'Overview',
    detail: 'Read machine load, utilization, and bottlenecks as one capacity picture instead of separate widgets.',
  },
  schedule: {
    label: 'Schedule Job',
    detail: 'Stage a candidate job against a machine before the release desk commits the work.',
  },
  whatif: {
    label: 'What-If Analysis',
    detail: 'Stress test the capacity picture by adding hours or removing a machine before reality does it for you.',
  },
};

function utilBarTone(utilization: number): string {
  if (utilization >= 95) return 'bg-rose-300';
  if (utilization >= 80) return 'bg-amber-300';
  return 'bg-emerald-300';
}

export function CapacityPlanningPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loads, setLoads] = useState<MachineLoad[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [scheduleResult, setScheduleResult] = useState<Record<string, unknown> | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(2);
  const [scheduleForm, setScheduleForm] = useState({ job_id: 'JOB-2026-001', machine_id: 'VF2', hours: '8' });
  const [whatIfForm, setWhatIfForm] = useState({ machine_id: 'VF2', added_hours: '40', removed_machine: '' });

  const activeTab = TAB_CONFIG[tab];
  const overloadedMachines = useMemo(() => loads.filter((load) => load.utilization_pct >= 100).length, [loads]);

  async function runLane(action: () => Promise<void>, message: string) {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOverview() {
    await runLane(async () => {
      const [loadsResponse, bottlenecksResponse, summaryResponse] = await Promise.all([
        capacityAllLoads({ period_weeks: weeks }),
        capacityBottlenecks({ period_weeks: weeks }),
        capacitySummary(),
      ]);
      const nextLoads = (loadsResponse.result as { loads?: MachineLoad[] })?.loads ?? [];
      const nextBottlenecks = (bottlenecksResponse.result as { bottlenecks?: Bottleneck[] })?.bottlenecks ?? [];
      setLoads(Array.isArray(nextLoads) ? nextLoads : []);
      setBottlenecks(Array.isArray(nextBottlenecks) ? nextBottlenecks : []);
      setSummary((summaryResponse.result as Record<string, unknown>) ?? null);
    }, 'Failed to load capacity data');
  }

  useEffect(() => {
    void loadOverview();
  }, [weeks]);

  async function handleScheduleJob() {
    await runLane(async () => {
      const response = await capacityScheduleJob({
        job_id: scheduleForm.job_id,
        machine_id: scheduleForm.machine_id,
        estimated_hours: parseFloat(scheduleForm.hours) || 0,
      });
      setScheduleResult((response.result as Record<string, unknown>) ?? null);
    }, 'Failed to schedule job');
  }

  async function handleWhatIf() {
    await runLane(async () => {
      const response = await capacityWhatIf({
        machine_id: whatIfForm.machine_id || undefined,
        added_hours: parseFloat(whatIfForm.added_hours) || 0,
        removed_machine: whatIfForm.removed_machine || undefined,
      });
      setWhatIfResult((response.result as Record<string, unknown>) ?? null);
    }, 'What-if analysis failed');
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Machine loading"
        title="Capacity Planning"
        description="Read machine utilization, bottleneck posture, and schedule risk in one capacity desk so release decisions stay grounded in actual machine availability."
        metrics={
          <>
            <SummaryTile label="Period" value={`${weeks} week${weeks === 1 ? '' : 's'}`} hint="Current planning horizon for the overview lane." />
            <SummaryTile
              label="Machines loaded"
              value={String(loads.length)}
              hint={loads.length > 0 ? `${overloadedMachines} overloaded machine${overloadedMachines === 1 ? '' : 's'} currently detected.` : 'Load the overview to stage machine posture.'}
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Active lane"
              value={activeTab.label}
              hint={activeTab.detail}
              accent="from-violet-400/22 via-violet-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              This page should read like a release desk, not a passive dashboard. Start with the plant load, then challenge a scheduled job or a scenario before the floor absorbs it.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={loadOverview}>Refresh capacity</ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setTab('schedule');
                  void handleScheduleJob();
                }}
              >
                Schedule job
              </ActionButton>
              <ActionButton
                tone="amber"
                onClick={() => {
                  setTab('whatif');
                  void handleWhatIf();
                }}
              >
                Run what-if
              </ActionButton>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing capacity planning..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'schedule' ? handleScheduleJob : tab === 'whatif' ? handleWhatIf : loadOverview} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          {tab === 'overview' ? (
            <>
              <PanelCard title="Capacity horizon" subtitle="Keep the planning window explicit so machine posture is judged against the right horizon.">
                <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                  <Field label="Planning period">
                    <Select value={weeks} onChange={(event) => setWeeks(parseInt(event.target.value, 10))}>
                      <option value={1}>1 week</option>
                      <option value={2}>2 weeks</option>
                      <option value={4}>4 weeks</option>
                    </Select>
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={loadOverview}>Refresh capacity</ActionButton>
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Capacity posture" subtitle="Use the overview lane to see if the plant is balanced before you try to fit one more job into it.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="Total machines" value={String((summary?.total_machines as number | undefined) ?? loads.length)} hint="Machines currently in the capacity sample." />
                  <SummaryTile
                    label="Average utilization"
                    value={`${Number((summary?.avg_utilization as number | undefined) ?? 0).toFixed(0)}%`}
                    hint="Average plant utilization for the staged planning horizon."
                    accent="from-amber-300/22 via-amber-200/8 to-transparent"
                  />
                  <SummaryTile label="Active jobs" value={String((summary?.active_jobs as number | undefined) ?? 0)} hint="Jobs currently counted in the staged capacity picture." />
                  <SummaryTile
                    label="Bottlenecks"
                    value={String(bottlenecks.length)}
                    hint="Machine centers currently flagged as overloaded."
                    accent="from-rose-400/22 via-rose-300/8 to-transparent"
                  />
                </div>
              </PanelCard>

              <PanelCard title="Machine utilization" subtitle="Use the load board to find where the queue is actually tight instead of relying on instinct.">
                {loads.length > 0 ? (
                  <div className="space-y-4">
                    {loads.map((machine) => (
                      <div key={machine.machine_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{machine.machine_name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{machine.machine_id}</div>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            <div>{machine.total_hours.toFixed(1)}h / {machine.capacity_hours.toFixed(1)}h</div>
                            <div className="mt-1">{machine.jobs.length} queued job{machine.jobs.length === 1 ? '' : 's'}</div>
                          </div>
                        </div>
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/8">
                          <div className={`h-3 rounded-full ${utilBarTone(machine.utilization_pct)}`} style={{ width: `${Math.min(machine.utilization_pct, 100)}%` }} />
                        </div>
                        <div className="mt-3 text-sm font-mono text-slate-200">{machine.utilization_pct.toFixed(0)}% utilization</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No machine-load picture is currently staged.
                  </div>
                )}
              </PanelCard>

              <PanelCard title="Bottleneck desk" subtitle="Overloaded machines belong here with the recommended next move, not buried below the load bars.">
                {bottlenecks.length > 0 ? (
                  <div className="space-y-3">
                    {bottlenecks.map((bottleneck) => (
                      <div key={bottleneck.machine_id} className="rounded-[24px] border border-rose-300/16 bg-rose-300/[0.06] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-rose-50">{bottleneck.machine_name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-rose-100/60">{bottleneck.machine_id}</div>
                          </div>
                          <div className="text-right text-xs text-rose-100/80">
                            <div>{bottleneck.utilization_pct.toFixed(0)}% utilization</div>
                            <div className="mt-1">{bottleneck.overload_hours.toFixed(1)}h overloaded</div>
                          </div>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm text-rose-50/90">
                          {bottleneck.recommendations.map((recommendation, index) => (
                            <li key={`${bottleneck.machine_id}-${index}`}>{recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-8 text-sm text-emerald-100">
                    No bottlenecks are currently flagged in the staged planning horizon.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}

          {tab === 'schedule' ? (
            <>
              <PanelCard title="Schedule candidate job" subtitle="Stage a single job against a target machine before the release desk commits it.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Job ID">
                    <Input value={scheduleForm.job_id} onChange={(event) => setScheduleForm((current) => ({ ...current, job_id: event.target.value }))} placeholder="JOB-2026-001" />
                  </Field>
                  <Field label="Machine ID">
                    <Input value={scheduleForm.machine_id} onChange={(event) => setScheduleForm((current) => ({ ...current, machine_id: event.target.value }))} placeholder="VF2" />
                  </Field>
                  <Field label="Estimated hours">
                    <Input type="number" value={scheduleForm.hours} onChange={(event) => setScheduleForm((current) => ({ ...current, hours: event.target.value }))} />
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={handleScheduleJob}>Schedule</ActionButton>
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Schedule result" subtitle="Review the returned schedule posture before handing the work to dispatch.">
                {scheduleResult ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-950/80 p-4">
                    <pre className="max-h-[30rem] overflow-auto text-xs text-slate-200">{JSON.stringify(scheduleResult, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No schedule result is currently staged.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}

          {tab === 'whatif' ? (
            <>
              <PanelCard title="Scenario setup" subtitle="Use this lane when the plant picture changes faster than the current schedule can absorb.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Machine ID">
                    <Input value={whatIfForm.machine_id} onChange={(event) => setWhatIfForm((current) => ({ ...current, machine_id: event.target.value }))} placeholder="VF2" />
                  </Field>
                  <Field label="Added hours">
                    <Input type="number" value={whatIfForm.added_hours} onChange={(event) => setWhatIfForm((current) => ({ ...current, added_hours: event.target.value }))} />
                  </Field>
                  <Field label="Remove machine">
                    <Input value={whatIfForm.removed_machine} onChange={(event) => setWhatIfForm((current) => ({ ...current, removed_machine: event.target.value }))} placeholder="Optional machine ID" />
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={handleWhatIf}>Analyze</ActionButton>
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Scenario result" subtitle="Use the result panel to see whether the proposed change actually stabilizes the plant.">
                {whatIfResult ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-950/80 p-4">
                    <pre className="max-h-[30rem] overflow-auto text-xs text-slate-200">{JSON.stringify(whatIfResult, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No what-if result is currently staged.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Capacity brief" subtitle="Keep the release logic visible while switching between overview and intervention lanes.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>Overview tells you whether the plant is healthy, not whether one job deserves a slot.</li>
                  <li>Schedule is for candidate placement; what-if is for structural change.</li>
                  <li>If a scenario only fixes one machine by overloading another, the plant is still unstable.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
