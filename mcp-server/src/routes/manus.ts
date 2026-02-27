/**
 * PRISM MCP Server — Manus (Agent Task) Routes
 * 11 endpoints for agent task management, web research, sandboxing, and hooks
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createManusRouter(callTool: CallToolFn): Router {
  const router = Router();

  // Task management
  router.post("/task/create", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "create_task", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/task/status", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "task_status", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/task/result", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "task_result", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/task/cancel", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "cancel_task", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/task/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "list_tasks") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Capabilities
  router.post("/web-research", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "web_research", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/code-sandbox", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "code_sandbox", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Hook integration
  router.post("/hook/trigger", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "hook_trigger", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/hook/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "hook_list") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/hook/chain", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "hook_chain", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/hook/stats", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_manus", "hook_stats") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
