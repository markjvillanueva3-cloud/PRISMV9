import type { Employee } from '../../api/types';
import { buildMobileTaskTemplates, parseJobTrackingPayload, suggestedDepartment } from '../../utils/jobTracking';
import type {
  DepartmentCheckInResult,
  JobRegistrationResult,
  ShopFloorDepartmentCheckIn,
  ShopFloorTaskEventResult,
  ShopFloorTrackedTask,
} from './contracts';

function formatClock(nowMs: number): string {
  return new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function runningSeconds(task: ShopFloorTrackedTask, nowMs: number) {
  if (task.status !== 'running' || !task.startedAtMs) {
    return task.elapsedSeconds;
  }
  return task.elapsedSeconds + Math.max(Math.floor((nowMs - task.startedAtMs) / 1000), 0);
}

function applyTaskCounterOverrides(
  task: ShopFloorTrackedTask,
  input: { partsCompleted?: number; extraParts?: number },
) {
  return {
    ...task,
    partsCompleted: input.partsCompleted ?? task.partsCompleted,
    extraParts: input.extraParts ?? task.extraParts,
  };
}

export function buildTrackedTasks(
  packet: ReturnType<typeof parseJobTrackingPayload>,
  department: string,
  role?: string,
): ShopFloorTrackedTask[] {
  return buildMobileTaskTemplates({
    department,
    packet,
    role,
  }).map<ShopFloorTrackedTask>((task) => ({
    ...task,
    status: 'idle',
    elapsedSeconds: 0,
    partsCompleted: 0,
    extraParts: 0,
  }));
}

export function registerTrackedJob(input: {
  scanInput: string;
  jobId: string;
  selectedDepartment: string;
  employee?: Pick<Employee, 'first_name' | 'role' | 'department'> | null;
}): JobRegistrationResult {
  const parsed = parseJobTrackingPayload(input.scanInput || input.jobId);
  if (!parsed) {
    return {
      trackedJob: null,
      jobId: input.jobId,
      operation: '',
      selectedDepartment: input.selectedDepartment,
      tasks: [],
      message: 'Scan a QR sticker or enter a job number to register the job.',
    };
  }

  const inferredDepartment = input.selectedDepartment || suggestedDepartment(input.employee);

  return {
    trackedJob: parsed,
    jobId: parsed.jobId,
    operation: parsed.operations[0] ?? '',
    selectedDepartment: inferredDepartment,
    tasks: buildTrackedTasks(parsed, inferredDepartment, input.employee?.role),
    message: `${parsed.jobId} registered for ${input.employee?.first_name ?? 'operator'} on the mobile tracker.`,
  };
}

export function checkIntoDepartment(input: {
  trackedJob: ReturnType<typeof parseJobTrackingPayload>;
  employee?: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'role'> | null;
  selectedDepartment: string;
  existingCheckIns: ShopFloorDepartmentCheckIn[];
  existingTasks: ShopFloorTrackedTask[];
  nowMs?: number;
}): DepartmentCheckInResult {
  const { trackedJob, employee, selectedDepartment, existingCheckIns, existingTasks, nowMs } = input;

  if (!trackedJob || !employee || !selectedDepartment) {
    return {
      duplicate: false,
      message: 'Select an employee, scan a job, and confirm the department first.',
      checkIns: existingCheckIns,
      tasks: existingTasks,
    };
  }

  const duplicate = existingCheckIns.find(
    (entry) => entry.jobId === trackedJob.jobId && entry.department === selectedDepartment,
  );

  if (duplicate) {
    return {
      duplicate: true,
      message: `${trackedJob.jobId} is already checked into ${selectedDepartment} by ${duplicate.employeeName} at ${duplicate.scannedAt}.`,
      checkIns: existingCheckIns,
      tasks: existingTasks,
    };
  }

  const currentNowMs = nowMs ?? Date.now();
  const entry: ShopFloorDepartmentCheckIn = {
    id: `${trackedJob.jobId}-${selectedDepartment}-${currentNowMs}`,
    jobId: trackedJob.jobId,
    department: selectedDepartment,
    employeeId: employee.id,
    employeeName: `${employee.first_name} ${employee.last_name}`,
    scannedAt: formatClock(currentNowMs),
  };

  return {
    duplicate: false,
    message: `${trackedJob.jobId} checked into ${selectedDepartment}.`,
    checkIns: [entry, ...existingCheckIns],
    entry,
    tasks:
      existingTasks.length > 0
        ? existingTasks
        : buildTrackedTasks(trackedJob, selectedDepartment, employee.role),
  };
}

export function buildRoiSignals(input: {
  tasks: ShopFloorTrackedTask[];
  nowMs: number;
  cycleVariance: number;
  totalExtras: number;
}) {
  const setupSeconds = input.tasks
    .filter((task) => task.title.toLowerCase().includes('setup') || task.title.toLowerCase().includes('cad') || task.title.toLowerCase().includes('cam'))
    .reduce((sum, task) => sum + runningSeconds(task, input.nowMs), 0);
  const runSeconds = input.tasks.filter((task) => task.title.toLowerCase().includes('run')).reduce((sum, task) => sum + runningSeconds(task, input.nowMs), 0);

  return [
    setupSeconds > runSeconds * 0.65 && runSeconds > 0
      ? 'Setup load is dominating runtime. Dedicated fixturing or preset tooling looks like a high-ROI investment.'
      : 'Setup-to-run balance is healthy for the current tracked mix.',
    input.cycleVariance > 8
      ? `Actual cycle is ${input.cycleVariance.toFixed(0)}% slower than the seeded quote standard. Feed this back into quoting and machine/load planning.`
      : 'Cycle time is close to the seeded quote standard, which is good signal for future quote accuracy.',
    input.totalExtras > 0
      ? `${input.totalExtras} extra pieces were logged. Use that signal for inventory buffer planning and future lot-sizing.`
      : 'No extra pieces logged yet. Extras can reveal where safety stock or economic batch sizing helps.',
  ];
}

export function recordTaskEvent(input: {
  tasks: ShopFloorTrackedTask[];
  taskId: string;
  action: 'start' | 'pause' | 'complete';
  nowMs?: number;
  partsCompleted?: number;
  extraParts?: number;
}): ShopFloorTaskEventResult {
  const nowMs = input.nowMs ?? Date.now();
  let found = false;

  const tasks = input.tasks.map((task) => {
    const taskWithCounters = applyTaskCounterOverrides(task, input);

    if (task.id === input.taskId) {
      found = true;
      if (input.action === 'start') {
        return {
          ...taskWithCounters,
          status: 'running',
          startedAtMs: nowMs,
        };
      }
      if (input.action === 'pause') {
        return {
          ...taskWithCounters,
          status: 'paused',
          elapsedSeconds: runningSeconds(taskWithCounters, nowMs),
          startedAtMs: undefined,
        };
      }
      return {
        ...taskWithCounters,
        status: 'completed',
        elapsedSeconds: runningSeconds(taskWithCounters, nowMs),
        startedAtMs: undefined,
      };
    }

    if (input.action === 'start' && task.status === 'running') {
      return {
        ...task,
        status: 'paused',
        elapsedSeconds: runningSeconds(task, nowMs),
        startedAtMs: undefined,
      };
    }

    return task;
  });

  if (!found) {
    throw new Error(`Tracked task ${input.taskId} was not found in the current shop-floor task set.`);
  }

  // tasks.map branches widen status into a string union per branch; cast to the
  // narrowed Task type since all branches preserve the discriminated structure.
  return { tasks: tasks as ShopFloorTrackedTask[] };
}
