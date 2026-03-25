/**
 * PRISM MCP Server — ERP & Quoting Product Routes
 * 10 endpoints for cost estimation, quoting, scheduling, and business intelligence
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates erp router.
 * @param callTool - call tool
 * @returns router
 */
export function createErpRouter(callTool: CallToolFn): Router {
  const router = Router();

  // --- Quoting ---

  // POST /erp/quote/generate — Generate full manufacturing quote
  router.post("/quote/generate", async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_quote", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /erp/quote/breakdown — Detailed cost breakdown
  router.post("/quote/breakdown", async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_cost", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /erp/quote/compare — Compare quotes across strategies
  router.post("/quote/compare", async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_compare", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Job Management ---

  // POST /erp/job/plan — Plan manufacturing job (routing, scheduling)
  router.post("/job/plan", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "job_plan", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /erp/job/schedule — Schedule job on machines
  router.post("/job/schedule", async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_schedule", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /erp/job/track — Track job progress and OEE
  router.post("/job/track", async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_job", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Business Intelligence ---

  // POST /erp/analytics/capacity — Capacity utilization analysis
  router.post("/analytics/capacity", async (req, res) => {
    try {
      const result = await callTool("prism_product", "shop_dashboard", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /erp/analytics/bottleneck — Bottleneck identification
  router.post("/analytics/bottleneck", async (req, res) => {
    try {
      const result = await callTool("prism_calc", "bottleneck_identify", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /erp/analytics/oee — Overall Equipment Effectiveness
  router.post("/analytics/oee", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "oee_calculate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /erp/analytics/predictive — Predictive maintenance indicators
  router.post("/analytics/predictive", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "predictive_maint", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
