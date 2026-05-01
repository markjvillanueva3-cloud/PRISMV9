import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createIntegrationsRouter(callTool: CallToolFn): Router {
  const router = Router();
  router.post("/cam", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "cam_recommend", req.body) }); } catch (e) { next(e); }
  });
  router.post("/dnc", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "dnc_generate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/erp", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "erp_import_wo", req.body) }); } catch (e) { next(e); }
  });
  router.post("/mobile", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "mobile_lookup", req.body) }); } catch (e) { next(e); }
  });
  router.post("/measurement", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "measure_cmm_import", req.body) }); } catch (e) { next(e); }
  });
  return router;
}
