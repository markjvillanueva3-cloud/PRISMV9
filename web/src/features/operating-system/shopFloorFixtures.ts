import type { Employee } from '../../api/types';
import { buildMobileTaskTemplates, parseJobTrackingPayload, suggestedDepartment } from '../../utils/jobTracking';
import type {
  DepartmentCheckInResult,
  JobRegistrationResult,
  ShopFloorDepartmentCheckIn,
  ShopFloorTaskEventResult,
  ShopFloorTaskEventTrigger,
  ShopFloorTrackedTask,
} from './contracts';

function formatClock(nowMs: number): string {
  return new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
  const runningSeconds = (task: ShopFloorTrackedTask) => {
    if (task.status !== 'running' || !task.startedAtMs) {
      return task.elapsedSeconds;
    }
    return task.elapsedSeconds + Math.max(Math.floor((input.nowMs - task.startedAtMs) / 1000), 0);
  };

  const setupSeconds = input.tasks
    .filter((task) => task.title.toLowerCase().includes('setup') || task.title.toLowerCase().includes('cad') || task.title.toLowerCase().includes('cam'))
    .reduce((sum, task) => sum + runningSeconds(task), 0);
  const runSeconds = input.tasks.filter((task) => task.title.toLowerCase().includes('run')).reduce((sum, task) => sum + runningSeconds(task), 0);

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

function describeTaskTrigger(trigger: ShopFloorTaskEventTrigger) {
  switch (trigger) {
    case 'shop-floor-task-started':
      return 'Task started';
    case 'shop-floor-task-paused':
      return 'Task paused';
    case 'shop-floor-task-completed':
      return 'Task completed';
    default:
      return 'Task event';
  }
}

export function recordTaskEvent(input: {
  trigger: ShopFloorTaskEventTrigger;
  jobId?: string;
  taskId?: string;
  operation?: string;
  department?: string;
  quantityCompleted?: number;
  scrapQty?: number;
  note?: string;
}): ShopFloorTaskEventResult {
  const jobId = input.jobId?.trim();
  if (!jobId) {
    return {
      acknowledged: false,
      trigger: input.trigger,
      taskId: input.taskId,
      note: input.note,
    };
  }

  const timestamp = new Date().toISOString();
  const summary = input.note?.trim() || `${describeTaskTrigger(input.trigger)} for ${input.operation ?? input.taskId ?? jobId}.`;

  return {
    acknowledged: true,
    trigger: input.trigger,
    taskId: input.taskId,
    note: input.note,
    prism_sync: {
      event: {
        id: `${jobId}-${input.trigger}-${input.taskId ?? 'task'}`,
        job_id: jobId,
        source: 'shop-floor-clock',
        trigger: input.trigger,
        outcome: 'observed',
        summary,
        details: [
          input.department ? `Department: ${input.department}.` : 'Department not specified.',
          typeof input.quantityCompleted === 'number' ? `Quantity logged: ${input.quantityCompleted}.` : 'No quantity logged.',
        ],
        timestamp,
        cli_command: `prism milestone align --job ${jobId} --surface shop-floor-clock`,
      },
      timeline: null,
      refresh_timeline: false,
      recent_events: [
        {
          id: `${jobId}-${input.trigger}-${input.taskId ?? 'task'}`,
          job_id: jobId,
          source: 'shop-floor-clock',
          trigger: input.trigger,
          outcome: 'observed',
          summary,
          details: [
            input.department ? `Department: ${input.department}.` : 'Department not specified.',
            typeof input.quantityCompleted === 'number' ? `Quantity logged: ${input.quantityCompleted}.` : 'No quantity logged.',
          ],
          timestamp,
          cli_command: `prism milestone align --job ${jobId} --surface shop-floor-clock`,
        },
      ],
    },
  };
}
