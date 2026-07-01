/**
 * MachineDispatchEngine — Session 6-7 U-TRAV2
 *
 * Machine-centric job dispatch queue and planning board. Manages which jobs
 * run on which machines in what order, with priority reordering and what-if
 * scheduling simulation.
 *
 * NOT a duplicate of ShopSchedulerEngine — that handles priority dispatch rules.
 * This engine manages the live queue per machine with estimated start/complete
 * times and provides the planning board view across all machines.
 *
 * NOT a duplicate of CapacityPlanningEngine — that plans capacity over weeks/months.
 * This engine manages the real-time dispatch queue (today/this shift).
 *
 * Actions: dispatch_queue_job, dispatch_get_queue, dispatch_reorder,
 *          dispatch_get_all_queues, dispatch_what_if, dispatch_remove
 *
 * DB: machine_queue (migration 006)
 */

import { eventBus } from "./EventBus.js";
import { auditEngine } from "./AuditEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type QueueEntryStatus = "queued" | "active" | "complete" | "cancelled";

export interface QueueEntry {
  id: string;
  machine_id: string;
  job_id: string;
  routing_step_id?: string;
  priority: number;
  status: QueueEntryStatus;
  estimated_start?: string;
  estimated_complete?: string;
  actual_start?: string;
  actual_complete?: string;
  queued_at: string;
  queued_by?: string;
}

export interface QueueJobInput {
  machine_id: string;
  job_id: string;
  routing_step_id?: string;
  priority?: number;
  estimated_duration_min?: number;
  queued_by?: string;
}

export interface ReorderInput {
  machine_id: string;
  /** Ordered list of queue entry IDs — first = highest priority */
  order: string[];
  reordered_by?: string;
}

export interface MachineQueue {
  machine_id: string;
  machine_name?: string;
  entries: QueueEntry[];
  active_job?: QueueEntry;
  total_queued: number;
  total_est_min: number;
}

export interface PlanningBoard {
  machines: MachineQueue[];
  total_queued_jobs: number;
  timestamp: string;
}

export interface WhatIfInput {
  machine_id: string;
  /** Insert a hypothetical job at this position (0-based) */
  insert_position: number;
  job_id: string;
  estimated_duration_min: number;
}

export interface WhatIfResult {
  original_queue: QueueEntry[];
  modified_queue: (QueueEntry & { est_start_shifted?: string; est_complete_shifted?: string })[];
  impact: {
    jobs_delayed: number;
    max_delay_min: number;
    total_delay_min: number;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

let queueSeq = 0;

export class MachineDispatchEngine {
  private entries: Map<string, QueueEntry> = new Map();
  // Index: machine_id → queue entry ids (ordered by priority)
  private machineQueues: Map<string, string[]> = new Map();

  // ========================================================================
  // QUEUE MANAGEMENT
  // ========================================================================

  /** Add a job to a machine's dispatch queue.
   * @param input - machine_id, job_id, optional priority and estimates
   * @returns the created queue entry
   */
  queueJob(input: QueueJobInput): QueueEntry {
    if (!input.machine_id || input.machine_id.trim().length === 0) {
      throw new Error("machine_id is required");
    }
    if (!input.job_id || input.job_id.trim().length === 0) {
      throw new Error("job_id is required");
    }

    // Check for duplicate — same job+machine+routing_step not already queued
    const existingQueue = this.machineQueues.get(input.machine_id) ?? [];
    for (const eid of existingQueue) {
      const e = this.entries.get(eid)!;
      if (e.job_id === input.job_id && e.status === "queued" &&
          (e.routing_step_id ?? "") === (input.routing_step_id ?? "")) {
        throw new Error(`Job '${input.job_id}' is already queued on machine '${input.machine_id}'`);
      }
    }

    const now = new Date().toISOString();
    const id = `mq-${++queueSeq}-${Date.now().toString(36)}`;
    const priority = input.priority ?? 100;

    const entry: QueueEntry = {
      id,
      machine_id: input.machine_id,
      job_id: input.job_id,
      routing_step_id: input.routing_step_id,
      priority,
      status: "queued",
      queued_at: now,
      queued_by: input.queued_by,
    };

    // Compute estimated start/complete
    if (input.estimated_duration_min) {
      const queuedEntries = existingQueue
        .map((eid) => this.entries.get(eid)!)
        .filter((e) => e.status === "queued" || e.status === "active");

      let lastEnd = now;
      if (queuedEntries.length > 0) {
        const last = queuedEntries[queuedEntries.length - 1];
        lastEnd = last.estimated_complete ?? last.queued_at;
      }

      entry.estimated_start = lastEnd;
      entry.estimated_complete = new Date(
        new Date(lastEnd).getTime() + input.estimated_duration_min * 60_000
      ).toISOString();
    }

    this.entries.set(id, entry);

    // Insert in priority order
    const queue = this.machineQueues.get(input.machine_id) ?? [];
    const insertIdx = queue.findIndex((eid) => {
      const e = this.entries.get(eid)!;
      return e.status === "queued" && e.priority > priority;
    });
    if (insertIdx === -1) {
      queue.push(id);
    } else {
      queue.splice(insertIdx, 0, id);
    }
    this.machineQueues.set(input.machine_id, queue);

    auditEngine.log("data", "dispatch_job_queued", input.queued_by ?? "system", {
      machine_id: input.machine_id, job_id: input.job_id, priority,
      queue_position: queue.indexOf(id) + 1,
    }, { resource_type: "machine", resource_id: input.machine_id });

    eventBus.publish("dispatch.job_queued", {
      machine_id: input.machine_id, job_id: input.job_id,
      priority, queue_entry_id: id,
    }, { category: "data", source: "MachineDispatchEngine" });

    return entry;
  }

  /** Get the dispatch queue for a specific machine.
   * @param machineId - the machine ID
   * @returns machine queue with ordered entries
   */
  getQueue(machineId: string): MachineQueue {
    const entryIds = this.machineQueues.get(machineId) ?? [];
    const entries = entryIds
      .map((id) => this.entries.get(id)!)
      .filter((e) => e.status === "queued" || e.status === "active");

    const active = entries.find((e) => e.status === "active");
    let totalEstMin = 0;
    for (const e of entries) {
      if (e.estimated_start && e.estimated_complete) {
        totalEstMin += (new Date(e.estimated_complete).getTime() - new Date(e.estimated_start).getTime()) / 60_000;
      }
    }

    return {
      machine_id: machineId,
      entries,
      active_job: active,
      total_queued: entries.filter((e) => e.status === "queued").length,
      total_est_min: Math.round(totalEstMin * 10) / 10,
    };
  }

  /** Get the planning board — all machine queues at once.
   * @returns planning board with all machines and their queues
   */
  getAllQueues(): PlanningBoard {
    const machines: MachineQueue[] = [];
    let totalQueued = 0;

    for (const machineId of this.machineQueues.keys()) {
      const queue = this.getQueue(machineId);
      machines.push(queue);
      totalQueued += queue.total_queued;
    }

    // Sort: machines with active jobs first, then by queue depth
    machines.sort((a, b) => {
      if (a.active_job && !b.active_job) return -1;
      if (!a.active_job && b.active_job) return 1;
      return b.total_queued - a.total_queued;
    });

    return {
      machines,
      total_queued_jobs: totalQueued,
      timestamp: new Date().toISOString(),
    };
  }

  /** Reorder the queue for a machine by specifying the new order of entry IDs.
   * @param input - machine_id + ordered list of entry IDs
   * @returns the updated machine queue
   */
  reorder(input: ReorderInput): MachineQueue {
    if (!input.machine_id) throw new Error("machine_id is required");
    if (!input.order || input.order.length === 0) throw new Error("order array is required");

    const currentQueue = this.machineQueues.get(input.machine_id) ?? [];

    // Validate all IDs exist in this machine's queue
    for (const id of input.order) {
      if (!currentQueue.includes(id)) {
        throw new Error(`Entry '${id}' not found in machine '${input.machine_id}' queue`);
      }
    }

    // Keep completed/cancelled entries in place, reorder only queued
    const nonQueued = currentQueue.filter((id) => {
      const e = this.entries.get(id)!;
      return e.status !== "queued";
    });

    // Update priorities based on new order
    for (let i = 0; i < input.order.length; i++) {
      const entry = this.entries.get(input.order[i])!;
      entry.priority = (i + 1) * 10; // Re-number: 10, 20, 30...
      this.entries.set(entry.id, entry);
    }

    this.machineQueues.set(input.machine_id, [...nonQueued, ...input.order]);

    auditEngine.log("data", "dispatch_reordered", input.reordered_by ?? "system", {
      machine_id: input.machine_id, new_order: input.order,
    }, { resource_type: "machine", resource_id: input.machine_id });

    return this.getQueue(input.machine_id);
  }

  /** Activate the next queued job (marks it as active on the machine).
   * @param machineId - the machine ID
   * @param operatorId - who is starting the job
   * @returns the activated queue entry
   */
  activateNext(machineId: string, operatorId: string): QueueEntry {
    const queue = this.machineQueues.get(machineId) ?? [];

    // Check no currently active job
    const active = queue.find((id) => this.entries.get(id)?.status === "active");
    if (active) {
      const e = this.entries.get(active)!;
      throw new Error(`Machine '${machineId}' already has active job '${e.job_id}'. Complete it first.`);
    }

    // Find next queued
    const nextId = queue.find((id) => this.entries.get(id)?.status === "queued");
    if (!nextId) throw new Error(`No queued jobs on machine '${machineId}'`);

    const entry = this.entries.get(nextId)!;
    entry.status = "active";
    entry.actual_start = new Date().toISOString();
    this.entries.set(nextId, entry);

    eventBus.publish("dispatch.job_activated", {
      machine_id: machineId, job_id: entry.job_id,
      queue_entry_id: nextId, operator_id: operatorId,
    }, { category: "data", source: "MachineDispatchEngine" });

    return entry;
  }

  /** Mark the active job on a machine as complete.
   * @param machineId - the machine ID
   * @param operatorId - who completed it
   * @returns the completed queue entry
   */
  completeActive(machineId: string, operatorId: string): QueueEntry {
    const queue = this.machineQueues.get(machineId) ?? [];
    const activeId = queue.find((id) => this.entries.get(id)?.status === "active");
    if (!activeId) throw new Error(`No active job on machine '${machineId}'`);

    const entry = this.entries.get(activeId)!;
    entry.status = "complete";
    entry.actual_complete = new Date().toISOString();
    this.entries.set(activeId, entry);

    // Wire OEE data
    if (entry.actual_start && entry.actual_complete && entry.estimated_start && entry.estimated_complete) {
      try {
        const actualMin = (new Date(entry.actual_complete).getTime() - new Date(entry.actual_start).getTime()) / 60_000;
        const estMin = (new Date(entry.estimated_complete).getTime() - new Date(entry.estimated_start).getTime()) / 60_000;
        const { oeeCalculatorEngine } = require("./OEECalculatorEngine.js");
        // Feed performance ratio: ideal/actual cycle
        const perfRatio = estMin > 0 ? estMin / actualMin : 1;
        // OEE calculation needs more inputs — log the raw data for now
        eventBus.publish("dispatch.oee_data", {
          machine_id: machineId, job_id: entry.job_id,
          actual_min: Math.round(actualMin * 10) / 10,
          estimated_min: Math.round(estMin * 10) / 10,
          performance_ratio: Math.round(perfRatio * 1000) / 1000,
        }, { category: "data", source: "MachineDispatchEngine" });
      } catch { /* OEE integration best-effort */ }
    }

    eventBus.publish("dispatch.job_completed", {
      machine_id: machineId, job_id: entry.job_id,
      queue_entry_id: activeId,
    }, { category: "data", source: "MachineDispatchEngine" });

    return entry;
  }

  /** Remove a queued job from a machine.
   * @param entryId - the queue entry ID
   * @param removedBy - who removed it
   * @returns the cancelled entry
   */
  remove(entryId: string, removedBy: string): QueueEntry {
    const entry = this.entries.get(entryId);
    if (!entry) throw new Error(`Queue entry '${entryId}' not found`);
    if (entry.status !== "queued") {
      throw new Error(`Cannot remove entry in status '${entry.status}' — only 'queued' entries can be removed`);
    }

    entry.status = "cancelled";
    this.entries.set(entryId, entry);

    auditEngine.log("data", "dispatch_job_removed", removedBy, {
      machine_id: entry.machine_id, job_id: entry.job_id, entry_id: entryId,
    }, { resource_type: "machine", resource_id: entry.machine_id });

    return entry;
  }

  // ========================================================================
  // WHAT-IF SIMULATION
  // ========================================================================

  /** Simulate inserting a job at a position in a machine's queue.
   * Returns the impact: how many jobs are delayed and by how much.
   * @param input - machine_id, insert_position, job_id, estimated_duration_min
   * @returns what-if result showing original vs modified queue and delay impact
   */
  whatIf(input: WhatIfInput): WhatIfResult {
    if (!input.machine_id) throw new Error("machine_id is required");
    if (input.estimated_duration_min <= 0) throw new Error("estimated_duration_min must be > 0");

    const queue = this.getQueue(input.machine_id);
    const original = [...queue.entries].filter((e) => e.status === "queued");

    // Build modified queue with hypothetical insertion
    const hypothetical: QueueEntry = {
      id: "what-if-hypothetical",
      machine_id: input.machine_id,
      job_id: input.job_id,
      priority: 0,
      status: "queued",
      queued_at: new Date().toISOString(),
    };

    const position = Math.max(0, Math.min(input.insert_position, original.length));
    const modified = [...original];
    modified.splice(position, 0, hypothetical);

    // Recalculate estimated times for modified queue
    const now = new Date();
    let cursor = now.getTime();
    let jobsDelayed = 0;
    let maxDelay = 0;
    let totalDelay = 0;

    const modifiedWithTimes = modified.map((entry, i) => {
      const estDuration = entry.id === "what-if-hypothetical"
        ? input.estimated_duration_min
        : (entry.estimated_start && entry.estimated_complete
            ? (new Date(entry.estimated_complete).getTime() - new Date(entry.estimated_start).getTime()) / 60_000
            : 30); // default 30 min if no estimate

      const estStart = new Date(cursor).toISOString();
      cursor += estDuration * 60_000;
      const estComplete = new Date(cursor).toISOString();

      // Calculate delay for original entries
      if (entry.id !== "what-if-hypothetical" && entry.estimated_start) {
        const origStart = new Date(entry.estimated_start).getTime();
        const newStart = new Date(estStart).getTime();
        const delayMin = (newStart - origStart) / 60_000;
        if (delayMin > 1) { // threshold: 1 min
          jobsDelayed++;
          totalDelay += delayMin;
          if (delayMin > maxDelay) maxDelay = delayMin;
        }
      }

      return {
        ...entry,
        est_start_shifted: estStart,
        est_complete_shifted: estComplete,
      };
    });

    return {
      original_queue: original,
      modified_queue: modifiedWithTimes,
      impact: {
        jobs_delayed: jobsDelayed,
        max_delay_min: Math.round(maxDelay * 10) / 10,
        total_delay_min: Math.round(totalDelay * 10) / 10,
      },
    };
  }
}

export const machineDispatchEngine = new MachineDispatchEngine();
