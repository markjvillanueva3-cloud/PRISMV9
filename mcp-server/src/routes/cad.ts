/**
 * PRISM MCP Server — CAD Routes
 * Geometry import, feature recognition, stock model, WCS setup
 */
import { Router } from "express";
import { requireFields } from "../middleware/validation.js";
import type { CallToolFn } from "./index.js";

/** Creates cad router.
 * @param callTool - call tool
 * @returns router
 */
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

  // POST /api/v1/cad/blueprint-redact -- auto-redact customer identity from an
  // uploaded print/CAD doc before it is displayed or quoted (U-3VIEW-REDACT-WIRE).
  // Privacy-critical: wraps the tested blueprintRedaction lib via prism_cad.
  router.post("/blueprint-redact", async (req, res, next) => {
    try {
      const result = await callTool("prism_cad", "blueprint_redact", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cad/blueprint-extract-contract -- normalize a producer extraction (VLM `fused`
  // ensemble output OR a Drawing2DExtractionEngine `drawing` result) into the versioned, mm-canonical
  // BlueprintExtractionContract the app binds to. The app obtains the extraction via the producer
  // action first, then calls this to get the stable contract (U-XRAY-EXTRACT-CONTRACT-WIRE).
  router.post("/blueprint-extract-contract", async (req, res, next) => {
    try {
      const result = await callTool("prism_cad", "blueprint_extract_contract", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/cad/blueprint-extract-route -- given a validated BlueprintExtractionContract, return
  // the fan-out plan: which downstream prism features (quote / print-to-program / inspection / feature-
  // recognize / cad-reconstruct / redact / material-resolve) this extraction can drive, with per-consumer
  // payloads + commitment confirm-gates. Chains after blueprint-extract-contract (U-XRAY-EXTRACT-CONSUMER-ROUTER).
  router.post("/blueprint-extract-route", async (req, res, next) => {
    try {
      const result = await callTool("prism_cad", "blueprint_extract_route", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
