/**
 * ShopFloorJobEngine — Job Tracking & Work Order Management
 * ==========================================================
 *
 * Manages job lifecycle, work orders, operation sequences, and
 * quantity tracking on the shop floor.
 *
 * L2-P4-MS1/P0-U01 — Batch 1: Shop Floor Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const OperationSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  code: z.string(),
  description: z.string(),
  department: z.string(),
  machineType: z.string().optional(),
  setupMinutes: z.number(),
  cycleMinutes: z.number(),
  quantityComplete: z.number().default(0),
  status: z.enum(["pending", "in_progress", "complete", "skipped"]),
});

export const JobSchema = z.object({
  jobId: z.string(),
  partNumber: z.string(),
  revision: z.string().default("A"),
  customer: z.string(),
  quantityRequired: z.number(),
  quantityComplete: z.number().default(0),
  quantityScrap: z.number().default(0),
  dueDate: z.string(),
  priority: z.enum(["critical", "high", "normal", "low"]),
  status: z.enum(["not_started", "in_progress", "on_hold", "complete", "cancelled"]),
  operations: z.array(OperationSchema),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const JobCreateInputSchema = z.object({
  partNumber: z.string(),
  revision: z.string().default("A"),
  customer: z.string(),
  quantityRequired: z.number().min(1),
  dueDate: z.string(),
  priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
  operations: z.array(z.object({
    code: z.string(),
    description: z.string(),
    department: z.string(),
    machineType: z.string().optional(),
    setupMinutes: z.number(),
    cycleMinutes: z.number(),
  })),
  notes: z.string().optional(),
});

export const JobUpdateInputSchema = z.object({
  jobId: z.string(),
  quantityComplete: z.number().optional(),
  quantityScrap: z.number().optional(),
  status: z.enum(["not_started", "in_progress", "on_hold", "complete", "cancelled"]).optional(),
  priority: z.enum(["critical", "high", "normal", "low"]).optional(),
  notes: z.string().optional(),
});

export const OperationCompleteInputSchema = z.object({
  jobId: z.string(),
  operationId: z.string(),
  quantityComplete: z.number(),
  quantityScrap: z.number().default(0),
  operatorId: z.string().optional(),
  machineId: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Operation = z.infer<typeof OperationSchema>;
export type Job = z.infer<typeof JobSchema>;
export type JobCreateInput = z.infer<typeof JobCreateInputSchema>;
export type JobUpdateInput = z.infer<typeof JobUpdateInputSchema>;
export type OperationCompleteInput = z.infer<typeof OperationCompleteInputSchema>;

// ─── Mock Data Store ──────────────────────────────────────────────────────────

const jobStore: Map<string, Job> = new Map();
let jobCounter = 1000;

// Seed with sample jobs
const sampleJobs: Job[] = [
  {
    jobId: "JOB-2024-001",
    partNumber: "DIE-4512-A",
    revision: "B",
    customer: "ALCOA",
    quantityRequired: 50,
    quantityComplete: 32,
    quantityScrap: 2,
    dueDate: "2024-12-20",
    priority: "high",
    status: "in_progress",
    operations: [
      { id: "OP1", sequence: 10, code: "OP10", description: "Turn OD", department: "Lathe", machineType: "lathe", setupMinutes: 30, cycleMinutes: 8, quantityComplete: 50, status: "complete" },
      { id: "OP2", sequence: 20, code: "OP20", description: "Mill Flats", department: "Mill", machineType: "mill", setupMinutes: 45, cycleMinutes: 12, quantityComplete: 32, status: "in_progress" },
      { id: "OP3", sequence: 30, code: "OP30", description: "Heat Treat", department: "Outside", setupMinutes: 0, cycleMinutes: 0, quantityComplete: 0, status: "pending" },
    ],
    createdAt: "2024-12-01T08:00:00Z",
    updatedAt: new Date().toISOString(),
  },
];

sampleJobs.forEach(j => jobStore.set(j.jobId, j));

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ShopFloorJobEngine {
  /**
   * Create a new job
   * @param input - Job creation parameters
   * @returns Created job
   */
  static createJob(input: JobCreateInput): Job {
    const validated = JobCreateInputSchema.parse(input);
    const now = new Date().toISOString();
    const jobId = `JOB-2024-${++jobCounter}`;

    const job: Job = {
      jobId,
      partNumber: validated.partNumber,
      revision: validated.revision,
      customer: validated.customer,
      quantityRequired: validated.quantityRequired,
      quantityComplete: 0,
      quantityScrap: 0,
      dueDate: validated.dueDate,
      priority: validated.priority,
      status: "not_started",
      operations: validated.operations.map((op, idx) => ({
        id: `OP${idx + 1}`,
        sequence: (idx + 1) * 10,
        code: op.code,
        description: op.description,
        department: op.department,
        machineType: op.machineType,
        setupMinutes: op.setupMinutes,
        cycleMinutes: op.cycleMinutes,
        quantityComplete: 0,
        status: "pending" as const,
      })),
      notes: validated.notes,
      createdAt: now,
      updatedAt: now,
    };

    jobStore.set(jobId, job);
    return job;
  }

  /**
   * Get a job by ID
   * @param jobId - Job identifier
   * @returns Job or undefined
   */
  static getJob(jobId: string): Job | undefined {
    return jobStore.get(jobId);
  }

  /**
   * Get all jobs with optional filters
   * @param filters - Optional status/priority/customer filters
   * @returns Filtered jobs
   */
  static getJobs(filters?: {
    status?: Job["status"];
    priority?: Job["priority"];
    customer?: string;
  }): Job[] {
    let jobs = Array.from(jobStore.values());

    if (filters?.status) {
      jobs = jobs.filter(j => j.status === filters.status);
    }
    if (filters?.priority) {
      jobs = jobs.filter(j => j.priority === filters.priority);
    }
    if (filters?.customer) {
      jobs = jobs.filter(j => j.customer.toLowerCase().includes(filters.customer!.toLowerCase()));
    }

    return jobs.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Update job properties
   * @param input - Update parameters
   * @returns Updated job
   */
  static updateJob(input: JobUpdateInput): Job | undefined {
    const validated = JobUpdateInputSchema.parse(input);
    const job = jobStore.get(validated.jobId);
    if (!job) return undefined;

    if (validated.quantityComplete !== undefined) job.quantityComplete = validated.quantityComplete;
    if (validated.quantityScrap !== undefined) job.quantityScrap = validated.quantityScrap;
    if (validated.status !== undefined) job.status = validated.status;
    if (validated.priority !== undefined) job.priority = validated.priority;
    if (validated.notes !== undefined) job.notes = validated.notes;
    job.updatedAt = new Date().toISOString();

    jobStore.set(job.jobId, job);
    return job;
  }

  /**
   * Complete an operation within a job
   * @param input - Operation completion data
   * @returns Updated job
   */
  static completeOperation(input: OperationCompleteInput): Job | undefined {
    const validated = OperationCompleteInputSchema.parse(input);
    const job = jobStore.get(validated.jobId);
    if (!job) return undefined;

    const op = job.operations.find(o => o.id === validated.operationId);
    if (!op) return undefined;

    op.quantityComplete = validated.quantityComplete;
    op.status = validated.quantityComplete >= job.quantityRequired ? "complete" : "in_progress";
    job.updatedAt = new Date().toISOString();

    if (job.status === "not_started") {
      job.status = "in_progress";
    }

    const lastOp = job.operations[job.operations.length - 1];
    if (lastOp.status === "complete") {
      job.status = "complete";
      job.quantityComplete = lastOp.quantityComplete;
    }

    jobStore.set(job.jobId, job);
    return job;
  }

  /**
   * Get jobs due soon
   * @param daysAhead - Days to look ahead
   * @returns Jobs due within the specified window
   */
  static getJobsDueSoon(daysAhead: number = 7): Job[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return Array.from(jobStore.values())
      .filter(j => j.status !== "complete" && j.status !== "cancelled")
      .filter(j => new Date(j.dueDate) <= cutoff)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  /**
   * Calculate job completion percentage
   * @param jobId - Job identifier
   * @returns Completion percentage 0-100
   */
  static calculateCompletion(jobId: string): number {
    const job = jobStore.get(jobId);
    if (!job || job.operations.length === 0) return 0;

    const totalOps = job.operations.length;
    const completeOps = job.operations.filter(o => o.status === "complete").length;
    const inProgressOps = job.operations.filter(o => o.status === "in_progress").length;

    return Math.round(((completeOps + inProgressOps * 0.5) / totalOps) * 100);
  }

  static getSelfAwareness() {
    return {
      name: "ShopFloorJobEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["createJob", "getJob", "getJobs", "updateJob", "completeOperation", "getJobsDueSoon", "calculateCompletion"],
      dependencies: [],
    };
  }
}

export const shopFloorJobEngine = new ShopFloorJobEngine();
