import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createMachineLiveRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/list", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_machine_live", "machine_list", req.body) }); } catch (e) { next(e); }
  });
  router.post("/status", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_machine_live", "machine_live_status", req.body) }); } catch (e) { next(e); }
  });
  router.post("/adaptive", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_machine_live", "adaptive_status", req.body) }); } catch (e) { next(e); }
  });
  router.post("/maintenance", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_machine_live", "maint_status", req.body) }); } catch (e) { next(e); }
  });
  router.post("/twin", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_machine_live", "digital_twin_state", req.body) }); } catch (e) { next(e); }
  });
  router.post("/acknowledge", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_machine_live", "alert_acknowledge", req.body) }); } catch (e) { next(e); }
  });
  router.post("/connect", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_machine_live", "machine_connect", req.body) }); } catch (e) { next(e); }
  });

  return router;
}
