/**
 * PRISM MCP Server — Document Management Routes
 * 7 endpoints for document CRUD, roadmap status, action tracking, and migration
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

// Privileged-write tier for server-document mutations. prism_doc.write/append/migrate resolve
// path.join(DOCS_DIR, params.name) (documentDispatcher.ts:21,146) and write into data/docs/ -- an
// attacker-controlled name + no anon login would be an anonymous server-side file write / `../` traversal.
const DOC_WRITE_ROLES = requireRole("lead", "hr_manager", "admin");

/** Creates doc router.
 *
 * AUTH (U-INBOX-INTEGRATIONS-AUTH slot:hotel): mounted under /api (optionalToken, never rejects anon).
 * ALL routes require a login (verifyToken -> 401); the three FS mutations (/write,/append,/migrate)
 * additionally require lead+ because they write server documents. No live FE caller -- gating is UI-safe.
 * @param callTool - call tool
 * @returns router
 */
export function createDocRouter(callTool: CallToolFn): Router {
  const router = Router();

  // Baseline gate: every doc route requires a login.
  router.use(verifyToken);

  router.get("/list", async (_req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "list") }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/read", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "read", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/write", DOC_WRITE_ROLES, async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "write", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  router.post("/append", DOC_WRITE_ROLES, async (req, res) => {
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
  router.post("/migrate", DOC_WRITE_ROLES, async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_doc", "migrate", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
