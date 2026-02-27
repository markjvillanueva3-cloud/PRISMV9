/**
 * PRISM MCP Server — Developer Tools Routes
 * 9 endpoints for build, code generation, file I/O, and testing
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

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

  return router;
}
