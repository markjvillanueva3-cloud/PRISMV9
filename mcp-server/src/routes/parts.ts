/**
 * Parts Library & File Storage API Routes
 *
 * POST /api/v1/parts                    — create part
 * GET  /api/v1/parts                    — search parts
 * GET  /api/v1/parts/:id                — get part with revisions
 * POST /api/v1/parts/:id/revisions      — add revision
 * GET  /api/v1/parts/:id/revisions      — list revisions
 * POST /api/v1/parts/find-similar       — similarity search
 * POST /api/v1/parts/deduplicate        — detect duplicates
 * GET  /api/v1/parts/stats              — library stats
 * POST /api/v1/files/upload             — upload file (multipart/base64)
 * GET  /api/v1/files/:id/download       — download file
 * GET  /api/v1/files/:id/versions       — file version history
 * POST /api/v1/files/:id/attach         — attach file to entity
 * GET  /api/v1/files/attachments        — get entity attachments
 * GET  /api/v1/files/stats              — storage stats
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createPartsRouter(callTool: CallToolFn): Router {
  const router = Router();

  // ── File Routes ──

  router.post("/files/upload", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "file_upload", req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/files/stats", async (_req, res) => {
    try {
      const result = await callTool("prism_parts", "file_stats", {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/files/attachments", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "file_get_attachments", {
        entity_type: req.query.entity_type,
        entity_id: req.query.entity_id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/files/:id/download", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "file_download", {
        file_id: req.params.id,
        version: req.query.version ? parseInt(req.query.version as string, 10) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  router.get("/files/:id/versions", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "file_get_versions", {
        file_id: req.params.id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  router.post("/files/:id/attach", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "file_attach", {
        file_id: req.params.id,
        ...req.body,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete("/files/:id", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "file_delete", {
        file_id: req.params.id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // ── Part Routes ──

  router.get("/parts/stats", async (_req, res) => {
    try {
      const result = await callTool("prism_parts", "part_stats", {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/parts/find-similar", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "part_find_similar", req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/parts/deduplicate", async (_req, res) => {
    try {
      const result = await callTool("prism_parts", "part_deduplicate", {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/parts", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "part_create", req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/parts", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "part_search", {
        query: req.query.q ?? req.query.query,
        tags: req.query.tags ? (req.query.tags as string).split(",") : undefined,
        material_id: req.query.material_id,
        customer_id: req.query.customer_id,
        status: req.query.status,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/parts/:id", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "part_get", {
        part_id: req.params.id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  router.post("/parts/:id/revisions", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "part_add_revision", {
        part_id: req.params.id,
        ...req.body,
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/parts/:id/revisions", async (req, res) => {
    try {
      const result = await callTool("prism_parts", "part_list_revisions", {
        part_id: req.params.id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  return router;
}
