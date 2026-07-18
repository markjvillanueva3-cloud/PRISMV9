/**
 * ValueStreamPage -- live lean value-stream map (VSM) for a JM Die job.
 *
 * WIRING (QUEBEC-FRONTEND-WIRING/U-VSM-LIVE-WIRE): this page formerly rendered
 * fabricated module-level seed arrays. It now reads the REAL value-stream map for a
 * chosen job from the backend:
 *   getValueStreamData(jobId)  ->  GET /api/v1/erp/value-stream/:jobId
 *     -> prism_business value_stream_map -> ValueStreamMapEngine.build()
 *        (composes JobTravelerEngine planned/actual times + scrap and
 *         MachineDispatchEngine WIP/queue -- ValueStreamMapEngine.ts).
 *
 * HONESTY (R12): the backend engine computes ONLY flow data (per-op planned vs actual
 * time, variance, scrap, machine-queue WIP/wait). It explicitly does NOT invent the
 * qualitative "seven wastes" narrative. So the Waste tab here derives ONLY the wastes the
 * data actually supports -- Waiting (queue wait), Setup overhead, Defects (scrap), and
 * Overprocessing (actual-over-planned variance) -- and surfaces the engine's own caveats
 * for everything not captured. Nothing is fabricated. When a job has no traveler the route
 * returns { data_available:false } and we render an honest empty state, never mock data.
 *
 * jobId source: ?job=<id> URL search param (deep-linkable from the job dashboard) plus a
 * controlled input so an operator can map any job by id. No new backend dependency.
 *
 * Lean reference: Rother & Shook, "Learning to See" (1999) -- value-added ratio =
 * value-added time / total lead time; lead time = value-added (cycle) + non-value-added
 * (setup + queue wait). Taiichi Ohno's seven wastes (muda) taxonomy for the Waste tab.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getValueStreamData } from '../api/client';
import {
  Field,
  Input,
  PanelCard,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'map' | 'metrics' | 'waste';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  map: {
    label: 'Process Map',
    detail: 'End-to-end value stream from first operation through completion, with WIP and queue-wait visibility per step.',
  },
  metrics: {
    label: 'Metrics',
    detail: "Lead time, value-added ratio, scrap, and setup breakdown computed from this job's traveler.",
  },
  waste: {
    label: 'Waste Analysis',
    detail: 'Non-value-added time the job traveler + machine queues actually expose -- queue wait, setup overhead, scrap, and over-plan variance.',
  },
};

/* ------------------------------------------------------------------ */
/*  Backend contract (mirrors ValueStreamMapEngine.ts exports)        */
/* ------------------------------------------------------------------ */

interface VsmStep {
  step_number: number;
  operation: string;
  machine_id?: string;
  status: string;
  planned_setup_min: number;
  planned_cycle_min: number;
  actual_setup_min: number;
  actual_cycle_min: number;
  variance_pct: number;
  parts_complete: number;
  parts_scrapped: number;
  scrap_rate_pct: number;
  wip_at_machine: number | null;
  queue_wait_min: number | null;
}

interface VsmTotals {
  total_planned_setup_min: number;
  total_planned_cycle_min: number;
  total_actual_setup_min: number;
  total_actual_cycle_min: number;
  value_added_min: number;
  non_value_added_min: number;
  total_queue_wait_min: number;
  lead_time_min: number;
  value_added_ratio: number;
  total_parts_complete: number;
  total_parts_scrapped: number;
  scrap_rate_pct: number;
  setup_variance_pct: number;
  cycle_variance_pct: number;
}

interface ValueStreamMap {
  data_available: boolean;
  job_id: string;
  message?: string;
  steps: VsmStep[];
  totals: VsmTotals;
  generated_at: string;
  caveats: string[];
}

/** Unwrap the erp {ok,data} envelope (or the legacy {result} shape) -- see KanbanBoardPage. */
function unwrapVsm(res: unknown): ValueStreamMap | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as Record<string, unknown>;
  const payload = (r.data ?? r.result) as ValueStreamMap | undefined;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.steps)) return null;
  return payload;
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                        */
/* ------------------------------------------------------------------ */

const hrs = (min: number) => (min / 60).toFixed(1);
const pct = (ratio: number) => (ratio * 100).toFixed(1);
const stepActual = (s: VsmStep) => s.actual_setup_min + s.actual_cycle_min;
const stepPlanned = (s: VsmStep) => s.planned_setup_min + s.planned_cycle_min;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ValueStreamPage() {
  const [tab, setTab] = useState<Tab>('map');
  const [expandedWaste, setExpandedWaste] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const jobId = (searchParams.get('job') ?? '').trim();
  const [draftJobId, setDraftJobId] = useState(jobId);

  const query = useQuery({
    queryKey: ['value-stream', jobId],
    queryFn: () => getValueStreamData(jobId),
    enabled: jobId.length > 0,
    retry: false,
    staleTime: 30_000,
  });

  const vsm = useMemo(() => unwrapVsm(query.data), [query.data]);

  const applyJob = useCallback(() => {
    const next = draftJobId.trim();
    setSearchParams(next ? { job: next } : {}, { replace: false });
    setExpandedWaste(null);
  }, [draftJobId, setSearchParams]);

  const toggleWaste = useCallback((id: number) => {
    setExpandedWaste((prev) => (prev === id ? null : id));
  }, []);

  const totals = vsm?.totals;
  const steps = vsm?.steps ?? [];

  /* Non-value-added waste signals derived ONLY from real VSM fields (R12). */
  const wasteSignals = useMemo(() => {
    if (!totals) return [];
    const overProcessMin = steps.reduce((a, s) => {
      const over = stepActual(s) - stepPlanned(s);
      return a + (over > 0 ? over : 0);
    }, 0);
    return [
      {
        id: 1,
        acronym: 'W',
        category: 'Waiting',
        detail: 'Time jobs sit in machine queues between operations.',
        value: `${totals.total_queue_wait_min.toFixed(0)} min`,
        impactMin: totals.total_queue_wait_min,
        source: 'MachineDispatch queue estimate',
      },
      {
        id: 2,
        acronym: 'S',
        category: 'Setup overhead',
        detail: 'Non-cutting setup time across all operations (changeover, fixturing).',
        value: `${totals.total_actual_setup_min.toFixed(0)} min`,
        impactMin: totals.total_actual_setup_min,
        source: 'Job traveler actual setup time',
      },
      {
        id: 3,
        acronym: 'D',
        category: 'Defects',
        detail: `${totals.total_parts_scrapped} part(s) scrapped (${totals.scrap_rate_pct.toFixed(1)}% scrap rate).`,
        value: `${totals.total_parts_scrapped} pc`,
        impactMin: 0,
        source: 'Job traveler scrap count',
      },
      {
        id: 4,
        acronym: 'P',
        category: 'Overprocessing / variance',
        detail: 'Time spent beyond the planned estimate, summed over steps that ran over.',
        value: `+${overProcessMin.toFixed(0)} min`,
        impactMin: overProcessMin,
        source: 'Actual minus planned per step',
      },
    ];
  }, [totals, steps]);

  const totalWasteMin = useMemo(
    () => wasteSignals.reduce((a, w) => a + w.impactMin, 0),
    [wasteSignals],
  );

  /* ---------------------------------------------------------------- */
  /*  Job toolbar (always visible so any state can re-pick a job)     */
  /* ---------------------------------------------------------------- */
  const jobToolbar = (
    <PanelCard
      title="Job selection"
      subtitle="Enter a JM Die job number to map its value stream. Deep-linkable via ?job=<id>."
    >
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          applyJob();
        }}
      >
        <div className="min-w-[220px] flex-1">
          <Field label="Job ID">
            <Input
              type="text"
              inputMode="text"
              placeholder="e.g. JOB-4001"
              value={draftJobId}
              onChange={(e) => setDraftJobId(e.target.value)}
            />
          </Field>
        </div>
        <button
          type="submit"
          className="h-11 rounded-2xl border border-cyan-300/30 bg-cyan-400/12 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 md:h-9"
        >
          Map Value Stream
        </button>
        {jobId ? (
          <span className="text-xs text-slate-400">
            Active: <span className="font-mono text-slate-200">{jobId}</span>
          </span>
        ) : null}
      </form>
    </PanelCard>
  );

  /* ---------------------------------------------------------------- */
  /*  State gates                                                     */
  /* ---------------------------------------------------------------- */
  let body: ReactNode = null;

  if (!jobId) {
    body = (
      <PanelCard title="No job selected" subtitle="A value-stream map is computed per job from its routing traveler.">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-10 text-center text-sm text-slate-400">
          Enter a job ID above to map its end-to-end value stream from real traveler and
          machine-queue data.
        </div>
      </PanelCard>
    );
  } else if (query.isLoading) {
    body = (
      <PanelCard title="Mapping value stream..." subtitle={`Loading flow data for ${jobId}.`}>
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      </PanelCard>
    );
  } else if (query.isError) {
    body = (
      <PanelCard title="Could not load value stream" subtitle="The backend request failed.">
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.06] px-5 py-4 text-sm text-rose-200">
          {(query.error as Error)?.message ?? 'Request failed.'} Verify the job ID and that the
          ERP service is reachable, then try again.
        </div>
      </PanelCard>
    );
  } else if (!vsm || !totals) {
    // The route answered (200) but the payload could not be read as a ValueStreamMap.
    // Fail loud (R12): this is a data/contract fault, NOT a missing job -- do not let it
    // wear the benign "no traveler" copy below.
    body = (
      <PanelCard title="Unexpected response" subtitle={`The value-stream service returned an unrecognized payload for ${jobId}.`}>
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.06] px-5 py-4 text-sm text-rose-200">
          The backend responded but the value-stream map could not be read -- this is a
          data/contract issue, not a missing job. Retry, and report job {jobId} if it persists.
        </div>
      </PanelCard>
    );
  } else if (!vsm.data_available) {
    body = (
      <PanelCard title="No value-stream data" subtitle={`Job ${jobId} has no mappable routing yet.`}>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] px-5 py-4 text-sm text-amber-200">
          {vsm.message ??
            'A value-stream map requires a job traveler with recorded operation times. None was found for this job.'}
        </div>
      </PanelCard>
    );
  } else {
    body = (
      <>
        {/* Tab bar */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, cfg]) => (
            <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
              {cfg.label}
            </TabButton>
          ))}
        </div>

        {/* ============================================================ */}
        {/*  MAP TAB                                                      */}
        {/* ============================================================ */}
        {tab === 'map' ? (
          <div className="space-y-6">
            <PanelCard title="Process flow" subtitle="Each box is an operation with actual vs. planned time and its work center. WIP triangles show machine-queue depth between steps.">
              <div className="overflow-x-auto">
                <div className="flex items-start gap-0 py-2" style={{ minWidth: '900px' }}>
                  {steps.map((step, idx) => {
                    const actual = stepActual(step);
                    const planned = stepPlanned(step);
                    const wip = step.wip_at_machine ?? 0;
                    const wait = step.queue_wait_min ?? 0;
                    return (
                      <div key={`${step.step_number}-${step.operation}`} className="flex items-start">
                        {/* WIP indicator between stages */}
                        {idx > 0 && wip > 0 ? (
                          <div className="flex flex-col items-center justify-center px-2" style={{ minWidth: '64px' }}>
                            <div className="mb-2 text-lg text-slate-500">&#8594;</div>
                            <div className="flex flex-col items-center">
                              <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-amber-400/70" />
                              <div className="mt-1 text-xs font-semibold text-amber-300">{wip}</div>
                              <div className="text-[10px] uppercase tracking-widest text-slate-500">WIP</div>
                            </div>
                            {wait > 0 ? (
                              <div className="mt-2 rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                                {wait.toFixed(0)}m wait
                              </div>
                            ) : null}
                          </div>
                        ) : idx > 0 ? (
                          <div className="flex items-center justify-center px-3">
                            <div className="text-lg text-slate-500">&#8594;</div>
                          </div>
                        ) : null}

                        {/* Process box */}
                        <div className="flex-shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4" style={{ width: '170px' }}>
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{`Step ${idx + 1}`}</div>
                            <StatusPill label={step.status} tone="slate" />
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-50">{step.operation}</div>
                          <div className="mt-3 space-y-1 text-xs text-slate-400">
                            <div className="flex justify-between">
                              <span>Actual</span>
                              <span className="font-mono text-slate-200">{actual.toFixed(0)}m</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Plan</span>
                              <span className="font-mono text-slate-300">{planned.toFixed(0)}m</span>
                            </div>
                            {actual > planned ? (
                              <div className="flex justify-between text-rose-300">
                                <span>Delta</span>
                                <span className="font-mono">+{(actual - planned).toFixed(0)}m</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-3 border-t border-white/8 pt-2 text-[11px] text-slate-400">
                            {step.machine_id ?? 'unassigned'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PanelCard>

            {/* Time composition bar (VA cycle vs NVA setup+wait) */}
            <PanelCard title="Time composition" subtitle="Value-added cycle time vs. non-value-added setup and queue-wait time.">
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-cyan-400/60" />
                    <span>Cycle (VA)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-rose-400/60" />
                    <span>Setup + Wait (NVA)</span>
                  </div>
                </div>
                <div className="flex h-8 overflow-hidden rounded-full">
                  <div
                    className="flex items-center justify-center bg-cyan-400/30 text-[10px] font-semibold text-cyan-100"
                    style={{ width: `${totals.lead_time_min > 0 ? (totals.value_added_min / totals.lead_time_min) * 100 : 0}%` }}
                  >
                    {totals.value_added_min.toFixed(0)}m
                  </div>
                  <div
                    className="flex items-center justify-center bg-rose-400/30 text-[10px] font-semibold text-rose-100"
                    style={{ width: `${totals.lead_time_min > 0 ? (totals.non_value_added_min / totals.lead_time_min) * 100 : 0}%` }}
                  >
                    {totals.non_value_added_min.toFixed(0)}m
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Total lead time: <span className="font-mono text-slate-200">{totals.lead_time_min.toFixed(0)} min</span> ({hrs(totals.lead_time_min)} hr)
                </div>
              </div>
            </PanelCard>
          </div>
        ) : null}

        {/* ============================================================ */}
        {/*  METRICS TAB                                                  */}
        {/* ============================================================ */}
        {tab === 'metrics' ? (
          <div className="space-y-6">
            <PanelCard title="Key performance metrics" subtitle="Computed from the job traveler and live machine queues.">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { label: 'Total Lead Time', value: `${hrs(totals.lead_time_min)} hr`, ok: true, target: '--' },
                  { label: 'Cycle Time (VA)', value: `${totals.value_added_min.toFixed(0)} min`, ok: true, target: '--' },
                  { label: 'Non-Value-Added', value: `${totals.non_value_added_min.toFixed(0)} min`, ok: totals.non_value_added_min <= totals.value_added_min, target: '< cycle' },
                  { label: 'Value-Added Ratio', value: `${pct(totals.value_added_ratio)}%`, ok: totals.value_added_ratio > 0.25, target: '> 25%' },
                  { label: 'Scrap Rate', value: `${totals.scrap_rate_pct.toFixed(1)}%`, ok: totals.scrap_rate_pct < 2, target: '< 2%' },
                  { label: 'Parts Complete', value: String(totals.total_parts_complete), ok: true, target: '--' },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{m.label}</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-50">{m.value}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusPill label={m.ok ? 'On target' : 'Below target'} tone={m.ok ? 'emerald' : 'rose'} />
                      <span className="text-xs text-slate-400">Target: {m.target}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard title="Lead time waterfall" subtitle="Per operation: value-added cycle time vs. non-value-added setup + queue wait.">
              <div className="space-y-3">
                {steps.map((step) => {
                  const va = step.actual_cycle_min;
                  const nva = step.actual_setup_min + (step.queue_wait_min ?? 0);
                  const totalStep = va + nva;
                  const pctOfLead = totals.lead_time_min > 0 ? (totalStep / totals.lead_time_min) * 100 : 0;
                  const cyclePct = totalStep > 0 ? (va / totalStep) * 100 : 0;
                  return (
                    <div key={`${step.step_number}-wf`}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{step.operation}</span>
                        <span className="font-mono text-slate-400">{totalStep.toFixed(0)}m ({pctOfLead.toFixed(0)}%)</span>
                      </div>
                      <div className="flex h-5 overflow-hidden rounded-full bg-white/[0.04]">
                        <div className="bg-cyan-400/40" style={{ width: `${cyclePct}%` }} />
                        <div className="bg-rose-400/30" style={{ width: `${100 - cyclePct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </PanelCard>

            <PanelCard title="Setup time breakdown" subtitle="Setup overhead per operation compared to pure cycle time.">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      <th className="pb-3 pr-4 font-semibold">Operation</th>
                      <th className="pb-3 pr-4 font-semibold">Cycle (min)</th>
                      <th className="pb-3 pr-4 font-semibold">Setup (min)</th>
                      <th className="pb-3 font-semibold">Setup %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((step) => {
                      const total = step.actual_cycle_min + step.actual_setup_min;
                      const setupPct = total > 0 ? (step.actual_setup_min / total) * 100 : 0;
                      return (
                        <tr key={`${step.step_number}-setup`} className="border-b border-white/5">
                          <td className="py-3 pr-4 text-slate-200">{step.operation}</td>
                          <td className="py-3 pr-4 font-mono text-slate-300">{step.actual_cycle_min.toFixed(0)}</td>
                          <td className="py-3 pr-4 font-mono text-slate-300">{step.actual_setup_min.toFixed(0)}</td>
                          <td className="py-3">
                            <StatusPill label={`${setupPct.toFixed(0)}%`} tone={setupPct > 30 ? 'rose' : setupPct > 15 ? 'amber' : 'emerald'} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </PanelCard>
          </div>
        ) : null}

        {/* ============================================================ */}
        {/*  WASTE TAB                                                    */}
        {/* ============================================================ */}
        {tab === 'waste' ? (
          <div className="space-y-6">
            <PanelCard title="Non-value-added signals" subtitle="Waste this job's traveler and machine queues actually expose. Categories that require shop-floor observation (transport, motion, inventory, overproduction) are not captured by the traveler and are listed under caveats.">
              <div className="mb-4 flex items-center gap-4 text-xs text-slate-400">
                <span>Quantified NVA time: <span className="font-mono font-semibold text-rose-300">{totalWasteMin.toFixed(0)} min</span></span>
                {totals.lead_time_min > 0 ? (
                  <span>({((totalWasteMin / totals.lead_time_min) * 100).toFixed(0)}% of lead time)</span>
                ) : null}
              </div>

              <div className="space-y-3">
                {wasteSignals.map((w) => {
                  const isExpanded = expandedWaste === w.id;
                  const pctOfTotal = totalWasteMin > 0 ? (w.impactMin / totalWasteMin) * 100 : 0;
                  return (
                    <button key={w.id} type="button" onClick={() => toggleWaste(w.id)} className="w-full text-left">
                      <div className={`rounded-2xl border px-4 py-4 transition ${isExpanded ? 'border-rose-300/20 bg-rose-400/[0.06]' : 'border-white/8 bg-white/[0.03] hover:border-white/14'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-400/12 text-xs font-bold text-rose-200">
                              {w.acronym}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-50">{w.category}</div>
                              <div className="mt-0.5 text-xs text-slate-400">{w.detail}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono text-sm font-semibold text-rose-300">{w.value}</span>
                            {w.impactMin > 0 ? (
                              <span className="text-[10px] text-slate-500">{pctOfTotal.toFixed(0)}% of NVA</span>
                            ) : null}
                          </div>
                        </div>
                        {w.impactMin > 0 ? (
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-2 rounded-full bg-rose-400/50" style={{ width: `${pctOfTotal}%` }} />
                          </div>
                        ) : null}
                        {isExpanded ? (
                          <div className="mt-4 rounded-xl border border-cyan-300/16 bg-cyan-300/[0.05] px-4 py-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400">Source</div>
                            <div className="mt-1 text-sm text-cyan-100">{w.source}</div>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </PanelCard>

            {vsm.caveats.length > 0 ? (
              <PanelCard title="Data caveats" subtitle="Honest limits of this computed map -- surfaced by the backend engine, never hidden.">
                <ul className="space-y-2">
                  {vsm.caveats.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="mt-0.5 text-amber-400">&#9888;</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </PanelCard>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Manufacturing Excellence"
        title="Value Stream Map"
        description="Visualize the end-to-end flow from first operation to completion, identify non-value-added time, and drive continuous improvement -- computed from real job traveler and machine-queue data."
        metrics={
          totals ? (
            <>
              <SummaryTile
                label="Lead Time"
                value={`${hrs(totals.lead_time_min)} hr`}
                hint="Value-added cycle plus non-value-added setup and queue wait."
              />
              <SummaryTile
                label="VA Ratio"
                value={`${pct(totals.value_added_ratio)}%`}
                hint={totals.value_added_ratio > 0.25 ? 'Above 25% target.' : 'Below 25% target -- improvement opportunity.'}
                accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
              />
              <SummaryTile
                label="Queue Wait"
                value={`${totals.total_queue_wait_min.toFixed(0)} min`}
                hint="Time queued at machines between operations."
                accent="from-amber-400/22 via-amber-300/8 to-transparent"
              />
            </>
          ) : undefined
        }
      />

      {jobToolbar}
      {body}
    </div>
  );
}
