/**
 * PRISM MCP Server — Thread Calculation Routes
 * 12 endpoints for thread manufacturing calculations
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createThreadRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /threads/tap-drill — Calculate tap drill size
  router.post("/tap-drill", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "calculate_tap_drill", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/mill-params — Thread milling parameters
  router.post("/mill-params", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "calculate_thread_mill_params", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/depth — Thread depth calculation
  router.post("/depth", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "calculate_thread_depth", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/engagement — Thread engagement percentage
  router.post("/engagement", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "calculate_engagement_percent", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/specifications — Get thread specifications
  router.post("/specifications", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "get_thread_specifications", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/gauges — Get go/no-go gauge dimensions
  router.post("/gauges", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "get_go_nogo_gauges", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/pitch-diameter — Pitch diameter calculation
  router.post("/pitch-diameter", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "calculate_pitch_diameter", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/diameters — Minor/major diameter calculation
  router.post("/diameters", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "calculate_minor_major_diameter", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/select-insert — Select threading insert
  router.post("/select-insert", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "select_thread_insert", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/cutting-params — Thread cutting parameters
  router.post("/cutting-params", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "calculate_thread_cutting_params", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/validate-fit — Validate thread fit class
  router.post("/validate-fit", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "validate_thread_fit_class", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /threads/gcode — Generate threading G-code
  router.post("/gcode", async (req, res) => {
    try {
      const result = await callTool("prism_thread", "generate_thread_gcode", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
