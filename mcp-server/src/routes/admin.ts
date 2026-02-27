/**
 * PRISM MCP Server — Admin Routes
 * System administration, user management, diagnostics
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createAdminRouter(callTool: CallToolFn): Router {
  const router = Router();

  // GET /api/v1/admin/status — Full system status
  router.get("/status", async (_req, res, next) => {
    try {
      const result = await callTool("prism_dev", "status", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/admin/registries — Registry statistics
  router.get("/registries", async (_req, res, next) => {
    try {
      const result = await callTool("prism_dev", "registry_stats", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/admin/dispatchers — Dispatcher inventory
  router.get("/dispatchers", async (_req, res, next) => {
    try {
      const result = await callTool("prism_dev", "dispatcher_inventory", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/admin/users — Manage users (admin only)
  router.post("/users", async (req, res, next) => {
    try {
      const result = await callTool("prism_tenant", "user_manage", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/admin/audit-log — View audit log
  router.get("/audit-log", async (req, res, next) => {
    try {
      const result = await callTool("prism_compliance", "audit_log", {
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/admin/cache/clear — Clear system cache
  router.post("/cache/clear", async (_req, res, next) => {
    try {
      const result = await callTool("prism_dev", "cache_clear", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
