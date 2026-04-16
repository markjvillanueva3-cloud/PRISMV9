import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createSpecialtyRouter(callTool: CallToolFn): Router {
  const router = Router();
  router.post("/grinding", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_grinding", "grinding_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/forming/sheet-metal", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_forming", "sheet_metal_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/forming/casting", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_forming", "casting_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/forming/molding", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_forming", "molding_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/welding", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_welding", "welding_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/welding/joint", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_welding", "joint_design", req.body) }); } catch (e) { next(e); }
  });
  router.post("/welding/inspection", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_welding", "weld_inspect", req.body) }); } catch (e) { next(e); }
  });
  return router;
}
