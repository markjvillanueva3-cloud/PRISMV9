import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, milestoneAdvance, milestoneCreateTimeline, milestoneGetTimeline } from '../../api/client';
import type { MilestoneRecord, MilestoneTimelineRecord } from '../../api/types';
import type { PrismPromptAnalysis } from '../../features/operating-system/contracts';
import { useOperatingSystem } from '../../features/operating-system/OperatingSystemProvider';
import { ActionButton, Input, StatusPill } from '../workspace/WorkspacePrimitives';
import { getMilestoneSyncEvents, type MilestoneSurface, type MilestoneSyncEvent } from './milestoneIntelligence';

interface MilestoneTimelinePanelProps {
  jobId?: string | null;
  surface: MilestoneSurface;
  title?: string;
  subtitle?: string;
  customer?: string;
  partNumber?: string;
  jobStatus?: string;
  dueDate?: string;
  machine?: string;
  queueSummary?: string;
  estimatedHours?: number;
  actualHours?: number;
  signals?: string[];
  intelligenceEvents?: MilestoneSyncEvent[];
  refreshKey?: number;
}

function formatMoment(value?: string) {
  if (!value) {
    return 'Not yet';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(parsed));
}

function milestoneTone(status: MilestoneRecord['status']) {
  switch (status) {
    case 'completed':
      return 'emerald' as const;
    case 'active':
      return 'sky' as const;
    case 'skipped':
      return 'amber' as const;
    default:
      return 'slate' as const;
  }
}

function buildMilestonePrompt({
  jobId,
  surface,
  timeline,
  customer,
  partNumber,
  jobStatus,
  dueDate,
  machine,
  queueSummary,
  estimatedHours,
  actualHours,
  signals,
  intelligenceEvents,
}: {
  jobId: string;
  surface: MilestoneSurface;
  timeline: MilestoneTimelineRecord | null;
  customer?: string;
  partNumber?: string;
  jobStatus?: string;
  dueDate?: string;
  machine?: string;
  queueSummary?: string;
  estimatedHours?: number;
  actualHours?: number;
  signals?: string[];
  intelligenceEvents?: MilestoneSyncEvent[];
}) {
  const currentMilestone =
    timeline?.milestones.find((entry) => entry.status === 'active')?.label
    ?? timeline?.current_milestone
    ?? 'No milestone seeded';
  const timelineSummary = timeline
    ? `Timeline progress ${timeline.progress_pct}% with ${timeline.completed_count}/${timeline.total_milestones} milestones complete. Current milestone: ${currentMilestone}. Estimated delivery: ${timeline.estimated_delivery ?? 'not estimated'}.`
    : 'No milestone timeline has been seeded for this job yet.';
  const signalSummary = signals?.filter(Boolean).slice(0, 6).join(' ') || 'No extra execution signals were supplied.';
  const intelligenceSummary = intelligenceEvents?.length
    ? intelligenceEvents
        .slice(0, 3)
        .map((event) => `${event.summary} Outcome: ${event.outcome}. ${event.details[0] ?? ''} CLI: ${event.cliCommand}.`)
        .join(' ')
    : 'No recent PRISM milestone sync events are available.';

  return [
    `Route a PRISM AI/LLM/CLI milestone support action for job ${jobId}.`,
    `Surface: ${surface}.`,
    customer ? `Customer: ${customer}.` : '',
    partNumber ? `Part number: ${partNumber}.` : '',
    jobStatus ? `Job status: ${jobStatus}.` : '',
    dueDate ? `Due date: ${dueDate}.` : '',
    machine ? `Machine focus: ${machine}.` : '',
    queueSummary ? `Queue posture: ${queueSummary}.` : '',
    typeof estimatedHours === 'number' ? `Estimated hours: ${estimatedHours}.` : '',
    typeof actualHours === 'number' ? `Actual hours: ${actualHours}.` : '',
    timelineSummary,
    `Execution signals: ${signalSummary}`,
    `Milestone sync memory: ${intelligenceSummary}`,
    'Use deep reasoning to identify milestone risk, choose the right internal PRISM surface, suggest the best CLI route, and explain the next move for the operator.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function MilestoneTimelinePanel({
  jobId,
  surface,
  title = 'Milestone timeline',
  subtitle = 'Keep order progression, ETA posture, and PRISM routing attached to the same execution record.',
  customer,
  partNumber,
  jobStatus,
  dueDate,
  machine,
  queueSummary,
  estimatedHours,
  actualHours,
  signals = [],
  intelligenceEvents = [],
  refreshKey = 0,
}: MilestoneTimelinePanelProps) {
  const services = useOperatingSystem();
  const [timeline, setTimeline] = useState<MilestoneTimelineRecord | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PrismPromptAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [canonicalEvents, setCanonicalEvents] = useState<MilestoneSyncEvent[]>([]);

  const activeMilestone = useMemo(
    () => timeline?.milestones.find((entry) => entry.status === 'active') ?? null,
    [timeline],
  );
  const mergedEvents = useMemo(() => {
    const merged = new Map<string, MilestoneSyncEvent>();
    [...intelligenceEvents, ...canonicalEvents].forEach((event) => {
      merged.set(event.id, event);
    });
    return [...merged.values()]
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
      .slice(0, 6);
  }, [canonicalEvents, intelligenceEvents]);

  const analysisPrompt = useMemo(
    () =>
      jobId
        ? buildMilestonePrompt({
            jobId,
            surface,
            timeline,
            customer,
            partNumber,
            jobStatus,
            dueDate,
            machine,
            queueSummary,
            estimatedHours,
            actualHours,
            signals,
            intelligenceEvents: mergedEvents,
          })
        : '',
    [actualHours, customer, dueDate, estimatedHours, jobId, jobStatus, machine, mergedEvents, partNumber, queueSummary, signals, surface, timeline],
  );
  const deferredPrompt = useDeferredValue(analysisPrompt);

  useEffect(() => {
    if (!jobId) {
      setTimeline(null);
      setTimelineLoading(false);
      setTimelineError(null);
      return;
    }

    let cancelled = false;
    setTimelineLoading(true);
    setTimelineError(null);

    void milestoneGetTimeline(jobId)
      .then((nextTimeline) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setTimeline(nextTimeline);
        });
      })
      .catch((issue) => {
        if (cancelled) {
          return;
        }

        if (issue instanceof ApiError && issue.status === 404) {
          setTimeline(null);
          setTimelineError(null);
          return;
        }

        setTimeline(null);
        setTimelineError(issue instanceof Error ? issue.message : 'Unable to load the milestone timeline.');
      })
      .finally(() => {
        if (!cancelled) {
          setTimelineLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  useEffect(() => {
    if (!jobId) {
      setCanonicalEvents([]);
      return;
    }

    let cancelled = false;
    void getMilestoneSyncEvents(jobId, 6)
      .then((events) => {
        if (!cancelled) {
          setCanonicalEvents(events);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanonicalEvents([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  const recentEvents = useMemo(() => mergedEvents.slice(0, 3), [mergedEvents]);
  const primaryAgent = analysis?.agentCandidates[0] ?? null;
  const primaryModel = analysis?.modelMatches[0] ?? null;

  useEffect(() => {
    if (!jobId || !deferredPrompt) {
      setAnalysis(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      return;
    }

    let cancelled = false;
    setAnalysisLoading(true);
    setAnalysisError(null);

    void services
      .analyzePrismPrompt(deferredPrompt)
      .then((nextAnalysis) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setAnalysis(nextAnalysis);
        });
      })
      .catch((issue) => {
        if (cancelled) {
          return;
        }

        setAnalysis(null);
        setAnalysisError(issue instanceof Error ? issue.message : 'Unable to load the PRISM milestone copilot.');
      })
      .finally(() => {
        if (!cancelled) {
          setAnalysisLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredPrompt, jobId, services]);

  async function handleSeedTimeline() {
    if (!jobId) {
      return;
    }

    setActionBusy(true);
    setActionError(null);
    try {
      const created = await milestoneCreateTimeline({ job_id: jobId });
      startTransition(() => {
        setTimeline(created);
      });
    } catch (issue) {
      setActionError(issue instanceof Error ? issue.message : 'Unable to seed the milestone timeline.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAdvanceMilestone() {
    if (!jobId) {
      return;
    }

    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await milestoneAdvance(jobId, {
        notes: advanceNotes.trim() || undefined,
        advanced_by: surface,
      });
      startTransition(() => {
        setTimeline(updated);
      });
      setAdvanceNotes('');
    } catch (issue) {
      setActionError(issue instanceof Error ? issue.message : 'Unable to advance the active milestone.');
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-white/8 bg-[#071017] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-50">{title}</div>
          <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
        </div>
        {jobId ? <StatusPill label={jobId} tone="violet" /> : <StatusPill label="No job selected" tone="slate" />}
      </div>

      {jobId ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Progress</div>
              <div className="mt-2 text-lg font-semibold text-slate-50">
                {timeline ? `${timeline.progress_pct}%` : timelineLoading ? 'Loading' : 'Unseeded'}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {timeline ? `${timeline.completed_count}/${timeline.total_milestones} milestones complete` : 'Seed a timeline to track execution milestones.'}
              </div>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Current stage</div>
              <div className="mt-2 text-lg font-semibold text-slate-50">{activeMilestone?.label ?? 'Waiting for seed'}</div>
              <div className="mt-1 text-sm text-slate-400">{jobStatus ? `Aligned to ${jobStatus}` : 'PRISM will align this to the current execution posture.'}</div>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Delivery posture</div>
              <div className="mt-2 text-lg font-semibold text-slate-50">{timeline?.estimated_delivery ?? dueDate ?? 'TBD'}</div>
              <div className="mt-1 text-sm text-slate-400">{queueSummary ?? 'Queue posture will sharpen the ETA reasoning when machine data is available.'}</div>
            </div>
          </div>

          {timeline ? (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 transition-[width] duration-300"
                  style={{ width: `${Math.max(6, timeline.progress_pct)}%` }}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {timeline.milestones.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-[20px] border px-4 py-3 ${
                      entry.status === 'active'
                        ? 'border-sky-300/22 bg-sky-300/[0.08]'
                        : entry.status === 'completed'
                          ? 'border-emerald-300/18 bg-emerald-300/[0.06]'
                          : entry.status === 'skipped'
                            ? 'border-amber-300/18 bg-amber-300/[0.06]'
                            : 'border-white/8 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-50">{entry.label}</div>
                      <StatusPill label={entry.status} tone={milestoneTone(entry.status)} />
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">Stage {entry.milestone_idx + 1}</div>
                    <div className="mt-3 text-sm text-slate-300">
                      {entry.status === 'completed'
                        ? `Completed ${formatMoment(entry.completed_at)}`
                        : entry.status === 'active'
                          ? `Started ${formatMoment(entry.started_at)}`
                          : entry.status === 'skipped'
                            ? entry.notes || 'Skipped in the current workflow.'
                            : 'Waiting on earlier milestone completion.'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  aria-label="Milestone advance notes"
                  placeholder="Advance notes for the next milestone handoff"
                  value={advanceNotes}
                  onChange={(event) => setAdvanceNotes(event.target.value)}
                />
                <ActionButton onClick={handleAdvanceMilestone} disabled={actionBusy || !activeMilestone}>
                  {actionBusy ? 'Saving...' : 'Advance active milestone'}
                </ActionButton>
              </div>
            </>
          ) : (
            <div className="rounded-[20px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">
              {timelineLoading
                ? 'Loading milestone posture...'
                : 'No milestone timeline is seeded for this job yet. Seed one here so jobs, orders, and the portal all reason over the same execution stages.'}
              {!timelineLoading ? (
                <div className="mt-4">
                  <ActionButton onClick={handleSeedTimeline} disabled={actionBusy}>
                    {actionBusy ? 'Seeding...' : 'Seed milestone timeline'}
                  </ActionButton>
                </div>
              ) : null}
            </div>
          )}

          {timelineError ? (
            <div className="rounded-[18px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
              {timelineError}
            </div>
          ) : null}
          {actionError ? (
            <div className="rounded-[18px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
              {actionError}
            </div>
          ) : null}

          {recentEvents.length > 0 ? (
            <div className="rounded-[22px] border border-violet-300/16 bg-violet-300/[0.05] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-50">PRISM sync memory</div>
                <StatusPill label={`${recentEvents.length} recent`} tone="violet" />
              </div>
              <div className="mt-3 space-y-3 text-sm text-slate-300">
                {recentEvents.map((event) => (
                  <div key={event.id} className="rounded-[18px] border border-white/8 bg-slate-950/30 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-slate-100">{event.summary}</div>
                      <StatusPill label={event.outcome} tone={event.outcome === 'error' ? 'rose' : event.outcome === 'drift' ? 'amber' : event.outcome === 'aligned' || event.outcome === 'seeded' ? 'emerald' : 'sky'} />
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {event.trigger.replace(/-/g, ' ')} · {formatMoment(event.timestamp)}
                    </div>
                    <div className="mt-3 space-y-2">
                      {event.details.slice(0, 2).map((detail) => (
                        <div key={detail} className="rounded-[14px] border border-white/8 bg-black/15 px-3 py-2">
                          {detail}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-slate-300">
                      CLI route: <span className="font-mono text-[12px] text-violet-100">{event.cliCommand}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[22px] border border-cyan-300/16 bg-cyan-300/[0.05] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-50">PRISM milestone copilot</div>
              {analysis?.suggestedSurface ? <StatusPill label={analysis.suggestedSurface.label} tone="sky" /> : null}
            </div>
            {analysisLoading ? <div className="mt-3 text-sm text-slate-300">PRISM is reasoning through the best milestone move and CLI route.</div> : null}
            {analysisError ? <div className="mt-3 text-sm text-rose-100">{analysisError}</div> : null}
            {analysis ? (
              <div className="mt-3 space-y-4 text-sm text-slate-300">
                <div className="rounded-[18px] border border-white/8 bg-slate-950/40 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Reasoning summary</div>
                  <div className="mt-2 text-slate-100">{analysis.reasoningSummary}</div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[18px] border border-cyan-300/14 bg-cyan-300/[0.05] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/70">Execution chain</div>
                    <div className="mt-2 text-sm font-semibold text-slate-50">{analysis.automation.chainId}</div>
                    <div className="mt-1 text-xs text-slate-300">
                      {analysis.automation.taskClass.replace(/_/g, ' ')} with {analysis.automation.tokenBudget} tokens and {Math.round(analysis.automation.confidence * 100)}% confidence.
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-violet-300/14 bg-violet-300/[0.05] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-violet-200/70">Lead agent</div>
                    <div className="mt-2 text-sm font-semibold text-slate-50">{primaryAgent?.name ?? 'Agent routing pending'}</div>
                    <div className="mt-1 text-xs text-slate-300">
                      {primaryAgent ? `${primaryAgent.category} - ${primaryAgent.reason}` : 'PRISM is still resolving the best executor for this milestone move.'}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-emerald-300/14 bg-emerald-300/[0.05] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/70">Lead model</div>
                    <div className="mt-2 text-sm font-semibold text-slate-50">{primaryModel?.name ?? 'Model routing pending'}</div>
                    <div className="mt-1 text-xs text-slate-300">
                      {primaryModel ? `${primaryModel.domain} - ${primaryModel.why}` : 'PRISM is still resolving the best deep-learning match for this job context.'}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Suggested surface</div>
                    <div className="mt-2 text-sm font-semibold text-slate-50">{analysis.suggestedSurface.label}</div>
                    <div className="mt-2 text-slate-300">CLI route: <span className="font-mono text-[12px] text-cyan-100">{analysis.suggestedSurface.cliCommand}</span></div>
                    <Link
                      to={analysis.suggestedSurface.route}
                      className="mt-3 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[0.10] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.16]"
                    >
                      {analysis.suggestedSurface.actionLabel}
                    </Link>
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Next actions</div>
                    <div className="mt-2 space-y-2">
                      {analysis.nextActions.slice(0, 4).map((action) => (
                        <div key={action} className="rounded-[16px] border border-white/8 bg-black/15 px-3 py-2">
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {analysis.apprentice ? (
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Apprentice explanation</div>
                    <div className="mt-2 text-slate-100">
                      {analysis.apprentice.parameter}: {analysis.apprentice.value}
                    </div>
                    <div className="mt-2 text-slate-300">{analysis.apprentice.explanation}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {analysis.apprentice.factors.slice(0, 4).map((factor) => (
                        <span key={factor.factor} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">
                          {factor.factor}: {factor.impact}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Deep-learning matches</div>
                    <div className="mt-2 space-y-2">
                      {analysis.modelMatches.slice(0, 3).map((model) => (
                        <div key={model.id} className="rounded-[16px] border border-white/8 bg-black/15 px-3 py-2">
                          <div className="font-semibold text-slate-100">{model.name}</div>
                          <div className="text-xs text-slate-400">{model.domain} - {model.why}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Reasoning agents</div>
                    <div className="mt-2 space-y-2">
                      {analysis.agentCandidates.slice(0, 3).map((agent) => (
                        <div key={agent.id} className="rounded-[16px] border border-white/8 bg-black/15 px-3 py-2">
                          <div className="font-semibold text-slate-100">{agent.name}</div>
                          <div className="text-xs text-slate-400">{agent.category} - {agent.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">
          Select a job or order record to load the shared milestone timeline and PRISM copilot.
        </div>
      )}
    </section>
  );
}
