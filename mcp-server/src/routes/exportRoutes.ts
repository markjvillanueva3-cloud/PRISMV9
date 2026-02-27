/**
 * PRISM MCP Server — Export Routes
 * PDF, CSV, Excel, setup sheet, and speed-feed card generation
 */
import { Router } from "express";
import { requireFields } from "../middleware/validation.js";
import type { CallToolFn } from "./index.js";

export function createExportRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/export/pdf — Generate PDF report
  router.post("/pdf", requireFields("template"), async (req, res, next) => {
    try {
      const result = await callTool("prism_export", "render_pdf", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/export/csv — Generate CSV export
  router.post("/csv", requireFields("data"), async (req, res, next) => {
    try {
      const result = await callTool("prism_export", "render_csv", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/export/excel — Generate Excel workbook
  router.post("/excel", requireFields("data"), async (req, res, next) => {
    try {
      const result = await callTool("prism_export", "render_excel", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/export/setup-sheet — Generate shop floor setup sheet
  router.post("/setup-sheet", async (req, res, next) => {
    try {
      const result = await callTool("prism_export", "render_setup_sheet", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/export/speed-feed-card — Generate speed & feed reference card
  router.post("/speed-feed-card", async (req, res, next) => {
    try {
      const result = await callTool("prism_export", "render_speed_feed_card", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
