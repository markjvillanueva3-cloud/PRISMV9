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

export interface TrackedTask {
  id: string;
  title: string;
  department: string;
  operationCode: string;
  quantityTarget: number;
  cycleSeconds: number;
  note: string;
  status: TaskStatus;
  elapsedSeconds: number;
  startedAtMs?: number;
  partsCompleted: number;
  extraParts: number;
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
    code: string;
    title: string;
    department: string;
    quantityTarget: number;
    cycleSeconds: number;
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
      .filter((op) => op.department === department || department === "All")
      .map((op, i) => ({
        id: `task-${payload.jobId}-${op.code}-${i}`,
        title: op.title,
        department: op.department,
        operationCode: op.code,
        quantityTarget: op.quantityTarget,
        cycleSeconds: op.cycleSeconds,
        note: "",
        status: "idle" as TaskStatus,
        elapsedSeconds: 0,
        partsCompleted: 0,
        extraParts: 0,
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
