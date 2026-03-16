import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createTurningRouter(callTool: CallToolFn): Router {
  const router = Router();
  router.post("/calculate", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_turning", "turning_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/threading", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_turning", "thread_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/grooving", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_turning", "groove_calculate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/boring", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_turning", "boring_calculate", req.body) }); } catch (e) { next(e); }
  });
  return router;
}
