import { useEffect, useMemo, useState } from 'react';
import { getToolUsage, toolReorderAlerts, ApiError } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { ReorderAlert, ToolUsageRecord } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'usage' | 'reorders';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  usage: { label: 'Usage', detail: 'Tool wear, cost, and job-side usage posture.' },
  reorders: { label: 'Reorders', detail: 'Low-stock and reorder urgency for tooling continuity.' },
};

function wearTone(percent: number): 'emerald' | 'amber' | 'rose' {
  if (percent < 50) return 'emerald';
  if (percent < 80) return 'amber';
  return 'rose';
}

export function ToolingCostPage() {
  const [tab, setTab] = useState<Tab>('usage');
  const [records, setRecords] = useState<ToolUsageRecord[]>([]);
  const [reorders, setReorders] = useState<ReorderAlert[]>([]);
  const [jobFilter, setJobFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeTab = TAB_CONFIG[tab];

  const totalCost = useMemo(() => records.reduce((sum, item) => sum + item.cost, 0), [records]);
  const avgWear = useMemo(
    () => (records.length > 0 ? records.reduce((sum, item) => sum + item.wear_percent, 0) / records.length : 0),
    [records],
  );

  useEffect(() => {
    if (tab === 'usage') {
      void loadUsage();
    }
    if (tab === 'reorders') {
      void loadReorders();
    }
  }, [tab]);

  async function loadUsage() {
    setLoading(true);
    setError(null);
    try {
      const response = await getToolUsage(jobFilter ? { job_id: jobFilter } : {});
      const next = ((response.result as unknown as { records: ToolUsageRecord[] })?.records ?? []) as ToolUsageRecord[];
      setRecords(Array.isArray(next) ? next : []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load tool usage');
    } finally {
      setLoading(false);
    }
  }

  async function loadReorders() {
    setLoading(true);
    setError(null);
    try {
      const response = await toolReorderAlerts();
      const next = (response.result as any)?.alerts ?? (response.result as any) ?? [];
      setReorders(Array.isArray(next) ? next : []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load reorder alerts');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Tool economy"
        title="Tooling Cost"
        description="Track wear, cost, and reorder posture in a machine-side tooling desk instead of a plain report screen."
        metrics={
          <>
            <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
            <SummaryTile
              label="Tracked cost"
              value={`$${totalCost.toFixed(2)}`}
              hint="Total tooling cost in the current usage snapshot."
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Average wear"
              value={`${avgWear.toFixed(0)}%`}
              hint="Mean wear across staged tool usage records."
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Keep usage and reorder posture together so spend, wear, and stock risk are visible in the same tooling command surface.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={() => setTab('usage')}>Load usage</ActionButton>
              <ActionButton tone="emerald" onClick={() => setTab('reorders')}>
                Open reorder board
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

      {loading ? <LoadingState label="Refreshing tooling workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'usage' ? loadUsage : loadReorders} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_minmax(360px,0.86fr)]">
        <div className="space-y-6">
          {tab === 'usage' ? (
            <>
              <PanelCard title="Usage filter" subtitle="Narrow the tooling view by job when you need a single program or order posture.">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Field label="Job filter">
                    <Input value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} placeholder="Leave empty for all jobs" />
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={loadUsage}>Refresh usage</ActionButton>
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Tool usage board" subtitle="Read wear and cost as operating signals, not just a report table.">
                <div className="space-y-3">
                  {records.length > 0 ? (
                    records.map((record) => (
                      <div key={record.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{record.tool_name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                              {record.job_id} · {record.operation}
                            </div>
                          </div>
                          <StatusPill label={`${record.wear_percent}% wear`} tone={wearTone(record.wear_percent)} />
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                          <div>
                            <span className="text-slate-500">Usage:</span> {record.usage_minutes.toFixed(1)} min
                          </div>
                          <div>
                            <span className="text-slate-500">Cost:</span> ${record.cost.toFixed(2)}
                          </div>
                          <div>
                            <span className="text-slate-500">Tool ID:</span> {record.tool_id}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                      No tool-usage records are staged in the current filter.
                    </div>
                  )}
                </div>
              </PanelCard>
            </>
          ) : null}

          {tab === 'reorders' ? (
            <PanelCard title="Reorder board" subtitle="Low-stock tooling stays visible with urgency, quantity, and estimated spend.">
              <div className="space-y-3">
                {reorders.length > 0 ? (
                  reorders.map((alert) => (
                    <div key={alert.tool_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{alert.tool_name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{alert.tool_id}</div>
                        </div>
                        <StatusPill label={alert.urgency} tone={alert.urgency === 'high' ? 'rose' : alert.urgency === 'medium' ? 'amber' : 'emerald'} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-4">
                        <div>
                          <span className="text-slate-500">Current qty:</span> {alert.current_qty}
                        </div>
                        <div>
                          <span className="text-slate-500">Min stock:</span> {alert.min_stock}
                        </div>
                        <div>
                          <span className="text-slate-500">Reorder qty:</span> {alert.reorder_qty}
                        </div>
                        <div>
                          <span className="text-slate-500">Est cost:</span> ${alert.estimated_cost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No reorder alerts are staged right now.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Tooling brief" subtitle="Keep the intent of the current tooling lane visible while you review spend and stock risk.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tooling cues</div>
                <ul className="mt-3 space-y-2 text-slate-300">
                  <li>Filter usage by job when you need to tie tool cost back to a single routing decision.</li>
                  <li>Keep reorder review close to high-wear tools so spend and stock risk stay connected.</li>
                  <li>Use the average wear signal as a quick health read before drilling into individual tools.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
