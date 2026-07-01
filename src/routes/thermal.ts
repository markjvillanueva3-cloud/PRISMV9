import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createThermalRouter(callTool: CallToolFn): Router {
  const router = Router();
  router.post("/heat-exchanger", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_fluid_thermal", "heat_exchanger_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/pump", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_fluid_thermal", "pump_select", req.body) }); } catch (e) { next(e); }
  });
  router.post("/pipe", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_fluid_thermal", "pipe_sizing_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/hydraulic", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_fluid_thermal", "hydraulic_cylinder_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/compressor", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_fluid_thermal", "compressor_design_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/cooling", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_fluid_thermal", "cooling_tower_calculate", req.body) }); } catch (e) { next(e); }
  });
  return router;
}
