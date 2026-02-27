/**
 * PRISM MCP Server — Compliance & Regulatory Routes
 * 8 endpoints for regulatory compliance management
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createComplianceRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /compliance/template/apply — Apply compliance template
  router.post("/template/apply", async (req, res) => {
    try {
      const result = await callTool("prism_compliance", "apply_template", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /compliance/template/remove — Remove compliance template
  router.post("/template/remove", async (req, res) => {
    try {
      const result = await callTool("prism_compliance", "remove_template", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /compliance/templates — List available templates
  router.get("/templates", async (_req, res) => {
    try {
      const result = await callTool("prism_compliance", "list_templates");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /compliance/audit — Audit compliance status
  router.get("/audit", async (_req, res) => {
    try {
      const result = await callTool("prism_compliance", "audit_status");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /compliance/check — Check compliance against standards
  router.post("/check", async (req, res) => {
    try {
      const result = await callTool("prism_compliance", "check_compliance", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /compliance/resolve — Resolve compliance conflicts
  router.post("/resolve", async (req, res) => {
    try {
      const result = await callTool("prism_compliance", "resolve_conflicts", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /compliance/gap-analysis — Run gap analysis
  router.post("/gap-analysis", async (req, res) => {
    try {
      const result = await callTool("prism_compliance", "gap_analysis", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /compliance/config — Get compliance configuration
  router.get("/config", async (_req, res) => {
    try {
      const result = await callTool("prism_compliance", "config");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
