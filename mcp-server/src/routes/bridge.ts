/**
 * PRISM MCP Server — Bridge & Integration Routes
 * 13 endpoints for external system integration, API key management, and routing
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createBridgeRouter(callTool: CallToolFn): Router {
  const router = Router();

  // --- Endpoint Management ---

  // POST /bridge/endpoint/register — Register external endpoint
  router.post("/endpoint/register", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "register_endpoint", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /bridge/endpoint/remove — Remove external endpoint
  router.post("/endpoint/remove", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "remove_endpoint", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /bridge/endpoint/status — Set endpoint status
  router.post("/endpoint/status", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "set_status", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /bridge/endpoints — List registered endpoints
  router.get("/endpoints", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "list_endpoints");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- API Key Management ---

  // POST /bridge/key/create — Create API key
  router.post("/key/create", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "create_key", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /bridge/key/revoke — Revoke API key
  router.post("/key/revoke", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "revoke_key", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /bridge/key/validate — Validate API key
  router.post("/key/validate", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "validate_key", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /bridge/keys — List API keys
  router.get("/keys", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "list_keys");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Routing & Status ---

  // POST /bridge/route — Route request to external system
  router.post("/route", async (req, res) => {
    try {
      const result = await callTool("prism_bridge", "route", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /bridge/route-map — Get routing map
  router.get("/route-map", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "route_map");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /bridge/health — Bridge health check
  router.get("/health", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "health");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /bridge/stats — Bridge statistics
  router.get("/stats", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "stats");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /bridge/config — Bridge configuration
  router.get("/config", async (_req, res) => {
    try {
      const result = await callTool("prism_bridge", "config");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
