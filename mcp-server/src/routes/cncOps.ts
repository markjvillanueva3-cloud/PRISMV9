/**
 * PRISM CNC-Ops Routes -- /api/v1/cnc-ops/*
 *
 * Wired (U-FE-CNCOPS-ACTION-FIX, slot:sierra). The prior calls targeted prism_cnc_ops actions that do
 * NOT exist there (assemble_program / motion_profile / magazine_optimize / setup_sheet -> silent
 * 200+{error}); prism_cnc_ops is a per-OPERATION calculator dispatcher (drilling/milling/turning ops),
 * not a program-level one. The program-level actions live on prism_cam -- rerouted there. All POST
 * (req.body), so the SPA owns the param shape; prism_cam strict-validates it.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createCncOpsRouter(callTool: CallToolFn): Router {
  const router = Router();

  // /assemble -> prism_cam:program_assemble (assemble a CNC program from operations).
  router.post("/assemble", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_cam", "program_assemble", req.body) }); } catch (e) { next(e); }
  });

  // /motion-profile -> 501. prism_cam exposes SEVERAL motion-profile primitives (motion_scurve,
  // motion_trapezoidal, motion_optimize_feed, motion_look_ahead) but no single "motion_profile" -- the
  // correct one depends on the desired profile type. Fail loud + name the candidates rather than guess.
  router.post("/motion-profile", async (_req, res) => {
    res.status(501).json({
      message: "motion profile not yet wired -- prism_cam has motion_scurve / motion_trapezoidal / motion_optimize_feed / motion_look_ahead (no single motion_profile). Pick the profile type, or add a unified action.",
      error: "not_implemented",
    });
  });

  // /magazine -> prism_cam:cam_tool_magazine (tool-magazine layout/management).
  router.post("/magazine", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_cam", "cam_tool_magazine", req.body) }); } catch (e) { next(e); }
  });

  // /setup-sheet -> prism_cam:setup_sheet_generate (generate a setup sheet).
  router.post("/setup-sheet", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_cam", "setup_sheet_generate", req.body) }); } catch (e) { next(e); }
  });

  return router;
}
