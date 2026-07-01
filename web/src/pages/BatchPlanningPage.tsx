import { useMemo, useState } from 'react';
import { ApiError, batchCapacity, batchGroup, batchSequence, batchSetupMatrix } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { BatchGroup, BatchSequence } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'group' | 'sequence' | 'setup' | 'capacity';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  group: {
    label: 'Group Jobs',
    detail: 'Build setup families so the floor sees batch opportunities before the schedule hardens.',
  },
  sequence: {
    label: 'Sequence',
    detail: 'Stage the preferred execution order and read setup savings before the jobs hit the queue.',
  },
  setup: {
    label: 'Setup Matrix',
    detail: 'Keep setup-change posture visible when the batch looks efficient on paper but risky on the floor.',
  },
  capacity: {
    label: 'Batch Capacity',
    detail: 'Review whether the staged batch fits the available machine posture before releasing it.',
  },
};

export function BatchPlanningPage() {
  const [tab, setTab] = useState<Tab>('group');
  const [groups, setGroups] = useState<BatchGroup[]>([]);
  const [sequence, setSequence] = useState<BatchSequence | null>(null);
  const [setupMatrix, setSetupMatrix] = useState<Record<string, unknown> | null>(null);
  const [capacityResult, setCapacityResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobIds, setJobIds] = useState('J-001, J-002, J-003, J-004');

  const ids = useMemo(() => jobIds.split(',').map((entry) => entry.trim()).filter(Boolean), [jobIds]);
  const activeTab = TAB_CONFIG[tab];
  const totalSavings = useMemo(
    () => groups.reduce((sum, item) => sum + (item.setup_savings_min ?? 0), 0),
    [groups],
  );

  async function runLane(action: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Batch planning request failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGroup() {
    await runLane(async () => {
      const response = await batchGroup({ job_ids: ids });
      const next =
        (response.result as unknown as { groups?: BatchGroup[] })?.groups ??
        (response.result as unknown as BatchGroup[]) ??
        [];
      setGroups(Array.isArray(next) ? next : []);
    });
  }

  async function handleSequence() {
    await runLane(async () => {
      const response = await batchSequence({ job_ids: ids });
      setSequence((response.result as unknown as BatchSequence) ?? null);
    });
  }

  async function handleSetupMatrix() {
    await runLane(async () => {
      const response = await batchSetupMatrix({ job_ids: ids });
      setSetupMatrix((response.result as Record<string, unknown>) ?? null);
    });
  }

  async function handleCapacity() {
    await runLane(async () => {
      const response = await batchCapacity({ job_ids: ids });
      setCapacityResult((response.result as Record<string, unknown>) ?? null);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Batch orchestration"
        title="Batch Planning"
        description="Group jobs by shared setup, read the resulting sequence posture, and stress the batch against machine capacity before it becomes a floor commitment."
        metrics={
          <>
            <SummaryTile label="Jobs staged" value={String(ids.length)} hint={ids.join(', ') || 'No jobs staged yet.'} />
            <SummaryTile
              label="Group savings"
              value={`${totalSavings.toFixed(0)} min`}
              hint={groups.length > 0 ? `${groups.length} setup families currently staged.` : 'Run grouping to stage setup-family savings.'}
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
            <SummaryTile
              label="Active lane"
              value={activeTab.label}
              hint={activeTab.detail}
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Read this page like a release desk: group first, sequence second, then challenge the setup posture before the batch reaches the machines.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={handleGroup}>Group jobs</ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setTab('sequence');
                  void handleSequence();
                }}
              >
                Sequence batch
              </ActionButton>
              <ActionButton
                tone="amber"
                onClick={() => {
                  setTab('capacity');
                  void handleCapacity();
                }}
              >
                Check capacity
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

      {loading ? <LoadingState label="Refreshing batch plan..." /> : null}
      {error ? (
        <ErrorState
          message={error}
          onRetry={
            tab === 'sequence'
              ? handleSequence
              : tab === 'setup'
                ? handleSetupMatrix
                : tab === 'capacity'
                  ? handleCapacity
                  : handleGroup
          }
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          <PanelCard title="Batch staging inputs" subtitle="Keep the batch set explicit so every lane answers the same release question.">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <Field label="Job IDs">
                <Input value={jobIds} onChange={(event) => setJobIds(event.target.value)} />
              </Field>
              <div className="md:self-end">
                <ActionButton onClick={tab === 'sequence' ? handleSequence : tab === 'setup' ? handleSetupMatrix : tab === 'capacity' ? handleCapacity : handleGroup}>
                  {activeTab.label}
                </ActionButton>
              </div>
            </div>
          </PanelCard>

          {tab === 'group' ? (
            <PanelCard title="Setup families" subtitle="Group jobs that deserve to live together so setup savings are real, not assumed.">
              {groups.length > 0 ? (
                <div className="space-y-3">
                  {groups.map((group, index) => (
                    <div key={group.group_id ?? index} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">Group {index + 1}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{group.material}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-emerald-100">{group.setup_savings_min?.toFixed(0)} min saved</div>
                          <div className="mt-1 text-xs text-slate-500">{group.total_time_min?.toFixed(0)} min total time</div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(group.jobs ?? []).map((job) => (
                          <span key={job} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono text-slate-200">
                            {job}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No setup families are currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'sequence' ? (
            <>
              {sequence ? (
                <>
                  <PanelCard title="Sequence posture" subtitle="Read the overall setup burden before looking at individual job order.">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <SummaryTile label="Steps" value={String(sequence.sequence.length)} hint="Jobs currently staged in the preferred order." />
                      <SummaryTile label="Total setup" value={`${sequence.total_setup_min.toFixed(0)} min`} hint="Total setup time for the staged batch." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                      <SummaryTile label="Savings vs naive" value={`${sequence.savings_vs_naive_pct.toFixed(1)}%`} hint="Setup reduction versus non-optimized ordering." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
                    </div>
                  </PanelCard>
                  <PanelCard title="Preferred sequence" subtitle="Review the ordered batch like a machine-room playbook, not just a table dump.">
                    <div className="space-y-3">
                      {sequence.sequence.map((step, index) => (
                        <div key={`${step.job_id}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-50">
                                {index + 1}. {step.job_id}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">Setup + run posture</div>
                            </div>
                            <div className="text-right text-xs text-slate-400">
                              <div>{step.setup_min.toFixed(0)} min setup</div>
                              <div className="mt-1">{step.run_min.toFixed(0)} min run</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PanelCard>
                </>
              ) : (
                <PanelCard title="Preferred sequence" subtitle="Sequence output will appear here once the batch is staged.">
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No sequence is currently staged.
                  </div>
                </PanelCard>
              )}
            </>
          ) : null}

          {tab === 'setup' ? (
            <PanelCard title="Setup transition matrix" subtitle="Use this lane when the group looks efficient but the setup changes still feel operationally risky.">
              <div className="mb-5 flex justify-end">
                <ActionButton onClick={handleSetupMatrix}>Load setup matrix</ActionButton>
              </div>
              {setupMatrix ? (
                <div className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-950/80 p-4">
                  <pre className="max-h-[30rem] overflow-auto text-xs text-slate-200">{JSON.stringify(setupMatrix, null, 2)}</pre>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No setup matrix is currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'capacity' ? (
            <PanelCard title="Batch capacity fit" subtitle="Check whether the grouped jobs actually fit the available machine posture before release.">
              <div className="mb-5 flex justify-end">
                <ActionButton onClick={handleCapacity}>Check capacity</ActionButton>
              </div>
              {capacityResult ? (
                <div className="overflow-hidden rounded-[24px] border border-white/8 bg-slate-950/80 p-4">
                  <pre className="max-h-[30rem] overflow-auto text-xs text-slate-200">{JSON.stringify(capacityResult, null, 2)}</pre>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No capacity fit is currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Batch release brief" subtitle="Keep the operational intent visible while moving from grouping into release readiness.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Release cues</div>
                <ul className="mt-3 space-y-2">
                  <li>Grouping without a believable sequence still leaves setup waste on the floor.</li>
                  <li>Sequence without setup posture can hide risky changeovers behind a pretty savings number.</li>
                  <li>Capacity is the final gate: if the batch does not fit the machines, the optimization is only theoretical.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
