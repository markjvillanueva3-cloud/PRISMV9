/**
 * PRISM MCP Server — GSD (Getting Stuff Done) Protocol Routes
 * 6 endpoints for GSD protocol, dev protocol, and quick resume
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createGsdRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/core", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_gsd", "core", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/quick", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_gsd", "quick", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/get", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_gsd", "get", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/dev-protocol", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_gsd", "dev_protocol", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/resources", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_gsd", "resources_summary") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/quick-resume", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_gsd", "quick_resume", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
