/**
 * PRISM MCP Server — Document Management Routes
 * 7 endpoints for document CRUD, roadmap status, action tracking, and migration
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createDocRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.get("/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "list") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/read", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "read", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/write", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "write", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/append", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "append", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/roadmap-status", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "roadmap_status") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/action-tracker", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "action_tracker") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/migrate", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "migrate", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
