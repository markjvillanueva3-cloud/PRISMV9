/**
 * PRISM MCP Server — Quoting Pipeline Routes — QUOTING-PIPELINE-MS0 / U-QP08-HTTP
 *
 * HTTP bridge to the prism_quoting dispatcher. The mobile capture page +
 * LiveChatWidget call these endpoints; each endpoint maps 1:1 to a
 * prism_quoting action.
 *
 * Two public surfaces:
 *   - POST /api/mcp/quoting       — generic action router (the frontend's primary call)
 *   - POST /api/v1/quoting/<verb> — typed endpoints (curl-friendly)
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createQuotingRouter(callTool: CallToolFn): Router {
  const router = Router();

  // Generic dispatch endpoint — the frontend hits this with { action, params }.
  router.post("/", async (req, res, next) => {
    try {
      const { action, params } = req.body ?? {};
      if (typeof action !== "string") {
        res.status(400).json({ error: "missing-action" });
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
