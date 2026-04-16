import type { Response } from "express";
import { Router } from "express";
import { MACHINE_LIVE_ACTION_SCHEMAS } from "../schemas/machineLiveActionSchemas.js";
import type { CallToolFn } from "./index.js";

type MachineLiveAction =
  | "machine_list"
  | "machine_live_status"
  | "adaptive_status"
  | "maint_status"
  | "digital_twin_state"
  | "alert_acknowledge"
  | "machine_connect";

function validateMachineLiveBody(
  action: MachineLiveAction,
  payload: unknown,
  res: Response,
): payload is Record<string, unknown> | undefined {
  const schema = MACHINE_LIVE_ACTION_SCHEMAS[action];
  const result = schema.safeParse(payload ?? {});

  if (result.success) {
    return true;
  }

  res.status(400).json({
    ok: false,
    error: result.error.issues[0]?.message ?? `Invalid ${action} request body`,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
  return false;
}

export function createMachineLiveRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/list", async (req, res, next) => {
    if (!validateMachineLiveBody("machine_list", req.body, res)) return;
    try { res.json({ result: await callTool("prism_machine_live", "machine_list", req.body) }); } catch (e) { next(e); }
  });
  router.post("/status", async (req, res, next) => {
    if (!validateMachineLiveBody("machine_live_status", req.body, res)) return;
    try { res.json({ result: await callTool("prism_machine_live", "machine_live_status", req.body) }); } catch (e) { next(e); }
  });
  router.post("/adaptive", async (req, res, next) => {
    if (!validateMachineLiveBody("adaptive_status", req.body, res)) return;
    try { res.json({ result: await callTool("prism_machine_live", "adaptive_status", req.body) }); } catch (e) { next(e); }
  });
  router.post("/maintenance", async (req, res, next) => {
    if (!validateMachineLiveBody("maint_status", req.body, res)) return;
    try { res.json({ result: await callTool("prism_machine_live", "maint_status", req.body) }); } catch (e) { next(e); }
  });
  router.post("/twin", async (req, res, next) => {
    if (!validateMachineLiveBody("digital_twin_state", req.body, res)) return;
    try { res.json({ result: await callTool("prism_machine_live", "digital_twin_state", req.body) }); } catch (e) { next(e); }
  });
  router.post("/acknowledge", async (req, res, next) => {
    if (!validateMachineLiveBody("alert_acknowledge", req.body, res)) return;
    try { res.json({ result: await callTool("prism_machine_live", "alert_acknowledge", req.body) }); } catch (e) { next(e); }
  });
  router.post("/connect", async (req, res, next) => {
    if (!validateMachineLiveBody("machine_connect", req.body, res)) return;
    try { res.json({ result: await callTool("prism_machine_live", "machine_connect", req.body) }); } catch (e) { next(e); }
  });

  return router;
}
