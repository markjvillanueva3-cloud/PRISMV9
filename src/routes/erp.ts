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
import {
  milestoneIntelligenceEngine,
  type MilestoneSyncInput,
  type MilestoneSyncResult,
} from "../engines/MilestoneIntelligenceEngine.js";

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

function bizRouteWithEnvelope(callTool: CallToolFn, action: string) {
  return async (req: any, res: any) => {
    try {
      const result = await callTool("prism_business", action, req.body);
      res.json({ ok: true, data: result, result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  };
}

type JobTimeSyncAction = "job_time_start" | "job_time_pause" | "job_time_resume" | "job_time_stop";
type LifecycleSyncAction =
  | "job_create"
  | "job_update_status"
  | "order_create"
  | "order_update_status"
  | "order_work_order_create"
  | "order_log_time"
  | "order_log_production";

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

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function buildJobTimeSyncInput(action: JobTimeSyncAction, body: Record<string, any> | undefined, result: Record<string, any>) {
  const jobId = result?.job_id ?? body?.job_id ?? body?.jobId;
  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    return null;
  }

  const operation = result?.operation ?? body?.operation;
  const noteByAction: Record<JobTimeSyncAction, string> = {
    job_time_start: `Started the floor timer for ${jobId}${operation ? ` on ${operation}` : ""}.`,
    job_time_pause: `Paused the floor timer for ${jobId}.`,
    job_time_resume: `Resumed the floor timer for ${jobId}.`,
    job_time_stop: `Stopped the floor timer for ${jobId}.`,
  };
  const triggerByAction: Record<JobTimeSyncAction, MilestoneSyncInput["trigger"]> = {
    job_time_start: "shop-floor-job-started",
    job_time_pause: "shop-floor-job-paused",
    job_time_resume: "shop-floor-job-started",
    job_time_stop: "shop-floor-job-stopped",
  };

  return {
    job_id: jobId,
    source: "shop-floor-clock" as const,
    trigger: triggerByAction[action],
    operation,
    department: body?.department,
    quantity_completed: body?.good_parts,
    scrap_qty: body?.scrap_count,
    note: body?.notes ?? noteByAction[action],
  } satisfies MilestoneSyncInput;
}

function buildLifecycleSyncInput(
  action: LifecycleSyncAction,
  body: Record<string, any> | undefined,
  result: Record<string, any>,
) {
  switch (action) {
    case "job_create": {
      const jobId = firstString(result?.job_id, result?.id, body?.job_id, body?.jobId);
      if (!jobId) {
        return null;
      }

      const customer = firstString(result?.customer, body?.customer) ?? "Unknown customer";
      const partNumber = firstString(result?.part_number, body?.part_number, body?.partNumber) ?? "a new part";
      return {
        job_id: jobId,
        source: "jobs-desk" as const,
        trigger: "job-created" as const,
        status: firstString(result?.status, body?.status),
        note: `Customer ${customer} released ${partNumber} into dispatch.`,
      } satisfies MilestoneSyncInput;
    }
    case "job_update_status": {
      const jobId = firstString(result?.job_id, result?.id, body?.job_id, body?.jobId);
      const status = firstString(result?.status, body?.status);
      if (!jobId || !status) {
        return null;
      }

      return {
        job_id: jobId,
        source: "jobs-desk" as const,
        trigger: "job-status-changed" as const,
        status,
        note: `Dispatch board pushed ${jobId} into ${status.replace(/_/g, " ")}.`,
      } satisfies MilestoneSyncInput;
    }
    case "order_create":
    case "order_work_order_create": {
      const jobId = firstString(result?.job_id, body?.job_id, body?.jobId);
      if (!jobId) {
        return null;
      }

      const machineId = firstString(result?.machine_id, body?.machine_id, body?.machineId) ?? "unassigned";
      const partNumber = firstString(result?.part_number, body?.part_number, body?.partNumber) ?? jobId;
      return {
        job_id: jobId,
        source: "order-tracking" as const,
        trigger: "order-created" as const,
        machine_id: machineId,
        note: `Machine ${machineId} staged ${partNumber} into the work-order lane.`,
      } satisfies MilestoneSyncInput;
    }
    case "order_update_status": {
      const jobId = firstString(result?.job_id, body?.job_id, body?.jobId);
      const status = firstString(result?.status, body?.status);
      const orderId = firstString(result?.order_id, result?.id, body?.order_id, body?.orderId);
      if (!jobId || !status) {
        return null;
      }

      return {
        job_id: jobId,
        source: "order-tracking" as const,
        trigger: "order-status-changed" as const,
        status,
        note: `Order control updated ${orderId ?? jobId} through the execution lane.`,
      } satisfies MilestoneSyncInput;
    }
    case "order_log_time": {
      const jobId = firstString(result?.job_id, body?.job_id, body?.jobId);
      if (!jobId) {
        return null;
      }

      const orderId = firstString(result?.order_id, result?.id, body?.order_id, body?.orderId);
      const employeeId = firstString(result?.employee_id, body?.employee_id, body?.employeeId) ?? "unknown";
      return {
        job_id: jobId,
        source: "order-tracking" as const,
        trigger: "order-time-logged" as const,
        operation: firstString(result?.operation, body?.operation),
        hours: firstNumber(result?.hours, body?.hours),
        note: `Employee ${employeeId} logged time against ${orderId ?? jobId}.`,
      } satisfies MilestoneSyncInput;
    }
    case "order_log_production": {
      const jobId = firstString(result?.job_id, body?.job_id, body?.jobId);
      if (!jobId) {
        return null;
      }

      return {
        job_id: jobId,
        source: "order-tracking" as const,
        trigger: "order-production-logged" as const,
        quantity_completed: firstNumber(result?.quantity_completed, body?.quantity_completed),
        scrap_qty: firstNumber(result?.scrap_qty, body?.scrap_qty),
        note: firstString(result?.notes, body?.notes, body?.production_notes),
      } satisfies MilestoneSyncInput;
    }
    default:
      return null;
  }
}

function bizRouteWithSync(callTool: CallToolFn, action: JobTimeSyncAction) {
  return async (req: any, res: any) => {
    try {
      const result = await callTool("prism_business", action, req.body);
      const prismSync = safeSyncMutation(buildJobTimeSyncInput(action, req.body, result ?? {}));
      const payload = attachPrismSync(result, prismSync);
      res.json({ ok: true, data: payload, result: payload });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  };
}

function bizRouteWithLifecycleSync(callTool: CallToolFn, action: LifecycleSyncAction) {
  return async (req: any, res: any) => {
    try {
      const result = await callTool("prism_business", action, req.body);
      const prismSync = safeSyncMutation(buildLifecycleSyncInput(action, req.body, result ?? {}));
      const payload = attachPrismSync(result, prismSync);
      res.json({ ok: true, data: payload, result: payload });
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

export function createErpRouter(callTool: CallToolFn): Router {
  const router = Router();

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
  router.post("/shift-clock-in", verifyToken, validateTimestamp, bizRouteWithEnvelope(callTool, "clock_in"));
  router.post("/shift-clock-out", verifyToken, validateTimestamp, bizRouteWithEnvelope(callTool, "clock_out"));
  router.post("/job-time-start", verifyToken, validateTimestamp, bizRouteWithSync(callTool, "job_time_start"));
  router.post("/job-time-pause", verifyToken, validateTimestamp, bizRouteWithSync(callTool, "job_time_pause"));
  router.post("/job-time-resume", verifyToken, validateTimestamp, bizRouteWithSync(callTool, "job_time_resume"));
  router.post("/job-time-stop", verifyToken, validateTimestamp, bizRouteWithSync(callTool, "job_time_stop"));
  router.post("/timecard", verifyToken, bizRoute(callTool, "timecard_summary"));
  router.post("/attendance", verifyToken, bizRoute(callTool, "attendance_report"));
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
  router.post("/job-labor-cost", verifyToken, bizRoute(callTool, "job_time_stop"));

  // ─── Employees ────────────────────────────────────────────────────────────
  router.get("/employees", verifyToken, bizGet(callTool, "employee_search"));
  router.post("/employee-create", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "employee_create"));
  router.post("/employee-update", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "employee_update"));
  router.post("/employee-search", verifyToken, bizRoute(callTool, "employee_search"));
  router.post("/employee-add-skill", verifyToken, bizRoute(callTool, "employee_add_skill"));
  router.post("/employee-utilization", verifyToken, bizRoute(callTool, "employee_utilization"));
  router.post("/employee-dept-summary", verifyToken, bizRoute(callTool, "employee_dept_summary"));

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

  // ─── Payroll (HR manager or admin only) ──────────────────────────────────
  router.post("/payroll-run", verifyToken, requireRole("hr_manager", "admin"), bizRoute(callTool, "payroll_run"));

  // ─── Invoicing ────────────────────────────────────────────────────────────
  router.post("/invoice-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRoute(callTool, "invoice_create"));
  router.post("/invoices", verifyToken, bizRoute(callTool, "invoice_list"));

  // ─── Job Lifecycle ────────────────────────────────────────────────────────
  router.post("/job-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRouteWithLifecycleSync(callTool, "job_create"));
  router.post("/job-update-status", verifyToken, bizRouteWithLifecycleSync(callTool, "job_update_status"));
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
  router.post("/order-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRouteWithLifecycleSync(callTool, "order_create"));
  router.post("/order-update-status", verifyToken, bizRouteWithLifecycleSync(callTool, "order_update_status"));
  router.post("/order-list", verifyToken, bizRoute(callTool, "order_list"));
  router.post("/work-order-create", verifyToken, requireRole("lead", "hr_manager", "admin"), bizRouteWithLifecycleSync(callTool, "order_work_order_create"));
  router.post("/order-log-time", verifyToken, bizRouteWithLifecycleSync(callTool, "order_log_time"));
  router.post("/order-log-production", verifyToken, bizRouteWithLifecycleSync(callTool, "order_log_production"));
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
