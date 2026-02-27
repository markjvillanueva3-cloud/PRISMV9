/**
 * PRISM MCP Server — Cost Routes
 * Cost estimation, quoting, comparison, history
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createCostRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/cost/estimate — Per-part cost estimation
  router.post("/estimate", async (req, res, next) => {
    try {
      const result = await callTool("prism_intelligence", "process_cost", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cost/quote — Generate customer quote
  router.post("/quote", async (req, res, next) => {
    try {
      const result = await callTool("prism_intelligence", "shop_quote", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cost/compare — Compare cost scenarios
  router.post("/compare", async (req, res, next) => {
    try {
      const result = await callTool("prism_intelligence", "cost_compare", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/cost/history/:jobId — Job cost history
  router.get("/history/:jobId", async (req, res, next) => {
    try {
      const result = await callTool("prism_intelligence", "cost_history", { jobId: req.params.jobId });
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
