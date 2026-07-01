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
import { travelerGenerationOrchestratorEngine } from "../engines/TravelerGenerationOrchestratorEngine.js";
import { jobChecklistEngine } from "../engines/JobChecklistEngine.js";

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
  // AUTO-GENERATED PRINT→SHIPPING TRAVELER + PER-DEPARTMENT CHECKLISTS
  // ========================================================================

  /** Auto-generate the full print→shipping traveler from a part/quote spec,
   * tagging each step with department + role + a per-department checklist, and
   * seed the stateful check-off store. Returns the generated traveler. */
  router.post("/traveler/generate", (req, res) => {
    try {
      const traveler = travelerGenerationOrchestratorEngine.generate(req.body);
      jobChecklistEngine.attachChecklists(traveler.job_id, traveler.steps);
      res.json({ ok: true, data: traveler });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** Get the whole-job checklist (per step, per item, with check-off state). */
  router.get("/traveler/:jobId/checklist", (req, res) => {
    try {
      const checklist = jobChecklistEngine.getJobChecklist(req.params.jobId);
      res.json({ ok: true, data: checklist });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: e.message });
    }
  });

  /** Get one step's checklist. */
  router.get("/traveler/:jobId/steps/:step/checklist", (req, res) => {
    try {
      const checklist = jobChecklistEngine.getStepChecklist(
        req.params.jobId,
        parseInt(req.params.step, 10),
      );
      res.json({ ok: true, data: checklist });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: e.message });
    }
  });

  /** Check (mark done) a checklist item as a logged-in employee. */
  router.post("/traveler/:jobId/steps/:step/checklist/:item/check", (req, res) => {
    try {
      const result = jobChecklistEngine.checkItem({
        job_id: req.params.jobId,
        step_seq: parseInt(req.params.step, 10),
        item_id: req.params.item,
        employee_id: req.body.employee_id,
        employee_department: req.body.employee_department,
        employee_role: req.body.employee_role,
        note: req.body.note,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** Un-check a checklist item (correct a mistake). */
  router.post("/traveler/:jobId/steps/:step/checklist/:item/uncheck", (req, res) => {
    try {
      const result = jobChecklistEngine.uncheckItem({
        job_id: req.params.jobId,
        step_seq: parseInt(req.params.step, 10),
        item_id: req.params.item,
        employee_id: req.body.employee_id,
        employee_department: req.body.employee_department,
        employee_role: req.body.employee_role,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /** "My tasks": filter the job's checklist to the steps a given employee's
   * department/role can work (login-to-task surface). Query: ?employee_id=&department=&role= */
  router.get("/traveler/:jobId/my-tasks", (req, res) => {
    try {
      const jobChecklist = jobChecklistEngine.getJobChecklist(req.params.jobId);
      const dept = typeof req.query.department === "string" ? req.query.department : undefined;
      const role = typeof req.query.role === "string" ? req.query.role : undefined;
      const SUPERVISORY = new Set(["lead", "supervisor", "manager", "admin"]);
      const TRAVELER_TO_HR: Record<string, string> = {
        programming: "programming", saw: "machining", machining: "machining",
        turning: "machining", grinding: "machining", edm: "machining",
        deburr: "machining", finishing: "planning", inspection: "quality", shipping: "shipping",
      };
      const isSupervisor = role ? SUPERVISORY.has(role) : false;
      const mine = jobChecklist.steps.filter((s) => {
        if (isSupervisor || !dept) return true; // supervisors / unfiltered see all
        return TRAVELER_TO_HR[s.department] === dept;
      });
      res.json({
        ok: true,
        data: {
          job_id: jobChecklist.job_id,
          employee_id: req.query.employee_id ?? null,
          department: dept ?? null,
          steps: mine,
          step_count: mine.length,
        },
      });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: e.message });
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
