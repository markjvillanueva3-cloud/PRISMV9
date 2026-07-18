/**
 * PRISM MCP Server — Document Inbox Routes (DocuRead)
 * 8 endpoints for document intake, classification, part matching, and dashboard
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/**
 * Creates the inbox router.
 * @param callTool - MCP tool call function
 * @returns Express router
 */
export function createInboxRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /inbox/ingest — Accept and classify a new document
  router.post("/ingest", async (req, res) => {
    try {
      const result = await callTool("prism_inbox", "inbox_ingest", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // GET /inbox/list — List inbox items with filters
  router.get("/list", async (req, res) => {
    try {
      const params: Record<string, any> = {};
      if (req.query.status) params.status = req.query.status;
      if (req.query.document_type) params.document_type = req.query.document_type;
      if (req.query.part_number) params.part_number = req.query.part_number;
      if (req.query.date_from) params.date_from = req.query.date_from;
      if (req.query.date_to) params.date_to = req.query.date_to;
      if (req.query.query) params.query = req.query.query;
      if (req.query.limit) params.limit = parseInt(req.query.limit as string);
      if (req.query.offset) params.offset = parseInt(req.query.offset as string);
      if (req.query.sort_by) params.sort_by = req.query.sort_by;
      if (req.query.sort_order) params.sort_order = req.query.sort_order;
      if (req.query.tags) params.tags = (req.query.tags as string).split(",");
      const result = await callTool("prism_inbox", "inbox_list", params);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // GET /inbox/:id — Get a single inbox item
  router.get("/:id", async (req, res) => {
    try {
      const result = await callTool("prism_inbox", "inbox_get", { id: req.params.id });
      if (result?.error) {
        res.status(404).json({ ok: false, error: result.error });
      } else {
        res.json({ ok: true, data: result });
      }
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // POST /inbox/:id/match — Manually match a part number
  router.post("/:id/match", async (req, res) => {
    try {
      const result = await callTool("prism_inbox", "inbox_match_part", {
        inbox_id: req.params.id,
        ...req.body,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // POST /inbox/:id/status — Update processing status
  router.post("/:id/status", async (req, res) => {
    try {
      const result = await callTool("prism_inbox", "inbox_update_status", {
        id: req.params.id,
        ...req.body,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // POST /inbox/batch — Batch ingest multiple documents
  router.post("/batch", async (req, res) => {
    try {
      const result = await callTool("prism_inbox", "inbox_batch_ingest", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // GET /inbox/search — Full-text search
  router.get("/search", async (req, res) => {
    try {
      const result = await callTool("prism_inbox", "inbox_search", {
        query: req.query.q || req.query.query,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // GET /inbox/stats — Dashboard statistics
  router.get("/stats", async (_req, res) => {
    try {
      const result = await callTool("prism_inbox", "inbox_stats");
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
