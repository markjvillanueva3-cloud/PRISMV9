/**
 * Hotel Portal Routes — REST surface for the employee + manager portal stack
 * (iter15-iter25). Backs the React `HotelPortalPage` (web) + same JSON contracts
 * compatible with iOS / Android (React Native) clients.
 *
 * Endpoints (all under /api/v1/hotel-portal):
 *   GET  /digest/:employee_id       → DailyDigest (iter20)
 *   GET  /dashboard/:manager_id     → ManagerDashboard (iter21)
 *   GET  /pto/balance/:employee_id  → PTO balance (iter18)
 *   POST /pto/request               → submit PTO request (iter18)
 *   POST /shift/swap/propose        → propose a peer shift swap (iter22)
 *   POST /complaint                 → receive customer complaint (iter24)
 *   POST /payroll/compute           → compute gross pay (iter19)
 *   POST /simulation/run            → run E2E JM Die simulation (iter25)
 *   GET  /role-catalog              → list 17 ShopRole curricula (iter15)
 *
 * @module hotel-portal
 * @milestone HOTEL/U-HOTEL-PORTAL-REST-WIRING (2026-05-25, slot:hotel iter26 /yolo)
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Wires hotel-portal REST endpoints. The callTool fn dispatches into prism_business. */
export function createHotelPortalRouter(callTool: CallToolFn): Router {
  const router = Router();

  // Digest — phone-ready per-employee daily view (iter20)
  router.post("/digest", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "digest_build", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Manager dashboard (iter21)
  router.post("/dashboard", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "manager_dashboard_build", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // PTO balance lookup (iter18)
  router.get("/pto/balance/:employee_id", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "pto_compute_balance", {
        employee_id: req.params.employee_id,
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Submit PTO request (iter18)
  router.post("/pto/request", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "pto_submit_request", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Approve PTO request (iter18) — separation-of-duties enforced engine-side
  router.post("/pto/approve", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "pto_approve_request", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Propose a shift swap (iter22)
  router.post("/shift/swap/propose", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "swap_propose", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Counterparty responds to swap (iter22)
  router.post("/shift/swap/respond", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "swap_counterparty_respond", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Customer complaint intake (iter24)
  router.post("/complaint", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "complaint_receive", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/complaint/triage", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "complaint_triage", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Payroll gross pay compute (iter19)
  router.post("/payroll/compute", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "payroll_compute_gross", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Role catalog — 17 shop roles + curriculum (iter15)
  router.get("/role-catalog", async (_req, res, next) => {
    try {
      const result = await callTool("prism_business", "role_academy_list_roles", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.get("/role-catalog/:role", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "role_academy_get_curriculum", {
        role: req.params.role,
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // On-hire curriculum injection (iter15)
  router.post("/role-academy/hire", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "role_academy_inject_on_hire", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // E2E JM Die simulation harness (iter25) — operator regression sweep
  router.post("/simulation/run", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "jm_die_sim_run", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // NCR management-review summary (iter23) — §9.3.2(c) ISO 9001 input
  router.get("/nc/management-review-summary", async (_req, res, next) => {
    try {
      const result = await callTool("prism_business", "nc_management_review_summary", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // QC inspection report (iter33) — FAI/in-process/final/incoming → auto-flags NCR.
  // R12: bad input (NaN measurement, inverted tolerance, etc.) → engine throws → 5xx.
  router.post("/inspection-report", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "inspection_build_report", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // CofC issuance (iter33) — only when overall_disposition === "pass" AND zero conditionals.
  router.post("/inspection-report/cofc", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "inspection_get_cofc", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Shipping & Receiving log (iter34) — inbound/outbound + 3-way match (PO↔receipt↔invoice).
  router.post("/shipping-receiving/inbound", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "shipping_log_inbound", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/shipping-receiving/outbound", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "shipping_log_outbound", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/shipping-receiving/three-way-match", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "shipping_three_way_match", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Purchase Order lifecycle (iter35) — FSM + change-order trail; bridges ShippingReceiving.
  router.post("/po/create", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "po_create", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/po/transition", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "po_transition", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/po/receipt", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "po_record_receipt", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/po/status", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "po_get_status", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Employee time-clock (iter36) — punch FSM + daily summary; bridges payroll (iter19).
  router.post("/timeclock/punch", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "timeclock_record_punch", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/timeclock/summary", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "timeclock_daily_summary", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/timeclock/edit", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "timeclock_edit_punch", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // OSHA 300 log (iter38) — federal injury & illness recordkeeping per 29 CFR §1904.
  router.post("/osha/incident", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "osha_record_incident", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/osha/annual-300a", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "osha_annual_300a", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Executive weekly summary (iter31) — C-suite rollup, top of hotel hierarchy.
  // PII-free aggregates only (counts, not names). R12: bad input → engine throws → 5xx.
  router.post("/executive-summary", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "exec_summary_build", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Health probe — confirms the portal route is mounted
  router.get("/health", (_req, res) => {
    res.json({
      ok: true,
      portal_engines: 18,
      iter_range: "iter15..iter38",
      ms: "HOTEL-EMPLOYEE-BUSINESS-PORTAL-MS0",
      generated_at: new Date().toISOString(),
    });
  });

  return router;
}
