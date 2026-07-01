/**
 * PRISM MCP Server — Developer Tools Routes
 * 12 endpoints for build, code generation, file I/O, testing, and SVI status
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates dev router.
 * @param callTool - call tool
 * @returns router
 */
export function createDevRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/session-boot", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "session_boot", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/build", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "build", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/code/template", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "code_template", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/code/search", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "code_search", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/file/read", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "file_read", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/file/write", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "file_write", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/server-info", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "server_info") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/test/smoke", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "test_smoke", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/test/results", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "test_results") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/svi/compute", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "svi_compute", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/svi/read", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "svi_read") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/svi/summary", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "svi_summary") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  // QUEBEC/U-DEV-DASHBOARD-ROUTES: dead wires for web/src/api/dev.ts (qualityDashboard/pillarSummary/
  // capabilityCensus). All 3 are real non-stub prism_dev actions. (devApi.inventory() is NOT wired here:
  // there is no prism_dev:inventory action -- needs a backend action or a client re-point; left dead.)
  router.get("/quality-dashboard", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "quality_dashboard") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/pillar-summary", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "pillar_summary") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/capability-census", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "capability_census") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/forge", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "auto_forge", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/forge/summary", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "auto_forge_summary", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/resource-census", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "resource_census", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/resource-census/read", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "resource_census_read") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/resource-census/summary", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "resource_census_summary") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/pdf-pipeline/classify", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "pdf_pipeline_classify", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/pdf-pipeline/extract", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "pdf_pipeline_extract", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/pdf-pipeline/read", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "pdf_pipeline_read") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/pdf-pipeline/summary", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "pdf_pipeline_summary") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ── SQ3-0: Machine data hardening ──
  router.post("/machine-harden/audit", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "machine_harden_audit", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/machine-harden/enrich", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "machine_harden_enrich", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/machine-harden/validate", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "machine_harden_validate", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/machine-harden/read", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "machine_harden_read") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/machine-harden/summary", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "machine_harden_summary") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
