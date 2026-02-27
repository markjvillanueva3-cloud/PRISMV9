/**
 * PRISM MCP Server — Session Management Routes
 * 32 endpoints for state, memory, context, workflow, and session lifecycle
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createSessionRouter(callTool: CallToolFn): Router {
  const router = Router();

  // --- State Management ---
  router.post("/state/load", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "state_load", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/state/save", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "state_save", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/state/checkpoint", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "state_checkpoint", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/state/diff", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "state_diff", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/state/rollback", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "state_rollback", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/state/reconstruct", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "state_reconstruct", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Session Lifecycle ---
  router.post("/start", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "session_start", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/end", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "session_end", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/recover", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "session_recover", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/resume", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "resume_session", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/quick-resume", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "quick_resume", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/resume-score", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "resume_score", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/handoff", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "handoff_prepare", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Memory ---
  router.post("/memory/save", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "memory_save", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/memory/recall", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "memory_recall", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Context Management ---
  router.get("/context/pressure", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "context_pressure") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/context/size", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "context_size") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/context/compress", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "context_compress", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/context/expand", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "context_expand", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/context/compaction", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "compaction_detect") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Transcript ---
  router.post("/transcript", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "transcript_read", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- WIP ---
  router.post("/wip/capture", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "wip_capture", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/wip/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "wip_list") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/wip/restore", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "wip_restore", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Checkpoints ---
  router.post("/checkpoint/auto", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "auto_checkpoint", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/checkpoint/enhanced", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "checkpoint_enhanced", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Workflow ---
  router.post("/workflow/start", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "workflow_start", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/workflow/advance", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "workflow_advance", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/workflow/status", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "workflow_status") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/workflow/complete", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "workflow_complete", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // --- Health & DSL ---
  router.get("/health", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "health_check") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/dsl-mode", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_session", "dsl_mode", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
