/**
 * PRISM MCP Server — CAM Routes
 * Toolpath generation, simulation, post-processing, collision checking
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createCamRouter(callTool: CallToolFn): Router {
  const router = Router();

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

  return router;
}
