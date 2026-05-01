/**
 * PRISM MCP Server — Speed/Feed Orchestrator Routes
 * Full pipeline: resolve → compute → stochastic → compare → optimize
 *
 * INFRA-MS0: Tier-gated (free plan: 10/day) with usage tracking.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { requireTier } from "../middleware/tierGate.js";
import { trackUsage } from "../middleware/usageCounter.js";

export function createSpeedFeedRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/speed-feed/orchestrate — Full pipeline (tier-gated)
  router.post("/orchestrate", requireTier("speed_feed"), trackUsage("speed_feed"), async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sf_orchestrate", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/speed-feed/quick — Fast mode (no stochastic)
  router.post("/quick", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sf_quick", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/speed-feed/stochastic — Full uncertainty analysis
  router.post("/stochastic", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sf_stochastic", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/speed-feed/resolve/machine — Machine context only
  router.post("/resolve/machine", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sf_resolve_machine", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/speed-feed/resolve/tool — Tool context only
  router.post("/resolve/tool", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sf_resolve_tool", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/speed-feed/resolve/material — Material context only
  router.post("/resolve/material", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sf_resolve_material", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/speed-feed/compare — Compare scenarios
  router.post("/compare", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sf_compare", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/speed-feed/optimize — MOPSO Pareto optimization
  router.post("/optimize", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sf_optimize", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/speed-feed/inventory-select — Match features to on-hand tooling
  router.post("/inventory-select", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "inventory_tool_select", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/speed-feed/tool-roi — Price-tier ROI analysis for tooling upgrades
  router.post("/tool-roi", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "tool_roi_analysis", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
