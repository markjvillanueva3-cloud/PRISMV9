/**
 * PRISM MCP Server — Job Traveler & Dispatch Routes
 *
 * Mobile-friendly endpoints for:
 * - Job traveler routing steps (setup/cycle time tracking)
 * - Machine dispatch queue and planning board
 * - QR/barcode scan for quick job-step transitions
 *
 * @milestone Session 6-7 U-TRAV3
 */
import { Router } from "express";
import { jobTravelerEngine } from "../engines/JobTravelerEngine.js";
import { machineDispatchEngine } from "../engines/MachineDispatchEngine.js";
import {
  milestoneIntelligenceEngine,
  type MilestoneSyncInput,
  type MilestoneSyncResult,
} from "../engines/MilestoneIntelligenceEngine.js";

function safeSyncMutation(input?: MilestoneSyncInput): MilestoneSyncResult | null {
  if (!input?.job_id?.trim()) {
    return null;
  }

  try {
    return milestoneIntelligenceEngine.syncMutation(input);
  } catch {
    return null;
  }
}

function attachPrismSync<T>(payload: T, prismSync: MilestoneSyncResult | null): T | (T & { prism_sync: MilestoneSyncResult }) {
  if (!prismSync || typeof payload !== "object" || payload === null) {
    return payload;
  }

  return {
    ...(payload as Record<string, unknown>),
    prism_sync: prismSync,
  } as T & { prism_sync: MilestoneSyncResult };
}

export function createTravelerRouter(): Router {
  const router = Router();

  // ========================================================================
  // TRAVELER ENDPOINTS
  // ========================================================================

  /** Create a traveler (routing steps) for a job. */
  router.post("/traveler", (req, res) => {
    try {
      const steps = jobTravelerEngine.createTraveler(req.body);
      const prismSync = safeSyncMutation({
        job_id: req.body?.job_id,
        source: "traveler-desk",
        trigger: "traveler-created",
        note: `Traveler created with ${steps.length} routing step${steps.length === 1 ? "" : "s"}.`,
      });
      res.json({
        ok: true,
        data: attachPrismSync({ steps, count: steps.length }, prismSync),
      });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** Get traveler summary for a job. */
  router.get("/traveler/:jobId", (req, res) => {
    try {
      const summary = jobTravelerEngine.getTraveler(req.params.jobId);
      res.json({ ok: true, data: summary });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: e.message });
    }
  });

  /** Get all active travelers. */
  router.get("/traveler", (_req, res) => {
    try {
      const travelers = jobTravelerEngine.getActiveTravelers();
      res.json({ ok: true, data: { travelers, count: travelers.length } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  /** Start setup on a routing step. */
  router.post("/traveler/:jobId/steps/:step/start-setup", (req, res) => {
    try {
      const result = jobTravelerEngine.startSetup({
        job_id: req.params.jobId,
        step_number: parseInt(req.params.step, 10),
        operator_id: req.body.operator_id,
        notes: req.body.notes,
      });
      const prismSync = safeSyncMutation({
        job_id: req.params.jobId,
        source: "traveler-desk",
        trigger: "traveler-step-started",
        action: "setup",
        step_number: result.step.step_number,
        operation: result.step.operation,
        department: result.step.workcenter,
        machine_id: result.step.machine_id,
        note: req.body.notes || `Setup started for step ${result.step.step_number}.`,
      });
      res.json({ ok: true, data: attachPrismSync(result, prismSync) });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** Transition from setup to cycle run. */
  router.post("/traveler/:jobId/steps/:step/start-cycle", (req, res) => {
    try {
      const result = jobTravelerEngine.startCycle({
        job_id: req.params.jobId,
        step_number: parseInt(req.params.step, 10),
        operator_id: req.body.operator_id,
        notes: req.body.notes,
      });
      const prismSync = safeSyncMutation({
        job_id: req.params.jobId,
        source: "traveler-desk",
        trigger: "traveler-step-started",
        action: "cycle",
        step_number: result.step.step_number,
        operation: result.step.operation,
        department: result.step.workcenter,
        machine_id: result.step.machine_id,
        note: req.body.notes || `Cycle started for step ${result.step.step_number}.`,
      });
      res.json({ ok: true, data: attachPrismSync(result, prismSync) });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** Complete (or skip) a routing step. */
  router.post("/traveler/:jobId/steps/:step/complete", (req, res) => {
    try {
      const result = jobTravelerEngine.completeStep({
        job_id: req.params.jobId,
        step_number: parseInt(req.params.step, 10),
        operator_id: req.body.operator_id,
        notes: req.body.notes,
        skip: req.body.skip,
        parts_complete: req.body.parts_complete,
        parts_scrapped: req.body.parts_scrapped,
      });
      const skipped = Boolean(req.body.skip);
      const prismSync = safeSyncMutation({
        job_id: req.params.jobId,
        source: "traveler-desk",
        trigger: skipped ? "traveler-step-skipped" : "traveler-step-completed",
        action: skipped ? "skip" : "complete",
        step_number: result.step.step_number,
        operation: result.step.operation,
        department: result.step.workcenter,
        machine_id: result.step.machine_id,
        quantity_completed: req.body.parts_complete,
        scrap_qty: req.body.parts_scrapped,
        note: req.body.notes || (skipped
          ? `Skipped step ${result.step.step_number}.`
          : `Completed step ${result.step.step_number}.`),
      });
      res.json({ ok: true, data: attachPrismSync(result, prismSync) });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** QR/barcode scan endpoint — auto-detects next action. */
  router.post("/traveler/scan", (req, res) => {
    try {
      const result = jobTravelerEngine.scan({
        code: req.body.code,
        operator_id: req.body.operator_id,
        action: req.body.action,
      });
      const prismSync = safeSyncMutation({
        job_id: result.step.job_id,
        source: "traveler-desk",
        trigger: "traveler-scan-transition",
        action: result.action,
        step_number: result.step.step_number,
        operation: result.step.operation,
        department: result.step.workcenter,
        machine_id: result.step.machine_id,
        note: `Scanner transition executed ${result.action.replace(/_/g, " ")} on step ${result.step.step_number}.`,
      });
      res.json({ ok: true, data: attachPrismSync(result, prismSync) });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // ========================================================================
  // DISPATCH ENDPOINTS
  // ========================================================================

  /** Get the planning board (all machine queues). */
  router.get("/dispatch/board", (_req, res) => {
    try {
      const board = machineDispatchEngine.getAllQueues();
      res.json({ ok: true, data: board });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  /** Get queue for a specific machine. Returns an empty queue when no entries exist yet. */
  router.get("/dispatch/queue/:machineId", (req, res) => {
    try {
      const queue = machineDispatchEngine.getQueue(req.params.machineId);
      res.json({ ok: true, data: queue });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: e.message });
    }
  });

  /** Assign (queue) a job to a machine. */
  router.post("/dispatch/assign", (req, res) => {
    try {
      const entry = machineDispatchEngine.queueJob(req.body);
      const prismSync = safeSyncMutation({
        job_id: entry.job_id,
        source: "dispatch-board",
        trigger: "dispatch-job-queued",
        machine_id: entry.machine_id,
        note: `Dispatch queued ${entry.job_id} on ${entry.machine_id}.`,
      });
      res.json({ ok: true, data: attachPrismSync(entry, prismSync) });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** Reorder the queue for a machine. */
  router.post("/dispatch/reorder", (req, res) => {
    try {
      const queue = machineDispatchEngine.reorder(req.body);
      const syncJobId = typeof req.body?.job_id === "string" && req.body.job_id.trim().length > 0
        ? req.body.job_id
        : queue.active_job?.job_id ?? queue.entries.find((entry) => entry.status === "queued")?.job_id;
      const prismSync = safeSyncMutation({
        job_id: syncJobId,
        source: "dispatch-board",
        trigger: "dispatch-queue-reordered",
        machine_id: queue.machine_id,
        note: `Dispatch order updated for ${queue.machine_id}.`,
      });
      res.json({ ok: true, data: attachPrismSync(queue, prismSync) });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** What-if: simulate inserting a job into a machine's queue. */
  router.post("/dispatch/what-if", (req, res) => {
    try {
      const result = machineDispatchEngine.whatIf(req.body);
      const prismSync = safeSyncMutation({
        job_id: req.body?.job_id,
        source: "dispatch-board",
        trigger: "dispatch-what-if-ran",
        machine_id: req.body?.machine_id,
        note: `What-if projected ${result.impact.jobs_delayed} delayed job${result.impact.jobs_delayed === 1 ? "" : "s"} on ${req.body?.machine_id ?? "the selected machine"}.`,
      });
      res.json({ ok: true, data: attachPrismSync(result, prismSync) });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** Remove a queued job from a machine. */
  router.post("/dispatch/remove", (req, res) => {
    try {
      const entry = machineDispatchEngine.remove(req.body.entry_id, req.body.removed_by);
      const prismSync = safeSyncMutation({
        job_id: entry.job_id,
        source: "dispatch-board",
        trigger: "dispatch-entry-removed",
        machine_id: entry.machine_id,
        note: `Queue entry ${entry.id} removed from ${entry.machine_id}.`,
      });
      res.json({ ok: true, data: attachPrismSync(entry, prismSync) });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  return router;
}
