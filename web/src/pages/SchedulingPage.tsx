import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { schedulingCPM, schedulingJobShop, schedulingJohnsons, schedulingSingleMachine, ApiError } from '../api/client';
import { useWebSocket, type WSMessage } from '../hooks/useWebSocket';
import { LoadingState, ErrorState } from '../components/LoadingState';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { ApprovalLane, ReleaseGateChecklist, ShortageLane } from '../components/operating-system/WorkflowPrimitives';
import type { HotJobRecord, SchedulingStudyRecord, StudyExceptionRecord, StudyTone } from '../features/operating-system/contracts';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type { ScheduleResult } from '../api/types';
import { buildCapturePath } from '../utils/captureRoute';
import { normalizeTrackedDepartment } from '../utils/jobTracking';
import { buildShopFloorPath } from '../utils/shopFloorRoute';
import { buildWorkflowPath, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type Tab = 'jobshop' | 'single' | 'johnsons' | 'cpm';

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-violet-400/22 via-violet-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="mb-5">
        <div className="text-xl font-semibold text-slate-50">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ tone, label }: { tone: StudyTone; label: string }) {
  const toneClass =
    tone === 'critical'
      ? 'border-rose-300/26 bg-rose-400/12 text-rose-100'
      : tone === 'watch'
        ? 'border-amber-300/26 bg-amber-300/12 text-amber-50'
        : tone === 'loaded'
          ? 'border-emerald-300/26 bg-emerald-300/12 text-emerald-50'
          : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100';

  return <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>{label}</span>;
}

function ExceptionCard({ item }: { item: StudyExceptionRecord }) {
  const toneClass =
    item.severity === 'critical'
      ? 'border-rose-300/18 bg-rose-400/[0.08]'
      : item.severity === 'watch'
        ? 'border-amber-300/18 bg-amber-300/[0.08]'
        : 'border-sky-300/16 bg-sky-300/[0.06]';

  return (
    <div className={`rounded-[20px] border px-4 py-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-50">{item.title}</div>
        <StatusPill
          tone={item.severity === 'critical' ? 'critical' : item.severity === 'watch' ? 'watch' : 'ready'}
          label={item.severity}
        />
      </div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</div>
    </div>
  );
}

function HotReleaseCard({
  hotJob,
  releasePath,
  jobsPath,
}: {
  hotJob: HotJobRecord;
  releasePath: string;
  jobsPath: string;
}) {
  return (
    <div className="rounded-[20px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-50">{hotJob.partNumber}</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-100/80">
            {hotJob.jobId} · {hotJob.customer}
          </div>
        </div>
        <span className="rounded-full border border-rose-300/24 bg-rose-300/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-50">
          {hotJob.dueDate === 'Unscheduled' ? 'Hot' : `Due ${hotJob.dueDate}`}
        </span>
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-200">{hotJob.note}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          to={releasePath}
          className="rounded-[18px] border border-cyan-300/20 bg-cyan-300/[0.1] px-3 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.16]"
        >
          Open Print to CNC
        </Link>
        <Link
          to={jobsPath}
          className="rounded-[18px] border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-semibold text-slate-50 transition hover:border-white/16 hover:bg-white/[0.08]"
        >
          Open Jobs desk
        </Link>
      </div>
    </div>
  );
}

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  jobshop: { label: 'Job Shop', detail: 'Multi-machine routing and makespan posture.' },
  single: { label: 'Single Machine', detail: 'Sequence jobs on one constrained resource.' },
  johnsons: { label: "Johnson's Rule", detail: 'Two-machine flow-shop ordering in one click.' },
  cpm: { label: 'CPM', detail: 'Critical path visibility for linked operations.' },
};

const JOB_COLORS = ['bg-sky-400', 'bg-emerald-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400', 'bg-cyan-400'];

function formatPayload(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}

function renderTimeline(study: SchedulingStudyRecord) {
  if (study.machineLanes.length === 0) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {study.sequence.map((step) => (
          <div key={step.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-50">{step.label}</div>
              {step.badge ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {step.badge}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-300">{step.detail}</div>
          </div>
        ))}
      </div>
    );
  }

  const maxEnd = Math.max(...study.machineLanes.flatMap((lane) => lane.blocks.map((block) => block.end)), 1);
  const uniqueJobs = [...new Set(study.machineLanes.flatMap((lane) => lane.blocks.map((block) => block.jobId)))];

  return (
    <div className="space-y-5">
      {study.machineLanes.map((lane) => (
        <div key={lane.id} className="grid gap-3 lg:grid-cols-[120px_minmax(0,1fr)] lg:items-center">
          <div>
            <div className="text-sm font-semibold text-slate-100">{lane.machine}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{lane.note}</div>
          </div>
          <div className="relative h-12 rounded-full border border-white/8 bg-white/[0.04]">
            {lane.blocks.map((block) => {
              const left = (block.start / maxEnd) * 100;
              const width = ((block.end - block.start) / maxEnd) * 100;
              const jobIndex = uniqueJobs.indexOf(block.jobId);

              return (
                <div
                  key={block.id}
                  className={`absolute top-1.5 h-9 rounded-full px-2 text-xs font-semibold text-slate-950 ${JOB_COLORS[jobIndex % JOB_COLORS.length]}`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 8)}%` }}
                  title={`${block.jobId}: ${block.start}-${block.end}`}
                >
                  <div className="flex h-full items-center justify-center truncate">{block.jobId}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3 border-t border-white/8 pt-4">
        {uniqueJobs.map((jobId, index) => (
          <div key={jobId} className="flex items-center gap-2 text-sm text-slate-300">
            <span className={`h-3 w-3 rounded-full ${JOB_COLORS[index % JOB_COLORS.length]}`} />
            <span>{jobId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Scheduling data could not be loaded right now.';
}

export function SchedulingPage() {
  const location = useLocation();
  const services = useOperatingSystem();
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const [tab, setTab] = useState<Tab>('jobshop');
  const [jobShopResult, setJobShopResult] = useState<ScheduleResult | null>(null);
  const [singleResult, setSingleResult] = useState<unknown | null>(null);
  const [johnsonsResult, setJohnsonsResult] = useState<unknown | null>(null);
  const [cpmResult, setCpmResult] = useState<unknown | null>(null);
  const [studies, setStudies] = useState<SchedulingStudyRecord[]>([]);
  const [hotJobs, setHotJobs] = useState<HotJobRecord[]>([]);
  const [studiesLoading, setStudiesLoading] = useState(true);
  const [studiesError, setStudiesError] = useState<string | null>(null);
  const [studiesReloadKey, setStudiesReloadKey] = useState(0);
  const [releaseChecksByStudy, setReleaseChecksByStudy] = useState<Record<string, Record<string, boolean>>>({});
  const [loadingTab, setLoadingTab] = useState<Tab | null>(null);
  const [error, setError] = useState<string | null>(null);

  // RT: WebSocket for live machine/job updates — triggers study rebuild
  const onWsMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'machine:status' || msg.type === 'job:progress' || msg.type === 'job:complete') {
      setStudiesReloadKey((k) => k + 1);
    }
  }, []);
  const { isConnected: wsConnected } = useWebSocket({
    rooms: ['machine:all', 'job:all'],
    onMessage: onWsMessage,
    autoConnect: true,
  });

  useEffect(() => {
    let active = true;
    setStudiesLoading(true);
    setStudiesError(null);

    services
      .buildStudies({
        jobShopResult,
        singleResult,
        johnsonsResult,
        cpmResult,
      })
      .then((nextStudies) => {
        if (active) {
          setStudies(nextStudies);
        }
      })
      .catch((caught) => {
        if (active) {
          setStudies([]);
          setStudiesError(getErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) {
          setStudiesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [cpmResult, johnsonsResult, jobShopResult, services, singleResult, studiesReloadKey]);

  useEffect(() => {
    let active = true;

    services
      .getHotJobs()
      .then((records) => {
        if (active) {
          setHotJobs(records);
        }
      })
      .catch(() => {
        if (active) {
          setHotJobs([]);
        }
      });

    const unsubscribe = services.subscribeHotJobs((records) => {
      if (active) {
        setHotJobs(records);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [services]);

  const selectedStudy = studies.find((study) => study.key === tab) ?? studies[0] ?? null;
  const selectedReleaseChecks = selectedStudy ? releaseChecksByStudy[selectedStudy.key] ?? {} : {};
  const selectedReleaseCount = selectedStudy
    ? selectedStudy.release.checks.filter((check) => selectedReleaseChecks[check.id]).length
    : 0;
  const selectedReleaseReady = selectedStudy
    ? selectedStudy.release.checks.length > 0 && selectedReleaseCount === selectedStudy.release.checks.length
    : false;
  const selectedReleaseSummary = selectedReleaseReady
    ? 'Ready to publish'
    : `${(selectedStudy?.release.checks.length ?? 0) - selectedReleaseCount} checks remaining`;
  const selectedPrimaryBlock = useMemo(
    () =>
      selectedStudy?.machineLanes
        .flatMap((lane) => lane.blocks.map((block) => ({ ...block, machine: lane.machine })))
        .sort((left, right) => left.start - right.start)[0] ?? null,
    [selectedStudy],
  );
  const selectedPrimaryJobId =
    selectedPrimaryBlock?.jobId ??
    selectedStudy?.sequence[0]?.label.match(/[A-Z]+[-\d]+/i)?.[0] ??
    '';
  const selectedPrimaryMachine = selectedPrimaryBlock?.machine ?? selectedStudy?.machineLanes[0]?.machine ?? '';
  const selectedReleaseOperation = selectedStudy?.sequence[0]?.label ?? selectedStudy?.plannerActions[0]?.title ?? 'Release review';
  const selectedReleaseDepartment =
    normalizeTrackedDepartment(selectedStudy?.release.owner ?? '', selectedReleaseOperation) ||
    (selectedReleaseReady ? 'Run cycle' : 'Job setup');
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: 'scheduling-desk',
            recordType: 'Scheduling study',
            recordId: selectedStudy?.key ?? '',
            customer: routeContext.origin.customer,
            note: routeContext.origin.note || '',
            threadId: routeContext.origin.threadId,
          },
    [routeContext.origin, selectedStudy?.key],
  );
  const effectiveFocus = useMemo(
    () =>
      selectedPrimaryJobId
        ? { type: 'job', id: selectedPrimaryJobId, jobId: selectedPrimaryJobId }
        : routeContext.focus.id
          ? routeContext.focus
          : selectedStudy
            ? { type: 'study', id: selectedStudy.key }
            : undefined,
    [routeContext.focus, selectedPrimaryJobId, selectedStudy],
  );
  const plannerCapturePath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'scheduling-desk',
        target: 'job',
        job: selectedPrimaryJobId,
        department: selectedReleaseDepartment,
        machine: selectedPrimaryMachine,
        note: `Capture planner board evidence, release blockers, and sequencing context for the ${selectedStudy?.label ?? 'selected'} study.`,
        origin: effectiveOrigin,
        focus: effectiveFocus,
      }),
    [effectiveFocus, effectiveOrigin, location.pathname, location.search, selectedPrimaryJobId, selectedPrimaryMachine, selectedReleaseDepartment, selectedStudy?.label],
  );
  const plannerShopFloorPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'scheduling-desk',
        job: selectedPrimaryJobId,
        department: selectedReleaseDepartment,
        operation: selectedReleaseOperation,
        machine: selectedPrimaryMachine,
        note: `Carry ${selectedStudy?.label ?? 'planner'} sequencing into floor execution and actual-vs-plan capture.`,
        origin: effectiveOrigin,
        focus: effectiveFocus,
      }),
    [effectiveFocus, effectiveOrigin, location.pathname, location.search, selectedPrimaryJobId, selectedPrimaryMachine, selectedReleaseDepartment, selectedReleaseOperation, selectedStudy?.label],
  );
  const hotReleaseItems = useMemo(
    () =>
      hotJobs.slice(0, 3).map((hotJob) => ({
        hotJob,
        releasePath: buildWorkflowPath('/print-to-cnc', location.search, {
          origin: {
            source: 'scheduling-desk',
            recordType: 'Hot release',
            recordId: hotJob.jobId,
            customer: hotJob.customer,
            note: hotJob.note,
          },
          focus: { type: 'job', id: hotJob.jobId, jobId: hotJob.jobId, packetId: hotJob.jobId },
        }),
        jobsPath: buildWorkflowPath('/jobs', location.search, {
          origin: {
            source: 'scheduling-desk',
            recordType: 'Hot release',
            recordId: hotJob.jobId,
            customer: hotJob.customer,
            note: hotJob.note,
          },
          focus: { type: 'job', id: hotJob.jobId, jobId: hotJob.jobId },
        }),
      })),
    [hotJobs, location.search],
  );

  // Backend contract note: once E2-style scheduling payloads land, this page should bind
  // directly to release readiness, shortage holds, owner assignments, and publish actions
  // instead of synthesizing planner posture from lightweight solver-only responses.

  function toggleReleaseCheck(studyKey: string, checkId: string) {
    setReleaseChecksByStudy((current) => ({
      ...current,
      [studyKey]: {
        ...(current[studyKey] ?? {}),
        [checkId]: !(current[studyKey] ?? {})[checkId],
      },
    }));
  }

  async function runJobShop() {
    setLoadingTab('jobshop');
    setError(null);
    try {
      const response = await schedulingJobShop({
        jobs: [
          { job_id: 'BRKT-01', machine: 'Mill 4', duration: 70 },
          { job_id: 'VALVE-22', machine: 'Lathe 2', duration: 54 },
          { job_id: 'IMP-07', machine: '5X-02', duration: 110 },
        ],
      });
      setJobShopResult(response.result as unknown as ScheduleResult);
      setTab('jobshop');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoadingTab(null);
    }
  }

  async function runSingleMachine() {
    setLoadingTab('single');
    setError(null);
    try {
      const response = await schedulingSingleMachine({
        jobs: [
          { job_id: 'J1', processing_time: 10, weight: 2 },
          { job_id: 'J2', processing_time: 5, weight: 3 },
          { job_id: 'J3', processing_time: 8, weight: 2 },
          { job_id: 'J4', processing_time: 3, weight: 4 },
        ],
        rule: 'wspt',
      });
      setSingleResult(response.result);
      setTab('single');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoadingTab(null);
    }
  }

  async function runJohnsons() {
    setLoadingTab('johnsons');
    setError(null);
    try {
      const response = await schedulingJohnsons({
        jobs: [
          { job_id: 'J1', machine1_time: 5, machine2_time: 8 },
          { job_id: 'J2', machine1_time: 9, machine2_time: 3 },
          { job_id: 'J3', machine1_time: 4, machine2_time: 7 },
          { job_id: 'J4', machine1_time: 7, machine2_time: 2 },
        ],
      });
      setJohnsonsResult(response.result);
      setTab('johnsons');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoadingTab(null);
    }
  }

  async function runCpm() {
    setLoadingTab('cpm');
    setError(null);
    try {
      const response = await schedulingCPM({
        tasks: [
          { id: 'A', duration: 2, predecessors: [] },
          { id: 'B', duration: 4, predecessors: ['A'] },
          { id: 'C', duration: 3, predecessors: ['A'] },
          { id: 'D', duration: 3, predecessors: ['B', 'C'] },
          { id: 'E', duration: 4, predecessors: ['D'] },
        ],
      });
      setCpmResult(response.result);
      setTab('cpm');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoadingTab(null);
    }
  }

  if (!selectedStudy && studiesLoading) {
    return <LoadingState label="Building scheduling studies..." />;
  }

  if (!selectedStudy) {
    return <ErrorState message={studiesError ?? 'Scheduling studies could not be loaded right now.'} onRetry={() => setStudiesReloadKey((current) => current + 1)} />;
  }

  const activeRun =
    selectedStudy.key === 'jobshop'
      ? runJobShop
      : selectedStudy.key === 'single'
        ? runSingleMachine
        : selectedStudy.key === 'johnsons'
          ? runJohnsons
          : runCpm;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_28%),linear-gradient(180deg,#07111b_0%,#050910_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(13,23,34,0.98)_0%,rgba(5,9,15,0.98)_62%,rgba(6,18,30,0.96)_100%)] px-6 py-6 shadow-[0_36px_120px_rgba(0,0,0,0.34)] sm:px-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.9fr)] xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                  Scheduling workspace
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]' : 'bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.4)]'}`} />
                  {wsConnected ? 'Live updates' : 'Reconnecting'}
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Scheduling</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Keep solver output, release posture, and planner exceptions on the same operating surface so dispatch can trust what gets published.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {selectedStudy.metrics.map((metric) => (
                <SummaryTile
                  key={metric.id}
                  label={metric.label}
                  value={metric.value}
                  hint={metric.hint}
                  accent={metric.accent}
                />
              ))}
            </div>
          </div>
        </section>

        {error ? <ErrorState message={error} onRetry={activeRun} /> : null}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1.35fr)_340px]">
          <div className="space-y-6">
            <PanelCard title="Scheduling studies" subtitle="Choose the scheduling lens planners should operate from right now.">
              <div className="space-y-3">
                {studies.map((study) => {
                  const active = study.key === selectedStudy.key;
                  const releaseProgress = releaseChecksByStudy[study.key] ?? {};
                  const completedChecks = study.release.checks.filter((check) => releaseProgress[check.id]).length;
                  return (
                    <button
                      key={study.key}
                      type="button"
                      onClick={() => setTab(study.key as Tab)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        active
                          ? 'border-cyan-300/28 bg-cyan-300/[0.12] shadow-[0_14px_40px_rgba(56,189,248,0.18)]'
                          : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{study.label}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-400">{study.detail}</div>
                        </div>
                        <StatusPill tone={study.tone} label={active ? 'selected' : study.statusLabel} />
                      </div>
                      <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-3 xl:grid-cols-1">
                        <div>
                          <div className="uppercase tracking-[0.16em] text-slate-500">Posture</div>
                          <div className="mt-1 text-sm text-slate-200">{study.postureValue}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-[0.16em] text-slate-500">Bottleneck</div>
                          <div className="mt-1 text-sm text-slate-200">{study.bottleneckValue}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-[0.16em] text-slate-500">Publish</div>
                          <div className="mt-1 text-sm text-slate-200">{study.publishValue}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between rounded-[18px] border border-white/8 bg-black/20 px-3 py-2 text-xs text-slate-300">
                        <span>Release gate</span>
                        <span>
                          {completedChecks}/{study.release.checks.length} complete
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </PanelCard>

            <PanelCard title="Hot release queue" subtitle="Management escalations override pure due-date order until the hot flag is cleared.">
              <SurfaceStatusNotice title="Priority escalation status" surfaces={['hotJobs', 'scheduling']} className="mb-4" />
              <div className="space-y-3">
                {hotReleaseItems.length > 0 ? (
                  hotReleaseItems.map((item) => (
                    <HotReleaseCard
                      key={item.hotJob.jobId}
                      hotJob={item.hotJob}
                      releasePath={item.releasePath}
                      jobsPath={item.jobsPath}
                    />
                  ))
                ) : (
                  <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-400">
                    No shop-wide hot jobs are active right now. Planner release order stays on normal due-date and solver posture until management stages a new escalation.
                  </div>
                )}
              </div>
            </PanelCard>

            <PanelCard title="Run scheduling study" subtitle="Keep the existing solver actions, but frame them like planner tools instead of detached demos.">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => void runJobShop()}
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.07]"
                >
                  <div className="text-sm font-semibold text-slate-50">Run Job Shop Schedule</div>
                  <div className="mt-1 text-sm text-slate-400">Load machine lanes, makespan posture, and the bottleneck review surface.</div>
                </button>
                <button
                  type="button"
                  onClick={() => void runSingleMachine()}
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.07]"
                >
                  <div className="text-sm font-semibold text-slate-50">Run WSPT Schedule</div>
                  <div className="mt-1 text-sm text-slate-400">Refresh the constrained-cell queue and release order.</div>
                </button>
                <button
                  type="button"
                  onClick={() => void runJohnsons()}
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.07]"
                >
                  <div className="text-sm font-semibold text-slate-50">Run Johnson&apos;s Algorithm</div>
                  <div className="mt-1 text-sm text-slate-400">Compare two-machine handoff order against the live planner board.</div>
                </button>
                <button
                  type="button"
                  onClick={() => void runCpm()}
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.07]"
                >
                  <div className="text-sm font-semibold text-slate-50">Run CPM Analysis</div>
                  <div className="mt-1 text-sm text-slate-400">Expose dependency gates and blocked ownership beside the schedule surface.</div>
                </button>
              </div>

              {loadingTab ? <LoadingState label={`Running ${TAB_CONFIG[loadingTab].label} study...`} /> : null}
            </PanelCard>
          </div>

          <div className="space-y-6">
            <PanelCard title={selectedStudy.boardTitle} subtitle={selectedStudy.boardSubtitle}>
              {renderTimeline(selectedStudy)}
            </PanelCard>

            <PanelCard title="Planner sequence" subtitle="Show the release order or critical chain as an operating list, not buried in JSON.">
              <div className="grid gap-3 lg:grid-cols-2">
                {selectedStudy.sequence.map((step) => (
                  <div key={step.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-50">{step.label}</div>
                      {step.badge ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                          {step.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{step.detail}</div>
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard title="Exception lane" subtitle="Planner review should live beside the board, with release risk made explicit before publish.">
              <div className="space-y-3">
                {selectedStudy.exceptions.map((item) => (
                  <ExceptionCard key={item.id} item={item} />
                ))}
              </div>
            </PanelCard>
          </div>

          <div className="space-y-6">
            <PanelCard title="Study inspector" subtitle={selectedStudy.inspectorNote}>
              <div className="space-y-3">
                {selectedStudy.metrics.map((metric) => (
                  <div key={`inspector-${metric.id}`} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{metric.label}</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-50">{metric.value}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">{metric.hint}</div>
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard title="Release gate" subtitle="Turn the selected study into an operational release decision, not just an algorithm result.">
              <ReleaseGateChecklist
                checks={selectedStudy.release.checks}
                completed={selectedReleaseChecks}
                onToggle={(checkId) => toggleReleaseCheck(selectedStudy.key, checkId)}
                summary={selectedReleaseSummary}
                tone={selectedReleaseReady ? 'emerald' : selectedReleaseCount > 0 ? 'amber' : 'sky'}
                note={`Release owner: ${selectedStudy.release.owner}. Claude-owned backend work will later bind these checks to live approvals, shortages, owners, and publish actions.`}
              />
            </PanelCard>

            <PanelCard title="Planner handoff" subtitle="Push the selected study into execution and evidence capture without reopening downstream desks cold.">
              <div className="space-y-3">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                  <div className="text-sm font-semibold text-slate-50">{selectedStudy.label}</div>
                  <div className="mt-2">
                    {selectedPrimaryJobId ? `Primary job ${selectedPrimaryJobId}` : 'Planner-level handoff'} · {selectedPrimaryMachine || 'Machine pending'} · {selectedReleaseDepartment}
                  </div>
                </div>
                <Link
                  to={plannerShopFloorPath}
                  className="block rounded-[20px] border border-emerald-300/20 bg-emerald-300/[0.1] px-4 py-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/[0.16]"
                >
                  <div>Open Shop Floor prove-out</div>
                  <div className="mt-2 text-sm font-normal leading-6 text-emerald-50/80">
                    Carry machine, release, and operation context into floor execution so actuals can validate the scheduling posture.
                  </div>
                </Link>
                <Link
                  to={plannerCapturePath}
                  className="block rounded-[20px] border border-cyan-300/20 bg-cyan-300/[0.1] px-4 py-4 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.16]"
                >
                  <div>Open Capture Ops</div>
                  <div className="mt-2 text-sm font-normal leading-6 text-cyan-50/80">
                    Stage board screenshots, setup evidence, and release-blocker media on the same record-aware route context.
                  </div>
                </Link>
              </div>
            </PanelCard>

            <PanelCard title="Workflow posture" subtitle="Shared workflow vocabulary should match the jobs desk instead of becoming a scheduling-only island.">
              <div className="space-y-4">
                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-50">Approvals</div>
                  <ApprovalLane
                    approvals={selectedStudy.release.approvals}
                    emptyMessage="No approval objects are staged for this study yet."
                  />
                </div>
                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-50">Shortages and holds</div>
                  <ShortageLane
                    shortages={selectedStudy.release.shortages}
                    emptyMessage="No shortage holds are attached to the selected study."
                  />
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Recommended actions" subtitle="Keep the planner next steps visible so solver output becomes operational behavior.">
              <div className="space-y-3">
                {selectedStudy.plannerActions.map((action) => (
                  <div key={action.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">{action.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{action.detail}</div>
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard title={selectedStudy.payloadLabel} subtitle="Keep the raw response available while the scheduling desk still bridges evolving backend contracts.">
              <div className="rounded-[22px] border border-white/8 bg-slate-950/70 p-4">
                {selectedStudy.payload ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-cyan-100">{formatPayload(selectedStudy.payload)}</pre>
                ) : (
                  <div className="text-sm leading-6 text-slate-400">
                    No live payload loaded yet. Run the selected study to replace the seeded planner board with backend output.
                  </div>
                )}
              </div>
            </PanelCard>
          </div>
        </div>
      </div>
    </div>
  );
}
