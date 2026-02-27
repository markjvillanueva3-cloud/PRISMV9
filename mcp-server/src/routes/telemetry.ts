/**
 * PRISM MCP Server — Telemetry & Monitoring Routes
 * 7 endpoints for system telemetry, anomaly detection, and optimization
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createTelemetryRouter(callTool: CallToolFn): Router {
  const router = Router();

  // GET /telemetry/dashboard — Telemetry dashboard overview
  router.get("/dashboard", async (_req, res) => {
    try {
      const result = await callTool("prism_telemetry", "get_dashboard");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /telemetry/detail — Detailed telemetry for specific metric
  router.post("/detail", async (req, res) => {
    try {
      const result = await callTool("prism_telemetry", "get_detail", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /telemetry/anomalies — Detected anomalies
  router.get("/anomalies", async (_req, res) => {
    try {
      const result = await callTool("prism_telemetry", "get_anomalies");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /telemetry/optimization — Optimization recommendations
  router.get("/optimization", async (_req, res) => {
    try {
      const result = await callTool("prism_telemetry", "get_optimization");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /telemetry/acknowledge — Acknowledge anomaly/alert
  router.post("/acknowledge", async (req, res) => {
    try {
      const result = await callTool("prism_telemetry", "acknowledge", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /telemetry/freeze — Freeze telemetry weights
  router.post("/freeze", async (req, res) => {
    try {
      const result = await callTool("prism_telemetry", "freeze_weights", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /telemetry/unfreeze — Unfreeze telemetry weights
  router.post("/unfreeze", async (req, res) => {
    try {
      const result = await callTool("prism_telemetry", "unfreeze_weights", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
