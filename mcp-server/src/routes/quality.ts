/**
 * PRISM MCP Server -- Quality Routes
 * SPC, Cpk, measurement analysis, tolerance stacking
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates quality router.
 * @param callTool - call tool
 * @returns router
 */
export function createQualityRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/quality/spc -- SPC calculation (X-bar/R chart)
  router.post("/spc", async (req, res, next) => {
    try {
      const result = await callTool("prism_quality", "spc_calculate", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/quality/cpk -- Process capability analysis. Real action is
  // `spc_process_capability_analyze` (prior `capability_analysis` did not exist on prism_quality
  // -> silent 200+{error}).
  router.post("/cpk", async (req, res, next) => {
    try {
      const result = await callTool("prism_quality", "spc_process_capability_analyze", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/quality/measurement -- Measurement analysis
  router.post("/measurement", async (req, res, next) => {
    try {
      const result = await callTool("prism_quality", "measurement_analyze", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/quality/tolerance-stack -- Tolerance stack-up analysis
  router.post("/tolerance-stack", async (req, res, next) => {
    try {
      const result = await callTool("prism_quality", "tolerance_stack", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
