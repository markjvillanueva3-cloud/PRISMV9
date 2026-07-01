/**
 * PRISM MCP Server — Quoting Pipeline Routes — QUOTING-PIPELINE-MS0 / U-QP08-HTTP
 *
 * HTTP bridge to the prism_quoting dispatcher. The mobile capture page +
 * LiveChatWidget call these endpoints; each endpoint maps 1:1 to a
 * prism_quoting action.
 *
 * Two surfaces:
 *   - POST /api/mcp/quoting       -- generic action router (the frontend's primary call). Carries
 *     only optionalToken, so the internal cost-basis actions are deny-listed here (U-MKTPRICE01).
 *   - POST /api/v1/quoting/<verb> -- typed endpoints (curl-friendly). Most are intake/public; the
 *     cost-basis verbs (/outbound-price-prior, /cost-index-prior) are admin-only (verifyToken +
 *     requireRole("admin")) -- the ONLY authenticated path to the shop's real cost basis.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { isQuotingGenericDispatchDenied } from "../data/quoting-dispatch-allowlist.js";

export function createQuotingRouter(callTool: CallToolFn): Router {
  const router = Router();

  // Generic dispatch endpoint -- the frontend hits this with { action, params }.
  // SECURITY (U-MKTPRICE01): this surface carries only optionalToken (never rejects anonymous), so
  // it is deny-listed for the internal cost-basis actions -- an arbitrary { action: "cost_index_prior" }
  // here would otherwise leak the shop's real cost basis unauthenticated. Those actions are reachable
  // ONLY via their verifyToken + requireRole("admin") typed verbs below.
  router.post("/", async (req, res, next) => {
    try {
      const { action, params } = req.body ?? {};
      if (typeof action !== "string") {
        res.status(400).json({ error: "missing-action" });
        return;
      }
      if (isQuotingGenericDispatchDenied(action)) {
        res.status(403).json({ error: `action '${action}' is not browser-dispatchable on the generic quoting surface (cost-basis -- use the authenticated operator endpoint)` });
        return;
      }
      const result = await callTool("prism_quoting", action, params ?? {});
      res.json(result);
    } catch (e) { next(e); }
  });

  // Typed endpoints per action — friendlier for curl + non-React clients.
  router.post("/camera-intake-route", async (req, res, next) => {
    try { res.json(await callTool("prism_quoting", "camera_intake_route", req.body)); } catch (e) { next(e); }
  });
  router.post("/insert-box-lookup", async (req, res, next) => {
    try { res.json(await callTool("prism_quoting", "insert_box_lookup", req.body)); } catch (e) { next(e); }
  });
  router.post("/machine-tag-extract", async (req, res, next) => {
    try { res.json(await callTool("prism_quoting", "machine_tag_extract", req.body)); } catch (e) { next(e); }
  });
  router.post("/machine-parts-bom-resolve", async (req, res, next) => {
    try { res.json(await callTool("prism_quoting", "machine_parts_bom_resolve", req.body)); } catch (e) { next(e); }
  });
  router.post("/vendor-realtime-price", async (req, res, next) => {
    try { res.json(await callTool("prism_quoting", "vendor_realtime_price", req.body)); } catch (e) { next(e); }
  });
  // Operator-internal pricing priors (U-MKTPRICE01) -- sell-side market prior + cost-side AP basis.
  // COST BASIS: admin-only (verifyToken + requireRole("admin")), mirroring the admin-gated margin/
  // financial routes in erp.ts (revenue-forecast / margin-trends). This is the ONLY path to the
  // shop's real cost basis -- the generic surface above deny-lists these actions. Never wired to any
  // customer packet/share surface.
  router.post("/outbound-price-prior", verifyToken, requireRole("admin"), async (req, res, next) => {
    try { res.json(await callTool("prism_quoting", "outbound_price_prior", req.body)); } catch (e) { next(e); }
  });
  router.post("/cost-index-prior", verifyToken, requireRole("admin"), async (req, res, next) => {
    try { res.json(await callTool("prism_quoting", "cost_index_prior", req.body)); } catch (e) { next(e); }
  });
  router.post("/live-chat/open", async (_req, res, next) => {
    try { res.json(await callTool("prism_quoting", "live_chat_session_open", {})); } catch (e) { next(e); }
  });
  router.post("/live-chat/turn", async (req, res, next) => {
    try { res.json(await callTool("prism_quoting", "live_chat_session_turn", req.body)); } catch (e) { next(e); }
  });
  router.post("/live-chat/close", async (req, res, next) => {
    try { res.json(await callTool("prism_quoting", "live_chat_session_close", req.body)); } catch (e) { next(e); }
  });

  return router;
}
