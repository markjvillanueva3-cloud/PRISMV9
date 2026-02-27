/**
 * PRISM MCP Server — SFC (Speed & Feed Calculator) Routes
 * Consolidates existing SFC endpoints from index.ts into a proper router
 */
import { Router } from "express";
import { requireFields } from "../middleware/validation.js";
import type { CallToolFn } from "./index.js";

export function createSfcRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/sfc/calculate — Core speed & feed calculation
  router.post("/calculate", requireFields("material", "operation"), async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "speed_feed", req.body);
      res.json({ result, safety: result?.safety, meta: result?.meta });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/cycle-time — Cycle time estimation
  router.post("/cycle-time", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "cycle_time", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/engagement — Tool engagement analysis
  router.post("/engagement", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "engagement", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/deflection — Tool deflection check
  router.post("/deflection", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "deflection", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/power-torque — Power and torque calculation
  router.post("/power-torque", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "power_torque", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/surface-finish — Surface finish prediction
  router.post("/surface-finish", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "surface_finish", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/sfc/tool-life — Tool life estimation
  router.post("/tool-life", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "tool_life", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
