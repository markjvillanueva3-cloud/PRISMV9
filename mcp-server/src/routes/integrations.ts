import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

// Privileged-write tier for the ERP work-order import + CMM result import (mirrors erp.ts's
// dispatch/financial tier, erp.ts:243-264,388). The other routes (cam/dnc/mobile) require only a login.
const WRITE_ROLES = requireRole("lead", "hr_manager", "admin");

/**
 * Creates the integrations router.
 *
 * AUTH: mounted under `/api` (optionalToken, never rejects anon), so the gate lives here. ALL routes require
 * a valid Bearer (verifyToken -> 401 for anon) -- these are internal shop integrations, not a public surface.
 * `/erp` (erp_import_wo) and `/measurement` (measure_cmm_import) additionally require lead+ because they are
 * privileged WRITES of ERP work-order + CMM inspection data (U-INBOX-INTEGRATIONS-AUTH, slot:hotel).
 */
export function createIntegrationsRouter(callTool: CallToolFn): Router {
  const router = Router();
  // Baseline gate: every integrations route requires a login.
  router.use(verifyToken);
  router.post("/cam", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "cam_recommend", req.body) }); } catch (e) { next(e); }
  });
  router.post("/dnc", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "dnc_generate", req.body) }); } catch (e) { next(e); }
  });
  router.post("/erp", WRITE_ROLES, async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "erp_import_wo", req.body) }); } catch (e) { next(e); }
  });
  router.post("/mobile", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "mobile_lookup", req.body) }); } catch (e) { next(e); }
  });
  router.post("/measurement", WRITE_ROLES, async (req, res, next) => {
    try { res.json({ result: await callTool("prism_integration", "measure_cmm_import", req.body) }); } catch (e) { next(e); }
  });
  return router;
}
