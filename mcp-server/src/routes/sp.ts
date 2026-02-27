/**
 * PRISM MCP Server — SP (SPARC Protocol) Routes
 * 19 endpoints for brainstorming, planning, cognitive ops, and validation
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createSpRouter(callTool: CallToolFn): Router {
  const router = Router();

  // Core workflow
  router.post("/brainstorm", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "brainstorm", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/plan", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "plan", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/execute", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "execute", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/review/spec", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "review_spec", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/review/quality", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "review_quality", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/debug", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "debug", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Cognitive
  router.post("/cognitive/init", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "cognitive_init", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/cognitive/check", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "cognitive_check", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/cognitive/bayes", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "cognitive_bayes", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/cognitive/rl", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "cognitive_rl", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/combination/ilp", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "combination_ilp", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Context helpers
  router.post("/context/kv-optimize", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "context_kv_optimize", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/context/attention-anchor", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "context_attention_anchor", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/context/error-preserve", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "context_error_preserve", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Session
  router.post("/session/start", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "session_start_full", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/session/end", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "session_end_full", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Validation
  router.post("/evidence-level", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "evidence_level", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/validate/gates", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "validate_gates_full", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/validate/mathplan", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_sp", "validate_mathplan", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
