/**
 * DFM Analysis Routes — /api/v1/dfm/*
 *
 * POST /analyze        Full DFM pipeline (all engines + new rules + GD&T Cpk)
 * POST /quick          Quick pre-order DFM check (feature rules only)
 * POST /tolerance-check Tolerance stack-up analysis (linear or RSS)
 * POST /cost-impact    DFM cost impact only (issues with $ amounts)
 * GET  /rules          List all DFM rules across engines
 */

import { Router } from "express";

type CallTool = (tool: string, action: string, params: Record<string, unknown>) => Promise<unknown>;

export function createDfmRouter(callTool: CallTool): Router {
  const router = Router();

  // POST /api/v1/dfm/analyze — full DFM pipeline
  router.post("/analyze", async (req, res) => {
    try {
      const result = await callTool("prism_cad", "dfm_analyze", req.body);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // POST /api/v1/dfm/quick — quick pre-order check
  router.post("/quick", async (req, res) => {
    try {
      const result = await callTool("prism_cad", "dfm_quick", req.body);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // POST /api/v1/dfm/tolerance-check — stack-up analysis
  router.post("/tolerance-check", async (req, res) => {
    try {
      const result = await callTool("prism_cad", "dfm_tolerance_check", req.body);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // POST /api/v1/dfm/cost-impact — cost impact analysis
  router.post("/cost-impact", async (req, res) => {
    try {
      const result = await callTool("prism_cad", "dfm_cost_impact", req.body);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // GET /api/v1/dfm/rules — list all rules
  router.get("/rules", async (_req, res) => {
    try {
      const result = await callTool("prism_cad", "dfm_get_rules", {});
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  return router;
}
