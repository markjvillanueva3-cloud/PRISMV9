/**
 * Shop Live Routes — ULT-MS0 P1-U03
 *
 * Dedicated HTTP route surface for live shop state and subscription bootstrap.
 * All routes delegate to ShopStateEngine (canonical state owner) instead of
 * directly mutating data.
 *
 * Room subscriptions: POST /shop/subscribe → joins job/dept/emp WebSocket rooms
 *
 * @module routes/shopLive
 */

import { Router, type Request, type Response } from "express";
import { shopStateEngine } from "../engines/ShopStateEngine.js";

const router = Router();

// ── Job Lifecycle ──────────────────────────────────────────────────

router.post("/shop/job/create", async (req: Request, res: Response) => {
  try {
    const job = await shopStateEngine.createJob({
      customer: req.body.customer,
      part_number: req.body.part_number,
      part_name: req.body.part_name,
      quantity: req.body.quantity,
      due_date: req.body.due_date,
      created_by: req.body.user_id ?? "system",
    });
    res.json({ success: true, job });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post("/shop/job/status", async (req: Request, res: Response) => {
  try {
    const job = await shopStateEngine.updateJobStatus(
      req.body.job_id, req.body.status, req.body.user_id ?? "system", req.body.notes
    );
    res.json({ success: !!job, job });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.get("/shop/job/:id", async (req: Request, res: Response) => {
  const job = await shopStateEngine.getJob(String(req.params.id));
  res.json({ success: !!job, job });
});

router.get("/shop/jobs", async (req: Request, res: Response) => {
  const jobs = await shopStateEngine.listJobs({
    status: (req.query.status as string) || undefined,
    customer: (req.query.customer as string) || undefined,
    limit: req.query.limit ? parseInt(String(req.query.limit)) : undefined,
  });
  res.json({ success: true, jobs, count: jobs.length });
});

router.post("/shop/job/progress", async (req: Request, res: Response) => {
  const job = await shopStateEngine.updateProgress(req.body.job_id, req.body.parts_complete);
  res.json({ success: !!job, job });
});

// ── Traveler ───────────────────────────────────────────────────────

router.get("/shop/traveler/:jobId", async (req: Request, res: Response) => {
  const traveler = await shopStateEngine.getTraveler(String(req.params.jobId));
  res.json({ success: !!traveler, traveler });
});

router.post("/shop/traveler/step/start", async (req: Request, res: Response) => {
  const step = await shopStateEngine.startStep(req.body.step_id, req.body.operator_id);
  res.json({ success: !!step, step });
});

router.post("/shop/traveler/step/complete", async (req: Request, res: Response) => {
  const step = await shopStateEngine.completeStep(req.body.step_id, req.body.operator_id);
  res.json({ success: !!step, step });
});

// ── Labor Sessions ─────────────────────────────────────────────────

router.post("/shop/labor/start", async (req: Request, res: Response) => {
  try {
    const session = await shopStateEngine.startLabor({
      employee_id: req.body.employee_id,
      job_id: req.body.job_id,
      labor_type: req.body.labor_type ?? "production_run",
      machine_id: req.body.machine_id,
      routing_step_id: req.body.routing_step_id,
    });
    res.json({ success: true, session });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post("/shop/labor/pause", async (req: Request, res: Response) => {
  const session = await shopStateEngine.pauseLabor(
    req.body.session_id, req.body.reason ?? "other", req.body.reason_category ?? "other"
  );
  res.json({ success: !!session, session });
});

router.post("/shop/labor/resume", async (req: Request, res: Response) => {
  const session = await shopStateEngine.resumeLabor(req.body.session_id);
  res.json({ success: !!session, session });
});

router.post("/shop/labor/complete", async (req: Request, res: Response) => {
  const session = await shopStateEngine.completeLabor(
    req.body.session_id, req.body.good_parts, req.body.scrap_count
  );
  res.json({ success: !!session, session });
});

router.get("/shop/labor/active/:employeeId", async (req: Request, res: Response) => {
  const sessions = await shopStateEngine.getActiveSessions(String(req.params.employeeId));
  res.json({ success: true, sessions, count: sessions.length });
});

// ── Quantities ─────────────────────────────────────────────────────

router.post("/shop/quantity/record", async (req: Request, res: Response) => {
  try {
    const qty = await shopStateEngine.recordQuantity({
      job_id: req.body.job_id,
      routing_step_id: req.body.routing_step_id,
      good_parts: req.body.good_parts ?? 0,
      scrap_parts: req.body.scrap_parts ?? 0,
      rework_parts: req.body.rework_parts ?? 0,
      recorded_by: req.body.user_id ?? "system",
      lot_number: req.body.lot_number,
    });
    res.json({ success: true, quantity: qty });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Approvals ──────────────────────────────────────────────────────

router.post("/shop/approval/submit", async (req: Request, res: Response) => {
  try {
    await shopStateEngine.submitApproval(req.body);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.get("/shop/approvals/:jobId", async (req: Request, res: Response) => {
  const approvals = await shopStateEngine.getApprovals(String(req.params.jobId));
  res.json({ success: true, approvals });
});

// ── Dashboard ──────────────────────────────────────────────────────

router.get("/shop/snapshot", async (_req: Request, res: Response) => {
  const snapshot = await shopStateEngine.shopSnapshot();
  res.json({ success: true, ...snapshot });
});

// ── Room Subscription Bootstrap ────────────────────────────────────

router.get("/shop/rooms", (_req: Request, res: Response) => {
  res.json({
    success: true,
    rooms: {
      job: "job:{job_id} — subscribe for job lifecycle, progress, and quality events",
      department: "dept:{dept_id} — subscribe for shift clock-in/out and department activity",
      employee: "emp:{emp_id} — subscribe for labor sessions and personal notifications",
      broadcast: "shop:all — subscribe for all job creation and shop-wide announcements",
    },
  });
});

export default router;
