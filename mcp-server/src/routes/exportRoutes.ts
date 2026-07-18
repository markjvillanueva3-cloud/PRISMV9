/**
 * PRISM MCP Server -- Export Routes
 * PDF, CSV, Excel, setup sheet, and speed-feed card generation
 */
import { Router } from "express";
import { requireFields } from "../middleware/validation.js";
import type { CallToolFn } from "./index.js";

/** Creates export router.
 * @param callTool - call tool
 * @returns router
 */
export function createExportRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/export/pdf -- Generate PDF report
  router.post("/pdf", requireFields("template"), async (req, res, next) => {
    try {
      const result = await callTool("prism_export", "render_pdf", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/export/csv -- Generate CSV export
  router.post("/csv", requireFields("data"), async (req, res, next) => {
    try {
      const result = await callTool("prism_export", "render_csv", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/export/excel -- Generate Excel workbook
  router.post("/excel", requireFields("data"), async (req, res, next) => {
    try {
      const result = await callTool("prism_export", "render_excel", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/export/setup-sheet -- Generate shop floor setup sheet
  router.post("/setup-sheet", async (req, res, next) => {
    try {
      const result = await callTool("prism_export", "render_setup_sheet", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/export/speed-feed-card -- Generate speed & feed reference card. prism_export has NO
  // speed-feed-card renderer (its 10 actions are batch_export, export, render_csv, render_dxf,
  // render_excel, render_gcode, render_pdf, render_setup_sheet, render_step, report). Prior
  // `render_speed_feed_card` did not exist -> silent 200+{error}. Fail loud (501) rather than mislabel
  // a generic renderer (render_pdf/report) as a dedicated speed-feed card.
  router.post("/speed-feed-card", async (_req, res) => {
    res.status(501).json({
      message: "speed-feed card rendering not yet wired -- prism_export has no render_speed_feed_card action. Wire a dedicated renderer (or a render_pdf speed-feed template) to enable this endpoint.",
      error: "not_implemented",
    });
  });

  return router;
}
