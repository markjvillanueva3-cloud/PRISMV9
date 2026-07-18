import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { jobDashboard, jobCreate, jobUpdateStatus, jobSummary, ApiError } from '../api/client';
import { useWebSocket, type WSMessage } from '../hooks/useWebSocket';
import { getDispatchBoard, getTravelerSummary, type DispatchBoardRecord, type MachineQueueRecord, type TravelerSummaryRecord } from '../api/traveler';
import { MilestoneTimelinePanel } from '../components/erp/MilestoneTimelinePanel';
import { syncMilestoneMutation, type MilestoneSyncEvent } from '../components/erp/milestoneIntelligence';
import { LoadingState, ErrorState } from '../components/LoadingState';
import { QrSticker } from '../components/jobs/QrSticker';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { ApprovalLane, ShortageLane, TimelineLane, TravelerLane } from '../components/operating-system/WorkflowPrimitives';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import { buildJobIntakePreview as buildFallbackJobIntakePreview } from '../features/operating-system/jobDeskFixtures';
import type { HotJobRecord, JobDeskRecord } from '../features/operating-system/contracts';
import type { Job, JobDashboard, MilestoneSyncResult } from '../api/types';
import { buildCapturePath } from '../utils/captureRoute';
import type { JobTrackingPacket } from '../utils/jobTracking';
import { buildJobTrackingPacket } from '../utils/jobTracking';
import { normalizeTrackedDepartment } from '../utils/jobTracking';
import { buildShopFloorPath } from '../utils/shopFloorRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type Tab = 'dashboard' | 'create' | 'summary';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  dashboard: { label: 'Dispatch Board', detail: 'Queue-first execution desk with traveler, shortages, and live action lanes.' },
  create: { label: 'New Job', detail: 'Intake lane for releasing fresh work into the board.' },
  summary: { label: 'Job Summary', detail: 'Single-record payload review for sales, planning, or production.' },
};

const STATUS_OPTIONS: Array<'all' | Job['status']> = ['all', 'quoted', 'planned', 'in_progress', 'complete', 'shipped', 'invoiced'];

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
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/22 via-cyan-300/8 to-transparent'}`} />
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

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function formatPriority(priority?: string) {
  if (!priority) return 'Normal';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function statusBadgeClasses(status: string) {
  if (status === 'in_progress') return 'border-amber-300/20 bg-amber-300/10 text-amber-100';
  if (status === 'complete' || status === 'shipped' || status === 'invoiced') return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100';
  if (status === 'quoted') return 'border-violet-300/20 bg-violet-300/10 text-violet-100';
  return 'border-sky-300/20 bg-sky-300/10 text-sky-100';
}

function normalizeDate(value?: string) {
  if (!value) return 'Unscheduled';
  return value;
}

function safeHours(value?: number) {
  return typeof value === 'number' ? value : 0;
}

type DispatchLaneKey = 'run-now' | 'prep-next' | 'queue-watch' | 'blocked';

interface DispatchLaneItem {
  job: Job;
  desk: JobDeskRecord;
  reason: string;
}

interface DispatchLaneModel {
  key: DispatchLaneKey;
  label: string;
  hint: string;
  toneClass: string;
  emptyMessage: string;
  items: DispatchLaneItem[];
}

function formatMinutes(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0 min';
  }
  return `${Math.round(value)} min`;
}

function queueLead(queue: MachineQueueRecord | null) {
  if (!queue) return 'No machine queue';
  if (queue.active_job) {
    return `${queue.active_job.job_id} active`;
  }
  if (queue.entries[0]) {
    return `${queue.entries[0].job_id} queued first`;
  }
  return 'No queued entries';
}

function buildDispatchLaneModels(jobs: Job[], records: Map<string, JobDeskRecord>) {
  const lanes: Record<DispatchLaneKey, DispatchLaneModel> = {
    'run-now': {
      key: 'run-now',
      label: 'Run now',
      hint: 'Work the jobs that should already be in motion or immediately pulled forward.',
      toneClass: 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100',
      emptyMessage: 'No jobs are forcing an immediate execution move right now.',
      items: [],
    },
    'prep-next': {
      key: 'prep-next',
      label: 'Prep next',
      hint: 'Stage these jobs so the next setup or material handoff is already ready.',
      toneClass: 'border-cyan-300/18 bg-cyan-300/[0.08] text-cyan-100',
      emptyMessage: 'Nothing needs prep attention beyond the active run-now set.',
      items: [],
    },
    'queue-watch': {
      key: 'queue-watch',
      label: 'Queue watch',
      hint: 'Monitor these jobs, but keep current setup churn under control.',
      toneClass: 'border-white/10 bg-white/[0.03] text-slate-200',
      emptyMessage: 'No passive queue-watch jobs are currently staged.',
      items: [],
    },
    blocked: {
      key: 'blocked',
      label: 'Blocked',
      hint: 'Do not pull these forward until the blocker is cleared.',
      toneClass: 'border-amber-300/18 bg-amber-300/[0.08] text-amber-100',
      emptyMessage: 'No blocked jobs are holding the board right now.',
      items: [],
    },
  };

  jobs.forEach((job) => {
    const desk = records.get(job.id);
    if (!desk) {
      return;
    }

    const blockedShortage = desk.shortages[0];
    const blockedApproval = desk.approvals.find((approval) => approval.status === 'blocked');
    const readyApproval = desk.approvals.find((approval) => approval.status === 'ready');
    const runningTraveler = desk.traveler.find((step) => step.status === 'running');
    const readyTraveler = desk.traveler.find((step) => step.status === 'ready');

    if (blockedShortage) {
      lanes.blocked.items.push({
        job,
        desk,
        reason: `${blockedShortage.item} shortage`,
      });
      return;
    }

    if (blockedApproval) {
      lanes.blocked.items.push({
        job,
        desk,
        reason: `${blockedApproval.label} blocked`,
      });
      return;
    }

    if (desk.isHot) {
      lanes['run-now'].items.push({
        job,
        desk,
        reason: 'Management hot flag',
      });
      return;
    }

    if (job.status === 'in_progress' || runningTraveler || job.priority === 'high') {
      lanes['run-now'].items.push({
        job,
        desk,
        reason: runningTraveler ? `${runningTraveler.title} running` : `${formatPriority(job.priority)} priority`,
      });
      return;
    }

    if (readyTraveler || readyApproval || job.status === 'planned') {
      lanes['prep-next'].items.push({
        job,
        desk,
        reason: readyApproval ? `${readyApproval.label} ready` : readyTraveler ? `${readyTraveler.title} ready` : 'Planned and ready to stage',
      });
      return;
    }

    lanes['queue-watch'].items.push({
      job,
      desk,
      reason: 'Monitor queue slot and actuals',
    });
  });

  return Object.values(lanes);
}

export function JobsPage() {
  const location = useLocation();
  const services = useOperatingSystem();
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const focusId =
    routeContext.focus.type === 'job'
      ? routeContext.focus.jobId || routeContext.focus.id
      : '';
  const upstreamSource = routeContext.origin.source;
  const upstreamRecordType = routeContext.origin.recordType;
  const upstreamRecordId = routeContext.origin.recordId;
  const upstreamCustomer = routeContext.origin.customer;
  const upstreamNote = routeContext.origin.note;
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<JobDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Job['status']>('all');
  const [selectedJobId, setSelectedJobId] = useState(focusId);
  const [summaryJobId, setSummaryJobId] = useState(focusId);
  const [summaryData, setSummaryData] = useState<unknown>(null);
  const [hotJobs, setHotJobs] = useState<HotJobRecord[]>([]);
  const [jobDeskModels, setJobDeskModels] = useState<Map<string, JobDeskRecord>>(new Map());
  const [jobPackets, setJobPackets] = useState<Map<string, JobTrackingPacket>>(new Map());
  const [deskLoading, setDeskLoading] = useState(false);
  const [deskError, setDeskError] = useState<string | null>(null);
  const [deskReloadKey, setDeskReloadKey] = useState(0);
  const [dispatchBoard, setDispatchBoard] = useState<DispatchBoardRecord | null>(null);
  const [dispatchBoardError, setDispatchBoardError] = useState<string | null>(null);
  const [liveTravelerSummary, setLiveTravelerSummary] = useState<TravelerSummaryRecord | null>(null);
  const [liveTravelerError, setLiveTravelerError] = useState<string | null>(null);
  const [milestoneEvents, setMilestoneEvents] = useState<Record<string, MilestoneSyncEvent[]>>({});
  const [milestoneRefreshKeys, setMilestoneRefreshKeys] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    customer: upstreamCustomer,
    part_number: '',
    description: '',
    quantity: '100',
    material: '6061-T6',
    due_date: '',
    priority: 'normal',
  });
  const [intakePreview, setIntakePreview] = useState(() =>
    buildFallbackJobIntakePreview({
      customer: upstreamCustomer,
      part_number: '',
      description: '',
      quantity: '100',
      material: '6061-T6',
      due_date: '',
      priority: 'normal',
    }),
  );
  // RT: WebSocket for live job/machine updates — triggers board refresh
  const onWsMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'job:progress' || msg.type === 'job:complete' || msg.type === 'job:error') {
      setDeskReloadKey((k) => k + 1);
    }
  }, []);
  const { isConnected: wsConnected } = useWebSocket({
    rooms: ['job:all', 'machine:all'],
    onMessage: onWsMessage,
    autoConnect: true,
  });

  const upstreamSourceLabel = useMemo(() => formatWorkflowSourceLabel(upstreamSource), [upstreamSource]);
  const upstreamRecordLabel = useMemo(() => {
    if (!upstreamRecordType && !upstreamRecordId) {
      return '';
    }
    if (upstreamRecordType && upstreamRecordId) {
      return `${upstreamRecordType} ${upstreamRecordId}`;
    }
    return upstreamRecordType || upstreamRecordId;
  }, [upstreamRecordId, upstreamRecordType]);
  const upstreamContextNote = useMemo(() => {
    const reference = upstreamCustomer || upstreamRecordLabel || 'the upstream record';
    return upstreamNote || `Carry ${reference} context into dispatch, traveler staging, and new-job intake.`;
  }, [upstreamCustomer, upstreamNote, upstreamRecordLabel]);

  const activeTab = TAB_CONFIG[tab];
  const filteredJobs = useMemo(
    () => dashboard?.jobs?.filter((job) => statusFilter === 'all' || job.status === statusFilter) ?? [],
    [dashboard, statusFilter],
  );
  const rankedJobs = useMemo(() => services.rankJobsForTodo(filteredJobs), [filteredJobs, hotJobs, services]);
  const hotJobMap = useMemo(() => new Map(hotJobs.map((record) => [record.jobId, record])), [hotJobs]);
  const selectedJob = useMemo(
    () => rankedJobs.find((job) => job.id === selectedJobId) ?? rankedJobs[0] ?? null,
    [rankedJobs, selectedJobId],
  );
  const selectedDesk = selectedJob ? jobDeskModels.get(selectedJob.id) ?? null : null;
  const selectedHotJob = selectedJob ? hotJobMap.get(selectedJob.id) ?? null : null;
  const selectedPacket = selectedJob ? jobPackets.get(selectedJob.id) ?? buildJobTrackingPacket(selectedJob) : null;
  const mountedCurrentStep = liveTravelerSummary?.current_step ?? null;
  const fallbackTravelerStep = selectedDesk?.traveler[0] ?? null;
  const mountedMachineId = mountedCurrentStep?.machine_id ?? '';
  const selectedMachineId = mountedMachineId;
  const selectedMachineQueue = useMemo(
    () => (selectedMachineId ? dispatchBoard?.machines.find((machine) => machine.machine_id === selectedMachineId) ?? null : null),
    [dispatchBoard, selectedMachineId],
  );
  const activeWorkflowJobId = selectedJob?.id || selectedJobId || focusId;
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: 'jobs-desk',
            recordType: 'Job',
            recordId: activeWorkflowJobId || 'job',
            customer: upstreamCustomer,
            note: upstreamContextNote,
            threadId: routeContext.origin.threadId,
          },
    [activeWorkflowJobId, routeContext.origin, upstreamContextNote, upstreamCustomer],
  );
  const upstreamMessagesPath = useMemo(() => {
    return buildWorkflowPath('/messages', location.search, {
      origin: effectiveOrigin,
      focus: activeWorkflowJobId ? { type: 'job', id: activeWorkflowJobId, jobId: activeWorkflowJobId } : undefined,
    });
  }, [activeWorkflowJobId, effectiveOrigin, location.search]);
  const upstreamProgramReleasePath = useMemo(() => {
    return buildWorkflowPath('/print-to-cnc', location.search, {
      origin: effectiveOrigin,
      focus: activeWorkflowJobId
        ? { type: 'job', id: activeWorkflowJobId, jobId: activeWorkflowJobId, packetId: activeWorkflowJobId }
        : undefined,
    });
  }, [activeWorkflowJobId, effectiveOrigin, location.search]);
  const orderTrackingPath = useMemo(() => {
    return buildWorkflowPath('/order-tracking', location.search, {
      origin: effectiveOrigin,
      focus: activeWorkflowJobId ? { type: 'job', id: activeWorkflowJobId, jobId: activeWorkflowJobId } : undefined,
      extras: {
        source: 'jobs-desk',
        jobId: activeWorkflowJobId,
      },
    });
  }, [activeWorkflowJobId, effectiveOrigin, location.search]);
  const dispatchLanes = useMemo(() => buildDispatchLaneModels(rankedJobs, jobDeskModels), [jobDeskModels, rankedJobs]);
  const fallbackPacketDepartment =
    selectedPacket?.departments.find((department) => department.status === 'current')?.label ??
    (normalizeTrackedDepartment(fallbackTravelerStep?.title ?? '', fallbackTravelerStep?.title ?? '') || 'Job setup');
  const selectedPacketOperation = mountedCurrentStep?.operation ?? fallbackTravelerStep?.title ?? selectedPacket?.operations[0]?.label ?? 'Job setup';
  const selectedPacketDepartment =
    (mountedCurrentStep ? normalizeTrackedDepartment(mountedCurrentStep.operation, mountedCurrentStep.operation) : '') ||
    selectedPacket?.operations.find((operation) => operation.label === selectedPacketOperation)?.department ||
    fallbackPacketDepartment;
  const selectedPacketMachine = mountedMachineId || fallbackTravelerStep?.machine || '';
  const selectedTrackerPath = useMemo(
    () =>
      selectedPacket
        ? buildShopFloorPath(location.pathname, location.search, {
            source: 'jobs-desk',
            scan: selectedPacket.qrPayload,
            job: selectedPacket.jobId,
            department: selectedPacketDepartment,
            operation: selectedPacketOperation,
            machine: selectedPacketMachine,
            note: `Carry traveler release, department check-in, and prove-out actuals forward for ${selectedPacket.jobId}.`,
            origin: effectiveOrigin,
            focus: activeWorkflowJobId ? { type: 'job', id: activeWorkflowJobId, jobId: activeWorkflowJobId } : undefined,
          })
        : buildShopFloorPath(location.pathname, location.search, { source: 'jobs-desk' }),
    [activeWorkflowJobId, effectiveOrigin, location.pathname, location.search, selectedPacket, selectedPacketDepartment, selectedPacketMachine, selectedPacketOperation],
  );
  const capturePath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'jobs-desk',
        target: 'job',
        job: activeWorkflowJobId,
        department: selectedPacketDepartment,
        machine: selectedPacketMachine,
        note: selectedJob
          ? `Capture traveler photos, print scans, setup evidence, and handoff proof for ${selectedJob.id}.`
          : 'Capture traveler photos, print scans, setup evidence, and handoff proof for the active job packet.',
        origin: effectiveOrigin,
        focus: activeWorkflowJobId ? { type: 'job', id: activeWorkflowJobId, jobId: activeWorkflowJobId } : undefined,
      }),
    [activeWorkflowJobId, effectiveOrigin, location.pathname, location.search, selectedJob, selectedPacketDepartment, selectedPacketMachine],
  );
  const intakePacket = intakePreview.packet;
  const intakeTrackerPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'jobs-desk',
        scan: intakePacket.qrPayload,
        job: intakePacket.jobId,
        department: intakePacket.departments.find((department) => department.status === 'current')?.label ?? 'Intake',
        operation: intakePacket.operations[0]?.label ?? 'CAD work',
        note: `Open the traveler packet for ${intakePacket.jobId} with the seeded intake route and QR registration context.`,
      }),
    [intakePacket, location.pathname, location.search],
  );
  const hotJobCount = hotJobs.length;

  async function refreshHotJobs() {
    try {
      setHotJobs(await services.getHotJobs());
    } catch {
      setHotJobs([]);
    }
  }

  useEffect(() => {
    if (focusId) {
      setSelectedJobId(focusId);
      setSummaryJobId(focusId);
    }
  }, [focusId]);

  useEffect(() => {
    if (!upstreamCustomer) {
      return;
    }

    setForm((current) => (current.customer ? current : { ...current, customer: upstreamCustomer }));
  }, [upstreamCustomer]);

  useEffect(() => {
    if (!dashboard?.jobs?.length) {
      setJobDeskModels(new Map());
      setJobPackets(new Map());
      setDeskLoading(false);
      setDeskError(null);
      return;
    }

    let active = true;
    setDeskLoading(true);
    setDeskError(null);

    Promise.all([
      services.buildJobDeskRecords(dashboard.jobs),
      Promise.all(
        dashboard.jobs.map(async (job, index) => [
          job.id,
          await services.buildJobPacket(job, { seed: index }),
        ] as const),
      ),
    ])
      .then(([records, packets]) => {
        if (active) {
          setJobDeskModels(new Map(records.map((record) => [record.jobId, record])));
          setJobPackets(new Map(packets));
        }
      })
      .catch((issue) => {
        if (active) {
          setJobDeskModels(new Map());
          setJobPackets(new Map());
          setDeskError(issue instanceof Error ? issue.message : 'Failed to sync the dispatch desk.');
        }
      })
      .finally(() => {
        if (active) {
          setDeskLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dashboard, hotJobs, services, deskReloadKey]);

  useEffect(() => {
    if (tab !== 'dashboard') {
      return;
    }

    let active = true;
    setDispatchBoardError(null);

    void getDispatchBoard()
      .then((board) => {
        if (active) {
          setDispatchBoard(board);
        }
      })
      .catch((issue) => {
        if (active) {
          setDispatchBoard(null);
          setDispatchBoardError(issue instanceof Error ? issue.message : 'Unable to load the mounted dispatch board.');
        }
      });

    return () => {
      active = false;
    };
  }, [tab, deskReloadKey]);

  useEffect(() => {
    if (tab !== 'dashboard' || !selectedJob?.id) {
      setLiveTravelerSummary(null);
      setLiveTravelerError(null);
      return;
    }

    let active = true;
    setLiveTravelerError(null);
    setLiveTravelerSummary(null);

    void getTravelerSummary(selectedJob.id)
      .then((summary) => {
        if (active) {
          setLiveTravelerSummary(summary);
        }
      })
      .catch((issue) => {
        if (!active) {
          return;
        }

        if (issue instanceof ApiError && issue.status === 404) {
          setLiveTravelerSummary(null);
          setLiveTravelerError(null);
          return;
        }

        setLiveTravelerSummary(null);
        setLiveTravelerError(issue instanceof Error ? issue.message : 'Unable to load mounted traveler detail.');
      });

    return () => {
      active = false;
    };
  }, [selectedJob?.id, tab, deskReloadKey]);

  useEffect(() => {
    let active = true;

    services
      .buildJobIntakePreview(form)
      .then((preview) => {
        if (active) {
          setIntakePreview(preview);
        }
      })
      .catch(() => {
        if (active) {
          setIntakePreview(buildFallbackJobIntakePreview(form));
        }
      });

    return () => {
      active = false;
    };
  }, [form, services]);

  useEffect(() => {
    let active = true;
    void refreshHotJobs();
    const unsubscribe = services.subscribeHotJobs((nextHotJobs) => {
      if (active) {
        setHotJobs(nextHotJobs);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [services]);

  useEffect(() => {
    return services.subscribeHotJobs(() => {
      void refreshHotJobs();
    });
  }, [services]);

  useEffect(() => {
    if (rankedJobs.length === 0) {
      return;
    }

    if (!rankedJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(rankedJobs[0].id);
    }
  }, [rankedJobs, selectedJobId]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const response = await jobDashboard();
      setDashboard(response.result as unknown as JobDashboard);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  const applyMilestoneEventWindow = useCallback((jobId: string, events: MilestoneSyncEvent[], refreshTimeline: boolean) => {
    setMilestoneEvents((current) => ({
      ...current,
      [jobId]: events,
    }));
    if (refreshTimeline) {
      setMilestoneRefreshKeys((current) => ({
        ...current,
        [jobId]: (current[jobId] ?? 0) + 1,
      }));
    }
  }, []);

  const applyServerMilestoneSync = useCallback((jobId: string, prismSync?: MilestoneSyncResult | null) => {
    if (!prismSync) {
      return false;
    }

    applyMilestoneEventWindow(jobId, prismSync.recent_events, prismSync.refresh_timeline);
    return true;
  }, [applyMilestoneEventWindow]);

  useEffect(() => {
    if (tab === 'dashboard') {
      void loadDashboard();
    }
  }, [tab]);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const response = await jobCreate({
        ...form,
        quantity: parseInt(form.quantity, 10) || 100,
      });
      const resultPayload = (response.result as { id?: string; prism_sync?: MilestoneSyncResult } | undefined);
      const createdId = resultPayload?.id;
      if (createdId) {
        setSelectedJobId(createdId);
        setSummaryJobId(createdId);
        if (!applyServerMilestoneSync(createdId, resultPayload?.prism_sync)) {
          const milestoneSync = await syncMilestoneMutation({
            jobId: createdId,
            source: 'jobs-desk',
            trigger: 'job-created',
            note: `Customer ${form.customer || 'Unknown customer'} released ${form.part_number || 'a new part'} into dispatch.`,
          });
          applyMilestoneEventWindow(createdId, milestoneSync.recentEvents, milestoneSync.refreshTimeline);
        }
      }
      setTab('dashboard');
      await loadDashboard();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to create job');
      setLoading(false);
    }
  }

  async function handleStatusChange(jobId: string, status: Job['status']) {
    try {
      const response = await jobUpdateStatus({ job_id: jobId, status });
      const resultPayload = (response.result as { prism_sync?: MilestoneSyncResult } | undefined);
      if (!applyServerMilestoneSync(jobId, resultPayload?.prism_sync)) {
        const milestoneSync = await syncMilestoneMutation({
          jobId,
          source: 'jobs-desk',
          trigger: 'job-status-changed',
          status,
          note: `Dispatch board pushed ${jobId} into ${formatStatus(status)}.`,
        });
        applyMilestoneEventWindow(jobId, milestoneSync.recentEvents, milestoneSync.refreshTimeline);
      }
      await loadDashboard();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to update status');
    }
  }

  async function handleToggleHotJob(job: Job) {
    setError(null);
    try {
      if (services.isJobHot(job.id)) {
        await services.clearJobHot(job.id);
      } else {
        await services.setJobHot({
          jobId: job.id,
          partNumber: job.part_number,
          customer: job.customer,
          dueDate: job.due_date,
          note: 'Upper management flagged this job hot for shop-wide execution ordering.',
          setBy: 'Upper management',
        });
      }
      await refreshHotJobs();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Failed to update hot-job state');
    }
  }

  async function handleSummaryLookup() {
    setLoading(true);
    setError(null);
    try {
      const response = await jobSummary({ job_id: summaryJobId });
      setSummaryData(response.result);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load job summary');
    } finally {
      setLoading(false);
    }
  }

  function handlePrintPacket() {
    window.print();
  }

  return (
    <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-sky-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_46%,rgba(10,27,39,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.8fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-sky-300/16 bg-sky-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100">
              Dispatch and traveler desk
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]' : 'bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.4)]'}`} />
              {wsConnected ? 'Live updates' : 'Reconnecting'}
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Jobs</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Move from queue to traveler to follow-up without leaving the execution desk. The board now keeps job selection, shortages,
                timeline context, and linked actions in one place.
              </p>
            </div>
            {upstreamSource ? (
              <div className="rounded-[24px] border border-sky-300/18 bg-sky-300/[0.08] px-4 py-4 text-sm leading-6 text-sky-50">
                <div className="font-semibold">
                  {upstreamSourceLabel || 'Upstream workspace'} opened Jobs with context
                  {upstreamRecordLabel ? ` for ${upstreamRecordLabel}` : ''}
                  {upstreamCustomer ? ` (${upstreamCustomer})` : ''}.
                </div>
                <div className="mt-2 text-sky-100">{upstreamContextNote}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={upstreamMessagesPath}
                    className="inline-flex items-center justify-center rounded-full border border-sky-200/20 bg-sky-200/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-50 transition hover:border-sky-200/36 hover:bg-sky-200/18"
                  >
                    Open Messages follow-up
                  </Link>
                  <Link
                    to={upstreamProgramReleasePath}
                    className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:border-white/24 hover:bg-white/[0.08]"
                  >
                    Open Print to CNC
                  </Link>
                </div>
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
              <SummaryTile
                label="Selected job"
                value={selectedJob?.id ?? (summaryJobId || 'Standby')}
                hint={selectedJob ? `${selectedJob.part_number} · ${selectedDesk?.workcenter ?? 'Pending workcenter'}` : 'Choose a record to open the traveler inspector.'}
                accent="from-violet-400/22 via-violet-300/8 to-transparent"
              />
              <SummaryTile
                label="Queue posture"
                value={dashboard ? `${dashboard.total_active}` : 'Standby'}
                hint={dashboard ? `${dashboard.on_schedule} on schedule · ${dashboard.at_risk} at risk` : 'Load the dispatch board to stage active jobs.'}
                accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
              />
              <SummaryTile
                label="Hot jobs"
                value={dashboard ? `${hotJobCount}` : '0'}
                hint={hotJobCount > 0 ? 'Management escalations rise to the top of shop to-do lists and employee priorities.' : 'No shop-wide hot jobs are staged right now.'}
                accent="from-rose-400/22 via-rose-300/8 to-transparent"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow lanes</div>
            <div className="mt-4 grid gap-3">
              {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => {
                const active = key === tab;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-sky-300/24 bg-sky-300/[0.08] text-sky-50'
                        : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/14'
                    }`}
                  >
                    <div className="text-sm font-semibold">{config.label}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-300">{config.detail}</div>
                  </button>
                );
              })}
              <Link
                to={capturePath}
                className="block rounded-[22px] border border-cyan-300/20 bg-cyan-300/[0.1] px-4 py-4 text-left transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.16]"
              >
                <div className="text-sm font-semibold text-cyan-50">Capture Ops</div>
                <div className="mt-2 text-xs leading-5 text-cyan-50/80">
                  Add traveler photos, print scans, setup evidence, machine-map context, and troubleshooting media to the active job packet.
                </div>
              </Link>
              <Link
                to={orderTrackingPath}
                className="block rounded-[22px] border border-violet-300/20 bg-violet-300/[0.10] px-4 py-4 text-left transition hover:border-violet-300/32 hover:bg-violet-300/[0.16]"
              >
                <div className="text-sm font-semibold text-violet-50">Order Tracking</div>
                <div className="mt-2 text-xs leading-5 text-violet-50/80">
                  Carry the active job into work-order control, billing follow-up, and execution updates without dropping its upstream origin.
                </div>
              </Link>
            </div>

            <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
              Start on the dispatch board, select the job that needs attention, then work down the traveler, shortage, and timeline lanes
              before opening summary or creating new intake.
            </div>
          </div>
        </div>
      </section>

      {loading ? <LoadingState label="Refreshing jobs workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'dashboard' ? loadDashboard : undefined} /> : null}
      {deskError ? <ErrorState message={deskError} onRetry={() => setDeskReloadKey((current) => current + 1)} /> : null}
      {dispatchBoardError ? <ErrorState message={dispatchBoardError} onRetry={() => setDeskReloadKey((current) => current + 1)} /> : null}
      {liveTravelerError ? <ErrorState message={liveTravelerError} onRetry={() => setDeskReloadKey((current) => current + 1)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <div className="space-y-6">
          {tab === 'dashboard' ? (
            <>
              <PanelCard title="Dispatch board" subtitle="Queue-driven worklist with a selected job inspector instead of a flat admin grid.">
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => {
                    const active = statusFilter === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatusFilter(status)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                          active
                            ? 'border-sky-300/24 bg-sky-300/[0.08] text-sky-100'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:text-white'
                        }`}
                      >
                        {formatStatus(status)}
                      </button>
                    );
                  })}
                </div>

                {dashboard ? (
                  <>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <SummaryTile label="Active jobs" value={String(dashboard.total_active)} hint="Live work orders currently staged on the board." />
                      <SummaryTile label="On schedule" value={String(dashboard.on_schedule)} hint="Jobs tracking to promise without intervention." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
                      <SummaryTile label="At risk" value={String(dashboard.at_risk)} hint="Records that need dispatch or setup attention soon." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                      <SummaryTile label="Overdue" value={String(dashboard.overdue)} hint="Jobs already beyond the customer commitment." accent="from-rose-400/22 via-rose-300/8 to-transparent" />
                      <SummaryTile label="Pipeline" value={`$${(dashboard.revenue_pipeline ?? 0).toLocaleString()}`} hint="Quoted and active value tied to the dispatch board." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
                      <SummaryTile
                        label="Live queue"
                        value={String(dispatchBoard?.total_queued_jobs ?? 0)}
                        hint={
                          dispatchBoard
                            ? `${dispatchBoard.machines.length} machine queues from mounted dispatch routes.`
                            : 'Mounted dispatch routes will populate queue totals when machine assignments exist.'
                        }
                        accent="from-cyan-400/22 via-cyan-300/8 to-transparent"
                      />
                    </div>

                    <div className="mt-6 rounded-[24px] border border-white/8 bg-[#071017] px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-50">Execution order</div>
                            <div className="mt-1 text-sm text-slate-400">
                              Keep dispatch decisions obvious: what should run, what should be prepped, what can wait, and what is blocked.
                            </div>
                          </div>
                          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                            {rankedJobs.length} jobs on board
                          </div>
                        </div>

                        <SurfaceStatusNotice title="Dispatch priority status" surfaces={['jobDesk', 'hotJobs']} className="mt-4" />

                        <div className="mt-4 grid gap-3 xl:grid-cols-4">
                        {dispatchLanes.map((lane) => (
                          <div key={lane.key} data-testid={`execution-lane-${lane.key}`} className={`rounded-[22px] border px-4 py-4 ${lane.toneClass}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">{lane.label}</div>
                              <div className="rounded-full border border-white/12 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-50">
                                {lane.items.length}
                              </div>
                            </div>
                            <div className="mt-2 text-sm leading-6 opacity-90">{lane.hint}</div>

                            <div className="mt-4 space-y-2">
                              {lane.items.length > 0 ? (
                                lane.items.slice(0, 3).map((item) => {
                                  const active = selectedJob?.id === item.job.id;
                                  return (
                                    <button
                                      key={`${lane.key}-${item.job.id}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedJobId(item.job.id);
                                        setSummaryJobId(item.job.id);
                                      }}
                                      className={`w-full rounded-[18px] border px-3 py-3 text-left transition ${
                                        active
                                          ? 'border-white/24 bg-black/35'
                                          : 'border-white/12 bg-black/15 hover:border-white/22 hover:bg-black/25'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-slate-50">{item.job.part_number}</div>
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                                          {item.desk.queueSlot}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-xs text-slate-300">{item.job.id} · {item.job.customer}</div>
                                      <div className="mt-2 text-xs leading-5 text-slate-400">{item.reason}</div>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="rounded-[18px] border border-white/10 bg-black/15 px-3 py-3 text-sm leading-6 text-slate-300">
                                  {lane.emptyMessage}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)]">
                      <div className="space-y-3">
                        {deskLoading ? <LoadingState label="Syncing live dispatch desk..." /> : null}
                        {rankedJobs.length > 0 ? (
                          rankedJobs.map((job) => {
                            const active = selectedJob?.id === job.id;
                            const desk = jobDeskModels.get(job.id);
                            const priority = formatPriority(job.priority);

                            if (!desk) {
                              return (
                                <div
                                  key={job.id}
                                  data-testid={`dispatch-job-${job.id}`}
                                  className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400"
                                >
                                  Syncing dispatch record for {job.part_number}...
                                </div>
                              );
                            }

                            return (
                              <div
                                key={job.id}
                                data-testid={`dispatch-job-${job.id}`}
                                className={`rounded-[24px] border px-4 py-4 transition ${
                                  active
                                    ? 'border-sky-300/24 bg-sky-300/[0.08] shadow-[0_24px_60px_rgba(14,165,233,0.10)]'
                                    : desk.isHot
                                      ? 'border-rose-300/18 bg-rose-300/[0.06]'
                                    : 'border-white/8 bg-white/[0.03]'
                                }`}
                              >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedJobId(job.id);
                                      setSummaryJobId(job.id);
                                    }}
                                    className="flex-1 text-left"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-mono text-slate-400">{job.id}</span>
                                      {desk.isHot ? (
                                        <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100">
                                          Shop hot
                                        </span>
                                      ) : null}
                                      <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusBadgeClasses(job.status)}`}>
                                        {formatStatus(job.status)}
                                      </span>
                                      <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                                        {priority}
                                      </span>
                                    </div>
                                    <div className="mt-3 text-base font-semibold text-slate-50">{job.part_number}</div>
                                    <div className="mt-1 text-sm text-slate-400">{job.customer}</div>
                                    <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                                      <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Due date</div>
                                        <div className="mt-1 text-slate-100">{normalizeDate(job.due_date)}</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Queue slot</div>
                                        <div className="mt-1 text-slate-100">{desk.queueSlot}</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Workcenter</div>
                                        <div className="mt-1 text-slate-100">{desk.workcenter}</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Qty / hours</div>
                                        <div className="mt-1 text-slate-100">
                                          {job.quantity} pcs · {safeHours(job.estimated_hours).toFixed(1)} est hr
                                        </div>
                                      </div>
                                    </div>
                                    {desk.isHot && desk.hotNote ? (
                                      <div className="mt-4 rounded-[18px] border border-rose-300/18 bg-rose-300/[0.08] px-3 py-3 text-sm text-rose-100">
                                        {desk.hotNote}
                                      </div>
                                    ) : null}
                                    {desk.shortages.length > 0 ? (
                                      <div className="mt-4 rounded-[18px] border border-amber-300/16 bg-amber-300/[0.08] px-3 py-3 text-sm text-amber-100">
                                        {desk.shortages[0].item} · {desk.shortages[0].eta}
                                      </div>
                                    ) : (
                                      <div className="mt-4 rounded-[18px] border border-emerald-300/14 bg-emerald-300/[0.08] px-3 py-3 text-sm text-emerald-100">
                                        No open shortages. Traveler can keep moving.
                                      </div>
                                    )}
                                  </button>

                                  <div className="w-full space-y-3 lg:w-[180px]">
                                    <div>
                                      <label
                                        htmlFor={`dispatch-status-${job.id}`}
                                        className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                                      >
                                        Update status
                                      </label>
                                      <select
                                        id={`dispatch-status-${job.id}`}
                                        aria-label="Update status"
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300/32"
                                        value={job.status}
                                        onChange={(event) => {
                                          void handleStatusChange(job.id, event.target.value as Job['status']);
                                        }}
                                      >
                                        {STATUS_OPTIONS.filter((status) => status !== 'all').map((status) => (
                                          <option key={status} value={status}>
                                            {formatStatus(status)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleToggleHotJob(job);
                                      }}
                                      className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold uppercase tracking-[0.16em] transition ${
                                        desk.isHot
                                          ? 'border-rose-300/24 bg-rose-300/10 text-rose-100 hover:border-rose-300/40'
                                          : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/16 hover:text-white'
                                      }`}
                                    >
                                      {desk.isHot ? 'Clear hot' : 'Mark hot'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-slate-400">
                            No jobs matched the current filter. Try another status or open a new intake.
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[28px] border border-sky-300/14 bg-sky-300/[0.05] p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100/72">Selected job</div>
                              <div className="mt-2 text-xl font-semibold text-slate-50">{selectedJob?.part_number ?? 'Choose a job'}</div>
                              <div className="mt-1 text-sm text-slate-300">
                                {selectedJob ? `${selectedJob.customer} · ${selectedJob.id}` : 'Select a queue record to open its traveler and action lanes.'}
                              </div>
                            </div>
                            {selectedJob ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {selectedDesk?.isHot ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleToggleHotJob(selectedJob);
                                    }}
                                    className="rounded-full border border-rose-300/24 bg-rose-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100 transition hover:border-rose-300/40"
                                  >
                                    Clear shop hot
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleToggleHotJob(selectedJob);
                                    }}
                                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-white/16 hover:text-white"
                                  >
                                    Mark shop hot
                                  </button>
                                )}
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusBadgeClasses(selectedJob.status)}`}>
                                  {formatStatus(selectedJob.status)}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          {selectedJob && selectedDesk ? (
                            <>
                              {selectedHotJob ? (
                                <div className="mt-5 rounded-[22px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-4 text-sm leading-6 text-rose-100">
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-100/80">Shop-wide hot job</div>
                                  <div className="mt-2 font-semibold text-slate-50">
                                    Move this job to the front of shop worklists until management clears the hot flag.
                                  </div>
                                  <div className="mt-2">
                                    {selectedHotJob.note} Due {normalizeDate(selectedJob.due_date)}.
                                  </div>
                                </div>
                              ) : null}
                              <div className="mt-5 grid gap-3 md:grid-cols-3">
                                <SummaryTile
                                  label="Workcenter"
                                  value={selectedDesk.workcenter}
                                  hint={`${selectedDesk.owner} owns the current dispatch follow-up.`}
                                  accent="from-sky-400/22 via-sky-300/8 to-transparent"
                                />
                                <SummaryTile
                                  label="Due date"
                                  value={normalizeDate(selectedJob.due_date)}
                                  hint={`${selectedDesk.queueSlot} in the current dispatch sequence.`}
                                  accent="from-amber-300/22 via-amber-200/8 to-transparent"
                                />
                                <SummaryTile
                                  label="Actual vs est"
                                  value={`${safeHours(selectedJob.actual_hours).toFixed(1)} / ${safeHours(selectedJob.estimated_hours).toFixed(1)} hr`}
                                  hint="Keep actuals and schedule promises connected to the same job view."
                                  accent="from-violet-400/22 via-violet-300/8 to-transparent"
                                />
                              </div>

                              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                <div className="rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.06] px-4 py-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
                                        Mounted traveler route
                                      </div>
                                      <div className="mt-2 text-sm font-semibold text-slate-50">
                                        {liveTravelerSummary
                                          ? `${liveTravelerSummary.completed_steps}/${liveTravelerSummary.total_steps} complete`
                                          : 'No direct traveler record yet'}
                                      </div>
                                    </div>
                                    {liveTravelerSummary?.active_timer ? (
                                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                                        {liveTravelerSummary.active_timer.entry_type} timer live
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                                    <div>
                                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Current step</div>
                                      <div className="mt-1">
                                        {liveTravelerSummary?.current_step
                                          ? `Op ${liveTravelerSummary.current_step.step_number} · ${liveTravelerSummary.current_step.operation}`
                                          : 'The mounted traveler route has not been seeded for this job.'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Variance</div>
                                      <div className="mt-1">
                                        {liveTravelerSummary
                                          ? `Setup ${liveTravelerSummary.setup_variance_pct}% · Cycle ${liveTravelerSummary.cycle_variance_pct}%`
                                          : 'Dispatch desk fallback remains active until traveler timing exists.'}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-[24px] border border-violet-300/16 bg-violet-300/[0.06] px-4 py-4">
                                   <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-100/72">
                                        Mounted dispatch board
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-slate-50">
                                      {selectedMachineQueue
                                        ? `${selectedMachineQueue.machine_id} · ${selectedMachineQueue.total_queued} queued`
                                        : dispatchBoard && !mountedCurrentStep
                                          ? `${dispatchBoard.total_queued_jobs} queued across ${dispatchBoard.machines.length} machine queues`
                                          : dispatchBoard && !mountedMachineId
                                            ? 'Mounted traveler route does not report a machine assignment yet'
                                        : dispatchBoard
                                          ? `No mounted queue found for ${mountedMachineId}`
                                          : 'Mounted dispatch board unavailable'}
                                    </div>
                                    <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                                      <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Queue lead</div>
                                        <div className="mt-1">{queueLead(selectedMachineQueue)}</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Estimated load</div>
                                        <div className="mt-1">
                                          {selectedMachineQueue
                                            ? formatMinutes(selectedMachineQueue.total_est_min)
                                            : dispatchBoard && !mountedCurrentStep
                                              ? `${dispatchBoard.total_queued_jobs} queued across ${dispatchBoard.machines.length} machine queues`
                                              : dispatchBoard && !mountedMachineId
                                                ? 'Traveler machine routing will appear once the mounted step is assigned.'
                                            : 'Waiting for mounted machine queue data.'}
                                        </div>
                                      </div>
                                    </div>
                                </div>
                              </div>

                              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
                                <div className="space-y-4">
                                  <div className="rounded-[24px] border border-white/8 bg-[#071017] px-4 py-4">
                                    <div className="text-sm font-semibold text-slate-50">Traveler steps</div>
                                    <div className="mt-3">
                                      <TravelerLane
                                        steps={selectedDesk.traveler}
                                        emptyMessage="Traveler steps will appear here once the selected job has a release packet."
                                      />
                                    </div>
                                  </div>

                                  <div className="rounded-[24px] border border-white/8 bg-[#071017] px-4 py-4">
                                    <div className="text-sm font-semibold text-slate-50">Activity timeline</div>
                                    <div className="mt-4">
                                      <TimelineLane
                                        entries={selectedDesk.timeline}
                                        emptyMessage="Timeline events will land here when the selected job has dispatch activity."
                                      />
                                    </div>
                                  </div>

                                  <MilestoneTimelinePanel
                                    jobId={selectedJob.id}
                                    surface="jobs-desk"
                                    customer={selectedJob.customer}
                                    partNumber={selectedJob.part_number}
                                    jobStatus={selectedJob.status}
                                    dueDate={selectedJob.due_date}
                                    machine={mountedMachineId || selectedDesk.traveler[0]?.machine || selectedDesk.workcenter}
                                    queueSummary={
                                      selectedMachineQueue
                                        ? `${selectedMachineQueue.machine_id} has ${selectedMachineQueue.total_queued} queued jobs and ${formatMinutes(selectedMachineQueue.total_est_min)} of mounted load.`
                                        : dispatchBoard
                                          ? `${dispatchBoard.total_queued_jobs} queued jobs remain across ${dispatchBoard.machines.length} machine queues.`
                                          : undefined
                                    }
                                    estimatedHours={selectedJob.estimated_hours}
                                    actualHours={selectedJob.actual_hours}
                                      signals={[
                                        selectedDesk.queueSlot ? `Dispatch queue slot ${selectedDesk.queueSlot}.` : '',
                                        selectedDesk.isHot ? 'Management flagged this job hot for the shop floor.' : '',
                                      ...selectedDesk.shortages.slice(0, 2).map((shortage) => `Shortage: ${shortage.item} is ${shortage.severity} and needs ${shortage.action}.`),
                                      ...selectedDesk.approvals.slice(0, 2).map((approval) => `Approval ${approval.label} is ${approval.status}.`),
                                        liveTravelerSummary?.current_step
                                          ? `Mounted traveler is on op ${liveTravelerSummary.current_step.step_number} at ${liveTravelerSummary.current_step.machine_id}.`
                                          : 'Mounted traveler route has not been seeded yet.',
                                        selectedMachineQueue ? `Machine queue lead is ${queueLead(selectedMachineQueue)}.` : '',
                                      ]}
                                      intelligenceEvents={milestoneEvents[selectedJob.id] ?? []}
                                      refreshKey={milestoneRefreshKeys[selectedJob.id] ?? 0}
                                    />
                                  </div>

                                <div className="space-y-4">
                                  <div className="rounded-[24px] border border-white/8 bg-[#071017] px-4 py-4">
                                    <div className="text-sm font-semibold text-slate-50">Material shortages</div>
                                    <div className="mt-3">
                                      <ShortageLane
                                        shortages={selectedDesk.shortages}
                                        emptyMessage="No material or tooling shortages are staged for this job."
                                      />
                                    </div>
                                  </div>

                                  <div className="rounded-[24px] border border-white/8 bg-[#071017] px-4 py-4">
                                    <div className="text-sm font-semibold text-slate-50">Approvals and handoffs</div>
                                    <div className="mt-3">
                                      <ApprovalLane
                                        approvals={selectedDesk.approvals}
                                        emptyMessage="No approvals are currently staged for this job."
                                      />
                                    </div>
                                  </div>

                                  <div className="rounded-[24px] border border-white/8 bg-[#071017] px-4 py-4">
                                    <div className="text-sm font-semibold text-slate-50">Attachments and links</div>
                                    <div className="mt-3 space-y-3">
                                      {selectedDesk.attachments.map((attachment) => (
                                        <div key={`${attachment.label}-${attachment.type}`} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <div className="text-sm font-semibold text-slate-100">{attachment.label}</div>
                                              <div className="mt-1 text-sm text-slate-400">{attachment.type}</div>
                                            </div>
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{attachment.freshness}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="rounded-[24px] border border-white/8 bg-[#071017] px-4 py-4">
                                    <div className="text-sm font-semibold text-slate-50">Action rail</div>
                                    <div className="mt-3 space-y-3">
                                      {selectedDesk.nextActions.map((action) => (
                                        <div key={action} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                                          {action}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : selectedJob && deskLoading ? (
                            <div className="mt-5">
                              <LoadingState label="Syncing selected dispatch record..." />
                            </div>
                          ) : (
                            <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                              Select a job from the queue to stage traveler steps, shortages, and linked actions.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                    Load the dashboard to stage queue posture, traveler visibility, and exception handling.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}

          {tab === 'create' ? (
            <PanelCard title="Job intake" subtitle="Release new work into the same desk posture the dispatch board will use afterward.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</span>
                  <input
                    type="text"
                    value={form.customer}
                    onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300/32"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Part number</span>
                  <input
                    type="text"
                    value={form.part_number}
                    onChange={(event) => setForm((current) => ({ ...current, part_number: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300/32"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Description</span>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300/32"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quantity</span>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300/32"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Material</span>
                  <input
                    type="text"
                    value={form.material}
                    onChange={(event) => setForm((current) => ({ ...current, material: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300/32"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Due date</span>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300/32"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Priority</span>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300/32"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="rush">Rush</option>
                  </select>
                </label>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                    New jobs should ship with enough context for the board to place them immediately: customer, material, due date, and a
                    priority that matches the real dispatch posture.
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        void handleCreate();
                      }}
                      disabled={loading}
                      className="w-full rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                    >
                      Create Job
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_280px]">
                <div className="rounded-[26px] border border-white/8 bg-[#071017] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Traveler front sheet</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-50">{intakePacket.jobName}</div>
                      <div className="mt-2 text-sm text-slate-400">
                        {intakePacket.jobId} · {intakePacket.partNumber} · Due {intakePacket.dueDate}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
                        Qty {intakePacket.quantity}
                      </span>
                      <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-100">
                        {intakePacket.priority}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="text-sm font-semibold text-slate-50">Department checkoff</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {intakePacket.departments.map((department) => (
                          <div key={department.id} className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-100">{department.label}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{department.owner}</div>
                              </div>
                              <span className="h-5 w-5 rounded-md border border-white/12 bg-white/[0.04]" />
                            </div>
                            <div className="mt-3 text-sm leading-6 text-slate-400">{department.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="text-sm font-semibold text-slate-50">Traveler operations</div>
                      <div className="mt-3 space-y-3">
                        {intakePacket.operations.map((operation) => (
                          <div key={operation.id} className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{operation.code}</div>
                                <div className="mt-1 text-sm font-semibold text-slate-100">{operation.label}</div>
                                <div className="mt-1 text-sm text-slate-400">{operation.department}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-slate-100">{operation.quantityTarget} pcs</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                                  {operation.cycleSeconds > 0 ? `${operation.cycleSeconds}s cycle` : `${operation.estimatedMinutes} min`}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 text-sm leading-6 text-slate-300">{operation.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handlePrintPacket}
                      className="rounded-2xl bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                    >
                      Print front sheet
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintPacket}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/18 hover:bg-white/[0.05]"
                    >
                      Print sticker labels
                    </button>
                    <Link
                      to={intakeTrackerPath}
                      className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/16"
                    >
                      Open employee tracker
                    </Link>
                  </div>
                </div>

                <div className="space-y-4">
                  <QrSticker
                    payload={intakePacket.qrPayload}
                    title={intakePacket.stickerLabel}
                    subtitle={`${intakePacket.customer} · ${intakePacket.material}`}
                    caption="Scan into employee tracking or print as the traveler sticker."
                  />
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                    {intakePacket.packetNotes.map((note) => (
                      <div key={note} className="mb-3 last:mb-0">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PanelCard>
          ) : null}

          {tab === 'summary' ? (
            <PanelCard title="Job summary lookup" subtitle="Stage a single payload for review without losing the wider board context.">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <label className="block flex-1 max-w-md">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Job ID</span>
                  <input
                    type="text"
                    value={summaryJobId}
                    onChange={(event) => setSummaryJobId(event.target.value)}
                    placeholder="JOB-2026-001"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300/32"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    void handleSummaryLookup();
                  }}
                  disabled={!summaryJobId}
                  className="rounded-2xl bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  Get Summary
                </button>
              </div>

              {summaryData ? (
                <pre className="mt-5 max-h-[560px] overflow-auto rounded-[22px] border border-white/8 bg-black/20 p-4 text-xs leading-6 text-slate-200">
                  {JSON.stringify(summaryData, null, 2)}
                </pre>
              ) : (
                <div className="mt-5 rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                  Enter a job ID to stage the full payload here for review.
                </div>
              )}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Execution brief" subtitle="Keep the current job posture visible while moving across board, intake, and summary.">
            <div className="grid gap-3">
              <SummaryTile
                label="Current lane"
                value={activeTab.label}
                hint={activeTab.detail}
                accent="from-sky-400/22 via-sky-300/8 to-transparent"
              />
              <SummaryTile
                label="Selected customer"
                value={selectedJob?.customer ?? 'Standby'}
                hint={selectedJob ? `${selectedJob.part_number} · ${normalizeDate(selectedJob.due_date)}` : 'Select a queue record to keep customer and due-date posture visible.'}
                accent="from-violet-400/22 via-violet-300/8 to-transparent"
              />
              <SummaryTile
                label="Summary target"
                value={summaryJobId || 'Standby'}
                hint="The summary lane uses the entered job ID when you want one payload instead of the full board."
                accent="from-amber-300/22 via-amber-200/8 to-transparent"
              />
            </div>
          </PanelCard>

          <PanelCard title="Traveler packet + QR" subtitle="Every released job should carry a front sheet, sticker payload, and direct handoff into employee tracking.">
            {selectedPacket ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-50">{selectedPacket.jobName}</div>
                      <div className="mt-2 text-sm text-slate-400">
                        {selectedPacket.jobId} · {selectedPacket.partNumber} · Due {selectedPacket.dueDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Department gate</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">
                        {selectedPacket.departments.filter((department) => department.status === 'complete').length}/{selectedPacket.departments.length} complete
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {selectedPacket.departments.map((department) => (
                      <div key={department.id} className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{department.label}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{department.owner}</div>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                              department.status === 'complete'
                                ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                                : department.status === 'current'
                                  ? 'border-amber-300/20 bg-amber-300/10 text-amber-100'
                                  : 'border-white/10 bg-white/[0.04] text-slate-400'
                            }`}
                          >
                            {department.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handlePrintPacket}
                    className="rounded-2xl bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                  >
                      Print packet
                    </button>
                  <Link
                    to={orderTrackingPath}
                    className="rounded-2xl border border-violet-300/20 bg-violet-300/10 px-4 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/16"
                  >
                    Open Order Tracking
                  </Link>
                  <Link
                    to={selectedTrackerPath}
                    className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/16"
                  >
                    Open mobile tracker
                  </Link>
                </div>

                <QrSticker
                  payload={selectedPacket.qrPayload}
                  title={selectedPacket.stickerLabel}
                  subtitle={`${selectedPacket.customer} · Qty ${selectedPacket.quantity}`}
                  caption="Scan to register the job into department check-in and worker task timing."
                  compact
                />
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Select a job to open the packet front sheet, QR sticker, and employee tracking handoff.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Purchasing follow-up" subtitle="Linked actions from shortages and job demand should stay in the same operating shell.">
            <div className="space-y-3">
              {(selectedDesk?.purchasingActions ?? ['Select a job to stage linked shortage follow-up.']).map((action) => (
                <div key={action} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                  {action}
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Desk cues" subtitle="Operational rules the workspace is now optimized around.">
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                1. Start with the queue, then select the record that needs intervention instead of scanning isolated cards.
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                2. Use traveler, shortage, attachment, and timeline lanes together so drilldown stays connected to action.
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                3. Keep summary lookup for single-record payload review, not as a replacement for the live dispatch board.
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
