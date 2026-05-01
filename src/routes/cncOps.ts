import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createCncOpsRouter(callTool: CallToolFn): Router {
  const router = Router();
  router.post("/assemble", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_cnc_ops", "assemble_program", req.body) }); } catch (e) { next(e); }
  });
  router.post("/motion-profile", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_cnc_ops", "motion_profile", req.body) }); } catch (e) { next(e); }
  });
  router.post("/magazine", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_cnc_ops", "magazine_optimize", req.body) }); } catch (e) { next(e); }
  });
  router.post("/setup-sheet", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_cnc_ops", "setup_sheet", req.body) }); } catch (e) { next(e); }
  });
  return router;
}
