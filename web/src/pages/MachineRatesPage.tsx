import { useEffect, useState } from 'react';
import { ApiError, machineRateCompare, machineRateEffective, machineRateList } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { MachineRate } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'library' | 'compare' | 'effective';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  library: {
    label: 'Rate Library',
    detail: 'Keep the machine-rate baseline visible before quoting or schedule analysis reuses it.',
  },
  compare: {
    label: 'Compare Machines',
    detail: 'Compare the commercial posture of multiple machines before routing work by feel.',
  },
  effective: {
    label: 'Effective Rate',
    detail: 'Check one machine against a job context when the raw library rate is not enough.',
  },
};

export function MachineRatesPage() {
  const [tab, setTab] = useState<Tab>('library');
  const [rates, setRates] = useState<MachineRate[]>([]);
  const [compareIds, setCompareIds] = useState('');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [effectiveMachineId, setEffectiveMachineId] = useState('');
  const [effectiveJobId, setEffectiveJobId] = useState('');
  const [effectiveResult, setEffectiveResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTab = TAB_CONFIG[tab];

  async function loadRates() {
    setLoading(true);
    setError(null);
    try {
      const response = await machineRateList();
      const next =
        (response.result as unknown as { rates?: MachineRate[] })?.rates ??
        (response.result as unknown as MachineRate[]) ??
        [];
      setRates(Array.isArray(next) ? next : []);
      if (!effectiveMachineId && Array.isArray(next) && next.length > 0) {
        setEffectiveMachineId(next[0].machine_id);
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load rates');
    } finally {
      setLoading(false);
    }
  }

  async function runCompare() {
    setLoading(true);
    setError(null);
    try {
      const machineIds = compareIds.split(',').map((item) => item.trim()).filter(Boolean);
      const response = await machineRateCompare({ machine_ids: machineIds });
      setCompareResult(response.result);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Compare failed');
    } finally {
      setLoading(false);
    }
  }

  async function runEffective() {
    if (!effectiveMachineId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await machineRateEffective({
        machine_id: effectiveMachineId,
        job_id: effectiveJobId || undefined,
      });
      setEffectiveResult(response.result);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Effective rate lookup failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRates();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Rate intelligence"
        title="Machine Rates"
        description="Keep rate library, machine comparison, and effective rate lookup in one commercial operations desk instead of relying on static spreadsheets."
        metrics={
          <>
            <SummaryTile label="Library size" value={String(rates.length)} hint="Machines currently staged in the rate library." />
            <SummaryTile
              label="Active lane"
              value={activeTab.label}
              hint={activeTab.detail}
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Effective lookup"
              value={effectiveResult ? 'Prepared' : 'Standby'}
              hint="Job-sensitive rate posture for the currently selected machine."
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Use this desk when routing, quoting, or planning decisions need a rate answer that is closer to reality than a single shop-average number.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={loadRates}>Refresh library</ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setTab('compare');
                  void runCompare();
                }}
              >
                Compare machines
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

      {loading ? <LoadingState label="Refreshing machine rates..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'compare' ? runCompare : tab === 'effective' ? runEffective : loadRates} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          {tab === 'library' ? (
            <PanelCard title="Rate library" subtitle="Keep the baseline machine economics visible before you compare or override them.">
              {rates.length > 0 ? (
                <div className="space-y-3">
                  {rates.map((rate) => (
                    <div key={rate.machine_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{rate.machine_name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{rate.type}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-semibold text-slate-100">${rate.effective_rate.toFixed(2)}</div>
                          <div className="mt-1 text-xs text-slate-500">effective / hr</div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
                        <div>Hourly: ${rate.hourly_rate.toFixed(2)}</div>
                        <div>Setup: ${rate.setup_rate.toFixed(2)}</div>
                        <div>Overhead: ${rate.overhead_rate.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No machine rates are currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'compare' ? (
            <>
              <PanelCard title="Compare machines" subtitle="Compare the machines you are actually choosing between instead of scanning the whole rate library.">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Field label="Machine IDs">
                    <Input value={compareIds} onChange={(event) => setCompareIds(event.target.value)} placeholder="CNC-1, CNC-2, CNC-3" />
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={runCompare}>Compare</ActionButton>
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Compare output" subtitle="Use the comparison lane for actual routing decisions, not just rate curiosity.">
                {compareResult ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-950/80 p-4">
                    <pre className="max-h-[28rem] overflow-auto text-xs text-slate-200">{JSON.stringify(compareResult, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No machine comparison is currently staged.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}

          {tab === 'effective' ? (
            <>
              <PanelCard title="Effective rate lookup" subtitle="Use job-sensitive rate posture when a raw library number is too blunt for the decision.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Field label="Machine ID">
                    <Input value={effectiveMachineId} onChange={(event) => setEffectiveMachineId(event.target.value)} placeholder="CNC-1" />
                  </Field>
                  <Field label="Job ID (optional)">
                    <Input value={effectiveJobId} onChange={(event) => setEffectiveJobId(event.target.value)} placeholder="JOB-2026-044" />
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={runEffective}>Lookup</ActionButton>
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Effective rate output" subtitle="Keep the context-adjusted rate visible while the job is being routed or re-quoted.">
                {effectiveResult ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-950/80 p-4">
                    <pre className="max-h-[28rem] overflow-auto text-xs text-slate-200">{JSON.stringify(effectiveResult, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No effective rate lookup is currently staged.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Rate brief" subtitle="Keep the reason for the lookup visible so the rate desk supports real routing and commercial decisions.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>Use the library for baseline posture, comparison for routing choices, and effective rate when one live job changes the economics.</li>
                  <li>Setup and overhead matter as much as pure spindle-hour rate when routing short or complex work.</li>
                  <li>If the effective rate diverges sharply from the library, the job context probably deserves a deeper review.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
