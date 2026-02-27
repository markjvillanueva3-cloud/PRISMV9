/**
 * PRISM MCP Server — CAD Routes
 * Geometry import, feature recognition, stock model, WCS setup
 */
import { Router } from "express";
import { requireFields } from "../middleware/validation.js";
import type { CallToolFn } from "./index.js";

export function createCadRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/cad/import — Import STEP/IGES/DXF geometry
  router.post("/import", requireFields("filename"), async (req, res, next) => {
    try {
      const result = await callTool("prism_cad", "mesh_import", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cad/export — Export geometry to target format
  router.post("/export", requireFields("format"), async (req, res, next) => {
    try {
      const result = await callTool("prism_cad", "mesh_export", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cad/features — Feature recognition
  router.post("/features", async (req, res, next) => {
    try {
      const result = await callTool("prism_cad", "feature_recognize", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cad/transform — Geometry transform (rotate, translate, mirror)
  router.post("/transform", async (req, res, next) => {
    try {
      const result = await callTool("prism_cad", "geometry_transform", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cad/analyze — Geometry analysis (volume, surface area, bounding box)
  router.post("/analyze", async (req, res, next) => {
    try {
      const result = await callTool("prism_cad", "geometry_analyze", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
