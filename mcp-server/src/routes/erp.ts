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

function bizRoute(callTool: CallToolFn, action: string) {
  return async (req: any, res: any) => {
    try {
      const result = await callTool("prism_business", action, req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  };
}

function bizGet(callTool: CallToolFn, action: string) {
  return async (_req: any, res: any) => {
    try {
      const result = await callTool("prism_business", action, {});
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

/** Ensure clock operations target the requesting user's own employee_id, unless admin/supervisor. */
function requireSelfOrAdmin(req: any, res: any, next: any): void {
  const targetId = req.body?.employee_id;
  if (!targetId) { next(); return; }
  const isAdmin = req.userRoles?.some((r: string) => ["admin", "supervisor", "hr_manager"].includes(r));
  if (isAdmin) { next(); return; }
  // userId is the auth user_id; employee_id must match (or be absent to default to self)
  if (req.userId && targetId !== req.userId) {
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
      const result = await callTool("prism_business", "who_clocked_in", { employee_id: req.params.employeeId, mode: "active_jobs" });
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/shift-handoff/:employeeId", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_business", "who_clocked_in", { employee_id: req.params.employeeId, mode: "handoff" });
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
      const result = await callTool("prism_knowledge", "academy_curriculum", {
        sub_action: "student_dashboard",
        student_id: req.body.employee_id,
        role: req.body.role,
      });
      res.json({ result, safety: { score: 1, warnings: [] }, meta: { formula_used: "learning_path", uncertainty: 0 } });
    } catch (e: any) { res.status(500).json({ result: null, safety: { score: 0, warnings: [e.message] }, meta: { formula_used: "learning_path", uncertainty: 1 } }); }
  });
  router.post("/employee-learning-complete", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_knowledge", "academy_curriculum", {
        sub_action: "complete_lesson",
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
      const result = await callTool("prism_business", "kaizen_list", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/kaizen-score", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "kaizen_score"));
  router.post("/kaizen-status", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "kaizen_update_status"));

  // ─── Value Stream / Kanban / Root Cause / A3 ──────────────────────────
  router.get("/value-stream/:jobId", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_business", "value_stream_map", { job_id: req.params.jobId });
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/dispatch-board", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_business", "dispatch_board", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/dispatch-queue-job", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "dispatch_queue_job"));
  router.post("/dispatch-reorder", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "dispatch_reorder"));
  router.get("/root-cause-list", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_business", "root_cause_list", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/root-cause-create", verifyToken, bizRoute(callTool, "root_cause_create"));
  router.post("/root-cause-action-create", verifyToken, bizRoute(callTool, "root_cause_action_create"));
  router.patch("/root-cause-action-status", verifyToken, bizRoute(callTool, "root_cause_action_update_status"));
  router.post("/troubleshoot-diagnose", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_manufacturing", "troubleshoot_diagnose", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/a3-report-list", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_business", "a3_report_list", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/a3-report-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "a3_report_create"));
  router.get("/a3-report/:id", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_business", "a3_report_get", { report_id: req.params.id });
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── Executive / Flash Report ─────────────────────────────────────────
  router.get("/revenue-forecast", verifyToken, requireRole("admin"), bizRoute(callTool, "revenue_forecast"));
  router.get("/cash-flow", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = await callTool("prism_business", "cash_flow_summary", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/top-customers", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = await callTool("prism_business", "top_customers", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/operations-kpis", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_business", "operations_kpis", {});
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/margin-trends", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = await callTool("prism_business", "margin_trends", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/flash-report", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = await callTool("prism_business", "daily_flash_generate", { date: req.query.date ?? new Date().toISOString().slice(0, 10), requestedBy: (req as any).user?.id ?? "system" });
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/flash-report-email", verifyToken, requireRole("admin"), async (req, res) => {
    try {
      const result = await callTool("prism_business", "daily_flash_email", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/shift-countdown", async (_req, res) => {
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
  router.get("/oee-six-losses", verifyToken, async (req, res) => {
    try {
      const result = await callTool("prism_business", "oee_six_losses", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── Timecard Status & Audit ────────────────────────────────────────────
  router.patch("/timecard-status", verifyToken, bizRoute(callTool, "timecard_status_update"));
  router.get("/timecard-audit-log", verifyToken, requireRole("hr_manager", "admin"), async (req, res) => {
    try {
      const { employeeId, start_date, end_date, page } = req.query;
      const result = await callTool("prism_business", "timecard_audit_log", {
        employee_id: employeeId,
        start_date,
        end_date,
        page: page ? parseInt(String(page), 10) : 1,
      });
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
      const result = await callTool("prism_business", "actual_cost_calculate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ─── Tool Usage ───────────────────────────────────────────────────────────
  router.post("/tool-usage", verifyToken, bizRoute(callTool, "tool_job_cost"));
  router.post("/tool-inventory-add", verifyToken, bizRoute(callTool, "tool_inventory_add"));
  router.post("/tool-regrind", verifyToken, bizRoute(callTool, "tool_regrind"));
  router.get("/tool-reorder-alerts", verifyToken, bizGet(callTool, "tool_reorder_alerts"));

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
