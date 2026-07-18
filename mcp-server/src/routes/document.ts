/**
 * PRISM MCP Server -- Document Extraction Routes (U-XRAY-DOCUMENT-REST-ROUTE)
 *
 * REST parity for the document extraction-application chain. The BLUEPRINT chain already has a REST
 * surface (`/api/v1/cad/blueprint-extract-{contract,route}` in routes/cad.ts) that the frontend binds
 * to; the DOCUMENT chain (office / OCR / documentLearning extraction -> versioned
 * DocumentExtractionContract -> consumer fan-out) was reachable ONLY via the MCP dispatcher
 * (`prism_resource_extraction:document_extract_{contract,route}`). These thin pass-throughs give the web
 * app the same REST surface (lib/api.ts -> HTTP bridge), closing the surface-parity gap.
 *
 * Pattern: clone of the blueprint extract routes -- each endpoint forwards to the already-wired,
 * already-tested dispatcher action (no re-implementation; the contract/router logic + its tests live in
 * the dispatcher). The producer extraction is obtained first (office_process / ocr_process / doc_extract),
 * then extract-contract normalizes it, then extract-route returns the confirm-gated fan-out plan.
 *
 * @module routes/document
 * @since   U-XRAY-DOCUMENT-REST-ROUTE (2026-06-24, slot xray)
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates the document-extraction router. @param callTool - dispatcher call fn @returns router */
export function createDocumentRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/document/extract-contract -- normalize a producer extraction (an
  // OfficeDocumentPipelineEngine ExtractionResult, an ImageOCRPipelineEngine OCRResult, or a
  // documentLearning IngestionResult via `producer:"doclearn"`) into the versioned, confidence-tagged
  // DocumentExtractionContract the app binds to. Pure + in-process; no producer run, no I/O.
  router.post("/extract-contract", async (req, res, next) => {
    try {
      const result = await callTool("prism_resource_extraction", "document_extract_contract", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/document/extract-route -- given a validated DocumentExtractionContract, return the
  // fan-out plan: which document-knowledge consumers (tool-crib inventory / tool catalog / speeds-feeds /
  // material price / tribal capture) this extraction can drive, with per-consumer payloads + the
  // tribal-capture confirm-gate on below-floor entries. Chains after extract-contract.
  router.post("/extract-route", async (req, res, next) => {
    try {
      const result = await callTool("prism_resource_extraction", "document_extract_route", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
