/**
 * PRISM MCP Server — RALPH Quality Assessment Routes
 * 3 endpoints for quality loop, scrutiny, and assessment
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createRalphRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/loop", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_ralph", "loop", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/scrutinize", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_ralph", "scrutinize", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/assess", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_ralph", "assess", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
