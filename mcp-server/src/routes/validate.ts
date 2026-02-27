/**
 * PRISM MCP Server — Validation Routes
 * 7 endpoints for material, formula, safety, and regression validation
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createValidateRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/material", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_validate", "material", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/kienzle", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_validate", "kienzle", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/taylor", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_validate", "taylor", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/johnson-cook", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_validate", "johnson_cook", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/safety", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_validate", "safety", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/completeness", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_validate", "completeness", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/anti-regression", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_validate", "anti_regression", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
