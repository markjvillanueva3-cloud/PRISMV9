/**
 * PRISM MCP Server — Omega Quality Score Routes
 * 5 endpoints for computing, breaking down, and optimizing the Omega quality score
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createOmegaRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/compute", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_omega", "compute", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/breakdown", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_omega", "breakdown", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/validate", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_omega", "validate", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/optimize", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_omega", "optimize", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/history", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_omega", "history") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
