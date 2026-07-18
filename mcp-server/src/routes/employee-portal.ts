/**
 * PRISM MCP Server -- Employee Portal dispatch route (U-PORTAL-EXPRESS-ROUTES, slot:quebec).
 *
 * POST /api/v1/employee-portal/dispatch  { action, params } -> prism_shop emp_* actions.
 *
 * This is the server side the FE client web/src/api/employeePortal.ts has posted to since
 * U-EMPLOYEE-MOBILE-PORTAL-FRONTEND (2026-05-24) -- but the route was NEVER BUILT: the client
 * targeted /api/v1/portal/dispatch, and /api/v1/portal is the CUSTOMER portal router with no
 * dispatch endpoint, so every employee phone-portal action hard-404'd (found by the 2026-07-01
 * all-chat gap audit; confirmed live 2026-07-05). The FE now points here.
 *
 * SECURITY (mirrors the proven business.ts dispatch surface):
 *  - verifyToken on the route -- anon is 401, never silent data.
 *  - DENY-BY-DEFAULT allowlist: only the emp_* actions the shipped client actually exports are
 *    dispatchable (25 of the dispatcher's 83 emp_* actions). Everything else 403s until a real
 *    consumer needs it -- additive to open later, impossible to leak now.
 *  - Privileged mutations (priority bump, delegation) additionally require lead+ roles
 *    (same tier vocabulary as hotel-portal.ts). NOTE: the engines still read admin_id /
 *    from_manager_id from caller-asserted params -- binding those to req.userId server-side is
 *    the same filed follow-up as business.ts's handoff-workflow identity note.
 *
 * RESPONSE CONTRACT: prism_shop returns the STANDARD content:[{type,text}] MCP wrapper
 * (shopDispatcher.ts:1978), which the production callTool already peels + parses -- so the
 * route forwards the parsed dispatcher result VERBATIM (the client contract: "returns the
 * dispatcher result object verbatim, including {ok: boolean,...}"). Do NOT add
 * unwrapDispatcherEnvelope here -- that peel is for prism_business's BARE envelope only
 * (see dispatcher-envelope.ts); double-peeling a {type,text}-shaped domain payload would
 * corrupt it. Dispatcher FAILURES map to 400 with a clean message (R12 fail loud, no stack).
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken } from "../middleware/auth.js";
import { isDispatcherError, dispatcherErrorMessage } from "./dispatcher-envelope.js";

/**
 * Exactly the emp_* actions the shipped FE client (web/src/api/employeePortal.ts) exports.
 * Deny-by-default: extend this set ONLY when a page-level consumer lands for a new action.
 */
const EMPLOYEE_DISPATCH_ALLOWLIST = new Set<string>([
  // task state machine
  "emp_scan_in", "emp_start_task", "emp_pause_task", "emp_resume_task", "emp_stop_task",
  "emp_get_active_task",
  // messaging
  "emp_send_message", "emp_list_messages", "emp_mark_message_read",
  // hot-job priority + delegation (privileged subset below)
  "emp_bump_job_priority", "emp_rank_jobs", "emp_delegate_task", "emp_list_delegations",
  // calculators
  "emp_calc_speed_feed", "emp_calc_cost_quick", "emp_calc_kienzle_forces",
  // document intake
  "emp_doc_ingest", "emp_doc_list",
  // DNC / CIMCO
  "emp_dnc_machines", "emp_dnc_safety_check",
  // 3D layout
  "emp_layout_list", "emp_layout_machine_at_point",
  // office surface
  "emp_office_who_on_what", "emp_office_priority_queue", "emp_office_pending_delegations",
]);

/** Privileged mutations: reordering the shop's job queue / reassigning work is a lead+ act. */
const LEAD_GATED_ACTIONS = new Set<string>(["emp_bump_job_priority", "emp_delegate_task"]);

export function createEmployeePortalRouter(callTool: CallToolFn): Router {
  const router = Router();
  const LEAD_ROLES = ["lead", "hr_manager", "admin"]; // same tier vocabulary as hotel-portal.ts:59

  router.post("/dispatch", verifyToken, async (req, res) => {
    const action = typeof req.body?.action === "string" ? req.body.action.trim() : "";
    const params =
      req.body?.params && typeof req.body.params === "object" && !Array.isArray(req.body.params)
        ? (req.body.params as Record<string, unknown>)
        : {};

    if (!action) {
      res.status(400).json({ error: "action is required" });
      return;
    }
    if (!EMPLOYEE_DISPATCH_ALLOWLIST.has(action)) {
      res.status(403).json({ error: `action '${action}' is not employee-portal dispatchable` });
      return;
    }
    if (LEAD_GATED_ACTIONS.has(action)) {
      const roles = Array.isArray((req as { userRoles?: unknown }).userRoles)
        ? ((req as { userRoles?: string[] }).userRoles as string[])
        : [];
      if (!roles.some((r) => LEAD_ROLES.includes(r))) {
        res.status(403).json({ error: `action '${action}' requires one of role(s): ${LEAD_ROLES.join(", ")}` });
        return;
      }
    }

    try {
      const result = await callTool("prism_shop", action, params);
      if (isDispatcherError(result)) {
        res.status(400).json({ error: dispatcherErrorMessage(result, "employee-portal dispatch failed") });
        return;
      }
      res.json(result); // verbatim -- the client reads {ok,...} directly
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "employee-portal dispatch failed" });
    }
  });

  return router;
}
// The role gate checks req.userRoles inline (not via requireRole middleware) because the tier
// depends on the ACTION in the body, which express middleware cannot see before the handler runs.
