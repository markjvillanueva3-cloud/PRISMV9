import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createDiagnosisRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/forensic", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_diagnosis", "forensic_tool_autopsy", req.body) }); } catch (e) { next(e); }
  });
  router.post("/inverse", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_diagnosis", "inverse_solve", req.body) }); } catch (e) { next(e); }
  });
  router.post("/genplan", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_diagnosis", "genplan_plan", req.body) }); } catch (e) { next(e); }
  });
  router.post("/sustainability", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_diagnosis", "sustain_optimize", req.body) }); } catch (e) { next(e); }
  });

  return router;
}
