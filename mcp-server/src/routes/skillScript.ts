/**
 * PRISM MCP Server — Skill & Script Routes
 * 27 endpoints for skill registry, script execution, and bundles
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createSkillScriptRouter(callTool: CallToolFn): Router {
  const router = Router();

  // --- Skills ---
  router.get("/skill/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_list") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/skill/get", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_get", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/skill/search", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_search", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/skill/find", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_find_for_task", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/skill/content", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_content", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/skill/stats", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_stats") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/skill/load", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_load", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/skill/recommend", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_recommend", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/skill/analyze", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_analyze", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/skill/chain", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_chain", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/skill/search-v2", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_search_v2", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/skill/stats-v2", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "skill_stats_v2") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Scripts ---
  router.get("/script/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_list") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/script/get", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_get", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/script/search", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_search", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/script/command", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_command", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/script/execute", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_execute", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/script/stats", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_stats") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/script/execute-v2", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_execute_v2", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/script/queue", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_queue", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/script/recommend", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_recommend", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/script/search-v2", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_search_v2", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/script/history", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "script_history") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Bundles ---
  router.get("/bundle/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "bundle_list") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/bundle/get", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "bundle_get", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/bundle/for-action", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "bundle_for_action", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/bundle/for-domain", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_skill_script", "bundle_for_domain", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
