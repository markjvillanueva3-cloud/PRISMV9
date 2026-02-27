/**
 * PRISM MCP Server — PPG (Post Processor Generator) Product Routes
 * 8 endpoints wrapping PostProcessorEngine + GCodeTemplateEngine + GCodeOptimizationEngine
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createPpgRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /ppg/generate — Generate G-code from toolpath moves
  router.post("/generate", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "post_process", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/template — Generate from parametric template (facing, drilling, etc.)
  router.post("/template", async (req, res) => {
    try {
      const result = await callTool("prism_generator", "gcode_generate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/program — Generate multi-operation program
  router.post("/program", async (req, res) => {
    try {
      const result = await callTool("prism_generator", "gcode_program", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/validate — Validate G-code for controller compatibility
  router.post("/validate", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "post_validate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/compare — Compare G-code output across controllers
  router.post("/compare", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "post_compare", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/optimize — Optimize G-code (reduce motion, merge rapids)
  router.post("/optimize", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "gcode_optimize", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/controllers — List supported CNC controllers
  router.get("/controllers", async (_req, res) => {
    try {
      const result = await callTool("prism_generator", "gcode_controllers", {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/operations — List supported G-code operations
  router.get("/operations", async (_req, res) => {
    try {
      const result = await callTool("prism_generator", "gcode_operations", {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
