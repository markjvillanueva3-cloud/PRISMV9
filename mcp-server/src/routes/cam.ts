/**
 * PRISM MCP Server — CAM Routes
 * Toolpath generation, simulation, post-processing, collision checking
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates cam router.
 * @param callTool - call tool
 * @returns router
 */
export function createCamRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/cam/auto-print-to-program — Generic print/CAD to program bridge
  router.post("/auto-print-to-program", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "auto_print_to_program", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cam/toolpath/generate — Generate toolpath
  router.post("/toolpath/generate", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "toolpath_generate", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cam/simulate — Toolpath simulation
  router.post("/simulate", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "toolpath_simulate", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cam/post-process — Post-process to G-code
  router.post("/post-process", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "post_process", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cam/collision-check — Full collision checking
  router.post("/collision-check", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "collision_check_full", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // ─── U-CAM123: AI Health Dashboard read-only surfaces ───
  // Bridges CAMModelServingEngine (U-CAM122) to the operator dashboard.
  // All POST + JSON for parity with the rest of this router; bodies are
  // optional filter objects for list_models / list_pending_confirmations.

  router.post("/serve/list-models", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "cam_serve_list_models", req.body ?? {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/serve/get-model", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "cam_serve_get_model", req.body ?? {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/serve/list-health", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "cam_serve_list_health", req.body ?? {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/serve/get-health", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "cam_serve_get_health", req.body ?? {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/serve/list-routing-policies", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "cam_serve_list_routing_policies", req.body ?? {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  router.post("/serve/list-pending-confirmations", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "cam_serve_list_pending_confirmations", req.body ?? {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
