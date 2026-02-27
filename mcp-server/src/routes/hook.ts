/**
 * PRISM MCP Server — Hook Management Routes
 * 20 endpoints for hook execution, events, monitoring, and reactive chains
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createHookRouter(callTool: CallToolFn): Router {
  const router = Router();

  // Core CRUD
  router.get("/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "list") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/get", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "get", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/execute", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "execute", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/chain", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "chain", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/toggle", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "toggle", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Events
  router.post("/emit", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "emit", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/event/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "event_list") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/event/history", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "event_history") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // V2 operations
  router.post("/fire", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "fire", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/chain-v2", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "chain_v2", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/status", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "status") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/history", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "history") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Management
  router.post("/enable", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "enable", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/disable", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "disable", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/coverage", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "coverage") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/gaps", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "gaps") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/performance", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "performance") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/failures", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "failures") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Reactive
  router.post("/subscribe", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "subscribe", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.get("/reactive-chains", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_hook", "reactive_chains") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
