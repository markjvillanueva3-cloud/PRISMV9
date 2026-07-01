/**
 * PRISM MCP Server — Manus (Agent Task) Routes
 * 11 endpoints for agent task management, web research, sandboxing, and hooks
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates manus router.
 * @param callTool - call tool
 * @returns router
 */
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

  // Capabilities. prism_manus exposes code_reasoning + knowledge_lookup (LLM reasoning), NOT a live
  // web_research browser nor an arbitrary code_sandbox executor -- those capabilities were never built.
  // Fail loud (501) rather than the silent 200+{error} a non-existent action produces.
  router.post("/web-research", async (_req, res) => {
    res.status(501).json({ ok: false, error: "not_implemented", message: "web research not yet wired -- prism_manus has no web_research action (it exposes code_reasoning + knowledge_lookup). Build a research capability then wire this route." });
  });
  router.post("/code-sandbox", async (_req, res) => {
    res.status(501).json({ ok: false, error: "not_implemented", message: "code sandbox not yet wired -- prism_manus has no code_sandbox action (it exposes code_reasoning + knowledge_lookup). Build a sandbox executor then wire this route." });
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
