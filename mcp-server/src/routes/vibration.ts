import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createVibrationRouter(callTool: CallToolFn): Router {
  const router = Router();
  router.post("/stability-lobes", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_vibration_physics", "stability_lobe_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/modal", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_vibration_physics", "modal_analysis", req.body) }); } catch (e) { next(e); }
  });
  router.post("/chatter", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_vibration_physics", "chatter_detect", req.body) }); } catch (e) { next(e); }
  });
  router.post("/damping", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_vibration_physics", "process_damping", req.body) }); } catch (e) { next(e); }
  });
  return router;
}
