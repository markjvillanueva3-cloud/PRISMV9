/**
 * PRISM MCP Server — Business dispatch route (HOTEL-NETPLAT-UI / U-VNET-ROUTE)
 *
 * POST /api/v1/business/dispatch  { action, params } → prism_business dispatcher.
 *
 * This is the generic dispatch surface that the business-domain frontend client modules
 * (web/src/api/businessDispatch.ts → vendorNetwork.ts, hotelBusiness.ts) target. Before this
 * route, those clients POSTed to an UNMOUNTED path and 404'd at runtime (the hotelBusiness.ts
 * "U-PORTAL-BUSINESS-ROUTE" follow-up was never built); charlie's vendor corpus was therefore
 * invisible to the ERP UI even though every action was live in the dispatcher.
 *
 * SECURITY: this endpoint is deny-by-default. `action` is checked against
 * BUSINESS_DISPATCH_ALLOWLIST (src/data/business-dispatch-allowlist.ts); a non-allowlisted action
 * returns 403. The ~879 financial/PII actions are NOT reachable here — only the curated read-safe
 * set. `verifyToken` additionally requires an authenticated session (defense in depth).
 *
 * Response contract: a SUCCESS result is peeled by unwrapBusinessEnvelope() (prism_business emits a
 * BARE { type:"text", text } slimResponse that callTool does NOT parse -- see that helper), then
 * returned so the client's unwrapBusiness() sees the dispatcher's real shape — either
 * { success: true, data } or a bare payload (e.g. vendor_catalog_query → VendorRecord[]). A dispatcher
 * FAILURE — whether the bare { error } (unknown tool) or the dispatcherError envelope
 * { success: false, error, details } produced when an engine throws — is surfaced as 400 with a
 * CLEAN { error: <message> } body (stack/details stripped), so the client's BusinessDispatchError
 * fires instead of a 200 carrying a hidden error (R12 — fail loud) and no internals leak to the browser.
 *
 * Scope note: this route is the generic surface that web/src/api/businessDispatch.ts (vendorNetwork)
 * AND the pre-existing web/src/api/hotelBusiness.ts both target. Before U-VNET-ROUTE the path was
 * unmounted, so BOTH 404'd. This unit allowlists the vendor reads + the hotel-portal reads; the
 * hotel handoff-workflow WRITES (handoff_counterparty_respond/manager_approve/mark_executed/cancel)
 * are now OPENED behind a per-action role gate (U-HOTEL-ALLOWLIST-WRITE-ENABLE; BUSINESS_WRITE_ROLE_MAP);
 * prismBusiness.ts's ~120 (largely financial-write) actions remain 403. NOTE: the HTTP gate authorizes
 * by ROLE; each handoff engine method separately enforces participant-IDENTITY (responder==counterparty,
 * manager segregation-of-duties) from caller-asserted params -- NOT yet bound to req.userId (filed
 * follow-up: bind engine identity to the authenticated user server-side).
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken } from "../middleware/auth.js";
import {
  isBusinessActionAllowed,
  isBusinessWriteAllowed,
  businessWriteRolesFor,
} from "../data/business-dispatch-allowlist.js";
// Peel the prism_business slimResponse envelope (the recurring dead-panel class -- see
// reference_hotel_rfq_assign_and_envelope). The peel LOGIC lives once in dispatcher-envelope.ts
// (shared with erp.ts/hotel-portal.ts/pipeline.ts); the alias keeps this file's call site and
// the route's documented contract unchanged. Dispatcher FAILURES that arrive as a parsed
// { success:false }/{ error } object pass through unchanged.
import { unwrapDispatcherEnvelope as unwrapBusinessEnvelope } from "./dispatcher-envelope.js";

/**
 * True when the dispatcher result represents a FAILURE. Covers BOTH shapes a prism_business failure
 * can take by the time it reaches this route (callTool has already parsed the MCP text payload):
 *   1. the dispatcherError envelope `{ success: false, error, details? }` — emitted when an engine
 *      THROWS (the common case: validation errors, <3-PO scorecard, etc.), and
 *   2. the bare `{ error }` — emitted by callTool for an unknown tool / top-level catch.
 * A success result is `{ success: true, data }` or a bare payload (array/object) — neither matches.
 */
function isCallToolError(result: unknown): result is { error?: unknown; success?: unknown } {
  if (typeof result !== "object" || result === null || Array.isArray(result)) return false;
  const r = result as Record<string, unknown>;
  if (r.success === false) return true; // dispatcherError failure envelope
  return "error" in r && !("data" in r) && !("success" in r); // bare { error }
}

/** Extract a safe, stack-free error message from a failure result (never echo details/stack). */
function errorMessageOf(result: { error?: unknown }): string {
  return typeof result.error === "string" && result.error.trim().length > 0
    ? result.error
    : "business dispatch failed";
}

export function createBusinessRouter(callTool: CallToolFn): Router {
  const router = Router();

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

    // SECURITY GATE -- deny-by-default. Reads: any authenticated session. Writes: a curated set of
    // manager/HR workflow-state actions, each behind a per-action role gate
    // (U-HOTEL-ALLOWLIST-WRITE-ENABLE). Financial + PII writes are in NEITHER list, so they fall
    // straight through to 403. verifyToken (run first) has populated req.userRoles.
    const readAllowed = isBusinessActionAllowed(action);
    const writeAllowed = isBusinessWriteAllowed(action);
    if (!readAllowed && !writeAllowed) {
      res
        .status(403)
        .json({ error: `action '${action}' is not browser-dispatchable (not in business allowlist)` });
      return;
    }
    if (writeAllowed) {
      const required = businessWriteRolesFor(action);
      const roles = Array.isArray(req.userRoles) ? req.userRoles : [];
      if (!roles.some((r) => required.includes(r))) {
        res
          .status(403)
          .json({ error: `action '${action}' requires one of role(s): ${required.join(", ")}` });
        return;
      }
    }

    try {
      // Peel the { type, text } slimResponse FIRST so isCallToolError sees the real
      // {success/error} shape AND the client receives {success,data} not {type,text}.
      const result = unwrapBusinessEnvelope(await callTool("prism_business", action, params));
      if (isCallToolError(result)) {
        // 400 + CLEAN message — never echo dispatcherError details/stack to the browser.
        res.status(400).json({ error: errorMessageOf(result) });
        return;
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "business dispatch failed" });
    }
  });

  return router;
}
