import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ApiError,
  getShiftHandoff,
  jobTimePause,
  jobTimeStart,
  jobTimeStop,
  listEmployees,
  shiftClockIn,
  shiftClockOut,
  whoClockedIn,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  buildMilestoneSyncPromptMemory,
  describeMilestoneSyncEvent,
  getMilestoneSyncEvents,
  syncMilestoneMutation,
  type MilestoneSyncEvent,
} from '../components/erp/milestoneIntelligence';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
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
import type { Employee, JobTimeEntry, ShiftEntry } from '../api/types';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type {
  HotJobRecord,
  PrismShopFloorInsight,
  PrismShopFloorInsightInput,
  ShopFloorDepartmentCheckIn,
  ShopFloorTrackedTask,
} from '../features/operating-system/contracts';
import { useWebSocket } from '../hooks/useWebSocket';
import { normalizeTrackedDepartment, parseJobTrackingPayload, suggestedDepartment, type ParsedJobTrackingPayload } from '../utils/jobTracking';
import { buildCapturePath } from '../utils/captureRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function runningSeconds(task: ShopFloorTrackedTask, nowMs: number) {
  if (task.status !== 'running' || !task.startedAtMs) {
    return task.elapsedSeconds;
  }
  return task.elapsedSeconds + Math.max(Math.floor((nowMs - task.startedAtMs) / 1000), 0);
}

function taskTone(status: ShopFloorTrackedTask['status']): 'slate' | 'emerald' | 'amber' {
  if (status === 'running') return 'emerald';
  if (status === 'paused') return 'amber';
  return 'slate';
}

function taskRuntimePerPart(task: ShopFloorTrackedTask, nowMs: number) {
  const completed = Math.max(task.partsCompleted, 1);
  return Math.round(runningSeconds(task, nowMs) / completed);
}

function taskStatusLabel(status: ShopFloorTrackedTask['status']) {
  if (status === 'completed') return 'Completed';
  if (status === 'paused') return 'Paused';
  if (status === 'running') return 'Running';
  return 'Ready';
}

type LiveAttendanceEntry = {
  id: string;
  employeeName: string;
  department: string;
  status: string;
  activeJobId?: string;
  clockedInAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return '';
}

function normalizeLiveAttendance(payload: unknown): LiveAttendanceEntry[] {
  const record = asRecord(payload);
  const rawEntries =
    Array.isArray(payload)
      ? payload
      : Array.isArray(record?.employees)
        ? record.employees
        : Array.isArray(record?.clocked_in)
          ? record.clocked_in
          : Array.isArray(record?.records)
            ? record.records
            : [];

  return rawEntries.map((entry, index) => {
    const item = asRecord(entry) ?? {};
    const firstName = readString(item.first_name, item.firstName);
    const lastName = readString(item.last_name, item.lastName);
    const employeeName = readString(
      item.employee_name,
      firstName || lastName ? `${firstName} ${lastName}`.trim() : '',
    ) || `Operator ${index + 1}`;

    return {
      id: readString(item.employee_id, item.id, item.employeeId, employeeName),
      employeeName,
      department: readString(item.department, item.workcenter, item.role, 'Unknown'),
      status: readString(item.status, item.shift_status, item.shiftStatus, 'clocked_in'),
      activeJobId: readString(item.job_id, item.active_job_id, item.activeJobId),
      clockedInAt: readString(item.clocked_in_at, item.shift_start, item.clockedInAt),
    };
  });
}

function normalizeShiftHandoffSummary(payload: unknown) {
  const record = asRecord(payload);
  if (!record) {
    return '';
  }

  const summary = readString(record.summary, record.handoff_summary, record.message, record.note);
  const notes = Array.isArray(record.notes)
    ? record.notes.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  return [summary, ...notes].filter(Boolean).join(' ');
}

function intelligenceToneToPillTone(tone: PrismShopFloorInsight['tone']) {
  if (tone === 'critical') return 'rose';
  if (tone === 'watch') return 'amber';
  if (tone === 'good') return 'emerald';
  return 'slate';
}

function intelligenceToneLabel(tone: PrismShopFloorInsight['tone']) {
  if (tone === 'critical') return 'Critical';
  if (tone === 'watch') return 'Watch';
  if (tone === 'good') return 'Healthy';
  return 'Neutral';
}

function socketStateTone(state: string) {
  if (state === 'connected') return 'emerald';
  if (state === 'connecting') return 'sky';
  if (state === 'error') return 'rose';
  return 'slate';
}

function socketStateLabel(state: string) {
  if (state === 'connected') return 'Socket live';
  if (state === 'connecting') return 'Socket syncing';
  if (state === 'error') return 'Socket retrying';
  return 'Socket idle';
}

export function ShopFloorClockPage() {
  const location = useLocation();
  const services = useOperatingSystem();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || '';
  const originSource = routeContext.origin.source || '';
  const sourceContext = launcherSource || originSource || '';
  const upstreamSourceContext = originSource && originSource !== launcherSource ? originSource : '';
  const routedEmployeeId = routeParams.get('employeeId') || (routeContext.focus.type === 'employee' ? routeContext.focus.id : '');
  const routedJob = routeContext.focus.jobId || routeParams.get('job') || '';
  const routedOperation = routeParams.get('operation') ?? '';
  const routedDepartment = routeParams.get('department') ?? '';
  const routedMachine = routeParams.get('machine') ?? '';
  const routedNote = routeContext.origin.note || routeParams.get('note') || '';
  const routedRecordType = routeContext.origin.recordType || routeParams.get('recordType') || '';
  const routedRecordId = routeContext.origin.recordId || routeParams.get('recordId') || '';
  const routedCustomer = routeContext.origin.customer || routeParams.get('customer') || '';
  const routedThreadId = routeContext.origin.threadId || routeParams.get('thread') || '';
  const initialScan = useMemo(() => routeParams.get('scan') ?? '', [routeParams]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState(routedEmployeeId);
  const [shiftStatus, setShiftStatus] = useState<ShiftEntry | null>(null);
  const [activeJob, setActiveJob] = useState<JobTimeEntry | null>(null);
  const [jobId, setJobId] = useState(routedJob);
  const [operation, setOperation] = useState(routedOperation);
  const [scanInput, setScanInput] = useState(initialScan);
  const [trackedJob, setTrackedJob] = useState<ParsedJobTrackingPayload | null>(() => parseJobTrackingPayload(initialScan));
  const [selectedDepartment, setSelectedDepartment] = useState(() => normalizeTrackedDepartment(routedDepartment, routedOperation));
  const [departmentMessage, setDepartmentMessage] = useState<string | null>(null);
  const [departmentCheckIns, setDepartmentCheckIns] = useState<ShopFloorDepartmentCheckIn[]>([]);
  const [mobileTasks, setMobileTasks] = useState<ShopFloorTrackedTask[]>([]);
  const [roiSignals, setRoiSignals] = useState<string[]>([]);
  const [syncEvents, setSyncEvents] = useState<MilestoneSyncEvent[]>([]);
  const [hotJobs, setHotJobs] = useState<HotJobRecord[]>([]);
  const [liveAttendance, setLiveAttendance] = useState<LiveAttendanceEntry[]>([]);
  const [handoffSummary, setHandoffSummary] = useState('');
  const [floorSignalsError, setFloorSignalsError] = useState<string | null>(null);
  const [lastFloorSignalRefresh, setLastFloorSignalRefresh] = useState<string>('');
  const [floorInsight, setFloorInsight] = useState<PrismShopFloorInsight | null>(null);
  const [floorInsightLoading, setFloorInsightLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [wallClock, setWallClock] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    listEmployees()
      .then((response) => setEmployees((((response.result as unknown as { employees?: Employee[] })?.employees) ?? [])))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    let active = true;

    services.getHotJobs().then(setHotJobs).catch(() => setHotJobs([]));
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
    const interval = setInterval(() => setWallClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeJob?.status === 'running') {
      timerRef.current = setInterval(() => setElapsed((current) => current + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeJob?.status]);

  const isClockedIn = shiftStatus?.status === 'clocked_in' || shiftStatus?.status === 'on_break';
  const selectedEmployeeRecord = employees.find((employee) => employee.id === selectedEmployee);
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: originSource || sourceContext || 'shop-floor-clock',
            recordType: trackedJob?.jobId || routedJob ? 'Job' : '',
            recordId: trackedJob?.jobId || routedJob || '',
            customer: routedCustomer,
            note: routedNote,
            threadId: routedThreadId,
          },
    [originSource, routeContext.origin, routedCustomer, routedJob, routedNote, routedThreadId, sourceContext, trackedJob?.jobId],
  );
  const originSourceLabel = formatWorkflowSourceLabel(originSource);
  const effectiveFocus = useMemo(
    () =>
      trackedJob?.jobId || jobId || routeContext.focus.jobId
        ? {
            type: 'job',
            id: trackedJob?.jobId || jobId || routeContext.focus.jobId || '',
            jobId: trackedJob?.jobId || jobId || routeContext.focus.jobId || '',
          }
        : routeContext.focus.id
          ? routeContext.focus
          : undefined,
    [jobId, routeContext.focus, trackedJob?.jobId],
  );
  const capturePath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: launcherSource && launcherSource !== originSource ? launcherSource : 'shop-floor-clock',
        target: 'job',
        job: trackedJob?.jobId ?? jobId,
        department: selectedDepartment,
        machine: routedMachine,
        note: selectedEmployeeRecord
          ? `${routedNote ? `${routedNote} ` : ''}Capture floor evidence, setup photos, QR context, and troubleshooting media for ${selectedEmployeeRecord.first_name}'s active shop-floor work.`
          : routedNote || 'Capture floor evidence, setup photos, QR context, and troubleshooting media for the active shop-floor work.',
        origin: effectiveOrigin,
        focus: effectiveFocus,
      }),
    [effectiveFocus, effectiveOrigin, jobId, launcherSource, location.pathname, location.search, originSource, routedMachine, routedNote, selectedDepartment, selectedEmployeeRecord, trackedJob?.jobId],
  );
  const messagesPath = useMemo(
    () =>
      buildWorkflowPath('/messages', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: { source: 'shop-floor-clock' },
      }),
    [effectiveFocus, effectiveOrigin, location.search],
  );
  const skillsLabel = useMemo(
    () => (selectedEmployeeRecord?.skills ?? []).slice(0, 4).join(', '),
    [selectedEmployeeRecord],
  );
  const nowMs = wallClock.getTime();
  const regularRate = selectedEmployeeRecord?.labor_rates.regular ?? 0;
  const totalTrackedSeconds = useMemo(
    () => mobileTasks.reduce((sum, task) => sum + runningSeconds(task, nowMs), 0),
    [mobileTasks, nowMs],
  );
  const totalTrackedCost = useMemo(() => (totalTrackedSeconds / 3600) * regularRate, [regularRate, totalTrackedSeconds]);
  const totalExtras = useMemo(() => mobileTasks.reduce((sum, task) => sum + task.extraParts, 0), [mobileTasks]);
  const totalCompletedParts = useMemo(
    () => mobileTasks.reduce((sum, task) => sum + task.partsCompleted + task.extraParts, 0),
    [mobileTasks],
  );
  const runTask = useMemo(
    () => mobileTasks.find((task) => task.operationCode === 'OP20' || task.title.toLowerCase().includes('run cycle')) ?? null,
    [mobileTasks],
  );
  const actualCycleSeconds = runTask && runTask.partsCompleted > 0 ? taskRuntimePerPart(runTask, nowMs) : 0;
  const cycleVariance = runTask && runTask.cycleSeconds > 0 && actualCycleSeconds > 0
    ? ((actualCycleSeconds - runTask.cycleSeconds) / runTask.cycleSeconds) * 100
    : 0;
  const trackedSyncJobId = trackedJob?.jobId || activeJob?.job_id || jobId || '';
  const syncSignalMemory = useMemo(
    () => buildMilestoneSyncPromptMemory(syncEvents, 2),
    [syncEvents],
  );
  const composedRoiSignals = useMemo(
    () => [...roiSignals, ...syncSignalMemory],
    [roiSignals, syncSignalMemory],
  );
  const trackedHotJob = trackedJob ? hotJobs.find((record) => record.jobId === trackedJob.jobId) ?? null : null;
  const launchSourceLabel = formatWorkflowSourceLabel(sourceContext);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSourceContext);
  const launchReference = useMemo(() => {
    if (routedRecordType && routedRecordId) {
      return `${routedRecordType} ${routedRecordId}`;
    }
    return routedRecordType || routedRecordId || '';
  }, [routedRecordId, routedRecordType]);
  const websocketRooms = useMemo(
    () =>
      [
        'shop-floor',
        'erp',
        selectedDepartment ? `department:${selectedDepartment.toLowerCase().replace(/\s+/g, '-')}` : '',
        selectedEmployee ? `employee:${selectedEmployee}` : '',
        trackedJob?.jobId ? `job:${trackedJob.jobId}` : '',
      ].filter(Boolean),
    [selectedDepartment, selectedEmployee, trackedJob?.jobId],
  );

  const refreshLiveFloorSignals = useCallback(async () => {
    const [attendanceResult, handoffResult] = await Promise.allSettled([
      whoClockedIn(),
      selectedEmployee ? getShiftHandoff(selectedEmployee) : Promise.resolve({ result: null } as const),
    ]);

    let nextError: string | null = null;
    let nextAttendance: LiveAttendanceEntry[] = [];

    if (attendanceResult.status === 'fulfilled') {
      nextAttendance = normalizeLiveAttendance(attendanceResult.value.result);
    } else {
      nextError = attendanceResult.reason instanceof ApiError ? attendanceResult.reason.message : 'Live attendance refresh failed';
    }

    if (
      selectedEmployee &&
      isClockedIn &&
      selectedEmployeeRecord &&
      !nextAttendance.some((entry) => entry.id === selectedEmployee)
    ) {
      nextAttendance = [
        {
          id: selectedEmployee,
          employeeName: `${selectedEmployeeRecord.first_name} ${selectedEmployeeRecord.last_name}`,
          department: selectedDepartment || selectedEmployeeRecord.department,
          status: shiftStatus?.status ?? 'clocked_in',
          activeJobId: activeJob?.job_id || trackedJob?.jobId || jobId || undefined,
          clockedInAt: shiftStatus?.shift_start,
        },
        ...nextAttendance,
      ];
    }

    let nextHandoffSummary = '';
    if (handoffResult.status === 'fulfilled') {
      nextHandoffSummary = normalizeShiftHandoffSummary(handoffResult.value?.result);
    } else if (selectedEmployee) {
      nextError = nextError ?? (handoffResult.reason instanceof ApiError ? handoffResult.reason.message : 'Shift handoff refresh failed');
    }

    setLiveAttendance(nextAttendance);
    setHandoffSummary(nextHandoffSummary);
    setFloorSignalsError(nextError);
    setLastFloorSignalRefresh(formatClock(new Date()));
  }, [
    activeJob?.job_id,
    isClockedIn,
    jobId,
    selectedDepartment,
    selectedEmployee,
    selectedEmployeeRecord,
    shiftStatus?.shift_start,
    shiftStatus?.status,
    trackedJob?.jobId,
  ]);

  const handleFloorSocketMessage = useCallback(() => {
    void refreshLiveFloorSignals();
  }, [refreshLiveFloorSignals]);

  const { state: floorSocketState, lastMessage: floorSocketMessage } = useWebSocket({
    autoConnect: typeof WebSocket !== 'undefined' && websocketRooms.length > 0,
    rooms: websocketRooms,
    onConnect: handleFloorSocketMessage,
    onMessage: handleFloorSocketMessage,
  });

  const floorInsightInput = useMemo<PrismShopFloorInsightInput>(
    () => ({
      employeeId: selectedEmployee || undefined,
      employeeName: selectedEmployeeRecord ? `${selectedEmployeeRecord.first_name} ${selectedEmployeeRecord.last_name}` : undefined,
      department: selectedDepartment || selectedEmployeeRecord?.department,
      role: selectedEmployeeRecord?.role,
      shiftStatus: shiftStatus?.status,
      activeJobId: activeJob?.job_id,
      activeOperation: activeJob?.operation || operation || undefined,
      trackedJobId: trackedJob?.jobId || jobId || undefined,
      trackedJobName: trackedJob?.jobName,
      material: trackedJob?.material,
      liveAttendanceCount: liveAttendance.length,
      runningTaskCount: mobileTasks.filter((task) => task.status === 'running').length,
      completedParts: totalCompletedParts,
      extraParts: totalExtras,
      hotJobCount: hotJobs.length,
      cycleVariancePct: actualCycleSeconds > 0 && runTask ? cycleVariance : undefined,
      handoffSummary: handoffSummary || undefined,
      roiSignals: composedRoiSignals,
    }),
    [
      activeJob?.job_id,
      activeJob?.operation,
      actualCycleSeconds,
      cycleVariance,
      handoffSummary,
      hotJobs.length,
      jobId,
      liveAttendance.length,
      mobileTasks,
      operation,
      composedRoiSignals,
      runTask,
      selectedDepartment,
      selectedEmployee,
      selectedEmployeeRecord,
      shiftStatus?.status,
      totalCompletedParts,
      totalExtras,
      trackedJob,
    ],
  );

  const applyPrismSyncPayload = useCallback((payload?: { prism_sync?: { recent_events: MilestoneSyncEvent[] } } | null) => {
    if (payload?.prism_sync?.recent_events) {
      setSyncEvents(payload.prism_sync.recent_events);
      return true;
    }

    return false;
  }, []);

  const unwrapDataEnvelope = useCallback(<T,>(response: unknown): T | null => {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const record = response as { result?: T; data?: T };
    return record.result ?? record.data ?? null;
  }, []);

  const pushFloorSyncEvent = useCallback(async (input: {
    trigger:
      | 'shop-floor-job-registered'
      | 'shop-floor-department-check-in'
      | 'shop-floor-job-started'
      | 'shop-floor-job-paused'
      | 'shop-floor-job-stopped'
      | 'shop-floor-task-started'
      | 'shop-floor-task-paused'
      | 'shop-floor-task-completed';
    jobId?: string;
    operation?: string;
    department?: string;
    quantityCompleted?: number;
    scrapQty?: number;
    note?: string;
  }) => {
    const resolvedJobId = input.jobId || trackedSyncJobId;
    if (!resolvedJobId) {
      return;
    }

    if (input.trigger.startsWith('shop-floor-task-')) {
      const taskEvent = await services.recordTaskEvent({
        trigger: input.trigger,
        jobId: resolvedJobId,
        taskId: input.operation,
        operation: input.operation,
        department: input.department,
        quantityCompleted: input.quantityCompleted,
        scrapQty: input.scrapQty,
        note: input.note,
      }).catch(() => null);
      if (applyPrismSyncPayload(taskEvent)) {
        return;
      }
    }

    const result = await syncMilestoneMutation({
      jobId: resolvedJobId,
      source: 'shop-floor-clock',
      trigger: input.trigger,
      operation: input.operation,
      department: input.department,
      quantityCompleted: input.quantityCompleted,
      scrapQty: input.scrapQty,
      note: input.note,
    }).catch(() => null);
    if (result) {
      setSyncEvents(result.recentEvents);
    }
  }, [applyPrismSyncPayload, services, trackedSyncJobId]);

  useEffect(() => {
    let active = true;

    services
      .buildRoiSignals({
        tasks: mobileTasks,
        nowMs,
        cycleVariance,
        totalExtras,
      })
      .then((signals) => {
        if (active) {
          setRoiSignals(signals);
        }
      })
      .catch(() => {
        if (active) {
          setRoiSignals([]);
        }
      });

    return () => {
      active = false;
    };
  }, [cycleVariance, mobileTasks, nowMs, services, totalExtras]);

  useEffect(() => {
    if (!trackedSyncJobId) {
      setSyncEvents([]);
      return;
    }

    let active = true;

    getMilestoneSyncEvents(trackedSyncJobId, 6)
      .then((events) => {
        if (active) {
          setSyncEvents(events);
        }
      })
      .catch(() => {
        if (active) {
          setSyncEvents([]);
        }
      });

    return () => {
      active = false;
    };
  }, [trackedSyncJobId]);

  useEffect(() => {
    void refreshLiveFloorSignals();
  }, [refreshLiveFloorSignals]);

  useEffect(() => {
    let active = true;
    setFloorInsightLoading(true);

    services
      .analyzePrismShopFloor(floorInsightInput)
      .then((nextInsight) => {
        if (active) {
          setFloorInsight(nextInsight);
        }
      })
      .catch(() => {
        if (active) {
          setFloorInsight(null);
        }
      })
      .finally(() => {
        if (active) {
          setFloorInsightLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [floorInsightInput, services]);

  async function handleShiftIn() {
    if (!selectedEmployee) return;
    setLoading(true);
    setError(null);
    try {
      const response = await shiftClockIn({ employee_id: selectedEmployee });
      setShiftStatus(unwrapDataEnvelope<ShiftEntry>(response));
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Clock-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleShiftOut() {
    if (!selectedEmployee) return;
    setLoading(true);
    setError(null);
    try {
      const response = await shiftClockOut({ employee_id: selectedEmployee });
      setShiftStatus(unwrapDataEnvelope<ShiftEntry>(response));
      setActiveJob(null);
      setElapsed(0);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Clock-out failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobStart() {
    if (!selectedEmployee || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await jobTimeStart({
        employee_id: selectedEmployee,
        job_id: jobId,
        operation: operation || undefined,
      });
      const entry = unwrapDataEnvelope<JobTimeEntry & { prism_sync?: { recent_events: MilestoneSyncEvent[] } }>(response);
      setActiveJob(entry ?? null);
      setElapsed(0);
      if (!applyPrismSyncPayload(entry)) {
        await pushFloorSyncEvent({
          trigger: 'shop-floor-job-started',
          jobId,
          operation: operation || undefined,
          department: selectedDepartment || selectedEmployeeRecord?.department,
          note: `Started the floor timer for ${jobId}${operation ? ` on ${operation}` : ''}.`,
        });
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Job start failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobPause() {
    if (!selectedEmployee || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await jobTimePause({ employee_id: selectedEmployee, job_id: jobId });
      const entry = unwrapDataEnvelope<JobTimeEntry & { prism_sync?: { recent_events: MilestoneSyncEvent[] } }>(response);
      setActiveJob(entry ?? null);
      if (!applyPrismSyncPayload(entry)) {
        await pushFloorSyncEvent({
          trigger: 'shop-floor-job-paused',
          jobId,
          operation: activeJob?.operation || operation || undefined,
          department: selectedDepartment || selectedEmployeeRecord?.department,
          note: `Paused the floor timer for ${jobId}.`,
        });
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Pause failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobStop() {
    if (!selectedEmployee || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await jobTimeStop({ employee_id: selectedEmployee, job_id: jobId });
      const entry = unwrapDataEnvelope<JobTimeEntry & { prism_sync?: { recent_events: MilestoneSyncEvent[] } }>(response);
      setActiveJob(entry ?? null);
      setElapsed(0);
      if (!applyPrismSyncPayload(entry)) {
        await pushFloorSyncEvent({
          trigger: 'shop-floor-job-stopped',
          jobId,
          operation: activeJob?.operation || operation || undefined,
          department: selectedDepartment || selectedEmployeeRecord?.department,
          note: `Stopped the floor timer for ${jobId}.`,
        });
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Stop failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterJob() {
    setLoading(true);
    setError(null);
    try {
      const result = await services.registerJob({
        scanInput,
        jobId,
        selectedDepartment,
        employee: selectedEmployeeRecord
          ? {
              first_name: selectedEmployeeRecord.first_name,
              role: selectedEmployeeRecord.role,
              department: selectedEmployeeRecord.department,
            }
          : null,
      });

      setTrackedJob(result.trackedJob);
      setJobId(result.jobId);
      setOperation(result.operation);
      setSelectedDepartment(normalizeTrackedDepartment(result.selectedDepartment, result.operation));
      setMobileTasks(result.tasks);
      setDepartmentMessage(result.message);
      if (!applyPrismSyncPayload(result)) {
        await pushFloorSyncEvent({
          trigger: 'shop-floor-job-registered',
          jobId: result.trackedJob?.jobId ?? result.jobId,
          operation: result.operation,
          department: result.selectedDepartment,
          note: result.message,
        });
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Job registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDepartmentCheckIn() {
    if (!trackedJob || !selectedEmployeeRecord || !selectedDepartment) {
      setDepartmentMessage('Select an employee, scan a job, and confirm the department first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await services.checkIntoDepartment({
        trackedJob,
        employee: {
          id: selectedEmployeeRecord.id,
          first_name: selectedEmployeeRecord.first_name,
          last_name: selectedEmployeeRecord.last_name,
          role: selectedEmployeeRecord.role,
        },
        selectedDepartment,
        existingCheckIns: departmentCheckIns,
        existingTasks: mobileTasks,
      });

      if (result.duplicate) {
        setDepartmentMessage(result.message);
        window.alert(result.message);
        return;
      }

      if (result.entry) {
        setDepartmentCheckIns((current) => [result.entry!, ...current]);
      }
      setMobileTasks(result.tasks);
      setDepartmentMessage(result.message);
      if (!applyPrismSyncPayload(result)) {
        await pushFloorSyncEvent({
          trigger: 'shop-floor-department-check-in',
          jobId: trackedJob.jobId,
          operation: trackedJob.operations[0] || operation || undefined,
          department: selectedDepartment,
          note: result.message,
        });
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Department check-in failed');
    } finally {
      setLoading(false);
    }
  }

  function updateTask(taskId: string, updater: (task: ShopFloorTrackedTask) => ShopFloorTrackedTask) {
    setMobileTasks((current) => current.map((task) => (task.id === taskId ? updater(task) : task)));
  }

  function handleTaskStart(taskId: string) {
    const task = mobileTasks.find((item) => item.id === taskId);
    updateTask(taskId, (task) => ({
      ...task,
      status: 'running',
      startedAtMs: Date.now(),
    }));
    if (task) {
      void pushFloorSyncEvent({
        trigger: 'shop-floor-task-started',
        jobId: trackedSyncJobId || undefined,
        operation: task.title,
        department: task.department,
        note: `Started the ${task.title.toLowerCase()} task on the floor tracker.`,
      }).catch(() => undefined);
    }
  }

  function handleTaskPause(taskId: string) {
    const task = mobileTasks.find((item) => item.id === taskId);
    const now = Date.now();
    updateTask(taskId, (task) => ({
      ...task,
      status: 'paused',
      elapsedSeconds: runningSeconds(task, now),
      startedAtMs: undefined,
    }));
    if (task) {
      void pushFloorSyncEvent({
        trigger: 'shop-floor-task-paused',
        jobId: trackedSyncJobId || undefined,
        operation: task.title,
        department: task.department,
        note: `Paused the ${task.title.toLowerCase()} task on the floor tracker.`,
      }).catch(() => undefined);
    }
  }

  function handleTaskStop(taskId: string) {
    const task = mobileTasks.find((item) => item.id === taskId);
    const now = Date.now();
    updateTask(taskId, (task) => ({
      ...task,
      status: 'completed',
      elapsedSeconds: runningSeconds(task, now),
      startedAtMs: undefined,
    }));
    if (task) {
      void pushFloorSyncEvent({
        trigger: 'shop-floor-task-completed',
        jobId: trackedSyncJobId || undefined,
        operation: task.title,
        department: task.department,
        quantityCompleted: task.partsCompleted + task.extraParts,
        scrapQty: task.extraParts,
        note: `Completed the ${task.title.toLowerCase()} task on the floor tracker.`,
      }).catch(() => undefined);
    }
  }

  function handleTaskNumber(taskId: string, field: 'partsCompleted' | 'extraParts', value: string) {
    const parsed = Math.max(parseInt(value, 10) || 0, 0);
    updateTask(taskId, (task) => ({
      ...task,
      [field]: parsed,
    }));
  }

  useEffect(() => {
    setScanInput(initialScan);
    const parsed = parseJobTrackingPayload(initialScan);
    setTrackedJob(parsed);
    if (parsed?.jobId) {
      setJobId(parsed.jobId);
      setOperation(parsed.operations[0] ?? routedOperation);
    } else {
      setJobId(routedJob);
      setOperation(routedOperation);
    }
  }, [initialScan, routedJob, routedOperation]);

  useEffect(() => {
    const nextDepartment = normalizeTrackedDepartment(routedDepartment, routedOperation);
    if (nextDepartment) {
      setSelectedDepartment(nextDepartment);
    }
  }, [routedDepartment, routedOperation]);

  useEffect(() => {
    if (selectedEmployeeRecord && !selectedDepartment) {
      setSelectedDepartment(suggestedDepartment(selectedEmployeeRecord));
    }
  }, [selectedDepartment, selectedEmployeeRecord]);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Shop floor kiosk"
        title="Shop Floor Clock"
        description="Give operators a live kiosk for shift clocking, QR job registration, department check-in, and fast multi-task timing without jumping through menus."
        metrics={
          <>
            <SummaryTile label="Current time" value={formatClock(wallClock)} hint="Live kiosk clock for shift and job activity." />
            <SummaryTile label="Tracked tasks" value={String(mobileTasks.filter((task) => task.status === 'running').length)} hint="Parallel tasks currently running for the selected worker." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
            <SummaryTile label="Tracked labor" value={`$${totalTrackedCost.toFixed(2)}`} hint="Live labor value captured for analytics, quoting, and ROI review." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
          </>
        }
        aside={
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Operator selection</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Select the operator using the kiosk, then scan a traveler QR or enter a job manually to activate department check-in and fast task tracking.
              </div>
            </div>
            {launchSourceLabel || routedMachine || routedOperation || routedNote || launchReference || routedCustomer || routedThreadId ? (
              <div className="rounded-[22px] border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-4 text-sm leading-6 text-emerald-50">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Launch context</div>
                <div className="mt-2">
                  {launchSourceLabel ? (
                    <>
                      Context loaded from <span className="font-semibold">{launchSourceLabel}</span>.
                    </>
                  ) : (
                    <>External workflow context loaded.</>
                  )}{' '}
                  {upstreamSourceLabel ? <>Upstream commercial origin: <span className="font-semibold">{upstreamSourceLabel}</span>. </> : null}
                  {!launchSourceLabel && originSourceLabel ? (
                    <>Commercial origin preserved from <span className="font-semibold">{originSourceLabel}</span>. </>
                  ) : null}
                  {launchReference ? <>Record: <span className="font-semibold">{launchReference}</span>. </> : null}
                  {routedCustomer ? <>Customer: <span className="font-semibold">{routedCustomer}</span>. </> : null}
                  {routedThreadId ? <>Thread: <span className="font-semibold">{routedThreadId}</span>. </> : null}
                  {routedMachine ? <>Machine target: <span className="font-semibold">{routedMachine}</span>. </> : null}
                  {routedOperation ? <>Seeded operation: <span className="font-semibold">{routedOperation}</span>. </> : null}
                  {routedNote || 'Carry actuals and prove-out notes forward instead of reopening the floor desk cold.'}
                </div>
              </div>
            ) : null}
            <Link
              to={capturePath}
              className="block rounded-[22px] border border-cyan-300/20 bg-cyan-300/[0.1] px-4 py-4 text-sm leading-6 text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.16]"
            >
              <div className="font-semibold">Open Capture Ops</div>
              <div className="mt-2 text-cyan-50/80">
                Use the camera, mic, and QR tools for setup photos, machine mapping, traveler scans, and troubleshooting evidence without leaving the floor workflow.
              </div>
            </Link>
            <Link
              to={messagesPath}
              className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.1] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
            >
              <div className="font-semibold">Open Messages follow-up</div>
              <div className="mt-2 text-sky-50/80">
                Carry the active floor record, operator context, and upstream commercial origin into the inbox when work needs clarification, escalation, or customer-facing follow-up.
              </div>
            </Link>
            <Field label="Select Employee">
              <Select
                id="sfc-employee"
                value={selectedEmployee}
                onChange={(event) => {
                  setSelectedEmployee(event.target.value);
                  setShiftStatus(null);
                  setActiveJob(null);
                  setElapsed(0);
                  setDepartmentCheckIns([]);
                  setDepartmentMessage(null);
                  setMobileTasks([]);
                }}
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name} — {employee.department}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        }
      />

      {loading ? <LoadingState label="Processing kiosk action..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="space-y-6">
          <PanelCard title="Shift command pad" subtitle="Large actions stay exposed for touch-first use on the floor.">
            {selectedEmployee ? (
              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-50">
                        {selectedEmployeeRecord?.first_name} {selectedEmployeeRecord?.last_name}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedEmployeeRecord?.department ? <StatusPill label={selectedEmployeeRecord.department} tone="violet" /> : null}
                        {selectedEmployeeRecord?.role ? <StatusPill label={selectedEmployeeRecord.role} tone="sky" /> : null}
                        <StatusPill label={isClockedIn ? 'Clocked in' : 'Clocked out'} tone={isClockedIn ? 'emerald' : 'slate'} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Shift status</div>
                      <div className="mt-2 text-lg font-semibold text-slate-100">{shiftStatus?.status ?? 'idle'}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {!isClockedIn ? (
                    <ActionButton onClick={() => void handleShiftIn()} disabled={loading} tone="emerald" className="min-h-[88px] text-lg">
                      CLOCK IN
                    </ActionButton>
                  ) : (
                    <ActionButton onClick={() => void handleShiftOut()} disabled={loading} tone="rose" className="min-h-[88px] text-lg">
                      CLOCK OUT
                    </ActionButton>
                  )}
                  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Shift hours</div>
                    <div className="mt-2 text-3xl font-mono text-slate-100">
                      {shiftStatus?.total_hours != null ? `${shiftStatus.total_hours.toFixed(2)}h` : '0.00h'}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">Updates after clock-out completes the shift record.</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Pick an operator first to activate kiosk controls.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Job Timer" subtitle="Attach labor to the live job so clock time and production time stay aligned.">
            {isClockedIn ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Job ID">
                    <Input id="sfc-job" type="text" value={jobId} onChange={(event) => setJobId(event.target.value)} placeholder="JOB-2026-001" />
                  </Field>
                  <Field label="Operation">
                    <Input id="sfc-op" type="text" value={operation} onChange={(event) => setOperation(event.target.value)} placeholder="OP20 finishing" />
                  </Field>
                </div>

                <div className="rounded-[26px] border border-cyan-300/12 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_60%),rgba(3,8,13,0.72)] px-6 py-6 text-center">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Live timer</div>
                  <div className="mt-3 text-5xl font-mono font-semibold tracking-[0.12em] text-slate-50">{formatElapsed(elapsed)}</div>
                  <div className="mt-3 flex justify-center gap-2">
                    {activeJob?.job_id ? <StatusPill label={activeJob.job_id} tone="sky" /> : null}
                    {activeJob?.status ? <StatusPill label={activeJob.status} tone={activeJob.status === 'running' ? 'emerald' : activeJob.status === 'paused' ? 'amber' : 'slate'} /> : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {(!activeJob || activeJob.status === 'completed') ? (
                    <ActionButton onClick={() => void handleJobStart()} disabled={loading || !jobId} tone="emerald" className="min-h-[72px]">
                      Start
                    </ActionButton>
                  ) : null}
                  {activeJob?.status === 'running' ? (
                    <>
                      <ActionButton onClick={() => void handleJobPause()} disabled={loading} tone="amber" className="min-h-[72px]">
                        Pause
                      </ActionButton>
                      <ActionButton onClick={() => void handleJobStop()} disabled={loading} tone="rose" className="min-h-[72px]">
                        Stop
                      </ActionButton>
                    </>
                  ) : null}
                  {activeJob?.status === 'paused' ? (
                    <>
                      <ActionButton onClick={() => void handleJobStart()} disabled={loading || !jobId} tone="emerald" className="min-h-[72px]">
                        Resume
                      </ActionButton>
                      <ActionButton onClick={() => void handleJobStop()} disabled={loading} tone="rose" className="min-h-[72px]">
                        Stop
                      </ActionButton>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Clock the selected employee into their shift first, then the job timer becomes active.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Traveler scan + department gate" subtitle="Register the packet, auto-suggest the worker department, and stop duplicate check-ins before they hit the floor.">
            <div className="space-y-4">
              <Field label="Traveler QR or job number">
                <Input
                  id="sfc-scan"
                  type="text"
                  value={scanInput}
                  onChange={(event) => setScanInput(event.target.value)}
                  placeholder="Scan PRISM traveler QR or enter JOB-2026-001"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <Field label="Department">
                  <Select id="sfc-department" value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)}>
                    <option value="">Select department</option>
                    <option value="Intake">Intake</option>
                    <option value="CAD work">CAD work</option>
                    <option value="CAM programming">CAM programming</option>
                    <option value="Job setup">Job setup</option>
                    <option value="Run cycle">Run cycle</option>
                    <option value="Quality">Quality</option>
                    <option value="Shipping">Shipping</option>
                  </Select>
                </Field>

                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Auto-suggested</div>
                  <div className="mt-2 text-lg font-semibold text-slate-100">{selectedDepartment || 'Waiting on employee selection'}</div>
                  <div className="mt-2 text-sm text-slate-400">
                    Pulled from the selected operator profile so phone check-in stays fast.
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ActionButton onClick={handleRegisterJob} disabled={!scanInput && !jobId} tone="cyan" className="min-h-[72px]">
                  Register job
                </ActionButton>
                <ActionButton
                  onClick={handleDepartmentCheckIn}
                  disabled={!trackedJob || !selectedDepartment || !selectedEmployee}
                  tone="amber"
                  className="min-h-[72px]"
                >
                  Check into department
                </ActionButton>
              </div>

              {departmentMessage ? (
                <div className="rounded-[22px] border border-cyan-300/16 bg-cyan-300/10 px-4 py-4 text-sm leading-6 text-cyan-50">
                  {departmentMessage}
                </div>
              ) : null}

              {trackedJob ? (
                <div className="rounded-[26px] border border-white/8 bg-[#071017] p-5">
                  {trackedHotJob ? (
                    <div className="mb-4 rounded-[20px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-4 text-sm leading-6 text-rose-100">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-100/80">Shop-wide hot job</div>
                      <div className="mt-2 font-semibold text-slate-50">Run this packet ahead of normal due-date order until management clears the hot flag.</div>
                      <div className="mt-2">{trackedHotJob.note}</div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Registered packet</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-50">{trackedJob.jobName}</div>
                      <div className="mt-2 text-sm text-slate-400">
                        {trackedJob.jobId} · {trackedJob.partNumber} · Due {trackedJob.dueDate}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trackedHotJob ? <StatusPill label="Shop hot" tone="rose" /> : null}
                      <StatusPill label={trackedJob.customer} tone="sky" />
                      <StatusPill label={`Qty ${trackedJob.quantity || 0}`} tone="violet" />
                      <StatusPill label={trackedJob.priority} tone="amber" />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="text-sm font-semibold text-slate-50">Department route</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(trackedJob.departments.length > 0 ? trackedJob.departments : ['intake', 'cad', 'cam', 'setup', 'run', 'qc', 'shipping']).map((department) => {
                          const normalized = department.replace(/-/g, ' ');
                          const active = normalized.toLowerCase() === selectedDepartment.toLowerCase();
                          return (
                            <span
                              key={department}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                                active
                                  ? 'border-amber-300/20 bg-amber-300/10 text-amber-100'
                                  : 'border-white/10 bg-white/[0.04] text-slate-300'
                              }`}
                            >
                              {normalized}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="text-sm font-semibold text-slate-50">Operation seed</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(trackedJob.operations.length > 0 ? trackedJob.operations : ['CAD', 'CAM', 'OP10', 'OP20', 'OP30', 'OP40']).map((op) => (
                          <span key={op} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                            {op}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                  Scan a printed QR sticker or paste a job number here to seed the traveler packet, department handoff, and task list.
                </div>
              )}
            </div>
          </PanelCard>

          <PanelCard title="Mobile task board" subtitle="Workers can run fast start, pause, and stop actions across multiple assigned tasks without losing quantity, extras, or cycle feedback.">
            {trackedJob && mobileTasks.length > 0 ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <SummaryTile
                    label="Registered job"
                    value={trackedJob.jobId}
                    hint={`${trackedJob.partNumber} · ${trackedJob.customer}`}
                    accent="from-sky-400/22 via-sky-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="Running tasks"
                    value={String(mobileTasks.filter((task) => task.status === 'running').length)}
                    hint="Multiple tasks can stay live at once for cell-side work."
                    accent="from-emerald-400/22 via-emerald-300/10 to-transparent"
                  />
                  <SummaryTile
                    label="Parts logged"
                    value={String(totalCompletedParts)}
                    hint={`${totalExtras} extras captured beyond the job target for inventory signal.`}
                    accent="from-violet-400/22 via-violet-300/10 to-transparent"
                  />
                </div>

                <div className="grid gap-4">
                  {mobileTasks.map((task) => {
                    const elapsedSeconds = runningSeconds(task, nowMs);
                    const estimatedLabor = (elapsedSeconds / 3600) * regularRate;
                    const actualPerPart = task.partsCompleted > 0 ? taskRuntimePerPart(task, nowMs) : 0;

                    return (
                      <div key={task.id} data-testid={`mobile-task-${task.id}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-semibold text-slate-50">{task.title}</div>
                              <StatusPill label={taskStatusLabel(task.status)} tone={taskTone(task.status)} />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <StatusPill label={task.department} tone="violet" />
                              <StatusPill label={task.operationCode} tone="sky" />
                            </div>
                            <div className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{task.note}</div>
                          </div>

                          <div className="grid gap-2 text-right">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Elapsed</div>
                              <div className="mt-1 text-2xl font-mono font-semibold text-slate-100">{formatElapsed(elapsedSeconds)}</div>
                            </div>
                            <div className="text-sm text-slate-400">
                              {task.cycleSeconds > 0 ? `Std cycle ${task.cycleSeconds}s` : `Seeded ${task.quantityTarget} pcs`}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                          <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Production capture</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <Field label="Target">
                                <Input value={String(task.quantityTarget)} readOnly />
                              </Field>
                              <Field label="Completed">
                                <Input
                                  type="number"
                                  value={String(task.partsCompleted)}
                                  onChange={(event) => handleTaskNumber(task.id, 'partsCompleted', event.target.value)}
                                />
                              </Field>
                              <Field label="Extras">
                                <Input
                                  type="number"
                                  value={String(task.extraParts)}
                                  onChange={(event) => handleTaskNumber(task.id, 'extraParts', event.target.value)}
                                />
                              </Field>
                              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Per part</div>
                                <div className="mt-2 text-lg font-semibold text-slate-100">
                                  {actualPerPart > 0 ? `${actualPerPart}s` : 'Waiting on parts'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Fast controls</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                              <ActionButton onClick={() => handleTaskStart(task.id)} tone="emerald" className="min-h-[64px]">
                                Start
                              </ActionButton>
                              <ActionButton
                                onClick={() => handleTaskPause(task.id)}
                                disabled={task.status !== 'running'}
                                tone="amber"
                                className="min-h-[64px]"
                              >
                                Pause
                              </ActionButton>
                              <ActionButton
                                onClick={() => handleTaskStop(task.id)}
                                disabled={task.status === 'idle'}
                                tone="rose"
                                className="min-h-[64px]"
                              >
                                Stop
                              </ActionButton>
                            </div>
                            <div className="mt-3 text-sm leading-6 text-slate-400">
                              Keep taps fast so workers can bounce between setup, runtime, inspection, and support work without losing fidelity.
                            </div>
                          </div>

                          <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Cost + quote signal</div>
                            <div className="mt-3 space-y-3 text-sm text-slate-300">
                              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Estimated labor</div>
                                <div className="mt-2 text-lg font-semibold text-slate-100">${estimatedLabor.toFixed(2)}</div>
                              </div>
                              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Actual vs standard</div>
                                <div className="mt-2 text-lg font-semibold text-slate-100">
                                  {task.cycleSeconds > 0 && actualPerPart > 0 ? `${actualPerPart - task.cycleSeconds >= 0 ? '+' : ''}${actualPerPart - task.cycleSeconds}s` : 'Waiting on cycle data'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Register a job packet to seed task cards for CAD, CAM, setup, run cycle, inspection, or shipping. Task templates adapt to the selected worker department.
              </div>
            )}
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="Shop hot queue" subtitle="Management escalations should be obvious at the floor so operators know what rises above normal due-date order.">
            <SurfaceStatusNotice title="Shop-floor priority status" surfaces={['shopFloor', 'hotJobs']} className="mb-4" />
            {hotJobs.length > 0 ? (
              <div className="space-y-3">
                {hotJobs.map((hotJob) => (
                  <div key={hotJob.jobId} className="rounded-[22px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-50">{hotJob.partNumber}</div>
                        <div className="mt-1 text-sm text-slate-300">
                          {hotJob.jobId} · {hotJob.customer}
                        </div>
                      </div>
                      <StatusPill label={hotJob.dueDate === 'Unscheduled' ? 'Hot' : `Due ${hotJob.dueDate}`} tone="rose" />
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-300">{hotJob.note}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                No shop-wide hot jobs are staged right now. Normal due-date ordering remains in effect.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Live floor state" subtitle="Attendance, shift handoff, and realtime socket posture stay visible so the kiosk can reason from live conditions instead of stale assumptions.">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusPill label={socketStateLabel(floorSocketState)} tone={socketStateTone(floorSocketState)} />
                <StatusPill label={`${liveAttendance.length} operators live`} tone="sky" />
                {lastFloorSignalRefresh ? <StatusPill label={`Refreshed ${lastFloorSignalRefresh}`} tone="slate" /> : null}
                {floorSocketMessage?.type ? <StatusPill label={`Last event ${floorSocketMessage.type}`} tone="violet" /> : null}
              </div>

              {floorSignalsError ? (
                <div className="rounded-[22px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-4 text-sm leading-6 text-rose-100">
                  {floorSignalsError}
                </div>
              ) : null}

              {liveAttendance.length > 0 ? (
                <div className="space-y-3">
                  {liveAttendance.map((entry) => {
                    const isSelectedOperator = entry.id === selectedEmployee;
                    return (
                      <div key={entry.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-slate-50">{entry.employeeName}</div>
                              {isSelectedOperator ? <StatusPill label="Selected" tone="amber" /> : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <StatusPill label={entry.department || 'Unknown'} tone="violet" />
                              <StatusPill label={entry.status.replace(/_/g, ' ')} tone={entry.status.includes('break') ? 'amber' : 'emerald'} />
                              {entry.activeJobId ? <StatusPill label={entry.activeJobId} tone="sky" /> : null}
                            </div>
                          </div>
                          <div className="text-right text-sm text-slate-400">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Clock-in signal</div>
                            <div className="mt-2 font-medium text-slate-200">{entry.clockedInAt || 'Live now'}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                  No live attendance signal is available yet. The kiosk will seed the selected operator locally when shift activity begins.
                </div>
              )}

              <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.06] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/70">Shift handoff summary</div>
                <div className="mt-3 text-sm leading-6 text-slate-200">
                  {handoffSummary || 'No prior-shift handoff note is active for this operator yet.'}
                </div>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="PRISM floor copilot" subtitle="Deep reasoning inside the app turns labor, hot-job, and handoff signals into a concrete next move instead of leaving the operator with raw telemetry.">
            <SurfaceStatusNotice title="Floor intelligence status" surfaces={['shopFloor', 'intelligence']} className="mb-4" />
            <div className="space-y-4">
              {floorInsight ? (
                <>
                  <div className="rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_58%),rgba(4,10,16,0.88)] px-5 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-2xl">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/75">Deep reasoning snapshot</div>
                        <div className="mt-3 text-xl font-semibold text-slate-50">{floorInsight.headline}</div>
                        <div className="mt-3 text-sm leading-6 text-slate-300">{floorInsight.reasoningSummary}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill label={intelligenceToneLabel(floorInsight.tone)} tone={intelligenceToneToPillTone(floorInsight.tone)} />
                        <StatusPill label={`${Math.round(floorInsight.confidence * 100)}% confidence`} tone="sky" />
                        <StatusPill label={floorInsight.aiIntent.intent.replace(/_/g, ' ')} tone="violet" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {floorInsight.liveSignals.map((signal) => (
                      <div key={signal} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                        {signal}
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-[22px] border border-amber-300/14 bg-amber-300/[0.06] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/75">Risk flags</div>
                      <div className="mt-3 space-y-3">
                        {floorInsight.riskFlags.length > 0 ? (
                          floorInsight.riskFlags.map((flag) => (
                            <div key={flag} className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3 text-sm leading-6 text-slate-200">
                              {flag}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3 text-sm leading-6 text-slate-300">
                            No elevated execution flags are active right now.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-cyan-300/14 bg-cyan-300/[0.06] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/75">Suggested next route</div>
                      <div className="mt-3 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                        <div className="text-lg font-semibold text-slate-50">{floorInsight.suggestedSurface.label}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{floorInsight.suggestedSurface.actionLabel}</div>
                        <Link
                          to={floorInsight.suggestedSurface.route}
                          className="mt-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[0.1] px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.16]"
                        >
                          Open {floorInsight.suggestedSurface.label}
                        </Link>
                        <div className="mt-4 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3 text-xs leading-6 text-slate-300">
                          CLI route: <span className="font-mono text-slate-100">{floorInsight.suggestedSurface.cliCommand}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">PRISM sync memory</div>
                      {trackedSyncJobId ? <StatusPill label={trackedSyncJobId} tone="sky" /> : null}
                    </div>
                    <div className="mt-3 space-y-3">
                      {syncEvents.length > 0 ? (
                        syncEvents.slice(0, 3).map((event) => (
                          <div key={event.id} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
                            <div className="text-sm font-semibold text-slate-100">{describeMilestoneSyncEvent(event)}</div>
                            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{event.timestamp}</div>
                            <div className="mt-3 rounded-[16px] border border-white/8 bg-black/15 px-3 py-3 text-xs leading-6 text-slate-300">
                              CLI route: <span className="font-mono text-slate-100">{event.cli_command}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-400">
                          No canonical floor sync events are loaded yet. Register a packet, check into a department, or move a task to seed shared PRISM memory.
                        </div>
                      )}
                    </div>
                  </div>

                  {floorInsight.apprentice ? (
                    <div className="rounded-[22px] border border-violet-300/14 bg-violet-300/[0.06] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100/75">Why PRISM thinks this</div>
                      <div className="mt-3 text-sm leading-6 text-slate-200">{floorInsight.apprentice.explanation}</div>
                      {floorInsight.apprentice.factors.length > 0 ? (
                        <div className="mt-3 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-300">
                          <div className="font-semibold text-slate-100">{floorInsight.apprentice.factors[0]?.factor}</div>
                          <div className="mt-2">{floorInsight.apprentice.factors[0]?.impact}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Deep-learning matches</div>
                      <div className="mt-3 space-y-3">
                        {floorInsight.modelMatches.slice(0, 2).map((model) => (
                          <div key={model.id} className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                            <div className="text-sm font-semibold text-slate-100">{model.name}</div>
                            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-cyan-100/75">{model.domain}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-300">{model.why}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reasoning agents</div>
                      <div className="mt-3 space-y-3">
                        {floorInsight.agentCandidates.slice(0, 2).map((agent) => (
                          <div key={agent.id} className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                            <div className="text-sm font-semibold text-slate-100">{agent.name}</div>
                            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-amber-100/75">{agent.category.replace(/_/g, ' ')}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-300">{agent.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Next actions</div>
                    <div className="mt-3 space-y-3">
                      {floorInsight.nextActions.map((action) => (
                        <div key={action} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300">
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                  PRISM is waiting on enough floor context to produce a routed recommendation.
                </div>
              )}

              {floorInsightLoading ? (
                <div className="rounded-[18px] border border-sky-300/16 bg-sky-300/[0.08] px-4 py-3 text-sm leading-6 text-sky-50">
                  Refreshing the deep-reasoning pass from the latest floor signals.
                </div>
              ) : null}
            </div>
          </PanelCard>

          <PanelCard title="Operator brief" subtitle="Keep the current machine-side staffing context visible while operators clock and swap jobs.">
            {selectedEmployeeRecord ? (
              <div className="space-y-3">
                <SummaryTile label="Department" value={selectedEmployeeRecord.department} hint="Home department for the selected operator." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
                <SummaryTile label="Role" value={selectedEmployeeRecord.role} hint="Useful when a kiosk serves setup, machining, and QC roles." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
                <SummaryTile label="Skills" value={skillsLabel || 'None'} hint="Quick glance at skill tags already on file." accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Select an operator to populate the right-hand context lane.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Department scan log" subtitle="Anyone can check the packet into a department, but the app should make duplicate scans obvious immediately.">
            {departmentCheckIns.length > 0 ? (
              <div className="space-y-3">
                {departmentCheckIns.map((entry) => (
                  <div key={entry.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{entry.jobId}</div>
                        <div className="mt-2 text-sm text-slate-400">
                          {entry.department} checked in by {entry.employeeName}
                        </div>
                      </div>
                      <StatusPill label={entry.scannedAt} tone="amber" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                No department scans yet. The first valid check-in will show up here with who scanned it and when.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Analytics lane" subtitle="Surface labor, cycle, and extra-piece signal early so quoting, staffing, and capital decisions improve from every run.">
            <div className="space-y-4">
              <div className="grid gap-3">
                <SummaryTile
                  label="Tracked labor"
                  value={`$${totalTrackedCost.toFixed(2)}`}
                  hint="Live labor estimate from the selected worker's regular rate."
                  accent="from-emerald-400/22 via-emerald-300/10 to-transparent"
                />
                <SummaryTile
                  label="Cycle variance"
                  value={actualCycleSeconds > 0 && runTask ? `${cycleVariance >= 0 ? '+' : ''}${cycleVariance.toFixed(0)}%` : 'Pending'}
                  hint={runTask ? `Run-cycle standard ${runTask.cycleSeconds}s vs actual ${actualCycleSeconds || 0}s.` : 'Register a production packet to compare quoted and actual cycle behavior.'}
                  accent="from-amber-300/22 via-amber-200/10 to-transparent"
                />
                <SummaryTile
                  label="Output logged"
                  value={`${totalCompletedParts}`}
                  hint={`${totalExtras} extra pieces captured for inventory and lot-size analysis.`}
                  accent="from-violet-400/22 via-violet-300/10 to-transparent"
                />
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-slate-50">ROI + quote feedback</div>
                <div className="mt-3 space-y-3">
                  {roiSignals.map((signal) => (
                    <div key={signal} className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-300">
                      {signal}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-dashed border-cyan-300/18 bg-cyan-300/[0.04] px-4 py-4 text-sm leading-6 text-slate-300">
                Backend contract follow-up: persist traveler scans, department duplicate guards, concurrent task timers, quantity actuals, labor rollups,
                and quote-variance analytics so this screen stops being local-only state and becomes a business-wide intelligence surface.
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
