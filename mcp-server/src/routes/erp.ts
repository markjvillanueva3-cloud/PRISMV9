/**
 * PRISM MCP Server — ERP & Business Operations Routes
 *
 * Comprehensive backend for all ERP pages:
 * Customers, EmployeeDirectory, Exports, FinancialAnalysis,
 * GeneralLedger, HRCompliance, OrderTracking, Purchasing,
 * QualityManagement, Inventory, Invoicing, Payroll, Scheduling,
 * MachineRates, Batch, Reporting, ActualCost, PurchaseOrders,
 * TimeClock, ToolUsage, JobLifecycle, CapacityPlanning
 *
 * All routes require authentication via verifyToken.
 * Sensitive routes additionally require role-based access (requireRole).
 * @milestone EMP-MS0
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { employeeEngine, type MachineAuthorityScope } from "../engines/EmployeeEngine.js";
import { unwrapDispatcherEnvelope } from "./dispatcher-envelope.js";

// ENVELOPE (the dead-panel class, see reference_charlie_estimate_flow_envelope_nested_fix):
// prism_business returns slimResponse({type:"text", text:JSON.stringify({success,data})}) with NO
// content[] wrapper, so the production callTool (index.ts: result?.content?.[0]?.text) CANNOT peel it
// and hands the route the RAW {type,text}. Every prism_business site MUST parse the envelope first, then
// read .success/.data -- otherwise res.data is the {type,text} object, the FE reads no fields, and the
// panel is permanently dead. The peel LOGIC lives once in dispatcher-envelope.ts (shared with
// hotel-portal.ts/pipeline.ts); this hoisted delegation only pins the erp-shaped return type so the
// 30 call sites keep their .success/.data derefs. A {success:false} (engine threw) passes through
// unchanged so callers can surface it as 400.
function unwrapEnvelope(r: unknown): { success?: boolean; data?: unknown; error?: string } {
  return unwrapDispatcherEnvelope<{ success?: boolean; data?: unknown; error?: string }>(r);
}

function bizRoute(callTool: CallToolFn, action: string) {
  return async (req: any, res: any) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", action, req.body));
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  };
}

function bizGet(callTool: CallToolFn, action: string) {
  return async (_req: any, res: any) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", action, {}));
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  };
}

/** Reject timestamps that are >5 minutes from server time. */
function validateTimestamp(req: any, res: any, next: any): void {
  const ts = req.body?.timestamp;
  if (ts) {
    const diff = Math.abs(Date.now() - new Date(ts).getTime());
    if (diff > 5 * 60 * 1000) {
      res.status(400).json({ ok: false, error: "Timestamp must be within 5 minutes of server time" });
      return;
    }
  }
  next();
}

/** Ensure clock operations target the requesting user's own employee_id, unless admin/supervisor.
 * U-ERP-CLOCK-SELFGATE-HARDEN (clone of hotel-portal.ts requireSelfOrPrivileged): employee_id is an
 * EMPLOYEE record id (EMP-*) while req.userId is the AUTH user id (USR-*) -- different namespaces, so
 * the old direct equality both 403'd every legitimate non-admin self-service clock call AND proved
 * nothing about peers. Resolve the caller's own employee record via EmployeeEngine.auth_user_id and
 * 403 only a PROVEN peer target. Without a resolved mapping we cannot prove the target is a peer, so
 * degrade to verifyToken-only (auth already proven) rather than deny self-service -- the same
 * documented trade the hardened hotel-portal helper ships.
 *
 * SCAFFOLDING STATUS (R12 -- honest scope): the PEER-block is INERT in production TODAY. jm-die-employees.ts
 * seeds every employee with auth_user_id:null and no runtime path (login provisioning / employee_update)
 * populates it yet, so findByAuthUserId resolves nothing -> identityKnown stays false -> this degrades to
 * verifyToken-only for real callers. This unit fixes the namespace bug (the old gate 403'd every legit
 * self-call) and installs the correct resolver, which AUTO-ENGAGES the instant auth_user_id mappings are
 * wired. Until that india/operator identity-mapping dependency lands, peer-fraud protection on the 6
 * clock/job-time routes is NOT yet actively enforced -- "PEER 403 with teeth" is proven only against a
 * test-seeded mapping, not live prod. Sibling hotel-portal.ts carries the same status. */
function requireSelfOrAdmin(req: any, res: any, next: any): void {
  const targetId = req.body?.employee_id;
  if (!targetId) { next(); return; }
  const isAdmin = req.userRoles?.some((r: string) => ["admin", "supervisor", "hr_manager"].includes(r));
  if (isAdmin) { next(); return; }
  const selfIds = new Set<string>();
  let identityKnown = false;
  if (req.userId) {
    // Legacy compat: a caller that sends the auth id AS employee_id still counts as self.
    selfIds.add(String(req.userId));
    const self = employeeEngine.findByAuthUserId(String(req.userId));
    if (self) { selfIds.add(String(self.id)); identityKnown = true; }
  }
  if (!identityKnown) { next(); return; }
  if (!selfIds.has(String(targetId))) {
    res.status(403).json({ ok: false, error: "Cannot perform clock operations for another employee" });
    return;
  }
  next();
}

export function createErpRouter(callTool: CallToolFn): Router {
  const router = Router();
  const MACHINE_AUTHORITY_SCOPES = new Set<MachineAuthorityScope>([
    "operate",
    "setup",
    "program",
    "release",
  ]);

  // ─── Quoting ──────────────────────────────────────────────────────────────
  router.post("/quote/generate", verifyToken, bizRoute(callTool, "quoting_generate"));
  router.post("/quote/breakdown", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_cost", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/quote/compare", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_compare", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── RFQ Inbox (U-HOTEL-RFQ-ASSIGN, gap #2) ───────────────────────────────
  // The RFQInbox page (web/src/pages/RFQInboxPage.tsx) had NO backing routes -> fully dead.
  // These wire its rfqList/rfqAssign/rfqUpdateStatus (+ rfqCreate) client calls onto the
  // existing RFQToOrderOrchestratorEngine via businessDispatcher. verifyToken baseline
  // (front-desk/estimator triage -- any logged-in shop user), mirroring /quote/generate.
  //
  // ENVELOPE: prism_business's bare {type,text} slimResponse is peeled by the module-scope unwrapEnvelope
  // (defined at the top of this file so bizRoute/bizGet and the in-router sites share one peel). A
  // {success:false} (engine threw) is surfaced as 400 so the FE catch fires.
  const rfqRoute = (action: string, getParams?: (req: any) => Record<string, unknown>) =>
    async (req: any, res: any) => {
      try {
        const params = getParams ? getParams(req) : (req.body ?? {});
        const r = unwrapEnvelope(await callTool("prism_business", action, params));
        if (r && r.success === false) {
          res.status(400).json({ ok: false, error: r.error ?? "rfq operation failed" });
          return;
        }
        // Surface the dispatcher's INNER `data` at the body's `data` (the records array / updated record),
        // NOT double-nested. Fall back to r itself for a bare-shape (defensive).
        res.json({ ok: true, data: r?.data ?? r });
      } catch (e: any) {
        res.status(500).json({ ok: false, error: e.message });
      }
    };
  router.post("/rfq-create", verifyToken, rfqRoute("rfq_receive"));
  // The FE filter dropdown sends the INBOX-triage vocabulary (received/reviewing/quoted/won/lost), which
  // is NOT the order-FSM `status`. Forward it as `inbox_status` so the dispatcher filters the triage facet
  // -- forwarding it as `status` would hit listRecords' FSM-status validator and THROW (400 on every filter).
  router.get("/rfq-list", verifyToken, rfqRoute("rfq_list", (req) => {
    const q: Record<string, unknown> = {};
    if (req.query.status) q.inbox_status = String(req.query.status);
    if (req.query.assignee_id) q.assignee_id = String(req.query.assignee_id);
    return q;
  }));
  router.post("/rfq-assign", verifyToken, rfqRoute("rfq_assign"));
  router.post("/rfq-status", verifyToken, rfqRoute("rfq_update_status"));

  // ─── Credit Management (U-HOTEL-CREDIT-REVIEW, gap #3) ─────────────────────
  // The CreditManagementPage (web/src/pages/CreditManagementPage.tsx) calls creditReviewAll() and
  // creditReview(id) -> these routes were missing -> the desk was dead. Reuses the rfqRoute envelope-
  // unwrap helper (prism_business returns the {type,text} slimResponse envelope -- same dead-panel class).
  // requireRole(lead+): customer credit_limit/balance/utilization is sensitive financial data (the credit
  // desk is a manager function), mirroring erp.ts's financial-tier on invoice/dispatch routes.
  router.get("/credit-review-all", verifyToken, requireRole("lead", "hr_manager", "admin"), rfqRoute("credit_review_all"));
  router.get("/credit-review/:customer_id", verifyToken, requireRole("lead", "hr_manager", "admin"),
    rfqRoute("credit_review", (req) => ({ customer_id: String(req.params.customer_id) })));

  // ─── OEE Dashboard losses + trend (U-HOTEL-OEE-DASHBOARD, gap #4) ──────────
  // OEEDashboardPage (web/src/pages/OEEDashboardPage.tsx) calls analyticsOEELosses()/analyticsOEETrend()
  // -> these routes were missing -> the Losses + Trends tabs were permanently "Unavailable". The engine
  // methods are PURE projections of oee_calculate (no event store exists; the page is fail-closed against
  // fabricated data, so trend([]) -> [] surfaces honest "Unavailable" on first load when no samples are
  // posted). Reuses rfqRoute so the prism_business {type,text} slimResponse envelope is unwrapped (callTool
  // does NOT peel it -- the recurring dead-panel class); the cases return a BARE array, so rfqRoute's
  // `r?.data ?? r` fallback surfaces it directly. verifyToken-only: matches the sibling /analytics/oee
  // analytics tier (OEE metrics are internal but not financial/PII; the page is a logged-in operator desk).
  router.post("/oee-losses", verifyToken, rfqRoute("oee_losses"));
  router.post("/oee-trend", verifyToken, rfqRoute("oee_trend"));

  // ─── OSHA Compliance dashboard (U-HOTEL-OSHA-DASHBOARD, gap #5) ────────────
  // OSHACompliancePage calls oshaIncidents()/osha300LogFeed()/oshaSafetyTraining()/oshaPpeRecords()/
  // oshaNearMiss() -> these routes were missing -> the whole desk was dead. Wires the previously-unwired
  // OSHAComplianceEngine incident STORE (incidents/300-log/PPE/near-miss) + the all-records training list.
  // Reuses rfqRoute so the prism_business {type,text} slimResponse envelope is unwrapped (the recurring
  // dead-panel class); the list cases return a BARE array surfaced via rfqRoute's r?.data ?? r fallback.
  // verifyToken-only: matches the sibling safety/training analytics tier (compliance data is internal; the
  // page is a logged-in operator safety desk). Incidents/PPE carry employee_name -- a tier-review note,
  // not a financial leak; mirror the existing safety/HR route tier.
  router.get("/osha-incidents", verifyToken, rfqRoute("osha_incidents", (req) => ({ year: req.query.year })));
  router.get("/osha-300-log", verifyToken, rfqRoute("osha_300_log", (req) => ({ year: req.query.year })));
  router.get("/safety-training", verifyToken, rfqRoute("safety_training_list_all"));
  router.get("/ppe-records", verifyToken, rfqRoute("osha_ppe_records"));
  router.post("/osha-near-miss", verifyToken, rfqRoute("osha_near_miss"));

  // ─── Compliance writes: OSHA incident/300-log + internal-audit + management-review ──
  // (U-HOTEL-WIRE-COMPLIANCE) The OSHACompliancePage + AuditManagerPage call oshaIncidentCreate()/
  // osha300LogFeed()/auditSchedule()/auditFindingCreate()/auditCapaCreate()/managementReviewPackage()/
  // auditMgmtReview() -> these create/schedule routes were missing so the actions were dead. Every action
  // wired below is verified present in businessDispatcher (2026-06-25): osha_record_incident
  // (OSHA300LogEngine.recordIncident), osha_300_log (OSHAComplianceEngine.generateOSHA300Log),
  // internal_audit_schedule + internal_audit_record_finding (InternalAuditCalendarEngine), audit_capa_create
  // (AuditFindingToCAPABridgeEngine), nc_management_review_summary (NonConformanceAndCorrectiveActionEngine).
  // All reuse rfqRoute so the prism_business {type,text} slimResponse envelope is unwrapped (the recurring
  // dead-panel class). requireRole(lead+): incident reporting, audit scheduling/findings/CAPA, and management
  // review are compliance-manager functions (mirrors the credit-review + payroll financial tier). osha-log-300
  // is a generated report (verifyToken-only, matches the sibling osha-300-log GET).
  // GET /audit-schedules + GET /audit-findings are DEFERRED to a Cluster-B follow-up (see the detailed note
  // below the create routes -- they need NEW "list all" dispatcher actions + tests, not a route-only wire).
  router.post("/osha-incident-create", verifyToken, requireRole("lead", "hr_manager", "admin"), rfqRoute("osha_record_incident"));
  router.post("/osha-log-300", verifyToken, rfqRoute("osha_300_log", (req) => ({ year: req.body?.year })));
  router.post("/audit-schedule", verifyToken, requireRole("lead", "hr_manager", "admin"), rfqRoute("internal_audit_schedule"));
  router.post("/audit-finding-create", verifyToken, requireRole("lead", "hr_manager", "admin"), rfqRoute("internal_audit_record_finding"));
  router.post("/audit-capa-create", verifyToken, requireRole("lead", "hr_manager", "admin"), rfqRoute("audit_capa_create"));
  // management-review-package + audit-mgmt-review both want a REVIEW PACKAGE over a date window. Both map to
  // nc_management_review_summary (NonConformanceAndCorrectiveActionEngine.managementReviewSummary), whose only
  // input is {since?} (NC reported_at >= since). The FE managementReviewPackage sends {start_date,end_date} and
  // auditMgmtReview sends {period_start,period_end} -- map the START to `since`; the engine has no upper bound,
  // so end_date/period_end are not honored (logged here, NOT silently assumed -- an engine `until` param is a
  // follow-up if a closed window is required). NOT management_review_schedule: that SCHEDULES a meeting (requires
  // chair_employee_id + scheduled_for + >=2 attendees) and would 400 on this body (per-file scrutiny arms A+B P0).
  // audit-schedules (GET, list all scheduled audits) is DEFERRED: InternalAuditCalendarEngine has listByStatus/
  // listOverdue but NO "list all" dispatcher action -- needs a Cluster-B action add + test, not a route-only wire
  // (annual_coverage returns a coverage rollup, not the schedule list the page renders).
  router.post("/management-review-package", verifyToken, requireRole("lead", "hr_manager", "admin"),
    rfqRoute("nc_management_review_summary", (req) => ({ since: req.body?.start_date })));
  router.post("/audit-mgmt-review", verifyToken, requireRole("lead", "hr_manager", "admin"),
    rfqRoute("nc_management_review_summary", (req) => ({ since: req.body?.period_start })));

  // ─── Job Management ───────────────────────────────────────────────────────
  router.post("/job/plan", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "job_plan", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/job/schedule", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_schedule", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/job/track", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_job", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── Business Intelligence ────────────────────────────────────────────────
  router.post("/analytics/capacity", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_dashboard", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/analytics/bottleneck", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_calc", "bottleneck_identify", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/analytics/oee", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_calc", "oee_calculate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/analytics/predictive", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_calc", "predictive_maintenance", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── TimeClock & Attendance ───────────────────────────────────────────────
  router.post("/shift-clock-in", verifyToken, validateTimestamp, requireSelfOrAdmin, bizRoute(callTool, "clock_in"));
  router.post("/shift-clock-out", verifyToken, validateTimestamp, requireSelfOrAdmin, bizRoute(callTool, "clock_out"));
  router.post("/job-time-start", verifyToken, validateTimestamp, requireSelfOrAdmin, bizRoute(callTool, "job_time_start"));
  router.post("/job-time-pause", verifyToken, validateTimestamp, requireSelfOrAdmin, bizRoute(callTool, "job_time_pause"));
  router.post("/job-time-resume", verifyToken, validateTimestamp, requireSelfOrAdmin, bizRoute(callTool, "job_time_resume"));
  router.post("/job-time-stop", verifyToken, validateTimestamp, requireSelfOrAdmin, bizRoute(callTool, "job_time_stop"));
  router.post("/timecard", verifyToken, bizRoute(callTool, "timecard_summary"));
  router.post("/attendance", verifyToken, bizRoute(callTool, "attendance_report"));
  router.post("/commission-report", verifyToken, bizRoute(callTool, "commission_report"));
  router.get("/who-clocked-in", verifyToken, bizGet(callTool, "who_clocked_in"));
  router.get("/active-jobs/:employeeId", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "who_clocked_in", { employee_id: req.params.employeeId, mode: "active_jobs" }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/shift-handoff/:employeeId", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "who_clocked_in", { employee_id: req.params.employeeId, mode: "handoff" }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/job-labor-cost", verifyToken, bizRoute(callTool, "costing_job_cost"));

  // ─── Employees ────────────────────────────────────────────────────────────
  router.get("/employees", verifyToken, bizGet(callTool, "employee_search"));
  router.post("/employee-create", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "employee_create"));
  router.post("/employee-update", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "employee_update"));
  router.post("/employee-status", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "employee_update_status"));
  router.post("/employee-search", verifyToken, bizRoute(callTool, "employee_search"));
  router.post("/employee-add-skill", verifyToken, bizRoute(callTool, "employee_add_skill"));
  router.post("/employee-utilization", verifyToken, bizRoute(callTool, "employee_utilization"));
  router.post("/employee-dept-summary", verifyToken, bizRoute(callTool, "employee_dept_summary"));
  router.get("/employee-machine-authority/:employeeId", verifyToken, async (req, res) => {
    try {
      const data = employeeEngine.getMachineAuthority(String(req.params.employeeId));
      res.json({ ok: true, data });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: e.message });
    }
  });
  router.get("/machine-certified-employees/:machineId", verifyToken, async (req, res) => {
    try {
      const minimumScope = String(req.query.minimumScope ?? req.query.minimum_scope ?? "operate");
      if (!MACHINE_AUTHORITY_SCOPES.has(minimumScope as MachineAuthorityScope)) {
        res.status(400).json({ ok: false, error: `Unsupported minimumScope: ${minimumScope}` });
        return;
      }
      const data = employeeEngine.getQualifiedEmployeesForMachine(
        String(req.params.machineId),
        minimumScope as MachineAuthorityScope,
      );
      res.json({ ok: true, data });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });
  router.get("/employee-machine-authority-overview", verifyToken, async (_req, res) => {
    try {
      const data = employeeEngine.getMachineAuthorityOverview();
      res.json({ ok: true, data });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ─── Employee Learning & Certifications ──────────────────────────────────
  router.post("/employee-learning-path", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_knowledge", "academy_dashboard", {
        student_id: req.body.employee_id,
      });
      res.json({ result, safety: { score: 1, warnings: [] }, meta: { formula_used: "learning_path", uncertainty: 0 } });
    } catch (e: any) { res.status(500).json({ result: null, safety: { score: 0, warnings: [e.message] }, meta: { formula_used: "learning_path", uncertainty: 1 } }); }
  });
  router.post("/employee-learning-complete", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_knowledge", "academy_complete_lesson", {
        student_id: req.body.employee_id,
        course_id: req.body.course_id,
        lesson_index: req.body.lesson_index ?? 0,
        score: req.body.score ?? 100,
      });
      res.json({ result, safety: { score: 1, warnings: [] }, meta: { formula_used: "learning_complete", uncertainty: 0 } });
    } catch (e: any) { res.status(500).json({ result: null, safety: { score: 0, warnings: [e.message] }, meta: { formula_used: "learning_complete", uncertainty: 1 } }); }
  });
  router.get("/employee-certifications/:employeeId", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_knowledge", "academy_certification_check", {
        student_id: req.params.employeeId,
        course_id: "all",
      });
      res.json({ result, safety: { score: 1, warnings: [] }, meta: { formula_used: "certification_check", uncertainty: 0 } });
    } catch (e: any) { res.status(500).json({ result: null, safety: { score: 0, warnings: [e.message] }, meta: { formula_used: "certification_check", uncertainty: 1 } }); }
  });

  // ─── Kaizen / Lean ──────────────────────────────────────────────────────
  router.get("/kaizen-suggestions", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "kaizen_list_suggestions", req.query));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/kaizen-score", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "kaizen_score"));
  router.post("/kaizen-status", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "kaizen_update_status"));

  // ─── Value Stream / Kanban / Root Cause / A3 ──────────────────────────
  // Wired (U-Q-VSM 2026-06-25): prism_business value_stream_map composes JobTravelerEngine (planned+actual
  // per-op times + scrap) and MachineDispatchEngine (WIP/queue) into a real value-stream map for the job.
  // Returns { data_available:false } (not a fake VSM) when the job has no traveler -- the route still 200s
  // with that honest payload so the SPA can render an empty state instead of mock data.
  router.get("/value-stream/:jobId", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "value_stream_map", { job_id: req.params.jobId }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  // prism_business has dispatch_queue_job/dispatch_reorder (writers) but NO dispatch_board (read view).
  // Fail loud (501); build a prism_business dispatch_board read action (owner: hotel) then wire.
  // Whole-shop planning board across all machine queues. The real action is dispatch_get_all_queues
  // (machineDispatchEngine.getAllQueues()); sibling dispatch_get_queue is per-machine. (U-FE-ROUTE-P0-ZERO
  // over-501'd this -- the action existed under a different name; rewired on second pass.)
  router.get("/dispatch-board", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "dispatch_get_all_queues", req.query));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/dispatch-queue-job", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "dispatch_queue_job"));
  router.post("/dispatch-reorder", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "dispatch_reorder"));
  // root_cause_list (built this session) returns NCs that have a d4_root_cause recorded (8D-style),
  // optionally filtered by status/severity/source. Distinct from nc_list (which lists ALL NCs).
  router.get("/root-cause-list", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "root_cause_list", req.query));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/root-cause-create", verifyToken, bizRoute(callTool, "root_cause_create"));
  router.post("/root-cause-action-create", verifyToken, bizRoute(callTool, "root_cause_action_create"));
  router.patch("/root-cause-action-status", verifyToken, bizRoute(callTool, "root_cause_action_update_status"));
  router.post("/troubleshoot-diagnose", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_knowledge", "troubleshoot_diagnose", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  // prism_business has a3_report_create (writer) but NO a3_report_list (read). Fail loud (501);
  // build a prism_business a3_report_list (owner: hotel) then wire.
  // Wired (U-ERP-A3-REPORT): prism_business a3_report_list -- A3ReportEngine store, newest first.
  // data_available:false when empty. Optional ?status/?owner_employee_id/?job_id/?limit.
  router.get("/a3-report-list", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "a3_report_list", {
        status: req.query.status, owner_employee_id: req.query.owner_employee_id, job_id: req.query.job_id, limit: req.query.limit,
      }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/a3-report-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "a3_report_create"));
  // Wired (U-ERP-A3-REPORT): prism_business a3_report_get -- one A3 by id ({found:false} when absent).
  router.get("/a3-report/:id", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "a3_report_get", { id: req.params.id }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── Executive / Flash Report ─────────────────────────────────────────
  // Wired (U-ERP-REVENUE-FORECAST): prism_business revenue_forecast -- linear-trend run-rate projection
  // of historical GL revenue (NOT a demand/pipeline model). data_available:false when no lookback revenue.
  // Admin-only. Optional ?lookback_months= & ?horizon_months= & ?as_of= query.
  router.get("/revenue-forecast", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "revenue_forecast", {
        lookback_months: req.query.lookback_months,
        horizon_months: req.query.horizon_months,
        as_of: req.query.as_of,
      }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  // Wired (U-ERP-CASH-FLOW): prism_business cash_flow_summary -- direct-method historical cash flow
  // (Cash-account inflow/outflow/net) per trailing month from posted GL entries. data_available:false
  // when no cash movement. Admin-only (financial read). Optional ?months= & ?as_of= query.
  router.get("/cash-flow", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "cash_flow_summary", { months: req.query.months, as_of: req.query.as_of }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/top-customers", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      // Forward ONLY the count param -- never caller-supplied customersPath/vendorsPath (resolveJmDbPaths
      // then uses the canonical JM DB paths). Closes the admin-only file-path override surface (scrutiny P2).
      const result = unwrapEnvelope(await callTool("prism_business", "jm_db_top_customers", { n: req.query.n, limit: req.query.limit }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  // Wired (U-ERP-OPS-KPIS): prism_business operations_kpis composes JobLifecycleEngine real job
  // data (status counts, overdue/at-risk, on-time-delivery rate from actual_end vs due_date).
  // Returns { data_available:false } when the job store is empty -- honest empty, not fake zeros.
  router.get("/operations-kpis", verifyToken, bizGet(callTool, "operations_kpis"));
  // Wired (U-ERP-MARGIN-TRENDS): prism_business margin_trends composes GeneralLedger income
  // statements per trailing month into a net-margin trend. Returns { data_available:false } when no
  // period has posted revenue. Admin-only (financial read). Optional ?months= & ?as_of= query.
  router.get("/margin-trends", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "margin_trends", { months: req.query.months, as_of: req.query.as_of }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/flash-report", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "daily_flash_generate", { date: req.query.date ?? new Date().toISOString().slice(0, 10), requestedBy: (req as any).user?.id ?? "system" }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/flash-report-email", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "daily_flash_email", req.body));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  // U-ERP-P2-HARDENING: was the ONE ungated erp.ts route (clock-only data, but
  // inconsistent with the router's blanket-auth posture -- close the odd one out).
  router.get("/shift-countdown", verifyToken, async (_req, res) => {
    try {
      const now = new Date();
      const hour = now.getHours();
      let shift_name = "night";
      let shift_end_hour = 6;
      if (hour >= 6 && hour < 14) { shift_name = "day"; shift_end_hour = 14; }
      else if (hour >= 14 && hour < 22) { shift_name = "afternoon"; shift_end_hour = 22; }
      const endOfShift = new Date(now);
      endOfShift.setHours(shift_end_hour, 0, 0, 0);
      if (endOfShift <= now) endOfShift.setDate(endOfShift.getDate() + 1);
      const time_remaining_sec = Math.max(0, Math.floor((endOfShift.getTime() - now.getTime()) / 1000));
      res.json({ ok: true, data: { shift_name, time_remaining_sec, jobs_completed_today: 0, scrap_rate_today: 0 } });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  // prism_business has oee_calculate (headline OEE) but NO oee_six_losses (the six-big-losses
  // breakdown -- different output). Fail loud (501); build oee_six_losses (owner: hotel) then wire.
  // oee_calculate returns the full OEEResult INCLUDING the six_big_losses breakdown (breakdowns/setup/
  // minor-stops/reduced-speed/startup-rejects/production-rejects). Coerce the GET query strings to numbers
  // so the engine math is reliable (the business oee_calculate case is a raw passthrough, no Zod coercion);
  // the FE reads result.six_big_losses. (U-FE-ROUTE-P0-ZERO 501'd this; rewired on second pass.)
  router.get("/oee-six-losses", verifyToken, async (req, res) => {
    try {
      const q = req.query as Record<string, unknown>;
      const num = (v: unknown) => (v === undefined ? undefined : Number(v));
      const input = {
        planned_production_time_min: num(q.planned_production_time_min),
        actual_run_time_min: num(q.actual_run_time_min),
        planned_downtime_min: num(q.planned_downtime_min),
        unplanned_downtime_min: num(q.unplanned_downtime_min),
        ideal_cycle_time_sec: num(q.ideal_cycle_time_sec),
        actual_cycle_time_sec: num(q.actual_cycle_time_sec),
        total_parts_produced: num(q.total_parts_produced),
        good_parts: num(q.good_parts),
        machine_id: q.machine_id, shift: q.shift, date: q.date,
      };
      const result = unwrapEnvelope(await callTool("prism_business", "oee_calculate", input));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── Timecard Status & Audit ────────────────────────────────────────────
  router.patch("/timecard-status", verifyToken, bizRoute(callTool, "timecard_status_update"));
  // prism_business has timecard_summary/timecard_status_update but NO timecard_audit_log (immutable
  // edit-history view). Fail loud (501); build a prism_business timecard_audit_log (owner: hotel) then wire.
  // Wired (U-ERP-TIMECARD-AUDIT): prism_business timecard_audit_log -- the real status-change audit
  // trail TimeClockEngine records on each clock/job transition (not reconstructed from current state).
  // data_available:false when empty. HR-tier. Optional ?employee_id/?job_id/?entity_type/?action_filter/?since/?limit.
  router.get("/timecard-audit-log", verifyToken, requireRole("hr_manager", "admin"), async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "timecard_audit_log", {
        employee_id: req.query.employee_id,
        job_id: req.query.job_id,
        entity_type: req.query.entity_type,
        action_filter: req.query.action_filter,
        since: req.query.since,
        limit: req.query.limit,
      }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── Payroll (HR manager or admin only) ──────────────────────────────────
  router.post("/payroll-period", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "payroll_create_period"));
  router.post("/payroll-run", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "payroll_run"));

  // ─── Invoicing ────────────────────────────────────────────────────────────
  router.post("/invoice-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "invoice_create"));
  router.post("/invoices", verifyToken, bizRoute(callTool, "invoice_list"));

  // ─── Job Lifecycle ────────────────────────────────────────────────────────
  router.post("/job-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "job_create"));
  router.post("/job-update-status", verifyToken, bizRoute(callTool, "job_update_status"));
  router.post("/job-summary", verifyToken, bizRoute(callTool, "job_summary"));
  router.get("/job-dashboard", verifyToken, bizGet(callTool, "job_dashboard"));
  router.post("/job-profitability", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "actual_cost_calculate", req.body));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── Tool Usage ───────────────────────────────────────────────────────────
  router.post("/tool-usage", verifyToken, bizRoute(callTool, "tool_job_cost"));
  router.post("/tool-inventory-add", verifyToken, bizRoute(callTool, "tool_inventory_add"));
  router.post("/tool-regrind", verifyToken, bizRoute(callTool, "tool_regrind"));
  router.get("/tool-reorder-alerts", verifyToken, bizGet(callTool, "tool_reorder_alerts"));
  // --- Kienzle Tool Crib read feeds (U-ERP-TOOLCRIB-ROUTES) ---
  // The toolInventoryOrchestrator / ERPToolInventory / ToolCostPerPart / tool-life-forecast backend
  // existed as prism_business actions but had NO REST routes, so the Kienzle Tool Crib page could not
  // reach it. These close the route-layer gap (every action probe-verified to resolve to a real engine).
  // NOTE: distinct from the prism_calc tool-checkout surface at /api/v1/tool-crib/* (src/routes/toolCrib.ts);
  // this /erp/* set is the ERP tool-INVENTORY/cost/life view, not the physical checkout/checkin ledger.
  router.get("/tool-crib-reorder", verifyToken, bizGet(callTool, "tool_inv_reorder_list"));
  router.get("/tool-crib-search", verifyToken, async (req, res) => {
    // erp_tool_search requires a non-empty query (z.string().min(1)). With no ?query, return a clean
    // empty result rather than forwarding "" into a schema rejection -- correct REST for a search box.
    const query = (req.query.query ?? "").toString();
    if (!query) { res.json({ ok: true, data: { tools: [], query: "", note: "provide ?query to search the tool crib" } }); return; }
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "erp_tool_search", { query, category: req.query.category }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/tool-crib-substitutes", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "tool_inv_suggest_substitutes", {
        required_diameter: Number(req.query.diameter ?? req.query.required_diameter ?? 10),
        required_type: req.query.required_type ?? req.query.type ?? "endmill",
        material: req.query.material ?? "P",
      }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/tool-cost-per-part", verifyToken, async (req, res) => {
    try {
      // Coerce numeric query params (Express query values are strings) so the engine does real math, not
      // string arithmetic / NaN. num() returns undefined for absent params -> engine uses its defaults.
      const q = req.query as Record<string, any>;
      const num = (v: unknown) => (v === undefined ? undefined : Number(v));
      const input = {
        catalog_number: q.catalog_number,
        tool_type: q.tool_type,
        tool_price: num(q.tool_price),
        insert_price: num(q.insert_price),
        inserts_per_tool: num(q.inserts_per_tool),
        edges_per_insert: num(q.edges_per_insert),
        holder_price: num(q.holder_price),
        holder_life_parts: num(q.holder_life_parts),
        regrind_cost: num(q.regrind_cost),
        regrind_life_pct: num(q.regrind_life_pct),
        max_regrinds: num(q.max_regrinds),
        tool_life_min: num(q.tool_life_min),
        cutting_time_per_part_min: num(q.cutting_time_per_part_min),
        annual_production: num(q.annual_production),
      };
      const result = unwrapEnvelope(await callTool("prism_business", "tool_cost_per_part", input));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/tool-life-forecast", verifyToken, async (req, res) => {
    try {
      // Fallback defaults (material=steel, Vc=150) keep the feed live when the page omits a param; the
      // frontend passes real values. report_tool_life_forecast no longer crashes on a missing material.
      const result = unwrapEnvelope(await callTool("prism_business", "report_tool_life_forecast", {
        material: req.query.material ?? "steel",
        cutting_speed_mpm: Number(req.query.cutting_speed_mpm ?? req.query.vc ?? 150),
        taylor_C: req.query.taylor_C != null ? Number(req.query.taylor_C) : undefined,
        taylor_n: req.query.taylor_n != null ? Number(req.query.taylor_n) : undefined,
      }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/tool-crib-availability", verifyToken, bizRoute(callTool, "tool_inv_check_availability"));
  router.post("/tool-crib-optimize", verifyToken, bizRoute(callTool, "tool_inv_optimize_crib"));

  // --- Kienzle Quality page feeds (U-ERP-QUALITY-ROUTES) ---
  // ERPQualityEngine (inspections + NCRs) existed as prism_business erp_quality_* actions but had NO
  // REST routes -- the Kienzle Quality page could not reach it. All three WRITES (inspection +
  // NCR create/close PERSIST quality records) are role-gated; reads are token-gated. Param validation is
  // enforced by the dispatcher Zod schemas (businessActionSchemas), not the engine. SPC computation
  // stays in the quality galaxy; this is ERP quality. PII tier-note: records carry inspector/createdBy
  // employee IDs (internal, not SSN/financial) -- a tier-review item, consistent with the OSHA-300 route.
  router.get("/quality-metrics", verifyToken, async (req, res) => {
    const wo = (req.query.work_order_number ?? req.query.wo ?? "").toString();
    if (!wo) { res.json({ ok: true, data: { data_available: false, note: "provide ?work_order_number" } }); return; }
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "erp_quality_metrics", { work_order_number: wo }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/quality-inspections-by-type", verifyToken, async (req, res) => {
    const wo = (req.query.work_order_number ?? req.query.wo ?? "").toString();
    if (!wo) { res.json({ ok: true, data: { data_available: false, note: "provide ?work_order_number" } }); return; }
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "erp_quality_inspections_by_type", { work_order_number: wo }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/quality-open-ncrs", verifyToken, async (req, res) => {
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "erp_quality_open_ncrs", { work_order_number: req.query.work_order_number ?? req.query.wo }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/quality-inspection-trend", verifyToken, bizGet(callTool, "erp_quality_inspection_trend"));
  router.post("/quality-record-inspection", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "erp_quality_record_inspection"));
  router.post("/quality-create-ncr", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "erp_quality_create_ncr"));
  router.post("/quality-close-ncr", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "erp_quality_close_ncr"));

  // --- Kienzle Scheduling page feeds (U-ERP-SCHEDULE-ROUTES) ---
  // ShiftScheduleOptimizerEngine + MilestoneTrackingEngine existed as prism_business actions with NO
  // routes. schedule_optimize/what_if were ALSO crashing on empty input (undefined.map / .makespan_hours)
  // -- guarded in the engine (graceful empty) before exposing. These are computations (no persisted
  // write), so token-gated. balance/optimize/what-if take array/baseline bodies -> POST.
  router.get("/schedule-jobs", verifyToken, bizGet(callTool, "milestone_list_jobs"));
  // Read the job's milestone timeline (status/progress). Uses milestone_get_timeline (a READ) -- NOT
  // milestone_on_job_status, which is a status-CHANGE mutator requiring new_status (would return null here).
  router.get("/schedule-job-status", verifyToken, async (req, res) => {
    const jobId = (req.query.job_id ?? req.query.jobId ?? "").toString();
    if (!jobId) { res.json({ ok: true, data: { data_available: false, note: "provide ?job_id" } }); return; }
    try {
      const result = unwrapEnvelope(await callTool("prism_business", "milestone_get_timeline", { job_id: jobId }));
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/schedule-balance", verifyToken, bizRoute(callTool, "schedule_balance"));
  router.post("/schedule-optimize", verifyToken, bizRoute(callTool, "schedule_optimize"));
  router.post("/schedule-what-if", verifyToken, bizRoute(callTool, "schedule_what_if"));

  // ─── Purchase Orders (AP) ─────────────────────────────────────────────────
  router.post("/po-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "po_create"));
  router.post("/po-approve", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "po_approve"));
  router.post("/po-receive", verifyToken, bizRoute(callTool, "po_receive"));
  router.post("/po-list", verifyToken, bizRoute(callTool, "po_list"));
  router.get("/po-ap-aging", verifyToken, bizGet(callTool, "po_ap_aging"));
  router.post("/po-three-way-match", verifyToken, bizRoute(callTool, "po_three_way_match"));
  router.post("/po-spend-by-category", verifyToken, bizRoute(callTool, "po_spend_by_category"));

  // ─── General Ledger (admin/hr_manager only) ──────────────────────────────
  router.get("/gl-accounts", verifyToken, bizGet(callTool, "gl_chart_of_accounts"));
  router.post("/gl-journal", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "gl_journal_entry"));
  router.post("/gl-trial-balance", verifyToken, bizRoute(callTool, "gl_trial_balance"));
  router.post("/gl-income-statement", verifyToken, bizRoute(callTool, "gl_income_statement"));
  router.post("/gl-balance-sheet", verifyToken, bizRoute(callTool, "gl_balance_sheet"));
  router.post("/gl-record-invoice", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "gl_record_invoice"));
  router.post("/gl-record-payment", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "gl_record_payment"));
  router.post("/gl-record-purchase", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "gl_record_purchase"));
  router.post("/gl-record-payroll", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "gl_record_payroll"));

  // ─── Accounting Close (U-ERP-ACCT-CLOSE-FE) ───────────────────────────────
  // The 9 accounting-close dispatcher cases (AccountingHardeningEngine 6 methods
  // + the 1099/W2/sales-tax filing engines) existed with ZERO route exposure --
  // the FE could not reach them at all. Reuses rfqRoute (NOT bizRoute) so the
  // prism_business {type,text} slimResponse envelope is unwrapped (the recurring
  // dead-panel class). Tiers mirror the GL section above: pure calculators on
  // caller-supplied data = verifyToken only (like /gl-trial-balance);
  // GL-write-class reconciliation/integration + SSN-bearing filings = hr_manager/admin.
  // R7 note: /reconcile-bank (integration_reconcile_bank) + /export-quickbooks
  // (integration_export_qb) below are DIFFERENT surfaces -- those are IntegrationAdapter
  // EXPORTS; these are AccountingHardeningEngine pure calculators on caller-supplied data.
  router.post("/acct-bank-reconcile", verifyToken, requireRole("hr_manager", "admin"), rfqRoute("acct_bank_reconcile"));
  router.post("/acct-wip-valuation", verifyToken, rfqRoute("acct_wip_valuation"));
  router.post("/acct-variance-analysis", verifyToken, rfqRoute("acct_variance_analysis"));
  router.post("/acct-cost-to-complete", verifyToken, rfqRoute("acct_cost_to_complete"));
  router.post("/acct-multi-period-compare", verifyToken, rfqRoute("acct_multi_period_compare"));
  router.post("/acct-quickbooks-sync", verifyToken, requireRole("hr_manager", "admin"), rfqRoute("acct_quickbooks_sync"));
  router.post("/form-1099nec", verifyToken, requireRole("hr_manager", "admin"), rfqRoute("form_1099nec_generate"));
  router.post("/payroll-w2", verifyToken, requireRole("hr_manager", "admin"), rfqRoute("payroll_generate_w2"));
  router.post("/sales-use-tax", verifyToken, rfqRoute("sales_use_tax_calc"));

  // ─── Capacity Planning ────────────────────────────────────────────────────
  router.get("/capacity-machines", verifyToken, bizGet(callTool, "capacity_machines"));
  router.post("/capacity-loads", verifyToken, bizRoute(callTool, "capacity_all_loads"));
  router.post("/capacity-bottlenecks", verifyToken, bizRoute(callTool, "capacity_bottlenecks"));
  router.get("/capacity-summary", verifyToken, bizGet(callTool, "capacity_summary"));
  router.post("/capacity-schedule-job", verifyToken, bizRoute(callTool, "capacity_schedule_job"));
  router.post("/capacity-what-if", verifyToken, bizRoute(callTool, "capacity_what_if"));

  // ─── Quality Management ───────────────────────────────────────────────────
  router.post("/quality-spc", verifyToken, bizRoute(callTool, "quality_spc_chart"));
  router.get("/quality-calibration", verifyToken, bizGet(callTool, "quality_calibration_dashboard"));
  router.get("/quality-ncr-dashboard", verifyToken, bizGet(callTool, "quality_ncr_dashboard"));
  router.post("/quality-ncr-create", verifyToken, bizRoute(callTool, "quality_ncr_create"));
  router.post("/quality-ncr-update", verifyToken, bizRoute(callTool, "quality_ncr_update"));
  router.get("/quality-kpis", verifyToken, bizGet(callTool, "quality_kpis"));
  router.post("/quality-calibration-add", verifyToken, bizRoute(callTool, "quality_calibration_add"));
  router.post("/quality-material-cert", verifyToken, bizRoute(callTool, "quality_material_cert"));
  router.post("/quality-trace-heat-lot", verifyToken, bizRoute(callTool, "quality_trace_heat_lot"));
  router.post("/quality-trace-job", verifyToken, bizRoute(callTool, "quality_trace_job"));
  router.post("/quality-fai-create", verifyToken, bizRoute(callTool, "quality_fai_create"));
  router.post("/quality-fai-list", verifyToken, bizRoute(callTool, "quality_fai_list"));

  // ─── HR & Compliance (mostly hr_manager+) ────────────────────────────────
  router.get("/hr-benefits", verifyToken, bizGet(callTool, "hr_benefits_list"));
  router.post("/hr-pto-balance", verifyToken, bizRoute(callTool, "hr_pto_balance"));
  router.post("/hr-pto-request", verifyToken, bizRoute(callTool, "hr_pto_request"));
  router.post("/hr-pto-approve", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "hr_pto_approve"));
  router.post("/hr-training", verifyToken, bizRoute(callTool, "hr_training_history"));
  router.post("/hr-training-expiring", verifyToken, bizRoute(callTool, "hr_training_expiring"));
  router.get("/hr-compliance-alerts", verifyToken, requireRole("hr_manager", "admin"), bizGet(callTool, "hr_compliance_alerts"));
  router.get("/hr-dashboard", verifyToken, requireRole("hr_manager", "admin"), bizGet(callTool, "hr_dashboard"));
  router.post("/hr-enroll", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "hr_enroll"));
  router.post("/hr-review-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "hr_review_create"));
  router.post("/hr-reviews", verifyToken, bizRoute(callTool, "hr_reviews"));
  router.post("/hr-compensation-history", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "hr_compensation_history"));

  // ─── Customer / CRM ───────────────────────────────────────────────────────
  router.post("/customer-create", verifyToken, bizRoute(callTool, "customer_create"));
  router.post("/customer-get", verifyToken, bizRoute(callTool, "customer_get"));
  router.post("/customer-update", verifyToken, bizRoute(callTool, "customer_update"));
  router.post("/customer-search", verifyToken, bizRoute(callTool, "customer_search"));
  router.post("/customer-list", verifyToken, bizRoute(callTool, "customer_list"));
  router.post("/customer-credit-check", verifyToken, bizRoute(callTool, "customer_credit_check"));
  router.post("/customer-analytics", verifyToken, bizRoute(callTool, "customer_analytics"));
  router.post("/customer-top", verifyToken, bizRoute(callTool, "customer_top"));
  router.get("/customer-pipeline", verifyToken, bizGet(callTool, "customer_pipeline"));
  router.get("/customer-follow-ups", verifyToken, bizGet(callTool, "customer_follow_ups"));
  router.post("/customer-log-comm", verifyToken, bizRoute(callTool, "customer_log_comm"));
  router.post("/customer-comm-history", verifyToken, bizRoute(callTool, "customer_comm_history"));
  router.post("/customer-create-opportunity", verifyToken, bizRoute(callTool, "customer_create_opportunity"));
  router.post("/customer-update-opportunity", verifyToken, bizRoute(callTool, "customer_update_opportunity"));

  // ─── Vendor scorecard (U-HOTEL-WIRE-VENDOR-SCORECARD) ──────────────────────
  // VendorScorecardPage calls vendorList() and reads .data as a rich Vendor[] (quality_score/delivery_score/
  // price_score/composite_score 0..100 + ncr_count/on_time_pct/avg_lead_days). The raw vendor_list_all action
  // returns string[] (vendor ids) -> the page rendered an empty/NaN table (per-file scrutiny FAIL). So /vendor-list
  // targets the NEW vendor_list_scorecards action (VendorPerformanceTrackerEngine.listScorecards), which composes
  // computeScorecard per vendor and maps the engine's 0..1 metrics to the page's 0..100 field shape -- the adapter
  // that makes the page live. /vendor-scorecard/:id returns the single raw VendorScorecard (vendor_compute_scorecard)
  // for a future per-vendor detail view. Both reuse rfqRoute for the {type,text} envelope unwrap. verifyToken tier:
  // internal operator desk (vendor performance is not financial/PII), matching the sibling /customer-pipeline tier.
  router.get("/vendor-list", verifyToken, rfqRoute("vendor_list_scorecards", () => ({})));
  router.get("/vendor-scorecard/:vendor_id", verifyToken,
    rfqRoute("vendor_compute_scorecard", (req) => ({ vendor_id: String(req.params.vendor_id) })));

  // ─── Sales pipeline forecast + stages (U-HOTEL-WIRE-PIPELINE) ──────────────
  // SalesPipelinePage calls pipelineForecast() (reads Forecast {pipeline_value/conversion_rate/forecast_30d/
  // forecast_90d/backlog_value}) and pipelineStages() (reads PipelineStage[] {stage/count/value/weighted_value/
  // probability_pct}). The raw prospect_pipeline_report returns {by_status,total_prospects,total_pipeline_value_usd}
  // -- NEITHER FE shape (per-file scrutiny FAIL on the first attempt). So these target the NEW adapter actions
  // prospect_pipeline_forecast + prospect_pipeline_stages (ProspectiveCustomerEngine.pipelineForecast/pipelineStages),
  // which project the report into the page's exact shapes (probability-weighted forecast + per-open-stage funnel).
  // Both reuse rfqRoute for the {type,text} envelope unwrap. verifyToken tier: internal sales desk (pipeline is
  // operator-internal, not financial/PII), matching the sibling /customer-pipeline tier.
  router.get("/pipeline-forecast", verifyToken, rfqRoute("prospect_pipeline_forecast", () => ({})));
  router.get("/pipeline-stages", verifyToken, rfqRoute("prospect_pipeline_stages", () => ({})));

  // ─── Root-cause incidents (U-HOTEL-WIRE-ROOTCAUSE) ─────────────────────────
  // RootCausePage.getRootCauseIncidents() reads res.data as an ARRAY of rows and maps d.id/d.problem(??
  // d.description)/d.root_cause/d.date(?? d.created_at)/d.severity/d.status/d.assigned_to. The root_cause_list
  // action returns {count, root_causes:[{ncr_id,root_cause,recorded_at,status,severity,source,description}]} --
  // an OBJECT, not the array the page reads, and ncr_id/recorded_at don't match d.id/d.date. So this is a custom
  // adapter route (not rfqRoute, whose r?.data ?? r would surface the {count,...} object): unwrap the envelope,
  // then map root_causes[] -> the page row shape (ncr_id->id, recorded_at->date). verifyToken: internal quality desk.
  // NOTE: submitRootCauseAnalysis() (POST /root-cause-analysis) is DEFERRED -- it has no live FE caller (orphan
  // client fn) AND its target nc_record_root_cause needs an already-`contained` NC + ncr_id (FE sends incident_id);
  // wiring it now would ship a 500-on-submit path. Tracked for the Cluster-B NCR/8D follow-up.
  router.get("/root-cause-incidents", verifyToken, async (req, res) => {
    try {
      const r = unwrapEnvelope(await callTool("prism_business", "root_cause_list", {
        status: req.query.status, severity: req.query.severity, source: req.query.source,
      }));
      if (r && (r as any).success === false) {
        res.status(400).json({ ok: false, error: (r as any).error ?? "root_cause_list failed" });
        return;
      }
      const rows = Array.isArray((r as any)?.data?.root_causes) ? (r as any).data.root_causes : [];
      const mapped = rows.map((rc: any) => ({
        id: rc.ncr_id,
        problem: rc.description ?? "",
        root_cause: rc.root_cause ?? "",
        date: rc.recorded_at ?? null,
        severity: rc.severity ?? "medium",
        status: rc.status ?? "open",
        source: rc.source,
      }));
      res.json({ ok: true, data: mapped });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ─── Integration / Export ─────────────────────────────────────────────────
  router.post("/export-csv", verifyToken, bizRoute(callTool, "integration_export_csv"));
  router.post("/reconcile-bank", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "integration_reconcile_bank"));
  router.get("/export-formats", verifyToken, bizGet(callTool, "integration_formats"));
  router.post("/export-quickbooks", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "integration_export_qb"));
  router.post("/export-payroll-tax", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "integration_export_payroll_tax"));
  router.get("/export-ar-aging", verifyToken, bizGet(callTool, "integration_export_ar_aging"));

  // ─── Inventory ────────────────────────────────────────────────────────────
  router.post("/inventory-eoq", verifyToken, bizRoute(callTool, "inventory_eoq"));
  router.post("/inventory-abc", verifyToken, bizRoute(callTool, "inventory_abc"));
  router.post("/inventory-safety-stock", verifyToken, bizRoute(callTool, "inventory_safety_stock"));
  router.post("/inventory-tool-optimize", verifyToken, bizRoute(callTool, "inventory_tool_optimize"));

  // ─── Scheduling ───────────────────────────────────────────────────────────
  router.post("/scheduling-job-shop", verifyToken, bizRoute(callTool, "scheduling_job_shop"));
  router.post("/scheduling-single-machine", verifyToken, bizRoute(callTool, "scheduling_single_machine"));
  router.post("/scheduling-johnsons", verifyToken, bizRoute(callTool, "scheduling_johnsons"));
  router.post("/scheduling-cpm", verifyToken, bizRoute(callTool, "scheduling_cpm"));

  // ─── Purchasing ───────────────────────────────────────────────────────────
  router.post("/purchasing-search", verifyToken, bizRoute(callTool, "purchasing_search"));
  router.post("/purchasing-recommend", verifyToken, bizRoute(callTool, "purchasing_recommend"));
  router.post("/purchasing-manufacturers", verifyToken, bizRoute(callTool, "purchasing_manufacturers"));
  router.get("/purchasing-summary", verifyToken, bizGet(callTool, "purchasing_summary"));

  // ─── Order Management ─────────────────────────────────────────────────────
  router.post("/order-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "order_create"));
  router.post("/order-update-status", verifyToken, bizRoute(callTool, "order_update_status"));
  router.post("/order-list", verifyToken, bizRoute(callTool, "order_list"));
  router.post("/work-order-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "order_work_order_create"));
  router.post("/order-log-time", verifyToken, bizRoute(callTool, "order_log_time"));
  router.post("/order-log-production", verifyToken, bizRoute(callTool, "order_log_production"));
  router.post("/machine-queue", verifyToken, bizRoute(callTool, "order_machine_queue"));
  router.get("/order-metrics", verifyToken, bizGet(callTool, "order_metrics"));

  // ─── Maintenance work orders (U-HOTEL-MAINT-WORKORDER, gap #6) ─────────────
  // MaintenanceWorkOrderPage used RAW fetch() (no auth header -> 401 behind verifyToken) against routes that
  // did not exist -> the queue was dead. Reuses the already-wired pm_work_order_list (PreventiveMaintenanceEngine)
  // and ADAPTS the PMWorkOrder shape to the FE WorkOrder contract (machine_id->asset_id, machine_name->asset_name,
  // task_name->description, created_at->opened_at, scheduled_date->due_at, labor_hours->est_labor_hours,
  // assigned_to->assignee). PMWorkOrder has no priority field, so it defaults to "normal" (honest -- no fabricated
  // priority signal). The route unwraps the prism_business {type,text} slimResponse envelope (the dead-panel class).
  const adaptWorkOrder = (w: any) => ({
    id: String(w?.id ?? ""),
    asset_id: w?.machine_id ?? "",
    asset_name: w?.machine_name ?? w?.machine_id ?? "",
    description: w?.task_name ?? "",
    priority: "normal", // PMWorkOrder has no priority -- the honest default (do not fabricate one)
    status: w?.status ?? "open",
    assignee: w?.assigned_to ?? undefined,
    opened_at: w?.created_at ?? w?.scheduled_date ?? "",
    due_at: w?.scheduled_date ?? undefined,
    est_labor_hours: typeof w?.labor_hours === "number" ? w.labor_hours : undefined,
  });
  const listMaintenanceWorkOrders = async (req: any, res: any) => {
    try {
      const r = unwrapEnvelope(await callTool("prism_business", "pm_work_order_list", req.body ?? {}));
      const rows: any[] = Array.isArray((r as any)?.work_orders) ? (r as any).work_orders
        : Array.isArray((r as any)?.data?.work_orders) ? (r as any).data.work_orders
        : Array.isArray(r) ? (r as any) : [];
      const orders = rows.filter((w) => w && w.id != null).map(adaptWorkOrder);
      res.json({ ok: true, orders });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  };
  router.get("/maintenance/work-orders", verifyToken, listMaintenanceWorkOrders);
  // Refresh button: a REAL re-list (not a fake 200) so the page gets fresh data on click.
  router.post("/maintenance/refresh", verifyToken, listMaintenanceWorkOrders);

  // ─── Preventive Maintenance + Assets cluster (U-HOTEL-WIRE-PM-ASSET) ────────
  // Wires the dead PreventiveMaintenancePage + EquipmentAssetPage. These pages called api/client fns
  // (pmSchedules/pmScheduleList/pmWorkOrderList/assetList/...) that hit /erp routes which did NOT exist
  // -> the desks were dead. Every call has a backing prism_business action (R8 reuse, no new engine):
  // pm_schedule_create/list, pm_work_order_generate/list/assign/complete, pm_overdue_alerts,
  // asset_register, asset_list, asset_transfer, asset_calibration_due, asset_depreciation_schedule.
  // All reuse rfqRoute so the prism_business {type,text} slimResponse envelope is unwrapped (the recurring
  // dead-panel class). The cases return {schedules}/{work_orders}/{alerts}/{assets}/{due}/{schedule}, which
  // the FE's recoveryUtils.arrayFromPayload(['alerts','schedules','work_orders','assets',...]) reads from
  // res.data.*. verifyToken-only: PM/asset data is internal shop-ops (machine maintenance + equipment
  // register), no customer $/PII -- matches the order-management sibling tier above.
  //
  // The PreventiveMaintenancePage's `maintenanceWorkOrders()` client fn targets the HYPHEN path
  // /erp/maintenance-work-orders (distinct from the slash /maintenance/work-orders the MaintenanceWorkOrderPage
  // uses). Wire BOTH the hyphen list + complete to the same already-adapted handler / pm action.
  router.get("/maintenance-work-orders", verifyToken, listMaintenanceWorkOrders);
  // The FE maintenanceWorkOrderComplete() sends {wo_id, labor_hours, notes}, but pm_work_order_complete reads
  // params.work_order_id -> map wo_id -> work_order_id (else completeWorkOrder(undefined) throws on every click).
  router.post("/maintenance-work-orders/complete", verifyToken,
    rfqRoute("pm_work_order_complete", (req) => ({
      work_order_id: req.body?.wo_id ?? req.body?.work_order_id,
      labor_hours: req.body?.labor_hours,
      notes: req.body?.notes,
    })));

  // PM schedules: the page first-loads via GET /pm-schedules (an overdue-alert desk) -- map it to the
  // overdue-alerts action so the "scheduleAlerts" panel populates (the FE reads ['alerts','schedules',...]).
  // The dedicated schedule CRUD uses the POST pm-schedule-* routes.
  router.get("/pm-schedules", verifyToken, rfqRoute("pm_overdue_alerts", () => ({})));
  router.post("/pm-schedule-create", verifyToken, rfqRoute("pm_schedule_create"));
  router.post("/pm-schedule-list", verifyToken, rfqRoute("pm_schedule_list"));
  router.post("/pm-work-order-generate", verifyToken, rfqRoute("pm_work_order_generate"));
  router.post("/pm-work-order-list", verifyToken, rfqRoute("pm_work_order_list"));
  router.post("/pm-work-order-assign", verifyToken, rfqRoute("pm_work_order_assign"));
  router.post("/pm-complete", verifyToken, rfqRoute("pm_work_order_complete"));
  router.get("/pm-overdue-alerts", verifyToken, rfqRoute("pm_overdue_alerts", () => ({})));

  // pm-generate-work-order: the page sends {alert_id} (the selected overdue alert). getOverdueAlerts returns
  // {schedule: PMSchedule, days_overdue, ...}, so the alert's identity IS the schedule id; generateWorkOrder
  // takes (schedule_id, scheduled_date). Map alert_id->schedule_id and default scheduled_date to today (R12:
  // the honest default -- the operator is generating the WO "now"). A missing alert_id forwards schedule_id
  // undefined, so the engine throws "PM schedule not found: undefined" -> rfqRoute surfaces it (no fabricated WO).
  router.post("/pm-generate-work-order", verifyToken, rfqRoute("pm_work_order_generate", (req) => {
    const alertId = req.body?.alert_id ?? req.body?.schedule_id;
    return {
      schedule_id: alertId,
      scheduled_date: req.body?.scheduled_date ?? new Date().toISOString().slice(0, 10),
    };
  }));

  // Equipment assets (EquipmentAssetPage). The hyphen path /equipment-assets is the asset register list.
  router.get("/equipment-assets", verifyToken, rfqRoute("asset_list", () => ({})));
  router.post("/asset-register", verifyToken, rfqRoute("asset_register"));
  router.post("/asset-list", verifyToken, rfqRoute("asset_list"));
  router.post("/asset-transfer", verifyToken, rfqRoute("asset_transfer"));
  router.post("/asset-due-calibrations", verifyToken, rfqRoute("asset_calibration_due"));
  router.get("/asset-depreciation/:asset_id", verifyToken,
    rfqRoute("asset_depreciation_schedule", (req) => ({ asset_id: String(req.params.asset_id) })));

  // ─── Machine Rates ────────────────────────────────────────────────────────
  router.post("/machine-rate-lookup", verifyToken, bizRoute(callTool, "machine_rate_lookup"));
  router.get("/machine-rate-list", verifyToken, bizGet(callTool, "machine_rate_list"));
  router.post("/machine-rate-compare", verifyToken, bizRoute(callTool, "machine_rate_compare"));
  router.post("/machine-rate-effective", verifyToken, bizRoute(callTool, "machine_rate_effective"));

  // ─── Batch Optimization ───────────────────────────────────────────────────
  router.post("/batch-group", verifyToken, bizRoute(callTool, "batch_group"));
  router.post("/batch-sequence", verifyToken, bizRoute(callTool, "batch_sequence"));
  router.post("/batch-setup-matrix", verifyToken, bizRoute(callTool, "batch_setup_matrix"));
  router.post("/batch-capacity", verifyToken, bizRoute(callTool, "batch_capacity"));

  // ─── Reporting ────────────────────────────────────────────────────────────
  router.get("/reporting-dashboard", verifyToken, bizGet(callTool, "reporting_dashboard"));
  router.post("/reporting-pareto", verifyToken, bizRoute(callTool, "reporting_pareto"));
  router.post("/reporting-production", verifyToken, bizRoute(callTool, "reporting_production"));
  router.post("/reporting-quality", verifyToken, bizRoute(callTool, "reporting_quality"));
  router.post("/reporting-financial", verifyToken, bizRoute(callTool, "reporting_financial"));
  router.post("/reporting-trend", verifyToken, bizRoute(callTool, "reporting_trend"));

  // ─── Financial Analysis ───────────────────────────────────────────────────
  router.post("/financial-npv", verifyToken, bizRoute(callTool, "financial_npv"));
  router.post("/financial-irr", verifyToken, bizRoute(callTool, "financial_irr"));
  router.post("/financial-breakeven", verifyToken, bizRoute(callTool, "financial_breakeven"));
  router.post("/financial-machine-investment", verifyToken, bizRoute(callTool, "financial_machine_investment"));

  // ─── Actual Cost Tracking ─────────────────────────────────────────────────
  router.post("/actual-cost-calculate", verifyToken, bizRoute(callTool, "actual_cost_calculate"));
  router.post("/actual-cost-variance", verifyToken, bizRoute(callTool, "actual_cost_variance"));
  router.post("/actual-cost-profitability", verifyToken, bizRoute(callTool, "actual_cost_profitability"));
  router.post("/actual-cost-forecast", verifyToken, bizRoute(callTool, "actual_cost_forecast"));
  router.post("/actual-cost-margin-alerts", verifyToken, bizRoute(callTool, "actual_cost_margin_alerts"));
  router.post("/actual-cost-trend", verifyToken, bizRoute(callTool, "actual_cost_trend"));

  // ─── Approval Workflows ───────────────────────────────────────────────────
  router.post("/workflows", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "workflow_configure"));
  router.post("/workflows/submit", verifyToken, bizRoute(callTool, "workflow_submit"));
  router.post("/workflows/decide", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "workflow_decide"));
  router.get("/workflows/pending", verifyToken, bizGet(callTool, "workflow_pending"));
  router.post("/workflows/pending", verifyToken, bizRoute(callTool, "workflow_pending"));
  router.post("/workflows/status", verifyToken, bizRoute(callTool, "approval_workflow_status"));
  router.post("/workflows/cancel", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "workflow_cancel"));
  router.get("/workflows/list", verifyToken, bizGet(callTool, "approval_workflow_list"));
  router.get("/workflows/stats", verifyToken, bizGet(callTool, "workflow_stats"));
  router.post("/workflows/requires-approval", verifyToken, bizRoute(callTool, "workflow_requires_approval"));
  router.post("/workflows/entity-history", verifyToken, bizRoute(callTool, "workflow_entity_history"));

  // ─── Record Timeline & Comments ───────────────────────────────────────────
  router.post("/timeline", verifyToken, bizRoute(callTool, "timeline_get"));
  router.post("/timeline/add", verifyToken, bizRoute(callTool, "timeline_add"));
  router.post("/comments", verifyToken, bizRoute(callTool, "comment_create"));
  router.post("/comments/list", verifyToken, bizRoute(callTool, "comment_list"));
  router.post("/comments/edit", verifyToken, bizRoute(callTool, "comment_edit"));
  router.post("/comments/delete", verifyToken, bizRoute(callTool, "comment_delete"));

  return router;
}
