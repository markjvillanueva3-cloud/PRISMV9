import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createTurningRouter(callTool: CallToolFn): Router {
  const router = Router();

  async function invoke(
    toolName: string,
    action: string,
    body: Record<string, any> | undefined,
  ): Promise<{ result: any }> {
    return { result: await callTool(toolName, action, body) };
  }

  router.post("/calculate", async (req, res, next) => {
    try { res.json(await invoke("prism_turning_program", "turning_process_plan", req.body)); } catch (e) { next(e); }
  });
  router.post("/program", async (req, res, next) => {
    try { res.json(await invoke("prism_turning_program", "turning_print_to_program", req.body)); } catch (e) { next(e); }
  });
  router.post("/threading", async (req, res, next) => {
    try { res.json(await invoke("prism_turning", "thread_turning_calc", req.body)); } catch (e) { next(e); }
  });
  router.post("/grooving", async (req, res, next) => {
    try { res.json(await invoke("prism_turning_program", "turning_process_plan", req.body)); } catch (e) { next(e); }
  });
  router.post("/boring", async (req, res, next) => {
    try { res.json(await invoke("prism_turning_program", "turning_process_plan", req.body)); } catch (e) { next(e); }
  });
  router.post("/validate", async (req, res, next) => {
    try { res.json(await invoke("prism_turning", "turning_validate", req.body)); } catch (e) { next(e); }
  });
  router.post("/cycle-time", async (req, res, next) => {
    try { res.json(await invoke("prism_turning", "turning_cycle_time", req.body)); } catch (e) { next(e); }
  });
  return router;
}
