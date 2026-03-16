import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createEdmRouter(callTool: CallToolFn): Router {
  const router = Router();
  router.post("/wire", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_edm", "wire_edm_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/sinker", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_edm", "sinker_edm_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/laser", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_edm", "laser_ablation_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/parameters", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_edm", "edm_parameters", req.body) }); } catch (e) { next(e); }
  });
  return router;
}
