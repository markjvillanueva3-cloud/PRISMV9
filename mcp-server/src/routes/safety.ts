/**
 * PRISM MCP Server — Safety Routes
 * Safety validation, parameter checking, knowledge search
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createSafetyRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/safety/validate — Validate cutting parameters
  router.post("/validate", async (req, res, next) => {
    try {
      const result = await callTool("prism_safety", "validate", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/safety/check-limits — Check machine limits
  router.post("/check-limits", async (req, res, next) => {
    try {
      const result = await callTool("prism_safety", "check_limits", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/safety/collision — Collision detection
  router.post("/collision", async (req, res, next) => {
    try {
      const result = await callTool("prism_safety", "collision_check", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/knowledge/search — Knowledge base search
  router.post("/knowledge/search", async (req, res, next) => {
    try {
      const result = await callTool("prism_knowledge", "search", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
