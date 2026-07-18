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
import { verifyToken, requireRole } from "../middleware/auth.js";
import { employeeEngine } from "../engines/EmployeeEngine.js";
import { unwrapDispatcherEnvelope } from "./dispatcher-envelope.js";

/** Wires hotel-portal REST endpoints. The callTool fn dispatches into prism_business. */
export function createHotelPortalRouter(callTool: CallToolFn): Router {
  const router = Router();

  // U-HOTEL-PORTAL-AUTH (slot:hotel, 2026-06-24): this router exposes EMPLOYEE PII (digest/dashboard/
  // pto-balance/payroll) + privileged MUTATIONS (pto-approve, timeclock-edit, po-create, cofc-issue,
  // osha-record). It is mounted under /api (routes/index.ts:164) where `optionalToken` NEVER rejects anon
  // -- so every route below was ANONYMOUSLY reachable. There is NO legitimate anonymous view of employee
  // PII, so we REQUIRE auth outright (mirroring the sibling erp.ts which gates the identical action class
  // with verifyToken + requireRole), NOT the redact-when-anon pattern used for the public quoting reads.
  //
  // /health stays OPEN for monitoring -- it is registered BEFORE the global gate.
  router.get("/health", (_req, res) => {
    res.json({
      ok: true,
      portal_engines: 18,
      iter_range: "iter15..iter38",
      ms: "HOTEL-EMPLOYEE-BUSINESS-PORTAL-MS0",
      generated_at: new Date().toISOString(),
    });
  });

  // Defense-in-depth: EVERY route below requires a valid Bearer (verifyToken -> 401 on missing/invalid,
  // and it populates req.userId/req.userRoles for the requireRole tiers layered on the privileged routes).
  // A single router.use gates all 31 routes -- a future-added route is auto-protected, can't be forgotten.
  router.use(verifyToken);

  // Privileged-route role tiers mirror the erp.ts map EXACTLY (real roles: admin, hr_manager, lead):
  //   payroll / HR-write / OSHA-medical / hire  -> requireRole("hr_manager", "admin")   (erp.ts:166-168,384-385)
  //   approvals / financial-PO / quality-CofC   -> requireRole("lead","hr_manager","admin") (erp.ts:243-264,388)
  //   exec C-suite rollup                       -> requireRole("admin")                  (erp.ts:295-325)
  // verifyToken is already global above, so privileged routes need ONLY requireRole(...) added.
  const HR_ROLES = requireRole("hr_manager", "admin");
  const LEAD_ROLES = requireRole("lead", "hr_manager", "admin");
  const ADMIN_ROLE = requireRole("admin");

  // U-ERP-IDOR-SELFGATE (slot:hotel, 2026-07-02; hardened after 3-of-3 arms A+B) -- layer 2
  // after the anon-close above. verifyToken proves WHO the caller is; this proves the TARGET
  // is the caller. Self-service routes accept an employee identity in the path/body, so any
  // authed employee could read a peer's PII (pto balance, digest, timeclock) or act AS a peer
  // (pto request, punch, swap proposal = the payroll-fraud vector erp.ts already gates).
  //
  // IDENTITY RESOLUTION (the 3-of-3 P1): auth user ids are USR-* (AuthEngine) while employee
  // targets are EMP-* -- a naive `target === req.userId` compare NEVER matches, which would
  // 403 EVERY legitimate non-privileged self-service call (a dead-panel, not a leak). So the
  // caller's own employee id is resolved via EmployeeEngine.auth_user_id, and "self" is the
  // set {resolved employee_id, req.userId}. The 403 fires ONLY when the caller's employee
  // identity is KNOWN (a mapping resolved) and the target is neither it nor the userId --
  // i.e. a provable IDOR. When NO mapping resolves (auth_user_id not yet wired, the current
  // state -- an india/operator follow-up), the identity check cannot be performed, so it
  // DEGRADES to the pre-commit verifyToken-only behavior (never a dead-panel, still fail-
  // closed on the anon axis) and auto-engages the instant the mapping lands. Privileged
  // supervision roles pass; an absent target defaults to self downstream.
  // KNOWN LIMIT (engine-FSM follow-up, not route-gateable): /shift/swap/respond carries only
  // swap_id+accept -- the responder's identity never reaches the route.
  const SELF_GATE_PRIVILEGED = ["lead", "supervisor", "hr_manager", "admin"];
  function requireSelfOrPrivileged(...fields: string[]) {
    const keys = fields.length > 0 ? fields : ["employee_id"];
    return (req: any, res: any, next: any): void => {
      const isPrivileged = req.userRoles?.some((r: string) => SELF_GATE_PRIVILEGED.includes(r));
      if (isPrivileged) { next(); return; }
      // Resolve the caller's own employee identity from the auth user id.
      const selfIds = new Set<string>();
      if (req.userId) selfIds.add(String(req.userId));
      let identityKnown = false;
      if (req.userId) {
        const self = employeeEngine.findByAuthUserId(String(req.userId));
        if (self) { selfIds.add(String(self.id)); identityKnown = true; }
      }
      // Without a resolved employee mapping we cannot prove a target is a PEER, so we must not
      // 403 a legitimate self-service call. Degrade to verifyToken-only (auth already proven).
      if (!identityKnown) { next(); return; }
      for (const k of keys) {
        const target = req.params?.[k] ?? req.body?.[k];
        if (target && !selfIds.has(String(target))) {
          res.status(403).json({ ok: false, error: `Cannot access another employee's records (${k})` });
          return;
        }
      }
      next();
    };
  }

  // Digest -- phone-ready per-employee daily view (iter20); self-gated (peer digest = PII).
  router.post("/digest", requireSelfOrPrivileged("employee_id"), async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "digest_build", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Manager dashboard (iter21) -- a manager's view of all reports -> lead+ only.
  router.post("/dashboard", LEAD_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "manager_dashboard_build", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // PTO balance lookup (iter18); self-gated (peer balance = PII read via arbitrary path id).
  router.get("/pto/balance/:employee_id", requireSelfOrPrivileged("employee_id"), async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "pto_compute_balance", {
        employee_id: req.params.employee_id,
      }));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Submit PTO request (iter18); self-gated (submitting AS a peer forges their PTO ledger).
  router.post("/pto/request", requireSelfOrPrivileged("employee_id"), async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "pto_submit_request", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Approve PTO request (iter18) -- approval is privileged (separation-of-duties) -> lead+ only
  // (the engine ALSO enforces approver != requester; this is the route-level authz floor).
  router.post("/pto/approve", LEAD_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "pto_approve_request", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Propose a shift swap (iter22); self-gated on the REQUESTER only -- the counterparty is
  // legitimately another employee (that is the point of a swap).
  router.post("/shift/swap/propose", requireSelfOrPrivileged("requester_employee_id"), async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "swap_propose", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Counterparty responds to swap (iter22)
  router.post("/shift/swap/respond", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "swap_counterparty_respond", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Customer complaint intake (iter24)
  router.post("/complaint", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "complaint_receive", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Triaging a complaint (assigning severity/disposition) is a management action -> lead+ only.
  // /complaint (intake) stays self-service so anyone authenticated can file one.
  router.post("/complaint/triage", LEAD_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "complaint_triage", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Payroll gross pay compute (iter19) -- gross WAGES (PII); hr_manager+admin only (erp.ts payroll tier).
  router.post("/payroll/compute", HR_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "payroll_compute_gross", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Role catalog — 17 shop roles + curriculum (iter15)
  router.get("/role-catalog", async (_req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "role_academy_list_roles", {}));
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.get("/role-catalog/:role", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "role_academy_get_curriculum", {
        role: req.params.role,
      }));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // On-hire curriculum injection (iter15) -- onboarding is an HR action -> hr_manager+admin only.
  router.post("/role-academy/hire", HR_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "role_academy_inject_on_hire", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // E2E JM Die simulation harness (iter25) — operator regression sweep
  router.post("/simulation/run", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "jm_die_sim_run", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // NCR management-review summary (iter23) -- 9.3.2(c) ISO 9001 management-review input -> lead+ only.
  router.get("/nc/management-review-summary", LEAD_ROLES, async (_req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "nc_management_review_summary", {}));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // QC inspection report (iter33) — FAI/in-process/final/incoming → auto-flags NCR.
  // R12: bad input (NaN measurement, inverted tolerance, etc.) → engine throws → 5xx.
  router.post("/inspection-report", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "inspection_build_report", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // CofC issuance (iter33) -- only when overall_disposition === "pass" AND zero conditionals.
  // A Certificate of Conformance is a legal/quality attestation -> lead+ only.
  router.post("/inspection-report/cofc", LEAD_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "inspection_get_cofc", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Shipping & Receiving log (iter34) — inbound/outbound + 3-way match (PO↔receipt↔invoice).
  router.post("/shipping-receiving/inbound", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "shipping_log_inbound", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/shipping-receiving/outbound", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "shipping_log_outbound", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/shipping-receiving/three-way-match", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "shipping_three_way_match", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Purchase Order lifecycle (iter35) -- FSM + change-order trail; bridges ShippingReceiving.
  // Creating/approving/receiving a PO is financial control (committing shop funds) -> lead+ only.
  // /po/status (read) stays self-service (verifyToken).
  router.post("/po/create", LEAD_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "po_create", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/po/transition", LEAD_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "po_transition", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/po/receipt", LEAD_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "po_record_receipt", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/po/status", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "po_get_status", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Employee time-clock (iter36) — punch FSM + daily summary; bridges payroll (iter19).
  // Self-gated: punching AS a peer is the payroll-fraud vector erp.ts gates on clock ops.
  router.post("/timeclock/punch", requireSelfOrPrivileged("employee_id"), async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "timeclock_record_punch", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Self-gated: a peer's daily hours are PII.
  router.post("/timeclock/summary", requireSelfOrPrivileged("employee_id"), async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "timeclock_daily_summary", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Editing a punch retroactively is a payroll-fraud vector -> hr_manager+admin only.
  router.post("/timeclock/edit", HR_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "timeclock_edit_punch", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // OSHA 300 log (iter38) — federal injury & illness recordkeeping per 29 CFR §1904.
  // Injury/medical records are protected PII -> hr_manager+admin only.
  router.post("/osha/incident", HR_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "osha_record_incident", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/osha/annual-300a", HR_ROLES, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "osha_annual_300a", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // Executive weekly summary (iter31) -- C-suite rollup, top of hotel hierarchy -> admin only.
  // PII-free aggregates only (counts, not names). R12: bad input -> engine throws -> 5xx.
  router.post("/executive-summary", ADMIN_ROLE, async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(await callTool("prism_business", "exec_summary_build", req.body));
      res.json({ result });
    } catch (e) { next(e); }
  });

  // (/health is registered at the TOP, before the global verifyToken gate, so it stays open.)

  return router;
}
