/**
 * ShopFloorCheckInEngine — Department Check-In & Task Tracking
 * =============================================================
 *
 * Handles shop floor department check-in, tracked task creation from
 * job routing, job registration for clock-in, and ROI signal generation.
 *
 * Backs the ShopFloorProvider contract from
 * web/src/features/operating-system/contracts.ts.
 *
 * @version 1.0.0 — Sprint C1
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "idle" | "running" | "paused" | "completed";
export type ShopFloorProcessType =
  | "setup"
  | "production_run"
  | "first_article"
  | "rework"
  | "inspection"
  | "deburring"
  | "secondary_ops"
  | "programming"
  | "material_handling";

export interface TrackedTask {
  id: string;
  title: string;
  department: string;
  operationId: string;
  operationLabel: string;
  operationCode: string;
  processType: ShopFloorProcessType;
  quantityTarget: number;
  cycleSeconds: number;
  note: string;
  status: TaskStatus;
  elapsedSeconds: number;
  startedAtMs?: number;
  partsCompleted: number;
  extraParts: number;
  machineId?: string;
}

export interface DepartmentCheckIn {
  id: string;
  jobId: string;
  department: string;
  employeeId: string;
  employeeName: string;
  scannedAt: string;
}

export interface DepartmentCheckInResult {
  duplicate: boolean;
  message: string;
  entry?: DepartmentCheckIn;
  tasks: TrackedTask[];
}

export interface JobRegistrationResult {
  trackedJob: JobTrackingPayload | null;
  jobId: string;
  operation: string;
  selectedDepartment: string;
  tasks: TrackedTask[];
  message: string;
}

/** Minimal job tracking payload from the frontend's jobTracking utility */
export interface JobTrackingPayload {
  jobId: string;
  partNumber: string;
  customer: string;
  status: string;
  operations: Array<{
    id?: string;
    code: string;
    label?: string;
    title: string;
    department: string;
    quantityTarget: number;
    cycleSeconds: number;
    note?: string;
    processType?: ShopFloorProcessType;
    machineId?: string;
  }>;
}

export interface EmployeeRef {
  id?: string;
  first_name: string;
  last_name?: string;
  role?: string;
  department?: string;
}

// ─── Department definitions ───────────────────────────────────────────────────

const DEPARTMENTS = [
  "Machining", "Turning", "Grinding", "EDM", "Assembly",
  "Quality", "Shipping", "Programming", "Engineering",
] as const;

function normalizeDepartmentSelection(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "All";
  if (normalized === "all") return "All";
  if (normalized.includes("cad") || normalized.includes("engineer")) return "CAD work";
  if (normalized.includes("cam") || normalized.includes("program")) return "CAM programming";
  if (normalized.includes("quality") || normalized.includes("inspect")) return "Quality";
  if (normalized.includes("ship")) return "Shipping";
  if (normalized.includes("setup")) return "Job setup";
  if (
    normalized.includes("run") ||
    normalized.includes("machin") ||
    normalized.includes("turn") ||
    normalized.includes("production")
  ) {
    return "Run cycle";
  }
  return value;
}

function inferProcessType(code: string, title: string, department: string): ShopFloorProcessType {
  const normalizedCode = code.trim().toUpperCase();
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedDepartment = normalizeDepartmentSelection(department).toLowerCase();

  if (normalizedCode === "CAD" || normalizedCode === "CAM" || normalizedTitle.includes("program")) {
    return "programming";
  }
  if (normalizedCode === "OP10" || normalizedTitle.includes("setup") || normalizedTitle.includes("prove")) {
    return "setup";
  }
  if (normalizedCode === "OP30" || normalizedDepartment.includes("quality") || normalizedTitle.includes("inspection")) {
    return "inspection";
  }
  if (normalizedCode === "OP25" || normalizedTitle.includes("secondary") || normalizedTitle.includes("deburr")) {
    return "secondary_ops";
  }
  if (normalizedCode === "OP40" || normalizedDepartment.includes("shipping") || normalizedTitle.includes("packout")) {
    return "material_handling";
  }
  return "production_run";
}

function buildOperationNote(code: string, title: string): string {
  const normalizedCode = code.trim().toUpperCase();
  if (normalizedCode === "CAD") return "Model revisions, print alignment, and release readiness.";
  if (normalizedCode === "CAM") return "Toolpath, setup sheet, and post verification before release.";
  if (normalizedCode === "OP10") return "Fixture, offsets, prove-out, and first-piece setup.";
  if (normalizedCode === "OP20") return "Live production runtime with quantity and cycle capture.";
  if (normalizedCode === "OP25") return "Secondary handling, deburr, or support work between cycles.";
  if (normalizedCode === "OP30") return "Inspection, first-article approval, and in-process verification.";
  if (normalizedCode === "OP40") return "Packout, shipping prep, and final release handling.";
  return `${title} tracking is ready for quick mobile punches.`;
}

function isOperationVisibleToDepartment(selectedDepartment: string, operationDepartment: string): boolean {
  const normalizedSelection = normalizeDepartmentSelection(selectedDepartment);
  const normalizedOperationDepartment = normalizeDepartmentSelection(operationDepartment);

  if (normalizedSelection === "All") return true;
  if (normalizedSelection === normalizedOperationDepartment) return true;

  if (
    (normalizedSelection === "Job setup" || normalizedSelection === "Run cycle") &&
    (normalizedOperationDepartment === "Job setup" || normalizedOperationDepartment === "Run cycle")
  ) {
    return true;
  }

  if (
    (normalizedSelection === "CAD work" || normalizedSelection === "CAM programming") &&
    (normalizedOperationDepartment === "CAD work" || normalizedOperationDepartment === "CAM programming")
  ) {
    return true;
  }

  return false;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ShopFloorCheckInEngine {
  /**
   * Build tracked tasks from a job tracking payload for a given department.
   * @param payload - Job tracking payload (from QR scan or manual lookup)
   * @param department - Selected department to filter operations
   * @param role - Optional employee role for role-based filtering
   */
  static buildTrackedTasks(
    payload: JobTrackingPayload | null,
    department: string,
    role?: string,
  ): TrackedTask[] {
    if (!payload || !payload.operations) return [];

    return payload.operations
      .filter((op) => isOperationVisibleToDepartment(department, op.department))
      .map((op, i) => ({
        id: `task-${payload.jobId}-${op.code}-${i}`,
        title: op.title,
        department: normalizeDepartmentSelection(op.department),
        operationId: op.id ?? `op-${payload.jobId}-${op.code}-${i}`,
        operationLabel: op.label ?? op.title,
        operationCode: op.code,
        processType: op.processType ?? inferProcessType(op.code, op.title, op.department),
        quantityTarget: op.quantityTarget,
        cycleSeconds: op.cycleSeconds,
        note: op.note ?? buildOperationNote(op.code, op.title),
        status: "idle" as TaskStatus,
        elapsedSeconds: 0,
        partsCompleted: 0,
        extraParts: 0,
        machineId: op.machineId,
      }));
  }

  /**
   * Register a job for tracking after QR scan or manual entry.
   * @param input - Scan input, job ID, department, and employee info
   */
  static registerJob(input: {
    scanInput: string;
    jobId: string;
    selectedDepartment: string;
    employee?: EmployeeRef | null;
  }): JobRegistrationResult {
    const { jobId, selectedDepartment, employee } = input;

    if (!jobId || jobId.trim() === "") {
      return {
        trackedJob: null,
        jobId: "",
        operation: "",
        selectedDepartment,
        tasks: [],
        message: "No job ID provided. Scan a QR code or enter a job number.",
      };
    }

    // In production, this would look up the job from the ERP/lifecycle engine.
    // For now, return a structured result that the route handler populates.
    const deptLabel = selectedDepartment || employee?.department || "Machining";

    return {
      trackedJob: null, // Route handler fills this from JobLifecycleEngine
      jobId: jobId.trim(),
      operation: `${deptLabel} operations`,
      selectedDepartment: deptLabel,
      tasks: [], // Route handler fills from buildTrackedTasks after lookup
      message: `Job ${jobId} registered for ${deptLabel}. ${employee ? `Operator: ${employee.first_name}` : "No operator assigned."}`,
    };
  }

  /**
   * Check an employee into a department for a tracked job.
   * @param input - Job tracking state, employee, department, existing check-ins
   */
  static checkIntoDepartment(input: {
    trackedJob: JobTrackingPayload | null;
    employee?: EmployeeRef | null;
    selectedDepartment: string;
    existingCheckIns: DepartmentCheckIn[];
    existingTasks: TrackedTask[];
    nowMs?: number;
  }): DepartmentCheckInResult {
    const { trackedJob, employee, selectedDepartment, existingCheckIns, existingTasks } = input;
    const nowMs = input.nowMs ?? Date.now();
    const nowIso = new Date(nowMs).toISOString();

    if (!trackedJob) {
      return { duplicate: false, message: "No job registered. Scan a job first.", tasks: existingTasks };
    }

    if (!employee) {
      return { duplicate: false, message: "No employee identified. Badge in first.", tasks: existingTasks };
    }

    const empId = employee.id || `emp-${employee.first_name.toLowerCase()}`;
    const empName = employee.last_name
      ? `${employee.first_name} ${employee.last_name}`
      : employee.first_name;

    // Check for duplicate
    const isDuplicate = existingCheckIns.some(
      (c) => c.employeeId === empId && c.department === selectedDepartment && c.jobId === trackedJob.jobId,
    );

    if (isDuplicate) {
      return {
        duplicate: true,
        message: `${empName} already checked into ${selectedDepartment} for job ${trackedJob.jobId}.`,
        tasks: existingTasks,
      };
    }

    const entry: DepartmentCheckIn = {
      id: `checkin-${trackedJob.jobId}-${empId}-${nowMs}`,
      jobId: trackedJob.jobId,
      department: selectedDepartment,
      employeeId: empId,
      employeeName: empName,
      scannedAt: nowIso,
    };

    // Build fresh tasks for the department
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(trackedJob, selectedDepartment, employee.role);

    return {
      duplicate: false,
      message: `${empName} checked into ${selectedDepartment} for job ${trackedJob.jobId}.`,
      entry,
      tasks: tasks.length > 0 ? tasks : existingTasks,
    };
  }

  /**
   * Record a task lifecycle event (start, pause, complete) and return updated tasks.
   * Starting a task pauses any currently running task first.
   * @param input - Tasks array, target task ID, action, timestamp, and optional counters
   */
  static recordTaskEvent(input: {
    tasks: TrackedTask[];
    taskId: string;
    action: "start" | "pause" | "complete";
    nowMs: number;
    partsCompleted?: number;
    extraParts?: number;
  }): { tasks: TrackedTask[] } {
    const { tasks, taskId, action, nowMs } = input;

    const updated = tasks.map((task): TrackedTask => {
      // Pause any currently running task when a different task is being started
      if (action === "start" && task.id !== taskId && task.status === "running") {
        const elapsed = task.startedAtMs != null
          ? Math.round((nowMs - task.startedAtMs) / 1000)
          : 0;
        return {
          ...task,
          status: "paused",
          elapsedSeconds: task.elapsedSeconds + elapsed,
          startedAtMs: undefined,
        };
      }

      if (task.id !== taskId) return task;

      if (action === "start") {
        return { ...task, status: "running", startedAtMs: nowMs };
      }

      if (action === "pause") {
        const elapsed = task.startedAtMs != null
          ? Math.round((nowMs - task.startedAtMs) / 1000)
          : 0;
        return {
          ...task,
          status: "paused",
          elapsedSeconds: task.elapsedSeconds + elapsed,
          startedAtMs: undefined,
        };
      }

      if (action === "complete") {
        const elapsed = task.startedAtMs != null
          ? Math.round((nowMs - task.startedAtMs) / 1000)
          : 0;
        return {
          ...task,
          status: "completed",
          elapsedSeconds: task.elapsedSeconds + elapsed,
          startedAtMs: undefined,
          partsCompleted: input.partsCompleted ?? task.partsCompleted,
          extraParts: input.extraParts ?? task.extraParts,
        };
      }

      return task;
    });

    return { tasks: updated };
  }

  /**
   * Generate ROI signals from tracked task performance.
   * Signals highlight efficiency gains, overruns, and opportunities.
   * @param input - Current tasks, timestamp, cycle variance, and extra parts count
   */
  static buildRoiSignals(input: {
    tasks: TrackedTask[];
    nowMs: number;
    cycleVariance: number;
    totalExtras: number;
  }): string[] {
    const { tasks, cycleVariance, totalExtras } = input;
    const signals: string[] = [];

    if (tasks.length === 0) return signals;

    const completed = tasks.filter((t) => t.status === "completed");
    const running = tasks.filter((t) => t.status === "running");
    const totalTarget = tasks.reduce((sum, t) => sum + t.quantityTarget, 0);
    const totalCompleted = tasks.reduce((sum, t) => sum + t.partsCompleted, 0);

    // Throughput signal
    if (totalCompleted > 0 && totalTarget > 0) {
      const pct = Math.round((totalCompleted / totalTarget) * 100);
      signals.push(`Throughput: ${totalCompleted}/${totalTarget} parts (${pct}%)`);
    }

    // Cycle variance signal
    if (Math.abs(cycleVariance) > 0.1) {
      const direction = cycleVariance > 0 ? "over" : "under";
      const absPct = Math.round(Math.abs(cycleVariance) * 100);
      signals.push(`Cycle time ${absPct}% ${direction} estimate — ${direction === "over" ? "investigate cause" : "opportunity to optimize standard"}`);
    }

    // Extra parts signal
    if (totalExtras > 0) {
      signals.push(`${totalExtras} extra part(s) produced — available for buffer stock or rush orders`);
    }

    // Completion rate
    if (completed.length > 0) {
      signals.push(`${completed.length}/${tasks.length} operations completed`);
    }

    // Active work signal
    if (running.length > 0) {
      signals.push(`${running.length} operation(s) currently running`);
    }

    return signals;
  }
}

export const shopFloorCheckInEngine = new ShopFloorCheckInEngine();
