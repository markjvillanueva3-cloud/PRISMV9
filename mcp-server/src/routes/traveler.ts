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

export function createTravelerRouter(): Router {
  const router = Router();

  // ========================================================================
  // TRAVELER ENDPOINTS
  // ========================================================================

  /** Create a traveler (routing steps) for a job. */
  router.post("/traveler", (req, res) => {
    try {
      const steps = jobTravelerEngine.createTraveler(req.body);
      res.json({ ok: true, data: { steps, count: steps.length } });
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
      res.json({ ok: true, data: result });
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
      res.json({ ok: true, data: result });
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
      res.json({ ok: true, data: result });
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
      res.json({ ok: true, data: result });
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
      res.json({ ok: true, data: entry });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** Reorder the queue for a machine. */
  router.post("/dispatch/reorder", (req, res) => {
    try {
      const queue = machineDispatchEngine.reorder(req.body);
      res.json({ ok: true, data: queue });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** What-if: simulate inserting a job into a machine's queue. */
  router.post("/dispatch/what-if", (req, res) => {
    try {
      const result = machineDispatchEngine.whatIf(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** Remove a queued job from a machine. */
  router.post("/dispatch/remove", (req, res) => {
    try {
      const entry = machineDispatchEngine.remove(req.body.entry_id, req.body.removed_by);
      res.json({ ok: true, data: entry });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  return router;
}
