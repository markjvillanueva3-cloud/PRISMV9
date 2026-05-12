/**
 * ShopFloorScheduleEngine — Production Scheduling & Capacity
 * ===========================================================
 *
 * Manages production scheduling, machine capacity allocation,
 * job sequencing, and due date projections.
 *
 * L2-P4-MS1/P0-U01 — Batch 1: Shop Floor Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ScheduledOperationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  operationCode: z.string(),
  description: z.string(),
  machineId: z.string(),
  machineName: z.string(),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  durationMinutes: z.number(),
  status: z.enum(["scheduled", "in_progress", "complete", "delayed"]),
  priority: z.number(),
});

export const MachineCapacitySchema = z.object({
  machineId: z.string(),
  machineName: z.string(),
  machineType: z.string(),
  availableHoursToday: z.number(),
  scheduledHours: z.number(),
  utilizationPercent: z.number(),
  nextAvailableSlot: z.string(),
  scheduledOperations: z.array(ScheduledOperationSchema),
});

export const ScheduleRequestSchema = z.object({
  jobId: z.string(),
  operationCode: z.string(),
  machineId: z.string(),
  durationMinutes: z.number(),
  priority: z.number().default(5),
  preferredStart: z.string().optional(),
});

export const CapacityQuerySchema = z.object({
  machineType: z.string().optional(),
  department: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScheduledOperation = z.infer<typeof ScheduledOperationSchema>;
export type MachineCapacity = z.infer<typeof MachineCapacitySchema>;
export type ScheduleRequest = z.infer<typeof ScheduleRequestSchema>;
export type CapacityQuery = z.infer<typeof CapacityQuerySchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const machines: { id: string; name: string; type: string; department: string }[] = [
  { id: "okuma-lb3000-1", name: "Okuma LB3000 EX II #1", type: "lathe", department: "Lathe" },
  { id: "okuma-lb3000-2", name: "Okuma LB3000 EX II #2", type: "lathe", department: "Lathe" },
  { id: "haas-vf2ss-1", name: "Haas VF-2SS #1", type: "mill", department: "Mill" },
  { id: "hurco-vm10", name: "Hurco VM10", type: "mill", department: "Mill" },
  { id: "mitsubishi-mv1200r", name: "Mitsubishi MV1200R", type: "wire_edm", department: "Wire EDM" },
];

const scheduleStore: Map<string, ScheduledOperation[]> = new Map();
let scheduleCounter = 1;

// Seed with sample scheduled operations
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const sampleSchedule: ScheduledOperation[] = [
  {
    id: "SCH-001",
    jobId: "JOB-2024-001",
    operationCode: "OP10",
    description: "Turn OD",
    machineId: "okuma-lb3000-1",
    machineName: "Okuma LB3000 EX II #1",
    scheduledStart: today.toISOString(),
    scheduledEnd: new Date(today.getTime() + 4 * 3600000).toISOString(),
    durationMinutes: 240,
    status: "in_progress",
    priority: 1,
  },
  {
    id: "SCH-002",
    jobId: "JOB-2024-002",
    operationCode: "OP10",
    description: "Mill Pockets",
    machineId: "haas-vf2ss-1",
    machineName: "Haas VF-2SS #1",
    scheduledStart: new Date(today.getTime() + 2 * 3600000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 6 * 3600000).toISOString(),
    durationMinutes: 240,
    status: "scheduled",
    priority: 2,
  },
];

sampleSchedule.forEach(op => {
  const machineOps = scheduleStore.get(op.machineId) || [];
  machineOps.push(op);
  scheduleStore.set(op.machineId, machineOps);
});

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ShopFloorScheduleEngine {
  /**
   * Schedule an operation on a machine
   * @param request - Schedule request parameters
   * @returns Scheduled operation
   */
  static scheduleOperation(request: ScheduleRequest): ScheduledOperation {
    const validated = ScheduleRequestSchema.parse(request);
    const machine = machines.find(m => m.id === validated.machineId);
    if (!machine) {
      throw new Error(`Machine ${validated.machineId} not found`);
    }

    const existingOps = scheduleStore.get(validated.machineId) || [];
    let scheduledStart: Date;

    if (validated.preferredStart) {
      scheduledStart = new Date(validated.preferredStart);
    } else {
      const lastOp = existingOps.sort((a, b) => new Date(b.scheduledEnd).getTime() - new Date(a.scheduledEnd).getTime())[0];
      scheduledStart = lastOp ? new Date(lastOp.scheduledEnd) : new Date();
    }

    const scheduledEnd = new Date(scheduledStart.getTime() + validated.durationMinutes * 60000);

    const operation: ScheduledOperation = {
      id: `SCH-${++scheduleCounter}`,
      jobId: validated.jobId,
      operationCode: validated.operationCode,
      description: `Operation ${validated.operationCode}`,
      machineId: validated.machineId,
      machineName: machine.name,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      durationMinutes: validated.durationMinutes,
      status: "scheduled",
      priority: validated.priority,
    };

    existingOps.push(operation);
    existingOps.sort((a, b) => a.priority - b.priority);
    scheduleStore.set(validated.machineId, existingOps);

    return operation;
  }

  /**
   * Get machine capacity and scheduled operations
   * @param machineId - Machine identifier
   * @returns Machine capacity details
   */
  static getMachineCapacity(machineId: string): MachineCapacity | undefined {
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return undefined;

    const operations = scheduleStore.get(machineId) || [];
    const today = new Date();
    const todayStart = new Date(today.setHours(6, 0, 0, 0));
    const todayEnd = new Date(today.setHours(22, 0, 0, 0));

    const todayOps = operations.filter(op => {
      const start = new Date(op.scheduledStart);
      return start >= todayStart && start < todayEnd;
    });

    const scheduledMinutes = todayOps.reduce((sum, op) => sum + op.durationMinutes, 0);
    const availableMinutes = 16 * 60; // 16 hour day

    const lastOp = operations.sort((a, b) => new Date(b.scheduledEnd).getTime() - new Date(a.scheduledEnd).getTime())[0];
    const nextAvailable = lastOp ? new Date(lastOp.scheduledEnd) : new Date();

    return {
      machineId,
      machineName: machine.name,
      machineType: machine.type,
      availableHoursToday: Math.round((availableMinutes - scheduledMinutes) / 60 * 10) / 10,
      scheduledHours: Math.round(scheduledMinutes / 60 * 10) / 10,
      utilizationPercent: Math.round((scheduledMinutes / availableMinutes) * 100),
      nextAvailableSlot: nextAvailable.toISOString(),
      scheduledOperations: todayOps,
    };
  }

  /**
   * Get all machine capacities with optional filters
   * @param query - Optional filters
   * @returns Array of machine capacities
   */
  static getAllCapacity(query?: CapacityQuery): MachineCapacity[] {
    let filteredMachines = [...machines];

    if (query?.machineType) {
      filteredMachines = filteredMachines.filter(m => m.type === query.machineType);
    }
    if (query?.department) {
      filteredMachines = filteredMachines.filter(m => m.department === query.department);
    }

    return filteredMachines
      .map(m => this.getMachineCapacity(m.id))
      .filter((c): c is MachineCapacity => c !== undefined);
  }

  /**
   * Get schedule for a specific job
   * @param jobId - Job identifier
   * @returns All scheduled operations for the job
   */
  static getJobSchedule(jobId: string): ScheduledOperation[] {
    const allOps: ScheduledOperation[] = [];
    scheduleStore.forEach(ops => {
      allOps.push(...ops.filter(op => op.jobId === jobId));
    });
    return allOps.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  }

  /**
   * Calculate projected completion date for a job
   * @param jobId - Job identifier
   * @returns Projected completion date
   */
  static getProjectedCompletion(jobId: string): { projectedDate: string; confidence: string; bottleneck: string | null } {
    const schedule = this.getJobSchedule(jobId);
    if (schedule.length === 0) {
      return { projectedDate: "Not scheduled", confidence: "none", bottleneck: null };
    }

    const lastOp = schedule[schedule.length - 1];
    const hasDelays = schedule.some(op => op.status === "delayed");

    return {
      projectedDate: lastOp.scheduledEnd,
      confidence: hasDelays ? "low" : "high",
      bottleneck: hasDelays ? schedule.find(op => op.status === "delayed")?.machineName || null : null,
    };
  }

  /**
   * Reschedule an operation
   * @param operationId - Operation identifier
   * @param newStart - New start time
   * @returns Updated operation
   */
  static rescheduleOperation(operationId: string, newStart: string): ScheduledOperation | undefined {
    for (const [machineId, ops] of scheduleStore.entries()) {
      const opIndex = ops.findIndex(op => op.id === operationId);
      if (opIndex >= 0) {
        const op = ops[opIndex];
        const newStartDate = new Date(newStart);
        const newEndDate = new Date(newStartDate.getTime() + op.durationMinutes * 60000);

        op.scheduledStart = newStartDate.toISOString();
        op.scheduledEnd = newEndDate.toISOString();
        scheduleStore.set(machineId, ops);
        return op;
      }
    }
    return undefined;
  }

  /**
   * Find available slot for an operation
   * @param machineType - Type of machine needed
   * @param durationMinutes - Required duration
   * @returns Available slot information
   */
  static findAvailableSlot(machineType: string, durationMinutes: number): { machineId: string; machineName: string; availableStart: string } | null {
    const typeMachines = machines.filter(m => m.type === machineType);
    if (typeMachines.length === 0) return null;

    let earliest: { machineId: string; machineName: string; availableStart: Date } | null = null;

    for (const machine of typeMachines) {
      const capacity = this.getMachineCapacity(machine.id);
      if (capacity) {
        const availableStart = new Date(capacity.nextAvailableSlot);
        if (!earliest || availableStart < earliest.availableStart) {
          earliest = { machineId: machine.id, machineName: machine.name, availableStart };
        }
      }
    }

    return earliest ? { ...earliest, availableStart: earliest.availableStart.toISOString() } : null;
  }

  static getSelfAwareness() {
    return {
      name: "ShopFloorScheduleEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["scheduleOperation", "getMachineCapacity", "getAllCapacity", "getJobSchedule", "getProjectedCompletion", "rescheduleOperation", "findAvailableSlot"],
      dependencies: [],
    };
  }
}

export const shopFloorScheduleEngine = new ShopFloorScheduleEngine();
