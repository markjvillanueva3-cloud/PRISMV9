/**
 * JobSchedulingEngine — R26-MS1: Job Queue & Priority Scheduling
 *
 * Actions:
 *   job_schedule    — schedule jobs to machines based on due dates, priorities, and constraints
 *   job_priority    — calculate and rank job priorities using multi-criteria scoring
 *   job_status      — track job progress, completion rates, and schedule adherence
 *   job_reschedule  — handle rescheduling due to disruptions, machine failures, or rush orders
 *
 * Depends on: R1 registries (machines), R21 (maintenance windows), R24 (operator availability)
 */

// ─── Data Types ───────────────────────────────────────────────────────────────

interface Job {
  job_id: string;
  customer: string;
  part_number: string;
  part_name: string;
  quantity: number;
  operations: Operation[];
  priority: "critical" | "high" | "standard" | "low";
  order_date: string;
  due_date: string;
  status: "queued" | "scheduled" | "in_progress" | "on_hold" | "completed" | "late";
  assigned_machine?: string;
  estimated_hours: number;
  actual_hours?: number;
  material_id: string;
  notes?: string;
}

interface Operation {
  op_id: string;
  op_number: number;
  type: "turning" | "milling" | "drilling" | "grinding" | "inspection" | "deburring" | "heat_treat" | "assembly";
  description: string;
  machine_type: string;
  setup_hours: number;
  run_hours_per_piece: number;
  required_tooling: string[];
}

interface MachineSlot {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  capacity_hours_per_day: number;
  current_load_pct: number;
  scheduled_jobs: string[];
  maintenance_windows: Array<{ start: string; end: string; type: string }>;
  efficiency_factor: number;   // 0-1, accounts for setup, changeover, breaks
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const JOB_QUEUE: Job[] = [
  { job_id: "JOB-001", customer: "AeroCorp", part_number: "AC-7075-BRK", part_name: "Brake Housing", quantity: 50, operations: [
    { op_id: "OP-001A", op_number: 10, type: "milling", description: "Rough mill housing cavity", machine_type: "CNC_MILL", setup_hours: 1.5, run_hours_per_piece: 0.45, required_tooling: ["EM-25-4F", "FM-50-6F"] },
    { op_id: "OP-001B", op_number: 20, type: "milling", description: "Finish mill + bore", machine_type: "CNC_MILL", setup_hours: 0.5, run_hours_per_piece: 0.30, required_tooling: ["EM-10-4F", "BOR-25"] },
    { op_id: "OP-001C", op_number: 30, type: "inspection", description: "CMM inspection", machine_type: "CMM", setup_hours: 0.25, run_hours_per_piece: 0.10, required_tooling: [] },
  ], priority: "critical", order_date: "2025-01-15", due_date: "2025-02-15", status: "in_progress", assigned_machine: "MILL-01", estimated_hours: 40.0, actual_hours: 22.5, material_id: "MAT003" },

  { job_id: "JOB-002", customer: "MediTech", part_number: "MT-TI64-IMP", part_name: "Titanium Implant Pin", quantity: 200, operations: [
    { op_id: "OP-002A", op_number: 10, type: "turning", description: "Turn OD profile", machine_type: "CNC_LATHE", setup_hours: 2.0, run_hours_per_piece: 0.15, required_tooling: ["VNMG-TI", "GRV-2MM"] },
    { op_id: "OP-002B", op_number: 20, type: "grinding", description: "Precision grind", machine_type: "GRINDER", setup_hours: 1.0, run_hours_per_piece: 0.08, required_tooling: ["WHL-CBN-150"] },
    { op_id: "OP-002C", op_number: 30, type: "inspection", description: "100% inspection", machine_type: "CMM", setup_hours: 0.5, run_hours_per_piece: 0.05, required_tooling: [] },
  ], priority: "critical", order_date: "2025-01-10", due_date: "2025-02-10", status: "late", assigned_machine: "LATHE-02", estimated_hours: 35.5, actual_hours: 28.0, material_id: "MAT002" },

  { job_id: "JOB-003", customer: "AutoParts Inc", part_number: "AP-4140-SFT", part_name: "Drive Shaft", quantity: 100, operations: [
    { op_id: "OP-003A", op_number: 10, type: "turning", description: "Turn shaft profile", machine_type: "CNC_LATHE", setup_hours: 1.0, run_hours_per_piece: 0.25, required_tooling: ["CNMG-STL", "THR-1.5P"] },
    { op_id: "OP-003B", op_number: 20, type: "milling", description: "Mill keyway", machine_type: "CNC_MILL", setup_hours: 0.75, run_hours_per_piece: 0.08, required_tooling: ["EM-6-2F"] },
    { op_id: "OP-003C", op_number: 30, type: "heat_treat", description: "Case harden", machine_type: "FURNACE", setup_hours: 0.5, run_hours_per_piece: 0.02, required_tooling: [] },
  ], priority: "high", order_date: "2025-01-20", due_date: "2025-02-20", status: "scheduled", estimated_hours: 28.25, material_id: "MAT001" },

  { job_id: "JOB-004", customer: "DefenseCo", part_number: "DC-SS316-VLV", part_name: "Valve Body", quantity: 25, operations: [
    { op_id: "OP-004A", op_number: 10, type: "milling", description: "5-axis mill valve body", machine_type: "CNC_MILL_5AX", setup_hours: 3.0, run_hours_per_piece: 1.20, required_tooling: ["BN-EM-12", "BOR-8", "THR-M8"] },
    { op_id: "OP-004B", op_number: 20, type: "deburring", description: "Manual deburr + polish", machine_type: "MANUAL", setup_hours: 0, run_hours_per_piece: 0.30, required_tooling: [] },
    { op_id: "OP-004C", op_number: 30, type: "inspection", description: "Full CMM + pressure test", machine_type: "CMM", setup_hours: 0.5, run_hours_per_piece: 0.20, required_tooling: [] },
  ], priority: "high", order_date: "2025-01-25", due_date: "2025-02-25", status: "queued", estimated_hours: 36.5, material_id: "MAT006" },

  { job_id: "JOB-005", customer: "GeneralMfg", part_number: "GM-BRS-FIT", part_name: "Brass Fitting", quantity: 500, operations: [
    { op_id: "OP-005A", op_number: 10, type: "turning", description: "Swiss turn fitting", machine_type: "SWISS_LATHE", setup_hours: 2.5, run_hours_per_piece: 0.04, required_tooling: ["MICRO-GRV", "THR-NPT"] },
    { op_id: "OP-005B", op_number: 20, type: "inspection", description: "SPC sampling 10%", machine_type: "CMM", setup_hours: 0.25, run_hours_per_piece: 0.02, required_tooling: [] },
  ], priority: "standard", order_date: "2025-01-28", due_date: "2025-03-01", status: "scheduled", estimated_hours: 23.25, material_id: "MAT010" },

  { job_id: "JOB-006", customer: "AeroCorp", part_number: "AC-CF-PNL", part_name: "Carbon Fiber Panel", quantity: 10, operations: [
    { op_id: "OP-006A", op_number: 10, type: "milling", description: "CNC trim composite panel", machine_type: "CNC_MILL", setup_hours: 1.0, run_hours_per_piece: 0.80, required_tooling: ["DIA-EM-6", "DIA-DR-3"] },
    { op_id: "OP-006B", op_number: 20, type: "inspection", description: "NDT + dimensional", machine_type: "CMM", setup_hours: 0.5, run_hours_per_piece: 0.25, required_tooling: [] },
  ], priority: "standard", order_date: "2025-02-01", due_date: "2025-03-10", status: "queued", estimated_hours: 11.0, material_id: "MAT007" },

  { job_id: "JOB-007", customer: "MediTech", part_number: "MT-SN-NOZ", part_name: "Ceramic Nozzle", quantity: 15, operations: [
    { op_id: "OP-007A", op_number: 10, type: "grinding", description: "Precision grind ceramic", machine_type: "GRINDER", setup_hours: 2.0, run_hours_per_piece: 0.60, required_tooling: ["WHL-DIA-100"] },
    { op_id: "OP-007B", op_number: 20, type: "inspection", description: "Optical measurement", machine_type: "CMM", setup_hours: 0.25, run_hours_per_piece: 0.15, required_tooling: [] },
  ], priority: "low", order_date: "2025-02-03", due_date: "2025-03-15", status: "queued", estimated_hours: 13.25, material_id: "MAT009" },

  { job_id: "JOB-008", customer: "AutoParts Inc", part_number: "AP-AL-HSNG", part_name: "Aluminum Housing", quantity: 75, operations: [
    { op_id: "OP-008A", op_number: 10, type: "milling", description: "Mill housing from billet", machine_type: "CNC_MILL", setup_hours: 1.5, run_hours_per_piece: 0.35, required_tooling: ["EM-20-3F", "EM-8-4F", "DR-6.8"] },
    { op_id: "OP-008B", op_number: 20, type: "drilling", description: "Drill + tap holes", machine_type: "CNC_MILL", setup_hours: 0.5, run_hours_per_piece: 0.10, required_tooling: ["DR-4.2", "TAP-M5"] },
    { op_id: "OP-008C", op_number: 30, type: "deburring", description: "Tumble deburr", machine_type: "TUMBLER", setup_hours: 0.25, run_hours_per_piece: 0.01, required_tooling: [] },
  ], priority: "standard", order_date: "2025-02-05", due_date: "2025-03-05", status: "queued", estimated_hours: 36.5, material_id: "MAT008" },
];

const MACHINE_SLOTS: MachineSlot[] = [
  { machine_id: "MILL-01", machine_name: "Haas VF-4SS", machine_type: "CNC_MILL", capacity_hours_per_day: 16, current_load_pct: 85, scheduled_jobs: ["JOB-001"], maintenance_windows: [{ start: "2025-02-12", end: "2025-02-12", type: "PM" }], efficiency_factor: 0.82 },
  { machine_id: "MILL-02", machine_name: "DMG MORI M1", machine_type: "CNC_MILL", capacity_hours_per_day: 16, current_load_pct: 60, scheduled_jobs: [], maintenance_windows: [], efficiency_factor: 0.85 },
  { machine_id: "MILL-03", machine_name: "Mazak VCN-530C", machine_type: "CNC_MILL_5AX", capacity_hours_per_day: 16, current_load_pct: 40, scheduled_jobs: [], maintenance_windows: [{ start: "2025-02-18", end: "2025-02-19", type: "calibration" }], efficiency_factor: 0.80 },
  { machine_id: "LATHE-01", machine_name: "Okuma LB3000", machine_type: "CNC_LATHE", capacity_hours_per_day: 16, current_load_pct: 55, scheduled_jobs: ["JOB-003"], maintenance_windows: [], efficiency_factor: 0.88 },
  { machine_id: "LATHE-02", machine_name: "Doosan Puma 2600", machine_type: "CNC_LATHE", capacity_hours_per_day: 16, current_load_pct: 90, scheduled_jobs: ["JOB-002"], maintenance_windows: [], efficiency_factor: 0.85 },
  { machine_id: "SWISS-01", machine_name: "Citizen L20", machine_type: "SWISS_LATHE", capacity_hours_per_day: 20, current_load_pct: 30, scheduled_jobs: ["JOB-005"], maintenance_windows: [], efficiency_factor: 0.90 },
  { machine_id: "GRIND-01", machine_name: "Studer S33", machine_type: "GRINDER", capacity_hours_per_day: 16, current_load_pct: 25, scheduled_jobs: [], maintenance_windows: [], efficiency_factor: 0.78 },
  { machine_id: "CMM-01", machine_name: "Zeiss Contura", machine_type: "CMM", capacity_hours_per_day: 8, current_load_pct: 70, scheduled_jobs: [], maintenance_windows: [], efficiency_factor: 0.95 },
];

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function calculateJobPriority(job: Job): {
  score: number; urgency: string; factors: Record<string, number>;
} {
  const today = "2025-02-07";
  const daysToDeadline = daysBetween(today, job.due_date);
  const totalDays = daysBetween(job.order_date, job.due_date);
  const remainingHours = job.estimated_hours - (job.actual_hours || 0);

  // Multi-criteria scoring (higher = more urgent)
  const urgencyScore = daysToDeadline <= 0 ? 100 : daysToDeadline <= 3 ? 80 : daysToDeadline <= 7 ? 60 : daysToDeadline <= 14 ? 40 : 20;
  const priorityWeight = job.priority === "critical" ? 40 : job.priority === "high" ? 30 : job.priority === "standard" ? 15 : 5;
  const progressPenalty = totalDays > 0 ? Math.max(0, 20 - (((job.actual_hours || 0) / job.estimated_hours) * 20)) : 0;
  const lateBonus = job.status === "late" ? 25 : 0;
  const totalScore = Math.min(100, urgencyScore + priorityWeight + progressPenalty + lateBonus);

  const urgency = totalScore >= 80 ? "CRITICAL" : totalScore >= 60 ? "HIGH" : totalScore >= 35 ? "MEDIUM" : "LOW";

  return {
    score: Math.round(totalScore * 10) / 10,
    urgency,
    factors: { urgency: urgencyScore, priority: priorityWeight, progress: Math.round(progressPenalty * 10) / 10, late_bonus: lateBonus },
  };
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

function handleJobSchedule(params: Record<string, unknown>): unknown {
  const jobId = params.job_id as string | undefined;
  const machineType = params.machine_type as string | undefined;

  let jobs = JOB_QUEUE.filter(j => j.status !== "completed");
  if (jobId) jobs = jobs.filter(j => j.job_id === jobId);

  // Build schedule assignments
  const schedule = jobs.map(job => {
    const priorityCalc = calculateJobPriority(job);
    const remainingHours = job.estimated_hours - (job.actual_hours || 0);

    // Find best machine for first unfinished operation
    const nextOp = job.operations[0]; // simplified: use first op's machine type
    let candidates = MACHINE_SLOTS.filter(m =>
      (!machineType || m.machine_type === machineType) &&
      (m.machine_type === nextOp.machine_type)
    );

    // Sort by lowest load
    candidates = candidates.sort((a, b) => a.current_load_pct - b.current_load_pct);
    const bestMachine = job.assigned_machine
      ? MACHINE_SLOTS.find(m => m.machine_id === job.assigned_machine)
      : candidates[0];

    const effectiveCapacity = bestMachine
      ? bestMachine.capacity_hours_per_day * bestMachine.efficiency_factor
      : 12;
    const estimatedDays = Math.ceil(remainingHours / effectiveCapacity);

    return {
      job_id: job.job_id,
      customer: job.customer,
      part_name: job.part_name,
      quantity: job.quantity,
      priority: priorityCalc,
      status: job.status,
      due_date: job.due_date,
      remaining_hours: Math.round(remainingHours * 10) / 10,
      assigned_machine: bestMachine ? { id: bestMachine.machine_id, name: bestMachine.machine_name, load_pct: bestMachine.current_load_pct } : null,
      estimated_completion_days: estimatedDays,
      on_track: daysBetween("2025-02-07", job.due_date) >= estimatedDays,
    };
  }).sort((a, b) => b.priority.score - a.priority.score);

  const atRisk = schedule.filter(s => !s.on_track);
  const late = schedule.filter(s => s.status === "late");

  return {
    action: "job_schedule",
    total_jobs: schedule.length,
    schedule,
    summary: {
      jobs_on_track: schedule.filter(s => s.on_track).length,
      jobs_at_risk: atRisk.length,
      jobs_late: late.length,
      total_remaining_hours: Math.round(schedule.reduce((s, j) => s + j.remaining_hours, 0) * 10) / 10,
      highest_priority: schedule[0]?.job_id || "none",
    },
  };
}

function handleJobPriority(params: Record<string, unknown>): unknown {
  const minScore = (params.min_score as number) || 0;

  const priorities = JOB_QUEUE
    .filter(j => j.status !== "completed")
    .map(job => {
      const calc = calculateJobPriority(job);
      return {
        job_id: job.job_id,
        customer: job.customer,
        part_name: job.part_name,
        due_date: job.due_date,
        status: job.status,
        priority_label: job.priority,
        ...calc,
      };
    })
    .filter(p => p.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return {
    action: "job_priority",
    total_ranked: priorities.length,
    rankings: priorities,
    summary: {
      critical_count: priorities.filter(p => p.urgency === "CRITICAL").length,
      high_count: priorities.filter(p => p.urgency === "HIGH").length,
      medium_count: priorities.filter(p => p.urgency === "MEDIUM").length,
      low_count: priorities.filter(p => p.urgency === "LOW").length,
      avg_score: priorities.length > 0 ? Math.round(priorities.reduce((s, p) => s + p.score, 0) / priorities.length * 10) / 10 : 0,
    },
  };
}

function handleJobStatus(params: Record<string, unknown>): unknown {
  const jobId = params.job_id as string | undefined;
  const statusFilter = params.status as string | undefined;
  const customer = params.customer as string | undefined;

  let jobs = JOB_QUEUE;
  if (jobId) jobs = jobs.filter(j => j.job_id === jobId);
  if (statusFilter) jobs = jobs.filter(j => j.status === statusFilter);
  if (customer) jobs = jobs.filter(j => j.customer.toLowerCase().includes((customer as string).toLowerCase()));

  const statuses = jobs.map(job => {
    const progressPct = job.estimated_hours > 0
      ? Math.round(((job.actual_hours || 0) / job.estimated_hours) * 100)
      : 0;
    const daysToDeadline = daysBetween("2025-02-07", job.due_date);
    const isOnTime = job.status !== "late" && daysToDeadline >= 0;

    return {
      job_id: job.job_id,
      customer: job.customer,
      part_name: job.part_name,
      quantity: job.quantity,
      status: job.status,
      priority: job.priority,
      due_date: job.due_date,
      days_to_deadline: daysToDeadline,
      progress_pct: progressPct,
      estimated_hours: job.estimated_hours,
      actual_hours: job.actual_hours || 0,
      remaining_hours: Math.round((job.estimated_hours - (job.actual_hours || 0)) * 10) / 10,
      assigned_machine: job.assigned_machine || "unassigned",
      is_on_time: isOnTime,
      operations_count: job.operations.length,
    };
  });

  const statusBreakdown = {
    queued: statuses.filter(s => s.status === "queued").length,
    scheduled: statuses.filter(s => s.status === "scheduled").length,
    in_progress: statuses.filter(s => s.status === "in_progress").length,
    on_hold: statuses.filter(s => s.status === "on_hold").length,
    completed: statuses.filter(s => s.status === "completed").length,
    late: statuses.filter(s => s.status === "late").length,
  };

  return {
    action: "job_status",
    total_jobs: statuses.length,
    jobs: statuses,
    summary: {
      status_breakdown: statusBreakdown,
      on_time_pct: statuses.length > 0 ? Math.round(statuses.filter(s => s.is_on_time).length / statuses.length * 100) : 0,
      avg_progress_pct: statuses.length > 0 ? Math.round(statuses.reduce((s, j) => s + j.progress_pct, 0) / statuses.length) : 0,
      total_remaining_hours: Math.round(statuses.reduce((s, j) => s + j.remaining_hours, 0) * 10) / 10,
    },
  };
}

function handleJobReschedule(params: Record<string, unknown>): unknown {
  const reason = (params.reason as string) || "general";
  const affectedMachine = params.machine_id as string | undefined;
  const rushJobId = params.rush_job_id as string | undefined;

  // Find affected jobs
  let affectedJobs = JOB_QUEUE.filter(j => j.status !== "completed");
  if (affectedMachine) {
    affectedJobs = affectedJobs.filter(j =>
      j.assigned_machine === affectedMachine ||
      j.operations.some(op => {
        const machine = MACHINE_SLOTS.find(m => m.machine_id === affectedMachine);
        return machine && op.machine_type === machine.machine_type;
      })
    );
  }

  // Calculate reschedule impacts
  const impacts = affectedJobs.map(job => {
    const calc = calculateJobPriority(job);
    const originalDeadlineDays = daysBetween("2025-02-07", job.due_date);
    const delayDays = reason === "machine_failure" ? 3 : reason === "rush_order" ? 1 : 2;
    const newDeadlineDays = originalDeadlineDays - delayDays;
    const willBeLate = newDeadlineDays < 0;

    // Propose alternatives
    const alternatives: string[] = [];
    if (willBeLate && job.priority !== "critical") alternatives.push("Split batch: deliver partial quantity on time");
    if (affectedMachine) {
      const altMachines = MACHINE_SLOTS.filter(m =>
        m.machine_id !== affectedMachine &&
        m.current_load_pct < 70 &&
        job.operations.some(op => op.machine_type === m.machine_type)
      );
      if (altMachines.length > 0) alternatives.push(`Move to ${altMachines[0].machine_name} (${altMachines[0].current_load_pct}% loaded)`);
    }
    if (job.priority !== "critical") alternatives.push("Negotiate extended deadline with customer");
    alternatives.push("Authorize overtime to recover schedule");

    return {
      job_id: job.job_id,
      customer: job.customer,
      part_name: job.part_name,
      priority: job.priority,
      priority_score: calc.score,
      original_due: job.due_date,
      delay_days: delayDays,
      will_be_late: willBeLate,
      alternatives,
      recommended_action: alternatives[0] || "No action available",
    };
  }).sort((a, b) => b.priority_score - a.priority_score);

  return {
    action: "job_reschedule",
    reason,
    affected_machine: affectedMachine || "all",
    total_affected: impacts.length,
    impacts,
    summary: {
      jobs_will_be_late: impacts.filter(i => i.will_be_late).length,
      critical_jobs_affected: impacts.filter(i => i.priority === "critical").length,
      avg_delay_days: impacts.length > 0 ? Math.round(impacts.reduce((s, i) => s + i.delay_days, 0) / impacts.length * 10) / 10 : 0,
      total_alternatives_proposed: impacts.reduce((s, i) => s + i.alternatives.length, 0),
    },
  };
}

// ─── Public Dispatcher ────────────────────────────────────────────────────────

export function executeJobSchedulingAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "job_schedule":    return handleJobSchedule(params);
    case "job_priority":    return handleJobPriority(params);
    case "job_status":      return handleJobStatus(params);
    case "job_reschedule":  return handleJobReschedule(params);
    default:
      throw new Error(`JobSchedulingEngine: unknown action "${action}"`);
  }
}
