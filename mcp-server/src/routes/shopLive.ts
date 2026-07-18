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
import { verifyToken, requireRole } from "../middleware/auth.js";
import { shopStateEngine } from "../engines/ShopStateEngine.js";
import { employeeEngine } from "../engines/EmployeeEngine.js";

const router = Router();

// SECURITY (U-ERP-SHOPCONFIG-AUTH): gate the entire live-shop surface.
// Mounted under the global optionalToken (index.ts) which never rejects anon,
// so before this line anon could read customer/part/job/snapshot state AND
// mutate job lifecycle, labor sessions (payroll-feeding), quantities, and
// approvals. Operator-self shop-floor actions require only login; job
// create/status and approval submission carry requireRole("lead"+).
//
// KIOSK EXEMPTION: /shop/snapshot (aggregate counts only: active_jobs,
// jobs_by_status, active_labor_sessions) and /shop/jobs (floor-visible job
// board: customer/part/status) power the wall-mounted, login-less
// ShopFloorTVPage (/shop-tv). They carry NO cost/rate/margin/PII/mutation, so
// they stay anon-readable -- exactly the intended public floor board. Every
// OTHER route (all mutations + per-job/approval reads) requires verifyToken.
const KIOSK_ANON_READS = new Set(["/shop/snapshot", "/shop/jobs"]);
router.use((req: Request, res: Response, next) => {
  if (req.method === "GET" && KIOSK_ANON_READS.has(req.path)) {
    next();
    return;
  }
  verifyToken(req, res, next);
});

// U-ERP-IDOR-SELFGATE (slot:hotel, 2026-07-02; hardened after 3-of-3 arms A+B) -- layer 2
// after the anon-close above: labor routes carry an employee identity, so any authed employee
// could start a labor session AS a peer (payroll-feeding) or read a peer's active sessions.
// IDENTITY RESOLUTION (the 3-of-3 P1): auth ids are USR-* and targets EMP-*, so the caller's
// own employee id is resolved via EmployeeEngine.auth_user_id; "self" = {resolved id, userId}.
// 403 fires ONLY when the caller's employee identity is KNOWN and the target is a proven peer;
// when no mapping resolves yet (the current state), the check DEGRADES to verifyToken-only
// (never a dead-panel) and auto-engages once auth_user_id is wired. Supervision roles pass.
// KNOWN LIMIT: pause/resume/complete key on session_id only -- engine-FSM follow-up.
const SELF_GATE_PRIVILEGED = ["lead", "supervisor", "hr_manager", "admin"];
function requireSelfOrPrivileged(...fields: string[]) {
  const keys = fields.length > 0 ? fields : ["employee_id"];
  return (req: Request, res: Response, next: () => void): void => {
    const r = req as any;
    const isPrivileged = r.userRoles?.some((role: string) => SELF_GATE_PRIVILEGED.includes(role));
    if (isPrivileged) { next(); return; }
    const selfIds = new Set<string>();
    if (r.userId) selfIds.add(String(r.userId));
    let identityKnown = false;
    if (r.userId) {
      const self = employeeEngine.findByAuthUserId(String(r.userId));
      if (self) { selfIds.add(String(self.id)); identityKnown = true; }
    }
    if (!identityKnown) { next(); return; } // no mapping yet: degrade, never dead-panel
    for (const k of keys) {
      const target = (req.params as any)?.[k] ?? req.body?.[k];
      if (target && !selfIds.has(String(target))) {
        res.status(403).json({ success: false, error: `Cannot access another employee's records (${k})` });
        return;
      }
    }
    next();
  };
}

// ── Job Lifecycle ──────────────────────────────────────────────────

router.post("/shop/job/create", requireRole("lead", "hr_manager", "admin"), async (req: Request, res: Response) => {
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

router.post("/shop/job/status", requireRole("lead", "hr_manager", "admin"), async (req: Request, res: Response) => {
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

// Project a Job to the floor-visible fields a wall-mounted kiosk shows. The full
// Job (schemas/shop/shopDomain.ts:57) carries customer, costs.{estimated_total,
// actual_total}, notes, and provenance.created_by -- business-confidential + PII
// that an ANON kiosk viewer must NOT see. Authed callers get the full board.
function redactJobForKiosk(job: any): Record<string, unknown> {
  if (!job || typeof job !== "object") return {};
  return {
    id: job.id,
    part_number: job.part_number,
    part_name: job.part_name,
    status: job.status,
    quantity: job.quantity,
    progress: job.progress,
    due_date: job.schedule?.due_date,
  };
}

router.get("/shop/jobs", async (req: Request, res: Response) => {
  const jobs = await shopStateEngine.listJobs({
    status: (req.query.status as string) || undefined,
    customer: (req.query.customer as string) || undefined,
    limit: req.query.limit ? parseInt(String(req.query.limit)) : undefined,
  });
  // KIOSK REDACTION (U-ERP-SHOPCONFIG-AUTH, scrutiny arm-A P1): /shop/jobs is
  // anon-exempt for the /shop-tv board, but the raw Job carries customer +
  // costs + created_by. Strip those for anon; authed callers see the full board.
  // req.userId is populated by the global optionalToken (routes/index.ts:144,
  // which runs before this router mounts at routes/index.ts:306).
  const payload = req.userId ? jobs : jobs.map(redactJobForKiosk);
  res.json({ success: true, jobs: payload, count: jobs.length });
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

// Self-gated: starting a labor session AS a peer feeds their payroll clock.
router.post("/shop/labor/start", requireSelfOrPrivileged("employee_id"), async (req: Request, res: Response) => {
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

// Self-gated: a peer's active labor sessions are their work record.
router.get("/shop/labor/active/:employeeId", requireSelfOrPrivileged("employeeId"), async (req: Request, res: Response) => {
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

router.post("/shop/approval/submit", requireRole("lead", "hr_manager", "admin"), async (req: Request, res: Response) => {
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
