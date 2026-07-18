/**
 * PRISM MCP Server -- Safety Routes
 * Safety validation, parameter checking, knowledge search
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates safety router.
 * @param callTool - call tool
 * @returns router
 */
export function createSafetyRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/safety/validate -- Validate cutting parameters. prism_safety has NO single
  // holistic `validate` action; it exposes many SPECIFIC validators (validate_spindle_speed,
  // validate_tool_clearance, validate_rapid_moves, validate_workholding_setup, ...). Mapping this
  // endpoint to any ONE of them would falsely report full-parameter validation (R12 + a safety
  // hazard). Fail loud (501) until a real holistic safety-validation action is wired, instead of
  // the prior silent 200+{error} the SPA could not detect.
  router.post("/validate", async (_req, res) => {
    res.status(501).json({
      message: "holistic cutting-parameter validation not yet wired -- prism_safety exposes only specific validators (validate_spindle_speed, validate_tool_clearance, validate_rapid_moves, validate_workholding_setup, ...). Call the specific check needed, or wire a composite safety-validate action.",
      error: "not_implemented",
    });
  });

  // POST /api/v1/safety/check-limits -- Check machine limits. Real action: `get_safe_cutting_limits`
  // (returns the safe cutting envelope for the supplied machine/tool/material). Prior `check_limits`
  // did not exist on prism_safety.
  router.post("/check-limits", async (req, res, next) => {
    try {
      const result = await callTool("prism_safety", "get_safe_cutting_limits", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/safety/collision -- Collision detection. Real action: `check_toolpath_collision`
  // (prior `collision_check` did not exist -> silent 200+{error}). SAFETY-CRITICAL.
  router.post("/collision", async (req, res, next) => {
    try {
      const result = await callTool("prism_safety", "check_toolpath_collision", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/knowledge/search -- Knowledge base search (prism_knowledge:search resolves; unchanged)
  router.post("/knowledge/search", async (req, res, next) => {
    try {
      const result = await callTool("prism_knowledge", "search", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
