/**
 * PRISM MCP Server — Context Management Routes
 * 26 endpoints for KV store, memory, todos, errors, teams, budget, attention, and catalog
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createContextRouter(callTool: CallToolFn): Router {
  const router = Router();

  // --- KV Store ---
  router.post("/kv/sort", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "kv_sort_json", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/kv/stability", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "kv_check_stability", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Tool Mask ---
  router.post("/tool-mask", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "tool_mask_state", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Memory ---
  router.post("/memory/externalize", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "memory_externalize", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/memory/restore", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "memory_restore", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Todos ---
  router.post("/todo/update", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "todo_update", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/todo", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "todo_read") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Error Management ---
  router.post("/error/preserve", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "error_preserve", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/error/patterns", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "error_patterns") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Response Variation ---
  router.post("/vary-response", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "vary_response", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Team Coordination ---
  router.post("/team/spawn", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "team_spawn", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/team/broadcast", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "team_broadcast", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/team/task", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "team_create_task", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/team/heartbeat", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "team_heartbeat", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Budget ---
  router.get("/budget", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "budget_get") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/budget/track", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "budget_track", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/budget/report", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "budget_report") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/budget/reset", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "budget_reset", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Attention & Focus ---
  router.post("/attention/score", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "attention_score", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/focus/optimize", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "focus_optimize", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/relevance/filter", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "relevance_filter", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Monitor ---
  router.get("/monitor", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "context_monitor_check") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Catalog ---
  router.get("/catalog", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "catalog_overview") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/catalog/search", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "catalog_search", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/catalog/engine", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "catalog_engine", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/catalog/stats", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_context", "catalog_stats") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
