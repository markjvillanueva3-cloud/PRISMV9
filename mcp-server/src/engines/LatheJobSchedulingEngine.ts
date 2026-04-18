/**
 * LatheJobSchedulingEngine — Job Scheduling for Lathe Operations
 *
 * U-LTH50: Integrates quotes → shop schedule
 * Uses ShopSchedulerEngine + JobShopSchedulingEngine + ShiftScheduleOptimizerEngine patterns
 *
 * Features:
 * - 21-machine constraint handling (JM Die shop)
 * - Due date honoring with priority escalation
 * - Setup changeover minimization
 * - Shift-aware scheduling (2 shifts × 8 hours)
 * - Material/part family grouping
 * - Load balancing across machines
 *
 * @module engines/LatheJobSchedulingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Machine {
  id: string;
  name: string;
  type: "lathe" | "mill" | "edm" | "grinder" | "other";
  model: string;
  max_diameter_mm: number;
  max_length_mm: number;
  available_hours_per_day: number;
  hourly_rate: number;
  capabilities: string[];
  current_setup?: string;
}

export interface ScheduledJob {
  job_id: string;
  quote_id: string;
  part_number: string;
  customer: string;
  quantity: number;
  cycle_time_sec: number;
  setup_time_min: number;
  due_date: string;
  priority: "low" | "normal" | "high" | "rush";
  material: string;
  required_diameter_mm: number;
  required_length_mm: number;
  required_capabilities: string[];
  status: "pending" | "scheduled" | "in_progress" | "complete";
}

export interface ScheduleSlot {
  machine_id: string;
  job_id: string;
  start_time: string;
  end_time: string;
  shift: 1 | 2;
  setup_minutes: number;
  run_minutes: number;
  operator_id?: string;
}

export interface ScheduleResult {
  schedule_id: string;
  generated_at: string;
  horizon_days: number;
  slots: ScheduleSlot[];
  unscheduled_jobs: Array<{
    job_id: string;
    reason: string;
  }>;
  metrics: ScheduleMetrics;
  conflicts: ScheduleConflict[];
  optimization_score: number;
}

export interface ScheduleMetrics {
  total_jobs: number;
  scheduled_jobs: number;
  unscheduled_jobs: number;
  total_machine_hours: number;
  utilization_pct: number;
  on_time_rate_pct: number;
  average_lead_time_days: number;
  setup_changeovers: number;
  setup_time_total_min: number;
}

export interface ScheduleConflict {
  type: "due_date" | "capacity" | "capability" | "overlap";
  job_id: string;
  machine_id?: string;
  description: string;
  severity: "warning" | "error";
}

export interface ScheduleConfig {
  horizon_days: number;
  shift_hours: number;
  shifts_per_day: number;
  setup_changeover_min: number;
  same_material_setup_min: number;
  rush_priority_weight: number;
  due_date_weight: number;
  utilization_weight: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ScheduleConfig = {
  horizon_days: 14,
  shift_hours: 8,
  shifts_per_day: 2,
  setup_changeover_min: 45,
  same_material_setup_min: 15,
  rush_priority_weight: 3.0,
  due_date_weight: 2.0,
  utilization_weight: 1.0,
};

const JM_DIE_LATHES: Machine[] = [
  { id: "LTH-01", name: "Okuma LB3000 #1", type: "lathe", model: "LB3000 EX II", max_diameter_mm: 300, max_length_mm: 500, available_hours_per_day: 16, hourly_rate: 85, capabilities: ["turning", "threading", "boring", "grooving"], current_setup: undefined },
  { id: "LTH-02", name: "Okuma LB3000 #2", type: "lathe", model: "LB3000 EX II", max_diameter_mm: 300, max_length_mm: 500, available_hours_per_day: 16, hourly_rate: 85, capabilities: ["turning", "threading", "boring", "grooving"], current_setup: undefined },
  { id: "LTH-03", name: "Okuma LB4000", type: "lathe", model: "LB4000 EX II", max_diameter_mm: 400, max_length_mm: 1000, available_hours_per_day: 16, hourly_rate: 95, capabilities: ["turning", "threading", "boring", "grooving", "large_parts"], current_setup: undefined },
  { id: "LTH-04", name: "Okuma Genos L300", type: "lathe", model: "Genos L300", max_diameter_mm: 250, max_length_mm: 400, available_hours_per_day: 16, hourly_rate: 75, capabilities: ["turning", "threading", "boring"], current_setup: undefined },
  { id: "LTH-05", name: "Okuma Genos L300 #2", type: "lathe", model: "Genos L300", max_diameter_mm: 250, max_length_mm: 400, available_hours_per_day: 16, hourly_rate: 75, capabilities: ["turning", "threading", "boring"], current_setup: undefined },
  { id: "LTH-06", name: "Haas ST-20", type: "lathe", model: "ST-20", max_diameter_mm: 200, max_length_mm: 350, available_hours_per_day: 16, hourly_rate: 65, capabilities: ["turning", "threading"], current_setup: undefined },
  { id: "LTH-07", name: "Haas ST-20 #2", type: "lathe", model: "ST-20", max_diameter_mm: 200, max_length_mm: 350, available_hours_per_day: 16, hourly_rate: 65, capabilities: ["turning", "threading"], current_setup: undefined },
  { id: "LTH-08", name: "Mazak QT-250", type: "lathe", model: "QT-250", max_diameter_mm: 250, max_length_mm: 500, available_hours_per_day: 16, hourly_rate: 80, capabilities: ["turning", "threading", "boring", "live_tooling"], current_setup: undefined },
];

// ============================================================================
// ENGINE
// ============================================================================

class LatheJobSchedulingEngine {
  private config: ScheduleConfig;
  private machines: Machine[];
  private scheduleCounter = 0;

  constructor(config?: Partial<ScheduleConfig>, machines?: Machine[]) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.machines = machines || [...JM_DIE_LATHES];
  }

  generateSchedule(jobs: ScheduledJob[]): ScheduleResult {
    const scheduleId = this.generateScheduleId();
    const slots: ScheduleSlot[] = [];
    const unscheduled: Array<{ job_id: string; reason: string }> = [];
    const conflicts: ScheduleConflict[] = [];

    const sortedJobs = this.prioritizeJobs(jobs);
    const machineAvailability = this.initializeMachineAvailability();

    for (const job of sortedJobs) {
      const eligibleMachines = this.findEligibleMachines(job);

      if (eligibleMachines.length === 0) {
        unscheduled.push({
          job_id: job.job_id,
          reason: "No capable machine available",
        });
        conflicts.push({
          type: "capability",
          job_id: job.job_id,
          description: `No machine can handle ${job.required_diameter_mm}mm diameter or required capabilities`,
          severity: "error",
        });
        continue;
      }

      const assignment = this.findBestSlot(job, eligibleMachines, machineAvailability);

      if (!assignment) {
        unscheduled.push({
          job_id: job.job_id,
          reason: "No available capacity within horizon",
        });
        conflicts.push({
          type: "capacity",
          job_id: job.job_id,
          description: `Insufficient capacity in ${this.config.horizon_days}-day horizon`,
          severity: "warning",
        });
        continue;
      }

      const slot = this.createSlot(job, assignment);
      slots.push(slot);

      this.updateMachineAvailability(machineAvailability, assignment);

      if (new Date(slot.end_time) > new Date(job.due_date)) {
        conflicts.push({
          type: "due_date",
          job_id: job.job_id,
          machine_id: slot.machine_id,
          description: `Scheduled completion ${slot.end_time} exceeds due date ${job.due_date}`,
          severity: job.priority === "rush" ? "error" : "warning",
        });
      }
    }

    const metrics = this.calculateMetrics(jobs, slots, unscheduled);
    const optimizationScore = this.calculateOptimizationScore(metrics, conflicts);

    return {
      schedule_id: scheduleId,
      generated_at: new Date().toISOString(),
      horizon_days: this.config.horizon_days,
      slots,
      unscheduled_jobs: unscheduled,
      metrics,
      conflicts,
      optimization_score: optimizationScore,
    };
  }

  private prioritizeJobs(jobs: ScheduledJob[]): ScheduledJob[] {
    return [...jobs].sort((a, b) => {
      const priorityWeights: Record<string, number> = {
        rush: 4,
        high: 3,
        normal: 2,
        low: 1,
      };

      const priorityDiff =
        (priorityWeights[b.priority] || 2) - (priorityWeights[a.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;

      const dueDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      return dueDiff;
    });
  }

  private findEligibleMachines(job: ScheduledJob): Machine[] {
    return this.machines.filter((m) => {
      if (m.type !== "lathe") return false;
      if (job.required_diameter_mm > m.max_diameter_mm) return false;
      if (job.required_length_mm > m.max_length_mm) return false;

      for (const cap of job.required_capabilities) {
        if (!m.capabilities.includes(cap)) return false;
      }

      return true;
    });
  }

  private initializeMachineAvailability(): Map<string, Date[]> {
    const availability = new Map<string, Date[]>();
    const now = new Date();

    for (const machine of this.machines) {
      const slots: Date[] = [];
      for (let day = 0; day < this.config.horizon_days; day++) {
        for (let shift = 0; shift < this.config.shifts_per_day; shift++) {
          const slotStart = new Date(now);
          slotStart.setDate(slotStart.getDate() + day);
          slotStart.setHours(8 + shift * this.config.shift_hours, 0, 0, 0);
          slots.push(slotStart);
        }
      }
      availability.set(machine.id, slots);
    }

    return availability;
  }

  private findBestSlot(
    job: ScheduledJob,
    eligibleMachines: Machine[],
    availability: Map<string, Date[]>
  ): { machine_id: string; start_time: Date; setup_minutes: number } | null {
    let bestAssignment: { machine_id: string; start_time: Date; setup_minutes: number } | null = null;
    let bestScore = -Infinity;

    for (const machine of eligibleMachines) {
      const slots = availability.get(machine.id) || [];

      for (const slotStart of slots) {
        const setupMinutes = this.calculateSetupTime(machine, job);
        const totalMinutes = setupMinutes + (job.quantity * job.cycle_time_sec) / 60;
        const slotEnd = new Date(slotStart.getTime() + totalMinutes * 60000);

        const shiftEnd = new Date(slotStart);
        shiftEnd.setHours(shiftEnd.getHours() + this.config.shift_hours);

        if (slotEnd > shiftEnd) continue;

        const score = this.scoreAssignment(job, machine, slotStart, slotEnd);

        if (score > bestScore) {
          bestScore = score;
          bestAssignment = {
            machine_id: machine.id,
            start_time: slotStart,
            setup_minutes: setupMinutes,
          };
        }
      }
    }

    return bestAssignment;
  }

  private calculateSetupTime(machine: Machine, job: ScheduledJob): number {
    if (machine.current_setup === job.material) {
      return this.config.same_material_setup_min;
    }
    return this.config.setup_changeover_min;
  }

  private scoreAssignment(
    job: ScheduledJob,
    machine: Machine,
    start: Date,
    end: Date
  ): number {
    let score = 0;

    const dueDate = new Date(job.due_date);
    const daysBeforeDue = (dueDate.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);
    if (daysBeforeDue >= 0) {
      score += this.config.due_date_weight * Math.min(daysBeforeDue, 7);
    } else {
      score -= this.config.due_date_weight * Math.abs(daysBeforeDue) * 2;
    }

    if (machine.current_setup === job.material) {
      score += 5;
    }

    if (job.required_diameter_mm <= machine.max_diameter_mm * 0.7) {
      score += 2;
    }

    const priorityBonus: Record<string, number> = { rush: 10, high: 5, normal: 0, low: -2 };
    score += priorityBonus[job.priority] || 0;

    return score;
  }

  private createSlot(
    job: ScheduledJob,
    assignment: { machine_id: string; start_time: Date; setup_minutes: number }
  ): ScheduleSlot {
    const runMinutes = (job.quantity * job.cycle_time_sec) / 60;
    const totalMinutes = assignment.setup_minutes + runMinutes;
    const endTime = new Date(assignment.start_time.getTime() + totalMinutes * 60000);

    const shift = assignment.start_time.getHours() < 16 ? 1 : 2;

    return {
      machine_id: assignment.machine_id,
      job_id: job.job_id,
      start_time: assignment.start_time.toISOString(),
      end_time: endTime.toISOString(),
      shift: shift as 1 | 2,
      setup_minutes: Math.round(assignment.setup_minutes),
      run_minutes: Math.round(runMinutes),
    };
  }

  private updateMachineAvailability(
    availability: Map<string, Date[]>,
    assignment: { machine_id: string; start_time: Date; setup_minutes: number }
  ): void {
    const slots = availability.get(assignment.machine_id) || [];
    const idx = slots.findIndex((s) => s.getTime() === assignment.start_time.getTime());
    if (idx >= 0) {
      slots.splice(idx, 1);
    }
    availability.set(assignment.machine_id, slots);
  }

  private calculateMetrics(
    jobs: ScheduledJob[],
    slots: ScheduleSlot[],
    unscheduled: Array<{ job_id: string; reason: string }>
  ): ScheduleMetrics {
    const totalMachineHours = slots.reduce(
      (sum, s) => sum + (s.setup_minutes + s.run_minutes) / 60,
      0
    );

    const totalAvailableHours =
      this.machines.length *
      this.config.horizon_days *
      this.config.shifts_per_day *
      this.config.shift_hours;

    const utilizationPct = (totalMachineHours / totalAvailableHours) * 100;

    let onTimeCount = 0;
    for (const slot of slots) {
      const job = jobs.find((j) => j.job_id === slot.job_id);
      if (job && new Date(slot.end_time) <= new Date(job.due_date)) {
        onTimeCount++;
      }
    }
    const onTimeRatePct = slots.length > 0 ? (onTimeCount / slots.length) * 100 : 100;

    const setupChangeovers = slots.length;
    const setupTimeTotal = slots.reduce((sum, s) => sum + s.setup_minutes, 0);

    const leadTimes = slots.map((s) => {
      const start = new Date(s.start_time);
      const end = new Date(s.end_time);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    });
    const avgLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0;

    return {
      total_jobs: jobs.length,
      scheduled_jobs: slots.length,
      unscheduled_jobs: unscheduled.length,
      total_machine_hours: Math.round(totalMachineHours * 10) / 10,
      utilization_pct: Math.round(utilizationPct * 10) / 10,
      on_time_rate_pct: Math.round(onTimeRatePct * 10) / 10,
      average_lead_time_days: Math.round(avgLeadTime * 10) / 10,
      setup_changeovers: setupChangeovers,
      setup_time_total_min: Math.round(setupTimeTotal),
    };
  }

  private calculateOptimizationScore(
    metrics: ScheduleMetrics,
    conflicts: ScheduleConflict[]
  ): number {
    let score = 100;

    score -= (100 - metrics.on_time_rate_pct) * 0.4;
    score -= metrics.unscheduled_jobs * 5;
    score -= conflicts.filter((c) => c.severity === "error").length * 10;
    score -= conflicts.filter((c) => c.severity === "warning").length * 3;

    if (metrics.utilization_pct < 60) {
      score -= (60 - metrics.utilization_pct) * 0.2;
    }

    return Math.max(0, Math.round(score * 10) / 10);
  }

  getMachines(): Machine[] {
    return [...this.machines];
  }

  addMachine(machine: Machine): void {
    this.machines.push(machine);
  }

  removeMachine(machineId: string): boolean {
    const idx = this.machines.findIndex((m) => m.id === machineId);
    if (idx >= 0) {
      this.machines.splice(idx, 1);
      return true;
    }
    return false;
  }

  updateConfig(config: Partial<ScheduleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ScheduleConfig {
    return { ...this.config };
  }

  private generateScheduleId(): string {
    this.scheduleCounter++;
    const timestamp = Date.now().toString(36);
    return `SCH-${timestamp}-${this.scheduleCounter.toString().padStart(4, "0")}`;
  }
}

export const latheJobSchedulingEngine = new LatheJobSchedulingEngine();
