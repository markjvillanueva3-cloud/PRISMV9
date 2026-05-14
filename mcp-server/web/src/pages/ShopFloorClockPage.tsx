import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ApiError,
  getActiveJobs,
  getShiftHandoff,
  jobTimePause,
  jobTimeResume,
  jobTimeStart,
  jobTimeStop,
  listEmployees,
  shiftClockIn,
  shiftClockOut,
  whoClockedIn,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { AppwOperatorCopilot } from '../components/puoa/AppwOperatorCopilot';
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
import type { HotJobRecord, ShopFloorDepartmentCheckIn, ShopFloorTrackedTask } from '../features/operating-system/contracts';
import { normalizeTrackedDepartment, parseJobTrackingPayload, suggestedDepartment, type ParsedJobTrackingPayload } from '../utils/jobTracking';
import { buildCapturePath } from '../utils/captureRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';
import { useJobStatusSocket, type ConnectionStatus } from '../hooks/useJobStatusSocket';
import { useOfflineSync } from '../hooks/useOfflineSync';

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const color = status === 'connected' ? 'bg-emerald-400' : status === 'polling' ? 'bg-amber-400' : 'bg-red-400';
  const label = status === 'connected' ? 'Live' : status === 'polling' ? 'Polling' : 'Offline';
  return (
    <span className="relative flex items-center gap-1.5" title={label}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-xs text-slate-500">{label}</span>
    </span>
  );
}

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

function formatProcessTypeLabel(processType?: JobTimeEntry['process_type'] | ShopFloorTrackedTask['processType']) {
  if (!processType) return 'General';
  return processType.replace(/_/g, ' ');
}

function matchesTaskOperation(task: ShopFloorTrackedTask, operationValue: string) {
  const normalizedOperation = operationValue.trim().toLowerCase();
  if (!normalizedOperation) return false;
  return (
    task.operationCode.trim().toLowerCase() === normalizedOperation ||
    task.operationId.trim().toLowerCase() === normalizedOperation ||
    task.operationLabel.trim().toLowerCase() === normalizedOperation
  );
}

function extractResponsePayload<T>(response: unknown): T | null {
  if (response && typeof response === 'object') {
    const result = (response as { result?: unknown }).result;
    if (result !== undefined) return result as T;
    const data = (response as { data?: unknown }).data;
    if (data !== undefined) return data as T;
  }
  return null;
}

function normalizeShiftEntry(shift: unknown): ShiftEntry | null {
  if (!shift || typeof shift !== 'object') return null;
  const entry = shift as Record<string, unknown>;
  const rawStatus = String(entry.status ?? '').toLowerCase();
  const status =
    rawStatus === 'clocked_out' || rawStatus === 'completed'
      ? 'clocked_out'
      : rawStatus === 'on_break'
        ? 'on_break'
        : 'clocked_in';

  return {
    id: String(entry.id ?? entry.shift_id ?? ''),
    employee_id: String(entry.employee_id ?? ''),
    shift_start: String(entry.shift_start ?? entry.clock_in ?? ''),
    shift_end: entry.shift_end ? String(entry.shift_end) : entry.clock_out ? String(entry.clock_out) : undefined,
    breaks: Array.isArray(entry.breaks) ? (entry.breaks as ShiftEntry['breaks']) : [],
    status,
    total_hours: typeof entry.total_hours === 'number' ? entry.total_hours : undefined,
    overtime_hours: typeof entry.overtime_hours === 'number' ? entry.overtime_hours : undefined,
  };
}

function normalizeJobEntry(entry: unknown): JobTimeEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const raw = entry as Record<string, unknown>;
  const rawStatus = String(raw.status ?? '').toLowerCase();
  return {
    id: String(raw.id ?? ''),
    employee_id: String(raw.employee_id ?? ''),
    job_id: String(raw.job_id ?? ''),
    operation: raw.operation ? String(raw.operation) : undefined,
    process_type: raw.process_type as JobTimeEntry['process_type'],
    machine_id: raw.machine_id ? String(raw.machine_id) : undefined,
    start_time: String(raw.start_time ?? ''),
    end_time: raw.end_time ? String(raw.end_time) : undefined,
    status:
      rawStatus === 'active' || rawStatus === 'running'
        ? 'running'
        : rawStatus === 'paused'
          ? 'paused'
          : 'completed',
    elapsed_hours:
      typeof raw.elapsed_hours === 'number'
        ? raw.elapsed_hours
        : typeof raw.productive_minutes === 'number'
          ? Number(raw.productive_minutes) / 60
          : undefined,
    labor_cost: typeof raw.labor_cost === 'number' ? raw.labor_cost : undefined,
    good_parts: typeof raw.good_parts === 'number' ? raw.good_parts : undefined,
    scrap_count: typeof raw.scrap_count === 'number' ? raw.scrap_count : undefined,
    scrap_reason: raw.scrap_reason ? String(raw.scrap_reason) : undefined,
    improvement_note:
      raw.improvement_note
        ? String(raw.improvement_note)
        : raw.notes
          ? String(raw.notes)
          : undefined,
    pause_periods: Array.isArray(raw.pause_periods) ? (raw.pause_periods as JobTimeEntry['pause_periods']) : undefined,
  };
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
  const [hotJobs, setHotJobs] = useState<HotJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [wallClock, setWallClock] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hydrationRevisionRef = useRef(0);

  function markShopStateMutation() {
    hydrationRevisionRef.current += 1;
  }

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
    return services.subscribeHotJobs((records) => {
      setHotJobs(records);
    });
  }, [services]);

  useEffect(() => {
    const interval = setInterval(() => setWallClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedEmployee) {
      markShopStateMutation();
      setShiftStatus(null);
      setActiveJob(null);
      return;
    }

    let active = true;
    const hydrationRevision = hydrationRevisionRef.current;

    Promise.allSettled([
      whoClockedIn(),
      getActiveJobs(selectedEmployee),
      getShiftHandoff(selectedEmployee),
    ]).then((results) => {
      if (!active || hydrationRevision !== hydrationRevisionRef.current) return;

      const whoClockedInResult = results[0].status === 'fulfilled'
        ? extractResponsePayload<Array<Record<string, unknown>>>(results[0].value) ?? []
        : [];
      const currentShift = whoClockedInResult.find((entry) => String(entry.employee_id ?? '') === selectedEmployee);
      setShiftStatus(currentShift ? normalizeShiftEntry(currentShift) : null);

      const activeJobs = results[1].status === 'fulfilled'
        ? (extractResponsePayload<unknown[]>(results[1].value) ?? [])
            .map((entry) => normalizeJobEntry(entry))
            .filter((entry): entry is JobTimeEntry => entry !== null)
        : [];
      const currentJob =
        activeJobs.find((entry) => entry.status === 'running') ??
        activeJobs.find((entry) => entry.status !== 'completed') ??
        null;
      setActiveJob(currentJob);
      if (currentJob?.job_id) setJobId(currentJob.job_id);
      if (currentJob?.operation) setOperation(currentJob.operation);

      const handoff = results[2].status === 'fulfilled'
        ? extractResponsePayload<Record<string, unknown>>(results[2].value)
        : null;
      const handoffNotes = handoff && typeof handoff.previous_handoff_notes === 'string'
        ? handoff.previous_handoff_notes
        : '';
      if (!currentJob && handoffNotes) {
        setDepartmentMessage(`Previous shift handoff: ${handoffNotes}`);
      }
    }).catch(() => undefined);

    return () => {
      active = false;
    };
  }, [selectedEmployee]);

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
  const { connectionStatus } = useJobStatusSocket(selectedEmployee, isClockedIn);
  const { pendingCount, isSyncing } = useOfflineSync();
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
      routeContext.focus.id
        ? routeContext.focus
        : trackedJob?.jobId || jobId
        ? {
            type: 'job',
            id: trackedJob?.jobId || jobId || '',
            jobId: trackedJob?.jobId || jobId || '',
          }
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
  const selectedTrackedTask = useMemo(
    () => mobileTasks.find((task) => matchesTaskOperation(task, operation)) ?? null,
    [mobileTasks, operation],
  );
  const operationChoices = useMemo(() => {
    const choices = new Map<string, string>();
    for (const task of mobileTasks) {
      choices.set(task.operationCode, `${task.operationCode} · ${task.operationLabel}`);
    }
    if (mobileTasks.length === 0 && trackedJob?.operations?.length) {
      for (const code of trackedJob.operations) {
        choices.set(code, code);
      }
    }
    const trimmedOperation = operation.trim();
    if (trimmedOperation && !choices.has(trimmedOperation)) {
      choices.set(trimmedOperation, `Custom · ${trimmedOperation}`);
    }
    return Array.from(choices.entries()).map(([value, label]) => ({ value, label }));
  }, [mobileTasks, operation, trackedJob?.operations]);
  const quickSwitchTasks = useMemo(
    () => mobileTasks.filter((task) => task.status === 'running' || task.status === 'paused'),
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
  const trackedHotJob = trackedJob ? hotJobs.find((record) => record.jobId === trackedJob.jobId) ?? null : null;
  const launchSourceLabel = formatWorkflowSourceLabel(sourceContext);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSourceContext);
  const launchReference = useMemo(() => {
    if (routedRecordType && routedRecordId) {
      return `${routedRecordType} ${routedRecordId}`;
    }
    return routedRecordType || routedRecordId || '';
  }, [routedRecordId, routedRecordType]);

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

  async function handleShiftIn() {
    if (!selectedEmployee) return;
    markShopStateMutation();
    setLoading(true);
    setError(null);
    try {
      const response = await shiftClockIn({ employee_id: selectedEmployee });
      setShiftStatus(normalizeShiftEntry(response.result) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Clock-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleShiftOut() {
    if (!selectedEmployee) return;
    if (activeJob && activeJob.status !== 'completed') {
      setError(`Stop or complete ${activeJob.operation || operation || activeJob.job_id} before clocking out.`);
      return;
    }
    markShopStateMutation();
    setLoading(true);
    setError(null);
    try {
      const response = await shiftClockOut({
        employee_id: selectedEmployee,
        handoff_notes: activeJob?.operation ? `Last completed operation: ${activeJob.operation}` : undefined,
      });
      setShiftStatus(normalizeShiftEntry(response.result) ?? null);
      setActiveJob(null);
      setElapsed(0);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Clock-out failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobStart() {
    const selectedTask = selectedTrackedTask;
    const operationLabel = (selectedTask?.operationCode || activeJob?.operation || operation).trim();
    if (!selectedEmployee || !jobId || !operationLabel) return;
    markShopStateMutation();
    setLoading(true);
    setError(null);
    try {
      const response = await jobTimeStart({
        employee_id: selectedEmployee,
        job_id: jobId,
        operation: operationLabel,
        process_type: selectedTask?.processType,
        machine_id: selectedTask?.machineId,
      });
      const nextActiveJob = normalizeJobEntry(response.result);
      setActiveJob(nextActiveJob);
      if (nextActiveJob?.operation) {
        setOperation(nextActiveJob.operation);
      }
      if (selectedTask) {
        await syncTrackedTaskEvent(selectedTask, 'start');
      }
      setElapsed(0);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Job start failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobPause() {
    const selectedTask = selectedTrackedTask;
    const operationLabel = (selectedTask?.operationCode || activeJob?.operation || operation).trim();
    if (!selectedEmployee || !jobId || !operationLabel) return;
    markShopStateMutation();
    setLoading(true);
    setError(null);
    try {
      const response = await jobTimePause({
        employee_id: selectedEmployee,
        job_id: jobId,
        operation: operationLabel,
        reason: `Paused ${selectedTask?.operationLabel || operationLabel}`,
        reason_category: 'operator_pause',
      });
      const nextActiveJob = normalizeJobEntry(response.result);
      setActiveJob(nextActiveJob);
      if (nextActiveJob?.operation) {
        setOperation(nextActiveJob.operation);
      }
      if (selectedTask) {
        await syncTrackedTaskEvent(selectedTask, 'pause');
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Pause failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobStop() {
    const selectedTask = selectedTrackedTask;
    const operationLabel = (selectedTask?.operationCode || activeJob?.operation || operation).trim();
    if (!selectedEmployee || !jobId || !operationLabel) return;
    markShopStateMutation();
    setLoading(true);
    setError(null);
    try {
      const response = await jobTimeStop({
        employee_id: selectedEmployee,
        job_id: jobId,
        operation: operationLabel,
      });
      const nextActiveJob = normalizeJobEntry(response.result);
      setActiveJob(nextActiveJob);
      if (nextActiveJob?.operation) {
        setOperation(nextActiveJob.operation);
      }
      if (selectedTask) {
        await syncTrackedTaskEvent(selectedTask, 'complete');
      }
      setElapsed(0);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Stop failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJobResume() {
    const selectedTask = selectedTrackedTask;
    const operationLabel = (selectedTask?.operationCode || activeJob?.operation || operation).trim();
    if (!selectedEmployee || !jobId || !operationLabel) return;
    markShopStateMutation();
    setLoading(true);
    setError(null);
    try {
      const response = await jobTimeResume({
        employee_id: selectedEmployee,
        job_id: jobId,
        operation: operationLabel,
      });
      const nextActiveJob = normalizeJobEntry(response.result) ?? {
        ...(activeJob ?? {
          id: `resume-${jobId}`,
          employee_id: selectedEmployee,
          job_id: jobId,
          start_time: new Date().toISOString(),
        }),
        operation: operationLabel,
        status: 'running' as const,
      };
      setActiveJob(nextActiveJob);
      if (nextActiveJob.operation) {
        setOperation(nextActiveJob.operation);
      }
      if (selectedTask) {
        await syncTrackedTaskEvent(selectedTask, 'start');
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Resume failed');
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

      setDepartmentCheckIns(result.checkIns);
      setMobileTasks(result.tasks);
      setDepartmentMessage(result.message);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Department check-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function syncTrackedTaskEvent(task: ShopFloorTrackedTask, action: 'start' | 'pause' | 'complete') {
    const result = await services.recordTaskEvent({
      tasks: mobileTasks,
      taskId: task.id,
      action,
      nowMs: Date.now(),
      partsCompleted: task.partsCompleted,
      extraParts: task.extraParts,
    });
    setMobileTasks(result.tasks);
  }

  function updateTask(taskId: string, updater: (task: ShopFloorTrackedTask) => ShopFloorTrackedTask) {
    setMobileTasks((current) => current.map((task) => (task.id === taskId ? updater(task) : task)));
  }

  async function handleTaskStart(taskId: string) {
    const task = mobileTasks.find((entry) => entry.id === taskId);
    if (!task || !selectedEmployee || !trackedJob?.jobId) {
      setError('Select an employee and register a job before starting task punches.');
      return;
    }
    if (task.status === 'running') {
      setError(`${task.title} is already running.`);
      return;
    }
    if (task.status === 'completed') {
      setError(`${task.title} is already completed and cannot be restarted from the floor tracker.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = task.status === 'paused'
        ? await jobTimeResume({
            employee_id: selectedEmployee,
            job_id: trackedJob.jobId,
            operation: task.operationCode,
          })
        : await jobTimeStart({
            employee_id: selectedEmployee,
            job_id: trackedJob.jobId,
            operation: task.operationCode,
            process_type: task.processType,
            machine_id: task.machineId,
          });
      const nextActiveJob = normalizeJobEntry(response.result);
      if (!nextActiveJob) {
        throw new Error('Task punch could not be verified from the server response.');
      }
      setActiveJob(nextActiveJob);
      setJobId(trackedJob.jobId);
      setOperation(task.operationCode);
      await syncTrackedTaskEvent(task, 'start');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Task start failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTaskPause(taskId: string) {
    const task = mobileTasks.find((entry) => entry.id === taskId);
    if (!task || !selectedEmployee || !trackedJob?.jobId) {
      setError('Select an employee and register a job before pausing task punches.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await jobTimePause({
        employee_id: selectedEmployee,
        job_id: trackedJob.jobId,
        operation: task.operationCode,
        reason: `Paused ${task.operationLabel}`,
        reason_category: 'mobile_task_pause',
      });
      const nextActiveJob = normalizeJobEntry(response.result);
      setActiveJob(nextActiveJob);
      setOperation(task.operationCode);
      await syncTrackedTaskEvent(task, 'pause');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Task pause failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTaskStop(taskId: string) {
    const task = mobileTasks.find((entry) => entry.id === taskId);
    if (!task || !selectedEmployee || !trackedJob?.jobId) {
      setError('Select an employee and register a job before stopping task punches.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await jobTimeStop({
        employee_id: selectedEmployee,
        job_id: trackedJob.jobId,
        operation: task.operationCode,
        good_parts: task.partsCompleted,
      });
      const nextActiveJob = normalizeJobEntry(response.result);
      setActiveJob(nextActiveJob);
      setOperation(task.operationCode);
      await syncTrackedTaskEvent(task, 'complete');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Task stop failed');
    } finally {
      setLoading(false);
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
      {pendingCount > 0 && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
          {isSyncing
            ? `Syncing ${pendingCount} action${pendingCount !== 1 ? 's' : ''}...`
            : `${pendingCount} action${pendingCount !== 1 ? 's' : ''} pending sync — will auto-sync on reconnect`}
        </div>
      )}
      <WorkspaceHero
        eyebrow="Shop floor kiosk"
        title={<span className="flex items-center gap-3">Shop Floor Clock <ConnectionDot status={connectionStatus} /></span>}
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
                  markShopStateMutation();
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
                    {operationChoices.length > 0 ? (
                      <Select id="sfc-op" value={operation} onChange={(event) => setOperation(event.target.value)}>
                        <option value="">Select operation</option>
                        {operationChoices.map((choice) => (
                          <option key={choice.value} value={choice.value}>
                            {choice.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input id="sfc-op" type="text" value={operation} onChange={(event) => setOperation(event.target.value)} placeholder="OP20 finishing" />
                    )}
                  </Field>
                </div>

                {selectedTrackedTask ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Selected operation</div>
                        <div className="mt-2 text-lg font-semibold text-slate-50">{selectedTrackedTask.operationLabel}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">{selectedTrackedTask.note}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill label={selectedTrackedTask.department} tone="violet" />
                        <StatusPill label={selectedTrackedTask.operationCode} tone="sky" />
                        <StatusPill label={formatProcessTypeLabel(selectedTrackedTask.processType)} tone="amber" />
                      </div>
                    </div>
                  </div>
                ) : null}

                {quickSwitchTasks.length > 0 ? (
                  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Quick switch</div>
                    <div className="mt-3 grid gap-3">
                      {quickSwitchTasks.map((task) => (
                        <div key={`quick-${task.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{task.operationLabel}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <StatusPill label={task.operationCode} tone="sky" />
                              <StatusPill label={taskStatusLabel(task.status)} tone={taskTone(task.status)} />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <ActionButton
                              onClick={() => handleTaskStart(task.id)}
                              disabled={loading || (task.status !== 'idle' && task.status !== 'paused')}
                              tone="emerald"
                              className="min-h-[48px]"
                            >
                              {task.status === 'paused' ? 'Resume' : 'Start'}
                            </ActionButton>
                            <ActionButton
                              onClick={() => handleTaskPause(task.id)}
                              disabled={loading || task.status !== 'running'}
                              tone="amber"
                              className="min-h-[48px]"
                            >
                              Pause
                            </ActionButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[26px] border border-cyan-300/12 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_60%),rgba(3,8,13,0.72)] px-6 py-6 text-center">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Live timer</div>
                  <div className="mt-3 text-5xl font-mono font-semibold tracking-[0.12em] text-slate-50">{formatElapsed(elapsed)}</div>
                  <div className="mt-3 flex justify-center gap-2">
                    {activeJob?.job_id ? <StatusPill label={activeJob.job_id} tone="sky" /> : null}
                    {activeJob?.operation ? <StatusPill label={activeJob.operation} tone="violet" /> : null}
                    {activeJob?.status ? <StatusPill label={activeJob.status} tone={activeJob.status === 'running' ? 'emerald' : activeJob.status === 'paused' ? 'amber' : 'slate'} /> : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {(!activeJob || activeJob.status === 'completed') ? (
                    <ActionButton onClick={() => void handleJobStart()} disabled={loading || !jobId || !operation.trim()} tone="emerald" className="min-h-[72px]">
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
                      <ActionButton onClick={() => void handleJobResume()} disabled={loading || !jobId || !operation.trim()} tone="emerald" className="min-h-[72px]">
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
                    hint="Operators can bounce between running and paused operations without losing punch context."
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
                              <StatusPill label={formatProcessTypeLabel(task.processType)} tone="amber" />
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
                              <ActionButton
                                onClick={() => handleTaskStart(task.id)}
                                disabled={loading || (task.status !== 'idle' && task.status !== 'paused')}
                                tone="emerald"
                                className="min-h-[64px]"
                              >
                                {task.status === 'paused' ? 'Resume' : 'Start'}
                              </ActionButton>
                              <ActionButton
                                onClick={() => handleTaskPause(task.id)}
                                disabled={loading || task.status !== 'running'}
                                tone="amber"
                                className="min-h-[64px]"
                              >
                                Pause
                              </ActionButton>
                              <ActionButton
                                onClick={() => handleTaskStop(task.id)}
                                disabled={loading || task.status === 'idle'}
                                tone="rose"
                                className="min-h-[64px]"
                              >
                                Stop
                              </ActionButton>
                            </div>
                            <div className="mt-3 text-sm leading-6 text-slate-400">
                              Keep taps fast so workers can switch operations, pause interruptions, and resume the right task without losing labor fidelity.
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
          <AppwOperatorCopilot
            deskLabel="Shop Floor Clock"
            employeeName={selectedEmployeeRecord ? `${selectedEmployeeRecord.first_name} ${selectedEmployeeRecord.last_name}` : undefined}
            employeeRole={selectedEmployeeRecord?.role}
            jobId={trackedJob?.jobId || jobId}
            operation={selectedTrackedTask?.operationLabel || operation}
            department={selectedDepartment}
            machineId={selectedTrackedTask?.machineId || activeJob?.machine_id || routedMachine}
            continuityNote={departmentMessage}
            hotJobNote={trackedHotJob?.note ?? null}
            roiSignals={roiSignals}
            launchSourceLabel={launchSourceLabel || originSourceLabel}
            upstreamSourceLabel={upstreamSourceLabel}
            launchReference={launchReference}
            customer={routedCustomer}
            threadId={routedThreadId}
            connectionStatus={connectionStatus}
            shiftStatus={shiftStatus?.status}
            activeJobStatus={activeJob?.status}
            trackedTaskTitle={selectedTrackedTask?.title ?? selectedTrackedTask?.operationLabel ?? null}
            trackedTaskStatus={selectedTrackedTask?.status ?? null}
            trackedTaskCount={mobileTasks.length}
            runningTaskCount={mobileTasks.filter((task) => task.status === 'running').length}
            trackedLaborCost={totalTrackedCost}
            trackedPartsCompleted={totalCompletedParts}
            trackedExtras={totalExtras}
            departmentCheckInCount={departmentCheckIns.length}
            skillsLabel={skillsLabel}
            pendingSyncCount={pendingCount}
            isSyncing={isSyncing}
          />

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

            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
