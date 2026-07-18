/**
 * PRISM MCP Server — Bridge & Integration Routes
 * 13 endpoints for external system integration, API key management, and routing
 */
import { Router, type Response } from "express";
import type { CallToolFn } from "./index.js";
import { log } from "../utils/Logger.js";

/**
 * Log a bridge-route failure then emit the preserved { ok:false, error } 500.
 *
 * The bridge routes respond directly in their catch blocks (they never call
 * next(e)), so they DO NOT reach the global errorHandler middleware that logs
 * every other route's failures. Without this helper a bridge failure is
 * genuinely invisible to operators. Response shape is unchanged.
 *
 * @param res - express response
 * @param action - the prism_bridge action that failed (for the log line)
 * @param e - the thrown error
 * @returns void
 */
export function bridgeError(res: Response, action: string, e: any): void {
  log.error("[BRIDGE] route error", { action, error: e?.message, stack: e?.stack });
  res.status(500).json({ ok: false, error: e?.message });
}

/** Creates bridge router.
 * @param callTool - call tool
 * @returns router
 */
export function createBridgeRouter(callTool: CallToolFn): Router {
  const router = Router();

  // --- Endpoint Management ---

  // POST /bridge/endpoint/register — Register external endpoint
  router.post("/endpoint/register", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "register_endpoint", req.body);
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "register_endpoint", e);
    }
  });

  // POST /bridge/endpoint/remove — Remove external endpoint
  router.post("/endpoint/remove", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "remove_endpoint", req.body);
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "remove_endpoint", e);
    }
  });

  // POST /bridge/endpoint/status — Set endpoint status
  router.post("/endpoint/status", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "set_status", req.body);
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "set_status", e);
    }
  });

  // GET /bridge/endpoints — List registered endpoints
  router.get("/endpoints", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "list_endpoints");
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "list_endpoints", e);
    }
  });

  // --- API Key Management ---

  // POST /bridge/key/create — Create API key
  router.post("/key/create", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "create_key", req.body);
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "create_key", e);
    }
  });

  // POST /bridge/key/revoke — Revoke API key
  router.post("/key/revoke", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "revoke_key", req.body);
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "revoke_key", e);
    }
  });

  // POST /bridge/key/validate — Validate API key
  router.post("/key/validate", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "validate_key", req.body);
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "validate_key", e);
    }
  });

  // GET /bridge/keys — List API keys
  router.get("/keys", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "list_keys");
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "list_keys", e);
    }
  });

  // --- Routing & Status ---

  // POST /bridge/route — Route request to external system
  router.post("/route", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "route", req.body);
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "route", e);
    }
  });

  // GET /bridge/route-map — Get routing map
  router.get("/route-map", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "route_map");
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "route_map", e);
    }
  });

  // GET /bridge/health — Bridge health check
  router.get("/health", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "health");
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "health", e);
    }
  });

  // GET /bridge/stats — Bridge statistics
  router.get("/stats", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "stats");
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "stats", e);
    }
  });

  // GET /bridge/config — Bridge configuration
  router.get("/config", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "config");
      res.json({ ok: true, data: result });
    } catch (e) {
      bridgeError(res, "config", e);
    }
  });

  return router;
}
